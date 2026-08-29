/**
 * Modulo: gameSnapshot
 * Responsabilidade: criar snapshots seguros para futuras UIs jogaveis.
 * Entrada: sessao/estado da engine
 * Saida: dados serializaveis contendo apenas o que o jogador pode saber
 * Nao deve: expor estado real bruto, sinais ocultos ou regras de simulacao.
 */

const { RH_DISCOVERY_ACTIONS, RH_INTERVENTION_ACTIONS } = require("../rh/rhActionCatalog");
const { buildWeeklyBriefing } = require("./weekPlanner");
const { generateOfficeMap } = require("./officeMapGenerator");
const { normalizeWorkspaceState } = require("./workspaceAssignment");
const { routineSlotForMinute } = require("../simulation/employeeRoutineEngine");
const { getTechnologyCatalogSnapshot } = require("../rh/organizationalTechTree");
const {
  getVisibleEmployeeData,
  getVisibleSectorData,
  getVisibleOrgChart,
  getVisibleDashboardMetrics,
} = require("../knowledge/unlockableVisibilityModel");

function buildGameSnapshot(session) {
  return {
    seed: session.seed,
    status: session.status,
    scenario: session.scenario,
    calendar: buildCalendarSnapshot(session.state),
    company: buildCompanySnapshot(session.state),
    world: buildWorldSnapshot(session.state),
    playerKnowledge: buildPlayerKnowledgeSnapshot(session.state, session),
    actionAvailability: buildActionAvailabilitySnapshot(session.state),
    weekly: {
      semanaAtual: session.semanaAtual,
      horizonteSemanas: session.horizonteSemanas,
      relatoriosRecentes: session.relatoriosSemanais.slice(-3).map((report) => ({
        semana: report.semana,
        diaInicial: report.diaInicial,
        diaFinal: report.diaFinal,
        resumo: report.resumo,
        diagnostico: report.progresso.diagnostico,
        score: report.progresso.score,
      })),
    },
    avaliacaoFinal: session.avaliacaoFinal
      ? {
          classificacao: session.avaliacaoFinal.classificacao,
          score: session.avaliacaoFinal.score,
          historiaEmergente: session.avaliacaoFinal.historiaEmergente,
        }
      : null,
  };
}

function buildWorldSnapshot(state) {
  normalizeWorkspaceState(state);
  const visibleEmployeeIds = new Set(state.employees.filter((employee) => employee.status !== "desligado").map((employee) => employee.id));
  const officeMap = generateOfficeMap(state);

  return {
    seed: state.seed,
    companyId: state.company.id,
    officeMap,
    workspace: buildWorkspaceSnapshot(state.workspace),
    orgChart: getVisibleOrgChart(state),
    rooms: [
      { id: "recepcao", tipo: "recepcao", nome: "Recepcao" },
      { id: "rh", tipo: "rh", nome: "Sala do RH" },
      { id: "reuniao", tipo: "reuniao", nome: "Sala de reuniao" },
      { id: "copa", tipo: "copa", nome: "Copa" },
      { id: "banheiro", tipo: "banheiro", nome: "Banheiro" },
      { id: "diretoria", tipo: "diretoria", nome: "Diretoria" },
      ...state.sectors.map((sector) => ({
        id: `room_${sector.id}`,
        tipo: "setor",
        sectorId: sector.id,
        nome: sector.nome,
      })),
    ],
    sectors: state.sectors.map((sector) => ({
      id: sector.id,
      nome: sector.nome,
      funcionariosVisiveis: sector.funcionariosIds.filter((employeeId) => visibleEmployeeIds.has(employeeId)),
      leitura: {
        clima: classifyLevel(sector.climaSetor, true),
        carga: classifyLevel(sector.cargaTrabalho, false),
        rumor: classifyLevel(sector.rumorLocal || 0, false),
      },
      workIndicators: {
        deliveryCapacity: Math.round(sector.workIndicators?.deliveryCapacity || 0),
        deliveryQuality: Math.round(sector.workIndicators?.deliveryQuality || 0),
        workSustainability: Math.round(sector.workIndicators?.workSustainability || 0),
      },
      visibility: getVisibleSectorData(sector, state),
    })),
    npcs: state.employees
      .filter((employee) => employee.status !== "desligado")
      .map((employee) => ({
        employeeId: employee.id,
        nome: employee.nome,
        setorId: employee.setorId,
        managerId: employee.managerId || null,
        cargo: employee.cargoFormal ? employee.cargoFormal.nome : "Funcionario",
        deskId: employee.deskId,
        homeRoomId: employee.homeRoomId,
        currentRoomId: employee.currentRoomId,
        currentLocationId: employee.currentLocationId,
        targetLocationId: employee.targetLocationId,
        currentState: employee.currentState,
        routineSlot: employee.routineSlot,
        visibleStateLabel: getVisibleStateLabel(employee.currentState),
        workIndicators: {
          deliveryCapacity: Math.round(employee.deliveryCapacity || 0),
          deliveryQuality: Math.round(employee.deliveryQuality || 0),
          workSustainability: Math.round(employee.workSustainability || 0),
        },
        estadoVisivel: inferVisibleEmployeeState(employee),
        disponibilidade: inferAvailability(employee),
        sinaisVisiveis: (employee.percepcaoRH?.sinaisRecentes || []).slice(-3),
        visibility: getVisibleEmployeeData(employee, state),
      })),
    interactables: buildInteractables(state),
  };
}

