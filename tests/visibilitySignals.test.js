/**
 * Modulo: visibilitySignals.test
 * Responsabilidade: validar sinais visiveis e leitura imperfeita do RH.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { getHiddenSignals, getVisibleSignals } = require("../knowledge/visibilitySimulation");
const { assert, assertEqual, stableSnapshot } = require("./testUtils");

function run() {
  const seed = "RH-SINAIS-001";
  const initialA = createProceduralRHSimulation(seed);
  const initialB = createProceduralRHSimulation(seed);

  assertEqual(stableSnapshot(initialA), stableSnapshot(initialB), "sinais iniciais devem ser deterministicos");
  assert(initialA.visibleSignals.length > 0, "estado inicial deve gerar sinais de visibilidade");
  assert(initialA.visibleSignals.some((signal) => signal.origem === "memoria_individual"), "memorias individuais devem gerar sinais");

  validateSignals(initialA);
  validatePerceptionIsImperfect(initialA);

  advanceDays(initialA, 90);
  advanceDays(initialB, 90);

  assertEqual(stableSnapshot(initialA), stableSnapshot(initialB), "sinais apos 90 dias devem ser deterministicos");
  assert(getVisibleSignals(initialA).length > 0, "deve haver sinais visiveis ao RH");
  assert(getHiddenSignals(initialA).length > 0, "deve haver sinais ocultos para auditoria/debug");

  validateSignals(initialA);
  validatePerceptionIsImperfect(initialA);
}

function validateSignals(state) {
  const employeeIds = new Set(state.employees.map((employee) => employee.id));
  const sectorIds = new Set(state.sectors.map((sector) => sector.id));
  const eventIds = new Set(state.organizationEvents.map((event) => event.id));
  const memoryIds = new Set(state.employees.flatMap((employee) => employee.memorias.map((memory) => memory.id)));

  state.visibleSignals.forEach((signal) => {
    assert(signal.id, "sinal deve ter id");
    assert(signal.tipo, `sinal ${signal.id} deve ter tipo`);
    assert(signal.confiabilidade >= 0 && signal.confiabilidade <= 100, `sinal ${signal.id} com confiabilidade invalida`);
    assert(signal.severidade >= 0 && signal.severidade <= 100, `sinal ${signal.id} com severidade invalida`);
    if (signal.funcionarioId) assert(employeeIds.has(signal.funcionarioId), `sinal ${signal.id} aponta funcionario invalido`);
    if (signal.setorId) assert(sectorIds.has(signal.setorId), `sinal ${signal.id} aponta setor invalido`);
    if (signal.origemEventoId) assert(eventIds.has(signal.origemEventoId), `sinal ${signal.id} aponta evento invalido`);
    if (signal.origemMemoriaId) assert(memoryIds.has(signal.origemMemoriaId), `sinal ${signal.id} aponta memoria invalida`);
  });
}

function validatePerceptionIsImperfect(state) {
  state.employees.forEach((employee) => {
    const perception = employee.percepcaoRH;
    assert(perception, `funcionario ${employee.id} deve ter percepcaoRH`);
    assert(Array.isArray(perception.sinaisRecentes), `funcionario ${employee.id} deve ter sinaisRecentes`);
    assert(
      perception.satisfacaoEstimada !== employee.satisfacao ||
        perception.riscoSaidaEstimado !== employee.riscoDeSaida ||
        perception.sobrecargaEstimada !== employee.sobrecarga,
      `percepcaoRH de ${employee.id} nao deve copiar automaticamente o estado real`
    );
  });
}

module.exports = {
  run,
};
