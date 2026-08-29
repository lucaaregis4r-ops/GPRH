/**
 * Modulo: consoleReport
 * Responsabilidade: transformar estado da engine em leitura de console.
 * Entrada: state
 * Saida: texto impresso no console
 * Nao deve: alterar estado da simulacao.
 *
 * Observacao de design:
 * O console e usado como caderno tecnico do simulador. A linguagem deve ajudar
 * o desenvolvedor/jogador a enxergar causalidade provavel, risco organizacional
 * e limites de visibilidade do RH, sem inventar estado novo.
 */

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

function formatPercent(value) {
  return `${(safeNumber(value) * 100).toFixed(2)}%`;
}

function printCompanySummary(state) {
  const { company, economy, calendar } = state;
  const sectors = state.sectors || [];
  const employees = activeEmployees(state);
  const avgSatisfaction = average(employees.map((employee) => employee.satisfacao));
  const avgOverload = average(employees.map((employee) => employee.sobrecarga));
  const avgRisk = average(employees.map((employee) => employee.riscoDeSaida));
  const avgDelivery = average(employees.map((employee) => employee.deliveryCapacity));
  const avgQuality = average(employees.map((employee) => employee.deliveryQuality));
  const avgSustainability = average(employees.map((employee) => employee.workSustainability));

  console.log("\nDOSSIÊ ORGANIZACIONAL INICIAL");
  console.log(`Seed: ${state.seed}`);
  console.log(`Empresa: ${safeGet(company, "nome", "-")} | porte: ${safeGet(company, "tamanho", "-")} | setor economico: ${safeGet(company, "setorEconomico", "-")}`);
  console.log(`Caixa atual: ${formatMoney(safeGet(economy, "caixaAtual", 0))} | receita mensal base: ${formatMoney(safeGet(economy, "receitaMensalBase", 0))} | folha mensal: ${formatMoney(safeGet(economy, "folhaPagamentoMensal", 0))}`);
  console.log(`Inflacao mensal atual: ${formatPercent(safeGet(economy, "inflacaoMensalAtual", 0))} | risco de crise: ${safeGet(company, "riscoCrise", 0)}`);
  console.log(`Turnover visivel ao RH: ${Math.round(safeGet(company, "taxaTurnover", 0))}% | turnover acumulado: ${safeGet(company, "turnoverAcumulado", 0)}`);

  console.log("\nLEITURA ESTRUTURAL");
  buildCompanyDiagnostic(company, economy, employees).forEach((line) => console.log(`- ${line}`));
  console.log(`- Indicadores humanos agregados: satisfacao ${Math.round(avgSatisfaction)}, sobrecarga ${Math.round(avgOverload)}, risco medio de saida ${Math.round(avgRisk)}.`);
  console.log(`- Trabalho agregado: entrega ${Math.round(avgDelivery)}, qualidade ${Math.round(avgQuality)}, sustentabilidade ${Math.round(avgSustainability)}.`);
  console.log("- Observacao metodologica: medias ajudam a orientar, mas podem esconder concentracao de risco em setores ou pessoas-chave.");

  console.log("\nTEMPO");
  console.log(
    `Dia atual: ${safeGet(calendar, "diaAtual", "-")} | mes: ${safeGet(calendar, "mesAtual", "-")} | ano: ${safeGet(calendar, "anoAtual", "-")} | dias simulados: ${safeGet(calendar, "totalDiasSimulados", "-")}`
  );

  console.log("\nMAPA SETORIAL");
  sectors.forEach((sector) => {
    const sectorEmployees = employees.filter((employee) => employee.setorId === sector.id);
    console.log(
      `- ${sector.nome} | pessoas ${sectorEmployees.length} | carga ${safeNumber(sector.cargaTrabalho)} | especializacao ${safeNumber(
        sector.nivelEspecializacao
      )} | clima ${safeNumber(sector.climaSetor)} | turnover ${Math.round(safeGet(sector, "taxaTurnover", 0))}% | risco ${sectorRiskLabel(sector, sectorEmployees)}. ${sectorReading(sector, sectorEmployees)}`
    );
  });
}

