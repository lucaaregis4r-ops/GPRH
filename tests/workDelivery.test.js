/**
 * Modulo: workDelivery.test
 * Responsabilidade: validar entrega, qualidade e sustentabilidade do trabalho.
 */

const { createGameSession } = require("../game/gameLoop");
const { advanceDays } = require("../simulation/simulationEngine");
const {
  calculateEmployeeWorkIndicators,
  simulateWorkDeliveryOneDay,
} = require("../simulation/workDeliverySimulation");
const { buildGameSnapshot } = require("../game/gameSnapshot");
const { assert } = require("./testUtils");

function run() {
  testEmployeeCanHaveHighDeliveryAndLowSustainability();
  testWorkIndicatorsExistAtGeneration();
  testDailyWorkDeliveryHistory();
  testSnapshotExposesWorkIndicators();
}

function testEmployeeCanHaveHighDeliveryAndLowSustainability() {
  const indicators = calculateEmployeeWorkIndicators(
    {
      produtividade: 96,
      focusIndividual: 92,
      energyIndividual: 24,
      especializacao: 94,
      sobrecarga: 88,
      suportePercebido: 22,
      confiancaNaGestao: 24,
      medo: 82,
      justicaPercebida: 18,
    },
    { conflitoLocal: 15 }
  );

  assert(indicators.deliveryCapacity >= 60, "funcionario pode manter entrega alta mesmo sob desgaste");
  assert(indicators.workSustainability <= 25, "sobrecarga e medo devem derrubar sustentabilidade");
  assert(indicators.deliveryQuality < indicators.deliveryCapacity, "qualidade pode ficar abaixo do volume entregue");
}

function testWorkIndicatorsExistAtGeneration() {
  const session = createGameSession("RH-WORK-DELIVERY-GEN-001");
  const activeEmployees = session.state.employees.filter((employee) => employee.status !== "desligado");

  assert(activeEmployees.every((employee) => Number.isFinite(employee.deliveryCapacity)), "funcionarios devem ter capacidade de entrega");
  assert(activeEmployees.every((employee) => Number.isFinite(employee.deliveryQuality)), "funcionarios devem ter qualidade de entrega");
  assert(activeEmployees.every((employee) => Number.isFinite(employee.workSustainability)), "funcionarios devem ter sustentabilidade");
  assert(session.state.sectors.every((sector) => sector.workIndicators), "setores devem ter agregados de trabalho");
}

function testDailyWorkDeliveryHistory() {
  const session = createGameSession("RH-WORK-DELIVERY-DAY-001");
  const before = session.state.workDeliveryHistory.length;

  advanceDays(session.state, 2);
  simulateWorkDeliveryOneDay(session.state);

  assert(session.state.workDeliveryHistory.length >= before + 3, "historico de trabalho deve registrar fechamento diario");
  assert(session.state.workDeliveryHistory.at(-1).company.workSustainability >= 0, "historico deve conter sustentabilidade agregada");
}

function testSnapshotExposesWorkIndicators() {
  const session = createGameSession("RH-WORK-DELIVERY-SNAPSHOT-001");
  const snapshot = buildGameSnapshot(session);

  assert(snapshot.world.npcs.every((npc) => npc.workIndicators), "snapshot deve expor indicadores de trabalho por NPC");
  assert(snapshot.world.sectors.every((sector) => sector.workIndicators), "snapshot deve expor indicadores de trabalho por setor");
}

module.exports = {
  run,
};
