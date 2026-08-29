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
  testWorkspaceCoverage();
  testSnapshotIncludesOfficeMap();
}

function testDeterministicOfficeMap() {
  const left = createGameSession("RH-MAPA-DET-001");
  const right = createGameSession("RH-MAPA-DET-001");
  const leftMap = generateOfficeMap(left.state);
  const rightMap = generateOfficeMap(right.state);

  assert(JSON.stringify(leftMap) === JSON.stringify(rightMap), "mesma seed deve gerar mesmo escritorio");
}

function testWorkspaceCoverage() {
  const session = createGameSession("RH-WORKSPACE-COVER-001");
  const activeEmployees = session.state.employees.filter((employee) => employee.status !== "desligado");
  const workspace = session.state.workspace;

  assert(workspace, "state deve conter workspace persistente");
  assert(workspace.rooms.some((room) => room.id === "rh"), "workspace deve conter sala de RH");
  assert(workspace.rooms.some((room) => room.id === "copa"), "workspace deve conter copa");
  assert(workspace.rooms.some((room) => room.id === "reuniao"), "workspace deve conter sala de reuniao");
  assert(workspace.rooms.some((room) => room.id === "diretoria"), "workspace deve conter diretoria");
  assert(workspace.desks.length >= activeEmployees.length, "workspace deve conter mesas suficientes");

  session.state.sectors.forEach((sector) => {
    const room = workspace.rooms.find((item) => item.sectorId === sector.id);
    assert(room, `setor sem sala logica: ${sector.id}`);
    assert(room.deskIds.length > 0, `sala de setor sem mesas: ${sector.id}`);
  });

  activeEmployees.forEach((employee) => {
    const desk = workspace.desks.find((item) => item.id === employee.deskId);
    assert(employee.deskId, `funcionario ativo sem deskId: ${employee.id}`);
    assert(employee.homeRoomId, `funcionario ativo sem homeRoomId: ${employee.id}`);
    assert(desk, `funcionario com mesa inexistente: ${employee.id}`);
    assert(desk.roomId === employee.homeRoomId, `mesa e sala fixa divergentes: ${employee.id}`);
  });
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
  assert(map.rooms.some((room) => room.id === "banheiro"), "mapa deve conter banheiro");

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
