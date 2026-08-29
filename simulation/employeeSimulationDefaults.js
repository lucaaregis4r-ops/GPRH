/**
 * Modulo: employeeSimulationDefaults
 * Responsabilidade: normalizar campos da simulacao situada dos funcionarios.
 * Entrada: employee possivelmente antigo
 * Saida: employee com campos seguros para rotina e localizacao logica
 * Nao deve: decidir rotina, alterar indicadores centrais ou renderizar UI.
 */

const DEFAULT_EMPLOYEE_ROUTINE_STATE = {
  deskId: null,
  homeRoomId: null,
  currentRoomId: null,
  currentLocationId: null,
  targetLocationId: null,
  currentState: "working_at_desk",
  previousState: null,
  stateStartedAt: null,
  routineSlot: "work_block",
  energyIndividual: 70,
  focusIndividual: 60,
  socialNeed: 40,
  deliveryCapacity: null,
  deliveryQuality: null,
  workSustainability: null,
  lastRoutineEvents: [],
  routineCooldowns: {},
};

function normalizeEmployeeSimulationFields(employee) {
  Object.entries(DEFAULT_EMPLOYEE_ROUTINE_STATE).forEach(([field, defaultValue]) => {
    if (typeof employee[field] === "undefined") {
      employee[field] = cloneDefault(defaultValue);
    }
  });

  if (!Array.isArray(employee.lastRoutineEvents)) employee.lastRoutineEvents = [];
  if (!employee.routineCooldowns || typeof employee.routineCooldowns !== "object") employee.routineCooldowns = {};
  if (!employee.currentRoomId && employee.homeRoomId) employee.currentRoomId = employee.homeRoomId;
  if (!employee.currentLocationId && employee.deskId) employee.currentLocationId = employee.deskId;
  return employee;
}

function cloneDefault(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === "object") return { ...value };
  return value;
}

module.exports = {
  DEFAULT_EMPLOYEE_ROUTINE_STATE,
  normalizeEmployeeSimulationFields,
};
