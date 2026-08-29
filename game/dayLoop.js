/**
 * Modulo: dayLoop
 * Responsabilidade: orquestrar loop diario tecnico para futura UI jogavel.
 * Entrada: seed e acoes com tempo investido
 * Saida: sessao diaria com resumo de dia e relatorios semanais
 * Nao deve: renderizar UI nem mover regras de simulacao para o front-end.
 */

const { createGameSession } = require("./gameLoop");
const { summarizeObjectiveMetrics, evaluateObjectiveProgress } = require("./objectiveTracker");
const { buildWeeklyBriefing } = require("./weekPlanner");
const { createWeeklyReport } = require("../reports/weeklyReport");
const { advanceDays } = require("../simulation/simulationEngine");
const {
  simulateEmployeeRoutineSlot,
  simulateEmployeeRoutineUntil,
  routineSlotForMinute,
} = require("../simulation/employeeRoutineEngine");
const { processRhAction } = require("../rh/rhActionProcessor");
const { getRhActionDefinition } = require("../rh/rhActionCatalog");
const { createPlayerDay, spendDayResources, formatClock } = require("./timeBudget");
const { calculateActionTimeQuality, createSyntheticPlanFromTime } = require("../rh/actionTimeQuality");

function createDailyGameSession(seed = "RH-DIARIO-001", options = {}) {
  const weeklySession = createGameSession(seed, options);
  simulateEmployeeRoutineSlot(weeklySession.state, "morning_start", weeklySession.state.rng);
  return {
    ...weeklySession,
    modo: "diario",
    playerDay: createPlayerDay(weeklySession.state.calendar.totalDiasSimulados + 1, options.playerDay || {}),
    dailyProjects: [],
    dailyReports: [],
    semanaInicioMetricas: summarizeObjectiveMetrics(weeklySession.state),
    semanaInicioBriefing: buildWeeklyBriefing(weeklySession.state),
    dayStartMetrics: summarizeObjectiveMetrics(weeklySession.state),
    dayStartEventIndex: (weeklySession.state.organizationEvents || []).length,
  };
}

function playDayAction(session, request) {
  assertDailySession(session);
  if (session.status !== "em_andamento") throw new Error(`sessao nao esta em andamento: ${session.status}`);

  const definition = getRhActionDefinition(request.tipo);
  if (!definition) throw new Error(`acao RH desconhecida: ${request.tipo}`);
  if ((session.state.rh.energiaAtual || 0) < definition.custoEnergia) {
    throw new Error(`energia RH insuficiente para ${request.tipo}`);
  }

  const duration = Number(request.tempoInvestidoMin || defaultDuration(definition));
  const actionStartMinute = session.playerDay.horaAtual;
  const timeUse = spendDayResources(session.playerDay, duration, {
    intensity: definition.categoria === "intervencao" ? 1.2 : 1,
    complexity: definition.requerAprovacaoDiretoria ? 1.4 : 1,
  });
  const routineSlotsProcessed = simulateEmployeeRoutineUntil(
    session.state,
    actionStartMinute,
    session.playerDay.horaAtual,
    session.state.rng
  );
  const quality = calculateActionTimeQuality(definition, duration, {
    maturidadeRH: session.state.rh.maturidadeRH,
    confiabilidadeInformacao: inferTargetReliability(session.state, request.alvo || {}),
    urgencia: inferUrgency(session.state, request.alvo || {}),
  });

  if (definition.tempo?.tipo === "projeto" || request.modo === "projeto") {
    return investInDailyProject(session, request, definition, timeUse, quality);
  }

  const action = processRhAction(session.state, request.tipo, request.alvo || {}, {
    plan: createSyntheticPlanFromTime(definition, quality),
    tempo: quality,
  });

  const entry = {
    tipo: "acao_diaria",
    fase: definition.categoria === "descoberta" ? "investigacao" : "intervencao",
    actionId: action.id,
    nome: action.nome,
    alvo: request.alvo || {},
    diagnostico: request.diagnostico || null,
    inicio: formatClock(session.playerDay.horaAtual - duration),
    fim: formatClock(session.playerDay.horaAtual),
    tempoInvestidoMin: duration,
    qualidadePlanejamento: quality.qualidadePlanejamento,
    riscoImproviso: quality.riscoImproviso,
    routineSlotsProcessed,
    status: action.status,
  };
  ensureDailyActionLog(session).push(entry);
  return entry;
}