function getVisibleStateLabel(currentState) {
  const labels = {
    working_at_desk: "trabalhando na mesa",
    focused_work: "concentrado",
    idle_at_desk: "ocioso na mesa",
    coffee_break: "em pausa na copa",
    informal_chat: "conversando informalmente",
    meeting: "em reuniao",
    restroom_break: "no banheiro",
    slacking_off: "morcegando",
    going_to_hr: "indo ao RH",
    leaving_work: "encerrando expediente",
  };
  return labels[currentState] || "em rotina de trabalho";
}

function buildWorkspaceSnapshot(workspace) {
  if (!workspace) return null;
  return {
    id: workspace.id,
    version: workspace.version,
    rooms: (workspace.rooms || []).map((room) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      sectorId: room.sectorId,
      capacity: room.capacity,
      privacy: room.privacy,
      noiseLevel: room.noiseLevel,
      position: room.position,
      size: room.size,
      deskIds: room.deskIds || [],
      pointIds: room.pointIds || [],
    })),
    desks: (workspace.desks || []).map((desk) => ({
      id: desk.id,
      roomId: desk.roomId,
      sectorId: desk.sectorId,
      assignedEmployeeId: desk.assignedEmployeeId,
      position: desk.position,
      status: desk.status,
    })),
    pointsOfInterest: (workspace.pointsOfInterest || []).map((point) => ({
      id: point.id,
      roomId: point.roomId,
      type: point.type,
      position: point.position,
      tags: point.tags || [],
    })),
  };
}

