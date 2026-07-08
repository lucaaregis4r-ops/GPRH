/**
 * Modulo: actionTimeQuality
 * Responsabilidade: converter tempo investido em qualidade e risco temporarios.
 * Entrada: definicao da acao, tempo investido e contexto
 * Saida: qualidade, risco e equivalente de preparo para a engine atual
 * Nao deve: aplicar efeitos da acao.
 */

const { clampPercent } = require("../core/clamp");

function calculateActionTimeQuality(definition, tempoInvestidoMin, context = {}) {
  const tempo = definition.tempo || {};
  const minimum = tempo.tempoMinimoMin || minutesFromDays(definition.preparoMinimoDias || 0) || 20;
  const ideal = Math.max(minimum, tempo.tempoIdealMin || minutesFromDays(definition.preparoIdealDias || 0) || 60);
  const diminishingAfter = Math.max(ideal, tempo.retornoDecrescenteAposMin || ideal);
  const urgency = context.urgencia || 0;
  const complexity = context.complexidade || inferComplexity(definition);
  const maturity = context.maturidadeRH ?? 50;
  const reliability = context.confiabilidadeInformacao ?? 50;

  let baseQuality;
  if (tempoInvestidoMin < minimum) {
    baseQuality = (tempoInvestidoMin / minimum) * 45;
  } else if (tempoInvestidoMin <= ideal) {
    baseQuality = 55 + ((tempoInvestidoMin - minimum) / Math.max(1, ideal - minimum)) * 35;
  } else {
    const extra = Math.min(tempoInvestidoMin - ideal, diminishingAfter);
    baseQuality = 90 + (extra / Math.max(1, diminishingAfter)) * 10;
  }

  const contextBonus = (maturity - 50) * 0.12 + (reliability - 50) * 0.08 - urgency * 0.12 - (complexity - 50) * 0.08;
  const qualidadePlanejamento = clampPercent(Math.round(baseQuality + contextBonus));
  const riscoImproviso = clampPercent(Math.round(Math.max(0, 70 - qualidadePlanejamento) + Math.max(0, urgency - 50) * 0.2));

  return {
    tempoInvestidoMin,
    tempoMinimoMin: minimum,
    tempoIdealMin: ideal,
    qualidadePlanejamento,
    riscoImproviso,
    diasPreparoEquivalentes: convertTimeToPreparationDays(tempoInvestidoMin),
    retornoDecrescente: tempoInvestidoMin > diminishingAfter,
  };
}

function createSyntheticPlanFromTime(definition, quality) {
  return {
    id: null,
    tipo: definition.tipo,
    diasPreparados: quality.diasPreparoEquivalentes,
    diasPreparoPlanejados: Math.max(1, convertTimeToPreparationDays(quality.tempoIdealMin)),
    qualidadePlanejamento: quality.qualidadePlanejamento,
    origem: "tempo_fluido",
    tempoInvestidoMin: quality.tempoInvestidoMin,
    riscoImproviso: quality.riscoImproviso,
  };
}

function convertTimeToPreparationDays(minutes) {
  return Math.max(0, Math.ceil((minutes || 0) / 120));
}

function minutesFromDays(days) {
  return (days || 0) * 120;
}

function inferComplexity(definition) {
  if (definition.requerAprovacaoDiretoria) return 75;
  if (definition.categoria === "intervencao") return 58;
  return 42;
}

module.exports = {
  calculateActionTimeQuality,
  createSyntheticPlanFromTime,
  convertTimeToPreparationDays,
};
