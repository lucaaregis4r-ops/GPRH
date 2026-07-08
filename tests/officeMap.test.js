/**
 * Modulo: officeMap.test
 * Responsabilidade: validar gerador procedural de escritorio.
 */

const { createGameSession } = require("../game/gameLoop");
const { generateOfficeMap } = require("../game/officeMapGenerator");
const { buildGameSnapshot } = require("../game/gameSnapshot");
const { assert } = require("./testUtils");

function run() {
  testDeterministicOfficeMap();
  testDifferentSeedsGenerateDifferentMaps();
  testMapConnectivityAndCoverage();
  testSnapshotIncludesOfficeMap();
}

function testDeterministicOfficeMap() {
  const left = createGameSession("RH-MAPA-DET-001");
  const right = createGameSession("RH-MAPA-DET-001");
  const leftMap = generateOfficeMap(left.state);
  const rightMap = generateOfficeMap(right.state);

  assert(JSON.stringify(leftMap) === JSON.stringify(rightMap), "mesma seed deve gerar mesmo escritorio");
}

function testDifferentSeedsGenerateDifferentMaps() {
  const left = createGameSession("RH-MAPA-DIFF-001");
  const right = createGameSession("RH-MAPA-DIFF-002");
  const leftMap = generateOfficeMap(left.state);
  const rightMap = generateOfficeMap(right.state);

  assert(JSON.stringify(leftMap.rooms) !== JSON.stringify(rightMap.rooms), "seeds diferentes devem variar o escritorio");
}

function testMapConnectivityAndCoverage() {
  const session = createGameSession("RH-MAPA-COVER-001");
  const map = generateOfficeMap(session.state);
  const activeEmployees = session.state.employees.filter((employee) => employee.status !== "desligado");

  assert(map.validation.valid, `mapa deve ser valido:\n${map.validation.errors.join("\n")}`);
  assert(map.rooms.some((room) => room.id === "rh"), "mapa deve conter sala de RH");
  assert(map.rooms.some((room) => room.id === "recepcao"), "mapa deve conter recepcao");
  assert(map.rooms.some((room) => room.id === "reuniao"), "mapa deve conter sala de reuniao");
  assert(map.rooms.some((room) => room.id === "diretoria"), "mapa deve conter diretoria");
  assert(map.rooms.some((room) => room.id === "copa"), "mapa deve conter copa");

  session.state.sectors.forEach((sector) => {
    assert(map.rooms.some((room) => room.sectorId === sector.id), `setor sem sala: ${sector.id}`);
  });

  activeEmployees.forEach((employee) => {
    const placement = map.npcPlacements.find((item) => item.employeeId === employee.id);
    assert(placement, `funcionario ativo sem spawn: ${employee.id}`);
    assert(placement.setorId === employee.setorId, `funcionario no setor errado: ${employee.id}`);
  });
}

function testSnapshotIncludesOfficeMap() {
  const session = createGameSession("RH-MAPA-SNAPSHOT-001");
  const snapshot = buildGameSnapshot(session);

  assert(snapshot.world.officeMap, "snapshot deve incluir officeMap");
  assert(snapshot.world.officeMap.validation.valid, "officeMap do snapshot deve ser valido");
  assert(snapshot.world.officeMap.npcPlacements.length === snapshot.world.npcs.length, "officeMap deve posicionar todos os NPCs");
}

module.exports = {
  run,
};
