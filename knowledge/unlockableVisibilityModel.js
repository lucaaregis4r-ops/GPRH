/**
 * Modulo: unlockableVisibilityModel
 * Responsabilidade: aplicar tecnologias do RH sobre dados visiveis ao jogador.
 * Entrada: state e contexto de visualizacao
 * Saida: dados visiveis com nivel/confiabilidade
 * Nao deve: revelar automaticamente estado oculto ou substituir investigacao.
 */

const { getTechnologyLevel } = require("../rh/organizationalTechTree");
const { initializeOrgChart } = require("../game/orgChartModel");
const { buildHrDashboardMetrics } = require("../reports/hrDashboardMetrics");

const VISIBILITY_LEVELS = {
  HIDDEN: "hidden",
  SUSPECTED: "suspected",
  INDICATED: "indicated",
  CONFIRMED: "confirmed",
};

const INFO_SOURCES = {
  DIRECT_OBSERVATION: "direct_observation",
  INDIVIDUAL_CONVERSATION: "individual_conversation",
  CLIMATE_SURVEY: "climate_survey",
  BASIC_DASHBOARD: "basic_dashboard",
  REPORTING_CHANNEL: "reporting_channel",
  ORG_CHART: "org_chart",
  PEOPLE_ANALYTICS: "people_analytics",
};

function getVisibleEmployeeData(employee, state) {
  const dashboardLevel = getTechnologyLevel(state, "basic_dashboard");
  const peopleAnalyticsLevel = getTechnologyLevel(state, "people_analytics");
  return {
    id: employee.id,
    nome: employee.nome,
    setorId: employee.setorId,
    managerId: employee.managerId || null,
    registry: { level: VISIBILITY_LEVELS.CONFIRMED, source: "employee_registry", reliability: 90 },
    estimatedWork:
      dashboardLevel > 0
        ? {
            level: dashboardLevel >= 2 ? VISIBILITY_LEVELS.INDICATED : VISIBILITY_LEVELS.SUSPECTED,
            source: INFO_SOURCES.BASIC_DASHBOARD,
            reliability: 45 + dashboardLevel * 12,
            deliveryCapacity: Math.round(employee.deliveryCapacity || 0),
            deliveryQuality: Math.round(employee.deliveryQuality || 0),
            workSustainability: Math.round(employee.workSustainability || 0),
          }
        : null,
    estimatedRisk:
      peopleAnalyticsLevel > 0
        ? {
            level: VISIBILITY_LEVELS.SUSPECTED,
            source: INFO_SOURCES.PEOPLE_ANALYTICS,
            reliability: 42 + peopleAnalyticsLevel * 10,
            turnoverRisk: Math.round(employee.percepcaoRH?.riscoSaidaEstimado || 0),
          }
        : null,
  };
}

function getVisibleSectorData(sector, state) {
  const dashboardLevel = getTechnologyLevel(state, "basic_dashboard");
  return {
    id: sector.id,
    nome: sector.nome,
    basic: { level: VISIBILITY_LEVELS.CONFIRMED, source: "employee_registry", reliability: 88 },
    dashboard:
      dashboardLevel > 0
        ? {
            level: dashboardLevel >= 2 ? VISIBILITY_LEVELS.INDICATED : VISIBILITY_LEVELS.SUSPECTED,
            source: INFO_SOURCES.BASIC_DASHBOARD,
            reliability: 48 + dashboardLevel * 12,
            sobrecargaMedia: Math.round(sector.cargaTrabalho || 0),
            clima: Math.round(sector.climaSetor || 0),
            deliveryCapacity: Math.round(sector.workIndicators?.deliveryCapacity || 0),
            deliveryQuality: Math.round(sector.workIndicators?.deliveryQuality || 0),
            workSustainability: Math.round(sector.workIndicators?.workSustainability || 0),
          }
        : null,
  };
}

function getVisibleOrgChart(state) {
  const level = getTechnologyLevel(state, "org_chart");
  if (level <= 0) {
    return {
      available: false,
      level: 0,
      nodes: [],
      edges: [],
      diagnostics: [],
      informalInfluenceEdges: [],
      reliability: 0,
    };
  }

  const orgChart = state.orgChart || initializeOrgChart(state);
  return {
    available: true,
    level,
    nodes: orgChart.nodes.map((node) => ({ ...node })),
    edges: orgChart.edges.map((edge) => ({ ...edge })),
    diagnostics: level >= 2 ? orgChart.diagnostics.map((diagnostic) => ({ ...diagnostic })) : [],
    informalInfluenceEdges: level >= 4 ? orgChart.informalInfluenceEdges.map((edge) => ({ ...edge })) : [],
    reliability: Math.min(92, 55 + level * 10),
  };
}

function getVisibleDashboardMetrics(state) {
  return buildHrDashboardMetrics(state);
}

module.exports = {
  VISIBILITY_LEVELS,
  INFO_SOURCES,
  getVisibleEmployeeData,
  getVisibleSectorData,
  getVisibleOrgChart,
  getVisibleDashboardMetrics,
};
