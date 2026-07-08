/**
 * Modulo: entryExitSimulation
 * Responsabilidade: simular entradas raras e apoiar consequencias funcionais de saidas.
 * Entrada: state da engine
 * Saida: novos funcionarios, relacoes, eventos e memorias de onboarding
 * Nao deve: criar acoes do RH, campanha, objetivos ou UI jogavel.
 */

const { clampPercent } = require("../core/clamp");
const { FIRST_NAMES, LAST_NAMES } = require("../data/nomes");
const { OCCUPATION_CATALOG } = require("../data/occupationCatalog");
const { createOrganizationEvent } = require("./eventLog");
const { generateMemoryForEmployee, generateMemoriesFromEvent } = require("./memoryInterpretation");
const {
  createCargoFormal,
  createFunctionAssignmentsFromTasks,
  recalculateFunctionalMetrics,
} = require("./functionLoadSimulation");

function simulateEntryExitOneDay(state) {
  if (state.calendar.totalDiasSimulados <= 0) return [];
  if (state.calendar.totalDiasSimulados % 30 !== 8) return [];

  const entries = [];
  const target = state.company.employeeTarget || state.employees.length;
  const activeCount = activeEmployees(state).length;
  const overloadedSectors = state.sectors.filter((sector) => sector.cargaTrabalho > 72);
  const recentExitPressure = (state.company.desligamentosRecentes || []).length > 0;
  const belowTarget = activeCount < target;

  if (!belowTarget && !recentExitPressure && !overloadedSectors.length) return entries;

  const baseChance = belowTarget ? 42 : recentExitPressure ? 24 : 12;
  const financePenalty = state.company.estabilidadeFinanceira < 38 ? -18 : 0;
  if (!state.rng.chance(clampPercent(baseChance + financePenalty))) return entries;

  const sector = chooseEntrySector(state, overloadedSectors);
  if (!sector) return entries;

  const employee = createEmployeeForEntry(state, sector);
  state.employees.push(employee);
  sector.funcionariosIds.push(employee.id);
  state.economy.folhaPagamentoMensal += employee.salarioMensal;
  state.company.funcionarios = state.employees.map((item) => item.id);

  const createdRelations = createInitialRelationsForEntry(state, employee, sector);
  state.company.relacoes = state.relationships.map((relationship) => relationship.id);
  const onboardingPeer = chooseOnboardingPeer(state, employee, sector);
  if (onboardingPeer) {
    onboardingPeer.sobrecarga = clampPercent(onboardingPeer.sobrecarga + 4);
    onboardingPeer.funcoesReais.push(createOnboardingFunction(state, onboardingPeer, employee, sector));
    onboardingPeer.tarefasReais = [...new Set([...onboardingPeer.tarefasReais, "apoiar onboarding de novo funcionario"])];
    recalculateFunctionalMetrics(onboardingPeer);
  }

  const event = createOrganizationEvent(state, {
    tipo: "novo_funcionario",
    descricao: `${employee.nome} entrou em ${sector.nome}`,
    setorId: sector.id,
    funcionariosEnvolvidos: [employee.id, ...(onboardingPeer ? [onboardingPeer.id] : [])],
    severidade: 42,
    origem: "entrada_saida",
    dados: { salarioMensal: employee.salarioMensal, relacoesCriadas: createdRelations.length },
    visivelParaRH: true,
    tags: ["entrada", "onboarding"],
  });

  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: "novo_funcionario" },
    valencia: "ambivalente",
    allowInactive: true,
    customImpact: {
      impactoInicial: { vinculoOrganizacional: 2, medo: 2 },
      impactoResidual: { vinculoOrganizacional: 0.04 },
    },
  });

  if (onboardingPeer) {
    generateMemoryForEmployee(state, onboardingPeer, event, {
      rolesByEmployeeId: { [onboardingPeer.id]: "afetado_direto" },
      customImpact: {
        impactoInicial: { sobrecarga: 3, satisfacao: -1 },
        impactoResidual: { sobrecarga: 0.05 },
      },
    });
  }

  generateMemoriesFromEvent(state, event, {
    memoryTargets: state.employees
      .filter((item) => item.status !== "desligado" && item.setorId === sector.id && item.id !== employee.id)
      .slice(0, 3)
      .map((item) => item.id),
  });

  entries.push(employee);
  return entries;
}