function printEmployeesSummary(state, limit = 12) {
  const employees = activeEmployees(state);
  const sectorsById = mapById(state.sectors || []);

  console.log("\nQUADRO DE PESSOAS — LEITURA INDIVIDUAL");
  employees.slice(0, limit).forEach((employee) => {
    const sector = sectorsById.get(employee.setorId);
    console.log(
      `- ${employee.nome} | ${sector ? sector.nome : "setor nao identificado"} | ${formatCargo(employee.cargoFormal)} | escolaridade ${safeGet(
        employee,
        "escolaridade",
        "-"
      )} | especializacao ${safeNumber(employee.especializacao)} | produtividade ${safeNumber(employee.produtividade)} | satisfacao ${safeNumber(
        employee.satisfacao
      )} | sobrecarga ${safeNumber(employee.sobrecarga)} | entrega ${safeNumber(employee.deliveryCapacity)} | qualidade ${safeNumber(
        employee.deliveryQuality
      )} | sustentabilidade ${safeNumber(employee.workSustainability)} | risco saida ${safeNumber(employee.riscoDeSaida)}.`
    );
    console.log(`  leitura RH: ${buildEmployeeReading(employee, sector)}`);
  });

  if (employees.length > limit) {
    console.log(`... ${employees.length - limit} funcionario(s) omitidos neste resumo. Aumente o limit para auditoria completa.`);
  }

  const critical = employees.filter((employee) => safeNumber(employee.riscoDeSaida) >= 75).length;
  const overloaded = employees.filter((employee) => safeNumber(employee.sobrecarga) >= 75).length;
  const searching = employees.filter((employee) => employee.estadoDeBuscaExterna).length;
  console.log(`\nResumo tecnico: ${critical} pessoa(s) em risco critico de saida, ${overloaded} em sobrecarga alta, ${searching} com busca externa ativa.`);
}

function printRelationsSummary(state, limit = 6) {
  console.log("\nREDE INFORMAL — RELACOES DE MAIOR IMPACTO");
  const employeesById = new Map((state.employees || []).map((employee) => [employee.id, employee]));
  const relationships = state.relationships || [];

  if (!relationships.length) {
    console.log("- Nenhuma relacao registrada. Sem rede social minima, a empresa fica parecendo uma lista de funcionarios, nao uma organizacao viva.");
    return;
  }

  relationships
    .slice()
    .sort((a, b) => relationshipPriority(b) - relationshipPriority(a))
    .slice(0, limit)
    .forEach((relationship) => {
      const left = employeesById.get(relationship.fromEmployeeId);
      const right = employeesById.get(relationship.toEmployeeId);
      const leftName = left ? left.nome : relationship.fromEmployeeId;
      const rightName = right ? right.nome : relationship.toEmployeeId;
      console.log(
        `- ${leftName} <-> ${rightName} | proximidade ${safeNumber(relationship.proximidadeTrabalho)} | confianca ${safeNumber(
          relationship.confianca
        )} | conflito ${safeNumber(relationship.conflito)} | dependencia tecnica ${safeNumber(relationship.dependenciaTecnica)}.`
      );
      console.log(`  leitura RH: ${buildRelationshipReading(relationship, left, right)}`);
    });
}

function printMemoriesSummary(state, limit = 8) {
  console.log("\nEVENTOS ORGANIZACIONAIS RECENTES — MEMORIA COLETIVA");
  const events = (state.organizationEvents || []).slice(-limit);

  if (!events.length) {
    console.log("- Nenhum evento organizacional registrado. Isso pode significar estabilidade real ou baixa sensibilidade da engine de sinais.");
    return;
  }

  events.forEach((event) => {
    const sector = (state.sectors || []).find((item) => item.id === event.setorId);
    console.log(
      `- Dia ${event.dia}: ${event.descricao || event.tipo} | severidade ${Math.round(safeNumber(event.severidade))} | ${
        sector ? sector.nome : "empresa"
      } | ${eventInterpretation(event)}`
    );
  });
}

