/**
 * Modulo: scenarioEvaluation.test
 * Responsabilidade: validar cenario inicial e avaliacao final simples.
 */

const { createGameSession, playWeeks, createDefaultTechnicalStrategy } = require("../game/gameLoop");
const { evaluateFinalSession } = require("../game/finalEvaluation");
const { renderFinalEvaluationReport } = require("../reports/finalEvaluationReport");
const { assert } = require("./testUtils");

function run() {
  testScenarioLoadedOnSession();
  testFinalEvaluationAfterCampaign();
}

function testScenarioLoadedOnSession() {
  const session = createGameSession("RH-CENARIO-001");

  assert(session.scenario.id === "crescimento_desorganizado", "sessao deve carregar cenario padrao");
  assert(session.horizonteSemanas === 12, "cenario deve definir horizonte simples de 12 semanas");
  assert(session.state.scenarioApplied === "crescimento_desorganizado", "estado deve registrar cenario aplicado");
  assert(
    session.state.organizationEvents.some((event) => event.tipo === "cenario_inicial"),
    "cenario deve registrar evento inicial visivel"
  );
}

function testFinalEvaluationAfterCampaign() {
  const session = createGameSession("RH-CENARIO-012");
  playWeeks(session, session.horizonteSemanas, createDefaultTechnicalStrategy());

  assert(session.status === "periodo_encerrado", "campanha deve encerrar periodo");
  assert(session.avaliacaoFinal, "sessao deve guardar avaliacao final");
  assert(session.avaliacaoFinal.criterios.length >= 8, "avaliacao deve cobrir objetivos simples");
  assert(session.avaliacaoFinal.classificacao, "avaliacao deve ter classificacao final");
  assert(session.avaliacaoFinal.historiaEmergente, "avaliacao deve explicar historia emergente");

  const evaluation = evaluateFinalSession(session);
  const text = renderFinalEvaluationReport(evaluation);
  assert(text.includes("AVALIACAO_FINAL"), "relatorio final deve renderizar cabecalho");
  assert(text.includes("Objetivos:"), "relatorio final deve listar objetivos");
}

module.exports = {
  run,
};
