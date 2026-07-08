/**
 * Modulo: runAllTests
 * Responsabilidade: executar todos os testes simples da engine em Node puro.
 */

const tests = [
  { name: "determinism.test", module: require("./determinism.test") },
  { name: "ranges.test", module: require("./ranges.test") },
  { name: "coherence.test", module: require("./coherence.test") },
  { name: "eventMemoryArchitecture.test", module: require("./eventMemoryArchitecture.test") },
  { name: "visibilitySignals.test", module: require("./visibilitySignals.test") },
  { name: "functionLoad.test", module: require("./functionLoad.test") },
  { name: "turnoverRisk.test", module: require("./turnoverRisk.test") },
  { name: "compliance.test", module: require("./compliance.test") },
  { name: "rhActions.test", module: require("./rhActions.test") },
  { name: "rhPlanningInterventions.test", module: require("./rhPlanningInterventions.test") },
  { name: "rhDirectorDemands.test", module: require("./rhDirectorDemands.test") },
  { name: "mvpLoop.test", module: require("./mvpLoop.test") },
  { name: "uiSimple.test", module: require("./uiSimple.test") },
  { name: "scenarioEvaluation.test", module: require("./scenarioEvaluation.test") },
  { name: "saveLoad.test", module: require("./saveLoad.test") },
  { name: "mvpCalibration.test", module: require("./mvpCalibration.test") },
  { name: "gameSnapshot.test", module: require("./gameSnapshot.test") },
  { name: "dayLoop.test", module: require("./dayLoop.test") },
  { name: "officeMap.test", module: require("./officeMap.test") },
  { name: "uiPhaser.test", module: require("./uiPhaser.test") },
];

async function runAllTests() {
  const failures = [];

  for (const test of tests) {
    try {
      await test.module.run();
      console.log(`OK ${test.name}`);
    } catch (error) {
      failures.push({ name: test.name, error });
      console.error(`FALHOU ${test.name}`);
      console.error(error.message);
    }
  }

  if (failures.length) {
    console.error(`\n${failures.length} TESTE(S) FALHARAM`);
    process.exitCode = 1;
    return false;
  }

  console.log("\nTODOS_OS_TESTES_PASSARAM");
  return true;
}

if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
};
