/**
 * Modulo: calendar
 * Responsabilidade: controlar calendario abstrato da simulacao.
 * Entrada: state
 * Saida: calendario atualizado
 * Nao deve: alterar pessoas, financeiro ou relatorios.
 */

function createCalendar() {
  return {
    diaAtual: 1,
    mesAtual: 1,
    anoAtual: 1,
    totalDiasSimulados: 0,
    diaDaSemana: 1,
    historicoMensal: [],
  };
}

function advanceCalendarOneDay(calendar) {
  calendar.totalDiasSimulados += 1;
  calendar.diaDaSemana = calendar.diaDaSemana === 7 ? 1 : calendar.diaDaSemana + 1;
  calendar.diaAtual += 1;

  if (calendar.diaAtual > 30) {
    calendar.diaAtual = 1;
    calendar.mesAtual += 1;
  }

  if (calendar.mesAtual > 12) {
    calendar.mesAtual = 1;
    calendar.anoAtual += 1;
  }

  return calendar;
}

function isMonthClosingDay(calendar) {
  return calendar.diaAtual === 30;
}

module.exports = {
  createCalendar,
  advanceCalendarOneDay,
  isMonthClosingDay,
};