function buildPlayerKnowledgeSnapshot(state, session = null) {
  const briefing = buildWeeklyBriefing(state);
  const visibleSignals = (state.visibleSignals || []).filter((signal) => signal.visivelParaRH);
  const playerDay = session?.playerDay || null;

  return {
    briefing,
    visibleSignals: visibleSignals.slice(-20).map((signal) => ({
      id: signal.id,
      dia: signal.dia,
      tipo: signal.tipo,
      funcionarioId: signal.funcionarioId,
      setorId: signal.setorId,
      confiabilidade: Math.round(signal.confiabilidade),
      descricao: signal.descricao,
      interpretacoesPossiveis: signal.interpretacoesPossiveis || [],
      tags: signal.tags || [],
    })),
    employees: state.employees
      .filter((employee) => employee.status !== "desligado")
      .map((employee) => ({
        id: employee.id,
        nome: employee.nome,
        setorId: employee.setorId,
        managerId: employee.managerId || null,
        cargo: employee.cargoFormal ? employee.cargoFormal.nome : "Funcionario",
        percepcaoRH: {
          riscoSaidaEstimado: Math.round(employee.percepcaoRH?.riscoSaidaEstimado || 0),
          sobrecargaEstimada: Math.round(employee.percepcaoRH?.sobrecargaEstimada || 0),
          engajamentoEstimado: Math.round(employee.percepcaoRH?.engajamentoEstimado || 0),
          confiabilidadeGeral: Math.round(employee.percepcaoRH?.confiabilidadeGeral || 0),
        },
        demandasPendentes: (employee.demandasPendentes || [])
          .filter((demand) => demand.status === "pendente")
          .map((demand, index) => ({
            id: demand.id || `${employee.id}:${demand.tipo}:${index}`,
            tipo: demand.tipo,
            diasEmAberto: demand.diasEmAberto || 0,
            prazoRespostaDias: demand.prazoRespostaDias || null,
            prioridade: demand.prioridade || inferDemandPriority(demand),
          })),
      })),
    demandas: buildDemandQueueSnapshot(state),
    ledgerConhecimento: buildKnowledgeLedgerSnapshot(state, visibleSignals),
    decisionCatalog: buildDecisionCatalogSnapshot(state),
    hoje: buildTodayPanelSnapshot(state, session, visibleSignals),
    agenda: {
      energiaAtual: state.rh.energiaAtual,
      energiaSemanal: state.rh.energiaSemanal,
      tempoDia: playerDay
        ? {
            dia: playerDay.dia,
            horaAtual: formatClockSafe(playerDay.horaAtual),
            horaFim: formatClockSafe(playerDay.horaFim),
            tempoRestanteMin: playerDay.tempoRestanteMin,
            energiaDiaria: Math.round(playerDay.energiaAtual),
            focoDiario: Math.round(playerDay.focoAtual),
            routineSlot: routineSlotForMinute(playerDay.horaAtual),
          }
        : null,
      acoesPlanejadas: (state.rh.acoesPlanejadas || []).slice(-10).map((plan) => ({
        id: plan.id,
        tipo: plan.tipo,
        nome: plan.nome,
        status: plan.status,
        executarNoDia: plan.executarNoDia,
        qualidadePlanejamento: Math.round(plan.qualidadePlanejamento || 0),
      })),
      projetos: (state.rh.acoesPlanejadas || [])
        .filter((plan) => plan.status === "planejada" || plan.status === "em_preparo")
        .map((plan) => ({
          id: plan.id,
          tipo: plan.tipo,
          nome: plan.nome,
          progressoDias: plan.diasPreparados || 0,
          alvoDia: plan.executarNoDia,
        })),
      projetosDiarios: (session?.dailyProjects || []).map((project) => ({
        id: project.id,
        tipo: project.tipo,
        nome: project.nome,
        alvo: project.alvo,
        progressoMin: project.progressoMin,
        tempoMinimoMin: project.tempoMinimoMin,
        tempoIdealMin: project.tempoIdealMin,
        qualidadePrevista: Math.round(project.qualidadePrevista || 0),
        status: project.status,
      })),
    },
    technologies: getTechnologyCatalogSnapshot(state),
    dashboard: getVisibleDashboardMetrics(state),
    director: {
      confiancaEstimada: classifyLevel(state.rh.confiancaDiretoria || 0, true),
      aprovacoesRecentes: (state.rh.aprovacoesDiretoria || []).slice(-5).map((approval) => ({
        id: approval.id,
        dia: approval.dia,
        tipoAcao: approval.tipoAcao,
        aprovada: approval.aprovada,
        motivo: approval.motivo,
      })),
    },
  };
}

function buildTodayPanelSnapshot(state, session, visibleSignals) {
  const demands = buildDemandQueueSnapshot(state);
  const projects = session?.dailyProjects || [];
  const priorities = [];
  demands.slice(0, 2).forEach((demand) => priorities.push({
    tipo: "demanda",
    prioridade: demand.prioridade,
    label: `${demand.employeeName}: ${demand.tipo.replaceAll("_", " ")}`,
    target: { employeeId: demand.employeeId },
  }));
  visibleSignals.slice(-2).reverse().forEach((signal) => priorities.push({
    tipo: "sinal",
    prioridade: signal.severidade >= 65 ? 3 : 2,
    label: signal.descricao,
    target: { employeeId: signal.funcionarioId || null, sectorId: signal.setorId || null },
  }));
  projects.filter((project) => project.status === "em_andamento").slice(0, 1).forEach((project) => priorities.push({
    tipo: "projeto",
    prioridade: 2,
    label: `Continuar ${project.nome}: ${project.progressoMin}/${project.tempoIdealMin} min`,
    target: project.alvo,
  }));
  if (priorities.length === 0) {
    priorities.push({ tipo: "orientacao", prioridade: 1, label: "Observe o escritorio e investigue uma pessoa antes de intervir.", target: {} });
  }

  const actionsToday = session?.currentDayActions || [];
  let tutorialHint = "Abra Pessoas, selecione alguem e consulte a ficha antes de decidir.";
  if (demands.length > 0) tutorialHint = "Abra Demandas para atender pedidos com prazo e alvo explicito.";
  else if (actionsToday.some((action) => action.fase === "investigacao")) tutorialHint = "Compare a confiabilidade obtida e forme uma hipotese na aba Decisoes.";
  else if (projects.length > 0) tutorialHint = "Acompanhe o projeto e evite atribuir resultados sem evidencia suficiente.";

  return {
    titulo: "Prioridades de hoje",
    priorities: priorities.sort((left, right) => right.prioridade - left.prioridade).slice(0, 4),
    tutorialHint,
    atalhos: ["WASD/setas: mover", "E: interagir", "Tab: caderno", "Esc: voltar"],
  };
}

