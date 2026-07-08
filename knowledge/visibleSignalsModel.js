/**
 * Modulo: visibleSignalsModel
 * Responsabilidade: transformar eventos e memorias individuais em sinais para o RH.
 * Entrada: state, evento organizacional ou memoria individual
 * Saida: visibleSignal
 * Nao deve: revelar estado real diretamente nem aplicar efeitos comportamentais.
 */

const { clampPercent } = require("../core/clamp");

const EVENT_SIGNAL_MAP = {
  pedir_conversa: {
    tipo: "pedido_conversa",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["insatisfacao", "demanda_de_escuta", "risco_relacional"],
    baseVisibility: 100,
    baseReliability: 82,
  },
  pedido_conversa: {
    tipo: "pedido_conversa",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["insatisfacao", "demanda_de_escuta", "risco_relacional"],
    baseVisibility: 100,
    baseReliability: 82,
  },
  pedido_carreira: {
    tipo: "demanda_carreira",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["ambicao", "salario_percebido_baixo", "risco_de_frustracao"],
    baseVisibility: 100,
    baseReliability: 82,
  },
  ausencia_atraso: {
    tipo: "falta_ou_atraso",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["cansaco", "desengajamento", "problema_pessoal", "sobrecarga"],
    baseVisibility: 95,
    baseReliability: 86,
  },
  pressao_financeira: {
    tipo: "pressao_financeira_percebida",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["medo_de_corte", "aumento_de_pressao", "rumor_financeiro"],
    baseVisibility: 68,
    baseReliability: 58,
  },
  medo_financeiro: {
    tipo: "medo_financeiro",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["rumor_financeiro", "queda_de_confianca", "risco_de_saida"],
    baseVisibility: 62,
    baseReliability: 52,
  },
  procurar_vaga: {
    tipo: "risco_saida_suspeito",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["busca_externa", "baixa_satisfacao", "salario_percebido_baixo"],
    baseVisibility: 12,
    baseReliability: 30,
  },
  receber_proposta_externa: {
    tipo: "proposta_externa_suspeita",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["risco_de_turnover", "alta_empregabilidade"],
    baseVisibility: 8,
    baseReliability: 28,
  },
  pedir_demissao: {
    tipo: "turnover_confirmado",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["risco_materializado", "falha_de_retencao", "evento_critico"],
    baseVisibility: 100,
    baseReliability: 100,
  },
  turnover_voluntario: {
    tipo: "turnover_confirmado",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["risco_materializado", "falha_de_retencao", "evento_critico"],
    baseVisibility: 100,
    baseReliability: 100,
  },
  rumor_recebido: {
    tipo: "rumor_local",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["medo", "baixa_confianca", "informacao_informal"],
    baseVisibility: 28,
    baseReliability: 36,
  },
  reclamacao_social: {
    tipo: "insatisfacao_social",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["baixa_justica", "baixa_confianca_no_rh", "rumor_local"],
    baseVisibility: 25,
    baseReliability: 38,
  },
  cansaco_percebido: {
    tipo: "desengajamento_aparente",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["cansaco", "sobrecarga", "queda_de_ritmo"],
    baseVisibility: 42,
    baseReliability: 48,
  },
  sobrecarga_setorial: {
    tipo: "sobrecarga_aparente",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["carga_alta", "acumulo_de_funcao", "risco_de_clima"],
    baseVisibility: 58,
    baseReliability: 55,
  },
  acumulo_de_funcao: {
    tipo: "acumulo_funcao_aparente",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["desvio_de_funcao", "trabalho_invisivel", "risco_de_injustica"],
    baseVisibility: 52,
    baseReliability: 58,
  },
  conflito_entrega: {
    tipo: "conflito_social_suspeito",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["conflito", "dependencia_tecnica", "falha_de_coordenacao"],
    baseVisibility: 36,
    baseReliability: 44,
  },
  funcao_informal_assumida: {
    tipo: "trabalho_invisivel_suspeito",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["funcao_informal", "acumulo_de_funcao", "baixa_visibilidade"],
    baseVisibility: 34,
    baseReliability: 42,
  },
  redistribuicao_funcional_pos_saida: {
    tipo: "redistribuicao_funcional_visivel",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["heranca_de_funcao", "risco_de_sobrecarga", "dependencia_operacional"],
    baseVisibility: 82,
    baseReliability: 76,
  },
  novo_funcionario: {
    tipo: "onboarding_visivel",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["carga_de_onboarding", "reposicao", "alivio_futuro_de_sobrecarga"],
    baseVisibility: 100,
    baseReliability: 92,
  },
  tratamento_desigual: complianceRiskModel("tratamento_desigual_suspeito"),
  microagressao: complianceRiskModel("microagressao_suspeita"),
  exclusao_de_reuniao: complianceRiskModel("exclusao_suspeita"),
  credito_negado_por_trabalho: complianceRiskModel("injustica_reconhecimento_suspeita"),
  lideranca_abusiva: complianceRiskModel("lideranca_abusiva_suspeita", 48, 46),
  cobranca_humilhante: complianceRiskModel("cobranca_humilhante_suspeita", 45, 44),
  isolamento_social: complianceRiskModel("isolamento_social_suspeito"),
  denuncia_acolhida: {
    tipo: "denuncia_compliance_registrada",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["denuncia", "canal_acionado", "risco_psicossocial"],
    baseVisibility: 100,
    baseReliability: 84,
  },
  denuncia_nao_acolhida: {
    tipo: "denuncia_resposta_fragil",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["baixa_confianca_no_canal", "risco_retaliacao", "subnotificacao_futura"],
    baseVisibility: 95,
    baseReliability: 72,
  },
  retaliacao_pos_denuncia: {
    tipo: "retaliacao_suspeita",
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["medo_retaliacao", "silenciamento", "risco_compliance"],
    baseVisibility: 42,
    baseReliability: 44,
  },
};

