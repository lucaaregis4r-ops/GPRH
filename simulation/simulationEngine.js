/**
 * Modulo: simulationEngine
 * Responsabilidade: criar e avancar a engine procedural isolada de RH.
 * Entrada: seed e comandos de simulacao
 * Saida: state completo da engine
 * Nao deve: conter UI jogavel, acoes do RH, campanha ou avatares.
 */

const { createRng } = require("../core/rng");
const { createIdFactory } = require("../core/ids");
const { generateCompany } = require("../generators/companyGenerator");
const { generateSectors } = require("../generators/sectorGenerator");
const { generateEmployees } = require("../generators/employeeGenerator");
const { generateRelationships } = require("../generators/relationGenerator");
const { generateMemories } = require("../generators/memoryGenerator");
const { createCalendar, advanceCalendarOneDay, isMonthClosingDay } = require("./calendar");
const { initializeEconomy, closeFinancialMonth } = require("./financeSimulation");
const { simulateEmployeesOneDay, applyMonthlyHumanFinancialEffects } = require("./employeeSimulation");
const { updateCompanyDailySignals } = require("./companySimulation");
const { simulateEmployeeActions } = require("./employeeActionsSimulation");
const { initializeVisibilityState, processVisibility } = require("../knowledge/visibilitySimulation");
const { initializeFunctionalMetricsForEmployees, simulateFunctionLoadOneDay } = require("./functionLoadSimulation");
const { initializeComplianceState } = require("./complianceSimulation");
const { simulatePsychosocialRisksOneDay } = require("./discriminationHarassmentSimulation");
const { initializeRhState, refreshRhEnergyForDay } = require("../rh/rhEnergy");
const { advanceRhPlanningOneDay } = require("../rh/rhActionPlanning");
const { processRhAction } = require("../rh/rhActionProcessor");
const { simulatePendingDemandsOneDay } = require("../rh/pendingDemands");
const { normalizeWorkspaceState } = require("../game/workspaceAssignment");
const { initializeOrgChart } = require("../game/orgChartModel");
const { simulateEmployeeRoutineDay } = require("./employeeRoutineEngine");
const { initializeWorkDeliveryIndicators, simulateWorkDeliveryOneDay } = require("./workDeliverySimulation");

function createProceduralRHSimulation(seed = "RH-TESTE-001", config = {}) {
  const rng = createRng(seed);
  const idFactory = createIdFactory();
  const company = generateCompany(seed, rng, idFactory, config);
  const sectors = generateSectors(company, rng, idFactory);
  const employees = generateEmployees(company, sectors, rng, idFactory);
  const relationships = generateRelationships(employees, sectors, company, rng, idFactory);
  const organizationEvents = generateMemories(company, sectors, employees, relationships, rng, idFactory);
  const economy = initializeEconomy(company, employees, rng);
  const calendar = createCalendar();

  const state = {
    seed,
    rng,
    idFactory,
    calendar,
    company,
    sectors,
    employees,
    relationships,
    organizationEvents,
    eventLog: organizationEvents,
    eventosOrganizacionais: organizationEvents,
    economy,
    history: [],
    historicoEventos: organizationEvents,
    eventosRecentes: [],
    acoesFuncionarios: [],
    reportCases: [],
    recentEvents: [],
  };

  company.setores = sectors.map((sector) => sector.id);
  company.funcionarios = employees.map((employee) => employee.id);
  company.relacoes = relationships.map((relationship) => relationship.id);
  company.eventos = organizationEvents.map((event) => event.id);
  normalizeWorkspaceState(state);
  initializeOrgChart(state);
  initializeFunctionalMetricsForEmployees(state);
  initializeWorkDeliveryIndicators(state);
  initializeComplianceState(state);
  initializeRhState(state);
  updateCompanyDailySignals(state);
  initializeVisibilityState(state);
  processVisibility(state);

  return state;
}

function advanceOneDay(state, options = {}) {
  refreshRhEnergyForDay(state);

  if (isMonthClosingDay(state.calendar)) {
    const financialSnapshot = closeFinancialMonth(state);
    applyMonthlyHumanFinancialEffects(state, financialSnapshot);
  }

  simulateEmployeesOneDay(state);
  if (!options.skipEmployeeRoutine) simulateEmployeeRoutineDay(state);
  simulateFunctionLoadOneDay(state);
  simulateWorkDeliveryOneDay(state);
  simulateEmployeeActions(state);
  simulatePendingDemandsOneDay(state);
  simulatePsychosocialRisksOneDay(state);
  processVisibility(state);
  advanceCalendarOneDay(state.calendar);
  refreshRhEnergyForDay(state);
  advanceRhPlanningOneDay(state, processRhAction);
  updateCompanyDailySignals(state);
  processVisibility(state);

  state.recentEvents = state.history.slice(-8);
  return state;
}

function advanceDays(state, numberOfDays, options = {}) {
  for (let day = 0; day < numberOfDays; day += 1) {
    advanceOneDay(state, options);
  }
  return state;
}

function advanceMonth(state) {
  return advanceDays(state, 30);
}

function simulateUntil(state, target) {
  while (state.calendar.anoAtual < target.ano || state.calendar.mesAtual < target.mes) {
    advanceOneDay(state);
  }
  return state;
}

module.exports = {
  createProceduralRHSimulation,
  advanceOneDay,
  advanceDays,
  advanceMonth,
  simulateUntil,
};
