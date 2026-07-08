/**
 * Script simples de validacao local.
 * Execute dentro da pasta dos arquivos expandidos:
 * node validateDataShape.js
 */

const { ECONOMIC_PROFILES, COMPANY_SIZES } = require("./economicProfiles");
const { FIRST_NAMES, LAST_NAMES } = require("./nomes");
const { OCCUPATION_CATALOG } = require("./occupationCatalog");
const { SCENARIOS, getScenarioById, listScenarios } = require("./scenarioCatalog");
const { PSYCHOSOCIAL_RISK_EVENTS, REPORT_STATUS } = require("./complianceCatalog");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPair(value) {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number");
}

assert(Array.isArray(ECONOMIC_PROFILES) && ECONOMIC_PROFILES.length >= 3, "ECONOMIC_PROFILES invalido");
assert(Array.isArray(COMPANY_SIZES) && COMPANY_SIZES.length >= 3, "COMPANY_SIZES invalido");
assert(Array.isArray(FIRST_NAMES) && FIRST_NAMES.length >= 20, "FIRST_NAMES invalido");
assert(Array.isArray(LAST_NAMES) && LAST_NAMES.length >= 16, "LAST_NAMES invalido");
assert(Array.isArray(OCCUPATION_CATALOG) && OCCUPATION_CATALOG.length >= 12, "OCCUPATION_CATALOG invalido");
assert(Array.isArray(SCENARIOS) && SCENARIOS.length >= 1, "SCENARIOS invalido");
assert(typeof getScenarioById === "function" && typeof listScenarios === "function", "funcoes de scenarioCatalog ausentes");
assert(Array.isArray(PSYCHOSOCIAL_RISK_EVENTS) && PSYCHOSOCIAL_RISK_EVENTS.length >= 7, "PSYCHOSOCIAL_RISK_EVENTS invalido");
assert(REPORT_STATUS.UNDER_REPORTED === "subnotificado", "REPORT_STATUS basico alterado");

for (const profile of ECONOMIC_PROFILES) {
  assert(profile.id && profile.nome, `perfil economico sem id/nome: ${JSON.stringify(profile)}`);
  assert(isPair(profile.receitaBase), `receitaBase invalida em ${profile.id}`);
  assert(isPair(profile.custoFixoBase), `custoFixoBase invalida em ${profile.id}`);
  assert(isPair(profile.riscoCriseBase), `riscoCriseBase invalida em ${profile.id}`);
  assert(Array.isArray(profile.setoresEssenciais) && profile.setoresEssenciais.length > 0, `setoresEssenciais ausente em ${profile.id}`);
}

for (const occupation of OCCUPATION_CATALOG) {
  assert(occupation.id && occupation.titulo, `ocupacao sem id/titulo: ${JSON.stringify(occupation)}`);
  assert(Array.isArray(occupation.setorAfinidade) && occupation.setorAfinidade.length > 0, `setorAfinidade invalido em ${occupation.id}`);
  assert(Array.isArray(occupation.senioridadesPossiveis) && occupation.senioridadesPossiveis.length > 0, `senioridades ausentes em ${occupation.id}`);
  assert(occupation.salaryBand && typeof occupation.salaryBand === "object", `salaryBand ausente em ${occupation.id}`);
  for (const seniority of occupation.senioridadesPossiveis) {
    assert(isPair(occupation.salaryBand[seniority]), `salaryBand sem faixa para ${seniority} em ${occupation.id}`);
  }
  assert(Array.isArray(occupation.tarefasBase) && occupation.tarefasBase.length >= 3, `tarefasBase fraca em ${occupation.id}`);
}


const economicProfileIds = new Set(ECONOMIC_PROFILES.map((profile) => profile.id));
for (const scenario of SCENARIOS) {
  if (scenario.engineConfig.economicProfileId) {
    assert(economicProfileIds.has(scenario.engineConfig.economicProfileId), `economicProfileId inexistente em ${scenario.id}: ${scenario.engineConfig.economicProfileId}`);
  }
}

for (const scenario of SCENARIOS) {
  assert(scenario.id && scenario.nome, `cenario sem id/nome: ${JSON.stringify(scenario)}`);
  assert(scenario.engineConfig && scenario.engineConfig.size, `engineConfig.size ausente em ${scenario.id}`);
  assert(isPair(scenario.engineConfig.size.employeeRange), `employeeRange invalido em ${scenario.id}`);
  assert(isPair(scenario.engineConfig.size.cashMonths), `cashMonths invalido em ${scenario.id}`);
  assert(scenario.modificadoresIniciais && typeof scenario.modificadoresIniciais === "object", `modificadores ausentes em ${scenario.id}`);
  assert(scenario.objetivos && typeof scenario.objetivos === "object", `objetivos ausentes em ${scenario.id}`);
}

console.log("OK - dados expandidos carregam e preservam o formato basico.");
console.log({
  economicProfiles: ECONOMIC_PROFILES.length,
  companySizes: COMPANY_SIZES.length,
  firstNames: FIRST_NAMES.length,
  lastNames: LAST_NAMES.length,
  occupations: OCCUPATION_CATALOG.length,
  scenarios: SCENARIOS.length,
  psychosocialRiskEvents: PSYCHOSOCIAL_RISK_EVENTS.length,
});
