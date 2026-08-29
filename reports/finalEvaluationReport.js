/**
 * Modulo: finalEvaluationReport
 * Responsabilidade: renderizar avaliacao final da campanha curta.
 * Entrada: avaliacao final
 * Saida: texto legivel para console/UI
 * Nao deve: alterar estado da simulacao.
 *
 * Observacao de design:
 * Este relatorio deve soar como fechamento de consultoria interna de RH:
 * menos placar, mais interpretacao de risco, legitimidade, capacidade de resposta
 * e qualidade da intervencao ao longo da campanha.
 */

function renderFinalEvaluationReport(evaluation) {
  const safeEvaluation = evaluation || {};
  const scenario = safeEvaluation.scenario || { nome: "cenario nao identificado" };
  const criterios = Array.isArray(safeEvaluation.criterios) ? safeEvaluation.criterios : [];
  const criteriosOk = criterios.filter((criterion) => criterion.ok);
  const criteriosAtencao = criterios.filter((criterion) => !criterion.ok);

  const lines = [];
  lines.push(`AVALIACAO_FINAL DA CAMPANHA - ${scenario.nome}`);
  lines.push(
    `Classificacao: ${safeEvaluation.classificacao || "NAO_CLASSIFICADA"} | score ${safeValue(
      safeEvaluation.score,
      "-"
    )} | periodo: ${safeValue(safeEvaluation.diasSimulados, "-")} dias / ${safeValue(
      safeEvaluation.semanasJogadas,
      "-"
    )} semanas`
  );
  lines.push("");

  lines.push("SINTESE EXECUTIVA");
  lines.push(`- ${buildExecutiveSynthesis(safeEvaluation, criteriosAtencao)}`);
  if (safeEvaluation.historiaEmergente) {
    lines.push(`- Narrativa emergente observada: ${safeEvaluation.historiaEmergente}`);
  } else {
    lines.push("- Narrativa emergente observada: registros insuficientes para uma leitura historica robusta.");
  }

  lines.push("");
  lines.push("LEITURA TECNICA DO RESULTADO");
  buildTechnicalInterpretation(safeEvaluation, criteriosOk, criteriosAtencao).forEach((line) => lines.push(`- ${line}`));

  lines.push("");
  lines.push("MATRIZ DE OBJETIVOS");
  lines.push("Objetivos:");
  if (!criterios.length) {
    lines.push("- Nenhum criterio de avaliacao foi informado pela engine.");
  } else {
    criterios.forEach((criterion) => lines.push(renderCriterionLine(criterion)));
  }

  lines.push("");
  lines.push("RISCOS RESIDUAIS");
  buildResidualRisks(criteriosAtencao).forEach((risk) => lines.push(`- ${risk}`));

  lines.push("");
  lines.push("LEGADO ORGANIZACIONAL");
  buildOrganizationalLegacy(safeEvaluation, criteriosOk, criteriosAtencao).forEach((legacy) => lines.push(`- ${legacy}`));

  lines.push("");
  lines.push("PROXIMO CICLO RECOMENDADO");
  buildNextCycleRecommendations(criteriosAtencao).forEach((recommendation) => lines.push(`- ${recommendation}`));

  return lines.join("\n");
}

function renderCriterionLine(criterion) {
  const status = criterion.ok ? "OK" : "ATENCAO";
  const leitura = interpretCriterion(criterion);
  const distancia = calculateDistanceFromTarget(criterion);
  const distanceText = distancia === null ? "distancia nao calculada" : `distancia do alvo: ${formatDistance(distancia)}`;

  return `- ${status} | ${criterion.nome}: ${safeValue(criterion.valor, "-")} ${criterion.operador || ""} ${safeValue(
    criterion.alvo,
    "-"
  )} | ${distanceText}. ${leitura}`;
}

