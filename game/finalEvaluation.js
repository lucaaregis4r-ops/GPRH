/**
 * Modulo: finalEvaluation
 * Responsabilidade: avaliar a campanha curta ao final do periodo.
 * Entrada: sessao encerrada ou em andamento
 * Saida: classificacao final e criterios objetivos
 * Nao deve: alterar estado da simulacao.
 */

const { summarizeObjectiveMetrics } = require("./objectiveTracker");

function evaluateFinalSession(session) {
  const scenario = session.scenario || {
    id: "tecnico",
    nome: "Periodo tecnico",
    objetivos: {},
  };
  const metrics = summarizeObjectiveMetrics(session.state);
  const goals = scenario.objetivos || {};
  const criticalEmployees = countActiveEmployees(session.state, (employee) => employee.riscoDeSaida >= 72);
  const criticalAccumulation = countActiveEmployees(session.state, (employee) => employee.indiceAcumuloFuncao >= 70);

  const criteria = [
    makeCriterion("clima", "Manter clima acima do minimo", metrics.climaMedio, ">=", goals.climaMinimo ?? 52),
    makeCriterion("risco_saida", "Reduzir funcionarios em risco critico", criticalEmployees, "<=", goals.riscoCriticoMaximo ?? 4),
    makeCriterion("turnover", "Evitar turnover excessivo", metrics.turnoverAcumulado, "<=", goals.turnoverMaximo ?? 12),
    makeCriterion("acumulo", "Reduzir acumulo critico", criticalAccumulation, "<=", goals.acumuloCriticoMaximo ?? 5),
    makeCriterion("demandas", "Responder demandas pendentes", metrics.demandasPendentes, "<=", goals.demandasPendentesMaximo ?? 3),
    makeCriterion("caixa", "Manter caixa saudavel", metrics.caixa, ">=", goals.caixaMinimo ?? 0),
    makeCriterion("confianca_rh", "Melhorar confianca no RH", metrics.confiancaRhMedia, ">=", goals.confiancaRhMinima ?? 48),
    makeCriterion("sustentabilidade_trabalho", "Manter sustentabilidade do trabalho", metrics.workSustainabilityMedia, ">=", goals.sustentabilidadeMinima ?? 42),
    makeCriterion("compliance", "Nao deixar denuncia grave sem resposta", metrics.denunciasAbertas, "<=", goals.denunciasAbertasMaximo ?? 0),
  ];

  const passed = criteria.filter((criterion) => criterion.ok).length;
  const score = Math.round(criteria.reduce((sum, criterion) => sum + criterion.score, 0) / criteria.length);
  const classification = classifyFinalResult(metrics, criteria, score);

  return {
    scenario: {
      id: scenario.id,
      nome: scenario.nome,
      premissa: scenario.premissa || "",
    },
    statusSessao: session.status,
    diasSimulados: metrics.dia,
    semanasJogadas: session.relatoriosSemanais.length,
    classificacao: classification,
    score,
    criteriosAtendidos: passed,
    criteriosTotais: criteria.length,
    criterios: criteria,
    metricas: metrics,
    historiaEmergente: buildEmergentStory(session, metrics, criteria, classification),
  };
}

function countActiveEmployees(state, predicate) {
  return state.employees.filter((employee) => employee.status !== "desligado" && predicate(employee)).length;
}

function makeCriterion(id, nome, valor, operador, alvo) {
  const roundedValue = typeof valor === "number" ? Math.round(valor) : valor;
  const ok = operador === ">=" ? valor >= alvo : valor <= alvo;
  return {
    id,
    nome,
    valor: roundedValue,
    operador,
    alvo,
    ok,
    score: calculateCriterionScore(valor, operador, alvo),
  };
}

function calculateCriterionScore(value, operator, target) {
  if (operator === ">=") {
    if (value >= target) return 100;
    if (target <= 0) return value >= target ? 100 : 0;
    return Math.max(0, Math.min(100, (value / target) * 100));
  }

  if (value <= target) return 100;
  if (target <= 0) return Math.max(0, Math.min(100, 100 / (1 + value)));
  return Math.max(0, Math.min(100, (target / Math.max(1, value)) * 100));
}

function classifyFinalResult(metrics, criteria, score) {
  const failedIds = new Set(criteria.filter((criterion) => !criterion.ok).map((criterion) => criterion.id));
  if (metrics.caixa < 0) return "crise financeira";
  if (failedIds.has("confianca_rh") && failedIds.has("demandas")) return "colapso de confianca";
  if (failedIds.has("clima") && failedIds.has("risco_saida")) return "crise humana";
  if (score >= 88 && failedIds.size === 0) return "excelente";
  if (score >= 63) return "estavel";
  return "instavel";
}

function buildEmergentStory(session, metrics, criteria, classification) {
  const relevantEvents = (session.state.organizationEvents || [])
    .filter((event) => event.dia > 0)
    .slice(-8)
    .map((event) => event.tipo);
  const failed = criteria.filter((criterion) => !criterion.ok).map((criterion) => criterion.nome.toLowerCase());
  const actions = session.state.rh.acoesExecutadas.length;

  const parts = [
    `A campanha terminou como ${classification}.`,
    `O RH executou ${actions} acao(oes) e fechou com clima ${Math.round(metrics.climaMedio)} e confianca media ${Math.round(
      metrics.confiancaRhMedia
    )}, com sustentabilidade do trabalho em ${Math.round(metrics.workSustainabilityMedia || 0)}.`,
  ];

  if (failed.length) {
    parts.push(`Os pontos mais frageis foram: ${failed.slice(0, 3).join(", ")}.`);
  } else {
    parts.push("Os objetivos principais foram preservados sem sinais criticos no fechamento.");
  }

  if (relevantEvents.length) {
    parts.push(`Eventos recentes deram o tom da historia: ${relevantEvents.join(", ")}.`);
  }

  return parts.join(" ");
}

module.exports = {
  evaluateFinalSession,
};
