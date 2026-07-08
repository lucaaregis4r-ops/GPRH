/**
 * Modulo: eventMemoryArchitecture.test
 * Responsabilidade: validar separacao entre eventos organizacionais e memorias individuais.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { assert } = require("./testUtils");

function run() {
  const state = createProceduralRHSimulation("RH-ARQ-EVENTOS-MEMORIAS");
  advanceDays(state, 90);

  assert(!("memories" in state), "estado nao deve manter state.memories; usar organizationEvents");
  assert(!("memoriaOrganizacional" in state), "estado nao deve manter memoriaOrganizacional; usar organizationEvents");
  assert(Array.isArray(state.organizationEvents), "estado deve ter organizationEvents");
  assert(state.organizationEvents.length > 0, "deve haver eventos organizacionais objetivos");

  state.organizationEvents.forEach((event) => {
    assert(event.id, "evento organizacional sem id");
    assert(typeof event.dia === "number", `evento ${event.id} sem dia numerico`);
    assert(event.tipo, `evento ${event.id} sem tipo`);
    assert(event.descricao, `evento ${event.id} sem descricao`);
    assert(Array.isArray(event.tags), `evento ${event.id} sem tags`);
    assert(event.setorId || event.funcionariosEnvolvidos.length, `evento ${event.id} sem setor ou envolvidos`);
  });

  const allMemories = state.employees.flatMap((employee) =>
    employee.memorias.map((memory) => ({ employee, memory }))
  );
  assert(allMemories.length > 0, "deve haver memorias individuais");

  allMemories.forEach(({ employee, memory }) => {
    assert(memory.funcionarioId === employee.id, `memoria ${memory.id} nao pertence ao funcionario correto`);
    assert(memory.origemEventoId, `memoria ${memory.id} sem origemEventoId`);
    assert(
      state.organizationEvents.some((event) => event.id === memory.origemEventoId),
      `memoria ${memory.id} aponta evento inexistente`
    );
    assert(memory.papelNoEvento, `memoria ${memory.id} sem papelNoEvento`);
    assert(memory.impactoResidual, `memoria ${memory.id} sem impactoResidual`);
    assert(memory.valencia, `memoria ${memory.id} sem valencia`);
  });

  const memoriesByEvent = new Map();
  allMemories.forEach(({ memory }) => {
    memoriesByEvent.set(memory.origemEventoId, (memoriesByEvent.get(memory.origemEventoId) || 0) + 1);
  });

  assert(
    [...memoriesByEvent.values()].some((count) => count > 1),
    "ao menos um evento deve gerar multiplas memorias individuais"
  );
}

module.exports = {
  run,
};