function printMonthlyReport(state) {
  const { economy, calendar } = state;
  const financialHistory = safeGet(economy, "historicoFinanceiro", []);
  const lastFinancial = financialHistory[financialHistory.length - 1];
  const employees = activeEmployees(state);

  console.log("\nFECHAMENTO MENSAL — RH, FINANCEIRO E CLIMA");
  console.log(
    `Tempo: dia ${safeGet(calendar, "diaAtual", "-")} | mes ${safeGet(calendar, "mesAtual", "-")} | ano ${safeGet(calendar, "anoAtual", "-")} | dias simulados ${safeGet(calendar, "totalDiasSimulados", "-")}`
  );
  console.log(`Caixa: ${formatMoney(safeGet(economy, "caixaAtual", 0))}`);
  console.log(`Receita mensal atual: ${formatMoney(safeGet(economy, "receitaMensalAtual", 0))}`);
  console.log(`Custos fixos: ${formatMoney(safeGet(economy, "custoFixoMensal", 0))}`);
  console.log(`Folha: ${formatMoney(safeGet(economy, "folhaPagamentoMensal", 0))}`);
  console.log(`Inflacao acumulada: ${formatPercent(safeGet(economy, "inflacaoAcumulada", 0))}`);
  console.log(`Lucro/prejuizo mensal: ${formatMoney(safeGet(economy, "lucroPrejuizoMensal", 0))}`);

  if (lastFinancial && lastFinancial.eventoEconomico) {
    console.log(`Evento economico: ${lastFinancial.eventoEconomico}`);
  } else {
    console.log("Evento economico: nenhum evento financeiro relevante no ultimo fechamento.");
  }

  const averageSatisfaction = average(employees.map((employee) => employee.satisfacao));
  const averageFear = average(employees.map((employee) => employee.medo));
  const averageOverload = average(employees.map((employee) => employee.sobrecarga));
  const averageRisk = average(employees.map((employee) => employee.riscoDeSaida));

  console.log("\nIMPACTOS HUMANOS");
  console.log(`Satisfacao media: ${Math.round(averageSatisfaction)} | ${indicatorReading("satisfacao", averageSatisfaction)}`);
  console.log(`Medo medio: ${Math.round(averageFear)} | ${indicatorReading("medo", averageFear)}`);
  console.log(`Sobrecarga media: ${Math.round(averageOverload)} | ${indicatorReading("sobrecarga", averageOverload)}`);
  console.log(`Risco medio interno de saida: ${Math.round(averageRisk)} | ${indicatorReading("riscoSaida", averageRisk)}`);
  console.log(`Diagnostico integrado: ${monthlyIntegratedDiagnosis(state, { averageSatisfaction, averageFear, averageOverload, averageRisk })}`);

  if ((state.history || []).length) {
    console.log("\nEVENTOS RECENTES DO HISTORICO");
    state.history.slice(-5).forEach((event) => {
      console.log(`- Dia ${event.day}: ${event.description}`);
    });
  }

  printEmployeeActionsSummary(state);
  printRhActionsSummary(state);
  printVisibleSignalsSummary(state);
  printComplianceSummary(state);
  printIndividualMemoriesSummary(state);
}

