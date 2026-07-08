/**
 * Modulo: interventionActions
 * Responsabilidade: aplicar intervencoes iniciais do RH.
 * Entrada: state, acao RH e alvo
 * Saida: eventos, sinais e efeitos moderados no estado
 * Nao deve: criar campanha, UI, vitoria/derrota ou efeitos magicos.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("../simulation/eventLog");
const { generateMemoryForEmployee, generateMemoriesFromEvent } = require("../simulation/memoryInterpretation");
const { createVisibleSignal } = require("../knowledge/visibleSignalsModel");
const { recalculateFunctionalMetrics } = require("../simulation/functionLoadSimulation");
const { planningEffectMultiplier, planningRiskPenalty } = require("./rhActionPlanning");
const { resolvePendingDemand } = require("./pendingDemands");

function applyInterventionAction(state, action, target, definition, options = {}) {
  const handlers = {
    responder_pedido_conversa: respondConversationRequest,
    responder_pedido_carreira: respondCareerRequest,
    propor_revisao_salarial_individual: proposeSalaryReview,
    propor_promocao: proposePromotion,
    plano_desenvolvimento_simples: createDevelopmentPlan,
    reconhecer_contribuicao: recognizeContribution,
    acompanhar_funcionario_risco: followAtRiskEmployee,
    redistribuir_funcoes: redistributeFunctions,
    formalizar_funcao_informal: formalizeInformalFunction,
    priorizar_tarefas_criticas: prioritizeCriticalTasks,
    conter_rumor: containRumor,
    devolutiva_pesquisa: returnSurveyFeedback,
    alinhar_lideranca: alignLeadership,
    reforcar_canal_denuncia: reinforceReportChannel,
    proteger_contra_retaliacao: protectAgainstRetaliation,
    investigar_denuncia: investigateReport,
    aplicar_acao_corretiva: applyCorrectiveAction,
    planejar_reposicao: prepareReplacementPlan,
  };
  const handler = handlers[action.tipo];
  return handler ? handler(state, action, target, definition, options) : { events: [], signals: [] };
}

function respondConversationRequest(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  resolvePendingDemand(state, employee, "conversa", action, {
    status: penalty > 8 ? "respondida_parcialmente" : "respondida",
    qualidadeResposta: action.planejamento.qualidadePlanejamento || 35,
  });

  employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + 7 * multiplier - penalty * 0.25);
  employee.satisfacao = clampPercent(employee.satisfacao + 4 * multiplier - penalty * 0.15);
  employee.intencaoSaida = clampPercent(employee.intencaoSaida - 4 * multiplier + penalty * 0.12);
  employee.riscoDeSaida = employee.intencaoSaida;

  const event = interventionEvent(state, action, employee.setorId, [employee.id], `${employee.nome} recebeu retorno do RH sobre pedido de conversa`, 46);
  const memory = generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: penalty > 8 ? "prejudicado" : "beneficiado" },
    valencia: penalty > 8 ? "ambivalente" : "positiva",
    customImpact: {
      impactoInicial: { confiancaNoRH: penalty > 8 ? -1 : 2, satisfacao: penalty > 8 ? 0 : 1 },
      impactoResidual: { confiancaNoRH: penalty > 8 ? -0.03 : 0.04 },
    },
  });
  if (memory && penalty > 8) memory.descricao = "Senti que o RH respondeu de forma apressada e pouco preparada.";
  return withSignal(state, event, employee.id, "resposta_pedido_conversa_rh", action, penalty);
}

function respondCareerRequest(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  resolvePendingDemand(state, employee, "aumento_ou_promocao", action, {
    status: penalty > 8 ? "respondida_parcialmente" : "respondida",
    qualidadeResposta: action.planejamento.qualidadePlanejamento || 40,
    descricao: `${employee.nome} recebeu resposta sobre demanda de carreira`,
  });
  employee.perspectivaCrescimento = clampPercent(employee.perspectivaCrescimento + 5 * multiplier - penalty * 0.12);
  employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + 4 * multiplier - penalty * 0.18);
  employee.intencaoSaida = clampPercent(employee.intencaoSaida - 3 * multiplier + penalty * 0.12);
  employee.riscoDeSaida = employee.intencaoSaida;

  const event = interventionEvent(state, action, employee.setorId, [employee.id], `${employee.nome} recebeu devolutiva de carreira`, 48);
  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: penalty > 8 ? "afetado_direto" : "beneficiado" },
    valencia: penalty > 8 ? "ambivalente" : "positiva",
    customImpact: {
      impactoInicial: { perspectivaCrescimento: penalty > 8 ? 0 : 2, confiancaNoRH: penalty > 8 ? -1 : 1 },
      impactoResidual: { perspectivaCrescimento: penalty > 8 ? 0 : 0.04 },
    },
  });
  return withSignal(state, event, employee.id, "resposta_carreira_rh", action, penalty);
}

function proposeSalaryReview(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  const increase = Math.round(employee.salarioMensal * (0.04 + multiplier * 0.025));
  employee.salarioMensal += increase;
  state.economy.folhaPagamentoMensal += increase;
  employee.salarioPercebidoMercado = clampPercent(employee.salarioPercebidoMercado + 14 * multiplier);
  employee.satisfacao = clampPercent(employee.satisfacao + 5 * multiplier);
  employee.intencaoSaida = clampPercent(employee.intencaoSaida - 8 * multiplier + penalty * 0.08);
  employee.riscoDeSaida = employee.intencaoSaida;
  resolvePendingDemand(state, employee, "aumento_ou_promocao", action, {
    status: "aprovada",
    qualidadeResposta: action.planejamento.qualidadePlanejamento || 75,
  });

  const event = interventionEvent(state, action, employee.setorId, [employee.id], `${employee.nome} teve revisao salarial aprovada`, 54);
  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: "beneficiado" },
    valencia: "positiva",
    customImpact: { impactoInicial: { satisfacao: 3, intencaoSaida: -3 }, impactoResidual: { satisfacao: 0.04, intencaoSaida: -0.04 } },
  });
  return withSignal(state, event, employee.id, "revisao_salarial_rh", action, penalty);
}

function proposePromotion(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  const increase = Math.round(employee.salarioMensal * (0.06 + multiplier * 0.035));
  employee.salarioMensal += increase;
  state.economy.folhaPagamentoMensal += increase;
  employee.senioridade = promoteSeniority(employee.senioridade);
  if (employee.cargoFormal) employee.cargoFormal.senioridade = employee.senioridade;
  employee.perspectivaCrescimento = clampPercent(employee.perspectivaCrescimento + 12 * multiplier);
  employee.vinculoOrganizacional = clampPercent(employee.vinculoOrganizacional + 8 * multiplier);
  employee.intencaoSaida = clampPercent(employee.intencaoSaida - 9 * multiplier + penalty * 0.08);
  employee.riscoDeSaida = employee.intencaoSaida;
  resolvePendingDemand(state, employee, "aumento_ou_promocao", action, {
    status: "aprovada",
    qualidadeResposta: action.planejamento.qualidadePlanejamento || 80,
  });

  const event = interventionEvent(state, action, employee.setorId, [employee.id], `${employee.nome} foi promovido por decisao da empresa`, 62);
  generateMemoriesFromEvent(state, event, {
    rolesByEmployeeId: { [employee.id]: "beneficiado" },
    valencia: "positiva",
  });
  return withSignal(state, event, employee.id, "promocao_rh", action, penalty);
}

function createDevelopmentPlan(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  employee.perspectivaCrescimento = clampPercent(employee.perspectivaCrescimento + 8 * multiplier - penalty * 0.08);
  employee.suportePercebido = clampPercent(employee.suportePercebido + 6 * multiplier);
  employee.qualificacao = clampPercent(employee.qualificacao + 2 * multiplier);
  employee.intencaoSaida = clampPercent(employee.intencaoSaida - 4 * multiplier + penalty * 0.08);
  employee.riscoDeSaida = employee.intencaoSaida;
  const event = interventionEvent(state, action, employee.setorId, [employee.id], `${employee.nome} recebeu plano simples de desenvolvimento`, 42);
  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: "beneficiado" },
    valencia: "positiva",
    customImpact: { impactoInicial: { perspectivaCrescimento: 2, suportePercebido: 2 }, impactoResidual: { perspectivaCrescimento: 0.04 } },
  });
  return withSignal(state, event, employee.id, "plano_desenvolvimento_rh", action, penalty);
}

function recognizeContribution(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  employee.satisfacao = clampPercent(employee.satisfacao + 8 * multiplier - penalty * 0.12);
  employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + 4 * multiplier - penalty * 0.08);
  employee.vinculoOrganizacional = clampPercent(employee.vinculoOrganizacional + 7 * multiplier);
  employee.trabalhoInvisivel = clampPercent(employee.trabalhoInvisivel - 10 * multiplier);
  employee.intencaoSaida = clampPercent(employee.intencaoSaida - 5 * multiplier + penalty * 0.1);
  employee.riscoDeSaida = employee.intencaoSaida;

  const event = interventionEvent(state, action, employee.setorId, [employee.id], `${employee.nome} recebeu reconhecimento formal de contribuicao`, 42);
  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: "beneficiado" },
    valencia: "positiva",
    customImpact: { impactoInicial: { satisfacao: 2, vinculoOrganizacional: 2 }, impactoResidual: { satisfacao: 0.04 } },
  });
  return withSignal(state, event, employee.id, "reconhecimento_contribuicao_rh", action, penalty);
}

function followAtRiskEmployee(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + 9 * multiplier - penalty * 0.2);
  employee.satisfacao = clampPercent(employee.satisfacao + 3 * multiplier - penalty * 0.08);
  employee.suportePercebido = clampPercent(employee.suportePercebido + 8 * multiplier);
  employee.vinculoOrganizacional = clampPercent(employee.vinculoOrganizacional + 7 * multiplier);
  employee.intencaoSaida = clampPercent(employee.intencaoSaida - 12 * multiplier + penalty * 0.16);
  employee.riscoDeSaida = employee.intencaoSaida;

  const event = interventionEvent(state, action, employee.setorId, [employee.id], `${employee.nome} entrou em acompanhamento de risco pelo RH`, 52);
  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: penalty > 8 ? "afetado_direto" : "beneficiado" },
    valencia: "ambivalente",
    customImpact: { impactoInicial: { suportePercebido: 2, confiancaNoRH: penalty > 8 ? -1 : 2 }, impactoResidual: { intencaoSaida: -0.04 } },
  });
  return withSignal(state, event, employee.id, "acompanhamento_risco_rh", action, penalty);
}

function redistributeFunctions(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  const sectorPeers = state.employees.filter((peer) => peer.status !== "desligado" && peer.setorId === employee.setorId && peer.id !== employee.id);
  const peer = sectorPeers.sort((left, right) => left.sobrecarga - right.sobrecarga)[0];

  if (peer && employee.funcoesReais.length > employee.funcoesPrevistas.length) {
    const moved = employee.funcoesReais.pop();
    moved.id = state.idFactory.nextId("function_assignment");
    moved.origem = "redistribuicao_rh";
    moved.reconhecimento = clampPercent(moved.reconhecimento + 12);
    peer.funcoesReais.push(moved);
    peer.sobrecarga = clampPercent(peer.sobrecarga + 3 * multiplier);
    recalculateFunctionalMetrics(peer);
  }

  employee.sobrecarga = clampPercent(employee.sobrecarga - 9 * multiplier + penalty * 0.12);
  employee.indiceAcumuloFuncao = clampPercent(employee.indiceAcumuloFuncao - 10 * multiplier);
  employee.justicaPercebida = clampPercent(employee.justicaPercebida + 5 * multiplier - penalty * 0.12);
  recalculateFunctionalMetrics(employee);

  const event = interventionEvent(state, action, employee.setorId, [employee.id, ...(peer ? [peer.id] : [])], `RH redistribuiu funcoes em ${findSector(state, employee.setorId).nome}`, 62);
  generateMemoriesFromEvent(state, event, { rolesByEmployeeId: { [employee.id]: "beneficiado", ...(peer ? { [peer.id]: "afetado_direto" } : {}) } });
  return withSignal(state, event, employee.id, "redistribuicao_funcoes_rh", action, penalty);
}

function formalizeInformalFunction(state, action, target, definition, options) {
  const employee = requireEmployee(state, target.employeeId || target.funcionarioId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  const informal = employee.funcoesReais
    .filter((item) => !employee.funcoesPrevistas.some((expected) => expected.nome === item.nome))
    .sort((left, right) => right.cargaSemanal - left.cargaSemanal)[0];

  if (informal) {
    informal.origem = "formalizacao_rh";
    informal.visibilidade = clampPercent(informal.visibilidade + 22 * multiplier);
    informal.reconhecimento = clampPercent(informal.reconhecimento + 25 * multiplier);
    employee.funcoesPrevistas.push({ ...informal, id: state.idFactory.nextId("function_assignment"), origem: "formalizado_no_cargo" });
  }

  employee.trabalhoInvisivel = clampPercent(employee.trabalhoInvisivel - 16 * multiplier);
  employee.injusticaFuncionalPercebida = clampPercent(employee.injusticaFuncionalPercebida - 12 * multiplier + penalty * 0.1);
  employee.justicaPercebida = clampPercent(employee.justicaPercebida + 6 * multiplier);
  recalculateFunctionalMetrics(employee);

  const event = interventionEvent(state, action, employee.setorId, [employee.id], `${employee.nome} teve funcao informal formalizada`, 58);
  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: "beneficiado" },
    valencia: "positiva",
    customImpact: { impactoInicial: { justicaPercebida: 3, satisfacao: 2 }, impactoResidual: { justicaPercebida: 0.04 } },
  });
  return withSignal(state, event, employee.id, "formalizacao_funcao_rh", action, penalty);
}

function prioritizeCriticalTasks(state, action, target, definition, options) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  const employees = activeEmployeesInSector(state, sector.id);
  employees.forEach((employee) => {
    employee.sobrecarga = clampPercent(employee.sobrecarga - 8 * multiplier + penalty * 0.08);
    employee.satisfacao = clampPercent(employee.satisfacao + 2 * multiplier - penalty * 0.05);
    employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + 2 * multiplier - penalty * 0.04);
    employee.produtividade = clampPercent(employee.produtividade + 3 * multiplier);
  });
  sector.cargaTrabalho = clampPercent(sector.cargaTrabalho - 10 * multiplier);
  sector.climaSetor = clampPercent(sector.climaSetor + 4 * multiplier - penalty * 0.06);
  sector.rumorLocal = clampPercent(sector.rumorLocal - 5 * multiplier + penalty * 0.1);
  const event = interventionEvent(state, action, sector.id, employees.slice(0, 5).map((employee) => employee.id), `RH priorizou tarefas criticas em ${sector.nome}`, 48);
  generateMemoriesFromEvent(state, event, { rolesByEmployeeId: Object.fromEntries(employees.slice(0, 3).map((employee) => [employee.id, "afetado_direto"])) });
  return withSignal(state, event, null, "priorizacao_tarefas_rh", action, penalty);
}

function containRumor(state, action, target, definition, options) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  sector.rumorLocal = clampPercent(sector.rumorLocal - 16 * multiplier + penalty * 0.35);
  sector.climaSetor = clampPercent(sector.climaSetor + 6 * multiplier - penalty * 0.12);
  activeEmployeesInSector(state, sector.id).forEach((employee) => {
    employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + 2 * multiplier - penalty * 0.04);
  });
  state.company.rumorGlobal = clampPercent(state.company.rumorGlobal - 7 * multiplier + penalty * 0.2);
  const event = interventionEvent(state, action, sector.id, sector.funcionariosIds.slice(0, 5), `RH comunicou alinhamento para conter rumor em ${sector.nome}`, 44);
  return withSignal(state, event, null, "comunicacao_conter_rumor_rh", action, penalty);
}

function returnSurveyFeedback(state, action, target, definition, options) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  const employees = activeEmployeesInSector(state, sector.id);
  sector.climaSetor = clampPercent(sector.climaSetor + 10 * multiplier - penalty * 0.12);
  sector.rumorLocal = clampPercent(sector.rumorLocal - 8 * multiplier + penalty * 0.18);
  employees.forEach((employee) => {
    employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + 7 * multiplier - penalty * 0.08);
    employee.satisfacao = clampPercent(employee.satisfacao + 2 * multiplier - penalty * 0.04);
  });
  const event = interventionEvent(state, action, sector.id, employees.slice(0, 5).map((employee) => employee.id), `RH fez devolutiva de pesquisa em ${sector.nome}`, 44);
  generateMemoriesFromEvent(state, event, {});
  return withSignal(state, event, null, "devolutiva_pesquisa_rh", action, penalty);
}

function alignLeadership(state, action, target, definition, options) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  sector.climaSetor = clampPercent(sector.climaSetor + 6 * multiplier - penalty * 0.15);
  sector.reportFear = clampPercent(sector.reportFear - 5 * multiplier + penalty * 0.12);
  sector.psychologicalSafety = clampPercent(sector.psychologicalSafety + 5 * multiplier - penalty * 0.1);
  activeEmployeesInSector(state, sector.id).forEach((employee) => {
    employee.confiancaNaGestao = clampPercent(employee.confiancaNaGestao + 3 * multiplier - penalty * 0.08);
  });
  const leaderId = sector.liderancaFormalId;
  const involved = leaderId ? [leaderId] : sector.funcionariosIds.slice(0, 3);
  const event = interventionEvent(state, action, sector.id, involved, `RH alinhou lideranca em ${sector.nome}`, 54);
  generateMemoriesFromEvent(state, event, { rolesByEmployeeId: leaderId ? { [leaderId]: "lideranca" } : {} });
  return withSignal(state, event, null, "alinhamento_lideranca_rh", action, penalty);
}

function reinforceReportChannel(state, action, target, definition, options) {
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  const compliance = state.company.compliance;
  compliance.confiancaNoCanal = clampPercent(compliance.confiancaNoCanal + 9 * multiplier - penalty * 0.18);
  compliance.anonimatoPercebido = clampPercent(compliance.anonimatoPercebido + 6 * multiplier);
  compliance.protecaoContraRetaliacao = clampPercent(compliance.protecaoContraRetaliacao + 6 * multiplier);
  compliance.riscoSubnotificacao = clampPercent(compliance.riscoSubnotificacao - 10 * multiplier + penalty * 0.2);
  const event = interventionEvent(state, action, null, [], "RH reforcou o canal de denuncia e comunicou protecoes basicas", 58);
  return withSignal(state, event, null, "reforco_canal_denuncia_rh", action, penalty);
}

function protectAgainstRetaliation(state, action, target, definition, options) {
  const reportCase = state.reportCases.find((item) => item.id === (target.reportCaseId || target.denunciaId));
  if (!reportCase) throw new Error("proteger_contra_retaliacao exige denuncia valida");
  const employee = requireEmployee(state, reportCase.targetEmployeeId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  reportCase.riscoRetaliacao = clampPercent(reportCase.riscoRetaliacao - 18 * multiplier);
  reportCase.acoesTomadas.push(action.id);
  employee.medo = clampPercent(employee.medo - 6 * multiplier + penalty * 0.12);
  employee.confiancaNoRH = clampPercent(employee.confiancaNoRH + 6 * multiplier - penalty * 0.12);
  const event = interventionEvent(state, action, reportCase.setorId, [employee.id], "RH aplicou medidas de protecao contra retaliacao", 64);
  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: "beneficiado" },
    valencia: "positiva",
    customImpact: { impactoInicial: { medo: -3, confiancaNoRH: 3 }, impactoResidual: { medo: -0.04 } },
  });
  return withSignal(state, event, employee.id, "protecao_retaliacao_rh", action, penalty);
}

function investigateReport(state, action, target, definition, options) {
  const reportCase = state.reportCases.find((item) => item.id === (target.reportCaseId || target.denunciaId));
  if (!reportCase) throw new Error("investigar_denuncia exige denuncia valida");
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  reportCase.status = "investigada";
  reportCase.confiabilidadeInicial = clampPercent((reportCase.confiabilidadeInicial || 40) + 18 * multiplier);
  reportCase.riscoRetaliacao = clampPercent(reportCase.riscoRetaliacao - 8 * multiplier + penalty * 0.12);
  reportCase.acoesTomadas.push(action.id);
  const targetEmployee = requireEmployee(state, reportCase.targetEmployeeId);
  targetEmployee.confiancaNoRH = clampPercent(targetEmployee.confiancaNoRH + 5 * multiplier - penalty * 0.12);
  const event = interventionEvent(state, action, reportCase.setorId, [reportCase.targetEmployeeId], "RH investigou uma denuncia registrada", 66);
  generateMemoryForEmployee(state, targetEmployee, event, {
    rolesByEmployeeId: { [targetEmployee.id]: "afetado_direto" },
    valencia: penalty > 8 ? "ambivalente" : "positiva",
    customImpact: { impactoInicial: { confiancaNoRH: penalty > 8 ? -1 : 3, medo: penalty > 8 ? 1 : -2 }, impactoResidual: { medo: -0.03 } },
  });
  return withSignal(state, event, targetEmployee.id, "investigacao_denuncia_rh", action, penalty);
}

function applyCorrectiveAction(state, action, target, definition, options) {
  const reportCase = state.reportCases.find((item) => item.id === (target.reportCaseId || target.denunciaId));
  if (!reportCase) throw new Error("aplicar_acao_corretiva exige denuncia valida");
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  const sector = requireSector(state, reportCase.setorId);
  reportCase.status = "acao_corretiva_aplicada";
  reportCase.riscoRetaliacao = clampPercent(reportCase.riscoRetaliacao - 16 * multiplier);
  reportCase.acoesTomadas.push(action.id);
  sector.psychologicalSafety = clampPercent(sector.psychologicalSafety + 8 * multiplier - penalty * 0.12);
  sector.reportFear = clampPercent(sector.reportFear - 8 * multiplier + penalty * 0.1);
  sector.climaSetor = clampPercent(sector.climaSetor + 4 * multiplier);
  const targetEmployee = requireEmployee(state, reportCase.targetEmployeeId);
  targetEmployee.medo = clampPercent(targetEmployee.medo - 6 * multiplier + penalty * 0.1);
  targetEmployee.confiancaNoRH = clampPercent(targetEmployee.confiancaNoRH + 6 * multiplier);
  const event = interventionEvent(state, action, sector.id, [targetEmployee.id], "RH aplicou acao corretiva apos denuncia", 72);
  generateMemoriesFromEvent(state, event, { rolesByEmployeeId: { [targetEmployee.id]: "beneficiado" }, valencia: "positiva" });
  return withSignal(state, event, targetEmployee.id, "acao_corretiva_rh", action, penalty);
}

function prepareReplacementPlan(state, action, target, definition, options) {
  const sector = requireSector(state, target.sectorId || target.setorId);
  const multiplier = planningEffectMultiplier(definition, options.plan);
  const penalty = planningRiskPenalty(definition, options.plan);
  sector.alertasSetor.push({
    tipo: "reposicao_planejada",
    dia: state.calendar.totalDiasSimulados,
    qualidade: Math.round(multiplier * 100),
  });
  sector.cargaTrabalho = clampPercent(sector.cargaTrabalho - 3 * multiplier + penalty * 0.08);
  const event = interventionEvent(state, action, sector.id, sector.funcionariosIds.slice(0, 4), `RH preparou plano de reposicao para ${sector.nome}`, 46);
  return withSignal(state, event, null, "plano_reposicao_rh", action, penalty);
}

function interventionEvent(state, action, sectorId, involved, description, severity) {
  return createOrganizationEvent(state, {
    tipo: `rh_${action.tipo}`,
    descricao: description,
    setorId: sectorId,
    funcionariosEnvolvidos: involved,
    severidade: severity,
    origem: "acao_rh_intervencao",
    dados: { rhActionId: action.id, planejamento: action.planejamento },
    visivelParaRH: true,
    tags: ["rh", "intervencao", action.tipo],
  });
}

function withSignal(state, event, employeeId, type, action, penalty) {
  const signal = createVisibleSignal(state, {
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: employeeId,
    setorId: event.setorId,
    origemEventoId: event.id,
    tipo: type,
    origem: "acao_rh_intervencao",
    descricao: penalty > 8 ? "Intervencao RH com preparo insuficiente gerou leitura ambivalente." : event.descricao,
    severidade: event.severidade,
    confiabilidade: clampPercent(62 + (action.planejamento ? action.planejamento.qualidadePlanejamento * 0.25 : -12)),
    visivelParaRH: true,
    interpretacoesPossiveis: ["efeito_intervencao", "acompanhar_resultado", "risco_expectativa"],
    tags: ["rh", "intervencao", action.tipo],
  });
  state.visibleSignals.push(signal);
  return { events: [event], signals: [signal] };
}

function requireEmployee(state, employeeId) {
  const employee = state.employees.find((item) => item.id === employeeId);
  if (!employee) throw new Error(`funcionario alvo nao encontrado: ${employeeId}`);
  return employee;
}

function requireSector(state, sectorId) {
  const sector = state.sectors.find((item) => item.id === sectorId);
  if (!sector) throw new Error(`setor alvo nao encontrado: ${sectorId}`);
  return sector;
}

function findSector(state, sectorId) {
  return state.sectors.find((sector) => sector.id === sectorId);
}

function activeEmployeesInSector(state, sectorId) {
  return state.employees.filter((employee) => employee.status !== "desligado" && employee.setorId === sectorId);
}

function promoteSeniority(seniority) {
  if (seniority === "junior") return "pleno";
  if (seniority === "pleno") return "senior";
  if (seniority === "senior") return "lideranca";
  return seniority;
}

module.exports = {
  applyInterventionAction,
};
