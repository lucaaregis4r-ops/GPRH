/**
 * Modulo: calibrationReport
 * Responsabilidade: avaliar estatisticamente a engine procedural em muitas seeds.
 * Entrada: quantidade de seeds via linha de comando
 * Saida: relatorio agregado no console e JSON em src/debug/output
 * Nao deve: criar UI, gameplay, acoes do RH, campanha ou expandir CBO.
 */

const fs = require("fs");
const path = require("path");
const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { average, collectCoherenceAlerts, collectRangeAlerts } = require("../tests/testUtils");
const { summarizePerceptionAccuracy } = require("../knowledge/perceptionDiagnostics");

const DEFAULT_SEED_COUNT = 100;
const DEFAULT_SIMULATED_DAYS = 30;

function runCalibrationReport(seedCount = DEFAULT_SEED_COUNT, simulatedDays = DEFAULT_SIMULATED_DAYS) {
  const rows = [];

  for (let index = 1; index <= seedCount; index += 1) {
    const seed = `RH-CALIB-${simulatedDays}D-${String(index).padStart(3, "0")}`;
    const state = createProceduralRHSimulation(seed);
    const initial = summarizeState(state);
    const initialAlerts = [...collectRangeAlerts(state), ...collectCoherenceAlerts(state)];
    const cashInitial = state.economy.caixaAtual;
    const initialCriticalSatisfactionRatio =
      state.employees.filter((employee) => employee.satisfacao < 30).length / state.employees.length;

    advanceDays(state, simulatedDays);

    const final = summarizeState(state);
    const perceptionAccuracy = summarizePerceptionAccuracy(state);
    const finalAlerts = [...collectRangeAlerts(state), ...collectCoherenceAlerts(state)];
    const crisis = state.history.some((event) => event.type === "economic_event");

    rows.push({
      seed,
      companyName: state.company.nome,
      archetype: state.company.arquetipo,
      segment: state.company.setorEconomico,
      employeeCount: state.employees.length,
      sectorCount: state.sectors.length,
      initial,
      final,
      cashInitial,
      cashFinal: state.economy.caixaAtual,
      accumulatedInflation: state.economy.inflacaoAcumulada,
      crisis,
      negativeCash: state.economy.caixaAtual < 0,
      criticalRiskEmployeeRatio:
        state.employees.filter((employee) => employee.riscoDeSaida > 75).length / state.employees.length,
      initialCriticalSatisfactionRatio,
      criticalClimate: final.climateAverage < 30,
      relationshipCount: state.relationships.length,
      organizationEventCount: state.organizationEvents.length,
      individualMemoryCount: state.employees.reduce((sum, employee) => sum + employee.memorias.length, 0),
      eventTypes: state.organizationEvents.map((event) => event.tipo),
      individualMemoryTypes: state.employees.flatMap((employee) => employee.memorias.map((memory) => memory.tipo)),
      averageFunctionalAccumulation: average(state.employees.map((employee) => employee.indiceAcumuloFuncao || 0)),
      averageFunctionalDeviation: average(state.employees.map((employee) => employee.indiceDesvioFuncao || 0)),
      averageInvisibleWork: average(state.employees.map((employee) => employee.trabalhoInvisivel || 0)),
      criticalFunctionalOverloadRatio: calculateCriticalFunctionalOverloadRatio(state),
      entryCount: state.organizationEvents.filter((event) => event.tipo === "novo_funcionario").length,
      functionalRedistributionCount: state.organizationEvents.filter(
        (event) => event.tipo === "redistribuicao_funcional_pos_saida"
      ).length,
      informalFunctionCount: state.organizationEvents.filter((event) => event.tipo === "funcao_informal_assumida").length,
      complianceEventCount: state.organizationEvents.filter((event) => event.tags && event.tags.includes("compliance")).length,
      reportCaseCount: state.reportCases.length,
      underReportedCount: state.complianceState ? state.complianceState.underReportedEvents : 0,
      retaliationEventCount: state.organizationEvents.filter((event) => event.tipo === "retaliacao_pos_denuncia").length,
      averageChannelTrust: state.company.compliance ? state.company.compliance.confiancaNoCanal : 0,
      averagePsychologicalSafety: average(state.sectors.map((sector) => sector.psychologicalSafety || 0)),
      perceptionAccuracy,
      multiMemoryEventRatio: calculateMultiMemoryEventRatio(state),
      averageResidualImpact: calculateAverageResidualImpact(state),
      visibleIndividualMemoryCount: state.employees.reduce(
        (sum, employee) => sum + employee.memorias.filter((memory) => memory.visivelParaRH).length,
        0
      ),
      hiddenIndividualMemoryCount: state.employees.reduce(
        (sum, employee) => sum + employee.memorias.filter((memory) => !memory.visivelParaRH).length,
        0
      ),
      visibleSignalCount: (state.visibleSignals || []).filter((signal) => signal.visivelParaRH).length,
      hiddenSignalCount: (state.visibleSignals || []).filter((signal) => !signal.visivelParaRH).length,
      averageSignalReliability: average((state.visibleSignals || []).map((signal) => signal.confiabilidade)),
      visibleSignalTypes: (state.visibleSignals || [])
        .filter((signal) => signal.visivelParaRH)
        .map((signal) => signal.tipo),
      actionCount: state.acoesFuncionarios.length,
      askConversationCount: countActions(state, "pedir_conversa"),
      searchJobCount: countActions(state, "procurar_vaga"),
      externalOfferCount: countActions(state, "receber_proposta_externa"),
      resignationCount: countActions(state, "pedir_demissao"),
      turnoverCount: state.company.turnoverAcumulado,
      externalSearchEmployees: state.employees.filter(
        (employee) => employee.status !== "desligado" && employee.estadoDeBuscaExterna
      ).length,
      pendingDemandCount: state.employees.reduce((sum, employee) => sum + employee.demandasPendentes.length, 0),
      alerts: [...initialAlerts, ...finalAlerts],
    });
  }

  const report = buildReport(rows, simulatedDays);
  printReport(report);
  writeReportJson(report, seedCount, simulatedDays);
  return report;
}

