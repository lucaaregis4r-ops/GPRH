/**
 * Modulo: organizationalTech.test
 * Responsabilidade: validar tecnologias organizacionais e visibilidade desbloqueavel.
 */

const { createGameSession } = require("../game/gameLoop");
const { buildGameSnapshot } = require("../game/gameSnapshot");
const {
  initializeOrganizationalTechnologies,
  getTechnologyLevel,
  unlockTechnology,
  upgradeTechnology,
} = require("../rh/organizationalTechTree");
const { getVisibleDashboardMetrics, getVisibleOrgChart } = require("../knowledge/unlockableVisibilityModel");
const { assert } = require("./testUtils");

function run() {
  testDefaultTechnologies();
  testUnlockOrgChartChangesVisibility();
  testUnlockDashboardChangesMetrics();
  testUpgradeTechnology();
}

function testDefaultTechnologies() {
  const session = createGameSession("RH-TECH-DEFAULT-001");
  initializeOrganizationalTechnologies(session.state);

  assert(getTechnologyLevel(session.state, "employee_registry") === 1, "registro de funcionarios deve iniciar ativo");
  assert(getTechnologyLevel(session.state, "org_chart") === 0, "organograma deve iniciar bloqueado");
  assert(getTechnologyLevel(session.state, "basic_dashboard") === 0, "dashboard deve iniciar bloqueado");
}

function testUnlockOrgChartChangesVisibility() {
  const session = createGameSession("RH-TECH-ORG-001");

  assert(getVisibleOrgChart(session.state).available === false, "organograma deve estar oculto sem tecnologia");
  unlockTechnology(session.state, "org_chart", { free: true });

  const visible = getVisibleOrgChart(session.state);
  assert(visible.available, "organograma deve ficar disponivel apos desbloqueio");
  assert(visible.edges.length > 0, "organograma desbloqueado deve mostrar hierarquia formal");
  assert(visible.informalInfluenceEdges.length === 0, "nivel 1 nao deve revelar influencia informal");
}

function testUnlockDashboardChangesMetrics() {
  const session = createGameSession("RH-TECH-DASH-001");
  let dashboard = getVisibleDashboardMetrics(session.state);

  assert(dashboard.available === false, "dashboard deve iniciar indisponivel");
  unlockTechnology(session.state, "basic_dashboard", { free: true });
  dashboard = getVisibleDashboardMetrics(session.state);

  assert(dashboard.available, "dashboard deve ficar disponivel apos desbloqueio");
  assert(Number.isFinite(dashboard.basic.averageOverload.value), "dashboard deve mostrar metricas agregadas");
  assert(dashboard.reliability > 0, "dashboard deve indicar confiabilidade");

  const snapshot = buildGameSnapshot(session);
  assert(snapshot.playerKnowledge.dashboard.available, "snapshot deve incluir dashboard desbloqueado");
}

function testUpgradeTechnology() {
  const session = createGameSession("RH-TECH-UPGRADE-001");

  unlockTechnology(session.state, "org_chart", { free: true });
  upgradeTechnology(session.state, "org_chart", { free: true });

  assert(getTechnologyLevel(session.state, "org_chart") === 2, "upgrade deve aumentar nivel da tecnologia");
  assert(Array.isArray(getVisibleOrgChart(session.state).diagnostics), "organograma nivel 2 deve expor diagnosticos formais");
}

module.exports = {
  run,
};
