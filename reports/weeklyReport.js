/**
 * Modulo: weeklyReport
 * Responsabilidade: montar relatorio semanal tecnico do loop MVP.
 * Entrada: snapshots, plano e progresso
 * Saida: objeto de relatorio e texto de console/UI
 * Nao deve: alterar estado da simulacao.
 *
 * Observacao de design:
 * Este modulo nao altera regra de jogo. Ele apenas transforma variacoes de indicadores,
 * acoes executadas e eventos registrados em leitura tecnica de RH.
 */

const METRIC_LABELS = {
  satisfacaoMedia: "Satisfacao media",
  medoMedio: "Medo medio",
  sobrecargaMedia: "Sobrecarga media",
  riscoSaidaMedio: "Risco medio de saida",
  climaMedio: "Clima medio",
  confiancaRhMedia: "Confianca media no RH",
  turnoverAcumulado: "Turnover acumulado",
  demandasPendentes: "Demandas pendentes",
  caixa: "Caixa",
};

const METRIC_DIRECTION = {
  satisfacaoMedia: "up_good",
  medoMedio: "down_good",
  sobrecargaMedia: "down_good",
  riscoSaidaMedio: "down_good",
  climaMedio: "up_good",
  confiancaRhMedia: "up_good",
  turnoverAcumulado: "down_good",
  demandasPendentes: "down_good",
  caixa: "up_good",
};

function createWeeklyReport({ semana, briefing, plano, inicio, fim, progresso, state }) {
  const safeBriefing = briefing || { sinaisVisiveisRecentes: [] };
  const safePlan = normalizePlan(plano);
  const safeState = state || {};
  const mudancas = calculateChanges(inicio, fim);
  const eventosDaSemana = (safeState.organizationEvents || [])
    .filter((event) => event.dia > inicio.dia && event.dia <= fim.dia)
    .slice(-12)
    .map((event) => ({
      dia: event.dia,
      tipo: event.tipo,
      severidade: event.severidade,
      descricao: event.descricao,
      tags: event.tags || [],
      setorId: event.setorId || null,
    }));

  const report = {
    semana,
    diaInicial: inicio.dia,
    diaFinal: fim.dia,
    energiaAntes: safePlan.energiaAntes,
    energiaDepois: safePlan.energiaDepois,
    acoesExecutadas: safePlan.executadas,
    acoesPlanejadas: safePlan.planejadas,
    acoesRejeitadas: safePlan.rejeitadas,
    sinaisVisiveisNoInicio: safeBriefing.sinaisVisiveisRecentes.length,
    mudancas,
    mudancasClassificadas: classifyMetricChanges(mudancas),
    eventosDaSemana,
    progresso,
    resumo: buildSummary(inicio, fim, safePlan, progresso, mudancas, eventosDaSemana),
    leituraTecnica: buildTechnicalReading(inicio, fim, safePlan, progresso, mudancas, eventosDaSemana, safeState),
    hipoteses: buildHypotheses(inicio, fim, safePlan, mudancas, eventosDaSemana, safeState),
    riscos: buildRiskRegister(fim, mudancas, eventosDaSemana, safeState),
    recomendacoes: buildRecommendations(fim, safePlan, mudancas, eventosDaSemana, safeState),
  };

  return report;
}

