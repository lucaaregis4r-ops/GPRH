/**
 * Modulo: employeeGenerator
 * Responsabilidade: gerar funcionarios iniciais compativeis com empresa, setores e ocupacoes.
 * Entrada: company, sectors, rng, idFactory
 * Saida: array de employees
 * Nao deve: fechar mes financeiro, renderizar UI ou criar relacoes.
 */

const { clampPercent } = require("../core/clamp");
const { FIRST_NAMES, LAST_NAMES } = require("../data/nomes");
const { OCCUPATION_CATALOG } = require("../data/occupationCatalog");
const {
  createCargoFormal,
  createFunctionAssignmentsFromTasks,
  recalculateFunctionalMetrics,
} = require("../simulation/functionLoadSimulation");

const SENIORITY_MULTIPLIER = {
  junior: 0.9,
  pleno: 1,
  senior: 1.22,
  lideranca: 1.45,
};

const EDUCATION_LEVELS = [
  { nivel: "ensino_medio", pesoMercado: 25 },
  { nivel: "tecnico", pesoMercado: 42 },
  { nivel: "superior_incompleto", pesoMercado: 52 },
  { nivel: "superior_completo", pesoMercado: 68 },
  { nivel: "pos_graduacao", pesoMercado: 82 },
];

function occupationsForSector(sector) {
  const compatible = OCCUPATION_CATALOG.filter((occupation) => occupation.setorAfinidade.includes(sector.nome));
  return compatible.length ? compatible : OCCUPATION_CATALOG;
}

function selectOccupationForSector(sector, company, rng) {
  const compatible = occupationsForSector(sector).map((occupation) => ({
    ...occupation,
    weight: occupation.setorAfinidade.includes(sector.nome) ? 8 : 1,
  }));

  if (sector.liderancaFormalId === null && rng.chance(18)) {
    const leaders = compatible.filter((occupation) => occupation.senioridadesPossiveis.includes("lideranca"));
    if (leaders.length) return rng.pick(leaders);
  }

  return rng.weightedChoice(compatible);
}

