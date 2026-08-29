/**
 * Modulo: mvpCalibration
 * Responsabilidade: medir dificuldade e estabilidade do MVP jogavel semanal.
 * Entrada: quantidade de seeds e estrategia tecnica
 * Saida: relatorio agregado de calibragem do jogo
 * Nao deve: alterar regras de simulacao ou criar UI final.
 */

const { createGameSession, playWeeks, createDefaultTechnicalStrategy } = require("./gameLoop");
const { summarizeObjectiveMetrics } = require("./objectiveTracker");
const { summarizePerceptionAccuracy } = require("../knowledge/perceptionDiagnostics");
const { average } = require("../tests/testUtils");

const DEFAULT_SEED_COUNT = 20;

function runMvpCalibration(seedCount = DEFAULT_SEED_COUNT, options = {}) {
  const seeds = options.seeds || buildSeeds(seedCount);
  const rows = seeds.map((seed) => compareSeed(seed));
  const report = buildCalibrationReport(rows);
  return report;
}

function compareSeed(seed) {
  const noAction = runScenario(seed, "sem_acoes", () => []);
  const misguided = runScenario(seed, "estrategia_mal_direcionada", createMisguidedStrategy());
  const technical = runScenario(seed, "estrategia_tecnica", createDefaultTechnicalStrategy());

  return {
    seed,
    noAction,
    misguided,
    technical,
    actionScoreDelta: technical.finalEvaluation.score - noAction.finalEvaluation.score,
    informedVsMisguidedScoreDelta: technical.finalEvaluation.score - misguided.finalEvaluation.score,
    actionClassificationChanged: technical.finalEvaluation.classificacao !== noAction.finalEvaluation.classificacao,
  };
}

function createMisguidedStrategy() {
  return function misguidedStrategy(briefing) {
    const healthiestSector = briefing.setores
      .slice()
      .sort((left, right) => right.clima - left.clima || left.rumor - right.rumor)[0];
    const leastUrgentPerson = briefing.funcionariosEmAtencao
      .slice()
      .sort((left, right) => left.riscoSaidaEstimado - right.riscoSaidaEstimado)[0];
    const requests = [];

    if (healthiestSector) {
      requests.push({ tipo: "pesquisa_clima_simples", alvo: { sectorId: healthiestSector.sectorId }, modo: "executar" });
    }
    if (leastUrgentPerson) {
      requests.push({ tipo: "checkin_individual_rapido", alvo: { employeeId: leastUrgentPerson.employeeId }, modo: "executar" });
      requests.push({ tipo: "mapeamento_tarefas_reais", alvo: { employeeId: leastUrgentPerson.employeeId }, modo: "executar" });
    }
    return requests;
  };
}

function runScenario(seed, strategyName, strategyFn) {
  const session = createGameSession(seed);
  const initialMetrics = collectMvpMetrics(session);
  playWeeks(session, session.horizonteSemanas, strategyFn);
  const finalMetrics = collectMvpMetrics(session);
  const actionMetrics = summarizeActionUse(session);
  const directorMetrics = summarizeDirectorImpact(session);
  const perception = summarizePerceptionAccuracy(session.state);
  const finalEvaluation = session.avaliacaoFinal;

  return {
    strategyName,
    status: session.status,
    scenarioId: session.scenario.id,
    weeksPlayed: session.relatoriosSemanais.length,
    initialMetrics,
    finalMetrics,
    actionMetrics,
    directorMetrics,
    perception,
    finalEvaluation,
    problemMovement: summarizeProblemMovement(initialMetrics, finalMetrics),
  };
}