function summarizeState(state) {
  return {
    satisfactionAverage: average(state.employees.map((employee) => employee.satisfacao)),
    fearAverage: average(state.employees.map((employee) => employee.medo)),
    climateAverage: average(state.sectors.map((sector) => sector.climaSetor)),
    exitRiskAverage: average(state.employees.map((employee) => employee.riscoDeSaida)),
  };
}

function buildReport(rows, simulatedDays) {
  const seedCount = rows.length;
  const totalEmployees = rows.reduce((sum, row) => sum + row.employeeCount, 0);
  const totalCriticalRiskEmployees = rows.reduce(
    (sum, row) => sum + Math.round(row.criticalRiskEmployeeRatio * row.employeeCount),
    0
  );
  const rowsWithoutCrisis = rows.filter((row) => !row.crisis);
  const fastDeteriorationWithoutCrisis = rowsWithoutCrisis.filter(
    (row) => row.initial.satisfactionAverage - row.final.satisfactionAverage > 20
  );

  const summary = {
    seedCount,
    alertCount: rows.reduce((sum, row) => sum + row.alerts.length, 0),
    archetypeDistribution: countBy(rows, "archetype"),
    segmentDistribution: countBy(rows, "segment"),
    employees: stats(rows.map((row) => row.employeeCount)),
    sectors: stats(rows.map((row) => row.sectorCount)),
    initialSatisfaction: stats(rows.map((row) => row.initial.satisfactionAverage)),
    finalSatisfaction: stats(rows.map((row) => row.final.satisfactionAverage)),
    initialFear: stats(rows.map((row) => row.initial.fearAverage)),
    finalFear: stats(rows.map((row) => row.final.fearAverage)),
    initialClimate: stats(rows.map((row) => row.initial.climateAverage)),
    finalClimate: stats(rows.map((row) => row.final.climateAverage)),
    initialExitRisk: stats(rows.map((row) => row.initial.exitRiskAverage)),
    finalExitRisk: stats(rows.map((row) => row.final.exitRiskAverage)),
    initialCash: stats(rows.map((row) => row.cashInitial)),
    finalCash: stats(rows.map((row) => row.cashFinal)),
    accumulatedInflation: stats(rows.map((row) => row.accumulatedInflation)),
    crisisFrequency: ratio(rows.filter((row) => row.crisis).length, seedCount),
    negativeCashFrequency: ratio(rows.filter((row) => row.negativeCash).length, seedCount),
    criticalRiskEmployeeFrequency: ratio(totalCriticalRiskEmployees, totalEmployees),
    criticalClimateFrequency: ratio(rows.filter((row) => row.criticalClimate).length, seedCount),
    averageRelationships: average(rows.map((row) => row.relationshipCount)),
    averageOrganizationEvents: average(rows.map((row) => row.organizationEventCount)),
    averageIndividualMemories: average(rows.map((row) => row.individualMemoryCount)),
    averageIndividualMemoriesPerEmployee:
      rows.reduce((sum, row) => sum + row.individualMemoryCount, 0) /
      rows.reduce((sum, row) => sum + row.employeeCount, 0),
    averageIndividualMemoriesPerEvent:
      rows.reduce((sum, row) => sum + row.individualMemoryCount, 0) /
      Math.max(1, rows.reduce((sum, row) => sum + row.organizationEventCount, 0)),
    averageVisibleIndividualMemories: average(rows.map((row) => row.visibleIndividualMemoryCount)),
    averageHiddenIndividualMemories: average(rows.map((row) => row.hiddenIndividualMemoryCount)),
    averageVisibleSignals: average(rows.map((row) => row.visibleSignalCount)),
    averageHiddenSignals: average(rows.map((row) => row.hiddenSignalCount)),
    averageSignalReliability: average(rows.map((row) => row.averageSignalReliability)),
    commonVisibleSignalTypes: topTypes(rows.flatMap((row) => row.visibleSignalTypes || [])),
    commonEventTypes: topTypes(rows.flatMap((row) => row.eventTypes || [])),
    commonIndividualMemoryTypes: topTypes(rows.flatMap((row) => row.individualMemoryTypes || [])),
    averageFunctionalAccumulation: average(rows.map((row) => row.averageFunctionalAccumulation)),
    averageFunctionalDeviation: average(rows.map((row) => row.averageFunctionalDeviation)),
    averageInvisibleWork: average(rows.map((row) => row.averageInvisibleWork)),
    criticalFunctionalOverloadFrequency: average(rows.map((row) => row.criticalFunctionalOverloadRatio)),
    averageEntries: average(rows.map((row) => row.entryCount)),
    averageFunctionalRedistributions: average(rows.map((row) => row.functionalRedistributionCount)),
    averageInformalFunctions: average(rows.map((row) => row.informalFunctionCount)),
    averageComplianceEvents: average(rows.map((row) => row.complianceEventCount)),
    averageReportCases: average(rows.map((row) => row.reportCaseCount)),
    averageUnderReportedEvents: average(rows.map((row) => row.underReportedCount)),
    averageRetaliationEvents: average(rows.map((row) => row.retaliationEventCount)),
    averageChannelTrust: average(rows.map((row) => row.averageChannelTrust)),
    averagePsychologicalSafety: average(rows.map((row) => row.averagePsychologicalSafety)),
    perceptionSatisfactionError: average(rows.map((row) => row.perceptionAccuracy.satisfactionErrorAverage)),
    perceptionExitRiskError: average(rows.map((row) => row.perceptionAccuracy.exitRiskErrorAverage)),
    perceptionOverloadError: average(rows.map((row) => row.perceptionAccuracy.overloadErrorAverage)),
    perceptionConfidence: average(rows.map((row) => row.perceptionAccuracy.confidenceAverage)),
    averageHighRiskFalseNegatives: average(rows.map((row) => row.perceptionAccuracy.highRiskFalseNegativeCount)),
    averageOverloadedHidden: average(rows.map((row) => row.perceptionAccuracy.overloadedHiddenCount)),
    multiMemoryEventFrequency: average(rows.map((row) => row.multiMemoryEventRatio)),
    averageResidualImpact: average(rows.map((row) => row.averageResidualImpact)),
    averageActions: average(rows.map((row) => row.actionCount)),
    askConversationFrequency: ratio(rows.filter((row) => row.askConversationCount > 0).length, seedCount),
    searchJobFrequency: ratio(rows.filter((row) => row.searchJobCount > 0).length, seedCount),
    externalOfferFrequency: ratio(rows.filter((row) => row.externalOfferCount > 0).length, seedCount),
    resignationFrequency: ratio(rows.filter((row) => row.resignationCount > 0).length, seedCount),
    averageTurnover: average(rows.map((row) => row.turnoverCount)),
    averageExternalSearchEmployees: average(rows.map((row) => row.externalSearchEmployees)),
    averagePendingDemands: average(rows.map((row) => row.pendingDemandCount)),
    fastDeteriorationWithoutCrisisFrequency: ratio(fastDeteriorationWithoutCrisis.length, rowsWithoutCrisis.length || 1),
    initialCriticalSatisfactionFrequency: average(rows.map((row) => row.initialCriticalSatisfactionRatio)),
  };

  const calibrationAlerts = collectCalibrationAlerts(summary, simulatedDays);
  const generalDiagnosis = diagnose(summary, calibrationAlerts);

  return {
    generatedAt: new Date().toISOString(),
    simulatedDays,
    summary,
    calibrationAlerts,
    generalDiagnosis,
    rows,
  };
}

