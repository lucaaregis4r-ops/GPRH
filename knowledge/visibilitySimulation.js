/**
 * Modulo: visibilitySimulation
 * Responsabilidade: processar eventos/memorias e gerar sinais visiveis/ocultos para o RH.
 * Entrada: state
 * Saida: state.visibleSignals e employee.percepcaoRH atualizados
 * Nao deve: criar acoes do RH nem revelar estado real automaticamente.
 */

const { createSignalFromEvent, createSignalFromMemory } = require("./visibleSignalsModel");
const { initializePerceivedState, refreshPerceivedState } = require("./perceivedState");

function initializeVisibilityState(state) {
  if (!state.visibleSignals) state.visibleSignals = [];
  if (!state.visibility) {
    state.visibility = {
      processedEventIds: [],
      processedMemoryIds: [],
    };
  }
  initializePerceivedState(state);
}

function processVisibility(state) {
  initializeVisibilityState(state);

  const processedEvents = new Set(state.visibility.processedEventIds);
  const processedMemories = new Set(state.visibility.processedMemoryIds);

  (state.organizationEvents || []).forEach((event) => {
    if (processedEvents.has(event.id)) return;
    const signal = createSignalFromEvent(state, event);
    state.visibleSignals.push(signal);
    state.visibility.processedEventIds.push(event.id);
  });

  state.employees.forEach((employee) => {
    (employee.memorias || []).forEach((memory) => {
      if (processedMemories.has(memory.id)) return;
      const signal = createSignalFromMemory(state, employee, memory);
      state.visibleSignals.push(signal);
      state.visibility.processedMemoryIds.push(memory.id);
    });
  });

  refreshPerceivedState(state);
  return state.visibleSignals;
}

function getVisibleSignals(state) {
  return (state.visibleSignals || []).filter((signal) => signal.visivelParaRH);
}

function getHiddenSignals(state) {
  return (state.visibleSignals || []).filter((signal) => !signal.visivelParaRH);
}

module.exports = {
  initializeVisibilityState,
  processVisibility,
  getVisibleSignals,
  getHiddenSignals,
};