function printIndividualMemoriesSummary(state, limit = 8) {
  console.log("\nMEMORIAS INDIVIDUAIS RECENTES");
  const memories = (state.employees || [])
    .flatMap((employee) => (employee.memorias || []).map((memory) => ({ employee, memory })))
    .sort((left, right) => safeNumber(right.memory.dia) - safeNumber(left.memory.dia))
    .slice(0, limit);

  if (!memories.length) {
    console.log("- Nenhuma memoria individual registrada. A simulacao ainda tem pouca biografia acumulada.");
    return;
  }

  memories.forEach(({ employee, memory }) => {
    console.log(
      `- ${employee.nome}: ${memory.descricao} | papel ${safeGet(memory, "papelNoEvento", "-")} | intensidade ${safeNumber(
        memory.intensidade
      )}. ${memoryReading(memory)}`
    );
  });
}

function printEmployeeActionsSummary(state, limit = 10) {
  console.log("\nACOES AUTONOMAS RECENTES DOS FUNCIONARIOS");
  const employeesById = new Map((state.employees || []).map((employee) => [employee.id, employee]));
  const recentActions = (state.acoesFuncionarios || []).slice(-limit);

  if (!recentActions.length) {
    console.log("- Nenhuma acao autonoma registrada neste periodo. A empresa pode estar estavel ou a camada de comportamento ainda esta pouco sensivel.");
  } else {
    recentActions.forEach((action) => {
      const employee = employeesById.get(action.funcionarioId);
      const visibility = action.visivelParaRH ? "visivel ao RH" : "oculta ao RH";
      console.log(
        `- Dia ${action.dia}: ${employee ? employee.nome : action.funcionarioId} | ${humanize(action.tipo)} | ${visibility}. ${employeeActionReading(
          action,
          employee
        )}`
      );
    });
  }

  const employees = activeEmployees(state);
  const visibleDemands = employees.filter((employee) => employee.demandasPendentes && employee.demandasPendentes.length);
  const searching = employees.filter((employee) => employee.estadoDeBuscaExterna);
  const criticalRisk = employees.filter((employee) => safeNumber(employee.riscoDeSaida) > 75);

  console.log(`Demandas pendentes individuais: ${visibleDemands.length}`);
  console.log(`Funcionarios em busca externa: ${searching.length}`);
  console.log(`Funcionarios em risco critico: ${criticalRisk.length}`);
  console.log(`Turnover acumulado: ${safeGet(state.company, "turnoverAcumulado", 0)}`);
}

function printVisibleSignalsSummary(state, limit = 10) {
  console.log("\nSINAIS VISIVEIS AO RH — INFORMACAO IMPERFEITA");
  const employeesById = new Map((state.employees || []).map((employee) => [employee.id, employee]));
  const allSignals = state.visibleSignals || [];
  const visibleSignals = allSignals.filter((signal) => signal.visivelParaRH).slice(-limit);
  const hiddenCount = allSignals.filter((signal) => !signal.visivelParaRH).length;

  if (!visibleSignals.length) {
    console.log("- Nenhum sinal visivel registrado. Cuidado: ausencia de sinal nao equivale a ausencia de problema.");
  } else {
    visibleSignals.forEach((signal) => {
      const employee = signal.funcionarioId ? employeesById.get(signal.funcionarioId) : null;
      console.log(
        `- Dia ${signal.dia}: ${employee ? employee.nome : "setor/empresa"} | ${humanize(signal.tipo)} | confiabilidade ${Math.round(
          safeNumber(signal.confiabilidade)
        )}. ${visibleSignalReading(signal, employee)}`
      );
    });
  }

  console.log(`Sinais ocultos para auditoria/debug: ${hiddenCount}`);
  console.log("Leitura tecnica: o RH decide a partir de sinais parciais; confiabilidade baixa deve gerar investigacao, nao conclusao.");
}

