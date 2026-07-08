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
  const visibleEmployeeIds = new Set(state.employees.filter((employee) => employee.status !== "desligado").map((employee) => employee.id));
  const officeMap = generateOfficeMap(state);

  return {
    seed: state.seed,
    companyId: state.company.id,
    officeMap,
    rooms: [
      { id: "recepcao", tipo: "recepcao", nome: "Recepcao" },
      { id: "rh", tipo: "rh", nome: "Sala do RH" },
      { id: "reuniao", tipo: "reuniao", nome: "Sala de reuniao" },
      { id: "copa", tipo: "copa", nome: "Copa" },
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
    })),
    npcs: state.employees
      .filter((employee) => employee.status !== "desligado")
      .map((employee) => ({
        employeeId: employee.id,
        nome: employee.nome,
        setorId: employee.setorId,
        cargo: employee.cargoFormal ? employee.cargoFormal.nome : "Funcionario",
        estadoVisivel: inferVisibleEmployeeState(employee),
        disponibilidade: inferAvailability(employee),
        sinaisVisiveis: (employee.percepcaoRH?.sinaisRecentes || []).slice(-3),
      })),
    interactables: buildInteractables(state),
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
        cargo: employee.cargoFormal ? employee.cargoFormal.nome : "Funcionario",
        percepcaoRH: {
          riscoSaidaEstimado: Math.round(employee.percepcaoRH?.riscoSaidaEstimado || 0),
          sobrecargaEstimada: Math.round(employee.percepcaoRH?.sobrecargaEstimada || 0),
          engajamentoEstimado: Math.round(employee.percepcaoRH?.engajamentoEstimado || 0),
          confiabilidadeGeral: Math.round(employee.percepcaoRH?.confiabilidadeGeral || 0),
        },
        demandasPendentes: (employee.demandasPendentes || [])
          .filter((demand) => demand.status === "pendente")
          .map((demand) => ({
            tipo: demand.tipo,
            diasEmAberto: demand.diasEmAberto || 0,
            prazoRespostaDias: demand.prazoRespostaDias || null,
          })),
      })),
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
    preparoMinimoDias: action.preparoMinimoDias,
    preparoIdealDias: action.preparoIdealDias,
    permiteImproviso: action.permiteImproviso,
    requerAprovacaoDiretoria: Boolean(action.requerAprovacaoDiretoria),
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