function collectCalibrationAlerts(summary, simulatedDays) {
  const alerts = [];
  const archetypeShareMax = maxShare(summary.archetypeDistribution, summary.seedCount);
  const segmentShareMax = maxShare(summary.segmentDistribution, summary.seedCount);
  const longRunMultiplier = Math.max(1, simulatedDays / 30);

  if (summary.criticalClimateFrequency > 0.3) {
    alerts.push("CLIMA_CRITICO_EXCESSIVO: mais de 30% das empresas terminam com clima abaixo de 30");
  }

  if (summary.criticalRiskEmployeeFrequency > 0.4) {
    alerts.push("RISCO_SAIDA_EXCESSIVO: mais de 40% dos funcionarios terminam com risco de saida acima de 75");
  }

  if (simulatedDays <= 30 && summary.fastDeteriorationWithoutCrisisFrequency > 0.2) {
    alerts.push("DETERIORACAO_RAPIDA: satisfacao cai mais de 20 pontos em muitas empresas sem crise");
  }

  if (summary.negativeCashFrequency > 0.05) {
    alerts.push("CAIXA_NEGATIVO_FREQUENTE: caixa negativo aparece em mais de 5% da amostra");
  }

  if (summary.accumulatedInflation.max > 0.04 * longRunMultiplier) {
    alerts.push(`INFLACAO_EXTREMA: inflacao acumulada passou do limite esperado para ${simulatedDays} dias`);
  }

  if (archetypeShareMax > 0.45 || segmentShareMax > 0.55) {
    alerts.push("POUCA_VARIACAO: distribuicao concentrada demais em arquetipo ou segmento");
  }

  if (summary.initialCriticalSatisfactionFrequency > 0.12) {
    alerts.push("SATISFACAO_INICIAL_CRITICA: muitos funcionarios nascem com satisfacao abaixo de 30");
  }

  const crisisLimit = simulatedDays <= 30 ? 0.25 : simulatedDays <= 90 ? 0.6 : 0.85;
  if (summary.crisisFrequency > crisisLimit) {
    alerts.push(`CRISE_EXCESSIVA: frequencia de crises alta demais para ${simulatedDays} dias`);
  }

  if (simulatedDays <= 30 && summary.averageTurnover > 0.1) {
    alerts.push("TURNOVER_30_DIAS_ALTO: pedidos de demissao aparecem cedo demais");
  }

  if (summary.averageActions < Math.max(1, simulatedDays / 20)) {
    alerts.push("AGENTES_PASSIVOS_DEMAIS: quase nao ha acoes autonomas");
  }

  if (summary.searchJobFrequency > 0.8) {
    alerts.push("BUSCA_EXTERNA_EXCESSIVA: quase todas as empresas tem funcionarios procurando vaga");
  }

  if (summary.averageVisibleSignals < Math.max(2, simulatedDays / 18)) {
    alerts.push("SINAIS_VISIVEIS_ESCASSOS: RH quase nao recebe sinais observaveis");
  }

  if (summary.averageHiddenSignals < summary.averageVisibleSignals * 0.2) {
    alerts.push("INFORMACAO_IMPERFEITA_FRACA: poucos sinais ficam ocultos para auditoria");
  }

  if (summary.criticalFunctionalOverloadFrequency > 0.35) {
    alerts.push("SOBRECARGA_FUNCIONAL_EXCESSIVA: muitos funcionarios terminam com risco funcional critico");
  }

  if (summary.perceptionExitRiskError < 6 && summary.perceptionOverloadError < 6) {
    alerts.push("RH_ONISCIENTE_DEMAIS: percepcao esta proxima demais do estado real");
  }

  if (summary.averageHighRiskFalseNegatives > 2) {
    alerts.push("RISCO_OCULTO_EXCESSIVO: muitos funcionarios em risco alto passam despercebidos");
  }

  if (simulatedDays >= 90 && summary.averageComplianceEvents > 8) {
    alerts.push("RISCO_COMPLIANCE_EXCESSIVO: eventos psicossociais aparecem em excesso");
  }

  if (summary.averageReportCases > 0 && summary.averageUnderReportedEvents / summary.averageReportCases > 6) {
    alerts.push("SUBNOTIFICACAO_EXCESSIVA: poucos eventos psicossociais chegam ao canal");
  }

  if (simulatedDays <= 90 && summary.resignationFrequency > 0.35) {
    alerts.push("DEMISSAO_EXCESSIVA: pedidos de demissao frequentes demais para o horizonte");
  }

  return alerts;
}

