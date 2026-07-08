/**
 * Modulo: companySimulation
 * Responsabilidade: orquestrar mudancas diarias de empresa que nao pertencem a um unico funcionario.
 * Entrada: state
 * Saida: estado organizacional atualizado
 * Nao deve: renderizar UI ou criar estado inicial.
 */

const { clampPercent } = require("../core/clamp");

function updateCompanyDailySignals(state) {
  const activeEmployees = state.employees.filter((employee) => employee.status !== "desligado");
  const averageSatisfaction = average(activeEmployees.map((employee) => employee.satisfacao));
  const averageFear = average(activeEmployees.map((employee) => employee.medo));
  const averageOverload = average(activeEmployees.map((employee) => employee.sobrecarga));
  const averageRisk = average(activeEmployees.map((employee) => employee.riscoDeSaida));
  const averageJustice = average(activeEmployees.map((employee) => employee.justicaPercebida));
  const averageSupport = average(activeEmployees.map((employee) => employee.suportePercebido));
  const companyTurnoverRate = calculateCompanyTurnoverRate(state, activeEmployees.length);
  state.company.taxaTurnover = companyTurnoverRate;

  state.company.dadosVisiveis = {
    climaGeralEstimado: clampPercent(averageSatisfaction * 0.65 + (100 - averageFear) * 0.2),
    sinaisSobrecarga: clampPercent(averageOverload),
    taxaTurnoverEmpresa: companyTurnoverRate,
    riscoRotatividadePercebido: companyTurnoverRate,
    pressaoFinanceiraPercebida: state.economy.caixaAtual < state.economy.folhaPagamentoMensal * 2 ? "alta" : "moderada",
  };
  state.company.justicaOrganizacionalMedia = clampPercent(averageJustice || state.company.justicaOrganizacionalMedia);
  state.company.suporteOrganizacionalMedio = clampPercent(averageSupport || state.company.suporteOrganizacionalMedio);
  state.company.rumorGlobal = clampPercent(
    state.company.rumorGlobal * 0.985 + average(state.sectors.map((sector) => sector.rumorLocal)) * 0.015
  );

  state.company.dadosOcultos.riscoDependenciaIndividual = clampPercent(
    Math.max(...activeEmployees.map((employee) => employee.especializacao + employee.influenciaInformal * 0.3), 0)
  );

  state.sectors.forEach((sector) => {
    const activeInSector = activeEmployees.filter((employee) => employee.setorId === sector.id).length;
    sector.taxaTurnover = calculateSectorTurnoverRate(sector, activeInSector);
    sector.dadosVisiveis = {
      ...(sector.dadosVisiveis || {}),
      taxaTurnoverSetor: sector.taxaTurnover,
    };
  });
}

function calculateCompanyTurnoverRate(state, activeCount) {
  const turnover = state.company.turnoverAcumulado || 0;
  const base = Math.max(1, activeCount + turnover);
  return clampPercent((turnover / base) * 100);
}

function calculateSectorTurnoverRate(sector, activeCount) {
  const turnover = sector.turnoverAcumulado || 0;
  const base = Math.max(1, activeCount + turnover);
  return clampPercent((turnover / base) * 100);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

module.exports = {
  updateCompanyDailySignals,
};