function printRhActionsSummary(state, limit = 8) {
  console.log("\nACOES DE DESCOBERTA E INTERVENCAO DO RH");
  if (!state.rh || !state.rh.acoesExecutadas || !state.rh.acoesExecutadas.length) {
    console.log("- Nenhuma acao RH executada. O estado da empresa evoluiu sem intervencao direta do jogador neste periodo.");
    return;
  }

  console.log(`Energia RH: ${state.rh.energiaAtual}/${state.rh.energiaSemanal}`);
  state.rh.acoesExecutadas.slice(-limit).forEach((action) => {
    const generatedSignals = Array.isArray(action.sinaisGerados) ? action.sinaisGerados.length : 0;
    console.log(
      `- Dia ${action.dia}: ${action.nome} | energia ${action.custoEnergia} | sinais gerados ${generatedSignals}. ${rhActionReading(action)}`
    );
  });
}

function printComplianceSummary(state, limit = 6) {
  console.log("\nCOMPLIANCE E SEGURANCA PSICOLOGICA");
  const compliance = safeGet(state.company, "compliance", {});
  const reportCases = state.reportCases || [];
  console.log(`Confianca no canal: ${Math.round(safeNumber(compliance.confiancaNoCanal))} | ${indicatorReading("confiancaCanal", compliance.confiancaNoCanal)}`);
  console.log(`Risco de subnotificacao: ${Math.round(safeNumber(compliance.riscoSubnotificacao))} | ${indicatorReading("subnotificacao", compliance.riscoSubnotificacao)}`);
  console.log(`Denuncias registradas: ${reportCases.length}`);

  const complianceEvents = (state.organizationEvents || []).filter((event) => event.tags && event.tags.includes("compliance")).slice(-limit);
  if (!complianceEvents.length) {
    console.log("- Nenhum evento de compliance registrado. Interpretar com cautela: pode haver seguranca real ou subnotificacao.");
    return;
  }

  complianceEvents.forEach((event) => {
    const sector = (state.sectors || []).find((item) => item.id === event.setorId);
    console.log(
      `- Dia ${event.dia}: ${humanize(event.tipo)} | ${sector ? sector.nome : "empresa"} | severidade ${Math.round(
        safeNumber(event.severidade)
      )}. ${complianceEventReading(event, compliance)}`
    );
  });
}

function buildCompanyDiagnostic(company, economy, employees) {
  const lines = [];
  const maturity = safeNumber(safeGet(company, "maturidadeGestao", 0));
  const pressure = safeNumber(safeGet(company, "pressaoPorResultado", 0));
  const rhCapacity = safeNumber(safeGet(company, "capacidadeRH", 0));
  const crisisRisk = safeNumber(safeGet(company, "riscoCrise", 0));
  const payroll = safeNumber(safeGet(economy, "folhaPagamentoMensal", 0));
  const revenue = safeNumber(safeGet(economy, "receitaMensalBase", 0));

  if (pressure >= 65 && maturity < 50) {
    lines.push("Pressao por resultado alta com maturidade de gestao baixa: combinacao propensa a cobranca reativa, desalinhamento e conflito de prioridade.");
  } else if (pressure >= 65) {
    lines.push("Pressao por resultado alta: acompanhar se liderancas transformam meta em clareza de prioridade ou apenas aumento de cobranca.");
  } else {
    lines.push("Pressao por resultado em patamar manejavel, com menor risco de contaminacao imediata do clima por urgencia operacional.");
  }

  if (rhCapacity < 45) {
    lines.push("Capacidade de RH limitada: o jogador deve priorizar intervencoes de alta informacao e baixo custo, evitando tentar cobrir toda a empresa ao mesmo tempo.");
  } else {
    lines.push("Capacidade de RH suficiente para ciclos curtos de diagnostico, desde que a energia semanal seja protegida de acoes pouco informativas.");
  }

  if (revenue > 0 && payroll / revenue > 0.55) {
    lines.push("Folha consome parcela relevante da receita base; qualquer crise economica tende a pressionar decisoes de pessoas.");
  }

  if (crisisRisk >= 60) {
    lines.push("Risco de crise elevado: eventos externos podem acelerar medo, saida voluntaria e cobranca de diretoria.");
  }

  const overloaded = employees.filter((employee) => safeNumber(employee.sobrecarga) >= 75).length;
  if (overloaded) {
    lines.push(`${overloaded} pessoa(s) ja aparecem em sobrecarga alta no retrato atual; risco de desgaste antes mesmo de nova demanda.`);
  }

  return lines;
}