function diagnose(summary, calibrationAlerts) {
  if (!calibrationAlerts.length) return "CALIBRAGEM_INICIAL_OK";
  if (calibrationAlerts.some((alert) => alert.startsWith("CAIXA_NEGATIVO") || alert.startsWith("INFLACAO"))) {
    return "FINANCEIRO_AGRESSIVO_DEMAIS";
  }
  if (calibrationAlerts.some((alert) => alert.startsWith("CRISE_EXCESSIVA"))) return "CRISE_EXCESSIVA";
  if (calibrationAlerts.some((alert) => alert.startsWith("TURNOVER") || alert.startsWith("DEMISSAO"))) {
    return "TURNOVER_AGRESSIVO_DEMAIS";
  }
  if (calibrationAlerts.some((alert) => alert.startsWith("POUCA_VARIACAO"))) return "POUCA_VARIACAO";
  if (calibrationAlerts.some((alert) => alert.startsWith("DETERIORACAO_RAPIDA"))) return "DETERIORACAO_RAPIDA";
  if (summary.criticalClimateFrequency > 0.3 || summary.criticalRiskEmployeeFrequency > 0.4) return "INSTAVEL";
  return "ESTAVEL";
}

function printReport(report) {
  const { summary } = report;

  console.log("\nRELATORIO_DE_CALIBRAGEM");
  console.log(`Seeds analisadas: ${summary.seedCount}`);
  console.log(`Dias simulados por seed: ${report.simulatedDays}`);
  console.log(`Quantidade de alertas estruturais: ${summary.alertCount}`);
  console.log("");

  console.log("DISTRIBUICAO_DE_ARQUETIPOS");
  printDistribution(summary.archetypeDistribution);
  console.log("");

  console.log("DISTRIBUICAO_DE_SEGMENTOS");
  printDistribution(summary.segmentDistribution);
  console.log("");

  console.log("ESTATISTICAS_GERAIS");
  printStats("Funcionarios", summary.employees, 0);
  printStats("Setores", summary.sectors, 0);
  printStats("Satisfacao inicial", summary.initialSatisfaction, 1);
  printStats("Satisfacao final", summary.finalSatisfaction, 1);
  printStats("Medo inicial", summary.initialFear, 1);
  printStats("Medo final", summary.finalFear, 1);
  printStats("Clima inicial", summary.initialClimate, 1);
  printStats("Clima final", summary.finalClimate, 1);
  printStats("Risco de saida inicial", summary.initialExitRisk, 1);
  printStats("Risco de saida final", summary.finalExitRisk, 1);
  printStats("Caixa inicial", summary.initialCash, 0, true);
  printStats("Caixa final", summary.finalCash, 0, true);
  printStats("Inflacao acumulada", summary.accumulatedInflation, 4, false, true);
  console.log(`Frequencia de crises: ${formatRatio(summary.crisisFrequency)}`);
  console.log(`Frequencia de caixa negativo: ${formatRatio(summary.negativeCashFrequency)}`);
  console.log(`Frequencia de funcionarios em risco critico: ${formatRatio(summary.criticalRiskEmployeeFrequency)}`);
  console.log(`Frequencia de clima critico: ${formatRatio(summary.criticalClimateFrequency)}`);
  console.log(`Quantidade media de relacoes: ${summary.averageRelationships.toFixed(1)}`);
  console.log(`Quantidade media de eventos organizacionais: ${summary.averageOrganizationEvents.toFixed(1)}`);
  console.log(`Quantidade media de memorias individuais: ${summary.averageIndividualMemories.toFixed(1)}`);
  console.log(`Memorias individuais por funcionario: ${summary.averageIndividualMemoriesPerEmployee.toFixed(2)}`);
  console.log(`Memorias individuais por evento: ${summary.averageIndividualMemoriesPerEvent.toFixed(2)}`);
  console.log(`Memorias individuais visiveis ao RH: ${summary.averageVisibleIndividualMemories.toFixed(1)}`);
  console.log(`Memorias individuais ocultas: ${summary.averageHiddenIndividualMemories.toFixed(1)}`);
  console.log(`Sinais visiveis ao RH: ${summary.averageVisibleSignals.toFixed(1)}`);
  console.log(`Sinais ocultos/debug: ${summary.averageHiddenSignals.toFixed(1)}`);
  console.log(`Confiabilidade media dos sinais: ${summary.averageSignalReliability.toFixed(1)}`);
  console.log(`Eventos com memoria em mais de uma pessoa: ${formatRatio(summary.multiMemoryEventFrequency)}`);
  console.log(`Impacto residual medio das memorias: ${summary.averageResidualImpact.toFixed(3)}`);
  console.log(`Tipos comuns de sinais visiveis: ${formatTopTypes(summary.commonVisibleSignalTypes)}`);
  console.log(`Tipos comuns de eventos: ${formatTopTypes(summary.commonEventTypes)}`);
  console.log(`Tipos comuns de memorias individuais: ${formatTopTypes(summary.commonIndividualMemoryTypes)}`);
  console.log(`Acumulo funcional medio: ${summary.averageFunctionalAccumulation.toFixed(1)}`);
  console.log(`Desvio funcional medio: ${summary.averageFunctionalDeviation.toFixed(1)}`);
  console.log(`Trabalho invisivel medio: ${summary.averageInvisibleWork.toFixed(1)}`);
  console.log(`Frequencia de sobrecarga funcional critica: ${formatRatio(summary.criticalFunctionalOverloadFrequency)}`);
  console.log(`Entradas medias: ${summary.averageEntries.toFixed(2)}`);
  console.log(`Redistribuicoes funcionais medias: ${summary.averageFunctionalRedistributions.toFixed(2)}`);
  console.log(`Funcoes informais medias: ${summary.averageInformalFunctions.toFixed(2)}`);
  console.log(`Eventos compliance medios: ${summary.averageComplianceEvents.toFixed(2)}`);
  console.log(`Denuncias medias: ${summary.averageReportCases.toFixed(2)}`);
  console.log(`Subnotificacoes medias: ${summary.averageUnderReportedEvents.toFixed(2)}`);
  console.log(`Retaliacoes suspeitas medias: ${summary.averageRetaliationEvents.toFixed(2)}`);
  console.log(`Confianca media no canal: ${summary.averageChannelTrust.toFixed(1)}`);
  console.log(`Seguranca psicologica media: ${summary.averagePsychologicalSafety.toFixed(1)}`);
  console.log(`Erro medio percepcao RH - satisfacao: ${summary.perceptionSatisfactionError.toFixed(1)}`);
  console.log(`Erro medio percepcao RH - risco saida: ${summary.perceptionExitRiskError.toFixed(1)}`);
  console.log(`Erro medio percepcao RH - sobrecarga: ${summary.perceptionOverloadError.toFixed(1)}`);
  console.log(`Confianca media da percepcao RH: ${summary.perceptionConfidence.toFixed(1)}`);
  console.log(`Falsos negativos de alto risco por empresa: ${summary.averageHighRiskFalseNegatives.toFixed(2)}`);
  console.log(`Sobrecargas ocultas por empresa: ${summary.averageOverloadedHidden.toFixed(2)}`);
  console.log(`Quantidade media de acoes autonomas: ${summary.averageActions.toFixed(1)}`);
  console.log(`Frequencia de pedidos de conversa: ${formatRatio(summary.askConversationFrequency)}`);
  console.log(`Frequencia de procura de vaga: ${formatRatio(summary.searchJobFrequency)}`);
  console.log(`Frequencia de proposta externa: ${formatRatio(summary.externalOfferFrequency)}`);
  console.log(`Frequencia de pedidos de demissao: ${formatRatio(summary.resignationFrequency)}`);
  console.log(`Turnover medio: ${summary.averageTurnover.toFixed(2)}`);
  console.log(`Funcionarios em busca externa media: ${summary.averageExternalSearchEmployees.toFixed(1)}`);
  console.log(`Demandas pendentes medias: ${summary.averagePendingDemands.toFixed(1)}`);
  console.log("");

  console.log("ALERTAS_DE_CALIBRAGEM");
  if (report.calibrationAlerts.length) {
    report.calibrationAlerts.forEach((alert) => console.log(`- ${alert}`));
  } else {
    console.log("- nenhum alerta de calibragem");
  }
  console.log("");

  console.log("DIAGNOSTICO_GERAL");
  console.log(report.generalDiagnosis);
}

