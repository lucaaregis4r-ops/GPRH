/**
 * Modulo: mvpCalibration.test
 * Responsabilidade: validar relatorio de calibragem do MVP jogavel.
 */

const { runMvpCalibration, compareSeed } = require("../game/mvpCalibration");
const { assert } = require("./testUtils");

function run() {
  testSingleSeedComparison();
  testAggregateCalibration();
}

function testSingleSeedComparison() {
  const row = compareSeed("RH-MVP-CALIB-TESTE-001");

  assert(row.noAction.finalEvaluation, "comparacao deve avaliar sessao sem acoes");
  assert(row.misguided.finalEvaluation, "comparacao deve avaliar estrategia mal direcionada");
  assert(row.technical.finalEvaluation, "comparacao deve avaliar sessao com estrategia tecnica");
  assert(row.technical.actionMetrics.weeks === 12, "estrategia tecnica deve jogar 12 semanas");
  assert(typeof row.actionScoreDelta === "number", "comparacao deve calcular delta de score");
}

function testAggregateCalibration() {
  const report = runMvpCalibration(3);

  assert(report.summary.seedCount === 3, "relatorio deve respeitar quantidade de seeds");
  assert(report.summary.technical.actionsPerWeek.average >= 0, "relatorio deve medir acoes por semana");
  assert(report.summary.misguided.actionsPerWeek.average >= 0, "relatorio deve medir estrategia mal direcionada");
  assert(report.summary.technical.averageEnergySpentPerWeek.average >= 0, "relatorio deve medir energia");
  assert(report.summary.actionImpact, "relatorio deve medir impacto das acoes");
  assert(typeof report.summary.actionImpact.informedVsMisguidedAverageScoreDelta === "number", "relatorio deve comparar boa e ma priorizacao");
  assert(Array.isArray(report.calibrationAlerts), "relatorio deve listar alertas");
  assert(report.diagnosis, "relatorio deve produzir diagnostico");
}

module.exports = {
  run,
};
