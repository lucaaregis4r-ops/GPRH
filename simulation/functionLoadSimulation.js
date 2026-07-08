/**
 * Modulo: functionLoadSimulation
 * Responsabilidade: modelar funcoes reais, acumulo, desvio e redistribuicao funcional.
 * Entrada: state, funcionarios e eventos de mudanca de funcao
 * Saida: metricas funcionais, eventos e memorias individuais
 * Nao deve: criar acoes do RH, UI jogavel, campanha ou objetivos.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("./eventLog");
const { generateMemoryForEmployee, generateMemoriesFromEvent } = require("./memoryInterpretation");

function createCargoFormal(occupation, seniority, sectorId) {
  return {
    nome: occupation.titulo,
    ocupacaoBaseId: occupation.id,
    cboCodigo: occupation.cboCodigo,
    senioridade: seniority,
    familiaOcupacional: occupation.familia,
    setorId: sectorId,
  };
}

function createFunctionAssignmentsFromTasks(tasks, occupation, sector, idFactory, options = {}) {
  return tasks.map((task, index) => {
    const expected = options.expectedTasks ? options.expectedTasks.includes(task) : true;
    const isExtra = options.extraTasks ? options.extraTasks.includes(task) : !expected;
    const visibilityBase = expected ? 65 : 32;
    const recognitionBase = expected ? 58 : 28;

    return {
      id: idFactory.nextId("function_assignment"),
      nome: task,
      tipo: expected ? "prevista" : "real_extra",
      areaResponsavel: sector.nome,
      complexidade: clampPercent((occupation.complexidadeBase || 50) + (isExtra ? 12 : 0) + (options.complexityDelta || 0)),
      cargaSemanal: Math.max(2, Math.round((options.baseWeeklyLoad || 6) + index * 0.5 + (isExtra ? 3 : 0))),
      aderenciaAoCargo: expected ? clampPercent(82 + (options.adherenceDelta || 0)) : clampPercent(38 + (options.adherenceDelta || 0)),
      criticidade: clampPercent((occupation.nivelEspecializacaoBase || 50) * 0.55 + sector.importanciaEstrategica * 0.35 + (isExtra ? 10 : 0)),
      visibilidade: clampPercent(visibilityBase + (options.visibilityDelta || 0)),
      reconhecimento: clampPercent(recognitionBase + (options.recognitionDelta || 0)),
      origem: options.origin || "geracao_inicial",
    };
  });
}

function initializeFunctionalMetricsForEmployees(state) {
  state.employees.forEach((employee) => recalculateFunctionalMetrics(employee));
}

function recalculateFunctionalMetrics(employee) {
  const realFunctions = employee.funcoesReais || [];
  const expectedFunctions = employee.funcoesPrevistas || [];
  const totalWeeklyLoad = realFunctions.reduce((sum, item) => sum + (item.cargaSemanal || 0), 0);
  const expectedWeeklyLoad = expectedFunctions.reduce((sum, item) => sum + (item.cargaSemanal || 0), 0) || 1;
  const averageAdherence = average(realFunctions.map((item) => item.aderenciaAoCargo));
  const invisibleWork = average(realFunctions.map((item) => 100 - item.visibilidade));
  const lowRecognition = average(realFunctions.map((item) => 100 - item.reconhecimento));
  const dependency = average(realFunctions.map((item) => item.criticidade));

  employee.cargaFuncionalTotal = clampPercent((totalWeeklyLoad / Math.max(24, expectedWeeklyLoad)) * 55);
  employee.aderenciaFuncionalMedia = clampPercent(averageAdherence || 0);
  employee.indiceAcumuloFuncao = clampPercent(Math.max(0, totalWeeklyLoad - expectedWeeklyLoad) * 3 + Math.max(0, realFunctions.length - expectedFunctions.length) * 12);
  employee.indiceDesvioFuncao = clampPercent(100 - employee.aderenciaFuncionalMedia);
  employee.trabalhoInvisivel = clampPercent(invisibleWork || 0);
  employee.injusticaFuncionalPercebida = clampPercent(employee.indiceAcumuloFuncao * 0.35 + employee.trabalhoInvisivel * 0.3 + lowRecognition * 0.35);
  employee.dependenciaOrganizacional = clampPercent(dependency || 0);
  employee.riscoPorSobrecargaFuncional = clampPercent(employee.indiceAcumuloFuncao * 0.45 + employee.cargaFuncionalTotal * 0.35 + employee.injusticaFuncionalPercebida * 0.2);

  employee.acumuloDeFuncao = clampPercent(Math.max(employee.acumuloDeFuncao || 0, employee.indiceAcumuloFuncao));
  employee.desvioDeFuncao = clampPercent(Math.max(employee.desvioDeFuncao || 0, employee.indiceDesvioFuncao));
}

function simulateFunctionLoadOneDay(state) {
  state.employees
    .filter((employee) => employee.status !== "desligado")
    .forEach((employee) => {
      recalculateFunctionalMetrics(employee);

      employee.sobrecarga = clampPercent(employee.sobrecarga + Math.max(0, employee.riscoPorSobrecargaFuncional - 65) * 0.012);
      employee.justicaPercebida = clampPercent(employee.justicaPercebida - Math.max(0, employee.injusticaFuncionalPercebida - 60) * 0.01);
      employee.satisfacao = clampPercent(employee.satisfacao - Math.max(0, employee.trabalhoInvisivel - 65) * 0.006);
    });

  if (state.calendar.totalDiasSimulados > 0 && state.calendar.totalDiasSimulados % 14 === 0) {
    maybeCreateInformalFunctionEvent(state);
  }
}

function redistributeFunctionsAfterExit(state, exitingEmployee, inheritor) {
  if (!inheritor || !Array.isArray(exitingEmployee.funcoesReais) || !exitingEmployee.funcoesReais.length) return null;

  const transferred = exitingEmployee.funcoesReais
    .slice()
    .sort((left, right) => right.criticidade - left.criticidade)
    .slice(0, 2)
    .map((assignment) => ({
      ...assignment,
      id: state.idFactory.nextId("function_assignment"),
      tipo: "redistribuida",
      cargaSemanal: Math.max(3, Math.round((assignment.cargaSemanal || 4) * 0.75)),
      aderenciaAoCargo: clampPercent((assignment.aderenciaAoCargo || 50) - 18),
      visibilidade: clampPercent((assignment.visibilidade || 40) - 12),
      reconhecimento: clampPercent((assignment.reconhecimento || 35) - 18),
      origem: "redistribuicao_saida",
    }));

  inheritor.funcoesReais = [...(inheritor.funcoesReais || []), ...transferred];
  inheritor.tarefasReais = [...new Set([...(inheritor.tarefasReais || []), ...transferred.map((item) => item.nome)])];
  recalculateFunctionalMetrics(inheritor);

  const event = createOrganizationEvent(state, {
    tipo: "redistribuicao_funcional_pos_saida",
    descricao: `${inheritor.nome} assumiu funcoes apos a saida de ${exitingEmployee.nome}`,
    setorId: inheritor.setorId,
    funcionariosEnvolvidos: [exitingEmployee.id, inheritor.id],
    severidade: clampPercent(62 + transferred.length * 8),
    origem: "redistribuicao_funcional",
    dados: { funcoesTransferidas: transferred.map((item) => item.nome) },
    visivelParaRH: true,
    tags: ["funcao", "saida", "sobrecarga"],
  });

  const memory = generateMemoryForEmployee(state, inheritor, event, {
    rolesByEmployeeId: { [inheritor.id]: "herdou_funcao" },
    customImpact: {
      impactoInicial: { sobrecarga: 5, justicaPercebida: -4, intencaoSaida: 2 },
      impactoResidual: { sobrecarga: 0.08, justicaPercebida: -0.05, intencaoSaida: 0.04 },
    },
  });

  return { event, transferred, memory };
}

function maybeCreateInformalFunctionEvent(state) {
  const overloadedSector = state.sectors
    .slice()
    .sort((left, right) => right.cargaTrabalho - left.cargaTrabalho)[0];
  if (!overloadedSector || overloadedSector.cargaTrabalho < 68) return null;
  if (!state.rng.chance(Math.min(35, Math.max(5, overloadedSector.cargaTrabalho - 58)))) return null;

  const candidate = state.employees
    .filter((employee) => employee.status !== "desligado" && employee.setorId === overloadedSector.id)
    .sort((left, right) => right.qualificacao + right.influenciaInformal - (left.qualificacao + left.influenciaInformal))[0];
  if (!candidate) return null;

  const assignment = {
    id: state.idFactory.nextId("function_assignment"),
    nome: "resolver demanda critica informal",
    tipo: "informal",
    areaResponsavel: overloadedSector.nome,
    complexidade: 70,
    cargaSemanal: 4,
    aderenciaAoCargo: 42,
    criticidade: 74,
    visibilidade: 24,
    reconhecimento: 18,
    origem: "pressao_setorial",
  };

  candidate.funcoesReais.push(assignment);
  candidate.tarefasReais = [...new Set([...(candidate.tarefasReais || []), assignment.nome])];
  recalculateFunctionalMetrics(candidate);

  const event = createOrganizationEvent(state, {
    tipo: "funcao_informal_assumida",
    descricao: `${candidate.nome} passou a assumir demanda critica informal em ${overloadedSector.nome}`,
    setorId: overloadedSector.id,
    funcionariosEnvolvidos: [candidate.id],
    severidade: candidate.riscoPorSobrecargaFuncional,
    origem: "funcao_real",
    dados: { funcao: assignment.nome },
    visivelParaRH: assignment.visibilidade > 45,
    tags: ["funcao", "trabalho_invisivel", "sobrecarga"],
  });

  generateMemoriesFromEvent(state, event, {
    rolesByEmployeeId: { [candidate.id]: "afetado_direto" },
    valencia: "negativa",
  });

  return event;
}

function average(values) {
  const valid = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

module.exports = {
  createCargoFormal,
  createFunctionAssignmentsFromTasks,
  initializeFunctionalMetricsForEmployees,
  recalculateFunctionalMetrics,
  simulateFunctionLoadOneDay,
  redistributeFunctionsAfterExit,
};