function buildName(rng, usedNames) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const fullName = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    if (!usedNames.has(fullName)) {
      usedNames.add(fullName);
      return fullName;
    }
  }
  const fallback = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${usedNames.size + 1}`;
  usedNames.add(fallback);
  return fallback;
}

function salaryForOccupation(occupation, seniority, company, rng) {
  const band = occupation.salaryBand[seniority] || occupation.salaryBand.pleno || occupation.salaryBand.junior;
  const sizeFactor = company.tamanho === "pequena" ? 0.92 : company.tamanho === "media" ? 1 : 1.12;
  return Math.round(rng.int(band[0], band[1]) * sizeFactor);
}

function generateRealTasks(occupation, sector, company, rng) {
  const tarefasPrevistas = [...occupation.tarefasBase];
  const tarefasReais = [...tarefasPrevistas];
  let acumuloDeFuncao = Math.max(0, sector.cargaTrabalho - 50) + rng.int(0, 22);
  let desvioDeFuncao = rng.int(0, 22);

  if (company.capacidadeRH < 45 || company.maturidadeGestao < 45) {
    acumuloDeFuncao += rng.int(8, 22);
    desvioDeFuncao += rng.int(6, 18);
  }

  if (rng.chance(acumuloDeFuncao)) {
    const otherOccupation = rng.pick(OCCUPATION_CATALOG.filter((item) => item.id !== occupation.id));
    tarefasReais.push(rng.pick(otherOccupation.tarefasBase));
  }

  if (rng.chance(desvioDeFuncao)) {
    tarefasReais.push("resolver demandas urgentes fora do escopo formal");
  }

  return {
    tarefasPrevistas,
    tarefasReais: [...new Set(tarefasReais)],
    tarefaExtraIds: tarefasReais.filter((task) => !tarefasPrevistas.includes(task)),
    acumuloDeFuncao: clampPercent(acumuloDeFuncao),
    desvioDeFuncao: clampPercent(desvioDeFuncao),
  };
}

function generateEmployees(company, sectors, rng, idFactory) {
  const employees = [];
  const usedNames = new Set();
  const basePerSector = Math.floor(company.employeeTarget / sectors.length);
  let remainder = company.employeeTarget % sectors.length;

  sectors.forEach((sector) => {
    const count = basePerSector + (remainder > 0 ? 1 : 0);
    remainder -= 1;

    for (let index = 0; index < count; index += 1) {
      const occupation = selectOccupationForSector(sector, company, rng);
      const seniority = rng.pick(occupation.senioridadesPossiveis);
      const taskState = generateRealTasks(occupation, sector, company, rng);
      const education = generateEducationProfile(occupation, seniority, rng);
      const qualification = clampPercent(
        occupation.nivelEspecializacaoBase + rng.int(-14, 18) + (seniority === "senior" ? 10 : 0)
      );
      const educationFit = calculateEducationFit(education, occupation, seniority);
      const specializationFit = calculateSpecializationFit(qualification, occupation);
      const specialization = clampPercent(occupation.nivelEspecializacaoBase + rng.int(-8, 16));
      const overload = clampPercent(sector.cargaTrabalho + taskState.acumuloDeFuncao * 0.35 + rng.int(-10, 12));
      const satisfactionRaw =
        70 +
        (company.culturaCuidado - 50) * 0.25 +
        (sector.climaSetor - 50) * 0.35 -
        Math.max(0, overload - 55) * 0.32 -
        (company.pressaoPorResultado - 50) * 0.1;
      const satisfaction = clampPercent(Math.max(30, satisfactionRaw));
      const trust = clampPercent(
        company.maturidadeGestao * 0.55 + company.culturaCuidado * 0.25 + rng.int(-10, 10)
      );
      const perceivedSupport = clampPercent(company.suporteOrganizacionalMedio + rng.int(-14, 14));
      const perceivedJustice = clampPercent(company.justicaOrganizacionalMedia + rng.int(-16, 12));
      const growthPerspective = clampPercent(
        42 + (company.maturidadeGestao - 50) * 0.25 + (seniority === "junior" ? 12 : 0) + rng.int(-14, 18)
      );
      const organizationalBond = clampPercent(
        35 + seniorityInfluence(seniority) * 0.18 + rng.int(0, 28) + (satisfaction - 50) * 0.2
      );
      const marketSalaryPerception = clampPercent(55 + rng.int(-22, 18) + (company.estabilidadeFinanceira - 50) * 0.1);
      const externalEmployability = clampPercent(
        qualification * 0.38 +
          specialization * 0.22 +
          education.pesoMercado * 0.22 +
          employeeMarketPull(seniority) +
          Math.max(0, specializationFit - 55) * 0.12 +
          rng.int(-12, 16)
      );
      const fear = clampPercent(
        35 + (100 - company.estabilidadeFinanceira) * 0.35 + (company.pressaoPorResultado - 50) * 0.18
      );
      const commitment = clampPercent(
        satisfaction * 0.35 + trust * 0.25 + perceivedSupport * 0.18 + organizationalBond * 0.22
      );
      const overQualificationPressure = Math.max(0, educationFit - 78) * 0.08 + Math.max(0, specializationFit - 78) * 0.08;
      const mismatchPressure = Math.max(0, 42 - educationFit) * 0.08 + Math.max(0, 42 - specializationFit) * 0.06;
      const intentionToLeave = clampPercent(
        100 -
          satisfaction +
          overload * 0.15 +
          fear * 0.1 +
          externalEmployability * 0.12 -
          trust * 0.14 -
          perceivedSupport * 0.12 -
          perceivedJustice * 0.1 -
          organizationalBond * 0.16 +
          overQualificationPressure +
          mismatchPressure
      );

      const employee = {
        id: idFactory.nextId("employee"),
        nome: buildName(rng, usedNames),
        idade: rng.int(20, 58),
        setorId: sector.id,
        cargoFormal: createCargoFormal(occupation, seniority, sector.id),
        cboCodigo: occupation.cboCodigo,
        ocupacaoBaseId: occupation.id,
        senioridade: seniority,
        escolaridade: education.nivel,
        socialMarkers: generateSocialMarkers(rng),
        nivelEnsinoMercado: education.pesoMercado,
        ajusteEducacaoCargo: educationFit,
        ajusteEspecializacaoCargo: specializationFit,
        salarioMensal: salaryForOccupation(occupation, seniority, company, rng),
        tempoDeEmpresa: rng.int(1, 96),
        produtividade: clampPercent(qualification * 0.55 + (100 - overload) * 0.2 + rng.int(18, 34)),
        satisfacao: satisfaction,
        qualificacao: qualification,
        afetividade: clampPercent(rng.int(28, 85) + (company.culturaCuidado - 50) * 0.1),
        autonomia: clampPercent(occupation.autonomiaBase + rng.int(-12, 16)),
        confiancaNaGestao: trust,
        confiancaNoRH: clampPercent(company.capacidadeRH * 0.45 + perceivedSupport * 0.25 + rng.int(-10, 12)),
        medo: fear,
        sobrecarga: overload,
        ambicao: clampPercent(rng.int(25, 88) + (company.culturaCompetitiva - 50) * 0.15),
        aberturaParaMudanca: clampPercent(rng.int(22, 85)),
        estabilidadeEmocional: clampPercent(rng.int(30, 86)),
        influenciaInformal: clampPercent((qualification + seniorityInfluence(seniority) + rng.int(0, 25)) / 2),
        especializacao: specialization,
        intencaoSaida: intentionToLeave,
        comprometimentoOrganizacional: commitment,
        suportePercebido: perceivedSupport,
        justicaPercebida: perceivedJustice,
        vinculoOrganizacional: organizationalBond,
        empregabilidadeExterna: externalEmployability,
        salarioPercebidoMercado: marketSalaryPerception,
        perspectivaCrescimento: growthPerspective,
        estadoDeBuscaExterna: false,
        propostaExternaRecebida: false,
        demandasPendentes: [],
        absenteismo: 0,
        eventosRecentes: [],
        status: "ativo",
        diasDesdeUltimaAcao: 99,
        tarefasPrevistas: taskState.tarefasPrevistas,
        tarefasReais: taskState.tarefasReais,
        funcoesPrevistas: createFunctionAssignmentsFromTasks(taskState.tarefasPrevistas, occupation, sector, idFactory, {
          origin: "cargo_formal",
          expectedTasks: taskState.tarefasPrevistas,
          baseWeeklyLoad: 6,
        }),
        funcoesReais: createFunctionAssignmentsFromTasks(taskState.tarefasReais, occupation, sector, idFactory, {
          origin: "geracao_inicial",
          expectedTasks: taskState.tarefasPrevistas,
          extraTasks: taskState.tarefaExtraIds,
          baseWeeklyLoad: 6,
          visibilityDelta: company.maturidadeGestao > 55 ? 8 : -8,
          recognitionDelta: company.justicaOrganizacionalMedia > 55 ? 6 : -10,
        }),
        desvioDeFuncao: taskState.desvioDeFuncao,
        acumuloDeFuncao: taskState.acumuloDeFuncao,
        riscoDeSaida: intentionToLeave,
        relacoesIds: [],
        memorias: [],
        historicoDiario: [],
        dadosVisiveis: {},
        dadosOcultos: {
          toleranciaPressao: clampPercent(rng.int(25, 85)),
        },
      };

      recalculateFunctionalMetrics(employee);

      employees.push(employee);
      sector.funcionariosIds.push(employee.id);

      if (seniority === "lideranca" && sector.liderancaFormalId === null) {
        sector.liderancaFormalId = employee.id;
      }
    }
  });

  ensureSectorLeadership(sectors, employees);
  return employees;
}

function seniorityInfluence(seniority) {
  if (seniority === "lideranca") return 82;
  if (seniority === "senior") return 66;
  if (seniority === "pleno") return 48;
  return 30;
}

function employeeMarketPull(seniority) {
  if (seniority === "lideranca") return 24;
  if (seniority === "senior") return 28;
  if (seniority === "pleno") return 18;
  return 10;
}

function generateEducationProfile(occupation, seniority, rng) {
  const required = requiredEducationScore(occupation, seniority);
  const selected = EDUCATION_LEVELS.map((level) => ({
    ...level,
    weight: Math.max(1, 40 - Math.abs(level.pesoMercado - required)),
  }));
  return rng.weightedChoice(selected);
}

function requiredEducationScore(occupation, seniority) {
  const seniorityPull = seniority === "lideranca" ? 16 : seniority === "senior" ? 10 : seniority === "pleno" ? 4 : -4;
  return clampPercent(occupation.complexidadeBase * 0.45 + occupation.nivelEspecializacaoBase * 0.45 + seniorityPull);
}

function calculateEducationFit(education, occupation, seniority) {
  const required = requiredEducationScore(occupation, seniority);
  return clampPercent(100 - Math.abs(education.pesoMercado - required) * 1.15);
}

function calculateSpecializationFit(qualification, occupation) {
  return clampPercent(100 - Math.abs(qualification - occupation.nivelEspecializacaoBase) * 1.1);
}

function generateSocialMarkers(rng) {
  const genero = rng.weightedChoice([
    { value: "homem", weight: 48 },
    { value: "mulher", weight: 48 },
    { value: "nao_binario", weight: 4 },
  ]).value;
  const racaCor = rng.weightedChoice([
    { value: "branca", weight: 42 },
    { value: "parda", weight: 38 },
    { value: "preta", weight: 14 },
    { value: "amarela", weight: 3 },
    { value: "indigena", weight: 3 },
  ]).value;

  return {
    genero,
    racaCor,
    grupoMinorizado: genero !== "homem" || racaCor !== "branca",
    marcadorVisivelSocialmente: rng.chance(70),
    observacao: "Marcadores sociais nao alteram competencia, produtividade, moralidade ou personalidade.",
  };
}

function ensureSectorLeadership(sectors, employees) {
  sectors.forEach((sector) => {
    if (sector.liderancaFormalId) return;
    const sectorEmployees = employees.filter((employee) => employee.setorId === sector.id);
    const leader = sectorEmployees.sort((a, b) => b.influenciaInformal - a.influenciaInformal)[0];
    if (leader) sector.liderancaFormalId = leader.id;
  });
}

module.exports = {
  generateEmployees,
  selectOccupationForSector,
};
