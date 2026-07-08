/**
 * Modulo: mvpLoop.test
 * Responsabilidade: validar loop semanal tecnico do MVP.
 */

const { createGameSession, playWeek, playWeeks, createDefaultTechnicalStrategy } = require("../game/gameLoop");
const { buildWeeklyBriefing } = require("../game/weekPlanner");
const { renderWeeklyReport } = require("../reports/weeklyReport");
const { assert, collectCoherenceAlerts, collectRangeAlerts } = require("./testUtils");

function run() {
  testSingleWeekWithManualActions();
  testTwelveWeekTechnicalLoop();
}

function testSingleWeekWithManualActions() {
  const session = createGameSession("RH-MVP-LOOP-001", { horizonteSemanas: 12 });
  const briefing = buildWeeklyBriefing(session.state);
  const employee = briefing.funcionariosEmAtencao[0];
  const sector = briefing.setores[0];

  const report = playWeek(session, [
    { tipo: "checkin_individual_rapido", alvo: { employeeId: employee.employeeId }, modo: "executar" },
    { tipo: "devolutiva_pesquisa", alvo: { sectorId: sector.sectorId }, modo: "planejar", diasPreparo: 7 },
  ]);

  assert(report.semana === 1, "relatorio deve marcar semana 1");
  assert(report.diaFinal - report.diaInicial === 7, "semana deve avancar 7 dias");
  assert(report.acoesExecutadas.length === 1, "acao imediata deve executar");
  assert(report.acoesPlanejadas.length === 1, "acao planejada deve entrar no plano");
  assert(session.semanaAtual === 2, "sessao deve avancar para semana 2");
  assert(typeof renderWeeklyReport(report) === "string", "relatorio semanal deve renderizar texto");
  assertNoAlerts(session.state);
}

function testTwelveWeekTechnicalLoop() {
  const session = createGameSession("RH-MVP-LOOP-012", { horizonteSemanas: 12 });
  const reports = playWeeks(session, 12, createDefaultTechnicalStrategy());

  assert(reports.length === 12, "loop deve jogar 12 semanas");
  assert(session.status === "periodo_encerrado", "sessao deve encerrar periodo apos 12 semanas");
  assert(session.avaliacaoFinal, "sessao deve criar avaliacao final ao encerrar periodo");
  assert(session.state.calendar.totalDiasSimulados === 84, "12 semanas devem avancar 84 dias");
  assert(session.relatoriosSemanais.length === 12, "sessao deve guardar 12 relatorios");
  assert(session.objectiveTracker.historico.length === 12, "tracker deve guardar progresso semanal");
  assert(session.state.rh.semanaAtual >= 12, "energia semanal deve acompanhar semanas simuladas");
  assertNoAlerts(session.state);
}

function assertNoAlerts(state) {
  const alerts = [...collectRangeAlerts(state), ...collectCoherenceAlerts(state)];
  assert(!alerts.length, `estado com alertas no loop MVP:\n${alerts.join("\n")}`);
}

module.exports = {
  run,
};
