/**
 * Modulo: rhActionProcessor
 * Responsabilidade: validar, registrar e processar acoes do RH.
 * Entrada: state, tipo de acao e alvo
 * Saida: rhAction registrada com efeitos
 * Nao deve: conter UI, campanha ou intervencoes complexas.
 */

const { getRhActionDefinition } = require("./rhActionCatalog");
const { consumeRhEnergy, initializeRhState } = require("./rhEnergy");
const { applyDiscoveryAction } = require("./discoveryActions");
const { applyInterventionAction } = require("./interventionActions");
const { planRhAction } = require("./rhActionPlanning");
const { evaluateDirectorApproval } = require("./directorApproval");
const { refreshPerceivedState } = require("../knowledge/perceivedState");

function processRhAction(state, type, target = {}, options = {}) {
  initializeRhState(state);
  const definition = getRhActionDefinition(type);
  if (!definition) throw new Error(`acao RH desconhecida: ${type}`);

  validateTarget(state, definition, target);
  if (!consumeRhEnergy(state, definition.custoEnergia)) {
    throw new Error(`energia RH insuficiente para ${type}`);
  }

  const planning = options.plan
    ? {
        planId: options.plan.id,
        diasPreparados: options.plan.diasPreparados,
        qualidadePlanejamento: options.plan.qualidadePlanejamento,
        improvisada: false,
      }
    : {
        planId: null,
        diasPreparados: 0,
        qualidadePlanejamento: 0,
        improvisada: true,
      };

  if (planning.improvisada && definition.permiteImproviso === false) {
    state.rh.energiaAtual += definition.custoEnergia;
    throw new Error(`${type} exige planejamento previo`);
  }

  const rhAction = {
    id: state.idFactory.nextId("rh_action"),
    tipo: definition.tipo,
    nome: definition.nome,
    categoria: definition.categoria,
    dia: state.calendar.totalDiasSimulados,
    custoEnergia: definition.custoEnergia,
    custoFinanceiro: definition.custoFinanceiro,
    duracaoDias: definition.duracaoDias,
    alvo: target,
    status: "concluida",
    planejamento: planning,
    aprovacaoDiretoria: null,
    eventosGerados: [],
    sinaisGerados: [],
    riscos: definition.riscos,
  };

  const approval = evaluateDirectorApproval(state, definition, rhAction, target);
  rhAction.aprovacaoDiretoria = approval;
  if (approval.eventoId) rhAction.eventosGerados.push(approval.eventoId);
  if (approval.sinalId) rhAction.sinaisGerados.push(approval.sinalId);

  if (approval.necessaria && !approval.aprovada) {
    rhAction.status = "negada_diretoria";
    state.rh.acoesExecutadas.push(rhAction);
    refreshPerceivedState(state);
    return rhAction;
  }

  if (definition.custoFinanceiro > 0) {
    if (state.economy.caixaAtual < definition.custoFinanceiro) {
      state.rh.energiaAtual += definition.custoEnergia;
      throw new Error(`caixa insuficiente para ${type}`);
    }
    state.economy.caixaAtual -= definition.custoFinanceiro;
  }

  const result =
    definition.categoria === "intervencao"
      ? applyInterventionAction(state, rhAction, target, definition, options)
      : applyDiscoveryAction(state, rhAction, target, definition, options);
  rhAction.eventosGerados = [...rhAction.eventosGerados, ...(result.events || []).map((event) => event.id)];
  rhAction.sinaisGerados = [...rhAction.sinaisGerados, ...(result.signals || []).map((signal) => signal.id)];
  state.rh.acoesExecutadas.push(rhAction);
  refreshPerceivedState(state);

  return rhAction;
}

function scheduleRhAction(state, type, target = {}, options = {}) {
  const definition = getRhActionDefinition(type);
  if (!definition) throw new Error(`acao RH desconhecida: ${type}`);
  validateTarget(state, definition, target);
  return planRhAction(state, type, target, options);
}

function validateTarget(state, definition, target) {
  if (definition.alvo === "funcionario") {
    const employeeId = target.employeeId || target.funcionarioId;
    const employee = state.employees.find((item) => item.id === employeeId);
    if (!employee || employee.status === "desligado") throw new Error(`${definition.tipo} exige funcionario ativo`);
  }

  if (definition.alvo === "funcionario_desligado") {
    const employeeId = target.employeeId || target.funcionarioId;
    const employee = state.employees.find((item) => item.id === employeeId);
    if (!employee || employee.status !== "desligado") throw new Error(`${definition.tipo} exige funcionario desligado`);
  }

  if (definition.alvo === "setor") {
    const sectorId = target.sectorId || target.setorId;
    if (!state.sectors.some((sector) => sector.id === sectorId)) throw new Error(`${definition.tipo} exige setor valido`);
  }

  if (definition.alvo === "empresa") {
    return;
  }

  if (definition.alvo === "denuncia") {
    const reportCaseId = target.reportCaseId || target.denunciaId;
    if (!state.reportCases.some((reportCase) => reportCase.id === reportCaseId)) {
      throw new Error(`${definition.tipo} exige denuncia valida`);
    }
  }
}

module.exports = {
  processRhAction,
  scheduleRhAction,
};
