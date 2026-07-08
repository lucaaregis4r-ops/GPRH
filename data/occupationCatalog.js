/**
 * Modulo: occupationCatalog
 * Responsabilidade: catalogar ocupacoes locais inspiradas na CBO.
 * Entrada: nenhuma
 * Saida: lista editavel de ocupacoes
 * Nao deve: consultar internet ou impor codigos nao confirmados.
 *
 * Versao expandida: preserva OCCUPATION_CATALOG e todos os campos essenciais usados no MVP.
 * cboCodigo permanece null quando nao foi confirmado.
 */

const OCCUPATION_CATALOG = [
  {
    "id": "assistente_administrativo",
    "cboCodigo": "4110-10",
    "titulo": "Assistente administrativo",
    "familia": "Agentes, assistentes e auxiliares administrativos",
    "setorAfinidade": [
      "Administrativo",
      "Financeiro",
      "Recursos Humanos"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 35,
    "autonomiaBase": 45,
    "complexidadeBase": 40,
    "contatoComPublico": 35,
    "dependenciaDeProcesso": 75,
    "salaryBand": {
      "junior": [
        1900,
        3200
      ],
      "pleno": [
        3200,
        5200
      ]
    },
    "tarefasBase": [
      "organizar documentos",
      "atualizar planilhas",
      "apoiar rotinas internas",
      "controlar agendas e arquivos"
    ],
    "riscosOrganizacionais": [
      "acumulo_de_tarefas_invisiveis",
      "erro_por_interrupcao"
    ],
    "necessidadesDeTreinamento": [
      "organizacao de processos",
      "comunicacao escrita"
    ],
    "interacoesFrequentes": [
      "analista_financeiro",
      "assistente_rh",
      "coordenador_equipe"
    ],
    "pesoNaGeracao": 8
  },
  {
    "id": "analista_financeiro",
    "cboCodigo": null,
    "titulo": "Analista financeiro",
    "familia": "Profissionais de administracao financeira",
    "setorAfinidade": [
      "Financeiro",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 65,
    "autonomiaBase": 62,
    "complexidadeBase": 70,
    "contatoComPublico": 25,
    "dependenciaDeProcesso": 80,
    "salaryBand": {
      "pleno": [
        4200,
        7200
      ],
      "senior": [
        7200,
        11500
      ]
    },
    "tarefasBase": [
      "acompanhar fluxo de caixa",
      "analisar despesas",
      "preparar relatorios financeiros",
      "projetar cenarios de caixa"
    ],
    "riscosOrganizacionais": [
      "fechamento_no_limite",
      "pressao_por_corte"
    ],
    "necessidadesDeTreinamento": [
      "analise de indicadores",
      "negociacao interna"
    ],
    "interacoesFrequentes": [
      "assistente_administrativo",
      "coordenador_equipe",
      "gerente_financeiro"
    ],
    "pesoNaGeracao": 6
  },
  {
    "id": "assistente_rh",
    "cboCodigo": null,
    "titulo": "Assistente de RH",
    "familia": "Tecnicos e auxiliares de recursos humanos",
    "setorAfinidade": [
      "Recursos Humanos",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 42,
    "autonomiaBase": 46,
    "complexidadeBase": 45,
    "contatoComPublico": 70,
    "dependenciaDeProcesso": 72,
    "salaryBand": {
      "junior": [
        2100,
        3400
      ],
      "pleno": [
        3400,
        5600
      ]
    },
    "tarefasBase": [
      "acompanhar admissoes",
      "organizar documentos de pessoal",
      "apoiar comunicados internos",
      "atualizar registros de funcionarios"
    ],
    "riscosOrganizacionais": [
      "papel_de_mensageiro_de_noticia_ruim",
      "sobrecarga_em_fechamento"
    ],
    "necessidadesDeTreinamento": [
      "escuta inicial",
      "LGPD basica",
      "rotinas trabalhistas"
    ],
    "interacoesFrequentes": [
      "analista_rh",
      "assistente_administrativo",
      "coordenador_equipe"
    ],
    "pesoNaGeracao": 7
  },
  {
    "id": "analista_rh",
    "cboCodigo": null,
    "titulo": "Analista de RH",
    "familia": "Profissionais de recursos humanos",
    "setorAfinidade": [
      "Recursos Humanos",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 60,
    "autonomiaBase": 65,
    "complexidadeBase": 65,
    "contatoComPublico": 82,
    "dependenciaDeProcesso": 58,
    "salaryBand": {
      "pleno": [
        4200,
        7600
      ],
      "senior": [
        7600,
        12000
      ]
    },
    "tarefasBase": [
      "conduzir entrevistas",
      "acompanhar clima",
      "organizar treinamentos",
      "mediar conversas delicadas"
    ],
    "riscosOrganizacionais": [
      "exposicao_a_conflitos",
      "confidencialidade_mal_compreendida"
    ],
    "necessidadesDeTreinamento": [
      "entrevista estruturada",
      "facilitacao de grupo",
      "compliance basico"
    ],
    "interacoesFrequentes": [
      "assistente_rh",
      "coordenador_equipe",
      "gerente_rh"
    ],
    "pesoNaGeracao": 6
  },
  {
    "id": "vendedor_interno",
    "cboCodigo": null,
    "titulo": "Vendedor interno",
    "familia": "Trabalhadores da comercializacao",
    "setorAfinidade": [
      "Comercial",
      "Atendimento"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 40,
    "autonomiaBase": 55,
    "complexidadeBase": 45,
    "contatoComPublico": 92,
    "dependenciaDeProcesso": 44,
    "salaryBand": {
      "junior": [
        1800,
        3300
      ],
      "pleno": [
        3300,
        6200
      ],
      "senior": [
        6200,
        9800
      ]
    },
    "tarefasBase": [
      "prospectar clientes",
      "registrar oportunidades",
      "negociar propostas",
      "acompanhar pos-venda simples"
    ],
    "riscosOrganizacionais": [
      "pressao_de_meta",
      "competicao_interna_excessiva"
    ],
    "necessidadesDeTreinamento": [
      "CRM",
      "negociacao consultiva",
      "gestao emocional em rejeicao"
    ],
    "interacoesFrequentes": [
      "analista_comercial",
      "atendente",
      "supervisor_atendimento"
    ],
    "pesoNaGeracao": 8
  },
  {
    "id": "analista_comercial",
    "cboCodigo": null,
    "titulo": "Analista comercial",
    "familia": "Analistas de negocios e comercializacao",
    "setorAfinidade": [
      "Comercial"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 58,
    "autonomiaBase": 62,
    "complexidadeBase": 62,
    "contatoComPublico": 75,
    "dependenciaDeProcesso": 52,
    "salaryBand": {
      "pleno": [
        4200,
        7300
      ],
      "senior": [
        7300,
        11800
      ]
    },
    "tarefasBase": [
      "analisar carteira",
      "preparar previsoes de venda",
      "acompanhar metas",
      "mapear oportunidades por segmento"
    ],
    "riscosOrganizacionais": [
      "promessa_comercial_irreal",
      "conflito_com_operacoes"
    ],
    "necessidadesDeTreinamento": [
      "previsao de vendas",
      "analise de funil"
    ],
    "interacoesFrequentes": [
      "vendedor_interno",
      "coordenador_equipe",
      "analista_produto"
    ],
    "pesoNaGeracao": 5
  },
  {
    "id": "atendente",
    "cboCodigo": null,
    "titulo": "Atendente",
    "familia": "Trabalhadores de atendimento ao publico",
    "setorAfinidade": [
      "Atendimento",
      "Comercial"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 30,
    "autonomiaBase": 38,
    "complexidadeBase": 32,
    "contatoComPublico": 95,
    "dependenciaDeProcesso": 70,
    "salaryBand": {
      "junior": [
        1600,
        2800
      ],
      "pleno": [
        2800,
        4200
      ]
    },
    "tarefasBase": [
      "atender solicitacoes",
      "registrar chamados",
      "acompanhar retorno ao cliente",
      "orientar uso basico de servicos"
    ],
    "riscosOrganizacionais": [
      "cliente_hostil",
      "fila_invisivel",
      "baixa_autonomia"
    ],
    "necessidadesDeTreinamento": [
      "comunicacao nao violenta",
      "registro de chamados"
    ],
    "interacoesFrequentes": [
      "supervisor_atendimento",
      "vendedor_interno",
      "analista_sucesso_cliente"
    ],
    "pesoNaGeracao": 9
  },
  {
    "id": "supervisor_atendimento",
    "cboCodigo": null,
    "titulo": "Supervisor de atendimento",
    "familia": "Supervisores de atendimento e servicos",
    "setorAfinidade": [
      "Atendimento",
      "Comercial"
    ],
    "senioridadesPossiveis": [
      "lideranca"
    ],
    "nivelEspecializacaoBase": 55,
    "autonomiaBase": 70,
    "complexidadeBase": 65,
    "contatoComPublico": 88,
    "dependenciaDeProcesso": 65,
    "salaryBand": {
      "lideranca": [
        6200,
        10500
      ]
    },
    "tarefasBase": [
      "acompanhar fila de atendimento",
      "orientar equipe",
      "resolver escalonamentos",
      "monitorar qualidade de resposta"
    ],
    "riscosOrganizacionais": [
      "ser_escudo_da_empresa",
      "lideranca_por_pressao"
    ],
    "necessidadesDeTreinamento": [
      "feedback",
      "priorizacao",
      "gestao de fila"
    ],
    "interacoesFrequentes": [
      "atendente",
      "analista_sucesso_cliente",
      "coordenador_equipe"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "auxiliar_producao",
    "cboCodigo": null,
    "titulo": "Auxiliar de producao",
    "familia": "Trabalhadores de apoio operacional",
    "setorAfinidade": [
      "Operacoes",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 32,
    "autonomiaBase": 35,
    "complexidadeBase": 34,
    "contatoComPublico": 15,
    "dependenciaDeProcesso": 85,
    "salaryBand": {
      "junior": [
        1700,
        3000
      ],
      "pleno": [
        3000,
        4600
      ]
    },
    "tarefasBase": [
      "preparar materiais",
      "executar rotinas operacionais",
      "registrar ocorrencias",
      "apoiar organizacao do posto"
    ],
    "riscosOrganizacionais": [
      "fadiga_fisica",
      "baixo_reconhecimento"
    ],
    "necessidadesDeTreinamento": [
      "seguranca operacional",
      "padronizacao"
    ],
    "interacoesFrequentes": [
      "tecnico_manutencao",
      "lider_operacional",
      "inspetor_qualidade"
    ],
    "pesoNaGeracao": 8
  },
  {
    "id": "tecnico_manutencao",
    "cboCodigo": null,
    "titulo": "Tecnico de manutencao",
    "familia": "Tecnicos de manutencao",
    "setorAfinidade": [
      "Operacoes",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 72,
    "autonomiaBase": 68,
    "complexidadeBase": 78,
    "contatoComPublico": 20,
    "dependenciaDeProcesso": 62,
    "salaryBand": {
      "pleno": [
        3900,
        6800
      ],
      "senior": [
        6800,
        10800
      ]
    },
    "tarefasBase": [
      "diagnosticar falhas",
      "corrigir equipamentos",
      "orientar manutencao preventiva",
      "registrar historico tecnico"
    ],
    "riscosOrganizacionais": [
      "chamado_urgente_constante",
      "responsabilidade_sem_recurso"
    ],
    "necessidadesDeTreinamento": [
      "manutencao preventiva",
      "documentacao tecnica"
    ],
    "interacoesFrequentes": [
      "auxiliar_producao",
      "lider_operacional",
      "analista_produto"
    ],
    "pesoNaGeracao": 5
  },
  {
    "id": "analista_produto",
    "cboCodigo": null,
    "titulo": "Analista de produto",
    "familia": "Analistas de produto e servicos",
    "setorAfinidade": [
      "Produto/Servico",
      "Operacoes"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 68,
    "autonomiaBase": 70,
    "complexidadeBase": 76,
    "contatoComPublico": 42,
    "dependenciaDeProcesso": 50,
    "salaryBand": {
      "pleno": [
        5200,
        8500
      ],
      "senior": [
        8500,
        13500
      ]
    },
    "tarefasBase": [
      "mapear necessidades",
      "priorizar melhorias",
      "acompanhar entregas do servico",
      "traduzir demanda de cliente em requisitos"
    ],
    "riscosOrganizacionais": [
      "prioridade_mutante",
      "tensao_comercial_tecnica"
    ],
    "necessidadesDeTreinamento": [
      "descoberta de problema",
      "priorizacao",
      "facilitacao"
    ],
    "interacoesFrequentes": [
      "analista_comercial",
      "designer_servico",
      "desenvolvedor_sistemas"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "coordenador_equipe",
    "cboCodigo": null,
    "titulo": "Coordenador de equipe",
    "familia": "Supervisores e coordenadores",
    "setorAfinidade": [
      "Operacoes",
      "Comercial",
      "Administrativo",
      "Atendimento",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "lideranca"
    ],
    "nivelEspecializacaoBase": 60,
    "autonomiaBase": 76,
    "complexidadeBase": 72,
    "contatoComPublico": 62,
    "dependenciaDeProcesso": 55,
    "salaryBand": {
      "lideranca": [
        7600,
        14500
      ]
    },
    "tarefasBase": [
      "acompanhar entregas",
      "distribuir prioridades",
      "orientar pessoas da equipe",
      "negociar prazo com outros setores"
    ],
    "riscosOrganizacionais": [
      "sanduiche_hierarquico",
      "decisao_sem_dado"
    ],
    "necessidadesDeTreinamento": [
      "gestao de conflitos",
      "planejamento semanal",
      "feedback"
    ],
    "interacoesFrequentes": [
      "analista_rh",
      "supervisor_atendimento",
      "gerente_operacoes"
    ],
    "pesoNaGeracao": 5
  },
  {
    "id": "recepcionista",
    "cboCodigo": null,
    "titulo": "Recepcionista",
    "familia": "Trabalhadores de atendimento e apoio administrativo",
    "setorAfinidade": [
      "Atendimento",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 28,
    "autonomiaBase": 40,
    "complexidadeBase": 34,
    "contatoComPublico": 96,
    "dependenciaDeProcesso": 76,
    "salaryBand": {
      "junior": [
        1550,
        2600
      ],
      "pleno": [
        2600,
        3900
      ]
    },
    "tarefasBase": [
      "receber visitantes",
      "organizar agenda de atendimento",
      "filtrar solicitacoes",
      "direcionar demandas internas"
    ],
    "riscosOrganizacionais": [
      "interrupcao_constante",
      "responsabilidade_sem_autonomia"
    ],
    "necessidadesDeTreinamento": [
      "triagem de demanda",
      "acolhimento ao publico"
    ],
    "interacoesFrequentes": [
      "atendente",
      "assistente_administrativo"
    ],
    "pesoNaGeracao": 5
  },
  {
    "id": "secretaria_executiva",
    "cboCodigo": null,
    "titulo": "Secretaria executiva",
    "familia": "Apoio executivo e administrativo",
    "setorAfinidade": [
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 58,
    "autonomiaBase": 66,
    "complexidadeBase": 62,
    "contatoComPublico": 72,
    "dependenciaDeProcesso": 74,
    "salaryBand": {
      "pleno": [
        3800,
        6900
      ],
      "senior": [
        6900,
        10500
      ]
    },
    "tarefasBase": [
      "gerenciar agenda de lideranca",
      "preparar reunioes",
      "acompanhar compromissos sensiveis",
      "filtrar prioridades"
    ],
    "riscosOrganizacionais": [
      "confidencialidade_alta",
      "pressao_de_lideranca"
    ],
    "necessidadesDeTreinamento": [
      "gestao de agenda",
      "comunicacao executiva"
    ],
    "interacoesFrequentes": [
      "diretor_geral",
      "coordenador_equipe"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "auxiliar_financeiro",
    "cboCodigo": null,
    "titulo": "Auxiliar financeiro",
    "familia": "Auxiliares de administracao financeira",
    "setorAfinidade": [
      "Financeiro",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 38,
    "autonomiaBase": 42,
    "complexidadeBase": 46,
    "contatoComPublico": 28,
    "dependenciaDeProcesso": 86,
    "salaryBand": {
      "junior": [
        1900,
        3300
      ],
      "pleno": [
        3300,
        5200
      ]
    },
    "tarefasBase": [
      "lançar contas a pagar",
      "conciliar comprovantes",
      "organizar notas fiscais",
      "apoiar cobrancas"
    ],
    "riscosOrganizacionais": [
      "erro_operacional_financeiro",
      "rotina_repetitiva"
    ],
    "necessidadesDeTreinamento": [
      "controle financeiro",
      "atencao a detalhes"
    ],
    "interacoesFrequentes": [
      "analista_financeiro",
      "assistente_administrativo"
    ],
    "pesoNaGeracao": 5
  },
  {
    "id": "controlador_custos",
    "cboCodigo": null,
    "titulo": "Controlador de custos",
    "familia": "Controle financeiro e custos",
    "setorAfinidade": [
      "Financeiro",
      "Operacoes"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 70,
    "autonomiaBase": 66,
    "complexidadeBase": 74,
    "contatoComPublico": 24,
    "dependenciaDeProcesso": 82,
    "salaryBand": {
      "pleno": [
        5200,
        8500
      ],
      "senior": [
        8500,
        13500
      ]
    },
    "tarefasBase": [
      "apurar custos por setor",
      "analisar margens",
      "identificar desvios",
      "preparar recomendacoes de corte"
    ],
    "riscosOrganizacionais": [
      "conflito_com_gestores",
      "corte_percebido_como_punitivo"
    ],
    "necessidadesDeTreinamento": [
      "custos gerenciais",
      "comunicacao de dados sensiveis"
    ],
    "interacoesFrequentes": [
      "gerente_financeiro",
      "gerente_operacoes"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "gerente_financeiro",
    "cboCodigo": null,
    "titulo": "Gerente financeiro",
    "familia": "Gestores financeiros",
    "setorAfinidade": [
      "Financeiro",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "lideranca"
    ],
    "nivelEspecializacaoBase": 78,
    "autonomiaBase": 82,
    "complexidadeBase": 82,
    "contatoComPublico": 36,
    "dependenciaDeProcesso": 78,
    "salaryBand": {
      "lideranca": [
        10500,
        19000
      ]
    },
    "tarefasBase": [
      "definir politica financeira",
      "negociar prioridades de caixa",
      "validar orcamento",
      "orientar equipe financeira"
    ],
    "riscosOrganizacionais": [
      "pressao_por_demissao",
      "curto_prazo_excessivo"
    ],
    "necessidadesDeTreinamento": [
      "planejamento financeiro",
      "negociacao com diretoria"
    ],
    "interacoesFrequentes": [
      "analista_financeiro",
      "controlador_custos",
      "diretor_geral"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "recrutador",
    "cboCodigo": null,
    "titulo": "Recrutador",
    "familia": "Atracao e selecao",
    "setorAfinidade": [
      "Recursos Humanos"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 52,
    "autonomiaBase": 58,
    "complexidadeBase": 56,
    "contatoComPublico": 86,
    "dependenciaDeProcesso": 64,
    "salaryBand": {
      "junior": [
        2600,
        4200
      ],
      "pleno": [
        4200,
        7200
      ],
      "senior": [
        7200,
        11000
      ]
    },
    "tarefasBase": [
      "divulgar vagas",
      "conduzir triagens",
      "alinhar perfil com liderancas",
      "acompanhar candidatos"
    ],
    "riscosOrganizacionais": [
      "vaga_urgente_cronica",
      "viés_em_selecao"
    ],
    "necessidadesDeTreinamento": [
      "entrevista estruturada",
      "alinhamento com gestor"
    ],
    "interacoesFrequentes": [
      "analista_rh",
      "business_partner_rh",
      "coordenador_equipe"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "business_partner_rh",
    "cboCodigo": null,
    "titulo": "Business partner de RH",
    "familia": "Recursos humanos estrategico",
    "setorAfinidade": [
      "Recursos Humanos",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 72,
    "autonomiaBase": 76,
    "complexidadeBase": 78,
    "contatoComPublico": 82,
    "dependenciaDeProcesso": 52,
    "salaryBand": {
      "pleno": [
        6500,
        10500
      ],
      "senior": [
        10500,
        16500
      ]
    },
    "tarefasBase": [
      "acompanhar indicadores de pessoas",
      "aconselhar liderancas",
      "desenhar intervencoes por setor",
      "conduzir rituais de escuta"
    ],
    "riscosOrganizacionais": [
      "ser_visto_como_rh_da_diretoria",
      "ambiguidade_de_papel"
    ],
    "necessidadesDeTreinamento": [
      "consultoria interna",
      "dados de pessoas",
      "facilitacao de conflito"
    ],
    "interacoesFrequentes": [
      "gerente_rh",
      "coordenador_equipe",
      "analista_rh"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "gerente_rh",
    "cboCodigo": null,
    "titulo": "Gerente de RH",
    "familia": "Gestores de recursos humanos",
    "setorAfinidade": [
      "Recursos Humanos",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "lideranca"
    ],
    "nivelEspecializacaoBase": 80,
    "autonomiaBase": 84,
    "complexidadeBase": 84,
    "contatoComPublico": 78,
    "dependenciaDeProcesso": 58,
    "salaryBand": {
      "lideranca": [
        11000,
        21000
      ]
    },
    "tarefasBase": [
      "definir estrategia de pessoas",
      "priorizar demandas de RH",
      "orientar equipe",
      "negociar politicas com diretoria"
    ],
    "riscosOrganizacionais": [
      "apagar_incendio_institucional",
      "promessa_de_cuidado_sem_recurso"
    ],
    "necessidadesDeTreinamento": [
      "governanca de pessoas",
      "compliance trabalhista",
      "gestao de crise"
    ],
    "interacoesFrequentes": [
      "analista_rh",
      "business_partner_rh",
      "diretor_geral"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "tecnico_seguranca_trabalho",
    "cboCodigo": null,
    "titulo": "Tecnico de seguranca do trabalho",
    "familia": "Seguranca e saude ocupacional",
    "setorAfinidade": [
      "Operacoes",
      "Recursos Humanos"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 74,
    "autonomiaBase": 70,
    "complexidadeBase": 76,
    "contatoComPublico": 48,
    "dependenciaDeProcesso": 88,
    "salaryBand": {
      "pleno": [
        4200,
        7600
      ],
      "senior": [
        7600,
        12000
      ]
    },
    "tarefasBase": [
      "inspecionar postos de trabalho",
      "registrar riscos",
      "orientar uso de EPI",
      "acompanhar incidentes"
    ],
    "riscosOrganizacionais": [
      "risco_subnotificado",
      "resistencia_operacional"
    ],
    "necessidadesDeTreinamento": [
      "investigacao de incidentes",
      "comunicacao preventiva"
    ],
    "interacoesFrequentes": [
      "lider_operacional",
      "gerente_operacoes",
      "analista_rh"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "analista_treinamento",
    "cboCodigo": null,
    "titulo": "Analista de treinamento",
    "familia": "Educacao corporativa",
    "setorAfinidade": [
      "Recursos Humanos",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 66,
    "autonomiaBase": 68,
    "complexidadeBase": 70,
    "contatoComPublico": 76,
    "dependenciaDeProcesso": 55,
    "salaryBand": {
      "pleno": [
        4800,
        7900
      ],
      "senior": [
        7900,
        12500
      ]
    },
    "tarefasBase": [
      "mapear necessidades de aprendizagem",
      "desenhar oficinas",
      "avaliar treinamentos",
      "acompanhar trilhas"
    ],
    "riscosOrganizacionais": [
      "treinamento_sem_tempo_real",
      "baixa_adesao"
    ],
    "necessidadesDeTreinamento": [
      "design instrucional",
      "facilitacao",
      "avaliacao de aprendizagem"
    ],
    "interacoesFrequentes": [
      "analista_rh",
      "coordenador_equipe"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "lider_operacional",
    "cboCodigo": null,
    "titulo": "Lider operacional",
    "familia": "Liderancas de operacao",
    "setorAfinidade": [
      "Operacoes",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "lideranca"
    ],
    "nivelEspecializacaoBase": 50,
    "autonomiaBase": 68,
    "complexidadeBase": 62,
    "contatoComPublico": 38,
    "dependenciaDeProcesso": 82,
    "salaryBand": {
      "lideranca": [
        4500,
        8500
      ]
    },
    "tarefasBase": [
      "organizar escala",
      "acompanhar produtividade",
      "corrigir desvios de processo",
      "apoiar equipe no turno"
    ],
    "riscosOrganizacionais": [
      "lideranca_promovida_sem_preparo",
      "conflito_de_turno"
    ],
    "necessidadesDeTreinamento": [
      "lideranca situacional",
      "seguranca operacional"
    ],
    "interacoesFrequentes": [
      "auxiliar_producao",
      "tecnico_manutencao",
      "gerente_operacoes"
    ],
    "pesoNaGeracao": 5
  },
  {
    "id": "inspetor_qualidade",
    "cboCodigo": null,
    "titulo": "Inspetor de qualidade",
    "familia": "Controle de qualidade",
    "setorAfinidade": [
      "Operacoes",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 52,
    "autonomiaBase": 55,
    "complexidadeBase": 60,
    "contatoComPublico": 22,
    "dependenciaDeProcesso": 90,
    "salaryBand": {
      "junior": [
        2400,
        3900
      ],
      "pleno": [
        3900,
        6200
      ],
      "senior": [
        6200,
        9800
      ]
    },
    "tarefasBase": [
      "verificar padroes de qualidade",
      "registrar nao conformidades",
      "orientar correcoes",
      "liberar lotes ou entregas"
    ],
    "riscosOrganizacionais": [
      "ser_visto_como_obstaculo",
      "conflito_prazo_qualidade"
    ],
    "necessidadesDeTreinamento": [
      "auditoria interna",
      "padronizacao"
    ],
    "interacoesFrequentes": [
      "auxiliar_producao",
      "lider_operacional"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "planejador_producao",
    "cboCodigo": null,
    "titulo": "Planejador de producao",
    "familia": "Planejamento e controle operacional",
    "setorAfinidade": [
      "Operacoes",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 66,
    "autonomiaBase": 65,
    "complexidadeBase": 72,
    "contatoComPublico": 26,
    "dependenciaDeProcesso": 84,
    "salaryBand": {
      "pleno": [
        5000,
        8200
      ],
      "senior": [
        8200,
        13000
      ]
    },
    "tarefasBase": [
      "planejar capacidade",
      "sequenciar demandas",
      "monitorar atrasos",
      "negociar prioridades"
    ],
    "riscosOrganizacionais": [
      "plano_irreal",
      "pressao_de_todos_os_setores"
    ],
    "necessidadesDeTreinamento": [
      "PCP",
      "planejamento de capacidade",
      "negociacao de prioridades"
    ],
    "interacoesFrequentes": [
      "lider_operacional",
      "analista_comercial",
      "gerente_operacoes"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "gerente_operacoes",
    "cboCodigo": null,
    "titulo": "Gerente de operacoes",
    "familia": "Gestores de operacoes",
    "setorAfinidade": [
      "Operacoes",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "lideranca"
    ],
    "nivelEspecializacaoBase": 76,
    "autonomiaBase": 84,
    "complexidadeBase": 84,
    "contatoComPublico": 44,
    "dependenciaDeProcesso": 70,
    "salaryBand": {
      "lideranca": [
        11000,
        22000
      ]
    },
    "tarefasBase": [
      "definir metas operacionais",
      "alocar recursos",
      "reduzir gargalos",
      "acompanhar indicadores de entrega"
    ],
    "riscosOrganizacionais": [
      "resultado_acima_de_cuidado",
      "apagao_de_prioridades"
    ],
    "necessidadesDeTreinamento": [
      "gestao por indicadores",
      "seguranca psicologica operacional"
    ],
    "interacoesFrequentes": [
      "lider_operacional",
      "planejador_producao",
      "diretor_geral"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "assistente_logistica",
    "cboCodigo": null,
    "titulo": "Assistente de logistica",
    "familia": "Apoio logistico",
    "setorAfinidade": [
      "Operacoes",
      "Administrativo",
      "Atendimento"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 40,
    "autonomiaBase": 44,
    "complexidadeBase": 46,
    "contatoComPublico": 45,
    "dependenciaDeProcesso": 82,
    "salaryBand": {
      "junior": [
        2100,
        3500
      ],
      "pleno": [
        3500,
        5600
      ]
    },
    "tarefasBase": [
      "agendar entregas",
      "acompanhar rotas",
      "registrar ocorrencias",
      "confirmar coletas"
    ],
    "riscosOrganizacionais": [
      "urgencia_constante",
      "culpa_por_atraso"
    ],
    "necessidadesDeTreinamento": [
      "controle de rota",
      "comunicacao com cliente"
    ],
    "interacoesFrequentes": [
      "analista_logistica",
      "atendente"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "analista_logistica",
    "cboCodigo": null,
    "titulo": "Analista de logistica",
    "familia": "Planejamento logistico",
    "setorAfinidade": [
      "Operacoes",
      "Atendimento"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 62,
    "autonomiaBase": 64,
    "complexidadeBase": 70,
    "contatoComPublico": 40,
    "dependenciaDeProcesso": 78,
    "salaryBand": {
      "pleno": [
        4500,
        7600
      ],
      "senior": [
        7600,
        11800
      ]
    },
    "tarefasBase": [
      "analisar rotas",
      "otimizar entregas",
      "acompanhar indicadores logisticos",
      "investigar atrasos"
    ],
    "riscosOrganizacionais": [
      "pressao_de_custo_e_prazo",
      "conflito_com_atendimento"
    ],
    "necessidadesDeTreinamento": [
      "analise operacional",
      "gestao de incidentes"
    ],
    "interacoesFrequentes": [
      "assistente_logistica",
      "gerente_operacoes"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "comprador",
    "cboCodigo": null,
    "titulo": "Comprador",
    "familia": "Compras e suprimentos",
    "setorAfinidade": [
      "Administrativo",
      "Financeiro",
      "Operacoes"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 62,
    "autonomiaBase": 66,
    "complexidadeBase": 68,
    "contatoComPublico": 42,
    "dependenciaDeProcesso": 76,
    "salaryBand": {
      "pleno": [
        4500,
        7600
      ],
      "senior": [
        7600,
        12000
      ]
    },
    "tarefasBase": [
      "negociar fornecedores",
      "comparar propostas",
      "emitir pedidos",
      "acompanhar prazos"
    ],
    "riscosOrganizacionais": [
      "fornecedor_critico",
      "conflito_de_prioridades"
    ],
    "necessidadesDeTreinamento": [
      "negociacao",
      "compliance em compras"
    ],
    "interacoesFrequentes": [
      "controlador_custos",
      "planejador_producao"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "analista_sucesso_cliente",
    "cboCodigo": null,
    "titulo": "Analista de sucesso do cliente",
    "familia": "Relacionamento e retencao",
    "setorAfinidade": [
      "Atendimento",
      "Comercial",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 54,
    "autonomiaBase": 62,
    "complexidadeBase": 62,
    "contatoComPublico": 88,
    "dependenciaDeProcesso": 56,
    "salaryBand": {
      "junior": [
        3000,
        4700
      ],
      "pleno": [
        4700,
        7800
      ],
      "senior": [
        7800,
        12000
      ]
    },
    "tarefasBase": [
      "acompanhar clientes ativos",
      "identificar risco de cancelamento",
      "orientar uso do servico",
      "levar feedback ao produto"
    ],
    "riscosOrganizacionais": [
      "absorver_frustracao_do_cliente",
      "promessa_comercial_herdada"
    ],
    "necessidadesDeTreinamento": [
      "gestao de carteira",
      "escuta consultiva"
    ],
    "interacoesFrequentes": [
      "atendente",
      "analista_produto",
      "vendedor_interno"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "ouvidor_interno",
    "cboCodigo": null,
    "titulo": "Ouvidor interno",
    "familia": "Ouvidoria e escuta institucional",
    "setorAfinidade": [
      "Atendimento",
      "Recursos Humanos",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 68,
    "autonomiaBase": 72,
    "complexidadeBase": 76,
    "contatoComPublico": 86,
    "dependenciaDeProcesso": 68,
    "salaryBand": {
      "pleno": [
        5200,
        8500
      ],
      "senior": [
        8500,
        13500
      ]
    },
    "tarefasBase": [
      "receber manifestacoes sensiveis",
      "registrar relatos",
      "encaminhar apuracoes",
      "acompanhar devolutivas"
    ],
    "riscosOrganizacionais": [
      "exposicao_a_relatos_dificeis",
      "risco_de_revitimizacao_institucional"
    ],
    "necessidadesDeTreinamento": [
      "escuta qualificada",
      "fluxo de denuncia",
      "registro imparcial"
    ],
    "interacoesFrequentes": [
      "analista_rh",
      "gerente_rh",
      "compliance_officer"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "compliance_officer",
    "cboCodigo": null,
    "titulo": "Analista de compliance",
    "familia": "Compliance e governanca",
    "setorAfinidade": [
      "Administrativo",
      "Recursos Humanos",
      "Financeiro"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 76,
    "autonomiaBase": 72,
    "complexidadeBase": 78,
    "contatoComPublico": 50,
    "dependenciaDeProcesso": 88,
    "salaryBand": {
      "pleno": [
        6200,
        9800
      ],
      "senior": [
        9800,
        15500
      ]
    },
    "tarefasBase": [
      "mapear riscos de conduta",
      "acompanhar politicas internas",
      "apoiar apuracoes",
      "preparar treinamentos de integridade"
    ],
    "riscosOrganizacionais": [
      "pressao_para_abafar_caso",
      "politica_sem_pratica"
    ],
    "necessidadesDeTreinamento": [
      "governanca",
      "investigacao interna sobria",
      "comunicacao etica"
    ],
    "interacoesFrequentes": [
      "ouvidor_interno",
      "gerente_rh",
      "diretor_geral"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "assistente_juridico",
    "cboCodigo": null,
    "titulo": "Assistente juridico",
    "familia": "Apoio juridico e administrativo",
    "setorAfinidade": [
      "Administrativo",
      "Recursos Humanos"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 50,
    "autonomiaBase": 48,
    "complexidadeBase": 56,
    "contatoComPublico": 34,
    "dependenciaDeProcesso": 90,
    "salaryBand": {
      "junior": [
        2500,
        3900
      ],
      "pleno": [
        3900,
        6200
      ]
    },
    "tarefasBase": [
      "organizar contratos",
      "controlar prazos",
      "apoiar respostas formais",
      "arquivar documentos juridicos"
    ],
    "riscosOrganizacionais": [
      "prazo_sensivel",
      "linguagem_tecnica_distante"
    ],
    "necessidadesDeTreinamento": [
      "controle de prazos",
      "documentacao"
    ],
    "interacoesFrequentes": [
      "compliance_officer",
      "gerente_rh"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "desenvolvedor_sistemas",
    "cboCodigo": null,
    "titulo": "Desenvolvedor de sistemas",
    "familia": "Tecnologia e produto digital",
    "setorAfinidade": [
      "Produto/Servico",
      "Operacoes"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 72,
    "autonomiaBase": 74,
    "complexidadeBase": 78,
    "contatoComPublico": 20,
    "dependenciaDeProcesso": 42,
    "salaryBand": {
      "junior": [
        4200,
        6800
      ],
      "pleno": [
        6800,
        11500
      ],
      "senior": [
        11500,
        18000
      ]
    },
    "tarefasBase": [
      "implementar funcionalidades",
      "corrigir falhas",
      "revisar codigo",
      "documentar solucoes"
    ],
    "riscosOrganizacionais": [
      "urgencia_sem_requisito",
      "isolamento_tecnico"
    ],
    "necessidadesDeTreinamento": [
      "boas praticas de codigo",
      "comunicacao tecnica"
    ],
    "interacoesFrequentes": [
      "analista_produto",
      "designer_servico",
      "suporte_tecnico"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "suporte_tecnico",
    "cboCodigo": null,
    "titulo": "Suporte tecnico",
    "familia": "Suporte a usuarios e tecnologia",
    "setorAfinidade": [
      "Atendimento",
      "Produto/Servico",
      "Operacoes"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 54,
    "autonomiaBase": 58,
    "complexidadeBase": 60,
    "contatoComPublico": 80,
    "dependenciaDeProcesso": 68,
    "salaryBand": {
      "junior": [
        2800,
        4500
      ],
      "pleno": [
        4500,
        7400
      ],
      "senior": [
        7400,
        11000
      ]
    },
    "tarefasBase": [
      "resolver incidentes",
      "orientar usuarios",
      "registrar chamados tecnicos",
      "escalar problemas recorrentes"
    ],
    "riscosOrganizacionais": [
      "fila_de_chamados",
      "usuario_irritado"
    ],
    "necessidadesDeTreinamento": [
      "diagnostico tecnico",
      "comunicacao didatica"
    ],
    "interacoesFrequentes": [
      "atendente",
      "desenvolvedor_sistemas"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "analista_dados",
    "cboCodigo": null,
    "titulo": "Analista de dados",
    "familia": "Dados e inteligencia de negocio",
    "setorAfinidade": [
      "Produto/Servico",
      "Financeiro",
      "Comercial"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 74,
    "autonomiaBase": 72,
    "complexidadeBase": 78,
    "contatoComPublico": 32,
    "dependenciaDeProcesso": 58,
    "salaryBand": {
      "pleno": [
        6500,
        10500
      ],
      "senior": [
        10500,
        16500
      ]
    },
    "tarefasBase": [
      "construir indicadores",
      "analisar bases",
      "preparar dashboards",
      "traduzir dados em decisoes"
    ],
    "riscosOrganizacionais": [
      "dado_sem_contexto",
      "dashboard_vira_cobranca"
    ],
    "necessidadesDeTreinamento": [
      "modelagem de dados",
      "storytelling com dados"
    ],
    "interacoesFrequentes": [
      "analista_financeiro",
      "analista_comercial",
      "diretor_geral"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "designer_servico",
    "cboCodigo": null,
    "titulo": "Designer de servico",
    "familia": "Design de servicos e experiencia",
    "setorAfinidade": [
      "Produto/Servico",
      "Atendimento"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 68,
    "autonomiaBase": 70,
    "complexidadeBase": 74,
    "contatoComPublico": 58,
    "dependenciaDeProcesso": 50,
    "salaryBand": {
      "pleno": [
        5800,
        9200
      ],
      "senior": [
        9200,
        14500
      ]
    },
    "tarefasBase": [
      "mapear jornadas",
      "conduzir pesquisas",
      "prototipar melhorias",
      "facilitar oficinas"
    ],
    "riscosOrganizacionais": [
      "pesquisa_ignorada",
      "conflito_com_prazo"
    ],
    "necessidadesDeTreinamento": [
      "pesquisa com usuarios",
      "facilitacao visual"
    ],
    "interacoesFrequentes": [
      "analista_produto",
      "analista_sucesso_cliente"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "analista_marketing",
    "cboCodigo": null,
    "titulo": "Analista de marketing",
    "familia": "Marketing e comunicacao",
    "setorAfinidade": [
      "Comercial",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 52,
    "autonomiaBase": 58,
    "complexidadeBase": 58,
    "contatoComPublico": 48,
    "dependenciaDeProcesso": 54,
    "salaryBand": {
      "junior": [
        2800,
        4500
      ],
      "pleno": [
        4500,
        7600
      ],
      "senior": [
        7600,
        11800
      ]
    },
    "tarefasBase": [
      "planejar campanhas",
      "acompanhar metricas",
      "produzir briefs",
      "alinhar comunicacao com vendas"
    ],
    "riscosOrganizacionais": [
      "campanha_urgente",
      "resultado_dificil_de_atribuir"
    ],
    "necessidadesDeTreinamento": [
      "metricas de marketing",
      "briefing"
    ],
    "interacoesFrequentes": [
      "analista_comercial",
      "designer_servico"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "social_media",
    "cboCodigo": null,
    "titulo": "Social media",
    "familia": "Comunicacao digital",
    "setorAfinidade": [
      "Comercial",
      "Atendimento",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 42,
    "autonomiaBase": 52,
    "complexidadeBase": 50,
    "contatoComPublico": 62,
    "dependenciaDeProcesso": 48,
    "salaryBand": {
      "junior": [
        2200,
        3600
      ],
      "pleno": [
        3600,
        5800
      ]
    },
    "tarefasBase": [
      "publicar conteudos",
      "responder interacoes",
      "monitorar reputacao",
      "produzir relatorios simples"
    ],
    "riscosOrganizacionais": [
      "exposicao_publica",
      "urgencia_fora_de_horario"
    ],
    "necessidadesDeTreinamento": [
      "gestao de comunidade",
      "planejamento editorial"
    ],
    "interacoesFrequentes": [
      "analista_marketing",
      "atendente"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "coordenador_marketing",
    "cboCodigo": null,
    "titulo": "Coordenador de marketing",
    "familia": "Liderancas de marketing",
    "setorAfinidade": [
      "Comercial",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "lideranca"
    ],
    "nivelEspecializacaoBase": 64,
    "autonomiaBase": 76,
    "complexidadeBase": 72,
    "contatoComPublico": 52,
    "dependenciaDeProcesso": 50,
    "salaryBand": {
      "lideranca": [
        7600,
        14000
      ]
    },
    "tarefasBase": [
      "definir calendario de campanhas",
      "priorizar demandas criativas",
      "alinhar marketing e vendas",
      "acompanhar resultados"
    ],
    "riscosOrganizacionais": [
      "criatividade_sob_cobranca",
      "conflito_com_comercial"
    ],
    "necessidadesDeTreinamento": [
      "gestao de campanha",
      "feedback criativo"
    ],
    "interacoesFrequentes": [
      "analista_marketing",
      "analista_comercial"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "consultor_implantacao",
    "cboCodigo": null,
    "titulo": "Consultor de implantacao",
    "familia": "Implantacao de servicos",
    "setorAfinidade": [
      "Produto/Servico",
      "Atendimento",
      "Operacoes"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 70,
    "autonomiaBase": 72,
    "complexidadeBase": 74,
    "contatoComPublico": 80,
    "dependenciaDeProcesso": 60,
    "salaryBand": {
      "pleno": [
        5800,
        9200
      ],
      "senior": [
        9200,
        14500
      ]
    },
    "tarefasBase": [
      "conduzir implantacoes",
      "treinar clientes",
      "mapear riscos de go-live",
      "acompanhar primeiras entregas"
    ],
    "riscosOrganizacionais": [
      "viagem_constante",
      "cliente_ansioso"
    ],
    "necessidadesDeTreinamento": [
      "gestao de projeto",
      "treinamento de usuario"
    ],
    "interacoesFrequentes": [
      "analista_sucesso_cliente",
      "analista_produto"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "gerente_projetos",
    "cboCodigo": null,
    "titulo": "Gerente de projetos",
    "familia": "Gestao de projetos",
    "setorAfinidade": [
      "Produto/Servico",
      "Operacoes",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior",
      "lideranca"
    ],
    "nivelEspecializacaoBase": 72,
    "autonomiaBase": 78,
    "complexidadeBase": 80,
    "contatoComPublico": 60,
    "dependenciaDeProcesso": 66,
    "salaryBand": {
      "pleno": [
        7500,
        11500
      ],
      "senior": [
        11500,
        16500
      ],
      "lideranca": [
        13500,
        21000
      ]
    },
    "tarefasBase": [
      "organizar cronogramas",
      "negociar escopo",
      "monitorar riscos",
      "conduzir rituais de projeto"
    ],
    "riscosOrganizacionais": [
      "culpa_por_atraso_sistemico",
      "escopo_elastico"
    ],
    "necessidadesDeTreinamento": [
      "gestao de riscos",
      "comunicacao com stakeholders"
    ],
    "interacoesFrequentes": [
      "analista_produto",
      "coordenador_equipe",
      "diretor_geral"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "instrutor_treinamento",
    "cboCodigo": null,
    "titulo": "Instrutor de treinamento",
    "familia": "Educacao e capacitacao",
    "setorAfinidade": [
      "Produto/Servico",
      "Recursos Humanos",
      "Atendimento"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 56,
    "autonomiaBase": 62,
    "complexidadeBase": 60,
    "contatoComPublico": 88,
    "dependenciaDeProcesso": 48,
    "salaryBand": {
      "junior": [
        2800,
        4500
      ],
      "pleno": [
        4500,
        7200
      ],
      "senior": [
        7200,
        11000
      ]
    },
    "tarefasBase": [
      "ministrar treinamentos",
      "adaptar materiais",
      "avaliar participacao",
      "dar devolutivas"
    ],
    "riscosOrganizacionais": [
      "energia_social_alta",
      "treinamento_visto_como_perfume"
    ],
    "necessidadesDeTreinamento": [
      "facilitacao",
      "didatica"
    ],
    "interacoesFrequentes": [
      "analista_treinamento",
      "consultor_implantacao"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "pesquisador_mercado",
    "cboCodigo": null,
    "titulo": "Pesquisador de mercado",
    "familia": "Pesquisa e inteligencia",
    "setorAfinidade": [
      "Comercial",
      "Produto/Servico"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 68,
    "autonomiaBase": 66,
    "complexidadeBase": 74,
    "contatoComPublico": 42,
    "dependenciaDeProcesso": 54,
    "salaryBand": {
      "pleno": [
        5200,
        8500
      ],
      "senior": [
        8500,
        13200
      ]
    },
    "tarefasBase": [
      "conduzir entrevistas",
      "analisar concorrencia",
      "preparar relatorios de oportunidade",
      "sintetizar achados"
    ],
    "riscosOrganizacionais": [
      "pesquisa_virar_confirmacao_de_opiniao",
      "prazo_curto_para_incerteza"
    ],
    "necessidadesDeTreinamento": [
      "pesquisa qualitativa",
      "analise de mercado"
    ],
    "interacoesFrequentes": [
      "analista_marketing",
      "analista_produto"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "auxiliar_limpeza",
    "cboCodigo": null,
    "titulo": "Auxiliar de limpeza",
    "familia": "Servicos de apoio",
    "setorAfinidade": [
      "Operacoes",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 24,
    "autonomiaBase": 30,
    "complexidadeBase": 28,
    "contatoComPublico": 20,
    "dependenciaDeProcesso": 82,
    "salaryBand": {
      "junior": [
        1500,
        2300
      ],
      "pleno": [
        2300,
        3400
      ]
    },
    "tarefasBase": [
      "higienizar ambientes",
      "repor materiais",
      "registrar necessidades de manutencao",
      "organizar areas comuns"
    ],
    "riscosOrganizacionais": [
      "invisibilidade_do_trabalho",
      "escala_pesada"
    ],
    "necessidadesDeTreinamento": [
      "seguranca no trabalho",
      "comunicacao de ocorrencias"
    ],
    "interacoesFrequentes": [
      "lider_operacional",
      "assistente_administrativo"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "porteiro_controlador_acesso",
    "cboCodigo": null,
    "titulo": "Porteiro / controlador de acesso",
    "familia": "Controle de acesso e apoio operacional",
    "setorAfinidade": [
      "Operacoes",
      "Atendimento"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno"
    ],
    "nivelEspecializacaoBase": 34,
    "autonomiaBase": 42,
    "complexidadeBase": 38,
    "contatoComPublico": 72,
    "dependenciaDeProcesso": 84,
    "salaryBand": {
      "junior": [
        1700,
        2800
      ],
      "pleno": [
        2800,
        4200
      ]
    },
    "tarefasBase": [
      "controlar entrada e saida",
      "orientar visitantes",
      "registrar ocorrencias",
      "comunicar situacoes incomuns"
    ],
    "riscosOrganizacionais": [
      "trabalho_isolado",
      "conflito_com_visitantes"
    ],
    "necessidadesDeTreinamento": [
      "protocolo de acesso",
      "comunicacao em conflito"
    ],
    "interacoesFrequentes": [
      "recepcionista",
      "lider_operacional"
    ],
    "pesoNaGeracao": 3
  },
  {
    "id": "motorista_entregador",
    "cboCodigo": null,
    "titulo": "Motorista entregador",
    "familia": "Transporte e entregas",
    "setorAfinidade": [
      "Operacoes",
      "Atendimento"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 38,
    "autonomiaBase": 54,
    "complexidadeBase": 48,
    "contatoComPublico": 55,
    "dependenciaDeProcesso": 78,
    "salaryBand": {
      "junior": [
        2200,
        3600
      ],
      "pleno": [
        3600,
        5600
      ],
      "senior": [
        5600,
        8200
      ]
    },
    "tarefasBase": [
      "realizar entregas",
      "registrar rotas",
      "conferir volumes",
      "comunicar atrasos"
    ],
    "riscosOrganizacionais": [
      "pressao_de_transito",
      "culpabilizacao_por_atraso"
    ],
    "necessidadesDeTreinamento": [
      "seguranca no transito",
      "atendimento em campo"
    ],
    "interacoesFrequentes": [
      "assistente_logistica",
      "analista_logistica"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "estoquista",
    "cboCodigo": null,
    "titulo": "Estoquista",
    "familia": "Estoque e almoxarifado",
    "setorAfinidade": [
      "Operacoes",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "junior",
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 36,
    "autonomiaBase": 46,
    "complexidadeBase": 44,
    "contatoComPublico": 18,
    "dependenciaDeProcesso": 88,
    "salaryBand": {
      "junior": [
        1800,
        3000
      ],
      "pleno": [
        3000,
        4800
      ],
      "senior": [
        4800,
        7200
      ]
    },
    "tarefasBase": [
      "receber mercadorias",
      "organizar estoque",
      "controlar entradas e saidas",
      "apontar divergencias"
    ],
    "riscosOrganizacionais": [
      "erro_de_contagem",
      "pressa_no_fechamento"
    ],
    "necessidadesDeTreinamento": [
      "inventario",
      "organizacao visual"
    ],
    "interacoesFrequentes": [
      "comprador",
      "assistente_logistica"
    ],
    "pesoNaGeracao": 4
  },
  {
    "id": "analista_controladoria",
    "cboCodigo": null,
    "titulo": "Analista de controladoria",
    "familia": "Controladoria e planejamento",
    "setorAfinidade": [
      "Financeiro",
      "Administrativo"
    ],
    "senioridadesPossiveis": [
      "pleno",
      "senior"
    ],
    "nivelEspecializacaoBase": 74,
    "autonomiaBase": 70,
    "complexidadeBase": 80,
    "contatoComPublico": 24,
    "dependenciaDeProcesso": 82,
    "salaryBand": {
      "pleno": [
        6500,
        10500
      ],
      "senior": [
        10500,
        16500
      ]
    },
    "tarefasBase": [
      "consolidar resultados",
      "analisar orcamento",
      "preparar previsoes",
      "apoiar decisao da diretoria"
    ],
    "riscosOrganizacionais": [
      "dado_vira_cobranca",
      "fechamento_estendido"
    ],
    "necessidadesDeTreinamento": [
      "orcamento empresarial",
      "analise gerencial"
    ],
    "interacoesFrequentes": [
      "gerente_financeiro",
      "analista_dados"
    ],
    "pesoNaGeracao": 2
  },
  {
    "id": "diretor_geral",
    "cboCodigo": null,
    "titulo": "Diretor geral",
    "familia": "Direcao executiva",
    "setorAfinidade": [
      "Administrativo",
      "Financeiro",
      "Comercial",
      "Operacoes",
      "Recursos Humanos"
    ],
    "senioridadesPossiveis": [
      "lideranca"
    ],
    "nivelEspecializacaoBase": 86,
    "autonomiaBase": 92,
    "complexidadeBase": 88,
    "contatoComPublico": 70,
    "dependenciaDeProcesso": 44,
    "salaryBand": {
      "lideranca": [
        18000,
        35000
      ]
    },
    "tarefasBase": [
      "definir prioridades estrategicas",
      "tomar decisoes criticas",
      "representar a empresa",
      "arbitrar conflitos entre areas"
    ],
    "riscosOrganizacionais": [
      "distancia_do_chao",
      "pressao_por_resultado_curto"
    ],
    "necessidadesDeTreinamento": [
      "governanca",
      "comunicacao estrategica",
      "decisao baseada em dados"
    ],
    "interacoesFrequentes": [
      "gerente_rh",
      "gerente_financeiro",
      "gerente_operacoes"
    ],
    "pesoNaGeracao": 1
  }
];

module.exports = {
  OCCUPATION_CATALOG,
};