function buildDecisionCatalogSnapshot(state) {
  const actions = [...RH_DISCOVERY_ACTIONS, ...RH_INTERVENTION_ACTIONS];
  const employees = state.employees.filter((employee) => employee.status !== "desligado");
  const options = [];

  actions.forEach((action) => {
    if (action.alvo === "funcionario") {
      employees.forEach((employee) => options.push(createDecisionOption(action, {
        target: { employeeId: employee.id },
        targetType: "funcionario",
        targetName: employee.nome,
        sectorId: employee.setorId,
        reliability: Math.round(employee.percepcaoRH?.confiabilidadeGeral || 0),
      })));
    } else if (action.alvo === "setor") {
      state.sectors.forEach((sector) => options.push(createDecisionOption(action, {
        target: { sectorId: sector.id },
        targetType: "setor",
        targetName: sector.nome,
        sectorId: sector.id,
        reliability: Math.round(sector.confiabilidadeLeitura || 45),
      })));
    } else if (action.alvo === "empresa") {
      options.push(createDecisionOption(action, {
        target: {},
        targetType: "empresa",
        targetName: state.company.nome,
        sectorId: null,
        reliability: Math.round(state.rh.maturidadeRH || 35),
      }));
    }
  });

  return {
    total: options.length,
    options,
    filters: {
      fases: ["investigacao", "intervencao"],
      tiposAlvo: ["funcionario", "setor", "empresa"],
    },
  };
}

function createDecisionOption(action, targetInfo) {
  return {
    id: `${action.tipo}:${targetInfo.targetType}:${Object.values(targetInfo.target)[0] || "empresa"}`,
    tipo: action.tipo,
    nome: action.nome,
    categoria: action.categoria,
    fase: action.categoria === "descoberta" ? "investigacao" : "intervencao",
    alvo: targetInfo.target,
    targetType: targetInfo.targetType,
    targetName: targetInfo.targetName,
    sectorId: targetInfo.sectorId,
    confiabilidadeHipotese: targetInfo.reliability,
  };
}

function buildDemandQueueSnapshot(state) {
  return state.employees
    .filter((employee) => employee.status !== "desligado")
    .flatMap((employee) => (employee.demandasPendentes || [])
      .filter((demand) => demand.status === "pendente")
      .map((demand, index) => ({
        id: demand.id || `${employee.id}:${demand.tipo}:${index}`,
        employeeId: employee.id,
        employeeName: employee.nome,
        sectorId: employee.setorId,
        tipo: demand.tipo,
        status: demand.status,
        diasEmAberto: demand.diasEmAberto || 0,
        prazoRespostaDias: demand.prazoRespostaDias || null,
        prioridade: demand.prioridade || inferDemandPriority(demand),
        source: "pedido_direto_do_funcionario",
      })))
    .sort((left, right) => right.prioridade - left.prioridade || right.diasEmAberto - left.diasEmAberto);
}

function buildKnowledgeLedgerSnapshot(state, visibleSignals) {
  const day = state.calendar.totalDiasSimulados;
  return {
    atualizadoNoDia: day,
    sinais: visibleSignals.slice(-30).map((signal) => ({
      id: signal.id,
      tipo: signal.tipo,
      funcionarioId: signal.funcionarioId || null,
      setorId: signal.setorId || null,
      fonte: signal.fonte || signal.origem || "observacao_do_rh",
      dia: signal.dia,
      idadeDias: Math.max(0, day - (Number.isFinite(signal.dia) ? signal.dia : day)),
      confiabilidade: Math.round(signal.confiabilidade || 0),
      descricao: signal.descricao,
    })),
    pessoas: state.employees.filter((employee) => employee.status !== "desligado").map((employee) => ({
      employeeId: employee.id,
      nome: employee.nome,
      setorId: employee.setorId,
      fonte: "percepcao_rh",
      dia: day,
      idadeDias: 0,
      confiabilidade: Math.round(employee.percepcaoRH?.confiabilidadeGeral || 0),
    })),
    setores: state.sectors.map((sector) => ({
      sectorId: sector.id,
      nome: sector.nome,
      fonte: "leitura_setorial",
      dia: day,
      idadeDias: 0,
      confiabilidade: Math.round(sector.confiabilidadeLeitura || 45),
    })),
  };
}

function inferDemandPriority(demand) {
  if (demand.tipo === "aumento_ou_promocao") return 3;
  if ((demand.prazoRespostaDias || 99) <= 2) return 3;
  return 2;
}

