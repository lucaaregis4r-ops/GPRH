/**
 * Modulo: employeeRoutineEngine
 * Responsabilidade: avancar rotina diaria situada em blocos discretos.
 * Entrada: state, slot e rng deterministico
 * Saida: funcionarios com estado, localizacao logica e energia/foco atualizados
 * Nao deve: simular frame a frame, renderizar UI ou substituir employeeSimulation.
 */

const { clampPercent } = require("../core/clamp");
const { ensureWorkspace } = require("../game/workspaceAssignment");
const { POINT_TYPES } = require("../game/workspaceGenerator");
const { normalizeEmployeeSimulationFields } = require("./employeeSimulationDefaults");
const { EMPLOYEE_STATES, decideNextEmployeeState, applyEmployeeStateTransition } = require("./employeeStateMachine");
const { simulateCoffeeRoomSocialInteractions } = require("./socialInteractionSimulation");

const ROUTINE_SLOTS = [
  "morning_start",
  "morning_work",
  "midday_break",
  "afternoon_work",
  "late_day",
  "end_day",
];

const ROUTINE_SLOT_SCHEDULE = [
  { slot: "morning_start", minute: 8 * 60 },
  { slot: "morning_work", minute: 9 * 60 },
  { slot: "midday_break", minute: 12 * 60 },
  { slot: "afternoon_work", minute: 13 * 60 },
  { slot: "late_day", minute: 16 * 60 },
  { slot: "end_day", minute: 18 * 60 },
];

function simulateEmployeeRoutineDay(state, rng = state.rng) {
  ensureWorkspace(state);
  ROUTINE_SLOTS.forEach((slot) => simulateEmployeeRoutineSlot(state, slot, rng));
  return state;
}

function simulateEmployeeRoutineSlot(state, slot, rng = state.rng) {
  ensureWorkspace(state);
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");

  activeEmployees.forEach((employee) => {
    normalizeEmployeeSimulationFields(employee);
    const context = buildRoutineContext(state, employee, slot, rng);
    const nextState = decideNextEmployeeState(employee, context);
    const event = applyEmployeeStateTransition(employee, nextState, context);
    updateLogicalLocation(state, employee, nextState);
    applyLightRoutineEffects(employee, nextState, context);
    if (event) event.locationId = employee.currentLocationId;
  });

  simulateCoffeeRoomSocialInteractions(state, slot, rng);
  return state;
}

function simulateEmployeeRoutineUntil(state, fromMinute, toMinute, rng = state.rng) {
  if (!Number.isFinite(fromMinute) || !Number.isFinite(toMinute) || toMinute < fromMinute) {
    throw new Error("intervalo de rotina invalido");
  }

  const processedSlots = [];
  ROUTINE_SLOT_SCHEDULE.forEach(({ slot, minute }) => {
    if (minute > fromMinute && minute <= toMinute) {
      simulateEmployeeRoutineSlot(state, slot, rng);
      processedSlots.push(slot);
    }
  });
  return processedSlots;
}

function routineSlotForMinute(minute) {
  const normalizedMinute = Number.isFinite(minute) ? minute : ROUTINE_SLOT_SCHEDULE[0].minute;
  let current = ROUTINE_SLOT_SCHEDULE[0].slot;
  ROUTINE_SLOT_SCHEDULE.forEach((entry) => {
    if (normalizedMinute >= entry.minute) current = entry.slot;
  });
  return current;
}

function buildRoutineContext(state, employee, slot, rng) {
  return {
    day: state.calendar?.totalDiasSimulados || 0,
    slot,
    rng,
    forceDecision: slot === "morning_start",
    isBreakSlot: slot === "midday_break",
    isEndOfDay: slot === "end_day",
    canHaveMeeting: ["morning_work", "afternoon_work", "late_day"].includes(slot),
    meetingChance: slot === "morning_work" ? 9 : slot === "afternoon_work" ? 7 : 4,
    restroomChance: slot === "midday_break" ? 9 : slot === "late_day" ? 7 : 4,
    availableCoworkers: findAvailableCoworkers(state, employee),
  };
}

function findAvailableCoworkers(state, employee) {
  return (state.employees || []).filter(
    (other) =>
      other.id !== employee.id &&
      other.status !== "desligado" &&
      other.setorId === employee.setorId &&
      other.currentState !== EMPLOYEE_STATES.GOING_TO_HR
  );
}