const MEMORY_SIGNAL_MAP = {
  clima_fragil: {
    tipo: "clima_fragil_suspeito",
    interpretacoesPossiveis: ["baixa_confianca", "medo", "baixa_satisfacao"],
  },
  colega_proximo_saiu: {
    tipo: "luto_social_organizacional",
    interpretacoesPossiveis: ["medo", "perda_de_vinculo", "risco_de_saida"],
  },
  herdou_funcao: {
    tipo: "sobrecarga_individual_suspeita",
    interpretacoesPossiveis: ["acumulo_de_funcao", "injustica_percebida", "risco_de_saida"],
  },
  apoio_entre_colegas: {
    tipo: "rede_apoio_informal",
    interpretacoesPossiveis: ["vinculo_social", "colaboracao", "sobrecarga_compartilhada"],
  },
  apoio_recebido: {
    tipo: "rede_apoio_informal",
    interpretacoesPossiveis: ["vinculo_social", "colaboracao", "sobrecarga_compartilhada"],
  },
  funcao_informal_assumida: {
    tipo: "trabalho_invisivel_suspeito",
    interpretacoesPossiveis: ["funcao_informal", "sobrecarga", "injustica_funcional"],
  },
  redistribuicao_funcional_pos_saida: {
    tipo: "sobrecarga_individual_suspeita",
    interpretacoesPossiveis: ["heranca_de_funcao", "acumulo_de_funcao", "risco_de_saida"],
  },
  novo_funcionario: {
    tipo: "onboarding_individual",
    interpretacoesPossiveis: ["integracao", "carga_extra", "ajuste_social"],
  },
  tratamento_desigual: complianceMemorySignal("injustica_psicossocial_suspeita"),
  microagressao: complianceMemorySignal("microagressao_suspeita"),
  exclusao_de_reuniao: complianceMemorySignal("exclusao_suspeita"),
  credito_negado_por_trabalho: complianceMemorySignal("injustica_reconhecimento_suspeita"),
  lideranca_abusiva: complianceMemorySignal("lideranca_abusiva_suspeita"),
  cobranca_humilhante: complianceMemorySignal("cobranca_humilhante_suspeita"),
  isolamento_social: complianceMemorySignal("isolamento_social_suspeito"),
  retaliacao_pos_denuncia: complianceMemorySignal("retaliacao_suspeita"),
};