function renderWeeklyReport(report) {
  const lines = [];
  lines.push(`RELATORIO SEMANAL DE RH — Semana ${report.semana}`);
  lines.push(`Janela analisada: dia ${report.diaInicial} ao dia ${report.diaFinal}`);
  lines.push(
    `Energia operacional do RH: ${report.energiaAntes} -> ${report.energiaDepois} | diagnostico geral: ${safeGet(
      report.progresso,
      "diagnostico",
      "NAO_CLASSIFICADO"
    )} | score ${safeGet(report.progresso, "score", "-")}`
  );
  lines.push("");

  lines.push("LEITURA EXECUTIVA");
  lines.push(wrapAsBullet(report.leituraTecnica.executiva));
  lines.push(wrapAsBullet(report.resumo));

  lines.push("");
  lines.push("MATRIZ DE INDICADORES");
  report.mudancasClassificadas.forEach((change) => {
    lines.push(
      `- ${change.label}: ${formatDelta(change.value)} | ${change.direction} | ${change.relevance}. ${change.interpretation}`
    );
  });

  lines.push("");
  lines.push("CAPACIDADE DE INTERVENCAO DO RH");
  lines.push(`- Acoes executadas: ${report.acoesExecutadas.length}`);
  lines.push(`- Acoes planejadas: ${report.acoesPlanejadas.length}`);
  lines.push(`- Acoes rejeitadas: ${report.acoesRejeitadas.length}`);
  lines.push(`- Sinais visiveis no inicio da semana: ${report.sinaisVisiveisNoInicio}`);
  lines.push(wrapAsBullet(report.leituraTecnica.capacidadeRh));

  lines.push("");
  lines.push("EVENTOS ORGANIZACIONAIS RELEVANTES");
  if (!report.eventosDaSemana.length) {
    lines.push("- Nenhum evento critico registrado na janela. Interpretar como ausencia de registro, nao ausencia de risco.");
  } else {
    report.eventosDaSemana.slice(-6).forEach((event) => {
      lines.push(
        `- Dia ${event.dia}: ${humanizeEventType(event.tipo)} | severidade ${Math.round(
          event.severidade || 0
        )}. ${event.descricao || "Evento registrado sem descricao detalhada."}`
      );
    });
  }

  lines.push("");
  lines.push("HIPOTESES DE RH PARA A PROXIMA SEMANA");
  report.hipoteses.forEach((hypothesis) => lines.push(`- ${hypothesis}`));

  lines.push("");
  lines.push("REGISTRO DE RISCOS");
  report.riscos.forEach((risk) => lines.push(`- ${risk.nivel}: ${risk.descricao}`));

  lines.push("");
  lines.push("RECOMENDACOES OPERACIONAIS");
  report.recomendacoes.forEach((recommendation) => lines.push(`- ${recommendation}`));

  return lines.join("\n");
}

function calculateChanges(inicio, fim) {
  return {
    satisfacaoMedia: safeNumber(fim.satisfacaoMedia) - safeNumber(inicio.satisfacaoMedia),
    medoMedio: safeNumber(fim.medoMedio) - safeNumber(inicio.medoMedio),
    sobrecargaMedia: safeNumber(fim.sobrecargaMedia) - safeNumber(inicio.sobrecargaMedia),
    riscoSaidaMedio: safeNumber(fim.riscoSaidaMedio) - safeNumber(inicio.riscoSaidaMedio),
    climaMedio: safeNumber(fim.climaMedio) - safeNumber(inicio.climaMedio),
    confiancaRhMedia: safeNumber(fim.confiancaRhMedia) - safeNumber(inicio.confiancaRhMedia),
    turnoverAcumulado: safeNumber(fim.turnoverAcumulado) - safeNumber(inicio.turnoverAcumulado),
    demandasPendentes: safeNumber(fim.demandasPendentes) - safeNumber(inicio.demandasPendentes),
    caixa: safeNumber(fim.caixa) - safeNumber(inicio.caixa),
  };
}