function sectorRiskLabel(sector, employees) {
  const avgOverload = average(employees.map((employee) => employee.sobrecarga));
  const avgRisk = average(employees.map((employee) => employee.riscoDeSaida));
  const conflictPressure = safeNumber(sector.cargaTrabalho) - safeNumber(sector.climaSetor);

  if (avgRisk >= 70 || avgOverload >= 75 || conflictPressure >= 35) return "ALTO";
  if (avgRisk >= 55 || avgOverload >= 60 || conflictPressure >= 20) return "MODERADO";
  return "BAIXO/MODERADO";
}

function sectorReading(sector, employees) {
  if (!employees.length) return "Setor sem funcionarios ativos; validar geracao procedural ou desligamentos.";

  const avgOverload = average(employees.map((employee) => employee.sobrecarga));
  const avgSatisfaction = average(employees.map((employee) => employee.satisfacao));
  const avgRisk = average(employees.map((employee) => employee.riscoDeSaida));

  if (avgOverload >= 70 && avgSatisfaction < 50) {
    return "Sobrecarga alta com baixa satisfacao sugere risco de desgaste coletivo e queda de cooperacao.";
  }
  if (safeNumber(sector.nivelEspecializacao) >= 70 && avgRisk >= 60) {
    return "Setor tecnicamente sensivel: perda de uma pessoa pode gerar impacto desproporcional na operacao.";
  }
  if (safeNumber(sector.climaSetor) < 45) {
    return "Clima setorial baixo; priorizar escuta e mapeamento de lideranca informal.";
  }
  return "Sem ruptura aparente; acompanhar sinais fracos e distribuicao de carga.";
}

function buildEmployeeReading(employee, sector) {
  const fragments = [];
  const satisfaction = safeNumber(employee.satisfacao);
  const overload = safeNumber(employee.sobrecarga);
  const risk = safeNumber(employee.riscoDeSaida);
  const productivity = safeNumber(employee.produtividade);
  const specialization = safeNumber(employee.especializacao);

  if (overload >= 75) fragments.push("sobrecarga em patamar critico");
  if (satisfaction < 45) fragments.push("baixa satisfacao subjetiva");
  if (risk >= 75) fragments.push("risco de saida critico");
  if (employee.estadoDeBuscaExterna) fragments.push("busca externa ativa");
  if (specialization >= 70 && risk >= 60) fragments.push("pessoa tecnicamente sensivel para retencao");
  if (productivity >= 70 && satisfaction < 45) fragments.push("alto desempenho com baixa satisfacao, padrao classico de risco silencioso");
  if (sector && safeNumber(sector.climaSetor) < 45) fragments.push("atua em setor com clima fragil");

  if (!fragments.length) return "sem alerta individual dominante; manter observacao longitudinal.";
  return `${capitalize(fragments.join("; "))}. Recomenda-se cruzar com memorias recentes e relacoes de dependencia tecnica.`;
}

function buildRelationshipReading(relationship, left, right) {
  const conflict = safeNumber(relationship.conflito);
  const trust = safeNumber(relationship.confianca);
  const dependency = safeNumber(relationship.dependenciaTecnica);
  const proximity = safeNumber(relationship.proximidadeTrabalho);

  if (conflict >= 65 && dependency >= 60) {
    return "Conflito alto entre pessoas tecnicamente dependentes: risco de travamento operacional e contaminacao do setor.";
  }
  if (trust < 40 && proximity >= 70) {
    return "Baixa confianca com alta proximidade de trabalho: relacao cotidiana tende a produzir atrito recorrente.";
  }
  if (trust >= 70 && dependency >= 60) {
    return "Vinculo de alta confianca e dependencia tecnica: pode funcionar como rede de suporte, mas tambem cria fragilidade se uma pessoa sair.";
  }
  if (conflict >= 60) {
    return "Conflito relevante; avaliar se e divergencia produtiva, competicao por reconhecimento ou falha de lideranca.";
  }
  return "Relacao importante para mapa informal; observar mudancas depois de intervencoes do RH ou eventos criticos.";
}