function collectMvpMetrics(session) {
  const state = session.state;
  const objective = summarizeObjectiveMetrics(state);
  const activeEmployees = state.employees.filter((employee) => employee.status !== "desligado");
  const visibleSignals = (state.visibleSignals || []).filter((signal) => signal.visivelParaRH);
  const hiddenSignals = (state.visibleSignals || []).filter((signal) => !signal.visivelParaRH);

  return {
    ...objective,
    funcionariosAtivos: activeEmployees.length,
    funcionariosRiscoCritico: activeEmployees.filter((employee) => employee.riscoDeSaida >= 72).length,
    funcionariosSobrecargaCritica: activeEmployees.filter((employee) => employee.sobrecarga >= 78).length,
    acumuloCritico: activeEmployees.filter((employee) => (employee.indiceAcumuloFuncao || 0) >= 70).length,
    cargaFuncionalMedia: average(activeEmployees.map((employee) => employee.cargaFuncionalTotal || 0)),
    sinaisVisiveis: visibleSignals.length,
    sinaisOcultos: hiddenSignals.length,
    sinaisCompliance: visibleSignals.filter((signal) => signal.tags && signal.tags.includes("compliance")).length,
    eventosCompliance: (state.organizationEvents || []).filter((event) => event.tags && event.tags.includes("compliance")).length,
  };
}

function summarizeActionUse(session) {
  const reports = session.relatoriosSemanais;
  const executed = reports.flatMap((report) => report.acoesExecutadas || []);
  const planned = reports.flatMap((report) => report.acoesPlanejadas || []);
  const rejected = reports.flatMap((report) => report.acoesRejeitadas || []);
  const energySpent = reports.reduce((sum, report) => sum + Math.max(0, report.energiaAntes - report.energiaDepois), 0);

  return {
    weeks: reports.length,
    totalActionsRequested: executed.length + planned.length + rejected.length,
    executedActions: executed.length,
    plannedActions: planned.length,
    rejectedActions: rejected.length,
    actionsPerWeek: reports.length ? (executed.length + planned.length) / reports.length : 0,
    rejectedPerWeek: reports.length ? rejected.length / reports.length : 0,
    energySpent,
    averageEnergySpentPerWeek: reports.length ? energySpent / reports.length : 0,
  };
}

function summarizeDirectorImpact(session) {
  const approvals = session.state.rh.aprovacoesDiretoria || [];
  const denied = approvals.filter((approval) => !approval.aprovada);
  const approved = approvals.filter((approval) => approval.aprovada);

  return {
    requests: approvals.length,
    approved: approved.length,
    denied: denied.length,
    denialRate: approvals.length ? denied.length / approvals.length : 0,
    averageScore: average(approvals.map((approval) => approval.score || 0)),
  };
}

function summarizeProblemMovement(initial, final) {
  return {
    climaDelta: final.climaMedio - initial.climaMedio,
    confiancaRhDelta: final.confiancaRhMedia - initial.confiancaRhMedia,
    riscoSaidaDelta: final.riscoSaidaMedio - initial.riscoSaidaMedio,
    sobrecargaDelta: final.sobrecargaMedia - initial.sobrecargaMedia,
    cargaFuncionalDelta: final.cargaFuncionalMedia - initial.cargaFuncionalMedia,
    riscoCriticoResolvido: Math.max(0, initial.funcionariosRiscoCritico - final.funcionariosRiscoCritico),
    riscoCriticoIgnorado: final.funcionariosRiscoCritico,
    sobrecargaCriticaResolvida: Math.max(0, initial.funcionariosSobrecargaCritica - final.funcionariosSobrecargaCritica),
    sobrecargaCriticaIgnorada: final.funcionariosSobrecargaCritica,
    demandasIgnoradas: final.demandasPendentes,
    denunciasIgnoradas: final.denunciasAbertas,
  };
}