function buildSummary(inicio, fim, plano, progresso, mudancas, eventos) {
  const fragments = [];
  const diagnostic = safeGet(progresso, "diagnostico", "ESTAVEL");

  if (plano.rejeitadas.length) {
    fragments.push(`${plano.rejeitadas.length} intervencao(oes) nao foram executadas, reduzindo cobertura do RH`);
  }
  if (plano.planejadas.length) {
    fragments.push(`${plano.planejadas.length} frente(s) de trabalho foram estruturadas`);
  }
  if (plano.executadas.length) {
    fragments.push(`${plano.executadas.length} acao(oes) foram aplicadas no periodo`);
  }
  if (fim.turnoverAcumulado > inicio.turnoverAcumulado) {
    fragments.push("houve desligamento no periodo, exigindo leitura de causa e impacto relacional");
  }
  if (fim.demandasPendentes > inicio.demandasPendentes) {
    fragments.push("a fila de demandas cresceu, sinalizando gargalo de capacidade ou priorizacao insuficiente");
  }
  if (mudancas.confiancaRhMedia > 1.5 && mudancas.climaMedio < -1.5) {
    fragments.push("o RH ganhou legitimidade local, mas ainda nao converteu isso em melhora de clima");
  }
  if (diagnostic === "MELHORANDO") {
    fragments.push("a tendencia geral e positiva, embora ainda precise ser confirmada em novo ciclo");
  }
  if (diagnostic === "CRITICO") {
    fragments.push("o risco organizacional permanece critico e exige intervencao prioritaria");
  }
  if (eventos.some((event) => event.tags && event.tags.includes("compliance"))) {
    fragments.push("foram registrados sinais de seguranca psicologica/compliance que nao devem ser tratados como conflito comum");
  }

  if (!fragments.length) {
    return "Semana sem ruptura brusca nos indicadores; o quadro pede acompanhamento longitudinal, nao conclusao apressada.";
  }

  return fragments.join("; ") + ".";
}

function buildTechnicalReading(inicio, fim, plano, progresso, mudancas, eventos, state) {
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");
  const overloaded = activeEmployees.filter((employee) => safeNumber(employee.sobrecarga) >= 70).length;
  const highRisk = activeEmployees.filter((employee) => safeNumber(employee.riscoDeSaida) >= 75).length;
  const searching = activeEmployees.filter((employee) => employee.estadoDeBuscaExterna).length;
  const complianceEvents = eventos.filter((event) => event.tags && event.tags.includes("compliance")).length;

  let executive = "A semana deve ser lida como um ciclo de observacao organizacional, nao apenas como fechamento de tarefas.";

  if (mudancas.sobrecargaMedia > 2 && mudancas.satisfacaoMedia < -1) {
    executive =
      "O principal achado da semana e a combinacao entre aumento de sobrecarga e queda de satisfacao, padrao compativel com perda de margem psicossocial antes de queda aberta de desempenho.";
  } else if (mudancas.confiancaRhMedia > 2 && mudancas.climaMedio >= -1) {
    executive =
      "Houve ganho de confianca no RH sem deterioracao relevante do clima, sugerindo que as intervencoes tiveram boa recepcao inicial ou aumentaram percepcao de escuta.";
  } else if (mudancas.medoMedio > 2 && mudancas.confiancaRhMedia <= 0) {
    executive =
      "O aumento do medo medio sem ganho de confianca no RH indica risco de retraimento: pessoas podem estar percebendo problemas, mas sem seguranca suficiente para formalizar demandas.";
  } else if (complianceEvents > 0) {
    executive =
      "A semana trouxe eventos de compliance/seguranca psicologica. Esses registros devem ser analisados com prioridade porque tendem a contaminar confianca, cooperacao e legitimidade da lideranca.";
  } else if (safeGet(progresso, "diagnostico", "") === "MELHORANDO") {
    executive =
      "Os indicadores caminharam em direcao favoravel, mas a melhora deve ser considerada preliminar enquanto nao houver estabilidade em demanda, sobrecarga e confianca.";
  }

  const capacityPieces = [];
  if (plano.executadas.length === 0) {
    capacityPieces.push("nenhuma acao direta foi executada, portanto a leitura da semana depende quase inteiramente de sinais passivos");
  } else {
    capacityPieces.push(`${plano.executadas.length} acao(oes) produziram algum nivel de contato entre RH e organizacao`);
  }
  if (plano.rejeitadas.length) {
    capacityPieces.push("houve perda de cobertura por acoes rejeitadas ou inviabilizadas");
  }
  if (safeNumber(fim.demandasPendentes) > safeNumber(inicio.demandasPendentes)) {
    capacityPieces.push("a demanda cresceu mais rapido do que a capacidade de resposta");
  }
  if (overloaded || highRisk || searching) {
    capacityPieces.push(
      `${overloaded} pessoa(s) em sobrecarga alta, ${highRisk} em risco critico de saida e ${searching} com busca externa ativa`
    );
  }

  return {
    executiva: executive,
    capacidadeRh: capitalize(capacityPieces.join("; ") + "."),
  };
}