function createSignalFromEvent(state, event) {
  const model = EVENT_SIGNAL_MAP[event.tipo] || defaultEventModel(event);
  const employeeId = event.funcionariosEnvolvidos && event.funcionariosEnvolvidos.length === 1 ? event.funcionariosEnvolvidos[0] : null;
  const visibilityScore = calculateVisibility(state, event, model.baseVisibility);
  const visible = event.visivelParaRH || visibilityScore >= 55;

  return createVisibleSignal(state, {
    dia: event.dia,
    funcionarioId: employeeId,
    setorId: event.setorId,
    origemEventoId: event.id,
    origemMemoriaId: null,
    tipo: model.tipo,
    origem: model.origem,
    descricao: event.descricao,
    severidade: event.severidade,
    confiabilidade: calculateReliability(state, model.baseReliability, visible),
    visivelParaRH: visible,
    interpretacoesPossiveis: model.interpretacoesPossiveis,
    tags: event.tags,
  });
}

function createSignalFromMemory(state, employee, memory) {
  const model = MEMORY_SIGNAL_MAP[memory.tipo] || defaultMemoryModel(memory);
  const visibilityScore = memory.visivelParaRH ? 75 : memory.proximidadeComEvento * 0.18 + state.company.capacidadeRH * 0.35;
  const visible = memory.visivelParaRH || visibilityScore >= 58;

  return createVisibleSignal(state, {
    dia: memory.dia,
    funcionarioId: employee.id,
    setorId: employee.setorId,
    origemEventoId: memory.origemEventoId,
    origemMemoriaId: memory.id,
    tipo: model.tipo,
    origem: "memoria_individual",
    descricao: visible ? summarizeMemory(memory, employee) : "Sinal interno nao visivel diretamente",
    severidade: memory.intensidade,
    confiabilidade: calculateReliability(state, visible ? 58 : 20, visible),
    visivelParaRH: visible,
    interpretacoesPossiveis: model.interpretacoesPossiveis,
    tags: memory.tags,
  });
}

function createVisibleSignal(state, data) {
  return {
    id: state.idFactory.nextId("visible_signal"),
    dia: data.dia ?? state.calendar.totalDiasSimulados,
    funcionarioId: data.funcionarioId || null,
    setorId: data.setorId || null,
    origemEventoId: data.origemEventoId || null,
    origemMemoriaId: data.origemMemoriaId || null,
    tipo: data.tipo,
    origem: data.origem,
    descricao: data.descricao,
    severidade: clampPercent(data.severidade || 0),
    confiabilidade: clampPercent(data.confiabilidade || 0),
    visivelParaRH: Boolean(data.visivelParaRH),
    interpretacoesPossiveis: data.interpretacoesPossiveis || [],
    tags: data.tags || [],
  };
}

function calculateVisibility(state, event, baseVisibility) {
  const hrCapacity = state.company.capacidadeRH || 50;
  const severityPull = (event.severidade || 0) * 0.22;
  return clampPercent(baseVisibility + hrCapacity * 0.16 + severityPull - 18);
}

function calculateReliability(state, baseReliability, visible) {
  const hrCapacity = state.company.capacidadeRH || 50;
  return clampPercent(baseReliability + hrCapacity * 0.18 + (visible ? 0 : -20));
}

function defaultEventModel(event) {
  return {
    tipo: `${event.tipo}_sinal`,
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["evento_relevante", "necessita_contexto"],
    baseVisibility: event.visivelParaRH ? 70 : 24,
    baseReliability: event.visivelParaRH ? 62 : 32,
  };
}

function complianceRiskModel(tipo, baseVisibility = 34, baseReliability = 38) {
  return {
    tipo,
    origem: "evento_organizacional",
    interpretacoesPossiveis: ["risco_psicossocial", "necessita_investigacao", "compliance"],
    baseVisibility,
    baseReliability,
  };
}

function complianceMemorySignal(tipo) {
  return {
    tipo,
    interpretacoesPossiveis: ["risco_psicossocial", "memoria_subjetiva", "necessita_contexto"],
  };
}

function defaultMemoryModel(memory) {
  return {
    tipo: `${memory.tipo}_sinal`,
    interpretacoesPossiveis: ["sinal_subjetivo", "necessita_investigacao"],
  };
}

function summarizeMemory(memory, employee) {
  return `${employee.nome}: ${memory.descricao}`;
}

module.exports = {
  createSignalFromEvent,
  createSignalFromMemory,
  createVisibleSignal,
};
