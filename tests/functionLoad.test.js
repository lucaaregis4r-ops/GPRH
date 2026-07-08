/**
 * Modulo: functionLoad.test
 * Responsabilidade: validar funcoes reais, cargo formal e memorias dinamicas.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { redistributeFunctionsAfterExit } = require("../simulation/functionLoadSimulation");
const { summarizePerceptionAccuracy } = require("../knowledge/perceptionDiagnostics");
const { assert, collectCoherenceAlerts, collectRangeAlerts } = require("./testUtils");

function run() {
  const state = createProceduralRHSimulation("RH-FUNCOES-001");

  state.employees.forEach((employee) => {
    assert(employee.cargoFormal && typeof employee.cargoFormal === "object", `cargo formal deve ser estruturado em ${employee.id}`);
    assert(Array.isArray(employee.funcoesPrevistas) && employee.funcoesPrevistas.length, `funcionario ${employee.id} sem funcoes previstas`);
    assert(Array.isArray(employee.funcoesReais) && employee.funcoesReais.length, `funcionario ${employee.id} sem funcoes reais`);
    assert(typeof employee.cargaFuncionalTotal === "number", `funcionario ${employee.id} sem cargaFuncionalTotal`);
    assert(typeof employee.trabalhoInvisivel === "number", `funcionario ${employee.id} sem trabalhoInvisivel`);
  });

  const sector = state.sectors.find((item) => item.funcionariosIds.length >= 2);
  const employees = state.employees.filter((employee) => employee.setorId === sector.id && employee.status !== "desligado");
  const exiting = employees[0];
  const inheritor = employees[1];
  const previousFunctionCount = inheritor.funcoesReais.length;
  const result = redistributeFunctionsAfterExit(state, exiting, inheritor);

  assert(result && result.event, "redistribuicao funcional deve criar evento objetivo");
  assert(inheritor.funcoesReais.length > previousFunctionCount, "herdeiro deve receber funcoes reais redistribuidas");
  assert(
    inheritor.memorias.some((memory) => memory.origemEventoId === result.event.id),
    "redistribuicao funcional deve gerar memoria individual no herdeiro"
  );

  advanceDays(state, 30);

  const rangeAlerts = collectRangeAlerts(state);
  const coherenceAlerts = collectCoherenceAlerts(state);
  assert(!rangeAlerts.length, `faixas invalidas em funcoes:\n${rangeAlerts.join("\n")}`);
  assert(!coherenceAlerts.length, `incoerencias em funcoes:\n${coherenceAlerts.join("\n")}`);

  const perception = summarizePerceptionAccuracy(state);
  assert(perception.employeeCount > 0, "diagnostico de percepcao deve medir funcionarios ativos");
  assert(perception.overloadErrorAverage >= 0, "erro medio de sobrecarga deve ser numerico");
}

module.exports = {
  run,
};