function buildCalibrationReport(rows) {
  const technicalRows = rows.map((row) => row.technical);
  const misguidedRows = rows.map((row) => row.misguided);
  const noActionRows = rows.map((row) => row.noAction);
  const summary = {
    seedCount: rows.length,
    technical: summarizeStrategyRows(technicalRows),
    misguided: summarizeStrategyRows(misguidedRows),
    noAction: summarizeStrategyRows(noActionRows),
    actionImpact: {
      averageScoreDelta: average(rows.map((row) => row.actionScoreDelta)),
      informedVsMisguidedAverageScoreDelta: average(rows.map((row) => row.informedVsMisguidedScoreDelta)),
      improvedScoreFrequency: ratio(rows.filter((row) => row.actionScoreDelta > 0).length, rows.length),
      informedBeatsMisguidedFrequency: ratio(rows.filter((row) => row.informedVsMisguidedScoreDelta > 0).length, rows.length),
      worsenedScoreFrequency: ratio(rows.filter((row) => row.actionScoreDelta < 0).length, rows.length),
      classificationChangeFrequency: ratio(rows.filter((row) => row.actionClassificationChanged).length, rows.length),
    },
    classificationDistribution: countBy(technicalRows.map((row) => row.finalEvaluation.classificacao)),
  };

  const calibrationAlerts = collectMvpCalibrationAlerts(summary);
  return {
    generatedAt: new Date().toISOString(),
    summary,
    calibrationAlerts,
    diagnosis: diagnoseMvp(summary, calibrationAlerts),
    rows,
  };
}

function summarizeStrategyRows(rows) {
  return {
    finalScore: stats(rows.map((row) => row.finalEvaluation.score)),
    finalClimate: stats(rows.map((row) => row.finalMetrics.climaMedio)),
    finalTrustRh: stats(rows.map((row) => row.finalMetrics.confiancaRhMedia)),
    finalTurnover: stats(rows.map((row) => row.finalMetrics.turnoverAcumulado)),
    finalCash: stats(rows.map((row) => row.finalMetrics.caixa)),
    finalFunctionalLoad: stats(rows.map((row) => row.finalMetrics.cargaFuncionalMedia)),
    finalPendingDemands: stats(rows.map((row) => row.finalMetrics.demandasPendentes)),
    finalOpenReports: stats(rows.map((row) => row.finalMetrics.denunciasAbertas)),
    finalVisibleSignals: stats(rows.map((row) => row.finalMetrics.sinaisVisiveis)),
    finalHiddenSignals: stats(rows.map((row) => row.finalMetrics.sinaisOcultos)),
    complianceSignals: stats(rows.map((row) => row.finalMetrics.sinaisCompliance)),
    complianceEvents: stats(rows.map((row) => row.finalMetrics.eventosCompliance)),
    actionsPerWeek: stats(rows.map((row) => row.actionMetrics.actionsPerWeek)),
    averageEnergySpentPerWeek: stats(rows.map((row) => row.actionMetrics.averageEnergySpentPerWeek)),
    rejectedActionsPerWeek: stats(rows.map((row) => row.actionMetrics.rejectedPerWeek)),
    directorRequests: stats(rows.map((row) => row.directorMetrics.requests)),
    directorDenialRate: average(rows.map((row) => row.directorMetrics.denialRate)),
    falseNegativeHighRisk: stats(rows.map((row) => row.perception.highRiskFalseNegativeCount)),
    falsePositiveHighRisk: stats(rows.map((row) => row.perception.highRiskFalsePositiveCount)),
    hiddenOverload: stats(rows.map((row) => row.perception.overloadedHiddenCount)),
    perceptionRiskError: stats(rows.map((row) => row.perception.exitRiskErrorAverage)),
    problemMovement: {
      riskResolved: stats(rows.map((row) => row.problemMovement.riscoCriticoResolvido)),
      riskIgnored: stats(rows.map((row) => row.problemMovement.riscoCriticoIgnorado)),
      overloadResolved: stats(rows.map((row) => row.problemMovement.sobrecargaCriticaResolvida)),
      overloadIgnored: stats(rows.map((row) => row.problemMovement.sobrecargaCriticaIgnorada)),
      pendingDemandsIgnored: stats(rows.map((row) => row.problemMovement.demandasIgnoradas)),
      reportsIgnored: stats(rows.map((row) => row.problemMovement.denunciasIgnoradas)),
    },
  };
}

