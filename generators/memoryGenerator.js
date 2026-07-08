/**
 * Modulo: memoryGenerator
 * Responsabilidade: gerar eventos organizacionais iniciais e suas interpretacoes individuais.
 * Entrada: company, sectors, employees, relationships, rng, idFactory
 * Saida: lista de eventos organizacionais iniciais
 * Nao deve: tratar a empresa como entidade com memoria psicologica.
 */

const { clampPercent } = require("../core/clamp");
const { createOrganizationEvent } = require("../simulation/eventLog");
const { generateMemoriesFromEvent } = require("../simulation/memoryInterpretation");

function generateMemories(company, sectors, employees, relationships, rng, idFactory) {
  const bootstrapState = {
    idFactory,
    calendar: { totalDiasSimulados: 0 },
    company,
    sectors,
    employees,
    relationships,
    organizationEvents: [],
  };

  const employeesBySectorId = new Map();
  employees.forEach((employee) => {
    if (!employeesBySectorId.has(employee.setorId)) employeesBySectorId.set(employee.setorId, []);
    employeesBySectorId.get(employee.setorId).push(employee);
  });

  sectors.forEach((sector) => {
    if (sector.cargaTrabalho > 70) {
      const involved = pickSectorEmployees(employeesBySectorId, sector.id, rng);
      const event = createOrganizationEvent(bootstrapState, {
        tipo: "sobrecarga_setorial",
        descricao: `Sobrecarga percebida em ${sector.nome}`,
        setorId: sector.id,
        funcionariosEnvolvidos: involved,
        severidade: sector.cargaTrabalho,
        origem: "geracao_inicial",
        dados: { sobrecarga: 4, satisfacao: -2 },
        visivelParaRH: sector.climaSetor < 45,
        tags: ["sobrecarga", "setor"],
      });
      generateMemoriesFromEvent(bootstrapState, event, {
        rolesByEmployeeId: Object.fromEntries(involved.map((employeeId) => [employeeId, "afetado_direto"])),
      });
    }

    if (sector.climaSetor < 45) {
      const involved = pickSectorEmployees(employeesBySectorId, sector.id, rng);
      const event = createOrganizationEvent(bootstrapState, {
        tipo: "clima_fragil",
        descricao: `Clima fragil em ${sector.nome}`,
        setorId: sector.id,
        funcionariosEnvolvidos: involved,
        severidade: 100 - sector.climaSetor,
        origem: "geracao_inicial",
        dados: { confianca: -3 },
        visivelParaRH: true,
        tags: ["clima", "setor"],
      });
      generateMemoriesFromEvent(bootstrapState, event);
    }
  });

  employees
    .filter((employee) => employee.acumuloDeFuncao > 65 || employee.desvioDeFuncao > 55)
    .slice(0, 5)
    .forEach((employee) => {
      const event = createOrganizationEvent(bootstrapState, {
        tipo: "acumulo_de_funcao",
        descricao: `${employee.nome} assumiu tarefas alem do cargo formal`,
        setorId: employee.setorId,
        funcionariosEnvolvidos: [employee.id],
        severidade: Math.max(employee.acumuloDeFuncao, employee.desvioDeFuncao),
        origem: "geracao_inicial",
        dados: { sobrecarga: 5, riscoDeSaida: 4 },
        visivelParaRH: employee.acumuloDeFuncao > 75,
        tags: ["acumulo", "cargo"],
      });
      generateMemoriesFromEvent(bootstrapState, event, {
        rolesByEmployeeId: { [employee.id]: "afetado_direto" },
        memoryTargets: [employee.id],
      });
    });

  relationships
    .filter((relationship) => relationship.conflito > 64)
    .slice(0, 4)
    .forEach((relationship) => {
      const event = createOrganizationEvent(bootstrapState, {
        tipo: "conflito_entrega",
        descricao: "Atrito recorrente em entregas compartilhadas",
        funcionariosEnvolvidos: [relationship.fromEmployeeId, relationship.toEmployeeId],
        severidade: relationship.conflito,
        origem: "geracao_inicial",
        dados: { conflito: 5, confianca: -4 },
        visivelParaRH: relationship.visivelParaRH,
        tags: ["relacao", "conflito"],
      });
      generateMemoriesFromEvent(bootstrapState, event, {
        rolesByEmployeeId: {
          [relationship.fromEmployeeId]: "afetado_direto",
          [relationship.toEmployeeId]: "afetado_direto",
        },
      });
    });

  if (company.estabilidadeFinanceira < 45) {
    const involved = employees
      .slice()
      .sort((left, right) => right.medo - left.medo)
      .slice(0, 2)
      .map((employee) => employee.id);
    const event = createOrganizationEvent(bootstrapState, {
      tipo: "boato_financeiro",
      descricao: "Boatos sobre aperto financeiro circulam entre equipes",
      funcionariosEnvolvidos: involved,
      severidade: clampPercent(100 - company.estabilidadeFinanceira),
      origem: "geracao_inicial",
      dados: { medo: 6, confiancaNaGestao: -3 },
      visivelParaRH: true,
      tags: ["financeiro", "rumor"],
    });
    generateMemoriesFromEvent(bootstrapState, event, {
      rolesByEmployeeId: Object.fromEntries(involved.map((employeeId) => [employeeId, "observador"])),
    });
  }

  return bootstrapState.organizationEvents;
}

function pickSectorEmployees(employeesBySectorId, sectorId, rng) {
  const shuffled = [...(employeesBySectorId.get(sectorId) || [])];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = rng.int(0, index);
    const current = shuffled[index];
    shuffled[index] = shuffled[target];
    shuffled[target] = current;
  }

  return shuffled.slice(0, Math.min(2, shuffled.length)).map((employee) => employee.id);
}

module.exports = {
  generateMemories,
};
