/**
 * Modulo: hrDashboardMetrics
 * Responsabilidade: montar metricas agregadas desbloqueaveis para dashboard de RH.
 * Entrada: state e tecnologias disponiveis
 * Saida: metricas com confiabilidade, sem revelar certeza absoluta indevida
 * Nao deve: alterar estado, executar acoes ou substituir investigacao por conversas.
 */

const { getTechnologyLevel } = require("../rh/organizationalTechTree");

function buildHrDashboardMetrics(state) {
  const basicDashboardLevel = getTechnologyLevel(state, "basic_dashboard");
  const peopleAnalyticsLevel = getTechnologyLevel(state, "people_analytics");
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");
  const visibleSignals = (state.visibleSignals || []).filter((signal) => signal.visivelParaRH);

  const metrics = {
    available: basicDashboardLevel > 0,
    level: basicDashboardLevel,
    reliability: basicDashboardLevel > 0 ? reliabilityForLevel(basicDashboardLevel) : 0,
    baseline: {
      employeeCount: withReliability(activeEmployees.length, 92, "employee_registry"),
      sectorCount: withReliability((state.sectors || []).length, 92, "employee_registry"),
      discoveredSignals: withReliability(visibleSignals.length, 70, "direct_observation"),
      pendingDemands: withReliability(countPendingDemands(activeEmployees), 82, "employee_registry"),
    },
    basic: null,
    intermediate: null,
    peopleAnalytics: null,
  };

  if (basicDashboardLevel >= 1) {
    metrics.basic = {
      averageOverload: withReliability(average(activeEmployees.map((employee) => employee.sobrecarga)), metrics.reliability, "basic_dashboard"),
      averageSatisfaction: withReliability(average(activeEmployees.map((employee) => employee.satisfacao)), metrics.reliability, "basic_dashboard"),
      averageRhTrust: withReliability(average(activeEmployees.map((employee) => employee.confiancaNoRH)), metrics.reliability, "basic_dashboard"),
      averageTurnoverRisk: withReliability(average(activeEmployees.map((employee) => employee.riscoDeSaida)), metrics.reliability - 8, "basic_dashboard"),
      averageProductivity: withReliability(average(activeEmployees.map((employee) => employee.produtividade)), metrics.reliability, "basic_dashboard"),
    };
  }

  if (basicDashboardLevel >= 2) {
    const tenseSectors = (state.sectors || [])
      .map((sector) => ({
        sectorId: sector.id,
        nome: sector.nome,
        score: Math.round((sector.cargaTrabalho || 0) + (100 - (sector.climaSetor || 50)) + (sector.rumorLocal || 0)),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    metrics.intermediate = {
      averageDeliveryCapacity: withReliability(average(activeEmployees.map((employee) => employee.deliveryCapacity)), metrics.reliability - 3, "basic_dashboard"),
      averageDeliveryQuality: withReliability(average(activeEmployees.map((employee) => employee.deliveryQuality)), metrics.reliability - 5, "basic_dashboard"),
      averageWorkSustainability: withReliability(average(activeEmployees.map((employee) => employee.workSustainability)), metrics.reliability - 6, "basic_dashboard"),
      tenseSectors,
      trendAlerts: buildTrendAlerts(state),
    };
  }

  if (peopleAnalyticsLevel > 0) {
    metrics.peopleAnalytics = {
      level: peopleAnalyticsLevel,
      reliability: reliabilityForLevel(peopleAnalyticsLevel) - 10,
      probableTurnoverRisk: withReliability(average(activeEmployees.map((employee) => employee.percepcaoRH?.riscoSaidaEstimado || 0)), 42 + peopleAnalyticsLevel * 10, "people_analytics"),
      probableClimateDeterioration: withReliability(estimateClimateDeteriorationRisk(state), 40 + peopleAnalyticsLevel * 10, "people_analytics"),
      probableConflictRisk: withReliability(estimateConflictRisk(state), 38 + peopleAnalyticsLevel * 10, "people_analytics"),
      explanation: "Estimativas probabilisticas: indicam tendencia e confiabilidade, nao verdade absoluta.",
    };
  }

  return metrics;
}

function buildTrendAlerts(state) {
  const alerts = [];
  const history = state.workDeliveryHistory || [];
  const last = history[history.length - 1]?.company;
  const previous = history.length >= 7 ? history[history.length - 7]?.company : history[0]?.company;

  if (last && previous) {
    if ((last.workSustainability || 0) < (previous.workSustainability || 0) - 4) {
      alerts.push("Sustentabilidade do trabalho em queda recente.");
    }
    if ((last.deliveryQuality || 0) < (previous.deliveryQuality || 0) - 4) {
      alerts.push("Qualidade estimada da entrega caiu.");
    }
  }

  const overloadedSectors = (state.sectors || []).filter((sector) => (sector.cargaTrabalho || 0) >= 70);
  if (overloadedSectors.length) alerts.push(`${overloadedSectors.length} setor(es) com carga alta.`);
  if (!alerts.length) alerts.push("Sem alerta agregado forte; manter observacao por setor.");
  return alerts.slice(0, 4);
}

function estimateClimateDeteriorationRisk(state) {
  const sectors = state.sectors || [];
  return average(sectors.map((sector) => (100 - (sector.climaSetor || 50)) * 0.55 + (sector.rumorLocal || 0) * 0.25 + (sector.cargaTrabalho || 0) * 0.2));
}

function estimateConflictRisk(state) {
  const relationships = (state.relationships || []).filter((relationship) => relationship.ativa !== false);
  return average(relationships.map((relationship) => relationship.conflito || 0));
}

function withReliability(value, reliability, source) {
  return {
    value: Math.round(Number(value) || 0),
    reliability: Math.max(0, Math.min(100, Math.round(reliability))),
    source,
  };
}

function reliabilityForLevel(level) {
  return Math.min(90, 50 + level * 12);
}

function countPendingDemands(employees) {
  return employees.reduce((sum, employee) => sum + (employee.demandasPendentes || []).filter((demand) => demand.status === "pendente").length, 0);
}

function average(values) {
  const numeric = values.map(Number).filter((value) => Number.isFinite(value));
  if (!numeric.length) return 0;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

module.exports = {
  buildHrDashboardMetrics,
};
