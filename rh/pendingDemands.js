/**
 * Modulo: pendingDemands
 * Responsabilidade: normalizar, envelhecer e resolver demandas pendentes de funcionarios.
 * Entrada: state e funcionarios
 * Saida: demandas atualizadas, eventos e memorias quando o RH demora ou responde
 * Nao deve: escolher acoes do RH nem renderizar UI.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("../simulation/eventLog");
const { generateMemoryForEmployee } = require("../simulation/memoryInterpretation");

const DEFAULT_DEADLINES = {
  conversa: 5,
  aumento_ou_promocao: 14,
};

function initializePendingDemand(state, employee, demand) {
  if (!demand.id) demand.id = state.idFactory.nextId("pending_demand");
  if (typeof demand.diaCriacao !== "number") demand.diaCriacao = state.calendar.totalDiasSimulados;
  if (typeof demand.diasEmAberto !== "number") demand.diasEmAberto = Math.max(0, state.calendar.totalDiasSimulados - demand.diaCriacao);
  if (typeof demand.prazoRespostaDias !== "number") demand.prazoRespostaDias = DEFAULT_DEADLINES[demand.tipo] || 10;
  if (!demand.status) demand.status = "pendente";
  if (!demand.origemFuncionarioId) demand.origemFuncionarioId = employee.id;
  if (!demand.urgencia) demand.urgencia = calculateDemandUrgency(employee, demand.tipo);
  return demand;
}

function simulatePendingDemandsOneDay(state) {
  const events = [];
  state.employees
    .filter((employee) => employee.status !== "desligado")
    .forEach((employee) => {
      (employee.demandasPendentes || []).forEach((demand) => {
        initializePendingDemand(state, employee, demand);
        if (demand.status !== "pendente") return;

        demand.diasEmAberto += 1;
        const overdueDays = demand.diasEmAberto - demand.prazoRespostaDias;
        if (overdueDays <= 0) return;

        employee.confiancaNoRH = clampPercent(employee.confiancaNoRH - 0.18);
        employee.satisfacao = clampPercent(employee.satisfacao - 0.08);
        employee.intencaoSaida = clampPercent(employee.intencaoSaida + 0.08);
        employee.riscoDeSaida = employee.intencaoSaida;

        if (!demand.atrasoRegistrado) {
          demand.atrasoRegistrado = true;
          events.push(registerDemandDelay(state, employee, demand));
        }
      });
    });
  return events;
}

function resolvePendingDemand(state, employee, type, rhAction, resolution = {}) {
  const demand = (employee.demandasPendentes || [])
    .map((item) => initializePendingDemand(state, employee, item))
    .filter((item) => item.tipo === type && item.status === "pendente")
    .sort((left, right) => left.diaCriacao - right.diaCriacao)[0];

  if (!demand) return null;

  demand.status = resolution.status || "respondida";
  demand.diaResolucao = state.calendar.totalDiasSimulados;
  demand.acaoRHId = rhAction ? rhAction.id : null;
  demand.qualidadeResposta = clampPercent(resolution.qualidadeResposta ?? 55);

  const event = createOrganizationEvent(state, {
    tipo: `demanda_${demand.tipo}_${demand.status}`,
    descricao: resolution.descricao || `${employee.nome} recebeu resposta para demanda de ${demand.tipo}`,
    setorId: employee.setorId,
    funcionariosEnvolvidos: [employee.id],
    severidade: demand.status === "negada" ? 58 : 42,
    origem: "demanda_rh",
    dados: { demandId: demand.id, rhActionId: rhAction ? rhAction.id : null, qualidadeResposta: demand.qualidadeResposta },
    visivelParaRH: true,
    tags: ["rh", "demanda", demand.tipo, demand.status],
  });

  const positive = demand.status !== "negada" && demand.qualidadeResposta >= 50;
  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: positive ? "beneficiado" : "prejudicado" },
    valencia: positive ? "positiva" : "negativa",
    customImpact: {
      impactoInicial: positive
        ? { confiancaNoRH: 2, satisfacao: 1, intencaoSaida: -1 }
        : { confiancaNoRH: -3, satisfacao: -2, intencaoSaida: 2 },
      impactoResidual: positive ? { confiancaNoRH: 0.03 } : { confiancaNoRH: -0.04, intencaoSaida: 0.04 },
    },
  });

  return { demand, event };
}

function registerDemandDelay(state, employee, demand) {
  const event = createOrganizationEvent(state, {
    tipo: "demanda_rh_atrasada",
    descricao: `${employee.nome} ficou sem resposta do RH por tempo demais`,
    setorId: employee.setorId,
    funcionariosEnvolvidos: [employee.id],
    severidade: clampPercent(45 + demand.urgencia * 0.35),
    origem: "demanda_rh",
    dados: { demandId: demand.id, tipoDemanda: demand.tipo, diasEmAberto: demand.diasEmAberto },
    visivelParaRH: true,
    tags: ["rh", "demanda", "atraso", demand.tipo],
  });

  generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: "prejudicado" },
    valencia: "negativa",
    customImpact: {
      impactoInicial: { confiancaNoRH: -3, satisfacao: -2, intencaoSaida: 2 },
      impactoResidual: { confiancaNoRH: -0.05, intencaoSaida: 0.04 },
    },
  });

  return event;
}

function calculateDemandUrgency(employee, type) {
  if (type === "aumento_ou_promocao") {
    return clampPercent(employee.ambicao * 0.35 + Math.max(0, 55 - employee.salarioPercebidoMercado) * 0.55 + employee.riscoDeSaida * 0.15);
  }
  return clampPercent((100 - employee.satisfacao) * 0.35 + employee.sobrecarga * 0.3 + employee.riscoDeSaida * 0.25);
}

module.exports = {
  initializePendingDemand,
  simulatePendingDemandsOneDay,
  resolvePendingDemand,
};
