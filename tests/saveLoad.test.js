/**
 * Modulo: saveLoad.test
 * Responsabilidade: validar export/import simples de sessoes do MVP.
 */

const { createGameSession, playWeek, createDefaultTechnicalStrategy } = require("../game/gameLoop");
const { exportGameSession, exportGameSessionJson, importGameSession } = require("../game/saveLoad");
const { renderFinalEvaluationReport } = require("../reports/finalEvaluationReport");
const { assert, stableSnapshot } = require("./testUtils");

function run() {
  testExportImportSession();
  testImportedSessionContinuesLikeOriginal();
  testImportFinishedSession();
}

function testExportImportSession() {
  const session = createGameSession("RH-SAVE-001");
  playWeek(session, []);

  const payload = exportGameSession(session);
  const imported = importGameSession(payload);

  assert(payload.version === 1, "save deve ter versao");
  assert(imported.seed === session.seed, "sessao importada deve preservar seed");
  assert(imported.semanaAtual === session.semanaAtual, "sessao importada deve preservar semana");
  assert(imported.state.rng.next, "sessao importada deve reidratar RNG");
  assert(imported.state.idFactory.nextId, "sessao importada deve reidratar idFactory");
  assert(exportGameSessionJson(imported).includes("rh_procedural_game_session"), "export JSON deve conter tipo do save");
}

function testImportedSessionContinuesLikeOriginal() {
  const original = createGameSession("RH-SAVE-CONTINUA");
  playWeek(original, []);

  const imported = importGameSession(exportGameSession(original));
  const strategy = createDefaultTechnicalStrategy();

  const originalBriefing = require("../game/weekPlanner").buildWeeklyBriefing(original.state);
  const importedBriefing = require("../game/weekPlanner").buildWeeklyBriefing(imported.state);
  playWeek(original, strategy(originalBriefing, original));
  playWeek(imported, strategy(importedBriefing, imported));

  assert(stableSnapshot(imported.state) === stableSnapshot(original.state), "sessao importada deve continuar igual a original");
}

function testImportFinishedSession() {
  const session = createGameSession("RH-SAVE-FINAL");
  while (session.status === "em_andamento") {
    playWeek(session, []);
  }

  const imported = importGameSession(exportGameSessionJson(session));
  const text = renderFinalEvaluationReport(imported.avaliacaoFinal);

  assert(imported.status === "periodo_encerrado", "save finalizado deve preservar status");
  assert(imported.avaliacaoFinal, "save finalizado deve preservar avaliacao final");
  assert(text.includes("AVALIACAO_FINAL"), "avaliacao final importada deve renderizar");
}

module.exports = {
  run,
};
