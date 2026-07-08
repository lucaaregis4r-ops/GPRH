/**
 * Modulo: perceivedState
 * Responsabilidade: manter estimativas imperfeitas do RH a partir de sinais visiveis.
 * Entrada: state e sinais visiveis
 * Saida: employee.percepcaoRH atualizada
 * Nao deve: copiar automaticamente o estado real do funcionario.
 */

const { clampPercent } = require("../core/clamp");

function initializePerceivedState(state) {
  state.employees.forEach((employee) => {
    if (!employee.percepcaoRH) {
      employee.percepcaoRH = createInitialEmployeePerception(state, employee);
    }
  });
}

function refreshPerceivedState(state) {
  initializePerceivedState(state);
  const visibleSignals = (state.visibleSignals || []).filter((signal) => signal.visivelParaRH);

  state.employees.forEach((employee) => {
    const employeeSignals = visibleSignals
      .filter((signal) => signal.funcionarioId === employee.id || (!signal.funcionarioId && signal.setorId === employee.setorId))
      .slice(-12);

    employee.percepcaoRH = buildEmployeePerception(state, employee, employeeSignals);
  });
}

function createInitialEmployeePerception(state, employee) {
  const sector = state.sectors.find((item) => item.id === employee.setorId);
  const sectorWorkload = sector ? sector.cargaTrabalho : 50;
  const sectorTurnover = sector ? sector.taxaTurnover || 0 : 0;

  return {
    satisfacaoEstimada: 55,
    riscoSaidaEstimado: clampPercent(30 + sectorWorkload * 0.08 + sectorTurnover * 0.35),
    sobrecargaEstimada: clampPercent(45 + sectorWorkload * 0.35),
    engajamentoEstimado: 55,
    confiancaEstimada: 50,
    confiabilidadeGeral: 18,
    sinaisRecentes: [],
    ultimaAtualizacao: state.calendar.totalDiasSimulados,
  };
}

function buildEmployeePerception(state, employee, signals) {
  const base = createInitialEmployeePerception(state, employee);
  const totals = {
    satisfaction: 0,
    exitRisk: 0,
    overload: 0,
    engagement: 0,
    trust: 0,
    reliability: 0,
  };

  signals.forEach((signal) => {
    const weight = signal.confiabilidade / 100;
    const effect = signalEffect(signal);
    totals.satisfaction += effect.satisfaction * weight;
    totals.exitRisk += effect.exitRisk * weight;
    totals.overload += effect.overload * weight;
    totals.engagement += effect.engagement * weight;
    totals.trust += effect.trust * weight;
    totals.reliability += signal.confiabilidade;
  });

  const signalCount = signals.length;
  return {
    satisfacaoEstimada: clampPercent(base.satisfacaoEstimada + totals.satisfaction),
    riscoSaidaEstimado: clampPercent(base.riscoSaidaEstimado + totals.exitRisk),
    sobrecargaEstimada: clampPercent(base.sobrecargaEstimada + totals.overload),
    engajamentoEstimado: clampPercent(base.engajamentoEstimado + totals.engagement),
    confiancaEstimada: clampPercent(base.confiancaEstimada + totals.trust),
    confiabilidadeGeral: clampPercent(signalCount ? 20 + totals.reliability / signalCount : base.confiabilidadeGeral),
    sinaisRecentes: signals.map((signal) => signal.id),
    ultimaAtualizacao: state.calendar.totalDiasSimulados,
  };
}

