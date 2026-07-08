/**
 * Modulo: testUtils
 * Responsabilidade: utilitarios simples para testes em Node puro.
 * Entrada: estados da engine
 * Saida: asserts, snapshots e diagnosticos
 * Nao deve: alterar estado da simulacao.
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(left, right, message) {
  if (left !== right) {
    throw new Error(`${message}\nEsperado: ${right}\nRecebido: ${left}`);
  }
}

function assertNotEqual(left, right, message) {
  if (left === right) {
    throw new Error(message);
  }
}

function stableSnapshot(state) {
  return JSON.stringify({
    seed: state.seed,
    calendar: state.calendar,
    company: state.company,
    sectors: state.sectors,
    employees: state.employees,
    relationships: state.relationships,
    organizationEvents: state.organizationEvents,
    economy: state.economy,
    history: state.history,
    historicoEventos: state.historicoEventos,
    eventosRecentes: state.eventosRecentes,
    acoesFuncionarios: state.acoesFuncionarios,
    visibleSignals: state.visibleSignals,
    visibility: state.visibility,
    rh: state.rh,
  });
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hasValidNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && !Number.isNaN(value);
}

function collectRangeAlerts(state) {
  const alerts = [];
  const employeeFields = [
    "satisfacao",
    "medo",
    "sobrecarga",
    "produtividade",
    "riscoDeSaida",
    "confiancaNaGestao",
    "qualificacao",
    "afetividade",
    "autonomia",
    "ambicao",
    "aberturaParaMudanca",
    "estabilidadeEmocional",
    "influenciaInformal",
    "especializacao",
    "desvioDeFuncao",
    "acumuloDeFuncao",
    "intencaoSaida",
    "comprometimentoOrganizacional",
    "suportePercebido",
    "justicaPercebida",
    "vinculoOrganizacional",
    "empregabilidadeExterna",
    "salarioPercebidoMercado",
    "perspectivaCrescimento",
    "confiancaNoRH",
    "cargaFuncionalTotal",
    "aderenciaFuncionalMedia",
    "indiceAcumuloFuncao",
    "indiceDesvioFuncao",
    "trabalhoInvisivel",
    "injusticaFuncionalPercebida",
    "dependenciaOrganizacional",
    "riscoPorSobrecargaFuncional",
    "nivelEnsinoMercado",
    "ajusteEducacaoCargo",
    "ajusteEspecializacaoCargo",
  ];
  const companyFields = [
    "maturidadeGestao",
    "pressaoPorResultado",
    "estabilidadeFinanceira",
    "riscoCrise",
    "culturaCuidado",
    "culturaCompetitiva",
    "nivelBurocracia",
    "rotatividadeBase",
    "capacidadeRH",
    "rumorGlobal",
    "justicaOrganizacionalMedia",
    "suporteOrganizacionalMedio",
    "taxaTurnover",
  ];
  const sectorFields = ["importanciaEstrategica", "cargaTrabalho", "nivelEspecializacao", "climaSetor", "rumorLocal", "taxaTurnover"];
  const complianceFields = [
    "maturidadeCompliance",
    "anonimatoPercebido",
    "protecaoContraRetaliacao",
    "tempoRespostaMedio",
    "confiancaNoCanal",
    "treinamentoEtica",
    "politicaAntiAssedio",
    "politicaAntidiscriminacao",
    "segurancaPsicologica",
    "historicoRetaliacao",
    "toleranciaLiderancaAbusiva",
    "riscoSubnotificacao",
  ];
  const sectorComplianceFields = [
    "inclusionClimate",
    "psychologicalSafety",
    "powerDistance",
    "complianceVisibility",
    "reportFear",
  ];
  const relationshipFields = ["proximidadeTrabalho", "afinidade", "confianca", "conflito", "dependenciaTecnica"];
  const perceptionFields = [
    "satisfacaoEstimada",
    "riscoSaidaEstimado",
    "sobrecargaEstimada",
    "engajamentoEstimado",
    "confiancaEstimada",
    "confiabilidadeGeral",
  ];

  validatePercentFields(alerts, "empresa", state.company.id, state.company, companyFields);
  if (state.company.compliance) {
    validatePercentFields(alerts, "compliance_empresa", state.company.id, state.company.compliance, complianceFields);
  }
  state.sectors.forEach((sector) => {
    validatePercentFields(alerts, "setor", sector.id, sector, sectorFields);
    validatePercentFields(alerts, "compliance_setor", sector.id, sector, sectorComplianceFields);
  });
  state.employees.forEach((employee) => {
    validatePercentFields(alerts, "funcionario", employee.id, employee, employeeFields);
    if (employee.percepcaoRH) {
      validatePercentFields(alerts, "percepcao_rh", employee.id, employee.percepcaoRH, perceptionFields);
    }
  });
  state.employees.forEach((employee) => {
    (employee.memorias || []).forEach((memory) => {
      validatePercentFields(alerts, "memoria_individual", memory.id, memory, ["intensidade", "proximidadeComEvento"]);
    });
  });
  state.relationships.forEach((relationship) =>
    validatePercentFields(alerts, "relacao", relationship.id, relationship, relationshipFields)
  );
  (state.organizationEvents || []).forEach((event) =>
    validatePercentFields(alerts, "evento_organizacional", event.id, event, ["severidade"])
  );
  (state.acoesFuncionarios || []).forEach((action) =>
    validatePercentFields(alerts, "acao", action.id, action, ["severidade"])
  );
  (state.visibleSignals || []).forEach((signal) =>
    validatePercentFields(alerts, "sinal_visibilidade", signal.id, signal, ["severidade", "confiabilidade"])
  );
  (state.reportCases || []).forEach((reportCase) =>
    validatePercentFields(alerts, "denuncia", reportCase.id, reportCase, ["severidade", "riscoRetaliacao", "confiabilidadeInicial"])
  );

  Object.entries(state.economy).forEach(([key, value]) => {
    if (typeof value === "number" && !hasValidNumber(value)) {
      alerts.push(`economia.${key} invalido: ${value}`);
    }
  });

  ["caixaAtual", "receitaMensalBase", "receitaMensalAtual", "custoFixoMensal", "folhaPagamentoMensal"].forEach(
    (field) => {
      if (!hasValidNumber(state.economy[field])) alerts.push(`economia.${field} nao e numero valido`);
    }
  );

  return alerts;
}

function collectCoherenceAlerts(state) {
  const alerts = [];
  const sectorIds = new Set(state.sectors.map((sector) => sector.id));
  const employeeIds = new Set(state.employees.map((employee) => employee.id));

  if (!state.company.nome) alerts.push("empresa sem nome");
  if (!state.company.arquetipo) alerts.push("empresa sem arquetipo");
  if (!state.company.setorEconomico) alerts.push("empresa sem segmento economico");
  if (!state.sectors.length) alerts.push("empresa sem setores");
  if (!state.economy || !hasValidNumber(state.economy.caixaAtual)) alerts.push("empresa sem financeiro valido");
  if (!Array.isArray(state.organizationEvents)) alerts.push("estado sem organizationEvents");
  if (!Array.isArray(state.reportCases)) alerts.push("estado sem reportCases");
  if (!state.company.compliance) alerts.push("empresa sem compliance");
  if (!state.rh) alerts.push("estado sem rh");
  if (state.rh) {
    ["energiaSemanal", "energiaAtual", "maturidadeRH", "confiancaDiretoria"].forEach((field) => {
      if (!hasValidNumber(state.rh[field]) || state.rh[field] < 0) {
        alerts.push(`rh.${field} invalido: ${state.rh[field]}`);
      }
    });
    if (!Array.isArray(state.rh.acoesExecutadas)) alerts.push("rh sem acoesExecutadas");
    if (!Array.isArray(state.rh.acoesPlanejadas)) alerts.push("rh sem acoesPlanejadas");
    if (!Array.isArray(state.rh.aprovacoesDiretoria)) alerts.push("rh sem aprovacoesDiretoria");
    (state.rh.acoesExecutadas || []).forEach((action) => {
      if (!action.id) alerts.push("acao RH sem id");
      if (!action.tipo) alerts.push(`acao RH ${action.id} sem tipo`);
      if (!action.status) alerts.push(`acao RH ${action.id} sem status`);
      if (!Array.isArray(action.eventosGerados)) alerts.push(`acao RH ${action.id} sem eventosGerados`);
      if (!Array.isArray(action.sinaisGerados)) alerts.push(`acao RH ${action.id} sem sinaisGerados`);
    });
    (state.rh.acoesPlanejadas || []).forEach((plan) => {
      if (!plan.id) alerts.push("plano RH sem id");
      if (!plan.tipo) alerts.push(`plano RH ${plan.id} sem tipo`);
      if (!plan.status) alerts.push(`plano RH ${plan.id} sem status`);
      if (!hasValidNumber(plan.diasPreparados)) alerts.push(`plano RH ${plan.id} sem diasPreparados numerico`);
      if (!hasValidNumber(plan.qualidadePlanejamento)) alerts.push(`plano RH ${plan.id} sem qualidadePlanejamento numerica`);
    });
  }
  if (!Array.isArray(state.visibleSignals)) alerts.push("estado sem visibleSignals");
  if (!state.visibility || !Array.isArray(state.visibility.processedEventIds)) {
    alerts.push("estado sem controle de eventos processados por visibilidade");
  }
  if (!state.visibility || !Array.isArray(state.visibility.processedMemoryIds)) {
    alerts.push("estado sem controle de memorias processadas por visibilidade");
  }
  if (state.memories) alerts.push("estado ainda possui state.memories; usar organizationEvents");
  if (state.memoriaOrganizacional) alerts.push("estado ainda possui memoriaOrganizacional; usar organizationEvents");

  state.sectors.forEach((sector) => {
    const activeSectorEmployees = sector.funcionariosIds.filter((employeeId) => {
      const employee = state.employees.find((item) => item.id === employeeId);
      return employee && employee.status !== "desligado";
    });
    if (!activeSectorEmployees.length) alerts.push(`setor ${sector.id} sem funcionarios ativos`);
    sector.funcionariosIds.forEach((employeeId) => {
      if (!employeeIds.has(employeeId)) alerts.push(`setor ${sector.id} aponta funcionario inexistente ${employeeId}`);
    });
  });

  state.employees.forEach((employee) => {
    if (!sectorIds.has(employee.setorId)) alerts.push(`funcionario ${employee.id} aponta setor inexistente`);
    if (!employee.ocupacaoBaseId) alerts.push(`funcionario ${employee.id} sem ocupacao`);
    if (!employee.cargoFormal) alerts.push(`funcionario ${employee.id} sem cargo formal`);
    if (employee.cargoFormal && typeof employee.cargoFormal === "object") {
      if (!employee.cargoFormal.nome) alerts.push(`funcionario ${employee.id} com cargo formal sem nome`);
      if (!employee.cargoFormal.setorId) alerts.push(`funcionario ${employee.id} com cargo formal sem setorId`);
      if (employee.cargoFormal.setorId !== employee.setorId) {
        alerts.push(`funcionario ${employee.id} com setor divergente entre cargo formal e funcionario`);
      }
    }
    if (!employee.status) alerts.push(`funcionario ${employee.id} sem status`);
    if (!employee.socialMarkers) alerts.push(`funcionario ${employee.id} sem socialMarkers`);
    if (employee.socialMarkers) {
      if (!employee.socialMarkers.genero) alerts.push(`funcionario ${employee.id} sem marcador de genero`);
      if (!employee.socialMarkers.racaCor) alerts.push(`funcionario ${employee.id} sem marcador de racaCor`);
    }
    if (!hasValidNumber(employee.salarioMensal) || employee.salarioMensal <= 0) {
      alerts.push(`funcionario ${employee.id} sem salario valido`);
    }
    if (!Array.isArray(employee.tarefasPrevistas) || !employee.tarefasPrevistas.length) {
      alerts.push(`funcionario ${employee.id} sem tarefas previstas`);
    }
    if (!Array.isArray(employee.tarefasReais) || !employee.tarefasReais.length) {
      alerts.push(`funcionario ${employee.id} sem tarefas reais`);
    }
    if (!Array.isArray(employee.funcoesPrevistas) || !employee.funcoesPrevistas.length) {
      alerts.push(`funcionario ${employee.id} sem funcoes previstas`);
    }
    if (!Array.isArray(employee.funcoesReais) || !employee.funcoesReais.length) {
      alerts.push(`funcionario ${employee.id} sem funcoes reais`);
    }
    (employee.funcoesPrevistas || []).forEach((assignment) => validateFunctionAssignment(alerts, employee, assignment));
    (employee.funcoesReais || []).forEach((assignment) => validateFunctionAssignment(alerts, employee, assignment));
    if (!Array.isArray(employee.memorias)) {
      alerts.push(`funcionario ${employee.id} sem array de memorias individuais`);
    }
    if (!employee.percepcaoRH) {
      alerts.push(`funcionario ${employee.id} sem percepcaoRH`);
    } else {
      if (!Array.isArray(employee.percepcaoRH.sinaisRecentes)) {
        alerts.push(`funcionario ${employee.id} sem sinaisRecentes em percepcaoRH`);
      }
      employee.percepcaoRH.sinaisRecentes.forEach((signalId) => {
        if (!(state.visibleSignals || []).some((signal) => signal.id === signalId)) {
          alerts.push(`percepcaoRH de ${employee.id} aponta sinal inexistente ${signalId}`);
        }
      });
    }
    (employee.memorias || []).forEach((memory) => {
      if (!memory.id) alerts.push(`funcionario ${employee.id} tem memoria individual sem id`);
      if (memory.funcionarioId !== employee.id) {
        alerts.push(`memoria individual ${memory.id} nao aponta para seu funcionario dono`);
      }
      if (!memory.tipo) alerts.push(`funcionario ${employee.id} tem memoria individual sem tipo`);
      if (!memory.origemEventoId) alerts.push(`funcionario ${employee.id} tem memoria individual sem origemEventoId`);
      if (
        memory.origemEventoId &&
        !(state.organizationEvents || []).some((event) => event.id === memory.origemEventoId)
      ) {
        alerts.push(`memoria individual ${memory.id} aponta evento inexistente ${memory.origemEventoId}`);
      }
      if (!memory.papelNoEvento) alerts.push(`funcionario ${employee.id} tem memoria individual sem papelNoEvento`);
      if (!memory.valencia) alerts.push(`funcionario ${employee.id} tem memoria individual sem valencia`);
      if (!memory.impactoResidual) alerts.push(`funcionario ${employee.id} tem memoria individual sem impactoResidual`);
      if (!Array.isArray(memory.funcionariosEnvolvidos)) {
        alerts.push(`funcionario ${employee.id} tem memoria individual sem funcionariosEnvolvidos`);
      }
      (memory.funcionariosEnvolvidos || []).forEach((employeeId) => {
        if (!employeeIds.has(employeeId)) {
          alerts.push(`memoria individual ${memory.id} aponta funcionario inexistente ${employeeId}`);
        }
      });
    });
  });

  state.relationships.forEach((relationship) => {
    if (!employeeIds.has(relationship.fromEmployeeId)) {
      alerts.push(`relacao ${relationship.id} aponta fromEmployeeId inexistente`);
    }
    if (!employeeIds.has(relationship.toEmployeeId)) {
      alerts.push(`relacao ${relationship.id} aponta toEmployeeId inexistente`);
    }
    const left = state.employees.find((employee) => employee.id === relationship.fromEmployeeId);
    const right = state.employees.find((employee) => employee.id === relationship.toEmployeeId);
    if (
      relationship.ativa !== false &&
      ((left && left.status === "desligado") || (right && right.status === "desligado"))
    ) {
      alerts.push(`relacao ${relationship.id} ativa aponta funcionario desligado`);
    }
  });

  (state.organizationEvents || []).forEach((event) => {
    if (!event.id) alerts.push("evento organizacional sem id");
    if (!event.tipo) alerts.push(`evento organizacional ${event.id} sem tipo`);
    if (!event.descricao) alerts.push(`evento organizacional ${event.id} sem descricao`);
    if (!Array.isArray(event.tags)) alerts.push(`evento organizacional ${event.id} sem tags`);
    if (!event.setorId && (!Array.isArray(event.funcionariosEnvolvidos) || !event.funcionariosEnvolvidos.length)) {
      alerts.push(`evento organizacional ${event.id} sem setor ou envolvidos`);
    }
    (event.funcionariosEnvolvidos || []).forEach((employeeId) => {
      if (!employeeIds.has(employeeId)) {
        alerts.push(`evento organizacional ${event.id} aponta funcionario inexistente ${employeeId}`);
      }
    });
  });

  (state.acoesFuncionarios || []).forEach((action) => {
    if (!employeeIds.has(action.funcionarioId)) alerts.push(`acao ${action.id} aponta funcionario inexistente`);
    if (action.setorId && !sectorIds.has(action.setorId)) alerts.push(`acao ${action.id} aponta setor inexistente`);
    if (!action.tipo) alerts.push(`acao ${action.id} sem tipo`);
  });

  (state.reportCases || []).forEach((reportCase) => {
    if (!reportCase.id) alerts.push("denuncia sem id");
    if (!reportCase.origemEventoId) alerts.push(`denuncia ${reportCase.id} sem origemEventoId`);
    if (!employeeIds.has(reportCase.targetEmployeeId)) alerts.push(`denuncia ${reportCase.id} aponta alvo inexistente`);
    if (reportCase.reporterId && !employeeIds.has(reportCase.reporterId)) {
      alerts.push(`denuncia ${reportCase.id} aponta reporter inexistente`);
    }
    if (reportCase.allegedAuthorId && !employeeIds.has(reportCase.allegedAuthorId)) {
      alerts.push(`denuncia ${reportCase.id} aponta allegedAuthor inexistente`);
    }
    if (!sectorIds.has(reportCase.setorId)) alerts.push(`denuncia ${reportCase.id} aponta setor inexistente`);
    if (!(state.organizationEvents || []).some((event) => event.id === reportCase.origemEventoId)) {
      alerts.push(`denuncia ${reportCase.id} aponta evento inexistente`);
    }
  });

  (state.visibleSignals || []).forEach((signal) => {
    if (!signal.id) alerts.push("sinal de visibilidade sem id");
    if (!signal.tipo) alerts.push(`sinal ${signal.id} sem tipo`);
    if (!signal.origem) alerts.push(`sinal ${signal.id} sem origem`);
    if (!Array.isArray(signal.interpretacoesPossiveis)) {
      alerts.push(`sinal ${signal.id} sem interpretacoesPossiveis`);
    }
    if (!Array.isArray(signal.tags)) alerts.push(`sinal ${signal.id} sem tags`);
    if (signal.funcionarioId && !employeeIds.has(signal.funcionarioId)) {
      alerts.push(`sinal ${signal.id} aponta funcionario inexistente`);
    }
    if (signal.setorId && !sectorIds.has(signal.setorId)) {
      alerts.push(`sinal ${signal.id} aponta setor inexistente`);
    }
    if (
      signal.origemEventoId &&
      !(state.organizationEvents || []).some((event) => event.id === signal.origemEventoId)
    ) {
      alerts.push(`sinal ${signal.id} aponta evento inexistente`);
    }
    if (signal.origemMemoriaId) {
      const memoryExists = state.employees.some((employee) =>
        (employee.memorias || []).some((memory) => memory.id === signal.origemMemoriaId)
      );
      if (!memoryExists) alerts.push(`sinal ${signal.id} aponta memoria inexistente`);
    }
  });

  const expectedPayroll = state.employees
    .filter((employee) => employee.status !== "desligado")
    .reduce((sum, employee) => sum + employee.salarioMensal, 0);
  if (Math.abs(expectedPayroll - state.economy.folhaPagamentoMensal) > 1) {
    alerts.push(
      `folha salarial inconsistente: esperado ${expectedPayroll}, recebido ${state.economy.folhaPagamentoMensal}`
    );
  }

  return alerts;
}

function validatePercentFields(alerts, type, id, target, fields) {
  fields.forEach((field) => {
    const value = target[field];
    if (!hasValidNumber(value) || value < 0 || value > 100) {
      alerts.push(`${type} ${id} campo ${field} fora da faixa 0-100: ${value}`);
    }
  });
}

function validateFunctionAssignment(alerts, employee, assignment) {
  if (!assignment.id) alerts.push(`funcionario ${employee.id} possui funcao sem id`);
  if (!assignment.nome) alerts.push(`funcionario ${employee.id} possui funcao sem nome`);
  if (!assignment.tipo) alerts.push(`funcionario ${employee.id} possui funcao sem tipo`);
  if (!assignment.areaResponsavel) alerts.push(`funcionario ${employee.id} possui funcao sem areaResponsavel`);
  if (!hasValidNumber(assignment.cargaSemanal) || assignment.cargaSemanal <= 0) {
    alerts.push(`funcionario ${employee.id} possui funcao ${assignment.id} com cargaSemanal invalida`);
  }
  validatePercentFields(alerts, "funcao", assignment.id, assignment, [
    "complexidade",
    "aderenciaAoCargo",
    "criticidade",
    "visibilidade",
    "reconhecimento",
  ]);
}

module.exports = {
  assert,
  assertEqual,
  assertNotEqual,
  stableSnapshot,
  average,
  collectRangeAlerts,
  collectCoherenceAlerts,
  hasValidNumber,
};
