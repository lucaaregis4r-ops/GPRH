/**
 * Modulo: rhEnergy
 * Responsabilidade: manter energia semanal e maturidade operacional do RH.
 * Entrada: state
 * Saida: state.rh inicializado/atualizado
 * Nao deve: processar efeitos de acoes nem renderizar UI.
 */

const { clampPercent } = require("../core/clamp");
const { initializeOrganizationalTechnologies } = require("./organizationalTechTree");

function initializeRhState(state) {
  if (state.rh) {
    initializeOrganizationalTechnologies(state);
    return state.rh;
  }

  const weeklyEnergy = Math.max(5, Math.round((state.company.capacidadeRH || 50) / 10) + 3);
  state.rh = {
    energiaSemanal: weeklyEnergy,
    energiaAtual: weeklyEnergy,
    maturidadeRH: clampPercent(state.company.capacidadeRH || 50),
    confiancaDiretoria: clampPercent(state.company.maturidadeGestao * 0.45 + state.company.estabilidadeFinanceira * 0.25 + 15),
    orcamentoRH: Math.round((state.economy ? state.economy.receitaMensalBase : 100000) * 0.035),
    semanaAtual: 1,
    acoesExecutadas: [],
    acoesEmAndamento: [],
    acoesPlanejadas: [],
    aprovacoesDiretoria: [],
  };

  initializeOrganizationalTechnologies(state);
  return state.rh;
}

function refreshRhEnergyForDay(state) {
  initializeRhState(state);
  const currentWeek = Math.floor(state.calendar.totalDiasSimulados / 7) + 1;
  if (currentWeek > state.rh.semanaAtual) {
    state.rh.semanaAtual = currentWeek;
    state.rh.energiaAtual = state.rh.energiaSemanal;
  }
}

function consumeRhEnergy(state, amount) {
  initializeRhState(state);
  if (state.rh.energiaAtual < amount) return false;
  state.rh.energiaAtual -= amount;
  return true;
}

module.exports = {
  initializeRhState,
  refreshRhEnergyForDay,
  consumeRhEnergy,
};