function signalEffect(signal) {
  const table = {
    pedido_conversa: { satisfaction: -8, exitRisk: 8, overload: 2, engagement: -3, trust: 3 },
    demanda_carreira: { satisfaction: -3, exitRisk: 5, overload: 0, engagement: 3, trust: 1 },
    falta_ou_atraso: { satisfaction: -6, exitRisk: 6, overload: 5, engagement: -8, trust: -2 },
    desengajamento_aparente: { satisfaction: -5, exitRisk: 4, overload: 6, engagement: -8, trust: -1 },
    sobrecarga_aparente: { satisfaction: -4, exitRisk: 4, overload: 10, engagement: -2, trust: -1 },
    sobrecarga_individual_suspeita: { satisfaction: -5, exitRisk: 6, overload: 12, engagement: -2, trust: -3 },
    risco_saida_suspeito: { satisfaction: -8, exitRisk: 16, overload: 1, engagement: -8, trust: -3 },
    proposta_externa_suspeita: { satisfaction: -10, exitRisk: 22, overload: 0, engagement: -12, trust: -4 },
    turnover_confirmado: { satisfaction: -4, exitRisk: 12, overload: 6, engagement: -3, trust: -5 },
    rumor_local: { satisfaction: -5, exitRisk: 6, overload: 1, engagement: -4, trust: -8 },
    insatisfacao_social: { satisfaction: -7, exitRisk: 8, overload: 1, engagement: -4, trust: -8 },
    conflito_social_suspeito: { satisfaction: -5, exitRisk: 4, overload: 3, engagement: -3, trust: -4 },
    clima_fragil_suspeito: { satisfaction: -7, exitRisk: 6, overload: 3, engagement: -5, trust: -7 },
    rede_apoio_informal: { satisfaction: 4, exitRisk: -3, overload: -2, engagement: 5, trust: 2 },
    pressao_financeira_percebida: { satisfaction: -5, exitRisk: 7, overload: 4, engagement: -2, trust: -6 },
    medo_financeiro: { satisfaction: -5, exitRisk: 8, overload: 3, engagement: -3, trust: -6 },
    trabalho_invisivel_suspeito: { satisfaction: -5, exitRisk: 5, overload: 9, engagement: -2, trust: -4 },
    redistribuicao_funcional_visivel: { satisfaction: -3, exitRisk: 5, overload: 8, engagement: -1, trust: -2 },
    onboarding_visivel: { satisfaction: 2, exitRisk: -2, overload: 3, engagement: 3, trust: 2 },
    onboarding_individual: { satisfaction: 1, exitRisk: -1, overload: 4, engagement: 2, trust: 1 },
    tratamento_desigual_suspeito: { satisfaction: -6, exitRisk: 7, overload: 2, engagement: -5, trust: -8 },
    injustica_psicossocial_suspeita: { satisfaction: -7, exitRisk: 8, overload: 2, engagement: -5, trust: -8 },
    microagressao_suspeita: { satisfaction: -5, exitRisk: 6, overload: 1, engagement: -4, trust: -7 },
    exclusao_suspeita: { satisfaction: -6, exitRisk: 7, overload: 1, engagement: -5, trust: -7 },
    injustica_reconhecimento_suspeita: { satisfaction: -6, exitRisk: 6, overload: 2, engagement: -4, trust: -6 },
    lideranca_abusiva_suspeita: { satisfaction: -9, exitRisk: 10, overload: 5, engagement: -7, trust: -10 },
    cobranca_humilhante_suspeita: { satisfaction: -8, exitRisk: 9, overload: 4, engagement: -6, trust: -9 },
    isolamento_social_suspeito: { satisfaction: -5, exitRisk: 6, overload: 1, engagement: -5, trust: -6 },
    denuncia_compliance_registrada: { satisfaction: -4, exitRisk: 7, overload: 1, engagement: -3, trust: -2 },
    denuncia_resposta_fragil: { satisfaction: -8, exitRisk: 10, overload: 2, engagement: -6, trust: -12 },
    retaliacao_suspeita: { satisfaction: -10, exitRisk: 12, overload: 3, engagement: -8, trust: -14 },
    checkin_individual_rh: { satisfaction: -2, exitRisk: 3, overload: 2, engagement: 1, trust: 2 },
    relato_individual_rh: { satisfaction: -5, exitRisk: 7, overload: 5, engagement: -2, trust: 3 },
    leitura_lideranca_setorial: { satisfaction: -3, exitRisk: 4, overload: 6, engagement: -1, trust: 1 },
    pesquisa_clima_rh: { satisfaction: -6, exitRisk: 6, overload: 3, engagement: -4, trust: 1 },
    mapeamento_tarefas_reais_rh: { satisfaction: -3, exitRisk: 5, overload: 10, engagement: -1, trust: 2 },
    auditoria_funcional_rh: { satisfaction: -4, exitRisk: 5, overload: 9, engagement: -1, trust: 2 },
    revisao_compliance_rh: { satisfaction: -5, exitRisk: 6, overload: 2, engagement: -3, trust: -2 },
    entrevista_desligamento_rh: { satisfaction: -4, exitRisk: 7, overload: 4, engagement: -3, trust: 1 },
    resposta_pedido_conversa_rh: { satisfaction: -2, exitRisk: 5, overload: 2, engagement: 0, trust: 5 },
    resposta_carreira_rh: { satisfaction: -1, exitRisk: 5, overload: 0, engagement: 3, trust: 4 },
    reconhecimento_contribuicao_rh: { satisfaction: 4, exitRisk: -3, overload: -2, engagement: 5, trust: 6 },
    acompanhamento_risco_rh: { satisfaction: -3, exitRisk: 15, overload: 4, engagement: -2, trust: 7 },
    priorizacao_tarefas_rh: { satisfaction: 2, exitRisk: -2, overload: -8, engagement: 3, trust: 4 },
    comunicacao_conter_rumor_rh: { satisfaction: 2, exitRisk: -2, overload: 0, engagement: 2, trust: 4 },
    devolutiva_pesquisa_rh: { satisfaction: 3, exitRisk: -2, overload: -2, engagement: 3, trust: 6 },
    redistribuicao_funcoes_rh: { satisfaction: 2, exitRisk: -3, overload: -10, engagement: 2, trust: 5 },
    alinhamento_lideranca_rh: { satisfaction: 3, exitRisk: -2, overload: -3, engagement: 3, trust: 4 },
    protecao_retaliacao_rh: { satisfaction: 2, exitRisk: -3, overload: 0, engagement: 1, trust: 6 },
    investigacao_denuncia_rh: { satisfaction: -1, exitRisk: 4, overload: 0, engagement: 0, trust: 5 },
    acao_corretiva_rh: { satisfaction: 3, exitRisk: -4, overload: -1, engagement: 3, trust: 7 },
  };

  return table[signal.tipo] || { satisfaction: -1, exitRisk: 1, overload: 0, engagement: 0, trust: 0 };
}

module.exports = {
  initializePerceivedState,
  refreshPerceivedState,
};
