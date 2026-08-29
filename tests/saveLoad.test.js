/**
 * Modulo: saveLoad.test
 * Responsabilidade: validar export/import simples de sessoes do MVP.
 */

const { createGameSession, playWeek, createDefaultTechnicalStrategy } = require("../game/gameLoop");
const { createDailyGameSession } = require("../game/dayLoop");
const { exportGameSession, exportGameSessionJson, importGameSession } = require("../game/saveLoad");
const { renderFinalEvaluationReport } = require("../reports/finalEvaluationReport");
const { assert, stableSnapshot } = require("./testUtils");

function run() {
  testExportImportSession();
  testImportedSessionContinuesLikeOriginal();
  testImportFinishedSession();
  testLegacySaveGetsWorkspaceMigration();
  testVersion2DailySaveGetsPipelineMigration();
}

function testVersion2DailySaveGetsPipelineMigration() {
  const session = createDailyGameSession("RH-SAVE-V2-DIARIO");
  const payload = exportGameSession(session);
  payload.version = 2;
  delete payload.session.dayStartMetrics;
  delete payload.session.dayStartEventIndex;
  delete payload.session.currentDayActions;

  const imported = importGameSession(payload);
  assert(imported.saveVersion === 3, "save v2 deve migrar para versao 3");
  assert(imported.dayStartMetrics, "migracao v3 deve restaurar metricas do inicio do dia");
  assert(Number.isInteger(imported.dayStartEventIndex), "migracao v3 deve restaurar indice de eventos");
  assert(Array.isArray(imported.currentDayActions), "migracao v3 deve restaurar log diario");
}

function testExportImportSession() {
  const session = createGameSession("RH-SAVE-001");
  playWeek(session, []);

  const payload = exportGameSession(session);
  const imported = importGameSession(payload);

  assert(payload.version === 3, "save deve ter versao atual");
  assert(imported.seed === session.seed, "sessao importada deve preservar seed");
  assert(imported.semanaAtual === session.semanaAtual, "sessao importada deve preservar semana");
  assert(imported.state.rng.next, "sessao importada deve reidratar RNG");
  assert(imported.state.idFactory.nextId, "sessao importada deve reidratar idFactory");
  assert(imported.state.workspace, "sessao importada deve preservar workspace");
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

function testLegacySaveGetsWorkspaceMigration() {
  const session = createGameSession("RH-SAVE-LEGADO");
  const payload = exportGameSession(session);
  payload.version = 1;
  delete payload.session.state.workspace;
  payload.session.state.employees.forEach((employee) => {
    delete employee.deskId;
    delete employee.homeRoomId;
    delete employee.currentRoomId;
    delete employee.currentLocationId;
    delete employee.targetLocationId;
  });

  const imported = importGameSession(payload);
  const activeEmployees = imported.state.employees.filter((employee) => employee.status !== "desligado");

  assert(imported.state.workspace, "save legado deve criar workspace ao importar");
  assert(activeEmployees.every((employee) => employee.deskId), "funcionarios legados devem receber deskId");
  assert(activeEmployees.every((employee) => employee.homeRoomId), "funcionarios legados devem receber homeRoomId");
  assert(activeEmployees.every((employee) => employee.currentState), "funcionarios legados devem receber estado de rotina");
  assert(activeEmployees.every((employee) => Array.isArray(employee.lastRoutineEvents)), "funcionarios legados devem receber log de rotina");
  assert(activeEmployees.every((employee) => Number.isFinite(employee.deliveryCapacity)), "funcionarios legados devem receber entrega calculada");
  assert(activeEmployees.every((employee) => Number.isFinite(employee.workSustainability)), "funcionarios legados devem receber sustentabilidade calculada");
}

module.exports = {
  run,
};
