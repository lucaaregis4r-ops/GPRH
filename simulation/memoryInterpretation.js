/**
 * Modulo: memoryInterpretation
 * Responsabilidade: interpretar eventos organizacionais como memorias individuais.
 * Entrada: state, evento organizacional e contexto opcional
 * Saida: memorias individuais em employee.memorias
 * Nao deve: registrar fatos objetivos no log organizacional.
 */

const { clampPercent } = require("../core/clamp");

function generateMemoriesFromEvent(state, organizationEvent, context = {}) {
  const employees = selectEmployeesForEvent(state, organizationEvent, context);
  return employees
    .map((employee) => generateMemoryForEmployee(state, employee, organizationEvent, context))
    .filter(Boolean);
}

function generateMemoryForEmployee(state, employee, organizationEvent, context = {}) {
  if (!employee || (employee.status === "desligado" && context.allowInactive !== true)) return null;

  const role = determineRole(state, employee, organizationEvent, context);
  const proximity = determineProximity(state, employee, organizationEvent, role);
  if (proximity <= 0 && role === "observador") return null;

  const template = buildMemoryTemplate(employee, organizationEvent, role, proximity, context);
  if (context.customImpact) {
    template.impactoInicial = context.customImpact.impactoInicial || template.impactoInicial;
    template.impactoResidual = context.customImpact.impactoResidual || template.impactoResidual;
  }
  const memory = {
    id: state.idFactory.nextId("employee_memory"),
    funcionarioId: employee.id,
    origemEventoId: organizationEvent.id,
    dia: organizationEvent.dia,
    tipo: template.tipo,
    descricao: template.descricao,
    intensidade: clampPercent(template.intensidade),
    valencia: template.valencia,
    tags: template.tags,
    funcionariosEnvolvidos: organizationEvent.funcionariosEnvolvidos || [],
    proximidadeComEvento: clampPercent(proximity),
    papelNoEvento: role,
    impactoInicial: template.impactoInicial,
    impactoResidual: template.impactoResidual,
    decaimento: template.decaimento,
    resolvida: false,
    visivelParaRH: template.visivelParaRH,
  };

  employee.memorias.push(memory);
  applyInitialMemoryImpact(employee, memory);
  return memory;
}

function applyInitialMemoryImpact(employee, memory) {
  Object.entries(memory.impactoInicial || {}).forEach(([field, delta]) => {
    if (typeof employee[field] === "number") {
      employee[field] = clampPercent(employee[field] + delta);
    }
  });

  if (typeof employee.intencaoSaida === "number") {
    employee.riscoDeSaida = employee.intencaoSaida;
  }
}

function applyResidualMemoryEffects(employee) {
  if (!Array.isArray(employee.memorias)) return;

  employee.memorias.forEach((memory) => {
    if (memory.resolvida || !memory.impactoResidual) return;

    Object.entries(memory.impactoResidual).forEach(([field, value]) => {
      if (typeof employee[field] === "number") {
        const scaled = value * (memory.intensidade / 100) * (memory.proximidadeComEvento / 100);
        employee[field] = clampPercent(employee[field] + scaled);
      }
    });

    memory.intensidade = clampPercent(memory.intensidade * memory.decaimento);
    if (memory.intensidade < 8) memory.resolvida = true;
  });
}

function selectEmployeesForEvent(state, event, context) {
  if (Array.isArray(context.memoryTargets) && context.memoryTargets.length) {
    return context.memoryTargets
      .map((employeeId) => state.employees.find((employee) => employee.id === employeeId))
      .filter(Boolean);
  }

  const involved = new Set(event.funcionariosEnvolvidos || []);
  const sameSector = state.employees.filter(
    (employee) => employee.status !== "desligado" && event.setorId && employee.setorId === event.setorId
  );
  const directlyInvolved = state.employees.filter((employee) => involved.has(employee.id));
  return uniqueEmployees([...directlyInvolved, ...sameSector.slice(0, 4)]);
}

