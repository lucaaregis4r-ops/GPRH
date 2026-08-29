/**
 * Modulo: socialInteractionSimulation
 * Responsabilidade: simular interacoes sociais situadas, especialmente na copa.
 * Entrada: state, slot de rotina e rng deterministico
 * Saida: pequenos efeitos sociais, eventos relevantes e sinais parciais ao RH
 * Nao deve: transformar toda conversa em dado certo nem decidir movimento visual.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("./eventLog");
const { generateMemoriesFromEvent } = require("./memoryInterpretation");

const SOCIAL_EVENT_TYPES = {
  WORKLOAD_COMPLAINT: "workload_complaint",
  SUPPORT_CONVERSATION: "support_conversation",
  RUMOR_SPREAD: "rumor_spread",
  MANAGER_CRITICISM: "manager_criticism",
  HR_DISTRUST_COMMENT: "hr_distrust_comment",
  CONFLICT_HINT: "conflict_hint",
  CAREER_FRUSTRATION: "career_frustration",
};

function simulateCoffeeRoomSocialInteractions(state, slot, rng = state.rng) {
  if (slot === "end_day") return [];

  const employeesInCoffeeRoom = (state.employees || []).filter(
    (employee) =>
      employee.status !== "desligado" &&
      (employee.currentRoomId === "copa" || employee.currentState === "coffee_break" || employee.currentState === "informal_chat")
  );

  if (employeesInCoffeeRoom.length < 2) return [];

  const pairs = chooseInteractionPairs(state, employeesInCoffeeRoom, rng);
  const maxEvents = Math.min(2, Math.max(1, Math.ceil(employeesInCoffeeRoom.length / 5)));
  const events = [];

  pairs.slice(0, maxEvents).forEach((pair) => {
    const eventType = chooseSocialEventType(state, pair.left, pair.right, pair.relationship, rng);
    const event = applySocialEvent(state, eventType, pair.left, pair.right, pair.relationship, slot, rng);
    if (event) events.push(event);
  });

  return events;
}

function chooseInteractionPairs(state, employees, rng) {
  const pairs = [];
  for (let leftIndex = 0; leftIndex < employees.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < employees.length; rightIndex += 1) {
      const left = employees[leftIndex];
      const right = employees[rightIndex];
      const relationship = findRelationship(state, left.id, right.id);
      pairs.push({
        left,
        right,
        relationship,
        score: pairScore(left, right, relationship) + rng.float(0, 8),
      });
    }
  }
  return pairs.sort((a, b) => b.score - a.score);
}

function pairScore(left, right, relationship) {
  if (!relationship) return left.setorId === right.setorId ? 28 : 8;
  return (
    relationship.proximidadeTrabalho * 0.35 +
    relationship.afinidade * 0.22 +
    relationship.confianca * 0.18 +
    relationship.dependenciaTecnica * 0.16 +
    relationship.conflito * 0.12
  );
}

function chooseSocialEventType(state, left, right, relationship, rng) {
  const averageOverload = (safeNumber(left.sobrecarga) + safeNumber(right.sobrecarga)) / 2;
  const averageSupport = (safeNumber(left.suportePercebido) + safeNumber(right.suportePercebido)) / 2;
  const averageHrTrust = (safeNumber(left.confiancaNoRH) + safeNumber(right.confiancaNoRH)) / 2;
  const averageManagementTrust = (safeNumber(left.confiancaNaGestao) + safeNumber(right.confiancaNaGestao)) / 2;
  const conflict = relationship ? safeNumber(relationship.conflito) : 0;
  const rumor = safeNumber(findSector(state, left.setorId)?.rumorLocal || state.company.rumorGlobal);
  const growthFrustration = Math.max(0, 55 - Math.min(left.perspectivaCrescimento || 50, right.perspectivaCrescimento || 50));

  return rng.weightedChoice([
    { value: SOCIAL_EVENT_TYPES.WORKLOAD_COMPLAINT, weight: Math.max(1, averageOverload - 45) },
    { value: SOCIAL_EVENT_TYPES.SUPPORT_CONVERSATION, weight: Math.max(4, averageSupport + (relationship?.confianca || 35) - 70) },
    { value: SOCIAL_EVENT_TYPES.RUMOR_SPREAD, weight: Math.max(0, rumor - 30) },
    { value: SOCIAL_EVENT_TYPES.MANAGER_CRITICISM, weight: Math.max(0, 58 - averageManagementTrust) },
    { value: SOCIAL_EVENT_TYPES.HR_DISTRUST_COMMENT, weight: Math.max(0, 58 - averageHrTrust) },
    { value: SOCIAL_EVENT_TYPES.CONFLICT_HINT, weight: Math.max(0, conflict - 35) },
    { value: SOCIAL_EVENT_TYPES.CAREER_FRUSTRATION, weight: growthFrustration },
  ]).value;
}

function applySocialEvent(state, type, left, right, relationship, slot, rng) {
  const sector = findSector(state, left.setorId) || findSector(state, right.setorId);
  const visible = rng.chance(visibilityChance(state, type));
  const severity = calculateSeverity(type, left, right, relationship);
  const description = describeSocialEvent(type, left, right);
  const effects = applySocialEffects(state, type, left, right, relationship, sector);

  const event = createOrganizationEvent(state, {
    tipo: type,
    descricao: description,
    setorId: sector ? sector.id : null,
    funcionariosEnvolvidos: [left.id, right.id],
    severidade: severity,
    origem: "copa",
    dados: { ...effects, slot },
    visivelParaRH: visible,
    tags: ["copa", "social", type],
  });

  generateMemoriesFromEvent(state, event, {
    rolesByEmployeeId: {
      [left.id]: "participante_conversa",
      [right.id]: "participante_conversa",
    },
  });

  state.socialInteractionLog = state.socialInteractionLog || [];
  state.socialInteractionLog.push({
    id: event.id,
    dia: event.dia,
    slot,
    tipo: type,
    funcionariosEnvolvidos: [left.id, right.id],
    visivelParaRH: visible,
  });
  if (state.socialInteractionLog.length > 60) state.socialInteractionLog.shift();

  return event;
}

function applySocialEffects(state, type, left, right, relationship, sector) {
  const effects = {};

  if (type === SOCIAL_EVENT_TYPES.SUPPORT_CONVERSATION) {
    left.suportePercebido = clampPercent(left.suportePercebido + 2);
    right.suportePercebido = clampPercent(right.suportePercebido + 2);
    left.socialNeed = clampPercent((left.socialNeed || 40) - 8);
    right.socialNeed = clampPercent((right.socialNeed || 40) - 8);
    adjustRelationship(relationship, { confianca: 2, afinidade: 2, conflito: -1 });
    effects.suportePercebido = 2;
    return effects;
  }

  if (type === SOCIAL_EVENT_TYPES.WORKLOAD_COMPLAINT) {
    if (sector) sector.rumorLocal = clampPercent((sector.rumorLocal || 0) + 2);
    left.sobrecarga = clampPercent(left.sobrecarga - 1);
    right.medo = clampPercent(right.medo + 1);
    effects.rumorLocal = 2;
    return effects;
  }

  if (type === SOCIAL_EVENT_TYPES.RUMOR_SPREAD) {
    if (sector) sector.rumorLocal = clampPercent((sector.rumorLocal || 0) + 4);
    state.company.rumorGlobal = clampPercent((state.company.rumorGlobal || 0) + 2);
    left.medo = clampPercent(left.medo + 1);
    right.medo = clampPercent(right.medo + 2);
    effects.rumorLocal = 4;
    effects.rumorGlobal = 2;
    return effects;
  }

  if (type === SOCIAL_EVENT_TYPES.MANAGER_CRITICISM) {
    left.confiancaNaGestao = clampPercent(left.confiancaNaGestao - 2);
    right.confiancaNaGestao = clampPercent(right.confiancaNaGestao - 1);
    effects.confiancaNaGestao = -2;
    return effects;
  }

  if (type === SOCIAL_EVENT_TYPES.HR_DISTRUST_COMMENT) {
    left.confiancaNoRH = clampPercent(left.confiancaNoRH - 2);
    right.confiancaNoRH = clampPercent(right.confiancaNoRH - 1);
    effects.confiancaNoRH = -2;
    return effects;
  }

  if (type === SOCIAL_EVENT_TYPES.CONFLICT_HINT) {
    adjustRelationship(relationship, { conflito: 4, confianca: -1 });
    left.focusIndividual = clampPercent((left.focusIndividual || 60) - 2);
    right.focusIndividual = clampPercent((right.focusIndividual || 60) - 2);
    effects.conflito = 4;
    return effects;
  }

  left.perspectivaCrescimento = clampPercent((left.perspectivaCrescimento || 50) - 2);
  right.satisfacao = clampPercent(right.satisfacao - 1);
  effects.perspectivaCrescimento = -2;
  return effects;
}

function adjustRelationship(relationship, deltas) {
  if (!relationship) return;
  Object.entries(deltas).forEach(([field, delta]) => {
    relationship[field] = clampPercent((relationship[field] || 0) + delta);
  });
}

function describeSocialEvent(type, left, right) {
  const names = `${left.nome} e ${right.nome}`;
  const descriptions = {
    [SOCIAL_EVENT_TYPES.WORKLOAD_COMPLAINT]: `${names} comentaram sobre carga de trabalho na copa`,
    [SOCIAL_EVENT_TYPES.SUPPORT_CONVERSATION]: `${names} tiveram uma conversa de apoio informal na copa`,
    [SOCIAL_EVENT_TYPES.RUMOR_SPREAD]: `${names} circularam um rumor durante a pausa`,
    [SOCIAL_EVENT_TYPES.MANAGER_CRITICISM]: `${names} criticaram a gestao em conversa informal`,
    [SOCIAL_EVENT_TYPES.HR_DISTRUST_COMMENT]: `${names} demonstraram baixa confianca no RH em conversa informal`,
    [SOCIAL_EVENT_TYPES.CONFLICT_HINT]: `${names} deixaram transparecer tensao relacional na copa`,
    [SOCIAL_EVENT_TYPES.CAREER_FRUSTRATION]: `${names} falaram sobre frustracao de carreira`,
  };
  return descriptions[type] || `${names} conversaram na copa`;
}

function calculateSeverity(type, left, right, relationship) {
  if (type === SOCIAL_EVENT_TYPES.SUPPORT_CONVERSATION) {
    return clampPercent(((left.suportePercebido || 50) + (right.suportePercebido || 50)) / 2);
  }
  if (type === SOCIAL_EVENT_TYPES.CONFLICT_HINT) return clampPercent(relationship?.conflito || 55);
  if (type === SOCIAL_EVENT_TYPES.RUMOR_SPREAD) return clampPercent(((left.medo || 40) + (right.medo || 40)) / 2 + 12);
  return clampPercent(((left.sobrecarga || 50) + (right.sobrecarga || 50) + (100 - (left.satisfacao || 50))) / 3);
}

function visibilityChance(state, type) {
  const base = type === SOCIAL_EVENT_TYPES.SUPPORT_CONVERSATION ? 10 : 18;
  return Math.min(55, base + (state.company.capacidadeRH || 50) * 0.22);
}

function findRelationship(state, leftId, rightId) {
  return (state.relationships || []).find(
    (relationship) =>
      relationship.ativa !== false &&
      ((relationship.fromEmployeeId === leftId && relationship.toEmployeeId === rightId) ||
        (relationship.fromEmployeeId === rightId && relationship.toEmployeeId === leftId))
  );
}

function findSector(state, sectorId) {
  return (state.sectors || []).find((sector) => sector.id === sectorId);
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

module.exports = {
  SOCIAL_EVENT_TYPES,
  simulateCoffeeRoomSocialInteractions,
};
