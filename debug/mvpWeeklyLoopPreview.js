/**
 * Modulo: mvpWeeklyLoopPreview
 * Responsabilidade: demonstrar o loop semanal tecnico do MVP pelo console.
 * Entrada: seed via linha de comando
 * Saida: relatorios semanais resumidos
 * Nao deve: criar UI final, campanha, avatares ou vitoria/derrota completa.
 */

const { createGameSession, playWeeks, createDefaultTechnicalStrategy } = require("../game/gameLoop");
const { renderWeeklyReport } = require("../reports/weeklyReport");

function runMvpWeeklyLoopPreview(seed = "RH-MVP-SEMANAL-001", weeks = 12) {
  const session = createGameSession(seed, { horizonteSemanas: weeks });
  const reports = playWeeks(session, weeks, createDefaultTechnicalStrategy());

  console.log("\nPREVIEW_LOOP_SEMANAL_MVP");
  console.log(`Seed: ${seed}`);
  console.log(`Empresa: ${session.state.company.nome}`);
  console.log(`Semanas simuladas: ${reports.length}`);
  console.log(`Status: ${session.status}`);

  reports.forEach((report) => {
    console.log("");
    console.log(renderWeeklyReport(report));
  });

  const last = reports[reports.length - 1];
  if (last) {
    console.log("\nRESUMO_FINAL_TECNICO");
    console.log(`Diagnostico final: ${last.progresso.diagnostico}`);
    console.log(`Score final: ${last.progresso.score}`);
    console.log(`Turnover acumulado: ${last.progresso.metricas.turnoverAcumulado}`);
    console.log(`Demandas pendentes: ${last.progresso.metricas.demandasPendentes}`);
    console.log(`Caixa: ${Math.round(last.progresso.metricas.caixa)}`);
  }

  return session;
}

if (require.main === module) {
  runMvpWeeklyLoopPreview(process.argv[2] || "RH-MVP-SEMANAL-001", Number(process.argv[3] || 12));
}

module.exports = {
  runMvpWeeklyLoopPreview,
};
