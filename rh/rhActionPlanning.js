/**
 * Modulo: rhActionPlanning
 * Responsabilidade: planejar e amadurecer acoes do RH ao longo dos dias.
 * Entrada: state, tipo de acao e alvo
 * Saida: planos em state.rh.acoesPlanejadas e execucao quando prontos
 * Nao deve: conter UI, campanha ou regras especificas de intervencao.
 */

const { getRhActionDefinition } = require("./rhActionCatalog");
const { initializeRhState } = require("./rhEnergy");

function planRhAction(state, type, target = {}, options = {}) {
  initializeRhState(state);
  const definition = getRhActionDefinition(type);
  if (!definition) throw new Error(`acao RH desconhecida: ${type}`);

  if (!state.rh.acoesPlanejadas) state.rh.acoesPlanejadas = [];

  const plannedDays = options.diasPreparo ?? definition.preparoIdealDias ?? 1;
  const plan = {
    id: state.idFactory.nextId("rh_plan"),
    tipo: definition.tipo,
    nome: definition.nome,
    categoria: definition.categoria,
    alvo: target,
    diaPlanejamento: state.calendar.totalDiasSimulados,
    diasPreparoPlanejados: plannedDays,
    diasPreparados: 0,
    executarNoDia: state.calendar.totalDiasSimulados + plannedDays,
    status: "planejada",
    qualidadePlanejamento: 0,
    acaoExecutadaId: null,
  };

  state.rh.acoesPlanejadas.push(plan);
  return plan;
}

function advanceRhPlanningOneDay(state, executeFn) {
  initializeRhState(state);
  if (!state.rh.acoesPlanejadas) state.rh.acoesPlanejadas = [];

  const executed = [];
  state.rh.acoesPlanejadas.forEach((plan) => {
    if (plan.status !== "planejada") return;
    plan.diasPreparados += 1;
    const definition = getRhActionDefinition(plan.tipo);
    plan.qualidadePlanejamento = calculatePlanningQuality(definition, plan.diasPreparados);

    if (state.calendar.totalDiasSimulados >= plan.executarNoDia) {
      try {
        const action = executeFn(state, plan.tipo, plan.alvo, { plan });
        plan.status = action.status === "negada_diretoria" ? "negada_diretoria" : "executada";
        plan.acaoExecutadaId = action.id;
        executed.push(action);
      } catch (error) {
        plan.status = "bloqueada";
        plan.motivoBloqueio = error.message;
      }
    }
  });

  return executed;
}

function calculatePlanningQuality(definition, preparedDays) {
  const minimum = definition.preparoMinimoDias || 1;
  const ideal = Math.max(minimum, definition.preparoIdealDias || minimum);
  if (preparedDays < minimum) return Math.max(0, Math.round((preparedDays / minimum) * 45));
  if (preparedDays >= ideal) return 100;
  return Math.round(55 + ((preparedDays - minimum) / Math.max(1, ideal - minimum)) * 45);
}

function planningEffectMultiplier(definition, plan) {
  if (!plan) return definition.permiteImproviso ? 0.62 : 0.35;
  const quality = plan.qualidadePlanejamento ?? calculatePlanningQuality(definition, plan.diasPreparados || 0);
  return 0.55 + quality * 0.006;
}

function planningRiskPenalty(definition, plan) {
  if (!plan) return definition.permiteImproviso ? 10 : 24;
  const quality = plan.qualidadePlanejamento ?? 0;
  return Math.max(0, Math.round((70 - quality) * 0.25));
}

module.exports = {
  planRhAction,
  advanceRhPlanningOneDay,
  calculatePlanningQuality,
  planningEffectMultiplier,
  planningRiskPenalty,
};
