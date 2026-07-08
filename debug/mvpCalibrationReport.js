/**
 * Modulo: mvpCalibrationReport
 * Responsabilidade: gerar relatorio de calibragem do MVP jogavel semanal.
 * Entrada: quantidade de seeds via linha de comando
 * Saida: resumo no console e JSON em src/debug/output
 * Nao deve: alterar regras da simulacao.
 */

const fs = require("fs");
const path = require("path");
const { runMvpCalibration } = require("../game/mvpCalibration");

function runMvpCalibrationReport(seedCount = 20) {
  const report = runMvpCalibration(seedCount);
  printReport(report);
  writeReportJson(report, seedCount);
  return report;
}

function printReport(report) {
  const { summary } = report;
  console.log("\nRELATORIO_CALIBRAGEM_MVP_JOGAVEL");
  console.log(`Seeds analisadas: ${summary.seedCount}`);
  console.log(`Diagnostico: ${report.diagnosis}`);
  console.log("");

  console.log("RESULTADO_FINAL_COM_ESTRATEGIA");
  printStats("Score", summary.technical.finalScore, 1);
  printStats("Clima", summary.technical.finalClimate, 1);
  printStats("Confianca RH", summary.technical.finalTrustRh, 1);
  printStats("Turnover", summary.technical.finalTurnover, 1);
  printStats("Carga funcional", summary.technical.finalFunctionalLoad, 1);
  printStats("Demandas pendentes", summary.technical.finalPendingDemands, 1);
  printStats("Denuncias abertas", summary.technical.finalOpenReports, 1);
  console.log("");

  console.log("ACOES_E_ENERGIA");
  printStats("Acoes por semana", summary.technical.actionsPerWeek, 2);
  printStats("Energia gasta por semana", summary.technical.averageEnergySpentPerWeek, 2);
  printStats("Rejeicoes por semana", summary.technical.rejectedActionsPerWeek, 2);
  printStats("Pedidos a diretoria", summary.technical.directorRequests, 2);
  console.log(`Taxa media de negativas da diretoria: ${(summary.technical.directorDenialRate * 100).toFixed(1)}%`);
  console.log("");

  console.log("INFORMACAO_IMPERFEITA");
  printStats("Falsos negativos alto risco", summary.technical.falseNegativeHighRisk, 2);
  printStats("Falsos positivos alto risco", summary.technical.falsePositiveHighRisk, 2);
  printStats("Sobrecargas ocultas", summary.technical.hiddenOverload, 2);
  printStats("Erro percepcao risco", summary.technical.perceptionRiskError, 1);
  printStats("Sinais visiveis", summary.technical.finalVisibleSignals, 1);
  printStats("Sinais ocultos", summary.technical.finalHiddenSignals, 1);
  console.log("");

  console.log("ACOES_IMPORTAM");
  console.log(`Delta medio de score contra sem acoes: ${summary.actionImpact.averageScoreDelta.toFixed(1)}`);
  console.log(`Frequencia de melhora: ${(summary.actionImpact.improvedScoreFrequency * 100).toFixed(1)}%`);
  console.log(`Frequencia de piora: ${(summary.actionImpact.worsenedScoreFrequency * 100).toFixed(1)}%`);
  console.log(`Mudanca de classificacao: ${(summary.actionImpact.classificationChangeFrequency * 100).toFixed(1)}%`);
  console.log("");

  console.log("DISTRIBUICAO_DE_CLASSIFICACOES");
  Object.entries(summary.classificationDistribution).forEach(([classification, count]) => {
    console.log(`- ${classification}: ${count}`);
  });
  console.log("");

  console.log("ALERTAS");
  if (report.calibrationAlerts.length) {
    report.calibrationAlerts.forEach((alert) => console.log(`- ${alert}`));
  } else {
    console.log("- nenhum alerta de calibragem");
  }
}

function writeReportJson(report, seedCount) {
  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `mvp-calibration-${seedCount}-seeds.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nArquivo JSON gerado: ${path.relative(process.cwd(), filePath)}`);
}

function printStats(label, value, digits) {
  console.log(`${label}: media ${value.average.toFixed(digits)} | min ${value.min.toFixed(digits)} | max ${value.max.toFixed(digits)}`);
}

if (require.main === module) {
  const requestedCount = Number.parseInt(process.argv[2], 10);
  runMvpCalibrationReport(Number.isFinite(requestedCount) ? requestedCount : 20);
}

module.exports = {
  runMvpCalibrationReport,
};
