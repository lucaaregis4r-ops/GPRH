/**
 * Modulo: saveLoad
 * Responsabilidade: exportar e importar sessoes simples do MVP.
 * Entrada: sessao de jogo ou JSON salvo
 * Saida: payload serializavel ou sessao reidratada
 * Nao deve: criar UI final, alterar regras de simulacao ou avancar tempo.
 */

const { createRng } = require("../core/rng");
const { createIdFactory } = require("../core/ids");
const { evaluateFinalSession } = require("./finalEvaluation");

const SAVE_VERSION = 1;

function exportGameSession(session) {
  const payload = clonePlain({
    version: SAVE_VERSION,
    kind: "rh_procedural_game_session",
    session,
    runtime: {
      rngState: session.state.rng && session.state.rng.getState ? session.state.rng.getState() : null,
      idCounters: session.state.idFactory && session.state.idFactory.getCounters ? session.state.idFactory.getCounters() : {},
    },
  });

  delete payload.session.state.rng;
  delete payload.session.state.idFactory;
  return payload;
}

function exportGameSessionJson(session) {
  return JSON.stringify(exportGameSession(session), null, 2);
}

function importGameSession(input) {
  const payload = typeof input === "string" ? JSON.parse(input) : clonePlain(input);
  validatePayload(payload);

  const session = payload.session;
  const state = session.state;
  state.rng = createRng(state.seed || session.seed, { state: payload.runtime.rngState });
  state.idFactory = createIdFactory(payload.runtime.idCounters || {});
  restoreStateAliases(state);

  if (session.status === "periodo_encerrado" && !session.avaliacaoFinal) {
    session.avaliacaoFinal = evaluateFinalSession(session);
  }

  return session;
}

function validatePayload(payload) {
  if (!payload || payload.kind !== "rh_procedural_game_session") {
    throw new Error("save invalido: tipo de arquivo nao reconhecido");
  }
  if (payload.version !== SAVE_VERSION) {
    throw new Error(`save invalido: versao ${payload.version} nao suportada`);
  }
  if (!payload.session || !payload.session.state) {
    throw new Error("save invalido: sessao ausente");
  }
  if (!payload.runtime || typeof payload.runtime.rngState !== "number") {
    throw new Error("save invalido: estado do RNG ausente");
  }
}

function restoreStateAliases(state) {
  state.organizationEvents = state.organizationEvents || state.eventLog || [];
  state.eventLog = state.organizationEvents;
  state.eventosOrganizacionais = state.organizationEvents;
  state.historicoEventos = state.organizationEvents;
  state.history = state.history || [];
  state.eventosRecentes = state.eventosRecentes || [];
  state.acoesFuncionarios = state.acoesFuncionarios || [];
  state.reportCases = state.reportCases || [];
  state.recentEvents = state.recentEvents || [];
  state.visibleSignals = state.visibleSignals || [];
  if (!state.visibility) {
    state.visibility = {
      processedEventIds: [],
      processedMemoryIds: [],
    };
  }
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  SAVE_VERSION,
  exportGameSession,
  exportGameSessionJson,
  importGameSession,
};
