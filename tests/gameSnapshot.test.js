/**
 * Modulo: gameSnapshot.test
 * Responsabilidade: validar snapshots seguros para UI jogavel.
 */

const { createGameSession, playWeek } = require("../game/gameLoop");
const {
  buildGameSnapshot,
  buildWorldSnapshot,
  buildPlayerKnowledgeSnapshot,
  buildActionAvailabilitySnapshot,
} = require("../game/gameSnapshot");
const { serializeSession } = require("../ui-simple/uiStateAdapter");
const { assert } = require("./testUtils");

function run() {
  testSnapshotShape();
  testSnapshotDoesNotExposeHiddenOrRawState();
  testUiSimpleStillSerializes();
}

function testSnapshotShape() {
  const session = createGameSession("RH-SNAPSHOT-001");
  playWeek(session, []);
  const snapshot = buildGameSnapshot(session);

  assert(snapshot.company.nome, "snapshot deve conter empresa");
  assert(snapshot.world.rooms.length >= session.state.sectors.length + 5, "snapshot deve conter salas base e setores");
  assert(snapshot.world.npcs.length > 0, "snapshot deve conter NPCs visiveis");
  assert(snapshot.playerKnowledge.visibleSignals.every((signal) => signal.id), "snapshot deve conter sinais visiveis");
  assert(snapshot.actionAvailability.length >= 10, "snapshot deve conter disponibilidade de acoes");
  assert(
    snapshot.actionAvailability.every((action) => action.tempo && action.tempo.duracoesPermitidasMin.length > 0),
    "snapshot deve expor metadados publicos de tempo para a UI"
  );
}

function testSnapshotDoesNotExposeHiddenOrRawState() {
  const session = createGameSession("RH-SNAPSHOT-SEGURO");
  playWeek(session, []);

  const snapshots = [
    buildGameSnapshot(session),
    buildWorldSnapshot(session.state),
    buildPlayerKnowledgeSnapshot(session.state),
    buildActionAvailabilitySnapshot(session.state),
  ];
  const raw = JSON.stringify(snapshots);

  assert(!raw.includes("\"riscoDeSaida\""), "snapshot nao deve expor risco real bruto");
  assert(!raw.includes("\"satisfacao\""), "snapshot nao deve expor satisfacao real bruta");
  assert(!raw.includes("\"visivelParaRH\":false"), "snapshot nao deve expor sinais ocultos");
  assert(!raw.includes("\"dadosOcultos\""), "snapshot nao deve expor dados ocultos da empresa");
  assert(!raw.includes("\"rng\""), "snapshot nao deve expor RNG interno");
  assert(!raw.includes("\"idFactory\""), "snapshot nao deve expor idFactory interno");
}

function testUiSimpleStillSerializes() {
  const session = createGameSession("RH-SNAPSHOT-UI");
  const ui = serializeSession(session);
  const snapshot = buildGameSnapshot(session);

  assert(ui.company.nome === snapshot.company.nome, "snapshot nao deve quebrar UI simples");
  assert(ui.availableActions.length === snapshot.actionAvailability.length, "snapshot deve manter catalogo compativel");
}

module.exports = {
  run,
};
