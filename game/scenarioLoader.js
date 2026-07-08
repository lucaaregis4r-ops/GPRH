/**
 * Modulo: scenarioLoader
 * Responsabilidade: aplicar um cenario simples sobre uma sessao tecnica.
 * Entrada: sessao e id/definicao de cenario
 * Saida: sessao com metadados e pressoes iniciais do cenario
 * Nao deve: criar UI, avaliar resultado final ou rodar semanas.
 */

const { clampPercent } = require("../core/clamp");
const { getScenarioById } = require("../data/scenarioCatalog");
const { createOrganizationEvent } = require("../simulation/eventLog");
const { processVisibility } = require("../knowledge/visibilitySimulation");

function loadScenario(session, scenarioId = "crescimento_desorganizado") {
  const scenario = getScenarioById(scenarioId);
  session.scenario = {
    id: scenario.id,
    nome: scenario.nome,
    premissa: scenario.premissa,
    duracaoDias: scenario.duracaoDias,
    objetivos: { ...scenario.objetivos },
  };
  session.horizonteSemanas = scenario.horizonteSemanas;
  session.objectiveTracker.horizonteSemanas = scenario.horizonteSemanas;

  applyInitialScenarioPressure(session.state, scenario);
  return session;
}

function buildScenarioEngineConfig(scenarioId = "crescimento_desorganizado", engineConfig = {}) {
  const scenario = getScenarioById(scenarioId);
  return {
    ...(scenario.engineConfig || {}),
    ...engineConfig,
  };
}

function applyInitialScenarioPressure(state, scenario) {
  if (state.scenarioApplied) return state;
  const modifiers = scenario.modificadoresIniciais || {};

  state.company.arquetipo = "crescimento_desorganizado";
  adjustPercent(state.company, "pressaoPorResultado", modifiers.pressaoPorResultado);
  adjustPercent(state.company, "maturidadeGestao", modifiers.maturidadeGestao);
  adjustPercent(state.company, "capacidadeRH", modifiers.capacidadeRH);
  adjustPercent(state.company, "estabilidadeFinanceira", modifiers.estabilidadeFinanceira);
  adjustPercent(state.company, "culturaCuidado", modifiers.culturaCuidado);

  state.sectors.forEach((sector) => {
    adjustPercent(sector, "climaSetor", modifiers.climaSetor);
    adjustPercent(sector, "cargaTrabalho", modifiers.cargaTrabalho);
    adjustPercent(sector, "rumorLocal", modifiers.rumorLocal);
  });

  state.employees.forEach((employee) => {
    adjustPercent(employee, "satisfacao", modifiers.satisfacao);
    adjustPercent(employee, "sobrecarga", modifiers.sobrecarga);
    adjustPercent(employee, "confiancaNoRH", modifiers.confiancaNoRH);
    adjustPercent(employee, "riscoDeSaida", modifiers.riscoDeSaida);
  });

  const criticalSector = state.sectors
    .slice()
    .sort((left, right) => right.cargaTrabalho + right.rumorLocal - (left.cargaTrabalho + left.rumorLocal))[0];

  createOrganizationEvent(state, {
    tipo: "cenario_inicial",
    descricao:
      "Cenario inicial: crescimento rapido gerou acumulacao de funcoes, sobrecarga visivel e cobranca maior sobre o RH.",
    setorId: criticalSector ? criticalSector.id : null,
    severidade: 58,
    origem: "cenario",
    visivelParaRH: true,
    tags: ["cenario", "sobrecarga", "crescimento"],
  });

  state.scenarioApplied = scenario.id;
  processVisibility(state);
  return state;
}

function adjustPercent(target, field, delta = 0) {
  if (!delta || typeof target[field] !== "number") return;
  target[field] = clampPercent(target[field] + delta);
}

module.exports = {
  loadScenario,
  buildScenarioEngineConfig,
  applyInitialScenarioPressure,
};