function buildExecutiveSynthesis(evaluation, criteriosAtencao) {
  const score = Number(evaluation.score);
  const classification = evaluation.classificacao || "NAO_CLASSIFICADA";

  if (criteriosAtencao.length === 0 && Number.isFinite(score) && score >= 85) {
    return "A campanha encerrou com boa estabilidade sistêmica: os objetivos criticos foram atendidos e nao ha sinal dominante de ruptura organizacional no fechamento.";
  }

  if (classification === "CRITICO" || (Number.isFinite(score) && score < 45)) {
    return "A campanha encerrou em condicao critica: a atuacao do RH nao conseguiu reduzir suficientemente os riscos estruturais, e a empresa permanece vulneravel a perda de pessoas, deterioracao de clima ou crise de confianca.";
  }

  if (criteriosAtencao.length >= 3) {
    return "O resultado e parcialmente insuficiente: houve alguma capacidade de intervencao, mas os indicadores pendentes mostram que a organizacao ainda opera com fragilidades simultaneas.";
  }

  if (criteriosAtencao.length > 0) {
    return "A campanha encerrou com estabilizacao parcial: parte dos objetivos foi atendida, mas ainda existem riscos residuais que podem voltar a crescer se nao forem acompanhados.";
  }

  return "A campanha encerrou sem falhas formais nos objetivos, mas o resultado deve ser lido por tendencia e sustentabilidade, nao apenas por cumprimento de meta.";
}

