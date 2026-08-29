/**
 * Modulo: orgChart.test
 * Responsabilidade: validar organograma formal minimo.
 */

const { createGameSession } = require("../game/gameLoop");
const { exportGameSession, importGameSession } = require("../game/saveLoad");
const { buildGameSnapshot } = require("../game/gameSnapshot");
const { unlockTechnology } = require("../rh/organizationalTechTree");
const { assert } = require("./testUtils");

function run() {
  testOrgChartExistsForNewCompany();
  testEmployeesReceiveManagers();
  testSnapshotExposesFormalOrgChart();
  testLegacySaveMigratesOrgChart();
}

function testOrgChartExistsForNewCompany() {
  const session = createGameSession("RH-ORG-001");
  const activeEmployees = session.state.employees.filter((employee) => employee.status !== "desligado");

  assert(session.state.orgChart, "estado deve conter orgChart");
  assert(session.state.orgChart.nodes.length === activeEmployees.length, "orgChart deve ter node por funcionario ativo");
  assert(session.state.orgChart.edges.every((edge) => edge.type === "formal"), "arestas formais devem ter tipo formal");
  assert(Array.isArray(session.state.orgChart.informalInfluenceEdges), "orgChart deve manter camada informal para uso futuro");
}

function testEmployeesReceiveManagers() {
  const session = createGameSession("RH-ORG-MANAGER-001");

  session.state.sectors.forEach((sector) => {
    const activeSectorEmployees = session.state.employees.filter(
      (employee) => employee.status !== "desligado" && employee.setorId === sector.id
    );
    const leader = activeSectorEmployees.find((employee) => employee.id === sector.liderancaFormalId);

    if (activeSectorEmployees.length <= 1 || !leader) return;
    activeSectorEmployees
      .filter((employee) => employee.id !== leader.id)
      .forEach((employee) => {
        assert(employee.managerId === leader.id, `funcionario ${employee.id} deve apontar lider do setor`);
      });
  });
}

function testSnapshotExposesFormalOrgChart() {
  const session = createGameSession("RH-ORG-SNAPSHOT-001");
  let snapshot = buildGameSnapshot(session);

  assert(snapshot.world.orgChart.available === false, "organograma nao deve aparecer sem tecnologia");

  unlockTechnology(session.state, "org_chart", { free: true });
  snapshot = buildGameSnapshot(session);

  assert(snapshot.world.orgChart.available, "snapshot deve expor organograma formal apos desbloqueio");
  assert(snapshot.world.orgChart.nodes.length > 0, "snapshot deve conter nodes do organograma");
  assert(snapshot.world.orgChart.informalInfluenceEdges.length === 0, "snapshot nao deve revelar influencia informal no nivel inicial");
  assert(snapshot.world.npcs.every((npc) => Object.prototype.hasOwnProperty.call(npc, "managerId")), "NPCs devem expor managerId formal");
}

function testLegacySaveMigratesOrgChart() {
  const session = createGameSession("RH-ORG-LEGACY-001");
  const payload = exportGameSession(session);
  payload.version = 1;
  delete payload.session.state.orgChart;
  payload.session.state.employees.forEach((employee) => {
    delete employee.managerId;
  });

  const imported = importGameSession(payload);
  const activeEmployees = imported.state.employees.filter((employee) => employee.status !== "desligado");

  assert(imported.state.orgChart, "save legado deve criar orgChart");
  assert(activeEmployees.every((employee) => Object.prototype.hasOwnProperty.call(employee, "managerId")), "funcionarios legados devem receber managerId");
}

module.exports = {
  run,
};
