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
  testKnowledgeLedgerAndDemandQueue();
  testSnapshotDoesNotExposeHiddenOrRawState();
  testUiSimpleStillSerializes();
}

function testKnowledgeLedgerAndDemandQueue() {
  const session = createGameSession("RH-SNAPSHOT-DEMANDAS-001");
  const employee = session.state.employees.find((item) => item.status !== "desligado");
  employee.demandasPendentes.push({ tipo: "conversa", status: "pendente", prazoRespostaDias: 1, diasEmAberto: 1 });
  const snapshot = buildGameSnapshot(session);
  const demand = snapshot.playerKnowledge.demandas.find((item) => item.employeeId === employee.id);

  assert(demand, "snapshot deve expor fila unica de demandas conhecidas");
  assert(demand.id && demand.employeeName, "demanda deve ter identidade e pessoa alvo explicita");
  assert(demand.prioridade >= 2, "demanda deve expor prioridade ordenavel");
  assert(demand.source === "pedido_direto_do_funcionario", "demanda deve expor fonte");
  assert(snapshot.playerKnowledge.ledgerConhecimento, "snapshot deve expor ledger de conhecimento");
  assert(
    snapshot.playerKnowledge.ledgerConhecimento.pessoas.every((item) => item.fonte && Number.isFinite(item.confiabilidade)),
    "ledger individual deve registrar fonte e confiabilidade"
  );
  assert(
    snapshot.playerKnowledge.ledgerConhecimento.sinais.every((item) => Number.isFinite(item.idadeDias)),
    "sinais do ledger devem registrar envelhecimento"
  );
}

function testSnapshotShape() {
  const session = createGameSession("RH-SNAPSHOT-001");
  playWeek(session, []);
  const snapshot = buildGameSnapshot(session);

  assert(snapshot.company.nome, "snapshot deve conter empresa");
  assert(snapshot.world.rooms.length >= session.state.sectors.length + 5, "snapshot deve conter salas base e setores");
  assert(snapshot.world.workspace, "snapshot deve conter workspace logico");
  assert(snapshot.world.rooms.some((room) => room.id === "banheiro"), "snapshot deve conter banheiro");
  assert(snapshot.world.workspace.desks.length >= snapshot.world.npcs.length, "workspace deve conter mesas para NPCs");
  assert(snapshot.world.npcs.length > 0, "snapshot deve conter NPCs visiveis");
  assert(snapshot.world.npcs.every((npc) => npc.deskId && npc.homeRoomId), "NPCs devem expor mesa e sala logicas");
  assert(snapshot.playerKnowledge.visibleSignals.every((signal) => signal.id), "snapshot deve conter sinais visiveis");
  assert(snapshot.actionAvailability.length >= 10, "snapshot deve conter disponibilidade de acoes");
  assert(
    snapshot.actionAvailability.every((action) => action.tempo && action.tempo.duracoesPermitidasMin.length > 0),
    "snapshot deve expor metadados publicos de tempo para a UI"
  );
  assert(
    snapshot.actionAvailability.every((action) => action.fase && Array.isArray(action.efeitosEsperados) && Array.isArray(action.riscos)),
    "snapshot deve expor fase, expectativa e riscos para previa de decisao"
  );
  assert(snapshot.playerKnowledge.decisionCatalog.total > 100, "catalogo contextual deve oferecer mais de 100 decisoes com alvos explicitos");
  assert(
    snapshot.playerKnowledge.decisionCatalog.options.every((option) => option.id && option.targetName && option.alvo),
    "cada decisao contextual deve ter identidade e alvo legivel"
  );
  assert(
    new Set(snapshot.playerKnowledge.decisionCatalog.options.map((option) => option.id)).size === snapshot.playerKnowledge.decisionCatalog.total,
    "decisoes contextuais devem ter ids unicos"
  );
  assert(snapshot.playerKnowledge.hoje.priorities.length > 0, "snapshot deve expor prioridades do painel Hoje");
  assert(snapshot.playerKnowledge.hoje.tutorialHint, "snapshot deve expor tutorial contextual");
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
