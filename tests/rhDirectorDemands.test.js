/**
 * Modulo: rhDirectorDemands.test
 * Responsabilidade: validar demandas pendentes e aprovacao da diretoria.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { processRhAction } = require("../rh/rhActionProcessor");
const { assert, collectCoherenceAlerts, collectRangeAlerts } = require("./testUtils");

function run() {
  testPendingDemandDelay();
  testCareerDemandResponse();
  testDirectorApprovalDenialDoesNotChargeFinancialCost();
  testDirectorApprovalAllowsFinancialAction();
}

function testPendingDemandDelay() {
  const state = createProceduralRHSimulation("RH-DEMANDAS-ATRASO-001");
  const employee = activeEmployee(state);
  employee.demandasPendentes.push({ tipo: "conversa", status: "pendente", prazoRespostaDias: 1 });
  const initialTrust = employee.confiancaNoRH;

  advanceDays(state, 3);

  const demand = employee.demandasPendentes[0];
  assert(demand.atrasoRegistrado, "demanda atrasada deve ser registrada");
  assert(state.organizationEvents.some((event) => event.tipo === "demanda_rh_atrasada"), "atraso deve gerar evento objetivo");
  assert(employee.memorias.some((memory) => memory.tipo === "demanda_rh_atrasada"), "atraso deve gerar memoria individual");
  assert(employee.confiancaNoRH < initialTrust, "atraso deve reduzir confianca no RH");
  assertNoAlerts(state);
}

function testCareerDemandResponse() {
  const state = createProceduralRHSimulation("RH-DEMANDAS-CARREIRA-001");
  const employee = activeEmployee(state);
  employee.demandasPendentes.push({ tipo: "aumento_ou_promocao", status: "pendente", prazoRespostaDias: 14 });

  const action = processRhAction(state, "responder_pedido_carreira", { employeeId: employee.id });

  assert(action.status === "concluida", "resposta de carreira deve concluir");
  assert(employee.demandasPendentes[0].status !== "pendente", "demanda de carreira deve sair de pendente");
  assertNoAlerts(state);
}

function testDirectorApprovalDenialDoesNotChargeFinancialCost() {
  const state = createProceduralRHSimulation("RH-DIRETORIA-NEGADA-001");
  const employee = activeEmployee(state);
  state.rh.energiaAtual = 20;
  state.rng.chance = () => false;
  const initialCash = state.economy.caixaAtual;
  const initialSalary = employee.salarioMensal;
  const plan = { id: "test_plan_denied", diasPreparados: 10, qualidadePlanejamento: 100 };

  const action = processRhAction(state, "propor_revisao_salarial_individual", { employeeId: employee.id }, { plan });

  assert(action.status === "negada_diretoria", "acao dependente deve poder ser negada pela diretoria");
  assert(action.aprovacaoDiretoria && action.aprovacaoDiretoria.aprovada === false, "negativa deve ficar registrada");
  assert(state.economy.caixaAtual === initialCash, "negativa nao deve consumir custo financeiro");
  assert(employee.salarioMensal === initialSalary, "negativa nao deve alterar salario");
  assertNoAlerts(state);
}

function testDirectorApprovalAllowsFinancialAction() {
  const state = createProceduralRHSimulation("RH-DIRETORIA-APROVADA-001");
  const employee = activeEmployee(state);
  state.rh.energiaAtual = 20;
  state.rng.chance = () => true;
  const initialCash = state.economy.caixaAtual;
  const initialSalary = employee.salarioMensal;
  const initialPayroll = state.economy.folhaPagamentoMensal;
  const plan = { id: "test_plan_approved", diasPreparados: 10, qualidadePlanejamento: 100 };

  const action = processRhAction(state, "propor_revisao_salarial_individual", { employeeId: employee.id }, { plan });

  assert(action.status === "concluida", "acao aprovada deve concluir");
  assert(action.aprovacaoDiretoria && action.aprovacaoDiretoria.aprovada === true, "aprovacao deve ficar registrada");
  assert(state.economy.caixaAtual === initialCash - action.custoFinanceiro, "aprovacao deve consumir custo financeiro");
  assert(employee.salarioMensal > initialSalary, "aprovacao deve alterar salario");
  assert(state.economy.folhaPagamentoMensal > initialPayroll, "aprovacao deve atualizar folha");
  assertNoAlerts(state);
}

function activeEmployee(state) {
  return state.employees.find((employee) => employee.status !== "desligado");
}

function assertNoAlerts(state) {
  const alerts = [...collectRangeAlerts(state), ...collectCoherenceAlerts(state)];
  assert(!alerts.length, `estado com alertas apos teste RH:\n${alerts.join("\n")}`);
}

module.exports = {
  run,
};
