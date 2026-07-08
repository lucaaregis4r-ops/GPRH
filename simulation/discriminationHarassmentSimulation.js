/**
 * Modulo: discriminationHarassmentSimulation
 * Responsabilidade: gerar riscos psicossociais genericos e sobrios por contexto organizacional.
 * Entrada: state
 * Saida: eventos objetivos, memorias individuais, reportCases e sinais
 * Nao deve: usar marcadores sociais como competencia, moralidade ou produtividade.
 */

const { clampPercent } = require("../core/clamp");
const { PSYCHOSOCIAL_RISK_EVENTS } = require("../data/complianceCatalog");
const { createOrganizationEvent } = require("./eventLog");
const { generateMemoryForEmployee } = require("./memoryInterpretation");
const { processPsychosocialRiskEvent } = require("./complianceSimulation");

function simulatePsychosocialRisksOneDay(state) {
  if (state.calendar.totalDiasSimulados <= 0) return [];
  if (state.calendar.totalDiasSimulados % 9 !== 0) return [];

  const sector = chooseRiskSector(state);
  if (!sector) return [];

  const riskChance = calculateSectorRiskChance(state, sector);
  if (!state.rng.chance(riskChance)) return [];

  const target = chooseTargetEmployee(state, sector);
  const author = chooseContextualAuthor(state, sector, target);
  if (!target || !author) return [];

  const model = chooseRiskEventModel(state, sector, target);
  const severity = clampPercent(model.severidadeBase + (100 - sector.psychologicalSafety) * 0.16 + sector.powerDistance * 0.1 + state.rng.int(-8, 10));
  const visible = severity > 72 && sector.complianceVisibility > 58;

  const event = createOrganizationEvent(state, {
    tipo: model.tipo,
    descricao: model.descricao,
    setorId: sector.id,
    funcionariosEnvolvidos: [target.id, author.id],
    severidade: severity,
    origem: "risco_psicossocial",
    dados: {
      contexto: "cultura_lideranca_compliance",
      marcadorSocialEnvolvido: Boolean(target.socialMarkers && target.socialMarkers.grupoMinorizado),
    },
    visivelParaRH: visible,
    tags: model.tags,
  });

  createIndividualMemories(state, event, { sector, target, author });
  const reportCase = processPsychosocialRiskEvent(state, event, { sector, target, author });

  if (reportCase && reportCase.riscoRetaliacao > 72 && state.rng.chance(reportCase.riscoRetaliacao * 0.18)) {
    createRetaliationRiskEvent(state, sector, target, author, reportCase);
  }

  return [event];
}

function calculateSectorRiskChance(state, sector) {
  const compliance = state.company.compliance;
  const pressure = Math.max(0, sector.cargaTrabalho - 60) * 0.22 + Math.max(0, state.company.pressaoPorResultado - 60) * 0.18;
  const weakCulture =
    Math.max(0, 55 - sector.inclusionClimate) * 0.25 +
    Math.max(0, 55 - sector.psychologicalSafety) * 0.28 +
    Math.max(0, compliance.toleranciaLiderancaAbusiva - 55) * 0.18 +
    Math.max(0, sector.powerDistance - 60) * 0.12;
  return clampPercent(2 + pressure + weakCulture);
}

function chooseRiskSector(state) {
  const candidates = state.sectors.map((sector) => ({
    sector,
    weight: Math.max(1, calculateSectorRiskChance(state, sector)),
  }));
  return state.rng.weightedChoice(candidates, "weight").sector;
}

function chooseTargetEmployee(state, sector) {
  const employees = state.employees.filter((employee) => employee.status !== "desligado" && employee.setorId === sector.id);
  if (!employees.length) return null;

  const inclusionPenalty = Math.max(0, 62 - sector.inclusionClimate);
  const safetyPenalty = Math.max(0, 62 - sector.psychologicalSafety);

  return state.rng.weightedChoice(
    employees.map((employee) => ({
      employee,
      weight:
        8 +
        (employee.socialMarkers && employee.socialMarkers.grupoMinorizado ? inclusionPenalty * 0.22 : 0) +
        Math.max(0, employee.sobrecarga - 70) * 0.08 +
        safetyPenalty * 0.08,
    })),
    "weight"
  ).employee;
}

