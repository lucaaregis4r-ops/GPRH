/**
 * Modulo: gameLoop
 * Responsabilidade: orquestrar o loop semanal tecnico do MVP.
 * Entrada: seed e acoes semanais
 * Saida: sessao de jogo tecnica com relatorios semanais
 * Nao deve: criar UI final, campanha complexa, avatares ou vitoria/derrota completa.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { buildWeeklyBriefing, planWeeklyActions } = require("./weekPlanner");
const { createObjectiveTracker, summarizeObjectiveMetrics, evaluateObjectiveProgress } = require("./objectiveTracker");
const { buildScenarioEngineConfig, loadScenario } = require("./scenarioLoader");
const { evaluateFinalSession } = require("./finalEvaluation");
const { createWeeklyReport } = require("../reports/weeklyReport");

function createGameSession(seed = "RH-MVP-001", options = {}) {
  const scenarioId = options.scenarioId || "crescimento_desorganizado";
  const engineConfig = buildScenarioEngineConfig(scenarioId, options.engineConfig || {});
  const state = createProceduralRHSimulation(seed, engineConfig);
  const objectiveTracker = createObjectiveTracker(state, {
    horizonteSemanas: options.horizonteSemanas || 12,
  });
  const session = {
    seed,
    state,
    semanaAtual: 1,
    horizonteSemanas: objectiveTracker.horizonteSemanas,
    status: "em_andamento",
    objectiveTracker,
    relatoriosSemanais: [],
    avaliacaoFinal: null,
  };

  loadScenario(session, scenarioId);
  session.objectiveTracker.baseline = summarizeObjectiveMetrics(session.state);
  if (options.horizonteSemanas) {
    session.horizonteSemanas = options.horizonteSemanas;
    session.objectiveTracker.horizonteSemanas = options.horizonteSemanas;
  }

  return session;
}

function playWeek(session, actionRequests = []) {
  if (session.status !== "em_andamento") {
    throw new Error(`sessao nao esta em andamento: ${session.status}`);
  }

  const state = session.state;
  const briefing = buildWeeklyBriefing(state);
  const inicio = summarizeObjectiveMetrics(state);
  const decision = planWeeklyActions(state, actionRequests);

  advanceDays(state, 7);

  const fim = summarizeObjectiveMetrics(state);
  const progresso = evaluateObjectiveProgress(state, session.objectiveTracker);
  const report = createWeeklyReport({
    semana: session.semanaAtual,
    briefing,
    plano: decision,
    inicio,
    fim,
    progresso,
    state,
  });

  session.relatoriosSemanais.push(report);
  session.semanaAtual += 1;
  if (session.semanaAtual > session.horizonteSemanas) {
    session.status = "periodo_encerrado";
    session.avaliacaoFinal = evaluateFinalSession(session);
  }

  return report;
}

function playWeeks(session, weeks, strategyFn = () => []) {
  const reports = [];
  for (let index = 0; index < weeks; index += 1) {
    if (session.status !== "em_andamento") break;
    const briefing = buildWeeklyBriefing(session.state);
    const requests = strategyFn(briefing, session) || [];
    reports.push(playWeek(session, requests));
  }
  return reports;
}

function createDefaultTechnicalStrategy() {
  return function defaultStrategy(briefing) {
    const requests = [];
    let energy = briefing.energiaRh || briefing.energiaSemanal || 0;
    const attention = briefing.funcionariosEmAtencao[0];
    const secondAttention = briefing.funcionariosEmAtencao[1];
    const sector = briefing.setores
      .slice()
      .sort((left, right) => right.rumor + right.funcionariosAtivos + (100 - right.clima) - (left.rumor + left.funcionariosAtivos + (100 - left.clima)))[0];
    const overloadedSector = briefing.setores.slice().sort((left, right) => right.rumor + (100 - right.clima) - (left.rumor + (100 - left.clima)))[0];
    const demand = briefing.demandasPendentes[0];

    if (demand && demand.tipo === "conversa") {
      addRequest(requests, { tipo: "responder_pedido_conversa", alvo: { employeeId: demand.employeeId }, modo: "executar" }, 2);
    } else if (demand && demand.tipo === "aumento_ou_promocao") {
      addRequest(requests, { tipo: "responder_pedido_carreira", alvo: { employeeId: demand.employeeId }, modo: "executar" }, 2);
    }

    if (attention) {
      addRequest(requests, { tipo: "acompanhar_funcionario_risco", alvo: { employeeId: attention.employeeId }, modo: "executar" }, 3);
      if (attention.sobrecargaEstimada > 72) {
        addRequest(requests, { tipo: "mapeamento_tarefas_reais", alvo: { employeeId: attention.employeeId }, modo: "executar" }, 2);
      }
    }

    if (sector && sector.rumor > 35) {
      addRequest(requests, { tipo: "conter_rumor", alvo: { sectorId: sector.sectorId }, modo: "executar" }, 2);
    }

    if (overloadedSector && overloadedSector.clima < 48) {
      addRequest(requests, { tipo: "devolutiva_pesquisa", alvo: { sectorId: overloadedSector.sectorId }, modo: "executar" }, 2);
    }

    if (overloadedSector && energy >= 3) {
      addRequest(requests, { tipo: "priorizar_tarefas_criticas", alvo: { sectorId: overloadedSector.sectorId }, modo: "executar" }, 3);
    }

    if (secondAttention && energy >= 2) {
      addRequest(requests, { tipo: "reconhecer_contribuicao", alvo: { employeeId: secondAttention.employeeId }, modo: "executar" }, 2);
    }

    return requests.slice(0, 4);

    function addRequest(list, request, cost) {
      if (energy < cost) return;
      list.push(request);
      energy -= cost;
    }
  };
}

module.exports = {
  createGameSession,
  playWeek,
  playWeeks,
  createDefaultTechnicalStrategy,
};
