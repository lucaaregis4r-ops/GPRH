/**
 * Modulo: perceptionDiagnostics
 * Responsabilidade: diagnosticar erro tecnico entre percepcao RH e estado real.
 * Entrada: state
 * Saida: metricas agregadas de calibragem
 * Nao deve: alterar estado nem revelar informacao ao gameplay.
 */

function summarizePerceptionAccuracy(state) {
  const active = state.employees.filter((employee) => employee.status !== "desligado" && employee.percepcaoRH);
  if (!active.length) {
    return {
      employeeCount: 0,
      satisfactionErrorAverage: 0,
      exitRiskErrorAverage: 0,
      overloadErrorAverage: 0,
      confidenceAverage: 0,
      highRiskFalseNegativeCount: 0,
      highRiskFalsePositiveCount: 0,
      overloadedHiddenCount: 0,
    };
  }

  const rows = active.map((employee) => {
    const perception = employee.percepcaoRH;
    return {
      satisfactionError: Math.abs((perception.satisfacaoEstimada || 0) - employee.satisfacao),
      exitRiskError: Math.abs((perception.riscoSaidaEstimado || 0) - employee.riscoDeSaida),
      overloadError: Math.abs((perception.sobrecargaEstimada || 0) - employee.sobrecarga),
      confidence: perception.confiabilidadeGeral || 0,
      highRiskFalseNegative: employee.riscoDeSaida > 75 && (perception.riscoSaidaEstimado || 0) < 55,
      highRiskFalsePositive: employee.riscoDeSaida < 45 && (perception.riscoSaidaEstimado || 0) > 70,
      overloadedHidden: employee.sobrecarga > 78 && (perception.sobrecargaEstimada || 0) < 58,
    };
  });

  return {
    employeeCount: active.length,
    satisfactionErrorAverage: average(rows.map((row) => row.satisfactionError)),
    exitRiskErrorAverage: average(rows.map((row) => row.exitRiskError)),
    overloadErrorAverage: average(rows.map((row) => row.overloadError)),
    confidenceAverage: average(rows.map((row) => row.confidence)),
    highRiskFalseNegativeCount: rows.filter((row) => row.highRiskFalseNegative).length,
    highRiskFalsePositiveCount: rows.filter((row) => row.highRiskFalsePositive).length,
    overloadedHiddenCount: rows.filter((row) => row.overloadedHidden).length,
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

module.exports = {
  summarizePerceptionAccuracy,
};