function buildTechnicalInterpretation(evaluation, criteriosOk, criteriosAtencao) {
  const lines = [];
  const score = Number(evaluation.score);
  const okRatio = criteriosOk.length + criteriosAtencao.length > 0 ? criteriosOk.length / (criteriosOk.length + criteriosAtencao.length) : 0;

  if (Number.isFinite(score)) {
    if (score >= 80) {
      lines.push("O score sugere boa efetividade geral, mas nao elimina a necessidade de analisar concentracao de risco por setor e por pessoas-chave.");
    } else if (score >= 60) {
      lines.push("O score sugere desempenho intermediario: houve avancos, porem a sustentacao depende de reduzir gargalos e transformar escuta em capacidade operacional.");
    } else {
      lines.push("O score sugere baixa efetividade: os sinais organizacionais provavelmente superaram a capacidade de resposta do RH durante o periodo.");
    }
  }

  lines.push(
    `Aderencia aos objetivos: ${criteriosOk.length}/${criteriosOk.length + criteriosAtencao.length || 0} criterios atendidos (${Math.round(
      okRatio * 100
    )}%).`
  );

  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["clima", "satisfacao"]))) {
    lines.push("A dimensao de clima/satisfacao ficou fragil: isso sugere que a experiencia cotidiana de trabalho nao foi suficientemente reorganizada.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["sustentabilidade", "trabalho"]))) {
    lines.push("A sustentabilidade do trabalho ficou fragil: a organizacao pode ter preservado entregas de curto prazo acumulando custo humano futuro.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["turnover", "saida"]))) {
    lines.push("A retencao aparece como ponto sensivel: perdas no periodo podem ter redistribuido carga, afetado memoria coletiva e reduzido previsibilidade operacional.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["confianca", "rh"]))) {
    lines.push("A legitimidade do RH nao atingiu o patamar esperado: sem confianca, o jogador passa a decidir com menos informacao e maior risco de subnotificacao.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["denuncia", "compliance", "seguranca"]))) {
    lines.push("A dimensao de compliance/seguranca psicologica exige continuidade: casos abertos ou mal acolhidos tendem a gerar efeitos indiretos sobre fala, medo e cooperacao.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["caixa", "financeiro"]))) {
    lines.push("A restricao financeira permaneceu relevante: pressao de caixa limita a capacidade de contratacao, recomposicao e reducao estrutural de sobrecarga.");
  }

  if (lines.length <= 2) {
    lines.push("O fechamento nao aponta uma causa unica dominante; a leitura mais segura e acompanhar tendencia, distribuicao setorial e acumulacao de sinais fracos.");
  }

  return lines;
}

function buildResidualRisks(criteriosAtencao) {
  const risks = [];

  if (!criteriosAtencao.length) {
    risks.push("Risco residual baixo/moderado: manter monitoramento, pois estabilidade de fechamento nao significa ausencia de tensao latente.");
    return risks;
  }

  criteriosAtencao.forEach((criterion) => {
    const name = String(criterion.nome || "criterio").toLowerCase();
    if (containsAny(name, ["clima", "satisfacao"])) {
      risks.push("Risco de deterioracao silenciosa de clima: aumento de cinismo, menor cooperacao espontanea e queda de adesao a iniciativas do RH.");
    } else if (containsAny(name, ["turnover", "saida"])) {
      risks.push("Risco de perda de conhecimento tacito: saidas podem afetar dependencia tecnica e gerar sobrecarga secundaria em quem permanece.");
    } else if (containsAny(name, ["demanda", "pendente", "acumulo"])) {
      risks.push("Risco de fila invisivel: demandas nao tratadas podem virar conflitos, sinais de exaustao ou perda de confianca na responsividade do RH.");
    } else if (containsAny(name, ["sustentabilidade", "trabalho"])) {
      risks.push("Risco de desempenho insustentavel: volume de entrega pode esconder perda de energia, qualidade e seguranca psicologica.");
    } else if (containsAny(name, ["confianca", "rh"])) {
      risks.push("Risco de decisao com baixa visibilidade: sem confianca no RH, a organizacao tende a esconder problemas ate que eles fiquem caros.");
    } else if (containsAny(name, ["denuncia", "compliance", "seguranca"])) {
      risks.push("Risco de subnotificacao e dano institucional: eventos sensiveis precisam de acolhimento, rastreabilidade e acompanhamento consistente.");
    } else if (containsAny(name, ["caixa", "financeiro"])) {
      risks.push("Risco de gestao defensiva: pressao financeira pode gerar cortes, aumento de cobranca e reducao de margem para cuidado.");
    } else {
      risks.push(`Risco residual associado a ${criterion.nome}: criterio nao atingido e ainda sem leitura causal suficiente.`);
    }
  });

  return unique(risks).slice(0, 6);
}

function buildOrganizationalLegacy(evaluation, criteriosOk, criteriosAtencao) {
  const legacy = [];

  if (criteriosOk.some((criterion) => containsAny(criterion.nome, ["confianca", "rh"]))) {
    legacy.push("O RH deixa algum ganho de legitimidade: isso aumenta a chance de captar sinais antes que virem crise aberta.");
  }
  if (criteriosOk.some((criterion) => containsAny(criterion.nome, ["clima", "satisfacao"]))) {
    legacy.push("A experiencia coletiva de trabalho terminou em patamar aceitavel, criando base para intervencoes menos emergenciais no proximo ciclo.");
  }
  if (criteriosOk.some((criterion) => containsAny(criterion.nome, ["turnover", "saida"]))) {
    legacy.push("A retencao ficou dentro do limite definido, preservando parte da memoria operacional e das redes informais de apoio.");
  }
  if (criteriosOk.some((criterion) => containsAny(criterion.nome, ["sustentabilidade", "trabalho"]))) {
    legacy.push("A rotina de trabalho terminou com sustentabilidade minima, reduzindo chance de desgaste oculto no proximo ciclo.");
  }
  if (criteriosAtencao.length) {
    legacy.push("A organizacao ainda carrega pendencias: o proximo ciclo deve tratar causas provaveis, nao apenas indicadores finais.");
  }
  if (evaluation.historiaEmergente) {
    legacy.push("A historia emergente registrada deve ser usada como insumo qualitativo para explicar por que os numeros chegaram ao resultado final.");
  }

  if (!legacy.length) {
    legacy.push("O legado ainda e inconclusivo: faltam sinais suficientes para diferenciar estabilidade real de baixa visibilidade do RH.");
  }

  return legacy;
}

function buildNextCycleRecommendations(criteriosAtencao) {
  const recommendations = [];

  if (!criteriosAtencao.length) {
    recommendations.push("Nao ampliar complexidade imediatamente; primeiro validar se os ganhos se sustentam por mais um ciclo de simulacao.");
    recommendations.push("Usar a estabilidade como oportunidade para mapear riscos latentes, pessoas-chave e gargalos de processo antes de nova crise.");
    return recommendations;
  }

  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["clima", "satisfacao", "sobrecarga"]))) {
    recommendations.push("Abrir frente de diagnostico setorial: comparar carga, clima, lideranca e memoria recente antes de aplicar intervencao generalista.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["sustentabilidade", "trabalho"]))) {
    recommendations.push("Separar produtividade de sustentabilidade: mapear setores que entregam volume alto com energia, suporte ou justica em queda.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["turnover", "saida"]))) {
    recommendations.push("Criar mapa de retencao: cruzar risco de saida, empregabilidade externa, dependencia tecnica e vinculos internos.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["demanda", "pendente", "acumulo"]))) {
    recommendations.push("Implantar triagem de demandas por impacto, urgencia, risco psicossocial e custo de nao agir.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["confianca", "rh"]))) {
    recommendations.push("Priorizar acoes de escuta com devolutiva clara; no jogo, confianca cresce quando a pessoa percebe que falar altera algo concreto.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["denuncia", "compliance", "seguranca"]))) {
    recommendations.push("Tratar casos sensiveis em fluxo separado de conflitos comuns, preservando acolhimento, confidencialidade e rastreabilidade.");
  }
  if (criteriosAtencao.some((criterion) => containsAny(criterion.nome, ["caixa", "financeiro"]))) {
    recommendations.push("Integrar leitura financeira ao plano de pessoas: sem margem de caixa, intervencoes de clima precisam priorizar baixo custo e alto impacto relacional.");
  }

  return unique(recommendations).slice(0, 6);
}

function interpretCriterion(criterion) {
  const name = String(criterion.nome || "").toLowerCase();
  if (criterion.ok) {
    if (containsAny(name, ["clima", "satisfacao"])) return "Patamar minimo de experiencia coletiva preservado.";
    if (containsAny(name, ["turnover", "saida"])) return "Perdas ficaram dentro do limite tolerado para a campanha.";
    if (containsAny(name, ["confianca", "rh"])) return "Legitimidade minima do RH foi mantida ou reconstruida.";
    if (containsAny(name, ["sustentabilidade", "trabalho"])) return "Ritmo de trabalho preservado sem deterioracao humana excessiva.";
    if (containsAny(name, ["denuncia", "compliance"])) return "Nao ha pendencia formal acima do limite definido.";
    return "Criterio cumprido dentro do contrato do cenario.";
  }

  if (containsAny(name, ["clima", "satisfacao"])) return "A experiencia coletiva ficou abaixo do minimo esperado; investigar concentracao por setor.";
  if (containsAny(name, ["turnover", "saida"])) return "O limite de perda de pessoas foi superado ou ficou acima da tolerancia definida.";
  if (containsAny(name, ["demanda", "pendente", "acumulo"])) return "A capacidade de resposta nao acompanhou a entrada ou acumulacao de demandas.";
  if (containsAny(name, ["confianca", "rh"])) return "O RH encerrou com legitimidade insuficiente para sustentar diagnostico fino.";
  if (containsAny(name, ["sustentabilidade", "trabalho"])) return "O ritmo de entrega ficou humanamente fragil; investigar energia, suporte, justica e carga.";
  if (containsAny(name, ["denuncia", "compliance", "seguranca"])) return "Existe pendencia sensivel que pode afetar seguranca psicologica e confianca institucional.";
  if (containsAny(name, ["caixa", "financeiro"])) return "A restricao financeira ficou abaixo do patamar minimo de seguranca definido.";
  return "Criterio nao cumprido; investigar causa provavel antes de nova rodada.";
}

function calculateDistanceFromTarget(criterion) {
  const value = Number(criterion.valor);
  const target = Number(criterion.alvo);
  if (!Number.isFinite(value) || !Number.isFinite(target)) return null;

  const operator = criterion.operador || "";
  if (operator.includes(">")) return value - target;
  if (operator.includes("<")) return target - value;
  return value - target;
}

function formatDistance(value) {
  if (Math.abs(value) < 0.05) return "0";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function containsAny(text, terms) {
  const normalized = String(text || "").toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function unique(values) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function safeValue(value, fallback) {
  if (value === undefined || value === null || Number.isNaN(value)) return fallback;
  return value;
}

module.exports = {
  renderFinalEvaluationReport,
};