function endDay(session) {
  assertDailySession(session);
  const beforeDay = session.state.calendar.totalDiasSimulados;
  const eventsBefore = session.dayStartEventIndex ?? (session.state.organizationEvents || []).length;
  const actions = ensureDailyActionLog(session).slice();

  const routineSlotsProcessed = simulateEmployeeRoutineUntil(
    session.state,
    session.playerDay.horaAtual,
    session.playerDay.horaFim,
    session.state.rng
  );
  advanceDays(session.state, 1, { skipEmployeeRoutine: true });

  const newEvents = (session.state.organizationEvents || []).slice(eventsBefore);
  const currentMetrics = summarizeObjectiveMetrics(session.state);
  const dayReport = {
    dia: beforeDay + 1,
    acoes: actions,
    eventosNovos: newEvents.map((event) => ({
      dia: event.dia,
      tipo: event.tipo,
      severidade: Math.round(event.severidade || 0),
      descricao: event.descricao,
    })),
    projetos: summarizeDailyProjects(session),
    routineSlotsProcessed,
    avaliacaoParcial: buildPartialAssessment(session),
    variacoes: buildDayVariations(session.dayStartMetrics || currentMetrics, currentMetrics),
    causalidade: buildCausalityAssessment(actions, newEvents),
    resumo: buildDaySummary(actions, session),
  };
  session.dailyReports.push(dayReport);
  session.currentDayActions = [];

  if (session.state.calendar.totalDiasSimulados > 0 && session.state.calendar.totalDiasSimulados % 7 === 0) {
    dayReport.relatorioSemanal = summarizeWeeklyReportForUi(closeDailyWeek(session));
  }

  if (session.status === "em_andamento") {
    session.playerDay = createPlayerDay(session.state.calendar.totalDiasSimulados + 1);
    simulateEmployeeRoutineSlot(session.state, routineSlotForMinute(session.playerDay.horaAtual), session.state.rng);
    session.dayStartMetrics = summarizeObjectiveMetrics(session.state);
    session.dayStartEventIndex = (session.state.organizationEvents || []).length;
  }

  return dayReport;
}

function buildDayVariations(baseline, current) {
  return {
    climaMedio: roundDelta(current.climaMedio - baseline.climaMedio),
    confiancaRhMedia: roundDelta(current.confiancaRhMedia - baseline.confiancaRhMedia),
    sobrecargaMedia: roundDelta(current.sobrecargaMedia - baseline.sobrecargaMedia),
    demandasPendentes: current.demandasPendentes - baseline.demandasPendentes,
  };
}

function buildCausalityAssessment(actions, events) {
  return actions.slice(0, 6).map((action) => {
    const related = events.filter((event) => event.dados?.rhActionId === action.actionId);
    const quality = action.qualidadePlanejamento ?? action.qualidadePrevista ?? 0;
    return {
      actionId: action.actionId || null,
      nome: action.nome,
      diagnostico: action.diagnostico || null,
      evidencias: related.map((event) => event.descricao).slice(0, 3),
      confiabilidade: related.length > 0 && quality >= 65 ? "moderada" : "baixa",
      incerteza: related.length > 0
        ? "O evento ocorreu apos a acao, mas outros fatores da simulacao tambem podem ter contribuido."
        : "Ainda nao ha evidencia observavel suficiente para atribuir efeito.",
      followUp: related.length > 0 ? "acompanhar sinais nos proximos dias" : "coletar informacao antes de concluir",
    };
  });
}

function roundDelta(value) {
  return Math.round(value * 10) / 10;
}

