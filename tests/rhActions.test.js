/**
 * Modulo: rhActions.test
 * Responsabilidade: validar acoes de descoberta do RH.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { processRhAction } = require("../rh/rhActionProcessor");
const { assert, collectCoherenceAlerts, collectRangeAlerts } = require("./testUtils");

function run() {
  const state = createProceduralRHSimulation("RH-ACOES-DESCOBERTA-001");
  const employee = state.employees.find((item) => item.status !== "desligado");
  const sector = state.sectors.find((item) => item.id === employee.setorId);

  const initialEnergy = state.rh.energiaAtual;
  const initialSignalCount = state.visibleSignals.length;
  const initialRiskEstimate = employee.percepcaoRH.riscoSaidaEstimado;

  const checkin = processRhAction(state, "checkin_individual_rapido", { employeeId: employee.id });
  assert(checkin.status === "concluida", "check-in deve concluir");
  assert(state.rh.energiaAtual === initialEnergy - 1, "check-in deve consumir energia");
  assert(state.visibleSignals.length > initialSignalCount, "check-in deve gerar sinal");

  const conversation = processRhAction(state, "conversa_individual_profunda", { employeeId: employee.id });
  assert(conversation.sinaisGerados.length >= 1, "conversa profunda deve gerar sinais");
  assert(
    employee.percepcaoRH.riscoSaidaEstimado !== employee.riscoDeSaida || employee.percepcaoRH.confiabilidadeGeral < 100,
    "acao de descoberta nao deve copiar risco real automaticamente"
  );

  processRhAction(state, "pesquisa_clima_simples", { sectorId: sector.id });
  processRhAction(state, "revisar_sinais_compliance", { sectorId: sector.id });

  assert(
    employee.percepcaoRH.riscoSaidaEstimado !== initialRiskEstimate ||
      employee.percepcaoRH.confiabilidadeGeral > 18,
    "acoes de descoberta devem alterar leitura ou confiabilidade"
  );

  exhaustEnergy(state);
  assertThrows(() => processRhAction(state, "checkin_individual_rapido", { employeeId: employee.id }), "energia insuficiente deve bloquear acao");

  advanceDays(state, 7);
  assert(state.rh.energiaAtual === state.rh.energiaSemanal, "energia RH deve resetar na semana seguinte");

  const rangeAlerts = collectRangeAlerts(state);
  const coherenceAlerts = collectCoherenceAlerts(state);
  assert(!rangeAlerts.length, `faixas invalidas apos acoes RH:\n${rangeAlerts.join("\n")}`);
  assert(!coherenceAlerts.length, `incoerencias apos acoes RH:\n${coherenceAlerts.join("\n")}`);
}

function exhaustEnergy(state) {
  state.rh.energiaAtual = 0;
}

function assertThrows(fn, message) {
  let thrown = false;
  try {
    fn();
  } catch (error) {
    thrown = true;
  }
  assert(thrown, message);
}

module.exports = {
  run,
};
