/**
 * Modulo: economicProfiles
 * Responsabilidade: catalogar perfis economicos para empresas geradas.
 * Entrada: nenhuma
 * Saida: dados base editaveis
 * Nao deve: executar simulacao financeira.
 *
 * Versao expandida: preserva ECONOMIC_PROFILES e COMPANY_SIZES.
 * Campos extras sao metadados opcionais para aprofundar geracao futura.
 */

const ECONOMIC_PROFILES = [
  {
    "id": "servicos_profissionais",
    "nome": "servicos profissionais",
    "receitaBase": [
      85000,
      180000
    ],
    "custoFixoBase": [
      28000,
      72000
    ],
    "riscoCriseBase": [
      28,
      58
    ],
    "setoresEssenciais": [
      "Administrativo",
      "Financeiro",
      "Comercial",
      "Recursos Humanos",
      "Produto/Servico"
    ],
    "setoresSecundarios": [
      "Atendimento",
      "Operacoes"
    ],
    "margemOperacionalBase": [
      18,
      34
    ],
    "volatilidadeReceita": 42,
    "sazonalidade": {
      "mesesFortes": [
        3,
        4,
        8,
        9,
        10
      ],
      "mesesFracos": [
        1,
        2,
        7,
        12
      ]
    },
    "driversRisco": [
      "dependencia_de_pessoas_chave",
      "escopo_mal_definido",
      "retrabalho_com_cliente"
    ],
    "tensoesOrganizacionais": [
      "especialistas sobrecarregados",
      "projetos simultaneos",
      "dificuldade de estimar prazo"
    ],
    "pesoNaGeracao": 14
  },
  {
    "id": "operacao_intensiva",
    "nome": "operacao intensiva",
    "receitaBase": [
      120000,
      260000
    ],
    "custoFixoBase": [
      55000,
      125000
    ],
    "riscoCriseBase": [
      35,
      68
    ],
    "setoresEssenciais": [
      "Operacoes",
      "Financeiro",
      "Atendimento",
      "Recursos Humanos",
      "Administrativo"
    ],
    "setoresSecundarios": [
      "Produto/Servico",
      "Comercial"
    ],
    "margemOperacionalBase": [
      10,
      24
    ],
    "volatilidadeReceita": 55,
    "sazonalidade": {
      "mesesFortes": [
        3,
        5,
        8,
        11
      ],
      "mesesFracos": [
        1,
        2,
        7
      ]
    },
    "driversRisco": [
      "falha_operacional",
      "absenteismo",
      "gargalo_de_supervisao"
    ],
    "tensoesOrganizacionais": [
      "turnos apertados",
      "dependencia de escala",
      "liderancas muito pressionadas"
    ],
    "pesoNaGeracao": 14
  },
  {
    "id": "atendimento_e_vendas",
    "nome": "atendimento e vendas",
    "receitaBase": [
      70000,
      155000
    ],
    "custoFixoBase": [
      25000,
      62000
    ],
    "riscoCriseBase": [
      32,
      62
    ],
    "setoresEssenciais": [
      "Comercial",
      "Atendimento",
      "Financeiro",
      "Recursos Humanos",
      "Administrativo"
    ],
    "setoresSecundarios": [
      "Produto/Servico",
      "Operacoes"
    ],
    "margemOperacionalBase": [
      14,
      30
    ],
    "volatilidadeReceita": 62,
    "sazonalidade": {
      "mesesFortes": [
        5,
        6,
        10,
        11,
        12
      ],
      "mesesFracos": [
        1,
        2,
        7
      ]
    },
    "driversRisco": [
      "meta_agressiva",
      "churn_de_clientes",
      "fila_de_reclamacoes"
    ],
    "tensoesOrganizacionais": [
      "pressao por metas",
      "comissao percebida como injusta",
      "cliente hostil drenando energia"
    ],
    "pesoNaGeracao": 14
  },
  {
    "id": "startup_b2b",
    "nome": "startup B2B em tracao",
    "receitaBase": [
      45000,
      210000
    ],
    "custoFixoBase": [
      38000,
      145000
    ],
    "riscoCriseBase": [
      42,
      78
    ],
    "setoresEssenciais": [
      "Produto/Servico",
      "Comercial",
      "Atendimento",
      "Financeiro",
      "Recursos Humanos"
    ],
    "setoresSecundarios": [
      "Administrativo",
      "Operacoes"
    ],
    "margemOperacionalBase": [
      -12,
      22
    ],
    "volatilidadeReceita": 82,
    "sazonalidade": {
      "mesesFortes": [
        3,
        4,
        9,
        10,
        11
      ],
      "mesesFracos": [
        1,
        7,
        12
      ]
    },
    "driversRisco": [
      "burn_rate",
      "mudanca_de_prioridade",
      "cliente_grande_demais"
    ],
    "tensoesOrganizacionais": [
      "pivots constantes",
      "fundadores centralizadores",
      "contratacao rapida sem onboarding"
    ],
    "pesoNaGeracao": 9
  },
  {
    "id": "industria_leve",
    "nome": "industria leve",
    "receitaBase": [
      180000,
      420000
    ],
    "custoFixoBase": [
      95000,
      260000
    ],
    "riscoCriseBase": [
      38,
      72
    ],
    "setoresEssenciais": [
      "Operacoes",
      "Produto/Servico",
      "Financeiro",
      "Recursos Humanos",
      "Administrativo"
    ],
    "setoresSecundarios": [
      "Comercial",
      "Atendimento"
    ],
    "margemOperacionalBase": [
      8,
      21
    ],
    "volatilidadeReceita": 58,
    "sazonalidade": {
      "mesesFortes": [
        4,
        5,
        8,
        9,
        10
      ],
      "mesesFracos": [
        1,
        2,
        12
      ]
    },
    "driversRisco": [
      "manutencao_atrasada",
      "estoque_parado",
      "acidente_leve"
    ],
    "tensoesOrganizacionais": [
      "linha de producao pressionada",
      "retrabalho",
      "conflito entre qualidade e prazo"
    ],
    "pesoNaGeracao": 9
  },
  {
    "id": "clinica_servicos_saude",
    "nome": "clinica de servicos de saude",
    "receitaBase": [
      90000,
      240000
    ],
    "custoFixoBase": [
      52000,
      150000
    ],
    "riscoCriseBase": [
      30,
      64
    ],
    "setoresEssenciais": [
      "Atendimento",
      "Operacoes",
      "Financeiro",
      "Recursos Humanos",
      "Administrativo"
    ],
    "setoresSecundarios": [
      "Comercial",
      "Produto/Servico"
    ],
    "margemOperacionalBase": [
      9,
      27
    ],
    "volatilidadeReceita": 45,
    "sazonalidade": {
      "mesesFortes": [
        3,
        4,
        8,
        9,
        10
      ],
      "mesesFracos": [
        1,
        2,
        12
      ]
    },
    "driversRisco": [
      "agenda_lotada",
      "erro_de_comunicacao",
      "rotina_emocionalmente_exigente"
    ],
    "tensoesOrganizacionais": [
      "cuidado ao cliente versus produtividade",
      "recepcao sobrecarregada",
      "profissionais tecnicos isolados"
    ],
    "pesoNaGeracao": 8
  },
  {
    "id": "varejo_local",
    "nome": "varejo local multicanal",
    "receitaBase": [
      75000,
      220000
    ],
    "custoFixoBase": [
      35000,
      115000
    ],
    "riscoCriseBase": [
      36,
      70
    ],
    "setoresEssenciais": [
      "Comercial",
      "Atendimento",
      "Operacoes",
      "Financeiro",
      "Recursos Humanos"
    ],
    "setoresSecundarios": [
      "Administrativo",
      "Produto/Servico"
    ],
    "margemOperacionalBase": [
      7,
      25
    ],
    "volatilidadeReceita": 72,
    "sazonalidade": {
      "mesesFortes": [
        5,
        6,
        10,
        11,
        12
      ],
      "mesesFracos": [
        1,
        2,
        3
      ]
    },
    "driversRisco": [
      "ruptura_de_estoque",
      "campanha_mal_calculada",
      "concorrencia_por_preco"
    ],
    "tensoesOrganizacionais": [
      "escala de final de semana",
      "meta por vendedor",
      "caixa e atendimento acumulados"
    ],
    "pesoNaGeracao": 9
  },
  {
    "id": "educacao_corporativa",
    "nome": "educacao corporativa e treinamentos",
    "receitaBase": [
      55000,
      175000
    ],
    "custoFixoBase": [
      26000,
      85000
    ],
    "riscoCriseBase": [
      26,
      60
    ],
    "setoresEssenciais": [
      "Produto/Servico",
      "Comercial",
      "Atendimento",
      "Financeiro",
      "Recursos Humanos"
    ],
    "setoresSecundarios": [
      "Administrativo",
      "Operacoes"
    ],
    "margemOperacionalBase": [
      15,
      36
    ],
    "volatilidadeReceita": 60,
    "sazonalidade": {
      "mesesFortes": [
        2,
        3,
        4,
        8,
        9
      ],
      "mesesFracos": [
        1,
        7,
        12
      ]
    },
    "driversRisco": [
      "agenda_de_instrutores",
      "projeto_customizado_demais",
      "avaliacao_ruim_do_cliente"
    ],
    "tensoesOrganizacionais": [
      "facilitadores viajando",
      "conteudo sempre urgente",
      "comercial prometendo mais que a entrega"
    ],
    "pesoNaGeracao": 7
  },
  {
    "id": "logistica_urbana",
    "nome": "logistica urbana",
    "receitaBase": [
      130000,
      360000
    ],
    "custoFixoBase": [
      76000,
      230000
    ],
    "riscoCriseBase": [
      44,
      76
    ],
    "setoresEssenciais": [
      "Operacoes",
      "Atendimento",
      "Financeiro",
      "Recursos Humanos",
      "Administrativo"
    ],
    "setoresSecundarios": [
      "Comercial",
      "Produto/Servico"
    ],
    "margemOperacionalBase": [
      6,
      20
    ],
    "volatilidadeReceita": 66,
    "sazonalidade": {
      "mesesFortes": [
        5,
        8,
        10,
        11,
        12
      ],
      "mesesFracos": [
        1,
        2
      ]
    },
    "driversRisco": [
      "rota_estourada",
      "absenteismo",
      "custo_variavel_alto"
    ],
    "tensoesOrganizacionais": [
      "atrasos viram conflito",
      "gestores apagando incendio",
      "motoristas e atendimento se culpando"
    ],
    "pesoNaGeracao": 7
  },
  {
    "id": "terceirizacao_limpeza_portaria",
    "nome": "terceirizacao de limpeza e portaria",
    "receitaBase": [
      160000,
      390000
    ],
    "custoFixoBase": [
      115000,
      310000
    ],
    "riscoCriseBase": [
      46,
      82
    ],
    "setoresEssenciais": [
      "Operacoes",
      "Atendimento",
      "Financeiro",
      "Recursos Humanos",
      "Administrativo"
    ],
    "setoresSecundarios": [
      "Comercial"
    ],
    "margemOperacionalBase": [
      4,
      16
    ],
    "volatilidadeReceita": 52,
    "sazonalidade": {
      "mesesFortes": [
        3,
        4,
        8,
        9,
        10
      ],
      "mesesFracos": [
        1,
        12
      ]
    },
    "driversRisco": [
      "contrato_de_baixa_margem",
      "troca_de_posto",
      "escala_incompleta"
    ],
    "tensoesOrganizacionais": [
      "equipe alocada em clientes diferentes",
      "RH distante da rotina real",
      "supervisao em campo insuficiente"
    ],
    "pesoNaGeracao": 6
  },
  {
    "id": "ong_projeto_social",
    "nome": "ONG ou projeto social profissionalizado",
    "receitaBase": [
      35000,
      140000
    ],
    "custoFixoBase": [
      28000,
      120000
    ],
    "riscoCriseBase": [
      35,
      74
    ],
    "setoresEssenciais": [
      "Produto/Servico",
      "Administrativo",
      "Financeiro",
      "Recursos Humanos",
      "Atendimento"
    ],
    "setoresSecundarios": [
      "Comercial",
      "Operacoes"
    ],
    "margemOperacionalBase": [
      -6,
      14
    ],
    "volatilidadeReceita": 78,
    "sazonalidade": {
      "mesesFortes": [
        2,
        3,
        8,
        9,
        10
      ],
      "mesesFracos": [
        1,
        7,
        12
      ]
    },
    "driversRisco": [
      "edital_atrasado",
      "sobrecarga_por_missao",
      "prestacao_de_contas"
    ],
    "tensoesOrganizacionais": [
      "muita responsabilidade com poucos recursos",
      "limites profissionais confusos",
      "urgencias sociais constantes"
    ],
    "pesoNaGeracao": 6
  },
  {
    "id": "agencia_marketing",
    "nome": "agencia de marketing e conteudo",
    "receitaBase": [
      60000,
      190000
    ],
    "custoFixoBase": [
      32000,
      110000
    ],
    "riscoCriseBase": [
      34,
      69
    ],
    "setoresEssenciais": [
      "Produto/Servico",
      "Comercial",
      "Atendimento",
      "Financeiro",
      "Recursos Humanos"
    ],
    "setoresSecundarios": [
      "Administrativo",
      "Operacoes"
    ],
    "margemOperacionalBase": [
      10,
      32
    ],
    "volatilidadeReceita": 70,
    "sazonalidade": {
      "mesesFortes": [
        3,
        4,
        9,
        10,
        11
      ],
      "mesesFracos": [
        1,
        7,
        12
      ]
    },
    "driversRisco": [
      "briefing_fraco",
      "cliente_urgente",
      "criatividade_sob_pressao"
    ],
    "tensoesOrganizacionais": [
      "muitas revisoes",
      "prazo curto normalizado",
      "atendimento segurando conflito"
    ],
    "pesoNaGeracao": 7
  }
];