function buildHypotheses(inicio, fim, plano, mudancas, eventos, state) {
  const hypotheses = [];
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");
  const complianceEvents = eventos.filter((event) => event.tags && event.tags.includes("compliance"));

  if (mudancas.sobrecargaMedia > 2 && mudancas.demandasPendentes > 0) {
    hypotheses.push(
      "O aumento simultaneo de sobrecarga e demandas pendentes sugere gargalo de capacidade, distribuicao desigual de trabalho ou expectativa de entrega acima da estrutura disponivel."
    );
  }
  if (mudancas.satisfacaoMedia < -2 && mudancas.climaMedio < -1) {
    hypotheses.push(
      "A queda conjunta de satisfacao e clima indica que o problema provavelmente ultrapassa casos individuais e ja aparece como experiencia coletiva de setor ou empresa."
    );
  }
  if (mudancas.confiancaRhMedia > 1.5 && mudancas.medoMedio > 1.5) {
    hypotheses.push(
      "O crescimento simultaneo de confianca no RH e medo medio pode indicar que a escuta melhorou, mas revelou tensoes que estavam subnotificadas."
    );
  }
  if (mudancas.riscoSaidaMedio > 1.5) {
    hypotheses.push(
      "O risco medio de saida subiu; verificar se a variacao esta concentrada em pessoas-chave, em setores de alta dependencia tecnica ou em cargos com empregabilidade externa alta."
    );
  }
  if (complianceEvents.length) {
    hypotheses.push(
      "Eventos de compliance devem ser tratados como sinais de sistema: mesmo quando parecem pontuais, podem alterar a percepcao coletiva de justica e seguranca psicologica."
    );
  }
  if (plano.executadas.length === 0 && activeEmployees.some((employee) => safeNumber(employee.sobrecarga) >= 75)) {
    hypotheses.push(
      "A ausencia de intervencao direta em contexto de sobrecarga alta tende a ser percebida como omissao, mesmo que o RH esteja sem energia operacional."
    );
  }

  if (!hypotheses.length) {
    hypotheses.push(
      "Nao ha evidencia suficiente para afirmar causalidade. Manter leitura longitudinal e comparar a proxima semana com a mesma base de indicadores."
    );
  }

  return hypotheses.slice(0, 5);
}

function buildRiskRegister(fim, mudancas, eventos, state) {
  const risks = [];
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");
  const criticalEmployees = activeEmployees.filter((employee) => safeNumber(employee.riscoDeSaida) >= 75);
  const overloadedEmployees = activeEmployees.filter((employee) => safeNumber(employee.sobrecarga) >= 75);
  const complianceEvents = eventos.filter((event) => event.tags && event.tags.includes("compliance"));

  if (criticalEmployees.length) {
    risks.push({
      nivel: "ALTO",
      descricao: `${criticalEmployees.length} pessoa(s) aparecem em risco critico de saida; priorizar leitura por setor, cargo e dependencia tecnica.`,
    });
  }
  if (overloadedEmployees.length) {
    risks.push({
      nivel: overloadedEmployees.length >= 3 ? "ALTO" : "MODERADO",
      descricao: `${overloadedEmployees.length} pessoa(s) em sobrecarga alta; risco de queda de desempenho, conflito lateral e aumento de absenteismo simulado.`,
    });
  }
  if (mudancas.demandasPendentes > 0) {
    risks.push({
      nivel: mudancas.demandasPendentes >= 3 ? "ALTO" : "MODERADO",
      descricao: `Demandas pendentes cresceram ${formatDelta(mudancas.demandasPendentes)}; a fila pode estar ficando mais rapida que a capacidade de resposta.`,
    });
  }
  if (complianceEvents.length) {
    risks.push({
      nivel: "ALTO",
      descricao: `${complianceEvents.length} evento(s) de compliance/seguranca psicologica registrados; risco de subnotificacao e perda de confianca institucional.`,
    });
  }
  if (safeNumber(fim.caixa) < 0 || mudancas.caixa < -10000) {
    risks.push({
      nivel: "FINANCEIRO",
      descricao: "Pressao de caixa pode contaminar decisoes de pessoas: congelamento de contratacoes, aumento de cobranca e menor margem para recomposicao de equipe.",
    });
  }

  if (!risks.length) {
    risks.push({
      nivel: "BAIXO/MODERADO",
      descricao: "Nao ha risco agudo dominante, mas os indicadores ainda devem ser acompanhados por tendencia e concentracao setorial.",
    });
  }

  return risks.slice(0, 5);
}

