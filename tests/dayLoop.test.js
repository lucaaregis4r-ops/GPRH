/**
 * Modulo: dayLoop.test
 * Responsabilidade: validar loop diario com tempo fluido.
 */

const { createDailyGameSession, playDayAction, endDay } = require("../game/dayLoop");
const { calculateActionTimeQuality } = require("../rh/actionTimeQuality");
const { getRhActionDefinition, RH_DISCOVERY_ACTIONS, RH_INTERVENTION_ACTIONS } = require("../rh/rhActionCatalog");
const { buildGameSnapshot } = require("../game/gameSnapshot");
const { serializeSession } = require("../ui-simple/uiStateAdapter");
const { assert, collectCoherenceAlerts, collectRangeAlerts } = require("./testUtils");

function run() {
  testCatalogHasTimeMetadata();
  testQualityChangesByDuration();
  testDailyActionConsumesTime();
  testDailyProjectAccumulatesProgress();
  testEndDayAndWeeklyReport();
}

function testCatalogHasTimeMetadata() {
  [...RH_DISCOVERY_ACTIONS, ...RH_INTERVENTION_ACTIONS].forEach((action) => {
    assert(action.tempo, `acao ${action.tipo} deve ter metadados de tempo`);
    assert(action.tempo.duracoesPermitidasMin.length > 0, `acao ${action.tipo} deve ter duracoes permitidas`);
    assert(action.tempo.tempoMinimoMin > 0, `acao ${action.tipo} deve ter tempo minimo`);
    assert(action.tempo.tempoIdealMin >= action.tempo.tempoMinimoMin, `acao ${action.tipo} deve ter tempo ideal coerente`);
  });
}

function testQualityChangesByDuration() {
  const definition = getRhActionDefinition("conversa_individual_profunda");
  const ten = calculateActionTimeQuality(definition, 10, { maturidadeRH: 50, confiabilidadeInformacao: 50 });
  const thirty = calculateActionTimeQuality(definition, 30, { maturidadeRH: 50, confiabilidadeInformacao: 50 });
  const sixty = calculateActionTimeQuality(definition, 60, { maturidadeRH: 50, confiabilidadeInformacao: 50 });

  assert(ten.qualidadePlanejamento < thirty.qualidadePlanejamento, "30 min deve superar 10 min em qualidade");
  assert(thirty.qualidadePlanejamento < sixty.qualidadePlanejamento, "60 min deve superar 30 min ate o ideal");
  assert(ten.riscoImproviso > sixty.riscoImproviso, "risco deve cair com mais tempo investido");
}

function testDailyActionConsumesTime() {
  const session = createDailyGameSession("RH-DAY-ACTION-001");
  const employee = session.state.employees.find((item) => item.status !== "desligado");
  const before = session.playerDay.tempoRestanteMin;
  const entry = playDayAction(session, {
    tipo: "checkin_individual_rapido",
    alvo: { employeeId: employee.id },
    tempoInvestidoMin: 20,
  });

  assert(entry.tempoInvestidoMin === 20, "entrada diaria deve registrar tempo investido");
  assert(session.playerDay.tempoRestanteMin === before - 20, "acao diaria deve consumir minutos");
  assert(session.state.rh.acoesExecutadas.length === 1, "acao diaria deve chamar engine real");
  assert(buildGameSnapshot(session).playerKnowledge, "snapshot deve funcionar com sessao diaria");
  assert(serializeSession(session).company.nome, "UI simples deve continuar serializando sessao diaria");
}

function testDailyProjectAccumulatesProgress() {
  const session = createDailyGameSession("RH-DAY-PROJECT-001");
  const sector = session.state.sectors[0];
  const entry = playDayAction(session, {
    tipo: "pesquisa_clima_simples",
    alvo: { sectorId: sector.id },
    tempoInvestidoMin: 60,
    modo: "projeto",
  });

  assert(entry.progressoMin === 60, "projeto deve acumular minutos");
  assert(session.dailyProjects.length === 1, "sessao deve registrar projeto diario");
  assert(session.state.rh.acoesExecutadas.length === 0, "projeto abaixo do minimo ainda nao deve executar");
}

function testEndDayAndWeeklyReport() {
  const session = createDailyGameSession("RH-DAY-WEEK-001");
  for (let day = 0; day < 7; day += 1) {
    const employee = session.state.employees.find((item) => item.status !== "desligado");
    playDayAction(session, {
      tipo: "checkin_individual_rapido",
      alvo: { employeeId: employee.id },
      tempoInvestidoMin: 10,
    });
    endDay(session);
  }

  assert(session.dailyReports.length === 7, "loop diario deve gerar resumo de cada dia");
  assert(session.dailyReports[0].avaliacaoParcial.leituraGeral, "relatorio diario deve conter avaliacao parcial");
  assert(Array.isArray(session.dailyReports[0].projetos), "relatorio diario deve conter fechamento de projetos");
  assert(session.dailyReports[6].relatorioSemanal, "setimo dia deve anexar resumo semanal para UI");
  assert(session.relatoriosSemanais.length === 1, "fim da semana diaria deve gerar relatorio semanal");
  assert(session.semanaAtual === 2, "sessao diaria deve avancar semana");

  const alerts = [...collectRangeAlerts(session.state), ...collectCoherenceAlerts(session.state)];
  assert(!alerts.length, `estado diario com alertas:\n${alerts.join("\n")}`);
}

module.exports = {
  run,
};
