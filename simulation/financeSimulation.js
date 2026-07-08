/**
 * Modulo: financeSimulation
 * Responsabilidade: inicializar e atualizar economia basica da empresa.
 * Entrada: companyState, rng, idFactory
 * Saida: economia atualizada e eventos financeiros registrados
 * Nao deve: renderizar UI ou gerar funcionarios.
 */

const { clampPercent } = require("../core/clamp");
const { ECONOMIC_PROFILES } = require("../data/economicProfiles");
const { createOrganizationEvent } = require("./eventLog");
const { generateMemoriesFromEvent } = require("./memoryInterpretation");

function initializeEconomy(company, employees, rng) {
  const profile = ECONOMIC_PROFILES.find((item) => item.id === company.economicProfileId);
  const payroll = employees.reduce((sum, employee) => sum + employee.salarioMensal, 0);
  const fixedCosts = rng.int(profile.custoFixoBase[0], profile.custoFixoBase[1]);
  const revenueBase = Math.max(rng.int(profile.receitaBase[0], profile.receitaBase[1]), payroll + fixedCosts * 0.75);
  const otherCosts = Math.round(fixedCosts * rng.float(0.12, 0.28));
  const monthlyBurn = fixedCosts + payroll + otherCosts;
  const cashMonths = rng.float(company.cashMonthsRange[0], company.cashMonthsRange[1]);

  return {
    caixaAtual: Math.round(monthlyBurn * cashMonths),
    receitaMensalBase: revenueBase,
    receitaMensalAtual: revenueBase,
    custoFixoMensal: fixedCosts,
    folhaPagamentoMensal: payroll,
    outrosCustosMensais: otherCosts,
    lucroPrejuizoMensal: 0,
    inflacaoMensalAtual: rng.float(0.004, 0.018, 4),
    inflacaoAcumulada: 0,
    indiceCrise: 0,
    confiancaDoMercado: clampPercent(rng.int(38, 78) + (company.estabilidadeFinanceira - 50) * 0.2),
    eventosEconomicosAtivos: [],
    historicoFinanceiro: [],
  };
}

function maybeGenerateEconomicEvent(state) {
  const { company, economy, rng, idFactory, calendar } = state;
  const cashPressure = economy.caixaAtual < economy.folhaPagamentoMensal + economy.custoFixoMensal ? 18 : 0;
  const inflationPressure = economy.inflacaoAcumulada > 0.04 ? 8 : 0;
  const chance = company.riscoCrise * 0.06 + cashPressure + inflationPressure + economy.indiceCrise * 0.08;

  if (!state.rng.chance(chance)) return null;

  const options = [
    {
      tipo: "queda_receita",
      descricaoCurta: "Queda temporaria de receita",
      impactoReceita: -state.rng.float(0.06, 0.18),
      impactoCustos: 0,
      impactoConfiancaGestao: -4,
      impactoPressaoResultado: 5,
    },
    {
      tipo: "aumento_custos",
      descricaoCurta: "Fornecedores ficaram mais caros",
      impactoReceita: 0,
      impactoCustos: state.rng.float(0.05, 0.16),
      impactoConfiancaGestao: -3,
      impactoPressaoResultado: 4,
    },
    {
      tipo: "congelamento_contratacoes",
      descricaoCurta: "Contratacoes foram congeladas",
      impactoReceita: 0,
      impactoCustos: -state.rng.float(0.01, 0.04),
      impactoConfiancaGestao: -5,
      impactoPressaoResultado: 8,
    },
  ];

  const selected = state.rng.pick(options);
  return {
    id: idFactory.nextId("economic_event"),
    tipo: selected.tipo,
    intensidade: clampPercent(state.rng.int(45, 82) + cashPressure),
    dia: calendar.totalDiasSimulados,
    duracaoDias: state.rng.int(20, 70),
    impactoReceita: selected.impactoReceita,
    impactoCustos: selected.impactoCustos,
    impactoConfiancaGestao: selected.impactoConfiancaGestao,
    impactoPressaoResultado: selected.impactoPressaoResultado,
    descricaoCurta: selected.descricaoCurta,
    visivelParaRH: state.rng.chance(65),
  };
}

