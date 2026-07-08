/**
 * Modulo: scenarioCatalog
 * Responsabilidade: catalogar cenarios jogaveis simples do MVP.
 * Entrada: id de cenario
 * Saida: definicao serializavel de cenario
 * Nao deve: alterar estado da simulacao ou avaliar resultado final.
 *
 * Versao expandida: preserva SCENARIOS, getScenarioById e listScenarios.
 */

const SCENARIOS = [
  {
    "id": "crescimento_desorganizado",
    "nome": "Crescimento Desorganizado",
    "premissa": "Empresa pequena cresceu rapido, acumulou funcoes, tem RH limitado, sinais de sobrecarga e diretoria impaciente.",
    "duracaoDias": 90,
    "horizonteSemanas": 12,
    "engineConfig": {
      "arquetipo": "crescimento_desorganizado",
      "economicProfileId": "servicos_profissionais",
      "size": {
        "id": "pequena",
        "employeeRange": [
          30,
          40
        ],
        "cashMonths": [
          2,
          5
        ]
      },
      "tags": [
        "mvp",
        "sobrecarga",
        "crescimento"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 12,
      "maturidadeGestao": -8,
      "capacidadeRH": -8,
      "estabilidadeFinanceira": -6,
      "culturaCuidado": -5,
      "climaSetor": -7,
      "cargaTrabalho": 12,
      "rumorLocal": 8,
      "satisfacao": -5,
      "sobrecarga": 10,
      "confiancaNoRH": -6,
      "riscoDeSaida": 5
    },
    "objetivos": {
      "climaMinimo": 52,
      "riscoCriticoMaximo": 4,
      "turnoverMaximo": 12,
      "acumuloCriticoMaximo": 5,
      "demandasPendentesMaximo": 3,
      "caixaMinimo": 0,
      "confiancaRhMinima": 48,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "Voce chegou depois de uma fase de contratacoes rapidas.",
      "As pessoas dizem que a empresa ainda funciona na base do improviso.",
      "A diretoria quer previsibilidade sem reduzir a ambicao."
    ]
  },
  {
    "id": "turnover_silencioso",
    "nome": "Turnover Silencioso",
    "premissa": "A empresa nao esta em crise aberta, mas pessoas boas saem aos poucos e ninguem sabe explicar exatamente o motivo.",
    "duracaoDias": 120,
    "horizonteSemanas": 16,
    "engineConfig": {
      "arquetipo": "turnover_silencioso",
      "economicProfileId": "atendimento_e_vendas",
      "size": {
        "id": "media",
        "employeeRange": [
          45,
          70
        ],
        "cashMonths": [
          3,
          5
        ]
      },
      "tags": [
        "retencao",
        "diagnostico",
        "clima"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 6,
      "maturidadeGestao": -4,
      "capacidadeRH": -3,
      "estabilidadeFinanceira": 2,
      "culturaCuidado": -8,
      "climaSetor": -10,
      "cargaTrabalho": 7,
      "rumorLocal": 12,
      "satisfacao": -10,
      "sobrecarga": 7,
      "confiancaNoRH": -4,
      "riscoDeSaida": 12
    },
    "objetivos": {
      "climaMinimo": 58,
      "riscoCriticoMaximo": 4,
      "turnoverMaximo": 8,
      "acumuloCriticoMaximo": 5,
      "demandasPendentesMaximo": 4,
      "caixaMinimo": 0,
      "confiancaRhMinima": 55,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "As saidas parecem isoladas, mas formam um padrao.",
      "Gestores atribuem tudo a mercado aquecido.",
      "Conversas informais sugerem problemas de reconhecimento e futuro de carreira."
    ]
  },
  {
    "id": "nova_lideranca_dura",
    "nome": "Nova Lideranca Dura",
    "premissa": "Uma lideranca recem-promovida trouxe organizacao e resultado, mas tambem medo, competicao interna e queda de seguranca psicologica.",
    "duracaoDias": 90,
    "horizonteSemanas": 12,
    "engineConfig": {
      "arquetipo": "nova_lideranca_dura",
      "economicProfileId": "operacao_intensiva",
      "size": {
        "id": "pequena_em_expansao",
        "employeeRange": [
          28,
          45
        ],
        "cashMonths": [
          2,
          4
        ]
      },
      "tags": [
        "lideranca",
        "compliance",
        "seguranca_psicologica"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 14,
      "maturidadeGestao": -6,
      "capacidadeRH": -4,
      "estabilidadeFinanceira": 0,
      "culturaCuidado": -12,
      "climaSetor": -12,
      "cargaTrabalho": 9,
      "rumorLocal": 10,
      "satisfacao": -8,
      "sobrecarga": 8,
      "confiancaNoRH": -8,
      "riscoDeSaida": 9
    },
    "objetivos": {
      "climaMinimo": 54,
      "riscoCriticoMaximo": 3,
      "turnoverMaximo": 10,
      "acumuloCriticoMaximo": 5,
      "demandasPendentesMaximo": 3,
      "caixaMinimo": 0,
      "confiancaRhMinima": 50,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "Os indicadores melhoraram rapido, mas as pessoas evitam falar em reunioes.",
      "Alguns elogiam a nova lideranca; outros dizem que o preco esta alto.",
      "O RH precisa agir sem virar inimigo da operacao."
    ]
  },
  {
    "id": "caixa_apertado_sem_demissao",
    "nome": "Caixa Apertado, Sem Demissao",
    "premissa": "A empresa perdeu receita e a diretoria quer atravessar o trimestre sem demitir, exigindo reorganizacao de tarefas e prioridades.",
    "duracaoDias": 90,
    "horizonteSemanas": 12,
    "engineConfig": {
      "arquetipo": "caixa_apertado_sem_demissao",
      "economicProfileId": "varejo_local",
      "size": {
        "id": "pequena",
        "employeeRange": [
          18,
          32
        ],
        "cashMonths": [
          0.8,
          2.0
        ]
      },
      "tags": [
        "financas",
        "priorizacao",
        "crise"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 16,
      "maturidadeGestao": -2,
      "capacidadeRH": -5,
      "estabilidadeFinanceira": -18,
      "culturaCuidado": 2,
      "climaSetor": -6,
      "cargaTrabalho": 10,
      "rumorLocal": 14,
      "satisfacao": -6,
      "sobrecarga": 9,
      "confiancaNoRH": 0,
      "riscoDeSaida": 5
    },
    "objetivos": {
      "climaMinimo": 50,
      "riscoCriticoMaximo": 4,
      "turnoverMaximo": 7,
      "acumuloCriticoMaximo": 5,
      "demandasPendentesMaximo": 5,
      "caixaMinimo": 1,
      "confiancaRhMinima": 48,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "Todo mundo sabe que o caixa apertou, mesmo sem comunicado oficial.",
      "A diretoria quer medidas rapidas que nao destruam o clima.",
      "Cortar projetos pode ser necessario, mas escolher mal aumenta risco futuro."
    ]
  },
  {
    "id": "fusao_de_equipes",
    "nome": "Fusao de Equipes",
    "premissa": "Duas equipes foram juntadas depois de uma reestruturacao. Ha disputa por status, confusao de papeis e memorias ruins do processo.",
    "duracaoDias": 120,
    "horizonteSemanas": 16,
    "engineConfig": {
      "arquetipo": "fusao_de_equipes",
      "economicProfileId": "servicos_profissionais",
      "size": {
        "id": "media",
        "employeeRange": [
          50,
          85
        ],
        "cashMonths": [
          2.5,
          5.0
        ]
      },
      "tags": [
        "reestruturacao",
        "conflito",
        "papeis"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 10,
      "maturidadeGestao": -7,
      "capacidadeRH": -2,
      "estabilidadeFinanceira": 1,
      "culturaCuidado": -6,
      "climaSetor": -13,
      "cargaTrabalho": 6,
      "rumorLocal": 16,
      "satisfacao": -9,
      "sobrecarga": 6,
      "confiancaNoRH": -7,
      "riscoDeSaida": 8
    },
    "objetivos": {
      "climaMinimo": 56,
      "riscoCriticoMaximo": 4,
      "turnoverMaximo": 12,
      "acumuloCriticoMaximo": 4,
      "demandasPendentesMaximo": 3,
      "caixaMinimo": 0,
      "confiancaRhMinima": 52,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "Pessoas antigas sentem que perderam espaco.",
      "Pessoas novas acham que sao tratadas como invasoras.",
      "A empresa precisa reconstruir papeis sem apagar o historico dos grupos."
    ]
  },
  {
    "id": "cliente_grande_demais",
    "nome": "Cliente Grande Demais",
    "premissa": "Um contrato enorme salvou a receita, mas agora a empresa gira em torno de um cliente exigente e imprevisivel.",
    "duracaoDias": 90,
    "horizonteSemanas": 12,
    "engineConfig": {
      "arquetipo": "cliente_grande_demais",
      "economicProfileId": "startup_b2b",
      "size": {
        "id": "pequena_em_expansao",
        "employeeRange": [
          25,
          42
        ],
        "cashMonths": [
          3,
          6
        ]
      },
      "tags": [
        "cliente",
        "sobrecarga",
        "dependencia"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 18,
      "maturidadeGestao": -5,
      "capacidadeRH": -6,
      "estabilidadeFinanceira": 8,
      "culturaCuidado": -4,
      "climaSetor": -9,
      "cargaTrabalho": 15,
      "rumorLocal": 8,
      "satisfacao": -6,
      "sobrecarga": 14,
      "confiancaNoRH": -3,
      "riscoDeSaida": 7
    },
    "objetivos": {
      "climaMinimo": 51,
      "riscoCriticoMaximo": 4,
      "turnoverMaximo": 9,
      "acumuloCriticoMaximo": 5,
      "demandasPendentesMaximo": 4,
      "caixaMinimo": 2,
      "confiancaRhMinima": 48,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "O contrato trouxe folego financeiro e caos operacional.",
      "Comercial promete velocidade; operacao pede limite.",
      "O RH precisa impedir que a empresa confunda urgencia com cultura."
    ]
  },
  {
    "id": "profissional_chave_em_risco",
    "nome": "Profissional Chave em Risco",
    "premissa": "Uma pessoa muito especializada concentra conhecimento critico, esta cansada e com sinais discretos de saida.",
    "duracaoDias": 75,
    "horizonteSemanas": 10,
    "engineConfig": {
      "arquetipo": "profissional_chave_em_risco",
      "economicProfileId": "startup_b2b",
      "size": {
        "id": "pequena",
        "employeeRange": [
          12,
          24
        ],
        "cashMonths": [
          2,
          4
        ]
      },
      "tags": [
        "sucessao",
        "conhecimento",
        "retencao"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 8,
      "maturidadeGestao": -8,
      "capacidadeRH": -6,
      "estabilidadeFinanceira": 0,
      "culturaCuidado": -4,
      "climaSetor": -5,
      "cargaTrabalho": 12,
      "rumorLocal": 5,
      "satisfacao": -8,
      "sobrecarga": 13,
      "confiancaNoRH": -2,
      "riscoDeSaida": 14
    },
    "objetivos": {
      "climaMinimo": 55,
      "riscoCriticoMaximo": 4,
      "turnoverMaximo": 3,
      "acumuloCriticoMaximo": 3,
      "demandasPendentesMaximo": 3,
      "caixaMinimo": 0,
      "confiancaRhMinima": 54,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "A empresa descobriu tarde que uma pessoa sabe coisas que ninguem mais sabe.",
      "Oferecer aumento pode ajudar, mas nao resolve tudo.",
      "Documentar conhecimento sem parecer substituicao e o dilema central."
    ]
  },
  {
    "id": "canal_denuncia_desacreditado",
    "nome": "Canal de Denuncia Desacreditado",
    "premissa": "Existe canal formal, mas as pessoas nao acreditam que ele proteja alguem. Os problemas aparecem por fofoca, nao por registro.",
    "duracaoDias": 120,
    "horizonteSemanas": 16,
    "engineConfig": {
      "arquetipo": "canal_denuncia_desacreditado",
      "economicProfileId": "terceirizacao_limpeza_portaria",
      "size": {
        "id": "media",
        "employeeRange": [
          40,
          75
        ],
        "cashMonths": [
          2,
          5
        ]
      },
      "tags": [
        "compliance",
        "confianca",
        "subnotificacao"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 9,
      "maturidadeGestao": -6,
      "capacidadeRH": -4,
      "estabilidadeFinanceira": 0,
      "culturaCuidado": -14,
      "climaSetor": -12,
      "cargaTrabalho": 6,
      "rumorLocal": 18,
      "satisfacao": -9,
      "sobrecarga": 6,
      "confiancaNoRH": -15,
      "riscoDeSaida": 10
    },
    "objetivos": {
      "climaMinimo": 56,
      "riscoCriticoMaximo": 3,
      "turnoverMaximo": 12,
      "acumuloCriticoMaximo": 5,
      "demandasPendentesMaximo": 3,
      "caixaMinimo": 0,
      "confiancaRhMinima": 60,
      "denunciasAbertasMaximo": 1
    },
    "briefingNarrativo": [
      "Algumas pessoas dizem que denunciar so piora a vida.",
      "A diretoria acha que esta protegida porque o canal existe.",
      "O desafio e transformar procedimento em confianca real."
    ]
  },
  {
    "id": "empresa_tecnica_sem_gestao",
    "nome": "Empresa Tecnica Sem Gestao",
    "premissa": "A empresa tem gente muito capaz tecnicamente, mas baixa maturidade de gestao, quase nenhum ritual de feedback e prioridades confusas.",
    "duracaoDias": 100,
    "horizonteSemanas": 14,
    "engineConfig": {
      "arquetipo": "empresa_tecnica_sem_gestao",
      "economicProfileId": "industria_leve",
      "size": {
        "id": "pequena_em_expansao",
        "employeeRange": [
          24,
          42
        ],
        "cashMonths": [
          2,
          4.5
        ]
      },
      "tags": [
        "gestao",
        "processo",
        "feedback"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 10,
      "maturidadeGestao": -14,
      "capacidadeRH": -5,
      "estabilidadeFinanceira": 1,
      "culturaCuidado": -5,
      "climaSetor": -8,
      "cargaTrabalho": 10,
      "rumorLocal": 8,
      "satisfacao": -7,
      "sobrecarga": 10,
      "confiancaNoRH": -4,
      "riscoDeSaida": 8
    },
    "objetivos": {
      "climaMinimo": 55,
      "riscoCriticoMaximo": 4,
      "turnoverMaximo": 12,
      "acumuloCriticoMaximo": 4,
      "demandasPendentesMaximo": 3,
      "caixaMinimo": 0,
      "confiancaRhMinima": 52,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "As pessoas resolvem problemas dificeis, mas quase tudo fica na cabeca de alguem.",
      "Feedback so aparece quando algo da errado.",
      "O RH precisa criar rituais leves antes de criar burocracia."
    ]
  },
  {
    "id": "rede_multunidade_fragmentada",
    "nome": "Rede Multiunidade Fragmentada",
    "premissa": "A empresa tem unidades diferentes, cada uma com uma cultura propria, e o RH enxerga pouco do que acontece no cotidiano.",
    "duracaoDias": 150,
    "horizonteSemanas": 20,
    "engineConfig": {
      "arquetipo": "rede_multunidade_fragmentada",
      "economicProfileId": "varejo_local",
      "size": {
        "id": "rede_regional",
        "employeeRange": [
          120,
          220
        ],
        "cashMonths": [
          3,
          6
        ]
      },
      "tags": [
        "multunidade",
        "diagnostico",
        "cultura"
      ]
    },
    "modificadoresIniciais": {
      "pressaoPorResultado": 11,
      "maturidadeGestao": -5,
      "capacidadeRH": -10,
      "estabilidadeFinanceira": 2,
      "culturaCuidado": -8,
      "climaSetor": -10,
      "cargaTrabalho": 8,
      "rumorLocal": 15,
      "satisfacao": -8,
      "sobrecarga": 8,
      "confiancaNoRH": -10,
      "riscoDeSaida": 9
    },
    "objetivos": {
      "climaMinimo": 57,
      "riscoCriticoMaximo": 4,
      "turnoverMaximo": 11,
      "acumuloCriticoMaximo": 5,
      "demandasPendentesMaximo": 5,
      "caixaMinimo": 0,
      "confiancaRhMinima": 56,
      "denunciasAbertasMaximo": 0
    },
    "briefingNarrativo": [
      "Uma unidade parece saudavel, outra parece um barril de polvora.",
      "Os indicadores medios escondem extremos.",
      "O RH precisa aprender a visitar, escutar e comparar sem padronizar tudo a forca."
    ]
  }
];
function getScenarioById(id = "crescimento_desorganizado") {
  return SCENARIOS.find((scenario) => scenario.id === id) || SCENARIOS[0];
}

function listScenarios() {
  return SCENARIOS.slice();
}

module.exports = {
  SCENARIOS,
  getScenarioById,
  listScenarios,
};