function chooseContextualAuthor(state, sector, target) {
  const employees = state.employees.filter(
    (employee) => employee.status !== "desligado" && employee.setorId === sector.id && employee.id !== target.id
  );
  if (!employees.length) return null;
  const leaderId = sector.liderancaFormalId;

  return state.rng.weightedChoice(
    employees.map((employee) => ({
      employee,
      weight:
        8 +
        (employee.id === leaderId ? sector.powerDistance * 0.18 : 0) +
        employee.influenciaInformal * 0.08 +
        Math.max(0, state.company.culturaCompetitiva - 55) * 0.12,
    })),
    "weight"
  ).employee;
}

function chooseRiskEventModel(state, sector, target) {
  const leadershipRisk = sector.powerDistance > 65 || state.company.compliance.toleranciaLiderancaAbusiva > 65;
  const socialMarkerRisk = target.socialMarkers && target.socialMarkers.grupoMinorizado && sector.inclusionClimate < 58;
  const pool = PSYCHOSOCIAL_RISK_EVENTS.filter((event) => {
    if (leadershipRisk && ["lideranca_abusiva", "cobranca_humilhante"].includes(event.tipo)) return true;
    if (socialMarkerRisk && ["tratamento_desigual", "microagressao", "exclusao_de_reuniao"].includes(event.tipo)) return true;
    return !["lideranca_abusiva"].includes(event.tipo);
  });
  return state.rng.pick(pool.length ? pool : PSYCHOSOCIAL_RISK_EVENTS);
}

function createIndividualMemories(state, event, context) {
  const { sector, target, author } = context;
  const targetMemory = generateMemoryForEmployee(state, target, event, {
    rolesByEmployeeId: { [target.id]: "prejudicado" },
    customImpact: {
      impactoInicial: { justicaPercebida: -5, medo: 4, confiancaNoRH: -3, intencaoSaida: 3 },
      impactoResidual: { justicaPercebida: -0.08, medo: 0.06, intencaoSaida: 0.05 },
    },
  });
  if (targetMemory) targetMemory.descricao = "Senti que fui tratado de forma injusta em uma situacao de trabalho.";

  const witness = chooseWitness(state, sector, target, author);
  if (witness) {
    const witnessMemory = generateMemoryForEmployee(state, witness, event, {
      rolesByEmployeeId: { [witness.id]: "colega_proximo" },
      customImpact: {
        impactoInicial: { medo: 2, confiancaNaGestao: -2, confiancaNoRH: -1 },
        impactoResidual: { medo: 0.04, confiancaNaGestao: -0.04 },
      },
    });
    if (witnessMemory) witnessMemory.descricao = "Percebi uma situacao injusta e fiquei inseguro sobre falar.";
  }

  const authorMemory = generateMemoryForEmployee(state, author, event, {
    rolesByEmployeeId: { [author.id]: "observador" },
    customImpact: {
      impactoInicial: { medo: 1 },
      impactoResidual: {},
    },
  });
  if (authorMemory) authorMemory.descricao = "Fui envolvido em uma preocupacao de conduta no setor.";
}

function chooseWitness(state, sector, target, author) {
  const candidates = state.employees.filter(
    (employee) =>
      employee.status !== "desligado" &&
      employee.setorId === sector.id &&
      employee.id !== target.id &&
      employee.id !== author.id
  );
  if (!candidates.length) return null;
  return state.rng.pick(candidates);
}

function createRetaliationRiskEvent(state, sector, target, author, reportCase) {
  const event = createOrganizationEvent(state, {
    tipo: "retaliacao_pos_denuncia",
    descricao: "Apos uma denuncia, surgiram sinais de medo de retaliacao no setor.",
    setorId: sector.id,
    funcionariosEnvolvidos: [target.id, author.id],
    severidade: reportCase.riscoRetaliacao,
    origem: "compliance",
    dados: { reportCaseId: reportCase.id },
    visivelParaRH: reportCase.visivelParaRH,
    tags: ["compliance", "retaliacao", "medo"],
  });

  const memory = generateMemoryForEmployee(state, target, event, {
    rolesByEmployeeId: { [target.id]: "prejudicado" },
    customImpact: {
      impactoInicial: { medo: 5, confiancaNoRH: -4, intencaoSaida: 4 },
      impactoResidual: { medo: 0.08, intencaoSaida: 0.06 },
    },
  });
  if (memory) memory.descricao = "Depois de falar, passei a temer consequencias negativas.";
  return event;
}

module.exports = {
  simulatePsychosocialRisksOneDay,
};
