/**
 * Modulo: workDeliverySimulation
 * Responsabilidade: calcular entrega, qualidade e sustentabilidade do trabalho.
 * Entrada: state com funcionarios, setores e relacoes
 * Saida: indicadores por funcionario, agregados por setor e historico leve
 * Nao deve: remover produtividade, decidir rotina ou renderizar relatorios.
 */

const { clampPercent } = require("../core/clamp");

function simulateWorkDeliveryOneDay(state) {
  calculateWorkIndicatorsForEmployees(state);
  aggregateWorkIndicatorsBySector(state);
  registerWorkDeliveryHistory(state);
  return state;
}

function initializeWorkDeliveryIndicators(state) {
  calculateWorkIndicatorsForEmployees(state);
  aggregateWorkIndicatorsBySector(state);
  state.workDeliveryHistory = state.workDeliveryHistory || [];
  return state;
}

function calculateWorkIndicatorsForEmployees(state) {
  const conflictByEmployeeId = calculateConflictPressureByEmployee(state);
  activeEmployees(state).forEach((employee) => {
    const indicators = calculateEmployeeWorkIndicators(employee, {
      conflitoLocal: conflictByEmployeeId.get(employee.id) || 0,
    });
    employee.deliveryCapacity = indicators.deliveryCapacity;
    employee.deliveryQuality = indicators.deliveryQuality;
    employee.workSustainability = indicators.workSustainability;
  });
  return state.employees;
}

function calculateEmployeeWorkIndicators(employee, context = {}) {
  const produtividade = safeNumber(employee.produtividade, 50);
  const focusIndividual = safeNumber(employee.focusIndividual, 60);
  const energyIndividual = safeNumber(employee.energyIndividual, 70);
  const especializacao = safeNumber(employee.especializacao, employee.qualificacao || 50);
  const sobrecarga = safeNumber(employee.sobrecarga, 50);
  const suportePercebido = safeNumber(employee.suportePercebido, 50);
  const confiancaNaGestao = safeNumber(employee.confiancaNaGestao, 50);
  const medo = safeNumber(employee.medo, 40);
  const conflitoLocal = safeNumber(context.conflitoLocal, 0);
  const justicaPercebida = safeNumber(employee.justicaPercebida, 50);

  return {
    deliveryCapacity: clampPercent(
      produtividade * 0.4 +
        focusIndividual * 0.25 +
        energyIndividual * 0.15 +
        especializacao * 0.2 -
        sobrecarga * 0.2
    ),
    deliveryQuality: clampPercent(
      especializacao * 0.35 +
        focusIndividual * 0.25 +
        suportePercebido * 0.15 +
        confiancaNaGestao * 0.1 -
        medo * 0.15 -
        conflitoLocal * 0.15
    ),
    workSustainability: clampPercent(
      energyIndividual * 0.25 +
        suportePercebido * 0.2 +
        justicaPercebida * 0.2 +
        confiancaNaGestao * 0.15 -
        sobrecarga * 0.25 -
        medo * 0.2
    ),
  };
}

function aggregateWorkIndicatorsBySector(state) {
  const employees = activeEmployees(state);
  (state.sectors || []).forEach((sector) => {
    const sectorEmployees = employees.filter((employee) => employee.setorId === sector.id);
    sector.workIndicators = {
      deliveryCapacity: average(sectorEmployees.map((employee) => employee.deliveryCapacity)),
      deliveryQuality: average(sectorEmployees.map((employee) => employee.deliveryQuality)),
      workSustainability: average(sectorEmployees.map((employee) => employee.workSustainability)),
      employeesCount: sectorEmployees.length,
    };
  });
  return state.sectors;
}

function registerWorkDeliveryHistory(state) {
  state.workDeliveryHistory = state.workDeliveryHistory || [];
  state.workDeliveryHistory.push({
    dia: state.calendar?.totalDiasSimulados || 0,
    company: summarizeCompanyWorkIndicators(state),
    sectors: (state.sectors || []).map((sector) => ({
      sectorId: sector.id,
      deliveryCapacity: sector.workIndicators?.deliveryCapacity || 0,
      deliveryQuality: sector.workIndicators?.deliveryQuality || 0,
      workSustainability: sector.workIndicators?.workSustainability || 0,
    })),
  });

  if (state.workDeliveryHistory.length > 90) state.workDeliveryHistory.shift();
}

function summarizeCompanyWorkIndicators(state) {
  const employees = activeEmployees(state);
  return {
    deliveryCapacity: average(employees.map((employee) => employee.deliveryCapacity)),
    deliveryQuality: average(employees.map((employee) => employee.deliveryQuality)),
    workSustainability: average(employees.map((employee) => employee.workSustainability)),
  };
}

function calculateConflictPressureByEmployee(state) {
  const conflictByEmployeeId = new Map();
  (state.relationships || []).forEach((relationship) => {
    if (relationship.ativa === false) return;
    const conflict = safeNumber(relationship.conflito, 0);
    if (conflict <= 0) return;
    addConflict(conflictByEmployeeId, relationship.fromEmployeeId, conflict);
    addConflict(conflictByEmployeeId, relationship.toEmployeeId, conflict);
  });
  return conflictByEmployeeId;
}

function addConflict(map, employeeId, conflict) {
  if (!employeeId) return;
  map.set(employeeId, Math.max(map.get(employeeId) || 0, conflict));
}

function activeEmployees(state) {
  return (state.employees || []).filter((employee) => employee.status !== "desligado");
}

function average(values) {
  const numericValues = values.map((value) => safeNumber(value, null)).filter((value) => value !== null);
  if (!numericValues.length) return 0;
  return Math.round(numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length);
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

module.exports = {
  initializeWorkDeliveryIndicators,
  simulateWorkDeliveryOneDay,
  calculateEmployeeWorkIndicators,
  summarizeCompanyWorkIndicators,
};