const COMPANY_SIZES = [
  {
    "id": "micro",
    "employeeRange": [
      6,
      9
    ],
    "cashMonths": [
      0.8,
      2.2
    ],
    "weight": 14,
    "complexidadeGestaoBase": 24,
    "capacidadeRHBase": 18,
    "descricao": "estrutura muito pessoal, quase tudo passa por uma ou duas liderancas"
  },
  {
    "id": "pequena",
    "employeeRange": [
      10,
      18
    ],
    "cashMonths": [
      1.5,
      3.2
    ],
    "weight": 35,
    "complexidadeGestaoBase": 38,
    "capacidadeRHBase": 28,
    "descricao": "empresa pequena com rotinas misturadas e pouco amortecedor"
  },
  {
    "id": "pequena_em_expansao",
    "employeeRange": [
      19,
      34
    ],
    "cashMonths": [
      1.6,
      4.0
    ],
    "weight": 23,
    "complexidadeGestaoBase": 52,
    "capacidadeRHBase": 36,
    "descricao": "cresceu o suficiente para sentir falta de processo, mas ainda nao estruturou tudo"
  },
  {
    "id": "media",
    "employeeRange": [
      35,
      70
    ],
    "cashMonths": [
      2.0,
      4.8
    ],
    "weight": 18,
    "complexidadeGestaoBase": 66,
    "capacidadeRHBase": 48,
    "descricao": "ja tem setores reconheciveis, mas liderancas intermediarias variam muito"
  },
  {
    "id": "grande_local",
    "employeeRange": [
      71,
      140
    ],
    "cashMonths": [
      2.5,
      5.5
    ],
    "weight": 8,
    "complexidadeGestaoBase": 78,
    "capacidadeRHBase": 58,
    "descricao": "empresa local grande com muitas camadas e comunicacao mais dificil"
  },
  {
    "id": "rede_regional",
    "employeeRange": [
      141,
      260
    ],
    "cashMonths": [
      3.0,
      6.5
    ],
    "weight": 2,
    "complexidadeGestaoBase": 88,
    "capacidadeRHBase": 64,
    "descricao": "varias unidades, cultura fragmentada e risco de RH ficar distante do chao"
  }
];

module.exports = {
  ECONOMIC_PROFILES,
  COMPANY_SIZES,
};
