/**
 * Modulo: sectorGenerator
 * Responsabilidade: gerar setores coerentes com empresa e perfil economico.
 * Entrada: company, rng, idFactory
 * Saida: array de setores
 * Nao deve: gerar funcionarios ou alterar simulacao diaria.
 */

const { clampPercent } = require("../core/clamp");
const { ECONOMIC_PROFILES } = require("../data/economicProfiles");

const SECTOR_TYPES = {
  Operacoes: { carga: [58, 90], especializacao: [45, 78], importancia: [62, 95] },
  Comercial: { carga: [48, 85], especializacao: [35, 68], importancia: [60, 92] },
  Administrativo: { carga: [38, 72], especializacao: [28, 58], importancia: [42, 76] },
  Financeiro: { carga: [42, 76], especializacao: [50, 82], importancia: [55, 86] },
  Atendimento: { carga: [50, 88], especializacao: [30, 60], importancia: [52, 84] },
  "Produto/Servico": { carga: [48, 84], especializacao: [58, 90], importancia: [62, 96] },
  "Recursos Humanos": { carga: [42, 82], especializacao: [36, 68], importancia: [42, 78] },
};

function generateSectors(company, rng, idFactory) {
  const profile = ECONOMIC_PROFILES.find((item) => item.id === company.economicProfileId);
  const sectorNames = [...profile.setoresEssenciais];

  if (company.tamanho !== "pequena" && !sectorNames.includes("Produto/Servico")) {
    sectorNames.push("Produto/Servico");
  }

  return sectorNames.map((name) => {
    const type = SECTOR_TYPES[name];
    const workload = clampPercent(
      rng.int(type.carga[0], type.carga[1]) + Math.round((company.pressaoPorResultado - 55) * 0.25)
    );
    const climate = clampPercent(
      rng.int(38, 76) +
        Math.round((company.culturaCuidado - 50) * 0.25) -
        Math.round((workload - 55) * 0.2)
    );
    const inclusionClimate = clampPercent(climate * 0.5 + company.culturaCuidado * 0.3 + company.justicaOrganizacionalMedia * 0.2 + rng.int(-10, 10));
    const psychologicalSafety = clampPercent(
      inclusionClimate * 0.45 +
        (company.compliance ? company.compliance.segurancaPsicologica : company.culturaCuidado) * 0.35 -
        Math.max(0, workload - 65) * 0.25 +
        rng.int(-8, 10)
    );
    const powerDistance = clampPercent(company.nivelBurocracia * 0.35 + company.pressaoPorResultado * 0.25 + rng.int(12, 42));

    return {
      id: idFactory.nextId("sector"),
      nome: name,
      tipo: name,
      importanciaEstrategica: clampPercent(rng.int(type.importancia[0], type.importancia[1])),
      cargaTrabalho: workload,
      nivelEspecializacao: clampPercent(rng.int(type.especializacao[0], type.especializacao[1])),
      climaSetor: climate,
      liderancaFormalId: null,
      funcionariosIds: [],
      eventosIds: [],
      rumorLocal: clampPercent(rng.int(4, 22) + Math.round((100 - climate) * 0.12)),
      inclusionClimate,
      psychologicalSafety,
      powerDistance,
      complianceVisibility: clampPercent((company.compliance ? company.compliance.maturidadeCompliance : company.capacidadeRH) * 0.45 + psychologicalSafety * 0.25 + rng.int(-8, 12)),
      reportFear: clampPercent((100 - psychologicalSafety) * 0.45 + powerDistance * 0.25 + (company.compliance ? company.compliance.historicoRetaliacao : 40) * 0.25),
      turnoverAcumulado: 0,
      taxaTurnover: 0,
      dadosVisiveis: {},
      alertasSetor: [],
    };
  });
}

module.exports = {
  generateSectors,
};
