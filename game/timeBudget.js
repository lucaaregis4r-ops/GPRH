/**
 * Modulo: timeBudget
 * Responsabilidade: controlar tempo, energia e foco do dia jogavel.
 * Entrada: playerDay e duracao de acoes
 * Saida: validacoes e consumo de recursos diarios
 * Nao deve: processar regras de simulacao ou acoes de RH.
 */

function createPlayerDay(dayNumber = 1, options = {}) {
  const start = options.horaInicio ?? 8 * 60;
  const end = options.horaFim ?? 18 * 60;
  return {
    dia: dayNumber,
    horaInicio: start,
    horaAtual: start,
    horaFim: end,
    tempoRestanteMin: end - start,
    energiaAtual: options.energiaAtual ?? 100,
    focoAtual: options.focoAtual ?? 100,
  };
}

function canSpendTime(playerDay, minutes) {
  return Number.isFinite(minutes) && minutes > 0 && playerDay.tempoRestanteMin >= minutes;
}

function spendDayResources(playerDay, minutes, options = {}) {
  if (!canSpendTime(playerDay, minutes)) {
    throw new Error(`tempo insuficiente no dia para acao de ${minutes} minutos`);
  }

  const energyCost = options.energyCost ?? calculateEnergyCost(minutes, options.intensity || 1);
  const focusCost = options.focusCost ?? calculateFocusCost(minutes, options.complexity || 1);

  if (playerDay.energiaAtual < energyCost) throw new Error("energia diaria insuficiente");
  if (playerDay.focoAtual < focusCost) throw new Error("foco diario insuficiente");

  playerDay.horaAtual += minutes;
  playerDay.tempoRestanteMin -= minutes;
  playerDay.energiaAtual = Math.max(0, playerDay.energiaAtual - energyCost);
  playerDay.focoAtual = Math.max(0, playerDay.focoAtual - focusCost);

  return {
    tempoInvestidoMin: minutes,
    horaAtual: playerDay.horaAtual,
    tempoRestanteMin: playerDay.tempoRestanteMin,
    energiaGasta: energyCost,
    focoGasto: focusCost,
  };
}

function calculateEnergyCost(minutes, intensity = 1) {
  return Math.max(1, Math.round((minutes / 12) * intensity));
}

function calculateFocusCost(minutes, complexity = 1) {
  return Math.max(1, Math.round((minutes / 15) * complexity));
}

function formatClock(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

module.exports = {
  createPlayerDay,
  canSpendTime,
  spendDayResources,
  calculateEnergyCost,
  calculateFocusCost,
  formatClock,
};