function eventInterpretation(event) {
  const severity = safeNumber(event.severidade);
  if (event.tags && event.tags.includes("compliance")) {
    return "evento sensivel: tratar como risco psicossocial/compliance, nao apenas como ruido relacional.";
  }
  if (severity >= 70) return "evento de alta severidade; tende a permanecer como memoria organizacional relevante.";
  if (severity >= 50) return "evento moderado; pode se acumular se houver repeticao ou baixa resposta institucional.";
  return "evento leve; monitorar se vira padrao.";
}

function memoryReading(memory) {
  const intensity = safeNumber(memory.intensidade);
  if (intensity >= 75) return "Memoria de alta intensidade; pode alterar confianca, medo ou risco de saida.";
  if (intensity >= 50) return "Memoria moderada; relevante se associada a outras ocorrencias recentes.";
  return "Memoria fraca; util como sinal contextual, nao como diagnostico isolado.";
}

function employeeActionReading(action, employee) {
  if (!employee) return "Acao sem funcionario identificado; verificar consistencia do log.";
  if (!action.visivelParaRH) return "Sinal oculto: pode influenciar a simulacao antes de aparecer para o jogador.";
  if (safeNumber(employee.riscoDeSaida) >= 75) return "Aparece em pessoa com risco critico de saida; priorizar leitura individual.";
  if (safeNumber(employee.sobrecarga) >= 75) return "Aparece em contexto de sobrecarga alta; pode ser sintoma de desgaste, nao apenas escolha individual.";
  return "Sinal visivel, mas ainda precisa ser conectado a tendencia e contexto.";
}

function visibleSignalReading(signal, employee) {
  const reliability = safeNumber(signal.confiabilidade);
  if (reliability < 40) return "Sinal fraco: usar como pista para escuta, nao como evidencia conclusiva.";
  if (employee && safeNumber(employee.riscoDeSaida) >= 75) return "Sinal consistente em pessoa de risco; acao rapida pode evitar perda de informacao ou saida.";
  if (reliability >= 75) return "Sinal consistente: boa base para acao diagnostica ou intervencao focal.";
  return "Indicio moderado: vale cruzar com memoria, setor e relacoes proximas.";
}

function rhActionReading(action) {
  const generatedSignals = Array.isArray(action.sinaisGerados) ? action.sinaisGerados.length : 0;
  if (generatedSignals === 0) return "A acao nao gerou novos sinais; pode ter sido pouco aderente ou aplicada em contexto de baixa abertura.";
  if (generatedSignals >= 3) return "Boa produtividade informacional; transformar sinais em priorizacao para nao acumular diagnostico sem resposta.";
  return "A acao gerou informacao pontual; acompanhar se o proximo ciclo confirma a hipotese.";
}

function complianceEventReading(event, compliance) {
  const channelTrust = safeNumber(compliance.confiancaNoCanal);
  const underreporting = safeNumber(compliance.riscoSubnotificacao);
  if (channelTrust < 45 || underreporting >= 65) {
    return "Canal fragil: existe risco de que o evento registrado seja apenas a parte visivel do problema.";
  }
  if (safeNumber(event.severidade) >= 70) {
    return "Alta severidade: exige acolhimento e resposta institucional para preservar seguranca psicologica.";
  }
  return "Acompanhar recorrencia e resposta da lideranca; eventos sensiveis pequenos podem escalar por repeticao.";
}

