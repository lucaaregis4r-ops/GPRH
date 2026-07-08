/**
 * Modulo: employeeSimulation
 * Responsabilidade: aplicar impactos humanos diarios e mensais.
 * Entrada: state
 * Saida: funcionarios e setores atualizados
 * Nao deve: calcular fechamento financeiro ou imprimir relatorios.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("./eventLog");
const { generateMemoriesFromEvent } = require("./memoryInterpretation");
const { applyResidualMemoryEffects } = require("./memoryInterpretation");

function simulateEmployeesOneDay(state) {
  const { employees, sectors, company, economy, rng } = state;
  const sectorById = new Map(sectors.map((sector) => [sector.id, sector]));
  const financialStress = calculateFinancialStress(economy);

  activeEmployees(employees).forEach((employee) => {
    const sector = sectorById.get(employee.setorId);
    const workloadPressure = (sector.cargaTrabalho - 60) * 0.006 + (company.pressaoPorResultado - 60) * 0.004;
    const careBuffer = (company.culturaCuidado - 50) * 0.006;
    const dailyNoise = rng.float(-0.45, 0.45);

    employee.sobrecarga = clampPercent(employee.sobrecarga + workloadPressure + financialStress * 0.012 + dailyNoise);
    employee.satisfacao = clampPercent(
      employee.satisfacao -
        Math.max(0, employee.sobrecarga - 70) * 0.003 -
        financialStress * 0.004 +
        careBuffer +
        rng.float(-0.25, 0.25)
    );
    employee.confiancaNaGestao = clampPercent(
      employee.confiancaNaGestao -
        financialStress * 0.006 +
        (company.maturidadeGestao - 50) * 0.004 +
        rng.float(-0.2, 0.2)
    );
    employee.medo = clampPercent(employee.medo + financialStress * 0.008 - company.estabilidadeFinanceira * 0.003);
    employee.suportePercebido = clampPercent(
      employee.suportePercebido +
        (company.suporteOrganizacionalMedio - employee.suportePercebido) * 0.015 -
        financialStress * 0.004 +
        rng.float(-0.2, 0.2)
    );
    employee.justicaPercebida = clampPercent(
      employee.justicaPercebida +
        (company.justicaOrganizacionalMedia - employee.justicaPercebida) * 0.015 -
        Math.max(0, employee.sobrecarga - 75) * 0.006 +
        rng.float(-0.2, 0.2)
    );
    employee.comprometimentoOrganizacional = clampPercent(
      employee.satisfacao * 0.32 +
        employee.confiancaNaGestao * 0.2 +
        employee.confiancaNoRH * 0.12 +
        employee.suportePercebido * 0.14 +
        employee.vinculoOrganizacional * 0.22
    );
    applyResidualMemoryEffects(employee);
    employee.produtividade = clampPercent(
      employee.produtividade +
        (employee.qualificacao - 55) * 0.01 -
        Math.max(0, employee.sobrecarga - 70) * 0.025 +
        rng.float(-0.4, 0.4)
    );
    employee.intencaoSaida = clampPercent(
      100 -
        employee.satisfacao +
        employee.sobrecarga * 0.16 +
        employee.medo * 0.12 +
        employee.empregabilidadeExterna * 0.1 +
        (employee.nivelEnsinoMercado || 50) * 0.025 +
        (employee.especializacao || 50) * 0.035 +
        Math.max(0, 48 - (employee.ajusteEducacaoCargo || 70)) * 0.08 +
        Math.max(0, 48 - (employee.ajusteEspecializacaoCargo || 70)) * 0.08 +
        Math.max(0, (employee.ajusteEducacaoCargo || 70) - 82) * 0.04 +
        Math.max(0, (employee.ajusteEspecializacaoCargo || 70) - 82) * 0.04 +
        Math.max(0, 50 - employee.salarioPercebidoMercado) * 0.18 -
        employee.confiancaNaGestao * 0.13 -
        employee.confiancaNoRH * 0.08 -
        employee.suportePercebido * 0.1 -
        employee.justicaPercebida * 0.1 -
        employee.vinculoOrganizacional * 0.14
    );
    employee.riscoDeSaida = employee.intencaoSaida;
    employee.diasDesdeUltimaAcao += 1;

    employee.historicoDiario.push({
      dia: state.calendar.totalDiasSimulados,
      satisfacao: employee.satisfacao,
      sobrecarga: employee.sobrecarga,
      riscoDeSaida: employee.riscoDeSaida,
    });

    if (employee.historicoDiario.length > 45) employee.historicoDiario.shift();
  });

  sectors.forEach((sector) => {
    const sectorEmployees = activeEmployees(employees).filter((employee) => employee.setorId === sector.id);
    if (!sectorEmployees.length) return;
    const averageSatisfaction = average(sectorEmployees.map((employee) => employee.satisfacao));
    const averageOverload = average(sectorEmployees.map((employee) => employee.sobrecarga));
    sector.climaSetor = clampPercent(averageSatisfaction * 0.55 + (100 - averageOverload) * 0.25 + company.culturaCuidado * 0.2);
  });
}

function applyMonthlyHumanFinancialEffects(state, financialSnapshot) {
  const { employees, sectors, company, rng, calendar } = state;
  const resultPressure = financialSnapshot.lucroPrejuizoMensal < 0 ? 4 : -2;
  const cashLow = financialSnapshot.caixaAtual < financialSnapshot.folhaPagamentoMensal * 2;
  const pressure = resultPressure + (cashLow ? 4 : 0);

  company.estabilidadeFinanceira = clampPercent(company.estabilidadeFinanceira - pressure * 0.8);

  activeEmployees(employees).forEach((employee) => {
    employee.satisfacao = clampPercent(employee.satisfacao - pressure * 0.45);
    employee.confiancaNaGestao = clampPercent(employee.confiancaNaGestao - pressure * 0.35);
    employee.medo = clampPercent(employee.medo + pressure * 0.55);
    employee.sobrecarga = clampPercent(employee.sobrecarga + Math.max(0, pressure * 0.22));
    employee.riscoDeSaida = clampPercent(employee.riscoDeSaida + pressure * 0.45);
  });

  if (pressure >= 7) {
    const affectedSector = rng.pick([...sectors].sort((a, b) => b.cargaTrabalho - a.cargaTrabalho).slice(0, 3));
    const involved = employees
      .filter((employee) => !affectedSector || employee.setorId === affectedSector.id)
      .sort((left, right) => right.medo + right.sobrecarga - (left.medo + left.sobrecarga))
      .slice(0, 2)
      .map((employee) => employee.id);

    const event = createOrganizationEvent(state, {
      tipo: "medo_financeiro",
      descricao: "Pressao financeira aumentou medo e sobrecarga percebida",
      setorId: affectedSector ? affectedSector.id : null,
      funcionariosEnvolvidos: involved,
      severidade: clampPercent(55 + pressure * 4),
      origem: "fechamento_mensal",
      dados: { medo: pressure, sobrecarga: Math.round(pressure / 2) },
      visivelParaRH: true,
      tags: ["financeiro", "medo"],
    });
    generateMemoriesFromEvent(state, event, {
      rolesByEmployeeId: Object.fromEntries(involved.map((employeeId) => [employeeId, "afetado_direto"])),
    });
  }
}

function calculateFinancialStress(economy) {
  const monthlyCosts = economy.custoFixoMensal + economy.folhaPagamentoMensal + economy.outrosCustosMensais;
  const runwayStress = economy.caixaAtual < monthlyCosts ? 55 : economy.caixaAtual < monthlyCosts * 2 ? 28 : 8;
  const resultStress = economy.lucroPrejuizoMensal < 0 ? 18 : 0;
  return runwayStress + resultStress + economy.indiceCrise * 0.2;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function activeEmployees(employees) {
  return employees.filter((employee) => employee.status !== "desligado");
}

module.exports = {
  simulateEmployeesOneDay,
  applyMonthlyHumanFinancialEffects,
};