function chooseEntrySector(state, overloadedSectors) {
  if (overloadedSectors.length) {
    return overloadedSectors.slice().sort((left, right) => right.cargaTrabalho - left.cargaTrabalho)[0];
  }

  return state.sectors
    .slice()
    .sort((left, right) => {
      const leftActive = activeEmployees(state).filter((employee) => employee.setorId === left.id).length;
      const rightActive = activeEmployees(state).filter((employee) => employee.setorId === right.id).length;
      return leftActive - rightActive;
    })[0];
}

function createEmployeeForEntry(state, sector) {
  const occupation = chooseOccupationForSector(state, sector);
  const nonLeadershipSeniorities = occupation.senioridadesPossiveis.filter((item) => item !== "lideranca");
  const seniority = state.rng.pick(nonLeadershipSeniorities.length ? nonLeadershipSeniorities : occupation.senioridadesPossiveis);
  const name = buildUniqueName(state);
  const expectedTasks = [...occupation.tarefasBase];
  const realTasks = [...expectedTasks, "aprender rotinas internas"];
  const qualification = clampPercent(occupation.nivelEspecializacaoBase + state.rng.int(-10, 14));
  const overload = clampPercent(sector.cargaTrabalho * 0.55 + 18);
  const trust = clampPercent(state.company.capacidadeRH * 0.45 + state.company.maturidadeGestao * 0.25 + state.rng.int(-8, 10));
  const satisfaction = clampPercent(62 + state.company.culturaCuidado * 0.15 + state.rng.int(-8, 10));
  const perceivedJustice = clampPercent(state.company.justicaOrganizacionalMedia + state.rng.int(-10, 12));
  const perceivedSupport = clampPercent(state.company.suporteOrganizacionalMedio + state.rng.int(-10, 12));
  const organizationalBond = clampPercent(42 + state.rng.int(0, 20));
  const externalEmployability = clampPercent(qualification * 0.5 + state.rng.int(6, 18));
  const intentionToLeave = clampPercent(35 + overload * 0.08 - satisfaction * 0.15 + externalEmployability * 0.08);

  const employee = {
    id: state.idFactory.nextId("employee"),
    nome: name,
    idade: state.rng.int(20, 58),
    setorId: sector.id,
    cargoFormal: createCargoFormal(occupation, seniority, sector.id),
    cboCodigo: occupation.cboCodigo,
    ocupacaoBaseId: occupation.id,
    senioridade: seniority,
    salarioMensal: salaryForOccupation(occupation, seniority, state.company, state.rng),
    tempoDeEmpresa: 0,
    produtividade: clampPercent(qualification * 0.5 + state.rng.int(14, 26)),
    satisfacao: satisfaction,
    qualificacao: qualification,
    afetividade: clampPercent(state.rng.int(28, 85) + (state.company.culturaCuidado - 50) * 0.1),
    autonomia: clampPercent(occupation.autonomiaBase + state.rng.int(-10, 12)),
    confiancaNaGestao: trust,
    confiancaNoRH: clampPercent(state.company.capacidadeRH * 0.55 + state.rng.int(-8, 10)),
    medo: clampPercent(42 + (100 - state.company.estabilidadeFinanceira) * 0.22),
    sobrecarga: overload,
    ambicao: clampPercent(state.rng.int(25, 88)),
    aberturaParaMudanca: clampPercent(state.rng.int(42, 88)),
    estabilidadeEmocional: clampPercent(state.rng.int(30, 86)),
    influenciaInformal: clampPercent(24 + state.rng.int(0, 22)),
    especializacao: clampPercent(occupation.nivelEspecializacaoBase + state.rng.int(-8, 14)),
    intencaoSaida: intentionToLeave,
    comprometimentoOrganizacional: clampPercent(satisfaction * 0.35 + trust * 0.25 + organizationalBond * 0.25),
    suportePercebido: perceivedSupport,
    justicaPercebida: perceivedJustice,
    vinculoOrganizacional: organizationalBond,
    empregabilidadeExterna: externalEmployability,
    salarioPercebidoMercado: clampPercent(55 + state.rng.int(-18, 16)),
    perspectivaCrescimento: clampPercent(48 + state.rng.int(-10, 18)),
    estadoDeBuscaExterna: false,
    propostaExternaRecebida: false,
    demandasPendentes: [],
    absenteismo: 0,
    eventosRecentes: [],
    status: "ativo",
    diasDesdeUltimaAcao: 99,
    tarefasPrevistas: expectedTasks,
    tarefasReais: realTasks,
    funcoesPrevistas: createFunctionAssignmentsFromTasks(expectedTasks, occupation, sector, state.idFactory, {
      origin: "cargo_formal",
      expectedTasks,
      baseWeeklyLoad: 6,
    }),
    funcoesReais: createFunctionAssignmentsFromTasks(realTasks, occupation, sector, state.idFactory, {
      origin: "entrada",
      expectedTasks,
      extraTasks: ["aprender rotinas internas"],
      baseWeeklyLoad: 6,
      visibilityDelta: 6,
      recognitionDelta: -2,
    }),
    desvioDeFuncao: 0,
    acumuloDeFuncao: 0,
    riscoDeSaida: intentionToLeave,
    relacoesIds: [],
    memorias: [],
    historicoDiario: [],
    dadosVisiveis: {},
    dadosOcultos: {
      toleranciaPressao: clampPercent(state.rng.int(25, 85)),
    },
  };

  recalculateFunctionalMetrics(employee);
  return employee;
}

