/**
 * Modulo: uiSimple.test
 * Responsabilidade: validar adaptador da UI simples e integracao com loop semanal.
 */

const { createGameSession, playWeek } = require("../game/gameLoop");
const { serializeSession } = require("../ui-simple/uiStateAdapter");
const { exportGameSession, importGameSession } = require("../game/saveLoad");
const { assert } = require("./testUtils");

function run() {
  const session = createGameSession("RH-UI-TESTE-001", { horizonteSemanas: 12 });
  const initial = serializeSession(session);

  assert(initial.company.nome, "UI deve expor nome da empresa");
  assert(initial.scenario.id === "crescimento_desorganizado", "UI deve expor cenario atual");
  assert(initial.availableActions.length >= 10, "UI deve expor catalogo de acoes");
  assert(initial.targetOptions.employees.length > 0, "UI deve expor funcionarios alvo");
  assert(initial.targetOptions.sectors.length > 0, "UI deve expor setores alvo");
  assert(initial.briefing.funcionariosEmAtencao.length > 0, "UI deve expor briefing semanal");

  const employee = initial.targetOptions.employees[0];
  playWeek(session, [{ tipo: "checkin_individual_rapido", alvo: { employeeId: employee.id }, modo: "executar" }]);
  const afterWeek = serializeSession(session);

  assert(afterWeek.semanaAtual === 2, "UI deve refletir avanco de semana");
  assert(afterWeek.reports.length === 1, "UI deve expor relatorio semanal");
  assert(afterWeek.rh.acoesExecutadas.length >= 1, "UI deve expor acoes executadas");

  const restored = serializeSession(importGameSession(exportGameSession(session)));
  assert(restored.seed === afterWeek.seed, "UI deve serializar sessao restaurada por save/load");
}

module.exports = {
  run,
};