function buildRecommendations(fim, plano, mudancas, eventos, state) {
  const recommendations = [];
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");
  const criticalEmployees = activeEmployees.filter((employee) => safeNumber(employee.riscoDeSaida) >= 75);
  const complianceEvents = eventos.filter((event) => event.tags && event.tags.includes("compliance"));

  if (mudancas.sobrecargaMedia > 2 || safeNumber(fim.sobrecargaMedia) >= 65) {
    recommendations.push(
      "Mapear carga por setor antes de propor treinamento: quando a sobrecarga e estrutural, capacitar sem redistribuir trabalho pode aumentar cinismo organizacional."
    );
  }
  if (criticalEmployees.length) {
    recommendations.push(
      "Priorizar conversas individuais com pessoas em risco critico, cruzando risco de saida com dependencia tecnica e historico de memoria recente."
    );
  }
  if (mudancas.confiancaRhMedia <= 0 && plano.executadas.length > 0) {
    recommendations.push(
      "Rever qualidade percebida das intervencoes do RH: acao executada sem ganho de confianca pode indicar baixa aderencia, comunicacao fraca ou timing inadequado."
    );
  }
  if (complianceEvents.length) {
    recommendations.push(
      "Separar conflito operacional de risco psicossocial/compliance; registrar acolhimento, preservar confidencialidade e acompanhar possivel subnotificacao."
    );
  }
  if (mudancas.demandasPendentes > 0) {
    recommendations.push(
      "Criar criterio de triagem para demandas pendentes: urgencia, impacto coletivo, risco de saida e risco de compliance."
    );
  }
  if (!recommendations.length) {
    recommendations.push(
      "Manter rotina de escuta e leitura de sinais fracos; o objetivo da proxima semana deve ser confirmar tendencia, nao maximizar intervencoes."
    );
  }

  return recommendations.slice(0, 5);
}

function classifyMetricChanges(mudancas) {
  return Object.entries(mudancas).map(([key, value]) => {
    const directionType = METRIC_DIRECTION[key] || "neutral";
    const abs = Math.abs(value);
    const label = METRIC_LABELS[key] || key;
    const direction = classifyDirection(value, directionType);
    const relevance = classifyRelevance(key, value);
    const interpretation = interpretMetricChange(key, value, direction);

    return {
      key,
      label,
      value,
      abs,
      direction,
      relevance,
      interpretation,
    };
  });
}

function classifyDirection(value, directionType) {
  if (Math.abs(value) < 0.05) return "estavel";
  if (directionType === "up_good") return value > 0 ? "favoravel" : "desfavoravel";
  if (directionType === "down_good") return value < 0 ? "favoravel" : "desfavoravel";
  return value > 0 ? "aumento" : "queda";
}

function classifyRelevance(key, value) {
  const abs = Math.abs(value);
  if (key === "caixa") {
    if (abs >= 50000) return "mudanca material";
    if (abs >= 10000) return "mudanca relevante";
    return "variacao baixa";
  }
  if (key === "turnoverAcumulado" || key === "demandasPendentes") {
    if (abs >= 3) return "mudanca critica";
    if (abs >= 1) return "mudanca relevante";
    return "sem variacao operacional";
  }
  if (abs >= 5) return "mudanca critica";
  if (abs >= 2) return "mudanca relevante";
  if (abs >= 0.5) return "sinal fraco";
  return "estabilidade tecnica";
}