function monthlyIntegratedDiagnosis(state, indicators) {
  const economy = state.economy || {};
  const cash = safeNumber(economy.caixaAtual);
  const profit = safeNumber(economy.lucroPrejuizoMensal);

  if (indicators.averageOverload >= 70 && indicators.averageRisk >= 65) {
    return "risco humano prioritario: a empresa combina desgaste alto com risco de perda de pessoas.";
  }
  if (indicators.averageFear >= 60 && indicators.averageSatisfaction < 50) {
    return "ambiente defensivo: medo alto e satisfacao baixa tendem a reduzir fala espontanea e confianca no RH.";
  }
  if (cash < 0 || profit < 0) {
    return "pressao financeira ativa: decisoes de pessoas podem ficar mais reativas e menos preventivas.";
  }
  if (indicators.averageSatisfaction >= 60 && indicators.averageOverload < 55) {
    return "quadro manejavel: ha margem para intervencoes preventivas e desenvolvimento de cultura.";
  }
  return "quadro intermediario: sem crise unica dominante, mas com necessidade de observar concentracao de risco.";
}

function indicatorReading(type, value) {
  const number = safeNumber(value);
  if (type === "satisfacao") {
    if (number >= 65) return "boa aderencia subjetiva ao trabalho";
    if (number >= 50) return "zona intermediaria; acompanhar variacao por setor";
    return "baixa aderencia; risco de cinismo e perda de engajamento";
  }
  if (type === "medo") {
    if (number >= 65) return "alto; pode reduzir fala espontanea e aumentar subnotificacao";
    if (number >= 45) return "moderado; observar gatilhos recentes";
    return "baixo/manejavel";
  }
  if (type === "sobrecarga") {
    if (number >= 70) return "critica; risco de desgaste e erro operacional";
    if (number >= 55) return "moderada/alta; pede redistribuicao ou priorizacao";
    return "manejavel";
  }
  if (type === "riscoSaida") {
    if (number >= 70) return "critico; retencao deve virar prioridade";
    if (number >= 50) return "moderado; mapear pessoas-chave";
    return "baixo/manejavel";
  }
  if (type === "confiancaCanal") {
    if (number >= 65) return "canal com boa legitimidade relativa";
    if (number >= 45) return "canal em zona intermediaria; devolutivas serao decisivas";
    return "canal fragil; alto risco de silencio organizacional";
  }
  if (type === "subnotificacao") {
    if (number >= 65) return "alto; problemas podem estar invisiveis";
    if (number >= 45) return "moderado; exige escuta ativa";
    return "baixo/manejavel";
  }
  return "sem leitura especifica";
}

function relationshipPriority(relationship) {
  return safeNumber(relationship.conflito) * 1.2 + safeNumber(relationship.dependenciaTecnica) + safeNumber(relationship.proximidadeTrabalho) * 0.5 - safeNumber(relationship.confianca) * 0.2;
}

function activeEmployees(state) {
  return (state.employees || []).filter((employee) => employee.status !== "desligado");
}

function average(values) {
  const numericValues = values.map(safeNumber).filter((value) => Number.isFinite(value));
  if (!numericValues.length) return 0;
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function formatCargo(cargoFormal) {
  if (!cargoFormal) return "-";
  if (typeof cargoFormal === "string") return cargoFormal;
  return cargoFormal.nome || cargoFormal.titulo || "-";
}

function mapById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeGet(object, key, fallback) {
  if (!object || object[key] === undefined || object[key] === null) return fallback;
  return object[key];
}

function humanize(value) {
  if (!value) return "evento";
  return String(value).replace(/_/g, " ");
}

function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = {
  printCompanySummary,
  printEmployeesSummary,
  printRelationsSummary,
  printMemoriesSummary,
  printMonthlyReport,
  printEmployeeActionsSummary,
  printIndividualMemoriesSummary,
  printVisibleSignalsSummary,
  printComplianceSummary,
  printRhActionsSummary,
};
