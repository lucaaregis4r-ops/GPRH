/**
 * Modulo: rhDiscoveryPreview
 * Responsabilidade: demonstrar acoes de descoberta do RH pelo console.
 * Entrada: seed via linha de comando
 * Saida: resumo de acoes, energia, sinais e percepcao
 * Nao deve: criar UI jogavel, campanha ou intervencoes complexas.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { processRhAction } = require("../rh/rhActionProcessor");

function runRhDiscoveryPreview(seed = "RH-DESCOBERTA-001") {
  const state = createProceduralRHSimulation(seed);
  advanceDays(state, 30);

  const employee = state.employees
    .filter((item) => item.status !== "desligado")
    .sort((left, right) => right.percepcaoRH.riscoSaidaEstimado - left.percepcaoRH.riscoSaidaEstimado)[0];
  const sector = state.sectors.find((item) => item.id === employee.setorId);

  console.log("\nPREVIEW_ACOES_DESCOBERTA_RH");
  console.log(`Seed: ${seed}`);
  console.log(`Empresa: ${state.company.nome}`);
  console.log(`Energia semanal: ${state.rh.energiaSemanal}`);
  console.log(`Energia atual inicial: ${state.rh.energiaAtual}`);
  console.log(`Funcionario alvo: ${employee.nome}`);
  console.log(`Setor alvo: ${sector.nome}`);
  console.log(`Risco estimado inicial: ${Math.round(employee.percepcaoRH.riscoSaidaEstimado)}`);
  console.log(`Confiabilidade inicial: ${Math.round(employee.percepcaoRH.confiabilidadeGeral)}`);

  const actions = [
    () => processRhAction(state, "checkin_individual_rapido", { employeeId: employee.id }),
    () => processRhAction(state, "conversa_individual_profunda", { employeeId: employee.id }),
    () => processRhAction(state, "pesquisa_clima_simples", { sectorId: sector.id }),
    () => processRhAction(state, "revisar_sinais_compliance", { sectorId: sector.id }),
  ];

  actions.forEach((runAction) => {
    try {
      const action = runAction();
      console.log(`- ${action.nome} | energia ${action.custoEnergia} | sinais ${action.sinaisGerados.length}`);
    } catch (error) {
      console.log(`- acao nao executada: ${error.message}`);
    }
  });

  console.log(`Energia atual final: ${state.rh.energiaAtual}`);
  console.log(`Risco estimado final: ${Math.round(employee.percepcaoRH.riscoSaidaEstimado)}`);
  console.log(`Confiabilidade final: ${Math.round(employee.percepcaoRH.confiabilidadeGeral)}`);
  console.log(`Sinais visiveis totais: ${state.visibleSignals.filter((signal) => signal.visivelParaRH).length}`);
  console.log(`Acoes RH registradas: ${state.rh.acoesExecutadas.length}`);

  return state;
}

if (require.main === module) {
  runRhDiscoveryPreview(process.argv[2] || "RH-DESCOBERTA-001");
}

module.exports = {
  runRhDiscoveryPreview,
};
