/**
 * Modulo: uiStateAdapter
 * Responsabilidade: preparar dados da engine para a UI simples.
 * Entrada: sessao de jogo
 * Saida: objetos serializaveis para API/browser
 * Nao deve: alterar estado, processar simulacao ou acessar DOM.
 */

const { RH_DISCOVERY_ACTIONS, RH_INTERVENTION_ACTIONS } = require("../rh/rhActionCatalog");
const { buildWeeklyBriefing } = require("../game/weekPlanner");

function serializeSession(session) {
  const state = session.state;
  const briefing = buildWeeklyBriefing(state);
  const activeEmployees = state.employees.filter((employee) => employee.status !== "desligado");

  return {
    seed: session.seed,
    status: session.status,
    semanaAtual: session.semanaAtual,
    horizonteSemanas: session.horizonteSemanas,
    scenario: session.scenario,
    avaliacaoFinal: session.avaliacaoFinal,
    company: {
      nome: state.company.nome,
      arquetipo: state.company.arquetipo,
      segmento: state.company.setorEconomico,
      tamanho: state.company.tamanho,
      taxaTurnover: Math.round(state.company.taxaTurnover || 0),
      rumorGlobal: Math.round(state.company.rumorGlobal || 0),
    },
    calendar: {
      dia: state.calendar.totalDiasSimulados,
      mes: state.calendar.mesAtual,
      ano: state.calendar.anoAtual,
    },
    rh: {
      energiaAtual: state.rh.energiaAtual,
      energiaSemanal: state.rh.energiaSemanal,
      acoesPlanejadas: state.rh.acoesPlanejadas.slice(-8).map((plan) => ({
        id: plan.id,
        nome: plan.nome,
        tipo: plan.tipo,
        status: plan.status,
        executarNoDia: plan.executarNoDia,
        diasPreparados: plan.diasPreparados,
        diasPreparoPlanejados: plan.diasPreparoPlanejados,
        qualidadePlanejamento: Math.round(plan.qualidadePlanejamento),
        motivoBloqueio: plan.motivoBloqueio || null,
      })),
      acoesExecutadas: state.rh.acoesExecutadas.slice(-8).map((action) => ({
        id: action.id,
        dia: action.dia,
        nome: action.nome,
        tipo: action.tipo,
        status: action.status,
        energia: action.custoEnergia,
        sinais: action.sinaisGerados.length,
      })),
      aprovacoesDiretoria: state.rh.aprovacoesDiretoria.slice(-6).map((approval) => ({
        id: approval.id,
        dia: approval.dia,
        tipoAcao: approval.tipoAcao,
        aprovada: approval.aprovada,
        score: Math.round(approval.score),
        motivo: approval.motivo,
      })),
    },
    economy: {
      caixa: Math.round(state.economy.caixaAtual),
      receitaMensal: Math.round(state.economy.receitaMensalAtual),
      folha: Math.round(state.economy.folhaPagamentoMensal),
      custosFixos: Math.round(state.economy.custoFixoMensal),
    },
    summary: {
      funcionariosAtivos: activeEmployees.length,
      satisfacaoMedia: roundAverage(activeEmployees.map((employee) => employee.satisfacao)),
      medoMedio: roundAverage(activeEmployees.map((employee) => employee.medo)),
      sobrecargaMedia: roundAverage(activeEmployees.map((employee) => employee.sobrecarga)),
      riscoSaidaMedio: roundAverage(activeEmployees.map((employee) => employee.riscoDeSaida)),
      climaMedio: roundAverage(state.sectors.map((sector) => sector.climaSetor)),
      demandasPendentes: activeEmployees.reduce(
        (sum, employee) => sum + employee.demandasPendentes.filter((demand) => demand.status === "pendente").length,
        0
      ),
    },
    briefing,
    sectors: state.sectors.map((sector) => ({
      id: sector.id,
      nome: sector.nome,
      funcionariosAtivos: sector.funcionariosIds.length,
      clima: Math.round(sector.climaSetor),
      carga: Math.round(sector.cargaTrabalho),
      rumor: Math.round(sector.rumorLocal || 0),
      turnover: Math.round(sector.taxaTurnover || 0),
    })),
    targetOptions: {
      employees: activeEmployees.map((employee) => ({
        id: employee.id,
        nome: employee.nome,
        setorId: employee.setorId,
        cargo: employee.cargoFormal ? employee.cargoFormal.nome : "-",
      })),
      sectors: state.sectors.map((sector) => ({
        id: sector.id,
        nome: sector.nome,
      })),
      reportCases: state.reportCases.map((reportCase) => ({
        id: reportCase.id,
        setorId: reportCase.setorId,
        status: reportCase.status,
        severidade: Math.round(reportCase.severidade || 0),
      })),
    },
    employeesAttention: activeEmployees
      .slice()
      .sort((left, right) => (right.percepcaoRH?.riscoSaidaEstimado || 0) - (left.percepcaoRH?.riscoSaidaEstimado || 0))
      .slice(0, 10)
      .map((employee) => ({
        id: employee.id,
        nome: employee.nome,
        setorId: employee.setorId,
        cargo: employee.cargoFormal ? employee.cargoFormal.nome : "-",
        riscoEstimado: Math.round(employee.percepcaoRH?.riscoSaidaEstimado || 0),
        sobrecargaEstimada: Math.round(employee.percepcaoRH?.sobrecargaEstimada || 0),
        confiabilidade: Math.round(employee.percepcaoRH?.confiabilidadeGeral || 0),
        demandasPendentes: employee.demandasPendentes
          .filter((demand) => demand.status === "pendente")
          .map((demand) => ({
            tipo: demand.tipo,
            diasEmAberto: demand.diasEmAberto || 0,
            prazoRespostaDias: demand.prazoRespostaDias || null,
          })),
      })),
    visibleSignals: (state.visibleSignals || [])
      .filter((signal) => signal.visivelParaRH)
      .slice(-12)
      .map((signal) => ({
        id: signal.id,
        dia: signal.dia,
        tipo: signal.tipo,
        funcionarioId: signal.funcionarioId,
        setorId: signal.setorId,
        confiabilidade: Math.round(signal.confiabilidade),
        descricao: signal.descricao,
      })),
    reports: session.relatoriosSemanais.slice(-6),
    availableActions: getAvailableActionsForUi(),
  };
}

function getAvailableActionsForUi() {
  return [...RH_DISCOVERY_ACTIONS, ...RH_INTERVENTION_ACTIONS].map((action) => ({
    tipo: action.tipo,
    nome: action.nome,
    categoria: action.categoria,
    alvo: action.alvo,
    custoEnergia: action.custoEnergia,
    custoFinanceiro: action.custoFinanceiro,
    preparoMinimoDias: action.preparoMinimoDias,
    preparoIdealDias: action.preparoIdealDias,
    permiteImproviso: action.permiteImproviso,
    requerAprovacaoDiretoria: Boolean(action.requerAprovacaoDiretoria),
  }));
}

function roundAverage(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

module.exports = {
  serializeSession,
  getAvailableActionsForUi,
};
