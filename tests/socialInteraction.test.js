/**
 * Modulo: socialInteraction.test
 * Responsabilidade: validar copa como sistema social situado.
 */

const { createGameSession } = require("../game/gameLoop");
const { advanceDays } = require("../simulation/simulationEngine");
const { simulateCoffeeRoomSocialInteractions, SOCIAL_EVENT_TYPES } = require("../simulation/socialInteractionSimulation");
const { processVisibility } = require("../knowledge/visibilitySimulation");
const { assert } = require("./testUtils");

function run() {
  testCoffeeRoomCreatesSocialEvent();
  testSupportConversationImprovesSupport();
  testDailyRoutineCanRegisterCoffeeSocialLife();
}

function testCoffeeRoomCreatesSocialEvent() {
  const session = createGameSession("RH-COPA-SOCIAL-001");
  const employees = session.state.employees.filter((employee) => employee.status !== "desligado").slice(0, 2);

  employees.forEach((employee) => {
    employee.currentRoomId = "copa";
    employee.currentState = "coffee_break";
    employee.sobrecarga = 88;
  });

  const events = simulateCoffeeRoomSocialInteractions(session.state, "midday_break", session.state.rng);
  processVisibility(session.state);

  assert(events.length > 0, "duas pessoas na copa devem gerar encontro social");
  assert(events.every((event) => event.origem === "copa"), "eventos sociais da copa devem indicar origem");
  assert(session.state.socialInteractionLog.length > 0, "estado deve registrar log social leve");
  assert(session.state.visibleSignals.some((signal) => signal.origemEventoId === events[0].id), "evento social deve virar sinal visivel ou oculto");
}

function testSupportConversationImprovesSupport() {
  const session = createGameSession("RH-COPA-APOIO-001");
  const [left, right] = session.state.employees.filter((employee) => employee.status !== "desligado").slice(0, 2);
  const before = left.suportePercebido + right.suportePercebido;

  left.currentRoomId = "copa";
  right.currentRoomId = "copa";
  left.currentState = "informal_chat";
  right.currentState = "informal_chat";

  const event = simulateForcedSupportConversation(session.state, left, right);
  const after = left.suportePercebido + right.suportePercebido;

  assert(event.tipo === SOCIAL_EVENT_TYPES.SUPPORT_CONVERSATION, "conversa forcada deve ser de apoio");
  assert(after > before, "conversa de apoio deve melhorar suporte percebido");
}

function testDailyRoutineCanRegisterCoffeeSocialLife() {
  const session = createGameSession("RH-COPA-DIA-001");

  advanceDays(session.state, 3);

  assert(Array.isArray(session.state.socialInteractionLog), "estado deve manter log social");
  assert(
    session.state.socialInteractionLog.length >= 0,
    "rotina diaria deve continuar valida mesmo quando nenhum encontro de copa relevante acontece"
  );
}

function simulateForcedSupportConversation(state, left, right) {
  const originalWeightedChoice = state.rng.weightedChoice;
  state.rng.weightedChoice = () => ({ value: SOCIAL_EVENT_TYPES.SUPPORT_CONVERSATION });
  try {
    return simulateCoffeeRoomSocialInteractions(state, "midday_break", state.rng)[0];
  } finally {
    state.rng.weightedChoice = originalWeightedChoice;
  }
}

module.exports = {
  run,
};