function createInitialRelationsForEntry(state, employee, sector) {
  const peers = activeEmployees(state)
    .filter((peer) => peer.setorId === sector.id && peer.id !== employee.id)
    .sort((left, right) => right.influenciaInformal - left.influenciaInformal)
    .slice(0, 4);

  return peers.map((peer) => {
    const relationship = {
      id: state.idFactory.nextId("relation"),
      fromEmployeeId: employee.id,
      toEmployeeId: peer.id,
      proximidadeTrabalho: clampPercent(42 + state.rng.int(0, 28)),
      afinidade: clampPercent((employee.afetividade + peer.afetividade) / 2 + state.rng.int(-12, 12)),
      confianca: clampPercent(42 + state.company.maturidadeGestao * 0.2 + state.rng.int(-8, 14)),
      conflito: clampPercent(24 + (employee.sobrecarga + peer.sobrecarga) * 0.12 + state.rng.int(-8, 12)),
      dependenciaTecnica: clampPercent((peer.especializacao + employee.especializacao) * 0.22 + state.rng.int(0, 16)),
      historico: ["relacao criada na entrada de novo funcionario"],
      ativa: true,
      visivelParaRH: true,
    };
    state.relationships.push(relationship);
    employee.relacoesIds.push(relationship.id);
    peer.relacoesIds.push(relationship.id);
    return relationship;
  });
}

function createOnboardingFunction(state, owner, newEmployee, sector) {
  return {
    id: state.idFactory.nextId("function_assignment"),
    nome: "apoiar onboarding de novo funcionario",
    tipo: "onboarding",
    areaResponsavel: sector.nome,
    complexidade: 45,
    cargaSemanal: 4,
    aderenciaAoCargo: 58,
    criticidade: 55,
    visibilidade: 62,
    reconhecimento: 42,
    origem: `onboarding:${newEmployee.id}`,
  };
}

function chooseOnboardingPeer(state, employee, sector) {
  return activeEmployees(state)
    .filter((peer) => peer.setorId === sector.id && peer.id !== employee.id)
    .sort((left, right) => right.qualificacao + right.vinculoOrganizacional - (left.qualificacao + left.vinculoOrganizacional))[0];
}

function chooseOccupationForSector(state, sector) {
  const compatible = OCCUPATION_CATALOG.filter((occupation) => occupation.setorAfinidade.includes(sector.nome));
  const pool = compatible.length ? compatible : OCCUPATION_CATALOG;
  return state.rng.pick(pool);
}

function buildUniqueName(state) {
  const used = new Set(state.employees.map((employee) => employee.nome));
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const name = `${state.rng.pick(FIRST_NAMES)} ${state.rng.pick(LAST_NAMES)}`;
    if (!used.has(name)) return name;
  }
  return `${state.rng.pick(FIRST_NAMES)} ${state.rng.pick(LAST_NAMES)} ${state.employees.length + 1}`;
}

function salaryForOccupation(occupation, seniority, company, rng) {
  const band = occupation.salaryBand[seniority] || occupation.salaryBand.pleno || occupation.salaryBand.junior;
  const sizeFactor = company.tamanho === "pequena" ? 0.92 : company.tamanho === "media" ? 1 : 1.12;
  return Math.round(rng.int(band[0], band[1]) * sizeFactor);
}

function activeEmployees(state) {
  return state.employees.filter((employee) => employee.status !== "desligado");
}

module.exports = {
  simulateEntryExitOneDay,
};