function investInDailyProject(session, request, definition, timeUse, quality) {
  const project = findOrCreateProject(session, request, definition);
  project.progressoMin += timeUse.tempoInvestidoMin;
  project.qualidadePrevista = Math.max(project.qualidadePrevista, quality.qualidadePlanejamento);
  project.riscoImproviso = Math.min(project.riscoImproviso, quality.riscoImproviso);
  project.ultimoInvestimentoDia = session.state.calendar.totalDiasSimulados;

  let executedAction = null;
  if (project.progressoMin >= project.tempoMinimoMin && (request.executarQuandoPossivel || project.progressoMin >= project.tempoIdealMin)) {
    executedAction = processRhAction(session.state, project.tipo, project.alvo, {
      plan: {
        id: project.id,
        tipo: project.tipo,
        diasPreparados: Math.max(1, Math.ceil(project.progressoMin / 120)),
        diasPreparoPlanejados: Math.max(1, Math.ceil(project.tempoIdealMin / 120)),
        qualidadePlanejamento: project.qualidadePrevista,
        origem: "projeto_tempo_fluido",
      },
      tempo: quality,
    });
    project.status = executedAction.status === "negada_diretoria" ? "negada_diretoria" : "executado";
    project.acaoExecutadaId = executedAction.id;
  }

  const entry = {
    tipo: "projeto_diario",
    fase: "intervencao",
    projectId: project.id,
    actionId: executedAction ? executedAction.id : null,
    nome: definition.nome,
    alvo: project.alvo,
    diagnostico: project.diagnostico || null,
    progressoMin: project.progressoMin,
    tempoMinimoMin: project.tempoMinimoMin,
    tempoIdealMin: project.tempoIdealMin,
    qualidadePrevista: project.qualidadePrevista,
    status: project.status,
  };
  ensureDailyActionLog(session).push(entry);
  return entry;
}

function findOrCreateProject(session, request, definition) {
  const existing = session.dailyProjects.find(
    (project) => project.status === "em_andamento" && project.tipo === request.tipo && JSON.stringify(project.alvo) === JSON.stringify(request.alvo || {})
  );
  if (existing) return existing;

  const tempo = definition.tempo || {};
  const project = {
    id: session.state.idFactory.nextId("daily_project"),
    tipo: definition.tipo,
    nome: definition.nome,
    alvo: request.alvo || {},
    diagnostico: request.diagnostico || null,
    progressoMin: 0,
    tempoMinimoMin: tempo.tempoMinimoMin || 120,
    tempoIdealMin: tempo.tempoIdealMin || 360,
    prazoDias: request.prazoDias || 7,
    etapasConcluidas: [],
    qualidadePrevista: 0,
    riscoImproviso: 100,
    status: "em_andamento",
  };
  session.dailyProjects.push(project);
  return project;
}

function closeDailyWeek(session) {
  const fim = summarizeObjectiveMetrics(session.state);
  const progresso = evaluateObjectiveProgress(session.state, session.objectiveTracker);
  const report = createWeeklyReport({
    semana: session.semanaAtual,
    briefing: session.semanaInicioBriefing,
    plano: summarizeDailyWeekPlan(session),
    inicio: session.semanaInicioMetricas,
    fim,
    progresso,
    state: session.state,
  });

  session.relatoriosSemanais.push(report);
  session.semanaAtual += 1;
  if (session.semanaAtual > session.horizonteSemanas) {
    const { evaluateFinalSession } = require("./finalEvaluation");
    session.status = "periodo_encerrado";
    session.avaliacaoFinal = evaluateFinalSession(session);
    return report;
  }

  session.semanaInicioMetricas = fim;
  session.semanaInicioBriefing = buildWeeklyBriefing(session.state);
  return report;
}

function summarizeDailyWeekPlan(session) {
  const weekStartDay = session.state.calendar.totalDiasSimulados - 7;
  const executedActions = (session.state.rh.acoesExecutadas || []).filter((action) => action.dia > weekStartDay);
  return {
    energiaAntes: session.state.rh.energiaSemanal,
    energiaDepois: session.state.rh.energiaAtual,
    executadas: executedActions.map((action) => ({
      request: { tipo: action.tipo, alvo: action.alvo },
      actionId: action.id,
      status: action.status,
      eventosGerados: action.eventosGerados.length,
      sinaisGerados: action.sinaisGerados.length,
    })),
    planejadas: session.dailyProjects
      .filter((project) => project.status === "em_andamento")
      .map((project) => ({ request: { tipo: project.tipo, alvo: project.alvo }, planId: project.id, status: project.status })),
    rejeitadas: [],
  };
}