function writeReportJson(report, seedCount, simulatedDays) {
  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `calibration-${seedCount}-seeds-${simulatedDays}-days.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nArquivo JSON gerado: ${path.relative(process.cwd(), filePath)}`);
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    counts[row[key]] = (counts[row[key]] || 0) + 1;
    return counts;
  }, {});
}

function countActions(state, actionType) {
  return state.acoesFuncionarios.filter((action) => action.tipo === actionType).length;
}

function calculateCriticalFunctionalOverloadRatio(state) {
  const active = state.employees.filter((employee) => employee.status !== "desligado");
  if (!active.length) return 0;
  return active.filter((employee) => employee.riscoPorSobrecargaFuncional > 75).length / active.length;
}

function calculateMultiMemoryEventRatio(state) {
  const eventIds = state.organizationEvents.map((event) => event.id);
  if (!eventIds.length) return 0;
  const eventsWithMultipleMemories = eventIds.filter((eventId) => {
    const count = state.employees.reduce(
      (sum, employee) => sum + employee.memorias.filter((memory) => memory.origemEventoId === eventId).length,
      0
    );
    return count > 1;
  }).length;
  return eventsWithMultipleMemories / eventIds.length;
}

function calculateAverageResidualImpact(state) {
  const residualValues = state.employees.flatMap((employee) =>
    employee.memorias.flatMap((memory) => Object.values(memory.impactoResidual || {}).map((value) => Math.abs(value)))
  );
  return residualValues.length ? average(residualValues) : 0;
}

