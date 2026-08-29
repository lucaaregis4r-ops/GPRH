/**
 * Modulo: employeeStateMachine
 * Responsabilidade: decidir transicoes de estado cotidiano de funcionarios.
 * Entrada: employee normalizado e contexto organizacional do slot
 * Saida: novo estado logico e evento local de rotina
 * Nao deve: renderizar UI, escolher posicao visual ou aplicar rotina diaria completa.
 */

const EMPLOYEE_STATES = {
  WORKING_AT_DESK: "working_at_desk",
  FOCUSED_WORK: "focused_work",
  IDLE_AT_DESK: "idle_at_desk",
  WALKING_TO_LOCATION: "walking_to_location",
  COFFEE_BREAK: "coffee_break",
  INFORMAL_CHAT: "informal_chat",
  MEETING: "meeting",
  RESTROOM_BREAK: "restroom_break",
  SLACKING_OFF: "slacking_off",
  INTERRUPTED: "interrupted",
  GOING_TO_HR: "going_to_hr",
  AVOIDING_HR: "avoiding_hr",
  CONFLICT_INTERACTION: "conflict_interaction",
  LEAVING_WORK: "leaving_work",
};

const MIN_STATE_SLOTS = {
  [EMPLOYEE_STATES.COFFEE_BREAK]: 1,
  [EMPLOYEE_STATES.INFORMAL_CHAT]: 1,
  [EMPLOYEE_STATES.GOING_TO_HR]: 1,
  [EMPLOYEE_STATES.MEETING]: 1,
  [EMPLOYEE_STATES.RESTROOM_BREAK]: 1,
  [EMPLOYEE_STATES.SLACKING_OFF]: 1,
  [EMPLOYEE_STATES.FOCUSED_WORK]: 1,
  [EMPLOYEE_STATES.WORKING_AT_DESK]: 1,
  [EMPLOYEE_STATES.IDLE_AT_DESK]: 1,
};

function decideNextEmployeeState(employee, context = {}) {
  if (context.isEndOfDay) return EMPLOYEE_STATES.LEAVING_WORK;

  if (shouldKeepCurrentState(employee, context)) {
    return employee.currentState || EMPLOYEE_STATES.WORKING_AT_DESK;
  }

  if ((employee.energyIndividual || 0) < 30 || (context.isBreakSlot && context.rng?.chance(35))) {
    return EMPLOYEE_STATES.COFFEE_BREAK;
  }

  if (context.canHaveMeeting && context.rng?.chance(context.meetingChance || 0)) {
    return EMPLOYEE_STATES.MEETING;
  }

  if (context.rng?.chance(context.restroomChance || 0)) {
    return EMPLOYEE_STATES.RESTROOM_BREAK;
  }

  if ((employee.sobrecarga || 0) > 75 && (employee.confiancaNoRH || 0) > 60) {
    return EMPLOYEE_STATES.GOING_TO_HR;
  }

  if ((employee.socialNeed || 0) > 70 && (context.availableCoworkers || []).length > 0) {
    return EMPLOYEE_STATES.INFORMAL_CHAT;
  }

  if (shouldSlackOff(employee, context)) {
    return EMPLOYEE_STATES.SLACKING_OFF;
  }

  if ((employee.focusIndividual || 0) > 72 && (employee.energyIndividual || 0) > 35 && context.rng?.chance(28)) {
    return EMPLOYEE_STATES.FOCUSED_WORK;
  }

  if ((employee.sobrecarga || 0) > 55 && (employee.energyIndividual || 0) > 25) {
    return EMPLOYEE_STATES.WORKING_AT_DESK;
  }

  return EMPLOYEE_STATES.IDLE_AT_DESK;
}

function shouldSlackOff(employee, context) {
  const lowFocus = Math.max(0, 55 - (employee.focusIndividual || 60));
  const lowSatisfaction = Math.max(0, 55 - (employee.satisfacao || 55));
  const lowTrust = Math.max(0, 50 - (employee.confiancaNaGestao || 50));
  const chance = Math.min(32, 3 + lowFocus * 0.22 + lowSatisfaction * 0.18 + lowTrust * 0.12);
  return context.rng?.chance(chance);
}

function applyEmployeeStateTransition(employee, nextState, context = {}) {
  const previousState = employee.currentState || null;
  decrementCooldowns(employee);

  if (previousState === nextState) {
    employee.routineSlot = context.slot || employee.routineSlot;
    return null;
  }

  employee.previousState = previousState;
  employee.currentState = nextState;
  employee.stateStartedAt = {
    dia: context.day || 0,
    slot: context.slot || "work_block",
  };
  employee.routineSlot = context.slot || employee.routineSlot;
  employee.routineCooldowns[nextState] = MIN_STATE_SLOTS[nextState] || 1;

  const event = {
    dia: context.day || 0,
    slot: employee.routineSlot,
    from: previousState,
    to: nextState,
    reason: context.reason || inferTransitionReason(employee, nextState),
  };

  employee.lastRoutineEvents = [event, ...(employee.lastRoutineEvents || [])].slice(0, 8);
  return event;
}

function shouldKeepCurrentState(employee, context) {
  if (context.forceDecision) return false;
  const state = employee.currentState;
  if (!state) return false;
  return (employee.routineCooldowns || {})[state] > 0;
}

function decrementCooldowns(employee) {
  employee.routineCooldowns = employee.routineCooldowns || {};
  Object.keys(employee.routineCooldowns).forEach((key) => {
    employee.routineCooldowns[key] = Math.max(0, employee.routineCooldowns[key] - 1);
  });
}

function inferTransitionReason(employee, nextState) {
  if (nextState === EMPLOYEE_STATES.COFFEE_BREAK) return "energia_baixa_ou_pausa";
  if (nextState === EMPLOYEE_STATES.GOING_TO_HR) return "sobrecarga_com_confianca_no_rh";
  if (nextState === EMPLOYEE_STATES.INFORMAL_CHAT) return "necessidade_social";
  if (nextState === EMPLOYEE_STATES.MEETING) return "alinhamento_rapido";
  if (nextState === EMPLOYEE_STATES.RESTROOM_BREAK) return "pausa_banheiro";
  if (nextState === EMPLOYEE_STATES.SLACKING_OFF) return "baixa_concentracao";
  if (nextState === EMPLOYEE_STATES.FOCUSED_WORK) return "foco_individual";
  if (nextState === EMPLOYEE_STATES.WORKING_AT_DESK) return "bloco_de_trabalho";
  if (nextState === EMPLOYEE_STATES.IDLE_AT_DESK) return "sem_demanda_imediata";
  return "rotina";
}

module.exports = {
  EMPLOYEE_STATES,
  decideNextEmployeeState,
  applyEmployeeStateTransition,
};
