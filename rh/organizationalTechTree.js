/**
 * Modulo: organizationalTechTree
 * Responsabilidade: controlar tecnologias/processos organizacionais do RH.
 * Entrada: state, tecnologia e recursos disponiveis
 * Saida: state.rh.technologies atualizado
 * Nao deve: renderizar UI, revelar dados brutos ou executar acoes comuns de RH.
 */

const ORGANIZATIONAL_TECHS = [
  { id: "employee_registry", name: "Registro de Funcionarios", category: "admin", maxLevel: 1, defaultLevel: 1 },
  { id: "org_chart", name: "Organograma", category: "structure", maxLevel: 4, defaultLevel: 0 },
  { id: "task_mapping", name: "Mapeamento de Tarefas", category: "work", maxLevel: 3, defaultLevel: 0 },
  { id: "basic_dashboard", name: "Dashboard Basico", category: "analytics", maxLevel: 3, defaultLevel: 0 },
  { id: "climate_survey", name: "Pesquisa de Clima", category: "climate", maxLevel: 3, defaultLevel: 0 },
  { id: "reporting_channel", name: "Canal de Denuncia", category: "compliance", maxLevel: 3, defaultLevel: 0 },
  { id: "people_analytics", name: "People Analytics", category: "analytics", maxLevel: 3, defaultLevel: 0 },
];

function initializeOrganizationalTechnologies(state) {
  if (!state.rh) state.rh = {};
  state.rh.technologies = state.rh.technologies || {};
  ORGANIZATIONAL_TECHS.forEach((tech) => {
    if (!state.rh.technologies[tech.id]) {
      state.rh.technologies[tech.id] = {
        id: tech.id,
        level: tech.defaultLevel,
        unlocked: tech.defaultLevel > 0,
      };
    }
  });
  return state.rh.technologies;
}

function getTechnologyLevel(state, techId) {
  initializeOrganizationalTechnologies(state);
  return state.rh.technologies[techId]?.level || 0;
}

function unlockTechnology(state, techId, options = {}) {
  initializeOrganizationalTechnologies(state);
  const tech = getTechDefinition(techId);
  const current = state.rh.technologies[techId];
  if (current.unlocked) return current;
  payTechnologyCost(state, tech, 1, options);
  current.unlocked = true;
  current.level = Math.max(1, current.level || 0);
  current.unlockedAtDay = state.calendar?.totalDiasSimulados || 0;
  return current;
}

function upgradeTechnology(state, techId, options = {}) {
  initializeOrganizationalTechnologies(state);
  const tech = getTechDefinition(techId);
  const current = state.rh.technologies[techId];
  if (!current.unlocked) unlockTechnology(state, techId, options);
  if (current.level >= tech.maxLevel) return current;
  payTechnologyCost(state, tech, current.level + 1, options);
  current.level += 1;
  current.upgradedAtDay = state.calendar?.totalDiasSimulados || 0;
  return current;
}

function getTechnologyCatalogSnapshot(state) {
  initializeOrganizationalTechnologies(state);
  return ORGANIZATIONAL_TECHS.map((tech) => ({
    id: tech.id,
    name: tech.name,
    category: tech.category,
    maxLevel: tech.maxLevel,
    level: state.rh.technologies[tech.id]?.level || 0,
    unlocked: Boolean(state.rh.technologies[tech.id]?.unlocked),
  }));
}

function payTechnologyCost(state, tech, targetLevel, options) {
  if (options.free) return;
  const cost = calculateTechnologyCost(state, tech, targetLevel);
  if ((state.rh.energiaAtual || 0) < cost.energy) throw new Error(`energia RH insuficiente para ${tech.id}`);
  if ((state.rh.orcamentoRH || 0) < cost.budget) throw new Error(`orcamento RH insuficiente para ${tech.id}`);
  if ((state.rh.maturidadeRH || 0) < cost.requiredMaturity) throw new Error(`maturidade RH insuficiente para ${tech.id}`);
  state.rh.energiaAtual -= cost.energy;
  state.rh.orcamentoRH -= cost.budget;
}

function calculateTechnologyCost(state, tech, targetLevel) {
  const baseBudget = Math.max(500, Math.round((state.economy?.receitaMensalBase || 100000) * 0.004));
  return {
    energy: Math.max(1, targetLevel),
    budget: baseBudget * targetLevel,
    requiredMaturity: Math.min(80, 15 + targetLevel * 8 + (tech.category === "analytics" ? 5 : 0)),
  };
}

function getTechDefinition(techId) {
  const tech = ORGANIZATIONAL_TECHS.find((item) => item.id === techId);
  if (!tech) throw new Error(`tecnologia desconhecida: ${techId}`);
  return tech;
}

module.exports = {
  ORGANIZATIONAL_TECHS,
  initializeOrganizationalTechnologies,
  getTechnologyLevel,
  unlockTechnology,
  upgradeTechnology,
  getTechnologyCatalogSnapshot,
  calculateTechnologyCost,
};