function collectMvpCalibrationAlerts(summary) {
  const alerts = [];
  const score = summary.technical.finalScore.average;
  const noActionScore = summary.noAction.finalScore.average;
  const crisisHumanShare = ratio(summary.classificationDistribution["crise humana"] || 0, summary.seedCount);
  const stableShare = ratio(summary.classificationDistribution.estavel || 0, summary.seedCount);

  if (score < 35) alerts.push("MVP_DIFICIL_DEMAIS: score medio final abaixo de 35");
  if (score > 82 && crisisHumanShare < 0.2) alerts.push("MVP_FACIL_DEMAIS: score medio final alto e poucas crises humanas");
  if (stableShare > 0.85) alerts.push("MVP_ESTAVEL_DEMAIS: mais de 85% das campanhas terminam estaveis");
  if (summary.technical.finalClimate.average < 35) alerts.push("CLIMA_COLAPSA_DEMAIS: clima medio final abaixo de 35");
  if (summary.technical.finalTurnover.average > 8) alerts.push("TURNOVER_ALTO_DEMAIS: turnover medio acima de 8");
  if (summary.technical.finalCash.average < 0) alerts.push("FINANCEIRO_COLAPSA_DEMAIS: caixa medio final negativo");
  if (summary.technical.actionsPerWeek.average < 1) alerts.push("ACOES_ESCASSAS: estrategia usa menos de uma acao por semana");
  if (summary.technical.averageEnergySpentPerWeek.average < 1.5) alerts.push("ENERGIA_SOBRANDO_DEMAIS: gasto medio de energia baixo");
  if (summary.technical.rejectedActionsPerWeek.average > 1) alerts.push("REJEICOES_EXCESSIVAS: muitas acoes rejeitadas por semana");
  if (summary.actionImpact.averageScoreDelta < 2 && summary.actionImpact.improvedScoreFrequency < 0.55) {
    alerts.push("ACOES_IMPORTAM_POUCO: estrategia tecnica quase nao melhora o resultado contra nenhuma acao");
  }
  if (Math.abs(score - noActionScore) < 2 && summary.actionImpact.classificationChangeFrequency < 0.15) {
    alerts.push("JOGO_PARADO_DEMAIS: resultado com e sem acoes e parecido");
  }
  if (summary.technical.falseNegativeHighRisk.average < 0.2 && summary.technical.hiddenOverload.average < 0.2) {
    alerts.push("INFORMACAO_IMPERFEITA_FRACA: poucos problemas importantes ficam ocultos");
  }
  if (summary.technical.falseNegativeHighRisk.average > 5) {
    alerts.push("INFORMACAO_IMPERFEITA_PUNITIVA: muitos riscos altos passam despercebidos");
  }
  if (summary.technical.directorRequests.average > 0 && summary.technical.directorDenialRate > 0.75) {
    alerts.push("DIRETORIA_BLOQUEIA_DEMAIS: taxa de negativas acima de 75%");
  }
  return alerts;
}

function diagnoseMvp(summary, alerts) {
  if (!alerts.length) return "MVP_CALIBRAGEM_INICIAL_OK";
  if (alerts.some((alert) => alert.includes("DIFICIL") || alert.includes("COLAPSA"))) return "MVP_DIFICIL_OU_INSTAVEL";
  if (alerts.some((alert) => alert.includes("FACIL") || alert.includes("PARADO"))) return "MVP_FACIL_OU_PARADO";
  if (alerts.some((alert) => alert.includes("ACOES_IMPORTAM"))) return "ACOES_COM_IMPACTO_FRACO";
  if (alerts.some((alert) => alert.includes("INFORMACAO_IMPERFEITA"))) return "INFORMACAO_IMPERFEITA_DESBALANCEADA";
  return "MVP_REQUER_AJUSTES";
}

function buildSeeds(seedCount) {
  return Array.from({ length: seedCount }, (_, index) => `RH-MVP-CALIB-${String(index + 1).padStart(3, "0")}`);
}

function stats(values) {
  return {
    average: average(values),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function ratio(part, total) {
  return total ? part / total : 0;
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

module.exports = {
  DEFAULT_SEED_COUNT,
  runMvpCalibration,
  compareSeed,
  runScenario,
  createMisguidedStrategy,
};