function formatClockSafe(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildActionAvailabilitySnapshot(state) {
  const activeEmployees = state.employees.filter((employee) => employee.status !== "desligado");
  const reportCases = state.reportCases || [];

  return [...RH_DISCOVERY_ACTIONS, ...RH_INTERVENTION_ACTIONS].map((action) => ({
    tipo: action.tipo,
    nome: action.nome,
    categoria: action.categoria,
    alvo: action.alvo,
    custoEnergia: action.custoEnergia,
    custoFinanceiro: action.custoFinanceiro || 0,
    preparoMinimoDias: action.preparoMinimoDias,
    preparoIdealDias: action.preparoIdealDias,
    permiteImproviso: action.permiteImproviso,
    requerAprovacaoDiretoria: Boolean(action.requerAprovacaoDiretoria),
    fase: action.categoria === "descoberta" ? "investigacao" : "intervencao",
    efeitosEsperados: (action.efeitosEsperados || []).slice(),
    riscos: (action.riscos || []).slice(),
    tempo: action.tempo
      ? {
          tipo: action.tempo.tipo,
          duracoesPermitidasMin: action.tempo.duracoesPermitidasMin.slice(),
          tempoMinimoMin: action.tempo.tempoMinimoMin,
          tempoIdealMin: action.tempo.tempoIdealMin,
          retornoDecrescenteAposMin: action.tempo.retornoDecrescenteAposMin,
          exigeLocal: action.tempo.exigeLocal,
          exigeAlvoPresente: Boolean(action.tempo.exigeAlvoPresente),
          podeSerInterrompida: Boolean(action.tempo.podeSerInterrompida),
        }
      : null,
    alvosDisponiveis: countAvailableTargets(action, activeEmployees, state.sectors, reportCases),
  }));
}

function buildCalendarSnapshot(state) {
  return {
    dia: state.calendar.totalDiasSimulados,
    mes: state.calendar.mesAtual,
    ano: state.calendar.anoAtual,
  };
}

function buildCompanySnapshot(state) {
  return {
    id: state.company.id,
    nome: state.company.nome,
    arquetipo: state.company.arquetipo,
    segmento: state.company.setorEconomico,
    tamanho: state.company.tamanho,
    indicadoresVisiveis: {
      taxaTurnover: Math.round(state.company.dadosVisiveis?.taxaTurnoverEmpresa || state.company.taxaTurnover || 0),
      rumorGlobal: Math.round(state.company.rumorGlobal || 0),
      caixa: Math.round(state.economy.caixaAtual),
    },
  };
}

function buildInteractables(state) {
  return [
    { id: "mesa_rh", tipo: "mesa_rh", roomId: "rh", label: "Mesa do RH" },
    { id: "quadro_avisos", tipo: "quadro_avisos", roomId: "recepcao", label: "Quadro de avisos" },
    { id: "cafe", tipo: "copa", roomId: "copa", label: "Copa" },
    { id: "banheiro", tipo: "banheiro", roomId: "banheiro", label: "Banheiro" },
    { id: "diretoria", tipo: "diretoria", roomId: "diretoria", label: "Diretoria" },
    ...state.sectors.map((sector) => ({
      id: `observacao_${sector.id}`,
      tipo: "observacao_setor",
      roomId: `room_${sector.id}`,
      sectorId: sector.id,
      label: `Observar ${sector.nome}`,
    })),
  ];
}

function inferVisibleEmployeeState(employee) {
  const perception = employee.percepcaoRH || {};
  if ((employee.demandasPendentes || []).some((demand) => demand.status === "pendente")) return "quer_conversar";
  if ((perception.sobrecargaEstimada || 0) >= 75) return "sobrecarregado_aparente";
  if ((perception.riscoSaidaEstimado || 0) >= 65) return "distante";
  return "trabalhando";
}

function inferAvailability(employee) {
  if (employee.status !== "ativo") return "indisponivel";
  if ((employee.demandasPendentes || []).some((demand) => demand.status === "pendente")) return "procurando_rh";
  return "disponivel";
}

function classifyLevel(value, highIsGood) {
  if (highIsGood) {
    if (value >= 65) return "bom";
    if (value >= 42) return "atencao";
    return "critico";
  }
  if (value >= 70) return "critico";
  if (value >= 45) return "atencao";
  return "baixo";
}

function countAvailableTargets(action, employees, sectors, reportCases) {
  if (action.alvo === "funcionario") return employees.length;
  if (action.alvo === "setor") return sectors.length;
  if (action.alvo === "denuncia") return reportCases.filter((reportCase) => reportCase.status !== "acao_corretiva_aplicada").length;
  if (action.alvo === "funcionario_desligado") return 0;
  return 1;
}

module.exports = {
  buildGameSnapshot,
  buildWorldSnapshot,
  buildPlayerKnowledgeSnapshot,
  buildActionAvailabilitySnapshot,
};
