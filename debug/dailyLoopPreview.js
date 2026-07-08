/**
 * Modulo: dailyLoopPreview
 * Responsabilidade: demonstrar loop diario tecnico por console.
 * Entrada: seed opcional
 * Saida: resumos de acoes diarias e fechamento semanal
 * Nao deve: criar UI visual ou mover regras para front-end.
 */

const { createDailyGameSession, playDayAction, endDay } = require("../game/dayLoop");
const { buildGameSnapshot } = require("../game/gameSnapshot");

function runDailyLoopPreview(seed = "RH-DIARIO-001", days = 7) {
  const session = createDailyGameSession(seed);

  for (let index = 0; index < days && session.status === "em_andamento"; index += 1) {
    const snapshot = buildGameSnapshot(session);
    const employee = snapshot.playerKnowledge.employees[0];
    const sector = snapshot.world.sectors[0];

    if (employee && session.state.rh.energiaAtual >= 1) {
      playDayAction(session, {
        tipo: "checkin_individual_rapido",
        alvo: { employeeId: employee.id },
        tempoInvestidoMin: 20,
      });
    }

    if (sector && session.playerDay.tempoRestanteMin >= 60 && session.state.rh.energiaAtual >= 3) {
      playDayAction(session, {
        tipo: "priorizar_tarefas_criticas",
        alvo: { sectorId: sector.id },
        tempoInvestidoMin: 60,
      });
    }

    const report = endDay(session);
    console.log(`DIA ${report.dia}: ${report.resumo}`);
  }

  if (session.relatoriosSemanais.length) {
    const report = session.relatoriosSemanais[session.relatoriosSemanais.length - 1];
    console.log(`SEMANA ${report.semana}: ${report.resumo} | ${report.progresso.diagnostico}`);
  }

  return session;
}

if (require.main === module) {
  runDailyLoopPreview(process.argv[2] || "RH-DIARIO-001", Number.parseInt(process.argv[3], 10) || 7);
}

module.exports = {
  runDailyLoopPreview,
};
