/**
 * Modulo: rhInterventionPreview
 * Responsabilidade: demonstrar planejamento e intervencoes iniciais do RH pelo console.
 * Entrada: seed via linha de comando
 * Saida: planos, execucoes, energia e impactos tecnicos
 * Nao deve: criar UI jogavel, campanha, objetivos ou avatares.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { processRhAction, scheduleRhAction } = require("../rh/rhActionProcessor");

function runRhInterventionPreview(seed = "RH-INTERVENCAO-001") {
  const state = createProceduralRHSimulation(seed);
  advanceDays(state, 30);

  const employee = state.employees
    .filter((item) => item.status !== "desligado")
    .sort((left, right) => right.percepcaoRH.riscoSaidaEstimado - left.percepcaoRH.riscoSaidaEstimado)[0];
  const sector = state.sectors.find((item) => item.id === employee.setorId);

  console.log("\nPREVIEW_INTERVENCOES_PLANEJADAS_RH");
  console.log(`Seed: ${seed}`);
  console.log(`Empresa: ${state.company.nome}`);
  console.log(`Dia inicial: ${state.calendar.totalDiasSimulados}`);
  console.log(`Energia RH inicial: ${state.rh.energiaAtual}/${state.rh.energiaSemanal}`);
  console.log(`Funcionario alvo: ${employee.nome}`);
  console.log(`Setor alvo: ${sector.nome}`);
  console.log(`Risco real inicial: ${Math.round(employee.riscoDeSaida)}`);
  console.log(`Risco estimado RH inicial: ${Math.round(employee.percepcaoRH.riscoSaidaEstimado)}`);
  console.log(`Sobrecarga inicial: ${Math.round(employee.sobrecarga)}`);

  try {
    processRhAction(state, "redistribuir_funcoes", { employeeId: employee.id });
  } catch (error) {
    console.log(`Improviso bloqueado: ${error.message}`);
  }

  const quickCommunication = processRhAction(state, "conter_rumor", { sectorId: sector.id });
  console.log(
    `Improviso permitido: ${quickCommunication.nome} | qualidade ${quickCommunication.planejamento.qualidadePlanejamento} | energia ${state.rh.energiaAtual}`
  );

  const plans = [
    scheduleRhAction(state, "acompanhar_funcionario_risco", { employeeId: employee.id }, { diasPreparo: 7 }),
    scheduleRhAction(state, "redistribuir_funcoes", { employeeId: employee.id }, { diasPreparo: 12 }),
  ];

  console.log("\nPLANOS_CRIADOS");
  plans.forEach((plan) => {
    console.log(`- ${plan.nome} | executar no dia ${plan.executarNoDia} | preparo planejado ${plan.diasPreparoPlanejados}`);
  });

  advanceDays(state, 12);

  console.log("\nRESULTADO_APOS_12_DIAS");
  console.log(`Dia final: ${state.calendar.totalDiasSimulados}`);
  console.log(`Energia RH final: ${state.rh.energiaAtual}/${state.rh.energiaSemanal}`);
  state.rh.acoesPlanejadas.forEach((plan) => {
    const suffix = plan.motivoBloqueio ? ` | motivo: ${plan.motivoBloqueio}` : "";
    console.log(`- ${plan.nome} | status ${plan.status} | qualidade ${plan.qualidadePlanejamento}${suffix}`);
  });
  console.log(`Acoes RH executadas: ${state.rh.acoesExecutadas.length}`);
  console.log(`Risco real final: ${Math.round(employee.riscoDeSaida)}`);
  console.log(`Risco estimado RH final: ${Math.round(employee.percepcaoRH.riscoSaidaEstimado)}`);
  console.log(`Sobrecarga final: ${Math.round(employee.sobrecarga)}`);
  console.log(`Sinais visiveis totais: ${state.visibleSignals.filter((signal) => signal.visivelParaRH).length}`);

  return state;
}

if (require.main === module) {
  runRhInterventionPreview(process.argv[2] || "RH-INTERVENCAO-001");
}

module.exports = {
  runRhInterventionPreview,
};