function topTypes(types, limit = 5) {
  const counts = types.reduce((map, type) => {
    map[type] = (map[type] || 0) + 1;
    return map;
  }, {});
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([type, count]) => ({ type, count }));
}

function formatTopTypes(items) {
  if (!items.length) return "nenhum";
  return items.map((item) => `${item.type} (${item.count})`).join(", ");
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

function maxShare(distribution, total) {
  const max = Math.max(...Object.values(distribution));
  return ratio(max, total);
}

function printDistribution(distribution) {
  Object.entries(distribution)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => console.log(`- ${key}: ${value}`));
}

function printStats(label, value, digits, money = false, percent = false) {
  const formatter = (number) => {
    if (money) return formatMoney(number);
    if (percent) return `${(number * 100).toFixed(2)}%`;
    return number.toFixed(digits);
  };

  console.log(`${label}: media ${formatter(value.average)} | min ${formatter(value.min)} | max ${formatter(value.max)}`);
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRatio(value) {
  return `${(value * 100).toFixed(1)}%`;
}

if (require.main === module) {
  const requestedCount = Number.parseInt(process.argv[2], 10);
  const requestedDays = Number.parseInt(process.argv[3], 10);
  runCalibrationReport(
    Number.isFinite(requestedCount) ? requestedCount : DEFAULT_SEED_COUNT,
    Number.isFinite(requestedDays) ? requestedDays : DEFAULT_SIMULATED_DAYS
  );
}

module.exports = {
  runCalibrationReport,
};