function closeFinancialMonth(state) {
  const { company, economy, calendar, history, idFactory } = state;
  const event = maybeGenerateEconomicEvent(state);

  if (event) {
    economy.eventosEconomicosAtivos.push(event);
    economy.indiceCrise = clampPercent(economy.indiceCrise + event.intensidade * 0.22);
    company.pressaoPorResultado = clampPercent(company.pressaoPorResultado + event.impactoPressaoResultado);
    history.push({
      day: calendar.totalDiasSimulados,
      type: "economic_event",
      description: event.descricaoCurta,
      effects: event,
    });
  }

  const activeRevenueImpact = economy.eventosEconomicosAtivos.reduce((sum, item) => sum + item.impactoReceita, 0);
  const activeCostImpact = economy.eventosEconomicosAtivos.reduce((sum, item) => sum + item.impactoCustos, 0);
  const inflationFactor = 1 + economy.inflacaoMensalAtual;
  economy.inflacaoAcumulada = Math.round((economy.inflacaoAcumulada + economy.inflacaoMensalAtual) * 10000) / 10000;
  economy.custoFixoMensal = Math.round(economy.custoFixoMensal * (inflationFactor + activeCostImpact));
  economy.outrosCustosMensais = Math.round(economy.outrosCustosMensais * (inflationFactor + Math.max(0, activeCostImpact)));
  economy.receitaMensalAtual = Math.round(economy.receitaMensalBase * (1 + activeRevenueImpact));
  economy.lucroPrejuizoMensal =
    economy.receitaMensalAtual - economy.custoFixoMensal - economy.folhaPagamentoMensal - economy.outrosCustosMensais;
  economy.caixaAtual += economy.lucroPrejuizoMensal;
  economy.inflacaoMensalAtual = Math.max(0.003, economy.inflacaoMensalAtual + state.rng.float(-0.002, 0.004, 4));

  economy.eventosEconomicosAtivos = economy.eventosEconomicosAtivos
    .map((item) => ({ ...item, duracaoDias: item.duracaoDias - 30 }))
    .filter((item) => item.duracaoDias > 0);

  const financialSnapshot = {
    mes: calendar.mesAtual,
    ano: calendar.anoAtual,
    caixaAtual: economy.caixaAtual,
    receitaMensalAtual: economy.receitaMensalAtual,
    custoFixoMensal: economy.custoFixoMensal,
    folhaPagamentoMensal: economy.folhaPagamentoMensal,
    outrosCustosMensais: economy.outrosCustosMensais,
    lucroPrejuizoMensal: economy.lucroPrejuizoMensal,
    inflacaoAcumulada: economy.inflacaoAcumulada,
    eventoEconomico: event ? event.tipo : null,
  };

  economy.historicoFinanceiro.push(financialSnapshot);
  calendar.historicoMensal.push(financialSnapshot);

  history.push({
    day: calendar.totalDiasSimulados + 1,
    type: "monthly_financial_close",
    description: `Fechamento mensal com resultado de ${economy.lucroPrejuizoMensal}`,
    effects: financialSnapshot,
  });

  if (event && event.visivelParaRH) {
    const involved = state.employees
      .slice()
      .sort((left, right) => right.medo - left.medo)
      .slice(0, 2)
      .map((employee) => employee.id);

    const organizationEvent = createOrganizationEvent(state, {
      tipo: "pressao_financeira",
      descricao: `Sinal visivel de crise: ${event.descricaoCurta}`,
      funcionariosEnvolvidos: involved,
      severidade: event.intensidade,
      origem: "financeiro",
      dados: { medo: 4, confiancaNaGestao: -3 },
      visivelParaRH: true,
      tags: ["financeiro", "crise"],
    });
    generateMemoriesFromEvent(state, organizationEvent, {
      rolesByEmployeeId: Object.fromEntries(involved.map((employeeId) => [employeeId, "observador"])),
    });
  }

  return financialSnapshot;
}

module.exports = {
  initializeEconomy,
  closeFinancialMonth,
};
