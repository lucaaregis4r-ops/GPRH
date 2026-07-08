/**
 * Modulo: eventLog
 * Responsabilidade: registrar fatos objetivos da simulacao.
 * Entrada: state e dados do evento
 * Saida: evento organizacional registrado
 * Nao deve: aplicar efeitos psicologicos ou criar memorias individuais.
 */

const { clampPercent } = require("../core/clamp");

function createOrganizationEvent(state, eventData) {
  const event = {
    id: eventData.id || state.idFactory.nextId("organization_event"),
    dia: eventData.dia ?? state.calendar?.totalDiasSimulados ?? 0,
    tipo: eventData.tipo,
    descricao: eventData.descricao || eventData.descricaoCurta || "",
    setorId: eventData.setorId || null,
    funcionariosEnvolvidos: eventData.funcionariosEnvolvidos || eventData.envolvidosIds || [],
    severidade: clampPercent(eventData.severidade ?? eventData.intensidade ?? 0),
    origem: eventData.origem || "simulacao",
    dados: eventData.dados || eventData.efeitos || {},
    visivelParaRH: Boolean(eventData.visivelParaRH),
    tags: eventData.tags || [],
  };

  addOrganizationEvent(state, event);
  return event;
}

function addOrganizationEvent(state, event) {
  if (!state.organizationEvents) state.organizationEvents = [];
  if (!state.eventLog) state.eventLog = state.organizationEvents;
  state.organizationEvents.push(event);
  state.eventosOrganizacionais = state.organizationEvents;
  state.historicoEventos = state.organizationEvents;
  return event;
}

function getRecentOrganizationEvents(state, limit = 10) {
  return (state.organizationEvents || []).slice(-limit);
}

function getEventsByEmployee(state, employeeId) {
  return (state.organizationEvents || []).filter((event) => event.funcionariosEnvolvidos.includes(employeeId));
}

function getEventsByType(state, type) {
  return (state.organizationEvents || []).filter((event) => event.tipo === type);
}

module.exports = {
  createOrganizationEvent,
  addOrganizationEvent,
  getRecentOrganizationEvents,
  getEventsByEmployee,
  getEventsByType,
};
