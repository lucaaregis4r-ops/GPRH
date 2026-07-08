/**
 * Modulo: employeeActionsSimulation
 * Responsabilidade: simular microacoes autonomas de funcionarios como agentes.
 * Entrada: state da engine
 * Saida: acoes registradas, memorias e efeitos pequenos no estado
 * Nao deve: criar acoes do jogador/RH, UI jogavel, campanha ou objetivos.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("./eventLog");
const { generateMemoryForEmployee, generateMemoriesFromEvent } = require("./memoryInterpretation");
const { redistributeFunctionsAfterExit } = require("./functionLoadSimulation");

function simulateEmployeeActions(state) {
  const active = state.employees.filter((employee) => employee.status !== "desligado");
  if (!active.length) return [];

  const maxActions = Math.max(1, Math.ceil(active.length / 14));
  const actions = [];
  const shuffled = shuffle(active, state.rng);

  for (const employee of shuffled) {
    if (actions.length >= maxActions) break;
    if (employee.diasDesdeUltimaAcao < 5 && !canReceiveExternalOffer(employee)) continue;

    const actionType = selectActionType(state, employee);
    if (!actionType) continue;

    const action = applyAction(state, employee, actionType);
    if (action) {
      actions.push(action);
      employee.diasDesdeUltimaAcao = 0;
    }
  }

  return actions;
}

function selectActionType(state, employee) {
  const candidates = buildCandidates(state, employee).filter((candidate) => candidate.score > 0);
  if (!candidates.length) return null;

  const selected = state.rng.weightedChoice(candidates, "score");
  const chance = Math.min(72, Math.max(4, selected.score));
  return state.rng.chance(chance) ? selected.tipo : null;
}

function buildCandidates(state, employee) {
  const sector = findSector(state, employee.setorId);
  const positiveRelation = findPositiveRelation(state, employee);
  const strainedRelation = findCloseRelation(state, employee);
  const overloadedPeer = positiveRelation ? getOtherEmployee(state, positiveRelation, employee.id) : null;
  const salaryGap = Math.max(0, 55 - employee.salarioPercebidoMercado);
  const lowTrust = 100 - Math.max(employee.confiancaNaGestao, employee.confiancaNoRH);
  const exhaustion = Math.max(0, employee.sobrecarga - 70);

  return [
    {
      tipo: "trabalhar_normalmente",
      score: employee.riscoDeSaida < 60 && employee.sobrecarga < 72 ? 18 : 0,
    },
    {
      tipo: "reduzir_ritmo",
      score: exhaustion * 0.45 + Math.max(0, 45 - employee.satisfacao) * 0.35,
    },
    {
      tipo: "ajudar_colega",
      score:
        positiveRelation && overloadedPeer && overloadedPeer.sobrecarga > 72
          ? employee.afetividade * 0.2 + positiveRelation.confianca * 0.25
          : 0,
    },
    {
      tipo: "reclamar_com_colega",
      score:
        strainedRelation && employee.satisfacao < 50
          ? Math.max(0, 55 - employee.justicaPercebida) * 0.35 + Math.max(0, 55 - employee.confiancaNoRH) * 0.25
          : 0,
    },
    {
      tipo: "procurar_vaga",
      score:
        !employee.estadoDeBuscaExterna && employee.riscoDeSaida > 68
          ? employee.empregabilidadeExterna * 0.22 + Math.max(0, 52 - employee.satisfacao) * 0.35 + salaryGap * 0.25
          : 0,
    },
    {
      tipo: "pedir_conversa",
      score:
        employee.satisfacao < 58 && employee.confiancaNoRH > 42
          ? Math.max(0, 65 - employee.satisfacao) * 0.28 + employee.confiancaNoRH * 0.12
          : 0,
    },
    {
      tipo: "pedir_aumento_ou_promocao",
      score:
        employee.ambicao > 68 && employee.qualificacao > 62 && salaryGap > 12 && employee.tempoDeEmpresa > 12
          ? employee.ambicao * 0.18 + salaryGap * 0.55 + employee.qualificacao * 0.1
          : 0,
    },
    {
      tipo: "faltar_ou_atrasar",
      score:
        employee.sobrecarga > 78 && employee.satisfacao < 48 && sector.climaSetor < 48
          ? exhaustion * 0.34 + lowTrust * 0.12
          : 0,
    },
    {
      tipo: "espalhar_rumor",
      score:
        employee.medo > 68 && employee.influenciaInformal > 58 && (state.company.rumorGlobal > 45 || sector.rumorLocal > 45)
          ? employee.medo * 0.18 + employee.influenciaInformal * 0.12 + lowTrust * 0.12
          : 0,
    },
    {
      tipo: "apoiar_mudanca_ou_conter_rumor",
      score:
        employee.confiancaNaGestao > 65 && employee.influenciaInformal > 58 && sector.climaSetor > 38
          ? employee.confiancaNaGestao * 0.16 + employee.afetividade * 0.12
          : 0,
    },
    {
      tipo: "receber_proposta_externa",
      score: canReceiveExternalOffer(employee)
        ? employee.empregabilidadeExterna * 0.18 + employee.riscoDeSaida * 0.14
        : 0,
    },
    {
      tipo: "pedir_demissao",
      score:
        employee.riscoDeSaida > 92 &&
        employee.propostaExternaRecebida &&
        employee.satisfacao < 38 &&
        employee.vinculoOrganizacional < 55 &&
        activeSectorEmployeeCount(state, employee.setorId) > 1
          ? employee.riscoDeSaida * 0.18 + Math.max(0, 55 - employee.vinculoOrganizacional) * 0.24
          : 0,
    },
  ];
}

function applyAction(state, employee, tipo) {
  const handlers = {
    trabalhar_normalmente: applyWorkNormally,
    reduzir_ritmo: applySlowDown,
    ajudar_colega: applyHelpCoworker,
    reclamar_com_colega: applyComplainToCoworker,
    procurar_vaga: applySearchJob,
    pedir_conversa: applyAskConversation,
    pedir_aumento_ou_promocao: applyAskRaise,
    faltar_ou_atrasar: applyAbsence,
    espalhar_rumor: applySpreadRumor,
    apoiar_mudanca_ou_conter_rumor: applyContainRumor,
    receber_proposta_externa: applyExternalOffer,
    pedir_demissao: applyResignation,
  };

  return handlers[tipo] ? handlers[tipo](state, employee) : null;
}

function baseAction(state, employee, tipo, severity, visible, description, effects) {
  const action = {
    id: state.idFactory.nextId("employee_action"),
    tipo,
    dia: state.calendar.totalDiasSimulados,
    funcionarioId: employee.id,
    setorId: employee.setorId,
    severidade: clampPercent(severity),
    visivelParaRH: Boolean(visible),
    descricao: description,
    efeitos: effects || {},
    eventoOrganizacionalId: null,
    memoriasGeradas: [],
  };

  employee.eventosRecentes.push(action.id);
  if (employee.eventosRecentes.length > 12) employee.eventosRecentes.shift();

  state.acoesFuncionarios.push(action);
  return action;
}

function attachMemory(state, action, employee, tipo, descricao, effects = {}) {
  const event = createOrganizationEvent(state, {
    tipo,
    descricao,
    setorId: employee.setorId,
    funcionariosEnvolvidos: [employee.id],
    severidade: action.severidade,
    origem: "acao_funcionario",
    dados: effects,
    visivelParaRH: action.visivelParaRH,
    tags: [tipo],
  });

  const memory = generateMemoryForEmployee(state, employee, event, {
    rolesByEmployeeId: { [employee.id]: "afetado_direto" },
    valencia: inferValence(tipo),
    customImpact: {
      impactoInicial: effectsToIndividualImpact(effects),
      impactoResidual: residualFromEffects(effects),
    },
  });

  action.eventoOrganizacionalId = event.id;
  if (memory) action.memoriasGeradas.push(memory.id);
  state.eventosRecentes = state.historicoEventos.slice(-12);
  return event;
}

function applyWorkNormally(state, employee) {
  employee.produtividade = clampPercent(employee.produtividade + 1);
  return baseAction(state, employee, "trabalhar_normalmente", 10, false, `${employee.nome} manteve o ritmo normal`, {
    produtividade: 1,
  });
}

function applySlowDown(state, employee) {
  employee.produtividade = clampPercent(employee.produtividade - 4);
  employee.sobrecarga = clampPercent(employee.sobrecarga - 2);
  const action = baseAction(state, employee, "reduzir_ritmo", employee.sobrecarga, false, `${employee.nome} reduziu o ritmo por cansaco`, {
    produtividade: -4,
    sobrecarga: -2,
  });
  attachMemory(state, action, employee, "cansaco_percebido", `${employee.nome} demonstrou sinais de cansaco`);
  return action;
}

function applyHelpCoworker(state, employee) {
  const relation = findPositiveRelation(state, employee);
  const peer = relation ? getOtherEmployee(state, relation, employee.id) : null;
  if (!peer || peer.status === "desligado") return null;

  employee.sobrecarga = clampPercent(employee.sobrecarga + 3);
  peer.sobrecarga = clampPercent(peer.sobrecarga - 5);
  relation.confianca = clampPercent(relation.confianca + 4);
  relation.afinidade = clampPercent(relation.afinidade + 3);

  const action = baseAction(state, employee, "ajudar_colega", relation.confianca, false, `${employee.nome} ajudou ${peer.nome}`, {
    colegaId: peer.id,
    sobrecargaColega: -5,
  });
  attachMemory(state, action, employee, "apoio_entre_colegas", `${employee.nome} apoiou ${peer.nome}`, { confianca: 4 });
  const event = state.organizationEvents.find((item) => item.id === action.eventoOrganizacionalId);
  if (event) {
    event.funcionariosEnvolvidos = [employee.id, peer.id];
    const peerMemory = generateMemoryForEmployee(state, peer, event, {
      rolesByEmployeeId: { [peer.id]: "beneficiado" },
      valencia: "positiva",
      customImpact: {
        impactoInicial: { satisfacao: 1, vinculoOrganizacional: 2 },
        impactoResidual: { satisfacao: 0.05, vinculoOrganizacional: 0.04 },
      },
    });
    if (peerMemory) action.memoriasGeradas.push(peerMemory.id);
  }
  return action;
}

function applyComplainToCoworker(state, employee) {
  const relation = findCloseRelation(state, employee);
  const peer = relation ? getOtherEmployee(state, relation, employee.id) : null;
  const sector = findSector(state, employee.setorId);
  if (!peer) return null;

  sector.rumorLocal = clampPercent(sector.rumorLocal + 5);
  state.company.rumorGlobal = clampPercent(state.company.rumorGlobal + 2);
  peer.confiancaNaGestao = clampPercent(peer.confiancaNaGestao - 2);

  const action = baseAction(state, employee, "reclamar_com_colega", 60 - employee.justicaPercebida, false, `${employee.nome} reclamou com ${peer.nome}`, {
    colegaId: peer.id,
    rumorLocal: 5,
  });
  attachMemory(state, action, employee, "reclamacao_social", `${employee.nome} compartilhou insatisfacao com colega`, {
    rumorLocal: 5,
  });
  const event = state.organizationEvents.find((item) => item.id === action.eventoOrganizacionalId);
  if (event) {
    event.funcionariosEnvolvidos = [employee.id, peer.id];
    const peerMemory = generateMemoryForEmployee(state, peer, event, {
      rolesByEmployeeId: { [peer.id]: "colega_proximo" },
      customImpact: {
        impactoInicial: { confiancaNaGestao: -1, medo: 1 },
        impactoResidual: { confiancaNaGestao: -0.04, medo: 0.04 },
      },
    });
    if (peerMemory) action.memoriasGeradas.push(peerMemory.id);
  }
  return action;
}

function applySearchJob(state, employee) {
  employee.estadoDeBuscaExterna = true;
  employee.intencaoSaida = clampPercent(employee.intencaoSaida + 6);
  employee.riscoDeSaida = employee.intencaoSaida;
  const action = baseAction(state, employee, "procurar_vaga", employee.riscoDeSaida, false, `${employee.nome} comecou a buscar oportunidade externa`, {
    estadoDeBuscaExterna: true,
  });
  attachMemory(state, action, employee, "busca_externa_iniciada", `${employee.nome} iniciou busca externa`);
  return action;
}

function applyAskConversation(state, employee) {
  addPendingDemand(employee, "conversa");
  const action = baseAction(state, employee, "pedir_conversa", 58, true, `${employee.nome} pediu uma conversa`, {
    demanda: "conversa",
  });
  attachMemory(state, action, employee, "pedido_conversa", `${employee.nome} pediu conversa com a empresa`);
  return action;
}

function applyAskRaise(state, employee) {
  addPendingDemand(employee, "aumento_ou_promocao");
  const action = baseAction(state, employee, "pedir_aumento_ou_promocao", employee.ambicao, true, `${employee.nome} pediu aumento ou promocao`, {
    demanda: "aumento_ou_promocao",
  });
  attachMemory(state, action, employee, "pedido_carreira", `${employee.nome} registrou demanda de carreira`);
  return action;
}

function applyAbsence(state, employee) {
  employee.absenteismo += 1;
  employee.produtividade = clampPercent(employee.produtividade - 6);
  const sectorPeers = state.employees.filter(
    (peer) => peer.status !== "desligado" && peer.setorId === employee.setorId && peer.id !== employee.id
  );
  const peer = state.rng.pick(sectorPeers);
  if (peer) peer.sobrecarga = clampPercent(peer.sobrecarga + 3);

  const action = baseAction(state, employee, "faltar_ou_atrasar", 70, true, `${employee.nome} faltou ou atrasou`, {
    absenteismo: 1,
    produtividade: -6,
  });
  attachMemory(state, action, employee, "ausencia_atraso", `${employee.nome} teve ausencia ou atraso`);
  return action;
}

function applySpreadRumor(state, employee) {
  const sector = findSector(state, employee.setorId);
  sector.rumorLocal = clampPercent(sector.rumorLocal + 8);
  state.company.rumorGlobal = clampPercent(state.company.rumorGlobal + 5);
  closeRelations(state, employee).forEach((relation) => {
    const peer = getOtherEmployee(state, relation, employee.id);
    if (peer && peer.status !== "desligado") {
      peer.medo = clampPercent(peer.medo + 3);
      const event = createOrganizationEvent(state, {
        tipo: "rumor_recebido",
        descricao: `Rumor espalhado por ${employee.nome} chegou a ${peer.nome}`,
        setorId: employee.setorId,
        funcionariosEnvolvidos: [employee.id, peer.id],
        severidade: actionSeverityFromRumor(employee, relation),
        origem: "rede_social",
        dados: { medo: 2, confiancaNaGestao: -1 },
        visivelParaRH: false,
        tags: ["rumor", "medo"],
      });
      generateMemoryForEmployee(state, peer, event, {
        rolesByEmployeeId: { [peer.id]: "colega_proximo" },
        customImpact: {
          impactoInicial: { medo: 2, confiancaNaGestao: -1 },
          impactoResidual: { medo: 0.04 },
        },
      });
    }
  });

  const action = baseAction(state, employee, "espalhar_rumor", employee.influenciaInformal, false, `${employee.nome} espalhou rumor`, {
    rumorGlobal: 5,
    rumorLocal: 8,
  });
  attachMemory(state, action, employee, "rumor_espalhado", `${employee.nome} amplificou um rumor local`);
  return action;
}

function applyContainRumor(state, employee) {
  const sector = findSector(state, employee.setorId);
  sector.rumorLocal = clampPercent(sector.rumorLocal - 7);
  state.company.rumorGlobal = clampPercent(state.company.rumorGlobal - 3);
  closeRelations(state, employee).forEach((relation) => {
    relation.confianca = clampPercent(relation.confianca + 2);
  });

  const action = baseAction(
    state,
    employee,
    "apoiar_mudanca_ou_conter_rumor",
    employee.influenciaInformal,
    false,
    `${employee.nome} ajudou a conter rumor`,
    { rumorGlobal: -3, rumorLocal: -7 }
  );
  attachMemory(state, action, employee, "rumor_contido", `${employee.nome} ajudou colegas a reduzir ansiedade`);
  return action;
}

function applyExternalOffer(state, employee) {
  employee.propostaExternaRecebida = true;
  employee.riscoDeSaida = clampPercent(employee.riscoDeSaida + 12);
  employee.intencaoSaida = employee.riscoDeSaida;
  const action = baseAction(state, employee, "receber_proposta_externa", employee.riscoDeSaida, false, `${employee.nome} recebeu proposta externa`, {
    propostaExternaRecebida: true,
  });
  attachMemory(state, action, employee, "proposta_externa", `${employee.nome} recebeu proposta externa`);
  return action;
}

function applyResignation(state, employee) {
  const sector = findSector(state, employee.setorId);
  const previousPayroll = state.economy.folhaPagamentoMensal;

  employee.status = "desligado";
  employee.dataDesligamento = {
    dia: state.calendar.diaAtual,
    mes: state.calendar.mesAtual,
    ano: state.calendar.anoAtual,
  };
  sector.funcionariosIds = sector.funcionariosIds.filter((employeeId) => employeeId !== employee.id);
  sector.climaSetor = clampPercent(sector.climaSetor - 5);
  sector.turnoverAcumulado = (sector.turnoverAcumulado || 0) + 1;
  state.company.turnoverAcumulado += 1;
  state.company.desligamentosRecentes.push(employee.id);
  if (state.company.desligamentosRecentes.length > 10) state.company.desligamentosRecentes.shift();
  state.economy.folhaPagamentoMensal = Math.max(0, state.economy.folhaPagamentoMensal - employee.salarioMensal);

  const activeRelationsBeforeExit = closeRelations(state, employee);

  state.relationships.forEach((relation) => {
    if (relation.fromEmployeeId === employee.id || relation.toEmployeeId === employee.id) {
      relation.ativa = false;
      relation.historico.push("relacao marcada como historica apos desligamento");
    }
  });

  activeRelationsBeforeExit.forEach((relation) => {
    const peer = getOtherEmployee(state, relation, employee.id);
    if (peer && peer.status !== "desligado") {
      peer.satisfacao = clampPercent(peer.satisfacao - 3);
      peer.medo = clampPercent(peer.medo + 4);
      peer.sobrecarga = clampPercent(peer.sobrecarga + 4);
    }
  });

  const inheritor = chooseTaskInheritor(state, employee);
  if (inheritor) {
    inheritor.sobrecarga = clampPercent(inheritor.sobrecarga + 8);
    inheritor.justicaPercebida = clampPercent(inheritor.justicaPercebida - 4);
    redistributeFunctionsAfterExit(state, employee, inheritor);
  }

  const action = baseAction(state, employee, "pedir_demissao", 95, true, `${employee.nome} pediu demissao`, {
    folhaAntes: previousPayroll,
    folhaDepois: state.economy.folhaPagamentoMensal,
  });
  attachMemory(state, action, employee, "turnover_voluntario", `${employee.nome} saiu da empresa`, {
    folhaPagamentoMensal: state.economy.folhaPagamentoMensal - previousPayroll,
  });
  const resignationEvent = state.organizationEvents.find((item) => item.id === action.eventoOrganizacionalId);
  if (resignationEvent) {
    resignationEvent.tipo = "pedir_demissao";
    resignationEvent.funcionariosEnvolvidos = [employee.id];

    const rolesByEmployeeId = {};
    activeRelationsBeforeExit.forEach((relation) => {
      const peer = getOtherEmployee(state, relation, employee.id);
      if (peer && peer.status !== "desligado") rolesByEmployeeId[peer.id] = "colega_proximo";
    });
    if (inheritor) rolesByEmployeeId[inheritor.id] = "herdou_funcao";
    const leader = state.employees.find((item) => item.id === sector.liderancaFormalId && item.status !== "desligado");
    if (leader) rolesByEmployeeId[leader.id] = "lideranca";
    resignationEvent.funcionariosEnvolvidos = [employee.id, ...Object.keys(rolesByEmployeeId)];
    const memories = generateMemoriesFromEvent(state, resignationEvent, { rolesByEmployeeId });
    memories.forEach((memory) => action.memoriasGeradas.push(memory.id));
  }

  const leader = state.employees.find((item) => item.id === sector.liderancaFormalId && item.status !== "desligado");
  return action;
}

function inferValence(tipo) {
  if (["apoio_entre_colegas", "rumor_contido"].includes(tipo)) return "positiva";
  if (["pedido_conversa", "pedido_carreira"].includes(tipo)) return "ambivalente";
  return "negativa";
}

function effectsToIndividualImpact(effects) {
  const impact = {};
  if (effects.produtividade) impact.produtividade = effects.produtividade;
  if (effects.absenteismo) impact.satisfacao = -1;
  if (effects.estadoDeBuscaExterna) impact.intencaoSaida = 2;
  if (effects.propostaExternaRecebida) impact.intencaoSaida = 4;
  if (effects.demanda) impact.confiancaNoRH = 1;
  if (effects.rumorGlobal || effects.rumorLocal) impact.medo = Math.sign((effects.rumorGlobal || 0) + (effects.rumorLocal || 0));
  return impact;
}

function residualFromEffects(effects) {
  const residual = {};
  if (effects.estadoDeBuscaExterna) residual.intencaoSaida = 0.05;
  if (effects.propostaExternaRecebida) residual.intencaoSaida = 0.08;
  if (effects.rumorGlobal || effects.rumorLocal) residual.medo = 0.04;
  if (effects.absenteismo) residual.satisfacao = -0.03;
  return residual;
}

function actionSeverityFromRumor(employee, relation) {
  return clampPercent((employee.influenciaInformal + relation.proximidadeTrabalho) / 2);
}

function chooseTaskInheritor(state, employee) {
  return state.employees
    .filter((candidate) => candidate.status !== "desligado" && candidate.setorId === employee.setorId)
    .sort((left, right) => right.qualificacao + right.especializacao - (left.qualificacao + left.especializacao))[0];
}

function addPendingDemand(employee, tipo) {
  if (!employee.demandasPendentes.some((demand) => demand.tipo === tipo)) {
    employee.demandasPendentes.push({
      tipo,
      status: "pendente",
    });
  }
}

function canReceiveExternalOffer(employee) {
  return employee.estadoDeBuscaExterna && !employee.propostaExternaRecebida && employee.riscoDeSaida > 72;
}

function activeSectorEmployeeCount(state, sectorId) {
  return state.employees.filter((employee) => employee.status !== "desligado" && employee.setorId === sectorId).length;
}

function findSector(state, sectorId) {
  return state.sectors.find((sector) => sector.id === sectorId);
}

function findPositiveRelation(state, employee) {
  return closeRelations(state, employee)
    .filter((relation) => relation.confianca > 58 && relation.conflito < 55)
    .sort((left, right) => right.confianca - left.confianca)[0];
}

function findCloseRelation(state, employee) {
  return closeRelations(state, employee).sort((left, right) => right.proximidadeTrabalho - left.proximidadeTrabalho)[0];
}

function closeRelations(state, employee) {
  return state.relationships.filter(
    (relation) =>
      relation.ativa !== false && (relation.fromEmployeeId === employee.id || relation.toEmployeeId === employee.id)
  );
}

function getOtherEmployee(state, relation, employeeId) {
  const otherId = relation.fromEmployeeId === employeeId ? relation.toEmployeeId : relation.fromEmployeeId;
  return state.employees.find((employee) => employee.id === otherId);
}

function shuffle(items, rng) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = rng.int(0, index);
    const current = shuffled[index];
    shuffled[index] = shuffled[target];
    shuffled[target] = current;
  }
  return shuffled;
}

module.exports = {
  simulateEmployeeActions,
};