function interpretMetricChange(key, value, direction) {
  if (Math.abs(value) < 0.05) return "Sem variacao suficiente para sustentar inferencia.";

  const interpretations = {
    satisfacaoMedia: {
      favoravel: "Pode indicar melhora de reciprocidade percebida, reducao de atrito ou resposta positiva a intervencoes recentes.",
      desfavoravel: "Sinaliza perda de aderencia subjetiva ao trabalho; verificar carga, reconhecimento, justica e relacao com lideranca.",
    },
    medoMedio: {
      favoravel: "Reducao de medo sugere maior seguranca psicologica ou menor percepcao de ameaca imediata.",
      desfavoravel: "Aumento de medo tende a reduzir fala espontanea, aumentar subnotificacao e distorcer sinais visiveis ao RH.",
    },
    sobrecargaMedia: {
      favoravel: "Queda de sobrecarga pode liberar capacidade cognitiva e reduzir risco de conflito lateral.",
      desfavoravel: "Aumento de sobrecarga e preditor de desgaste, erro operacional e deterioracao de clima se persistir.",
    },
    riscoSaidaMedio: {
      favoravel: "Reducao do risco de saida sugere maior retencao ou menor atratividade percebida da alternativa externa.",
      desfavoravel: "Aumento de risco de saida exige olhar para pessoas-chave e setores com maior dependencia tecnica.",
    },
    climaMedio: {
      favoravel: "Melhora de clima sugere ganho coletivo, mas deve ser validada por setor para evitar media enganosa.",
      desfavoravel: "Queda de clima indica que a experiencia negativa pode estar circulando socialmente, nao restrita a individuos.",
    },
    confiancaRhMedia: {
      favoravel: "Ganho de confianca amplia capacidade de escuta e reduz custo futuro de diagnostico.",
      desfavoravel: "Perda de confianca diminui acesso do RH a informacoes sensiveis e aumenta risco de decisao cega.",
    },
    turnoverAcumulado: {
      favoravel: "Reducao nao se aplica diretamente ao acumulado; validar se houve correcao de base.",
      desfavoravel: "Desligamentos alteram memoria coletiva, redistribuem carga e podem gerar efeito contagio.",
    },
    demandasPendentes: {
      favoravel: "Reducao da fila melhora percepcao de responsividade e diminui ruído operacional.",
      desfavoravel: "Aumento da fila sugere gargalo de capacidade, baixa priorizacao ou aumento de conflitos/demandas latentes.",
    },
    caixa: {
      favoravel: "Melhora de caixa aumenta margem para contratacao, recomposicao e intervencoes menos defensivas.",
      desfavoravel: "Piora de caixa tende a pressionar liderancas e contaminar decisoes de pessoas.",
    },
  };

  return safeGet(interpretations[key] || {}, direction, "Variacao registrada; avaliar tendencia e concentracao antes de agir.");
}

function normalizePlan(plano) {
  const safe = plano || {};
  return {
    energiaAntes: safeNumber(safe.energiaAntes),
    energiaDepois: safeNumber(safe.energiaDepois),
    executadas: Array.isArray(safe.executadas) ? safe.executadas : [],
    planejadas: Array.isArray(safe.planejadas) ? safe.planejadas : [],
    rejeitadas: Array.isArray(safe.rejeitadas) ? safe.rejeitadas : [],
  };
}

function humanizeEventType(type) {
  if (!type) return "evento organizacional";
  return String(type).replace(/_/g, " ");
}

function formatDelta(value) {
  if (Math.abs(value) < 0.05) return "0";
  if (Math.abs(value) >= 1000) return `${value > 0 ? "+" : ""}${formatCompactMoney(value)}`;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatCompactMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function wrapAsBullet(text) {
  return `- ${text}`;
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeGet(object, key, fallback) {
  if (!object || object[key] === undefined || object[key] === null) return fallback;
  return object[key];
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = {
  createWeeklyReport,
  renderWeeklyReport,
};
