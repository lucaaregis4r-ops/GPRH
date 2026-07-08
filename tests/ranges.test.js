/**
 * Modulo: ranges.test
 * Responsabilidade: validar faixas numericas e financeiro finito.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { assert, collectRangeAlerts } = require("./testUtils");

function run() {
  const seeds = ["RH-RANGE-001", "RH-RANGE-002", "RH-RANGE-003", "RH-RANGE-004", "RH-RANGE-005"];

  seeds.forEach((seed) => {
    const initial = createProceduralRHSimulation(seed);
    const initialAlerts = collectRangeAlerts(initial);
    assert(!initialAlerts.length, `faixas invalidas no estado inicial ${seed}:\n${initialAlerts.join("\n")}`);

    advanceDays(initial, 90);
    const finalAlerts = collectRangeAlerts(initial);
    assert(!finalAlerts.length, `faixas invalidas apos 90 dias ${seed}:\n${finalAlerts.join("\n")}`);
  });
}

module.exports = {
  run,
};