function determineRole(state, employee, event, context) {
  if (context.rolesByEmployeeId && context.rolesByEmployeeId[employee.id]) return context.rolesByEmployeeId[employee.id];
  if ((event.funcionariosEnvolvidos || []).includes(employee.id)) return "afetado_direto";
  if (context.inheritorId === employee.id) return "herdou_funcao";
  const sector = state.sectors.find((item) => item.id === event.setorId);
  if (sector && sector.liderancaFormalId === employee.id) return "lideranca";
  if (event.setorId && employee.setorId === event.setorId) return "colega_distante";
  return "observador";
}

function determineProximity(state, employee, event, role) {
  if (role === "afetado_direto" || role === "beneficiado" || role === "prejudicado" || role === "herdou_funcao") return 100;
  if (role === "lideranca") return 85;

  const involved = event.funcionariosEnvolvidos || [];
  const relation = state.relationships
    .filter((item) => item.ativa !== false)
    .filter((item) => involved.includes(item.fromEmployeeId) || involved.includes(item.toEmployeeId))
    .filter((item) => item.fromEmployeeId === employee.id || item.toEmployeeId === employee.id)
    .sort((left, right) => right.proximidadeTrabalho - left.proximidadeTrabalho)[0];

  if (relation) return relation.proximidadeTrabalho;
  if (event.setorId && employee.setorId === event.setorId) return 45;
  return 12;
}

function buildMemoryTemplate(employee, event, role, proximity, context) {
  const base = {
    tipo: event.tipo,
    descricao: event.descricao,
    intensidade: event.severidade,
    valencia: context.valencia || defaultValence(event.tipo),
    tags: event.tags || [],
    impactoInicial: {},
    impactoResidual: {},
    decaimento: 0.96,
    visivelParaRH: event.visivelParaRH && role === "afetado_direto",
  };

  if (event.tipo === "pedir_demissao" || event.tipo === "turnover_voluntario") {
    if (role === "colega_proximo") {
      return {
        ...base,
        descricao: `${event.descricao} Isso afetou alguem proximo.`,
        impactoInicial: { medo: 4, satisfacao: -3, intencaoSaida: 3 },
        impactoResidual: { medo: 0.08, satisfacao: -0.05, intencaoSaida: 0.05 },
      };
    }
    if (role === "herdou_funcao") {
      return {
        ...base,
        descricao: `Depois desse evento, assumi parte das tarefas.`,
        intensidade: Math.max(base.intensidade, 78),
        impactoInicial: { sobrecarga: 6, justicaPercebida: -3, intencaoSaida: 3 },
        impactoResidual: { sobrecarga: 0.1, justicaPercebida: -0.05, intencaoSaida: 0.05 },
        visivelParaRH: true,
      };
    }
    if (role === "lideranca") {
      return {
        ...base,
        descricao: `Esse evento criou risco operacional no setor.`,
        impactoInicial: { medo: 2, sobrecarga: 3 },
        impactoResidual: { sobrecarga: 0.06 },
        visivelParaRH: true,
      };
    }
  }

  if (event.tipo.includes("rumor")) {
    return {
      ...base,
      impactoInicial: { medo: proximity > 50 ? 2 : 1, confiancaNaGestao: proximity > 50 ? -1 : 0 },
      impactoResidual: { medo: 0.04 },
    };
  }

  if (event.tipo.includes("apoio")) {
    return {
      ...base,
      valencia: "positiva",
      impactoInicial: { satisfacao: 1, vinculoOrganizacional: 2 },
      impactoResidual: { satisfacao: 0.05, vinculoOrganizacional: 0.04 },
    };
  }

  return base;
}

function defaultValence(type) {
  if (type.includes("apoio") || type.includes("rumor_contido")) return "positiva";
  if (type.includes("pedido")) return "ambivalente";
  return "negativa";
}

function uniqueEmployees(employees) {
  const seen = new Set();
  return employees.filter((employee) => {
    if (!employee || seen.has(employee.id)) return false;
    seen.add(employee.id);
    return true;
  });
}

module.exports = {
  generateMemoriesFromEvent,
  generateMemoryForEmployee,
  applyInitialMemoryImpact,
  applyResidualMemoryEffects,
};
