/**
 * Modulo: discoveryActions
 * Responsabilidade: aplicar efeitos de acoes de descoberta do RH.
 * Entrada: state, definicao da acao e alvo
 * Saida: evento, sinais e ajustes de percepcao
 * Nao deve: resolver problemas ou revelar estado real de forma onisciente.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("../simulation/eventLog");
const { createVisibleSignal } = require("../knowledge/visibleSignalsModel");
const { planningEffectMultiplier, planningRiskPenalty } = require("./rhActionPlanning");

function applyDiscoveryAction(state, action, target, definition, options = {}) {
  const handlers = {
    checkin_individual_rapido: applyQuickCheckin,
    conversa_individual_profunda: applyDeepConversation,
    conversa_com_lideranca: applyLeadershipConversation,
    pesquisa_clima_simples: applyClimateSurvey,
    mapeamento_tarefas_reais: applyTaskMapping,
    auditoria_acumulo_desvio: applyFunctionAudit,
    revisar_sinais_compliance: applyComplianceReview,
    entrevista_desligamento: applyExitInterview,
  };

  const handler = handlers[action.tipo];
  return handler ? handler(state, action, target, definition, options) : { signals: [], events: [] };
}

function applyQuickCheckin(state, action, target, definition) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const penalty = discoveryPenalty(definition, action);
  const event = createRhDiscoveryEvent(state, action, {
    setorId: employee.setorId,
    funcionariosEnvolvidos: [employee.id],
    descricao: `RH realizou check-in rapido com ${employee.nome}`,
    severidade: 28,
  });
  const signal = pushSignal(state, {
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: employee.id,
    setorId: employee.setorId,
    origemEventoId: event.id,
    tipo: "checkin_individual_rh",
    descricao: "Check-in rapido gerou leitura inicial sobre bem-estar.",
    severidade: estimateConcern(employee.satisfacao, employee.sobrecarga, employee.riscoDeSaida) * 0.75,
    confiabilidade: discoveryReliability(state, 42, definition, action),
    interpretacoesPossiveis: ["bem_estar", "risco_relacional", "necessita_acompanhamento"],
    tags: ["rh", "descoberta", "checkin"],
  });
  softenExpectation(employee, 1, penalty);
  return { events: [event], signals: [signal] };
}

function applyDeepConversation(state, action, target, definition) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const penalty = discoveryPenalty(definition, action);
  const event = createRhDiscoveryEvent(state, action, {
    setorId: employee.setorId,
    funcionariosEnvolvidos: [employee.id],
    descricao: `RH realizou conversa individual profunda com ${employee.nome}`,
    severidade: 46,
  });
  const signals = [
    pushSignal(state, {
      dia: state.calendar.totalDiasSimulados,
      funcionarioId: employee.id,
      setorId: employee.setorId,
      origemEventoId: event.id,
      tipo: "relato_individual_rh",
      descricao: "Conversa individual indicou pontos de satisfacao, carga e confianca.",
      severidade: estimateConcern(employee.satisfacao, employee.sobrecarga, employee.riscoDeSaida),
      confiabilidade: discoveryReliability(state, 68, definition, action),
      interpretacoesPossiveis: ["satisfacao", "sobrecarga", "confianca", "risco_de_saida"],
      tags: ["rh", "descoberta", "conversa"],
    }),
  ];
  revealLimitedHiddenSignals(state, { employeeId: employee.id, limit: penalty > 8 ? 0 : 1, tags: [] }).forEach((signal) => signals.push(signal));
  softenExpectation(employee, 2, penalty);
  return { events: [event], signals };
}

function applyLeadershipConversation(state, action, target, definition) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  applySectorPlanningSideEffect(sector, definition, action);
  const event = createRhDiscoveryEvent(state, action, {
    setorId: sector.id,
    funcionariosEnvolvidos: sector.funcionariosIds.slice(0, 3),
    descricao: `RH conversou com lideranca de ${sector.nome}`,
    severidade: 38,
  });
  const signal = pushSignal(state, {
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: null,
    setorId: sector.id,
    origemEventoId: event.id,
    tipo: "leitura_lideranca_setorial",
    descricao: "Conversa com lideranca gerou leitura setorial sobre carga, clima e riscos.",
    severidade: clampPercent((sector.cargaTrabalho + (100 - sector.climaSetor) + sector.reportFear) / 3),
    confiabilidade: discoveryReliability(state, 54, definition, action),
    interpretacoesPossiveis: ["carga_setorial", "clima", "compliance", "viés_da_lideranca"],
    tags: ["rh", "descoberta", "lideranca"],
  });
  return { events: [event], signals: [signal] };
}

function applyClimateSurvey(state, action, target, definition) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  applySectorPlanningSideEffect(sector, definition, action);
  const event = createRhDiscoveryEvent(state, action, {
    setorId: sector.id,
    funcionariosEnvolvidos: sector.funcionariosIds.slice(0, 5),
    descricao: `RH aplicou pesquisa simples de clima em ${sector.nome}`,
    severidade: 35,
  });
  const signal = pushSignal(state, {
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: null,
    setorId: sector.id,
    origemEventoId: event.id,
    tipo: "pesquisa_clima_rh",
    descricao: action.planejamento.improvisada
      ? "Pesquisa simples com preparo baixo gerou leitura limitada e possivel baixa adesao."
      : "Pesquisa simples indicou clima, seguranca psicologica e confianca no canal.",
    severidade: clampPercent((100 - sector.climaSetor) * 0.45 + (100 - sector.psychologicalSafety) * 0.35 + sector.reportFear * 0.2),
    confiabilidade: discoveryReliability(state, 62, definition, action),
    interpretacoesPossiveis: ["clima_setorial", "seguranca_psicologica", "confianca_no_canal"],
    tags: ["rh", "descoberta", "clima"],
  });
  return { events: [event], signals: [signal] };
}

function applyTaskMapping(state, action, target, definition) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const penalty = discoveryPenalty(definition, action);
  const event = createRhDiscoveryEvent(state, action, {
    setorId: employee.setorId,
    funcionariosEnvolvidos: [employee.id],
    descricao: `RH mapeou tarefas reais de ${employee.nome}`,
    severidade: 42,
  });
  const signal = pushSignal(state, {
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: employee.id,
    setorId: employee.setorId,
    origemEventoId: event.id,
    tipo: "mapeamento_tarefas_reais_rh",
    descricao: "Mapeamento indicou possivel acumulo, desvio ou trabalho invisivel.",
    severidade: clampPercent((employee.indiceAcumuloFuncao + employee.indiceDesvioFuncao + employee.trabalhoInvisivel) / 3),
    confiabilidade: discoveryReliability(state, 72, definition, action),
    interpretacoesPossiveis: ["acumulo_de_funcao", "desvio_de_funcao", "trabalho_invisivel"],
    tags: ["rh", "descoberta", "funcao"],
  });
  softenExpectation(employee, 1, penalty);
  return { events: [event], signals: [signal] };
}

function applyFunctionAudit(state, action, target, definition) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  applySectorPlanningSideEffect(sector, definition, action);
  const sectorEmployees = state.employees.filter((employee) => employee.status !== "desligado" && employee.setorId === sector.id);
  const event = createRhDiscoveryEvent(state, action, {
    setorId: sector.id,
    funcionariosEnvolvidos: sectorEmployees.slice(0, 5).map((employee) => employee.id),
    descricao: `RH auditou acumulo e desvio de funcao em ${sector.nome}`,
    severidade: 50,
  });
  const averageFunctionalRisk = average(sectorEmployees.map((employee) => employee.riscoPorSobrecargaFuncional || 0));
  const signal = pushSignal(state, {
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: null,
    setorId: sector.id,
    origemEventoId: event.id,
    tipo: "auditoria_funcional_rh",
    descricao: "Auditoria indicou risco funcional agregado no setor.",
    severidade: averageFunctionalRisk,
    confiabilidade: discoveryReliability(state, 76, definition, action),
    interpretacoesPossiveis: ["risco_funcional_setorial", "trabalho_invisivel", "dependencia_operacional"],
    tags: ["rh", "descoberta", "funcao"],
  });
  return { events: [event], signals: [signal] };
}

function applyComplianceReview(state, action, target, definition) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  const penalty = discoveryPenalty(definition, action);
  applySectorPlanningSideEffect(sector, definition, action);
  const event = createRhDiscoveryEvent(state, action, {
    setorId: sector.id,
    funcionariosEnvolvidos: sector.funcionariosIds.slice(0, 4),
    descricao: `RH revisou sinais de compliance em ${sector.nome}`,
    severidade: 48,
  });
  const signals = [
    pushSignal(state, {
      dia: state.calendar.totalDiasSimulados,
      funcionarioId: null,
      setorId: sector.id,
      origemEventoId: event.id,
      tipo: "revisao_compliance_rh",
      descricao: "Revisao indicou riscos de subnotificacao, medo de reporte e seguranca psicologica.",
      severidade: clampPercent((sector.reportFear + (100 - sector.psychologicalSafety) + state.company.compliance.riscoSubnotificacao) / 3),
      confiabilidade: discoveryReliability(state, 66, definition, action),
      interpretacoesPossiveis: ["subnotificacao", "seguranca_psicologica", "risco_compliance"],
      tags: ["rh", "descoberta", "compliance"],
    }),
  ];
  revealLimitedHiddenSignals(state, { sectorId: sector.id, limit: penalty > 8 ? 1 : 2, tags: ["compliance"] }).forEach((signal) => signals.push(signal));
  return { events: [event], signals };
}

function applyExitInterview(state, action, target, definition) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  if (employee.status !== "desligado") {
    throw new Error("entrevista_desligamento exige funcionario desligado");
  }
  const event = createRhDiscoveryEvent(state, action, {
    setorId: employee.setorId,
    funcionariosEnvolvidos: [employee.id],
    descricao: `RH realizou entrevista de desligamento com ${employee.nome}`,
    severidade: 58,
  });
  const signal = pushSignal(state, {
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: employee.id,
    setorId: employee.setorId,
    origemEventoId: event.id,
    tipo: "entrevista_desligamento_rh",
    descricao: "Entrevista de desligamento indicou fatores provaveis de saida.",
    severidade: clampPercent((employee.sobrecarga + (100 - employee.satisfacao) + employee.riscoDeSaida) / 3),
    confiabilidade: discoveryReliability(state, 70, definition, action),
    interpretacoesPossiveis: ["turnover", "clima", "carga", "gestao"],
    tags: ["rh", "descoberta", "turnover"],
  });
  return { events: [event], signals: [signal] };
}

function createRhDiscoveryEvent(state, action, data) {
  return createOrganizationEvent(state, {
    tipo: `rh_${action.tipo}`,
    descricao: data.descricao,
    setorId: data.setorId || null,
    funcionariosEnvolvidos: data.funcionariosEnvolvidos || [],
    severidade: data.severidade,
    origem: "acao_rh_descoberta",
    dados: { rhActionId: action.id, tipoAcao: action.tipo, planejamento: action.planejamento },
    visivelParaRH: true,
    tags: ["rh", "descoberta", action.tipo],
  });
}

function pushSignal(state, data) {
  const signal = createVisibleSignal(state, {
    ...data,
    origem: "acao_rh_descoberta",
    visivelParaRH: true,
  });
  state.visibleSignals.push(signal);
  return signal;
}

function revealLimitedHiddenSignals(state, filter) {
  if ((filter.limit || 0) <= 0) return [];

  const hidden = (state.visibleSignals || [])
    .filter((signal) => !signal.visivelParaRH)
    .filter((signal) => !filter.employeeId || signal.funcionarioId === filter.employeeId)
    .filter((signal) => !filter.sectorId || signal.setorId === filter.sectorId)
    .filter((signal) => !filter.tags || !filter.tags.length || filter.tags.some((tag) => (signal.tags || []).includes(tag)))
    .slice(-filter.limit);

  hidden.forEach((signal) => {
    signal.visivelParaRH = true;
    signal.confiabilidade = clampPercent(signal.confiabilidade + 18);
    signal.descricao = signal.descricao === "Sinal interno nao visivel diretamente" ? "Sinal antes oculto foi percebido apos acao do RH." : signal.descricao;
    signal.tags = [...new Set([...(signal.tags || []), "revelado_por_rh"])];
  });

  return hidden;
}

function estimateConcern(satisfaction, overload, exitRisk) {
  return clampPercent((100 - satisfaction) * 0.35 + overload * 0.35 + exitRisk * 0.3);
}

function reliability(state, base) {
  return clampPercent(base + (state.rh ? state.rh.maturidadeRH : state.company.capacidadeRH) * 0.18);
}

function discoveryReliability(state, base, definition, action) {
  const multiplier = planningEffectMultiplier(definition, action.planejamento && !action.planejamento.improvisada ? action.planejamento : null);
  const penalty = discoveryPenalty(definition, action);
  return clampPercent(reliability(state, base) * multiplier - penalty);
}

function discoveryPenalty(definition, action) {
  return planningRiskPenalty(definition, action.planejamento && !action.planejamento.improvisada ? action.planejamento : null);
}

function applySectorPlanningSideEffect(sector, definition, action) {
  const penalty = discoveryPenalty(definition, action);
  if (penalty <= 8) return;
  sector.rumorLocal = clampPercent((sector.rumorLocal || 0) + penalty * 0.18);
  sector.climaSetor = clampPercent(sector.climaSetor - penalty * 0.08);
  sector.psychologicalSafety = clampPercent((sector.psychologicalSafety || 50) - penalty * 0.06);
}

function softenExpectation(employee, amount, penalty = 0) {
  employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + amount - penalty * 0.12);
}

function requireEmployee(state, employeeId) {
  const employee = state.employees.find((item) => item.id === employeeId);
  if (!employee) throw new Error(`funcionario alvo nao encontrado: ${employeeId}`);
  return employee;
}

function requireSector(state, sectorId) {
  const sector = state.sectors.find((item) => item.id === sectorId);
  if (!sector) throw new Error(`setor alvo nao encontrado: ${sectorId}`);
  return sector;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

module.exports = {
  applyDiscoveryAction,
};
