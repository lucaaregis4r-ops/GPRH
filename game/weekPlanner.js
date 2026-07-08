/**
 * Modulo: weekPlanner
 * Responsabilidade: montar briefing imperfeito e processar plano semanal do RH.
 * Entrada: state e lista de acoes desejadas
 * Saida: briefing e decisao tecnica do planejamento
 * Nao deve: avancar calendario nem renderizar UI.
 */

const { processRhAction, scheduleRhAction } = require("../rh/rhActionProcessor");

function buildWeeklyBriefing(state) {
  const visibleSignals = (state.visibleSignals || []).filter((signal) => signal.visivelParaRH);
  const activeEmployees = state.employees.filter((employee) => employee.status !== "desligado");
  const perceivedAttention = activeEmployees
    .slice()
    .sort((left, right) => (right.percepcaoRH?.riscoSaidaEstimado || 0) - (left.percepcaoRH?.riscoSaidaEstimado || 0))
    .slice(0, 5)
    .map((employee) => ({
      employeeId: employee.id,
      nome: employee.nome,
      setorId: employee.setorId,
      riscoSaidaEstimado: Math.round(employee.percepcaoRH?.riscoSaidaEstimado || 0),
      sobrecargaEstimada: Math.round(employee.percepcaoRH?.sobrecargaEstimada || 0),
      confiabilidade: Math.round(employee.percepcaoRH?.confiabilidadeGeral || 0),
    }));

  const sectors = state.sectors.map((sector) => ({
    sectorId: sector.id,
    nome: sector.nome,
    clima: Math.round(sector.climaSetor),
    turnover: Math.round(sector.taxaTurnover || 0),
    rumor: Math.round(sector.rumorLocal || 0),
    funcionariosAtivos: sector.funcionariosIds.length,
  }));

  return {
    semana: state.rh.semanaAtual,
    dia: state.calendar.totalDiasSimulados,
    energiaRh: state.rh.energiaAtual,
    energiaSemanal: state.rh.energiaSemanal,
    caixa: Math.round(state.economy.caixaAtual),
    taxaTurnoverEmpresa: Math.round(state.company.dadosVisiveis?.taxaTurnoverEmpresa || state.company.taxaTurnover || 0),
    sinaisVisiveisRecentes: visibleSignals.slice(-8).map((signal) => ({
      id: signal.id,
      dia: signal.dia,
      tipo: signal.tipo,
      funcionarioId: signal.funcionarioId,
      setorId: signal.setorId,
      confiabilidade: Math.round(signal.confiabilidade),
    })),
    funcionariosEmAtencao: perceivedAttention,
    setores: sectors,
    demandasPendentes: activeEmployees
      .flatMap((employee) =>
        (employee.demandasPendentes || [])
          .filter((demand) => demand.status === "pendente")
          .map((demand) => ({
            employeeId: employee.id,
            nome: employee.nome,
            tipo: demand.tipo,
            diasEmAberto: demand.diasEmAberto || 0,
            prazoRespostaDias: demand.prazoRespostaDias || null,
          }))
      )
      .slice(0, 8),
  };
}

function planWeeklyActions(state, requests = []) {
  const decision = {
    semana: state.rh.semanaAtual,
    dia: state.calendar.totalDiasSimulados,
    energiaAntes: state.rh.energiaAtual,
    executadas: [],
    planejadas: [],
    rejeitadas: [],
  };

  requests.forEach((request) => {
    try {
      if (request.modo === "planejar" || request.diasPreparo > 0) {
        const plan = scheduleRhAction(state, request.tipo, request.alvo || {}, { diasPreparo: request.diasPreparo });
        decision.planejadas.push({
          request,
          planId: plan.id,
          executarNoDia: plan.executarNoDia,
          status: plan.status,
        });
        return;
      }

      const action = processRhAction(state, request.tipo, request.alvo || {});
      decision.executadas.push({
        request,
        actionId: action.id,
        status: action.status,
        eventosGerados: action.eventosGerados.length,
        sinaisGerados: action.sinaisGerados.length,
      });
    } catch (error) {
      decision.rejeitadas.push({
        request,
        motivo: error.message,
      });
    }
  });

  decision.energiaDepois = state.rh.energiaAtual;
  return decision;
}

module.exports = {
  buildWeeklyBriefing,
  planWeeklyActions,
};
