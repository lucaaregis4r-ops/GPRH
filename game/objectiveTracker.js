/**
 * Modulo: objectiveTracker
 * Responsabilidade: acompanhar progresso tecnico do ciclo MVP semanal.
 * Entrada: state e baseline
 * Saida: avaliacao simples de saude organizacional
 * Nao deve: criar campanha, vitoria/derrota final ou alterar simulacao.
 */

const { average } = require("../tests/testUtils");

function createObjectiveTracker(state, options = {}) {
  return {
    horizonteSemanas: options.horizonteSemanas || 12,
    baseline: summarizeObjectiveMetrics(state),
    historico: [],
  };
}

function summarizeObjectiveMetrics(state) {
  const activeEmployees = state.employees.filter((employee) => employee.status !== "desligado");
  return {
    dia: state.calendar.totalDiasSimulados,
    satisfacaoMedia: average(activeEmployees.map((employee) => employee.satisfacao)),
    medoMedio: average(activeEmployees.map((employee) => employee.medo)),
    sobrecargaMedia: average(activeEmployees.map((employee) => employee.sobrecarga)),
    riscoSaidaMedio: average(activeEmployees.map((employee) => employee.riscoDeSaida)),
    climaMedio: average(state.sectors.map((sector) => sector.climaSetor)),
    confiancaRhMedia: average(activeEmployees.map((employee) => employee.confiancaNoRH)),
    turnoverAcumulado: state.company.turnoverAcumulado || 0,
    caixa: state.economy.caixaAtual,
    denunciasAbertas: state.reportCases.filter((reportCase) => reportCase.status !== "acao_corretiva_aplicada").length,
    demandasPendentes: activeEmployees.reduce(
      (sum, employee) => sum + employee.demandasPendentes.filter((demand) => demand.status === "pendente").length,
      0
    ),
  };
}

function evaluateObjectiveProgress(state, tracker) {
  const current = summarizeObjectiveMetrics(state);
  const baseline = tracker.baseline;
  const score = Math.round(
    50 +
      (current.satisfacaoMedia - baseline.satisfacaoMedia) * 0.8 +
      (current.climaMedio - baseline.climaMedio) * 0.7 +
      (baseline.riscoSaidaMedio - current.riscoSaidaMedio) * 0.75 +
      (baseline.sobrecargaMedia - current.sobrecargaMedia) * 0.45 +
      (current.confiancaRhMedia - baseline.confiancaRhMedia) * 0.45 -
      Math.max(0, current.turnoverAcumulado - baseline.turnoverAcumulado) * 4 -
      Math.max(0, current.demandasPendentes - baseline.demandasPendentes) * 1.5
  );

  const progress = {
    semana: Math.floor(state.calendar.totalDiasSimulados / 7),
    metricas: current,
    score: Math.max(0, Math.min(100, score)),
    diagnostico: classifyProgress(score),
  };

  tracker.historico.push(progress);
  return progress;
}

function classifyProgress(score) {
  if (score >= 68) return "MELHORANDO";
  if (score >= 48) return "ESTAVEL";
  if (score >= 32) return "ATENCAO";
  return "CRITICO";
}

module.exports = {
  createObjectiveTracker,
  summarizeObjectiveMetrics,
  evaluateObjectiveProgress,
};
