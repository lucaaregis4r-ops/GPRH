/**
 * Modulo: relationGenerator
 * Responsabilidade: gerar relacoes simples entre funcionarios.
 * Entrada: employees, sectors, company, rng, idFactory
 * Saida: array de relacoes
 * Nao deve: gerar memoria textual final ou alterar financeiro.
 */

const { clampPercent } = require("../core/clamp");

function generateRelationships(employees, sectors, company, rng, idFactory) {
  const relationships = [];
  const sectorById = new Map(sectors.map((sector) => [sector.id, sector]));

  for (let leftIndex = 0; leftIndex < employees.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < employees.length; rightIndex += 1) {
      const left = employees[leftIndex];
      const right = employees[rightIndex];
      const sameSector = left.setorId === right.setorId;
      const sector = sectorById.get(left.setorId);
      const baseChance = sameSector ? 72 : 12;
      const specializedPull = Math.max(left.especializacao, right.especializacao) > 72 ? 10 : 0;

      if (!rng.chance(baseChance + specializedPull)) continue;

      const proximity = clampPercent((sameSector ? 62 : 20) + rng.int(0, 30));
      const technicalDependency = clampPercent(
        Math.abs(left.especializacao - right.especializacao) * 0.5 +
          (sameSector ? sector.nivelEspecializacao * 0.25 : 0) +
          rng.int(0, 18)
      );
      const affinity = clampPercent((left.afetividade + right.afetividade) / 2 + rng.int(-22, 22));
      const trust = clampPercent(
        affinity * 0.45 + company.maturidadeGestao * 0.25 + proximity * 0.15 - technicalDependency * 0.1
      );
      const conflict = clampPercent(
        (left.sobrecarga + right.sobrecarga) * 0.28 +
          company.culturaCompetitiva * 0.2 -
          affinity * 0.25 +
          rng.int(-10, 18)
      );

      const relationship = {
        id: idFactory.nextId("relation"),
        fromEmployeeId: left.id,
        toEmployeeId: right.id,
        proximidadeTrabalho: proximity,
        afinidade: affinity,
        confianca: trust,
        conflito: conflict,
        dependenciaTecnica: technicalDependency,
        historico: [],
        ativa: true,
        visivelParaRH: rng.chance(35),
      };

      relationships.push(relationship);
      left.relacoesIds.push(relationship.id);
      right.relacoesIds.push(relationship.id);
    }
  }

  return relationships;
}

module.exports = {
  generateRelationships,
};
