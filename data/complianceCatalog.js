/**
 * Modulo: complianceCatalog
 * Responsabilidade: catalogar eventos sobrios de risco psicossocial e compliance.
 * Entrada: nenhuma
 * Saida: catalogos locais para simulacao
 * Nao deve: conter descricoes graficas, sexuais ou estereotipadas.
 *
 * Versao expandida: preserva PSYCHOSOCIAL_RISK_EVENTS e REPORT_STATUS.
 */

const PSYCHOSOCIAL_RISK_EVENTS = [
  {
    "tipo": "tratamento_desigual",
    "descricao": "Ha sinais de tratamento desigual recorrente no setor.",
    "severidadeBase": 58,
    "tags": [
      "compliance",
      "justica",
      "tratamento_desigual"
    ],
    "probabilidadeBase": 38,
    "subnotificacaoBase": 54,
    "indicadoresSensiveis": [
      "queixas_informais",
      "comparacao_de_oportunidades"
    ],
    "efeitosProvaveis": {
      "confiancaNoRH": -5,
      "climaSetor": -6,
      "riscoDeSaida": 4
    }
  },
  {
    "tipo": "microagressao",
    "descricao": "Uma interacao inadequada gerou desconforto e inseguranca no setor.",
    "severidadeBase": 52,
    "tags": [
      "compliance",
      "microagressao",
      "seguranca_psicologica"
    ],
    "probabilidadeBase": 34,
    "subnotificacaoBase": 62,
    "indicadoresSensiveis": [
      "silencio_em_reunioes",
      "evitacao_de_pares"
    ],
    "efeitosProvaveis": {
      "climaSetor": -5,
      "satisfacao": -4,
      "rumorLocal": 4
    }
  },
  {
    "tipo": "exclusao_de_reuniao",
    "descricao": "Ha sinais de exclusao recorrente de uma pessoa em reunioes importantes.",
    "severidadeBase": 56,
    "tags": [
      "compliance",
      "exclusao",
      "justica"
    ],
    "probabilidadeBase": 32,
    "subnotificacaoBase": 58,
    "indicadoresSensiveis": [
      "decisoes_sem_participacao",
      "informacao_chegando_tarde"
    ],
    "efeitosProvaveis": {
      "climaSetor": -5,
      "riscoDeSaida": 4
    }
  },
  {
    "tipo": "credito_negado_por_trabalho",
    "descricao": "Um trabalho relevante parece ter sido reconhecido de forma injusta.",
    "severidadeBase": 50,
    "tags": [
      "compliance",
      "reconhecimento",
      "justica"
    ],
    "probabilidadeBase": 36,
    "subnotificacaoBase": 50,
    "indicadoresSensiveis": [
      "queda_de_engajamento",
      "ironia_sobre_merito"
    ],
    "efeitosProvaveis": {
      "satisfacao": -5,
      "rumorLocal": 3
    }
  },
  {
    "tipo": "lideranca_abusiva",
    "descricao": "Ha sinais de lideranca humilhante ou excessivamente hostil no setor.",
    "severidadeBase": 72,
    "tags": [
      "compliance",
      "lideranca",
      "assedio_moral_generico"
    ],
    "probabilidadeBase": 26,
    "subnotificacaoBase": 68,
    "indicadoresSensiveis": [
      "medo_de_reuniao",
      "rotatividade_local"
    ],
    "efeitosProvaveis": {
      "climaSetor": -10,
      "confiancaNoRH": -6,
      "riscoDeSaida": 8,
      "sobrecarga": 4
    }
  },
  {
    "tipo": "cobranca_humilhante",
    "descricao": "Uma cobranca publica inadequada afetou a seguranca psicologica do setor.",
    "severidadeBase": 66,
    "tags": [
      "compliance",
      "cobranca",
      "assedio_moral_generico"
    ],
    "probabilidadeBase": 30,
    "subnotificacaoBase": 64,
    "indicadoresSensiveis": [
      "reunioes_tensas",
      "queda_de_participacao"
    ],
    "efeitosProvaveis": {
      "climaSetor": -8,
      "satisfacao": -6,
      "rumorLocal": 5
    }
  },
  {
    "tipo": "isolamento_social",
    "descricao": "Ha sinais de isolamento social recorrente em uma relacao de trabalho.",
    "severidadeBase": 54,
    "tags": [
      "compliance",
      "isolamento",
      "seguranca_psicologica"
    ],
    "probabilidadeBase": 36,
    "subnotificacaoBase": 60,
    "indicadoresSensiveis": [
      "almocos_separados",
      "mensagens_nao_respondidas"
    ],
    "efeitosProvaveis": {
      "climaSetor": -5,
      "riscoDeSaida": 4
    }
  },
  {
    "tipo": "apelido_constrangedor",
    "descricao": "Um apelido ou brincadeira recorrente passou a constranger uma pessoa da equipe.",
    "severidadeBase": 48,
    "tags": [
      "compliance",
      "respeito",
      "brincadeira_inadequada"
    ],
    "probabilidadeBase": 42,
    "subnotificacaoBase": 66,
    "indicadoresSensiveis": [
      "risadas_desconfortaveis",
      "mudanca_de_humor"
    ],
    "efeitosProvaveis": {
      "segurancaPsicologica": -5,
      "climaSetor": -4
    }
  },
  {
    "tipo": "interrupcao_recorrente",
    "descricao": "Uma pessoa relata ser interrompida repetidamente em discussoes de trabalho.",
    "severidadeBase": 44,
    "tags": [
      "compliance",
      "voz",
      "participacao"
    ],
    "probabilidadeBase": 46,
    "subnotificacaoBase": 52,
    "indicadoresSensiveis": [
      "participacao_menor",
      "decisoes_concentradas"
    ],
    "efeitosProvaveis": {
      "climaSetor": -3,
      "satisfacao": -4
    }
  },
  {
    "tipo": "escala_percebida_injusta",
    "descricao": "A distribuicao de escala ou turnos esta sendo percebida como injusta por parte da equipe.",
    "severidadeBase": 50,
    "tags": [
      "justica",
      "escala",
      "operacoes"
    ],
    "probabilidadeBase": 44,
    "subnotificacaoBase": 38,
    "indicadoresSensiveis": [
      "trocas_de_turno",
      "faltas_recorrentes"
    ],
    "efeitosProvaveis": {
      "climaSetor": -5,
      "sobrecarga": 4,
      "rumorLocal": 6
    }
  },
  {
    "tipo": "promocao_opaca",
    "descricao": "Uma promocao recente gerou duvidas sobre criterios e transparencia.",
    "severidadeBase": 55,
    "tags": [
      "carreira",
      "justica",
      "transparencia"
    ],
    "probabilidadeBase": 30,
    "subnotificacaoBase": 44,
    "indicadoresSensiveis": [
      "comentarios_sobre_favoritismo",
      "queda_de_confianca"
    ],
    "efeitosProvaveis": {
      "confiancaNoRH": -6,
      "satisfacao": -5,
      "riscoDeSaida": 4
    }
  },
  {
    "tipo": "sobrecarga_cronica",
    "descricao": "A carga de trabalho parece ter virado uma condicao permanente, nao um pico temporario.",
    "severidadeBase": 62,
    "tags": [
      "psicossocial",
      "sobrecarga",
      "saude_ocupacional"
    ],
    "probabilidadeBase": 50,
    "subnotificacaoBase": 42,
    "indicadoresSensiveis": [
      "horas_extras",
      "erros_por_fadiga"
    ],
    "efeitosProvaveis": {
      "sobrecarga": 8,
      "satisfacao": -6,
      "riscoDeSaida": 6
    }
  },
  {
    "tipo": "ambiguidade_de_papel",
    "descricao": "Responsabilidades pouco claras estao gerando retrabalho, culpa e conflito entre pessoas.",
    "severidadeBase": 46,
    "tags": [
      "organizacional",
      "papeis",
      "processo"
    ],
    "probabilidadeBase": 56,
    "subnotificacaoBase": 30,
    "indicadoresSensiveis": [
      "tarefas_duplicadas",
      "cobrancas_cruzadas"
    ],
    "efeitosProvaveis": {
      "cargaTrabalho": 5,
      "climaSetor": -4
    }
  },
  {
    "tipo": "retaliacao_sutil",
    "descricao": "Depois de uma queixa, surgiram sinais de afastamento, perda de oportunidades ou tratamento frio.",
    "severidadeBase": 74,
    "tags": [
      "compliance",
      "retaliacao",
      "canal_denuncia"
    ],
    "probabilidadeBase": 18,
    "subnotificacaoBase": 76,
    "indicadoresSensiveis": [
      "mudanca_de_tarefas",
      "isolamento_pos_relato"
    ],
    "efeitosProvaveis": {
      "confiancaNoRH": -12,
      "riscoDeSaida": 8,
      "climaSetor": -8
    }
  },
  {
    "tipo": "boato_sobre_demissao",
    "descricao": "Um boato de desligamentos comecou a circular e esta afetando foco e confianca.",
    "severidadeBase": 42,
    "tags": [
      "rumor",
      "comunicacao",
      "seguranca"
    ],
    "probabilidadeBase": 48,
    "subnotificacaoBase": 20,
    "indicadoresSensiveis": [
      "perguntas_indiretas",
      "queda_de_produtividade"
    ],
    "efeitosProvaveis": {
      "rumorLocal": 8,
      "satisfacao": -4,
      "confiancaNoRH": -3
    }
  },
  {
    "tipo": "cliente_hostil_normalizado",
    "descricao": "Interacoes hostis de clientes estao sendo tratadas como parte normal do trabalho.",
    "severidadeBase": 60,
    "tags": [
      "psicossocial",
      "cliente",
      "atendimento"
    ],
    "probabilidadeBase": 38,
    "subnotificacaoBase": 46,
    "indicadoresSensiveis": [
      "chamados_dificeis",
      "afastamento_de_atendimento"
    ],
    "efeitosProvaveis": {
      "sobrecarga": 5,
      "satisfacao": -5,
      "climaSetor": -4
    }
  },
  {
    "tipo": "falta_de_acessibilidade_operacional",
    "descricao": "Uma barreira de acesso ou adaptacao esta dificultando a participacao plena no trabalho.",
    "severidadeBase": 64,
    "tags": [
      "inclusao",
      "acessibilidade",
      "compliance"
    ],
    "probabilidadeBase": 20,
    "subnotificacaoBase": 58,
    "indicadoresSensiveis": [
      "solicitacoes_repetidas",
      "adaptacao_pendente"
    ],
    "efeitosProvaveis": {
      "confiancaNoRH": -7,
      "satisfacao": -6,
      "riscoDeSaida": 5
    }
  },
  {
    "tipo": "treinamento_obrigatorio_vazio",
    "descricao": "Um treinamento obrigatorio foi aplicado de forma burocratica e gerou cinismo na equipe.",
    "severidadeBase": 34,
    "tags": [
      "treinamento",
      "cultura",
      "compliance"
    ],
    "probabilidadeBase": 46,
    "subnotificacaoBase": 24,
    "indicadoresSensiveis": [
      "piadas_sobre_treinamento",
      "baixa_adesao"
    ],
    "efeitosProvaveis": {
      "confiancaNoRH": -3,
      "culturaCuidado": -3
    }
  },
  {
    "tipo": "conflito_entre_setores",
    "descricao": "Dois setores passaram a se culpar publicamente por atrasos e falhas.",
    "severidadeBase": 52,
    "tags": [
      "conflito",
      "setores",
      "processo"
    ],
    "probabilidadeBase": 44,
    "subnotificacaoBase": 34,
    "indicadoresSensiveis": [
      "emails_defensivos",
      "reunioes_sem_acordo"
    ],
    "efeitosProvaveis": {
      "climaSetor": -6,
      "cargaTrabalho": 4,
      "rumorLocal": 4
    }
  },
  {
    "tipo": "informacao_retida",
    "descricao": "Informacoes importantes estao sendo seguradas por uma pessoa ou grupo como forma de controle.",
    "severidadeBase": 57,
    "tags": [
      "poder",
      "comunicacao",
      "justica"
    ],
    "probabilidadeBase": 32,
    "subnotificacaoBase": 48,
    "indicadoresSensiveis": [
      "dependencia_de_pessoa_chave",
      "retrabalho"
    ],
    "efeitosProvaveis": {
      "maturidadeGestao": -4,
      "climaSetor": -5
    }
  },
  {
    "tipo": "onboarding_insuficiente",
    "descricao": "Novas pessoas entram sem orientacao suficiente e dependem de favores informais para aprender.",
    "severidadeBase": 43,
    "tags": [
      "onboarding",
      "processo",
      "aprendizagem"
    ],
    "probabilidadeBase": 54,
    "subnotificacaoBase": 26,
    "indicadoresSensiveis": [
      "duvidas_repetidas",
      "erros_de_inicio"
    ],
    "efeitosProvaveis": {
      "cargaTrabalho": 4,
      "satisfacao": -3,
      "riscoDeSaida": 3
    }
  },
  {
    "tipo": "meta_inatingivel",
    "descricao": "A meta do setor parece desconectada da capacidade real de trabalho.",
    "severidadeBase": 61,
    "tags": [
      "meta",
      "sobrecarga",
      "gestao"
    ],
    "probabilidadeBase": 40,
    "subnotificacaoBase": 36,
    "indicadoresSensiveis": [
      "horas_extras",
      "desistencia_silenciosa"
    ],
    "efeitosProvaveis": {
      "pressaoPorResultado": 6,
      "sobrecarga": 6,
      "satisfacao": -5
    }
  },
  {
    "tipo": "favoritismo_percebido",
    "descricao": "A equipe percebe diferenca de tratamento baseada em proximidade com a lideranca.",
    "severidadeBase": 59,
    "tags": [
      "justica",
      "lideranca",
      "favoritismo"
    ],
    "probabilidadeBase": 36,
    "subnotificacaoBase": 46,
    "indicadoresSensiveis": [
      "comentarios_sobre_panela",
      "baixa_colaboracao"
    ],
    "efeitosProvaveis": {
      "climaSetor": -6,
      "confiancaNoRH": -4,
      "riscoDeSaida": 4
    }
  },
  {
    "tipo": "reuniao_expositiva",
    "descricao": "Reunioes tem exposto erros individuais de forma pouco cuidadosa.",
    "severidadeBase": 58,
    "tags": [
      "lideranca",
      "seguranca_psicologica",
      "feedback"
    ],
    "probabilidadeBase": 34,
    "subnotificacaoBase": 54,
    "indicadoresSensiveis": [
      "medo_de_apresentar",
      "silencio_coletivo"
    ],
    "efeitosProvaveis": {
      "segurancaPsicologica": -7,
      "climaSetor": -5
    }
  },
  {
    "tipo": "limite_de_jornada_confuso",
    "descricao": "Mensagens e demandas fora do horario viraram habito informal.",
    "severidadeBase": 53,
    "tags": [
      "jornada",
      "sobrecarga",
      "limites"
    ],
    "probabilidadeBase": 48,
    "subnotificacaoBase": 40,
    "indicadoresSensiveis": [
      "respostas_noturnas",
      "fadiga_relacional"
    ],
    "efeitosProvaveis": {
      "sobrecarga": 5,
      "satisfacao": -5
    }
  },
  {
    "tipo": "erro_operacional_ocultado",
    "descricao": "Um erro operacional foi escondido por medo de punicao, aumentando risco de recorrencia.",
    "severidadeBase": 65,
    "tags": [
      "seguranca_psicologica",
      "operacoes",
      "aprendizagem"
    ],
    "probabilidadeBase": 26,
    "subnotificacaoBase": 68,
    "indicadoresSensiveis": [
      "registro_incompleto",
      "versoes_contraditorias"
    ],
    "efeitosProvaveis": {
      "maturidadeGestao": -5,
      "climaSetor": -5,
      "riscoCritico": 4
    }
  }
];

const REPORT_STATUS = {
  "UNDER_REPORTED": "subnotificado",
  "REPORTED": "denuncia_registrada",
  "ACKNOWLEDGED": "denuncia_acolhida",
  "NOT_WELCOMED": "denuncia_nao_acolhida",
  "IN_TRIAGE": "em_triagem",
  "IN_INVESTIGATION": "em_apuracao",
  "ACTION_PLAN": "plano_de_acao",
  "MONITORING": "monitoramento_pos_acao",
  "CLOSED": "encerrado"
};

const RISK_EVENT_SEVERITY = {
  "LOW": [
    0,
    39
  ],
  "MODERATE": [
    40,
    59
  ],
  "HIGH": [
    60,
    74
  ],
  "CRITICAL": [
    75,
    100
  ]
};

module.exports = {
  PSYCHOSOCIAL_RISK_EVENTS,
  REPORT_STATUS,
  RISK_EVENT_SEVERITY,
};
