/**
 * Modulo: determinism.test
 * Responsabilidade: validar determinismo basico da engine procedural.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { assertNotEqual, assertEqual, stableSnapshot } = require("./testUtils");

function run() {
  const seed = "RH-DETERMINISMO-001";
  const initialA = createProceduralRHSimulation(seed);
  const initialB = createProceduralRHSimulation(seed);

  assertEqual(stableSnapshot(initialA), stableSnapshot(initialB), "mesma seed deve gerar mesmo estado inicial");

  const finalA = createProceduralRHSimulation(seed);
  const finalB = createProceduralRHSimulation(seed);
  advanceDays(finalA, 30);
  advanceDays(finalB, 30);

  assertEqual(stableSnapshot(finalA), stableSnapshot(finalB), "mesma seed + 30 dias deve gerar mesmo estado final");

  const other = createProceduralRHSimulation("RH-DETERMINISMO-002");
  assertNotEqual(
    `${initialA.company.nome}:${initialA.company.arquetipo}:${initialA.company.setorEconomico}`,
    `${other.company.nome}:${other.company.arquetipo}:${other.company.setorEconomico}`,
    "seeds diferentes devem gerar empresas diferentes"
  );
}

module.exports = {
  run,
};
