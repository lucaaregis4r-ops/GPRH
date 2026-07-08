/**
 * Modulo: coherence.test
 * Responsabilidade: validar coerencia basica de entidades e referencias.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { assert, collectCoherenceAlerts } = require("./testUtils");

function run() {
  const seeds = ["RH-COERENCIA-001", "RH-COERENCIA-002", "RH-COERENCIA-003"];

  seeds.forEach((seed) => {
    const state = createProceduralRHSimulation(seed);
    let alerts = collectCoherenceAlerts(state);
    assert(!alerts.length, `incoerencias no estado inicial ${seed}:\n${alerts.join("\n")}`);

    advanceDays(state, 30);
    alerts = collectCoherenceAlerts(state);
    assert(!alerts.length, `incoerencias apos 30 dias ${seed}:\n${alerts.join("\n")}`);
  });
}

module.exports = {
  run,
};
