/**
 * Modulo: directorApproval
 * Responsabilidade: avaliar e registrar aprovacoes da diretoria para acoes RH sensiveis.
 * Entrada: state, definicao da acao, acao RH e alvo
 * Saida: decisao deterministica registrada em state.rh.aprovacoesDiretoria
 * Nao deve: aplicar a intervencao final nem renderizar UI.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("../simulation/eventLog");
const { createVisibleSignal } = require("../knowledge/visibleSignalsModel");

function evaluateDirectorApproval(state, definition, rhAction, target = {}) {
  if (!definition.requerAprovacaoDiretoria) {
    return {
      necessaria: false,
      aprovada: true,
      score: 100,
      motivo: "aprovacao_nao_necessaria",
    };
  }

  if (!state.rh.aprovacoesDiretoria) state.rh.aprovacoesDiretoria = [];

  const score = calculateApprovalScore(state, definition, rhAction, target);
  const aprovada = state.rng.chance(score);
  const decision = {
    id: state.idFactory.nextId("director_approval"),
    dia: state.calendar.totalDiasSimulados,
    rhActionId: rhAction.id,
    tipoAcao: definition.tipo,
    alvo: target,
    necessaria: true,
    aprovada,
    score,
    motivo: aprovada ? "diretoria_aprovou" : denialReason(state, definition, score),
  };

  const event = createOrganizationEvent(state, {
    tipo: aprovada ? "aprovacao_diretoria_rh" : "negativa_diretoria_rh",
    descricao: aprovada
      ? `Diretoria aprovou ${definition.nome}`
      : `Diretoria negou ${definition.nome}`,
    setorId: target.sectorId || target.setorId || null,
    funcionariosEnvolvidos: target.employeeId || target.funcionarioId ? [target.employeeId || target.funcionarioId] : [],
    severidade: aprovada ? 36 : 58,
    origem: "aprovacao_diretoria",
    dados: { rhActionId: rhAction.id, score, motivo: decision.motivo },
    visivelParaRH: true,
    tags: ["rh", "diretoria", definition.tipo],
  });

  const signal = createVisibleSignal(state, {
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: target.employeeId || target.funcionarioId || null,
    setorId: target.sectorId || target.setorId || null,
    origemEventoId: event.id,
    tipo: aprovada ? "aprovacao_diretoria" : "bloqueio_diretoria",
    origem: "aprovacao_diretoria",
    descricao: event.descricao,
    severidade: event.severidade,
    confiabilidade: 90,
    visivelParaRH: true,
    interpretacoesPossiveis: aprovada ? ["apoio_politico", "executar_intervencao"] : ["restricao_politica", "restricao_financeira"],
    tags: ["rh", "diretoria", definition.tipo],
  });
  state.visibleSignals.push(signal);

  decision.eventoId = event.id;
  decision.sinalId = signal.id;
  state.rh.aprovacoesDiretoria.push(decision);
  return decision;
}

function calculateApprovalScore(state, definition, rhAction, target) {
  const financialHealth = clampPercent((state.economy.caixaAtual / Math.max(1, state.economy.receitaMensalAtual)) * 45);
  const trust = state.rh.confiancaDiretoria || 50;
  const planningQuality = rhAction.planejamento && !rhAction.planejamento.improvisada ? rhAction.planejamento.qualidadePlanejamento : 10;
  const dataQuality = calculateDataQuality(state, target);
  const severity = calculateProblemSeverity(state, target);
  const costPressure = clampPercent((definition.custoFinanceiro / Math.max(1, state.economy.receitaMensalAtual)) * 220);

  return clampPercent(trust * 0.32 + financialHealth * 0.2 + planningQuality * 0.18 + dataQuality * 0.15 + severity * 0.2 - costPressure * 0.28);
}

function calculateDataQuality(state, target) {
  const employeeId = target.employeeId || target.funcionarioId;
  const sectorId = target.sectorId || target.setorId;
  const signals = (state.visibleSignals || []).filter((signal) => {
    if (!signal.visivelParaRH) return false;
    if (employeeId && signal.funcionarioId === employeeId) return true;
    if (sectorId && signal.setorId === sectorId) return true;
    return !employeeId && !sectorId;
  });
  if (!signals.length) return 25;
  const recent = signals.slice(-8);
  return clampPercent(recent.reduce((sum, signal) => sum + signal.confiabilidade, 0) / recent.length);
}

function calculateProblemSeverity(state, target) {
  const employeeId = target.employeeId || target.funcionarioId;
  if (employeeId) {
    const employee = state.employees.find((item) => item.id === employeeId);
    if (!employee) return 40;
    return clampPercent((employee.sobrecarga + employee.riscoDeSaida + (100 - employee.satisfacao)) / 3);
  }

  const sectorId = target.sectorId || target.setorId;
  if (sectorId) {
    const sector = state.sectors.find((item) => item.id === sectorId);
    if (!sector) return 40;
    return clampPercent((sector.cargaTrabalho + sector.rumorLocal + (100 - sector.climaSetor)) / 3);
  }

  return clampPercent((state.company.rumorGlobal + (100 - state.company.estabilidadeFinanceira) + state.company.riscoCrise) / 3);
}

function denialReason(state, definition, score) {
  if (state.economy.caixaAtual < definition.custoFinanceiro * 2) return "restricao_financeira";
  if ((state.rh.confiancaDiretoria || 0) < 45) return "baixa_confianca_no_rh";
  if (score < 45) return "evidencia_insuficiente";
  return "prioridade_negada";
}

module.exports = {
  evaluateDirectorApproval,
  calculateApprovalScore,
};
