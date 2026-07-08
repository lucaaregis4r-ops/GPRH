/**
 * Modulo: proceduralPreview
 * Responsabilidade: demonstrar a engine procedural isolada pelo console.
 * Entrada: seed opcional via argumento de linha de comando
 * Saida: relatorios tecnicos no console
 * Nao deve: implementar UI jogavel ou acoes do RH.
 */

const {
  createProceduralRHSimulation,
  advanceDays,
  advanceOneDay,
  advanceMonth,
  simulateUntil,
} = require("../simulation/simulationEngine");
const {
  printCompanySummary,
  printEmployeesSummary,
  printRelationsSummary,
  printMemoriesSummary,
  printMonthlyReport,
  printEmployeeActionsSummary,
} = require("../reports/consoleReport");

function runPreview(seed = "RH-TESTE-001") {
  const state = createProceduralRHSimulation(seed);

  printCompanySummary(state);
  printEmployeesSummary(state);
  printRelationsSummary(state);
  printMemoriesSummary(state);

  advanceDays(state, 30);
  printMonthlyReport(state);
  printMemoriesSummary(state);

  return state;
}

if (require.main === module) {
  runPreview(process.argv[2] || "RH-TESTE-001");
}

module.exports = {
  runPreview,
  createProceduralRHSimulation,
  advanceOneDay,
  advanceDays,
  advanceMonth,
  simulateUntil,
  printCompanySummary,
  printEmployeesSummary,
  printRelationsSummary,
  printMemoriesSummary,
  printMonthlyReport,
  printEmployeeActionsSummary,
};