function updateLogicalLocation(state, employee, nextState) {
  const workspace = state.workspace;
  const target = getTargetLocationForState(workspace, employee, nextState);

  employee.targetLocationId = target.locationId;
  employee.currentLocationId = target.locationId;
  employee.currentRoomId = target.roomId;
}

function getTargetLocationForState(workspace, employee, state) {
  if (state === EMPLOYEE_STATES.COFFEE_BREAK || state === EMPLOYEE_STATES.INFORMAL_CHAT) {
    return pointTarget(workspace, POINT_TYPES.COFFEE_MACHINE, "copa", employee);
  }
  if (state === EMPLOYEE_STATES.MEETING) {
    return pointTarget(workspace, POINT_TYPES.MEETING_TABLE, "reuniao", employee);
  }
  if (state === EMPLOYEE_STATES.RESTROOM_BREAK) {
    return pointTarget(workspace, POINT_TYPES.RESTROOM_SINK, "banheiro", employee);
  }
  if (state === EMPLOYEE_STATES.GOING_TO_HR) {
    return pointTarget(workspace, POINT_TYPES.HR_DESK, "rh", employee);
  }
  if (state === EMPLOYEE_STATES.LEAVING_WORK) {
    return pointTarget(workspace, POINT_TYPES.EXIT, "recepcao", employee);
  }
  if (state === EMPLOYEE_STATES.SLACKING_OFF) {
    return {
      locationId: `idle_${employee.homeRoomId || employee.setorId}`,
      roomId: employee.homeRoomId || employee.currentRoomId,
    };
  }
  return {
    locationId: employee.deskId,
    roomId: employee.homeRoomId || employee.currentRoomId,
  };
}

function pointTarget(workspace, pointType, fallbackRoomId, employee) {
  const point = (workspace.pointsOfInterest || []).find((item) => item.type === pointType);
  if (point) {
    return {
      locationId: point.id,
      roomId: point.roomId,
    };
  }
  return {
    locationId: employee.deskId,
    roomId: fallbackRoomId || employee.homeRoomId || employee.currentRoomId,
  };
}

function applyLightRoutineEffects(employee, state, context) {
  if (state === EMPLOYEE_STATES.COFFEE_BREAK) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) + 8);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) + 3);
    employee.socialNeed = clampPercent((employee.socialNeed || 40) - 8);
    return;
  }

  if (state === EMPLOYEE_STATES.INFORMAL_CHAT) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) - 2);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) - 4);
    employee.socialNeed = clampPercent((employee.socialNeed || 40) - 16);
    employee.suportePercebido = clampPercent((employee.suportePercebido || 50) + (context.rng?.chance(65) ? 1 : 0));
    return;
  }

  if (state === EMPLOYEE_STATES.MEETING) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) - 4);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) - 1);
    employee.socialNeed = clampPercent((employee.socialNeed || 40) - 5);
    return;
  }

  if (state === EMPLOYEE_STATES.RESTROOM_BREAK) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) + 2);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) + 1);
    return;
  }

  if (state === EMPLOYEE_STATES.SLACKING_OFF) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) + 1);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) - 5);
    employee.socialNeed = clampPercent((employee.socialNeed || 40) + 3);
    return;
  }

  if (state === EMPLOYEE_STATES.GOING_TO_HR) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) - 3);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) - 2);
    employee.socialNeed = clampPercent((employee.socialNeed || 40) + 2);
    return;
  }

  if (state === EMPLOYEE_STATES.WORKING_AT_DESK || state === EMPLOYEE_STATES.FOCUSED_WORK) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) - 5);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) + 2 - Math.max(0, (employee.sobrecarga || 0) - 75) * 0.05);
    employee.socialNeed = clampPercent((employee.socialNeed || 40) + 4);
    return;
  }

  if (state === EMPLOYEE_STATES.IDLE_AT_DESK) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) - 1);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) - 2);
    employee.socialNeed = clampPercent((employee.socialNeed || 40) + 5);
    return;
  }

  if (state === EMPLOYEE_STATES.LEAVING_WORK) {
    employee.energyIndividual = clampPercent((employee.energyIndividual || 70) + 2);
    employee.focusIndividual = clampPercent((employee.focusIndividual || 60) - 4);
  }
}

module.exports = {
  ROUTINE_SLOTS,
  ROUTINE_SLOT_SCHEDULE,
  simulateEmployeeRoutineDay,
  simulateEmployeeRoutineSlot,
  simulateEmployeeRoutineUntil,
  routineSlotForMinute,
};
