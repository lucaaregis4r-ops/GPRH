/**
 * Modulo: turnoverRisk.test
 * Responsabilidade: validar risco individual, escolaridade/especializacao e turnover agregado visivel ao RH.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { assert } = require("./testUtils");

function run() {
  const state = createProceduralRHSimulation("RH-TURNOVER-RISCO-001");

  state.employees.forEach((employee) => {
    assert(employee.escolaridade, `funcionario ${employee.id} deve ter escolaridade`);
    assert(typeof employee.nivelEnsinoMercado === "number", `funcionario ${employee.id} deve ter nivelEnsinoMercado`);
    assert(typeof employee.ajusteEducacaoCargo === "number", `funcionario ${employee.id} deve ter ajusteEducacaoCargo`);
    assert(typeof employee.ajusteEspecializacaoCargo === "number", `funcionario ${employee.id} deve ter ajusteEspecializacaoCargo`);
    assert(typeof employee.riscoDeSaida === "number", `funcionario ${employee.id} deve ter risco individual interno`);
    assert(employee.percepcaoRH, `funcionario ${employee.id} deve ter percepcaoRH`);
    assert(
      employee.percepcaoRH.riscoSaidaEstimado !== employee.riscoDeSaida ||
        employee.percepcaoRH.confiabilidadeGeral < 100,
      `RH nao deve ver risco individual real automaticamente em ${employee.id}`
    );
  });

  advanceDays(state, 180);

  assert(typeof state.company.taxaTurnover === "number", "empresa deve ter taxaTurnover agregada");
  assert(
    typeof state.company.dadosVisiveis.taxaTurnoverEmpresa === "number",
    "RH deve ver taxa de turnover agregada da empresa"
  );

  state.sectors.forEach((sector) => {
    assert(typeof sector.taxaTurnover === "number", `setor ${sector.id} deve ter taxaTurnover`);
    assert(
      typeof sector.dadosVisiveis.taxaTurnoverSetor === "number",
      `RH deve ver taxa de turnover agregada do setor ${sector.id}`
    );
  });
}

module.exports = {
  run,
};