function buildDaySummary(actions, session) {
  if (!actions.length) return "Dia encerrado sem acoes diretas do RH.";
  const names = actions.map((action) => action.nome).slice(0, 3).join(", ");
  const events = (session.state.organizationEvents || []).slice(-3);
  if (events.length) return `Voce dedicou tempo a ${names}. Alguns sinais novos pedem acompanhamento.`;
  return `Voce dedicou tempo a ${names}.`;
}

function summarizeDailyProjects(session) {
  return (session.dailyProjects || []).map((project) => ({
    id: project.id,
    nome: project.nome,
    tipo: project.tipo,
    progressoMin: project.progressoMin,
    tempoMinimoMin: project.tempoMinimoMin,
    tempoIdealMin: project.tempoIdealMin,
    status: project.status,
  }));
}

function buildPartialAssessment(session) {
  const current = summarizeObjectiveMetrics(session.state);
  const baseline = session.semanaInicioMetricas || current;
  const pendingDelta = current.demandasPendentes - baseline.demandasPendentes;
  const climateDelta = current.climaMedio - baseline.climaMedio;
  const trustDelta = current.confiancaRhMedia - baseline.confiancaRhMedia;
  const loadDelta = current.sobrecargaMedia - baseline.sobrecargaMedia;

  return {
    leituraGeral: classifyPartialSignal(climateDelta + trustDelta - loadDelta * 0.5 - pendingDelta * 0.8),
    clima: classifyDelta(climateDelta, true),
    confiancaRh: classifyDelta(trustDelta, true),
    sobrecarga: classifyDelta(loadDelta, false),
    demandasPendentes: pendingDelta > 0 ? "aumentaram" : pendingDelta < 0 ? "reduziram" : "estaveis",
  };
}

function summarizeWeeklyReportForUi(report) {
  if (!report) return null;
  return {
    semana: report.semana,
    diaInicial: report.diaInicial,
    diaFinal: report.diaFinal,
    resumo: report.resumo,
    diagnostico: report.progresso.diagnostico,
    score: report.progresso.score,
    eventosRelevantes: report.eventosDaSemana.slice(-5).map((event) => ({
      dia: event.dia,
      tipo: event.tipo,
      severidade: Math.round(event.severidade || 0),
      descricao: event.descricao,
    })),
  };
}

function classifyDelta(value, highIsGood) {
  if (Math.abs(value) < 1) return "estavel";
  if (highIsGood) return value > 0 ? "melhorou" : "piorou";
  return value > 0 ? "piorou" : "melhorou";
}

function classifyPartialSignal(value) {
  if (value >= 4) return "melhorando";
  if (value <= -4) return "atencao";
  return "estavel";
}

function ensureDailyActionLog(session) {
  if (!session.currentDayActions) session.currentDayActions = [];
  return session.currentDayActions;
}

function inferTargetReliability(state, target) {
  const employeeId = target.employeeId || target.funcionarioId;
  if (employeeId) {
    const employee = state.employees.find((item) => item.id === employeeId);
    return employee?.percepcaoRH?.confiabilidadeGeral || 35;
  }
  return 50;
}

function inferUrgency(state, target) {
  const employeeId = target.employeeId || target.funcionarioId;
  if (employeeId) {
    const employee = state.employees.find((item) => item.id === employeeId);
    return Math.max(employee?.percepcaoRH?.riscoSaidaEstimado || 0, employee?.percepcaoRH?.sobrecargaEstimada || 0);
  }
  return 40;
}

function defaultDuration(definition) {
  return definition.tempo?.tempoMinimoMin || definition.tempo?.duracoesPermitidasMin?.[0] || 30;
}

function assertDailySession(session) {
  if (!session || session.modo !== "diario" || !session.playerDay) {
    throw new Error("sessao diaria invalida");
  }
}

module.exports = {
  createDailyGameSession,
  playDayAction,
  endDay,
};
