/**
 * Modulo: rhPlanningInterventions.test
 * Responsabilidade: validar planejamento de acoes RH e intervencoes iniciais.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { processRhAction, scheduleRhAction } = require("../rh/rhActionProcessor");
const { assert, collectCoherenceAlerts, collectRangeAlerts } = require("./testUtils");

function run() {
  const state = createProceduralRHSimulation("RH-PLANEJAMENTO-001");
  const employee = state.employees
    .filter((item) => item.status !== "desligado")
    .sort((left, right) => right.riscoDeSaida - left.riscoDeSaida)[0];
  const sector = state.sectors.find((item) => item.id === employee.setorId);

  assertThrows(
    () => processRhAction(state, "redistribuir_funcoes", { employeeId: employee.id }),
    "redistribuir funcoes deve exigir planejamento"
  );

  const plan = scheduleRhAction(state, "acompanhar_funcionario_risco", { employeeId: employee.id }, { diasPreparo: 7 });
  assert(plan.status === "planejada", "acao deve ser planejada");
  assert(state.rh.acoesPlanejadas.length === 1, "plano deve entrar no estado RH");

  const initialRisk = employee.riscoDeSaida;
  advanceDays(state, 7);
  assert(plan.status === "executada", "plano deve executar apos preparo");
  assert(state.rh.acoesExecutadas.some((action) => action.id === plan.acaoExecutadaId), "acao planejada deve ser registrada");
  assert(employee.riscoDeSaida <= initialRisk + 2, "acompanhamento planejado nao deve piorar fortemente o risco");

  const functionPlan = scheduleRhAction(state, "redistribuir_funcoes", { employeeId: employee.id }, { diasPreparo: 10 });
  advanceDays(state, 10);
  assert(["executada", "bloqueada"].includes(functionPlan.status), "plano de redistribuicao deve concluir ou bloquear claramente");

  const rumorBefore = sector.rumorLocal;
  const communication = processRhAction(state, "conter_rumor", { sectorId: sector.id });
  assert(communication.planejamento.improvisada, "execucao direta deve ser marcada como improvisada");
  assert(sector.rumorLocal <= rumorBefore + 8, "conter rumor improvisado pode ser fraco, mas nao deve explodir rumor");

  assertPlannedDiscoveryIsMoreReliable();

  const rangeAlerts = collectRangeAlerts(state);
  const coherenceAlerts = collectCoherenceAlerts(state);
  assert(!rangeAlerts.length, `faixas invalidas apos planejamento RH:\n${rangeAlerts.join("\n")}`);
  assert(!coherenceAlerts.length, `incoerencias apos planejamento RH:\n${coherenceAlerts.join("\n")}`);
}

function assertPlannedDiscoveryIsMoreReliable() {
  const improvisedState = createProceduralRHSimulation("RH-PESQUISA-PLANEJADA-001");
  const plannedState = createProceduralRHSimulation("RH-PESQUISA-PLANEJADA-001");
  const sectorId = improvisedState.sectors[0].id;
  const plannedSectorId = plannedState.sectors[0].id;

  const improvisedAction = processRhAction(improvisedState, "pesquisa_clima_simples", { sectorId });
  const plan = scheduleRhAction(plannedState, "pesquisa_clima_simples", { sectorId: plannedSectorId }, { diasPreparo: 7 });
  advanceDays(plannedState, 7);

  const plannedAction = plannedState.rh.acoesExecutadas.find((action) => action.id === plan.acaoExecutadaId);
  const improvisedSignal = improvisedState.visibleSignals.find((signal) => signal.origemEventoId === improvisedAction.eventosGerados[0]);
  const plannedSignal = plannedState.visibleSignals.find((signal) => signal.origemEventoId === plannedAction.eventosGerados[0]);

  assert(improvisedAction.planejamento.improvisada, "pesquisa direta deve ser improvisada");
  assert(plannedAction.planejamento.qualidadePlanejamento >= 100, "pesquisa planejada deve atingir preparo ideal no teste");
  assert(plannedSignal.confiabilidade > improvisedSignal.confiabilidade, "pesquisa planejada deve gerar sinal mais confiavel que improvisada");
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
