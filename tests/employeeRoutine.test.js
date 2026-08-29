/**
 * Modulo: employeeRoutine.test
 * Responsabilidade: validar rotina situada minima de funcionarios.
 */

const { createGameSession } = require("../game/gameLoop");
const { advanceDays } = require("../simulation/simulationEngine");
const {
  simulateEmployeeRoutineSlot,
  simulateEmployeeRoutineUntil,
  routineSlotForMinute,
} = require("../simulation/employeeRoutineEngine");
const { EMPLOYEE_STATES, decideNextEmployeeState } = require("../simulation/employeeStateMachine");
const { buildGameSnapshot } = require("../game/gameSnapshot");
const { assert, stableSnapshot } = require("./testUtils");

function run() {
  testLowEnergyEmployeeGoesToCoffeeRoom();
  testRoutineStateVariations();
  testRoutineAdvancesWithDailyLoop();
  testRoutineAdvancesWithClockBoundaries();
  testRoutineIsDeterministic();
}

function testLowEnergyEmployeeGoesToCoffeeRoom() {
  const session = createGameSession("RH-ROTINA-CAFE-001");
  const employee = session.state.employees.find((item) => item.status !== "desligado");

  employee.energyIndividual = 20;
  employee.currentState = EMPLOYEE_STATES.WORKING_AT_DESK;
  employee.routineCooldowns = {};

  simulateEmployeeRoutineSlot(session.state, "midday_break", session.state.rng);

  assert(employee.currentState === EMPLOYEE_STATES.COFFEE_BREAK, "energia baixa deve levar funcionario para pausa");
  assert(employee.currentRoomId === "copa", "pausa deve localizar funcionario na copa");
  assert(employee.currentLocationId === "point_copa_cafe", "pausa deve apontar para ponto de cafe");
  assert(employee.lastRoutineEvents.length > 0, "transicao de rotina deve registrar evento local");
}

function testRoutineStateVariations() {
  const employee = {
    currentState: EMPLOYEE_STATES.WORKING_AT_DESK,
    routineCooldowns: {},
    energyIndividual: 70,
    focusIndividual: 75,
    socialNeed: 20,
    sobrecarga: 40,
    confiancaNoRH: 40,
    satisfacao: 70,
    confiancaNaGestao: 70,
  };

  const meeting = decideNextEmployeeState(employee, {
    canHaveMeeting: true,
    meetingChance: 100,
    restroomChance: 0,
    rng: alwaysChance(true),
    availableCoworkers: [],
  });
  assert(meeting === EMPLOYEE_STATES.MEETING, "rotina deve permitir reuniao");

  const restroom = decideNextEmployeeState(employee, {
    canHaveMeeting: false,
    restroomChance: 100,
    rng: alwaysChance(true),
    availableCoworkers: [],
  });
  assert(restroom === EMPLOYEE_STATES.RESTROOM_BREAK, "rotina deve permitir banheiro");
}

function alwaysChance(value) {
  return {
    chance: () => value,
  };
}

function testRoutineAdvancesWithDailyLoop() {
  const session = createGameSession("RH-ROTINA-DIA-001");

  advanceDays(session.state, 1);

  const activeEmployees = session.state.employees.filter((employee) => employee.status !== "desligado");
  assert(activeEmployees.every((employee) => employee.currentState), "funcionarios devem ter estado de rotina");
  assert(activeEmployees.every((employee) => employee.routineSlot === "end_day"), "rotina diaria deve chegar ao fim do dia");
  assert(activeEmployees.every((employee) => employee.currentRoomId), "funcionarios devem manter sala logica");
  assert(activeEmployees.some((employee) => employee.lastRoutineEvents.length > 0), "rotina deve gerar eventos locais");

  const snapshot = buildGameSnapshot(session);
  assert(snapshot.world.npcs.every((npc) => npc.currentState), "snapshot deve expor estado espacial de rotina");
  assert(snapshot.world.npcs.every((npc) => npc.visibleStateLabel), "snapshot deve expor label visivel de rotina");
}

function testRoutineIsDeterministic() {
  const left = createGameSession("RH-ROTINA-DET-001");
  const right = createGameSession("RH-ROTINA-DET-001");

  advanceDays(left.state, 3);
  advanceDays(right.state, 3);

  assert(stableSnapshot(left.state) === stableSnapshot(right.state), "rotina deve ser deterministica por seed");
}

function testRoutineAdvancesWithClockBoundaries() {
  const session = createGameSession("RH-ROTINA-RELOGIO-001");
  simulateEmployeeRoutineSlot(session.state, "morning_start", session.state.rng);

  const beforeBoundary = simulateEmployeeRoutineUntil(session.state, 8 * 60, 8 * 60 + 59, session.state.rng);
  assert(beforeBoundary.length === 0, "rotina nao deve avancar antes do proximo bloco horario");

  const crossed = simulateEmployeeRoutineUntil(session.state, 8 * 60 + 59, 12 * 60, session.state.rng);
  assert(
    crossed.join(",") === "morning_work,midday_break",
    "rotina deve processar cada bloco cruzado pelo relogio uma unica vez"
  );
  assert(
    session.state.employees.filter((employee) => employee.status !== "desligado").every((employee) => employee.routineSlot === "midday_break"),
    "funcionarios devem refletir o ultimo bloco horario processado"
  );
  assert(routineSlotForMinute(13 * 60 + 30) === "afternoon_work", "relogio deve identificar periodo atual");
}

module.exports = {
  run,
};
