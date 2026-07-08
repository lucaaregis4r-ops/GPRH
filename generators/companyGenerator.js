/**
 * Modulo: companyGenerator
 * Responsabilidade: gerar a empresa inicial a partir de seed, perfil e tamanho.
 * Entrada: seed, rng, idFactory, config opcional
 * Saida: objeto company sem setores ou funcionarios preenchidos
 * Nao deve: renderizar UI, avancar tempo ou gerar funcionarios.
 */

const { clampPercent } = require("../core/clamp");
const { ECONOMIC_PROFILES, COMPANY_SIZES } = require("../data/economicProfiles");

const PREFIXES = ["Nova", "Ponte", "Viva", "Norte", "Claro", "Atlas", "Rota", "Prisma"];
const SUFFIXES = ["Servicos", "Solucoes", "Operacoes", "Gestao", "Atendimento", "Projetos"];
const ARCHETYPES = [
  "crescimento_desorganizado",
  "operacao_sob_pressao",
  "gestao_em_transicao",
  "empresa_estavel_burocratica",
  "cultura_competitiva",
];

function generateCompany(seed, rng, idFactory, config = {}) {
  const economicProfile = config.economicProfile || rng.pick(ECONOMIC_PROFILES);
  const size = config.size || rng.weightedChoice(COMPANY_SIZES);
  const maturity = clampPercent(rng.int(28, 82));
  const resultPressure = clampPercent(rng.int(38, 88));
  const careCulture = clampPercent(rng.int(25, 78) + Math.round((maturity - resultPressure) * 0.15));
  const competitiveCulture = clampPercent(rng.int(28, 85) + Math.round((resultPressure - careCulture) * 0.2));
  const bureaucracy = clampPercent(rng.int(22, 72) + (size.id === "grande_local" ? 10 : 0));
  const financialStability = clampPercent(rng.int(32, 82) + Math.round((maturity - resultPressure) * 0.1));
  const complianceMaturity = clampPercent(maturity * 0.45 + careCulture * 0.25 + rng.int(-12, 18));
  const anonymity = clampPercent(complianceMaturity + rng.int(-18, 18));
  const retaliationProtection = clampPercent(complianceMaturity + careCulture * 0.15 - competitiveCulture * 0.12 + rng.int(-12, 14));
  const channelTrust = clampPercent(complianceMaturity * 0.55 + retaliationProtection * 0.25 + anonymity * 0.2 + rng.int(-10, 10));

  return {
    id: idFactory.nextId("company"),
    seed,
    nome: `${rng.pick(PREFIXES)} ${rng.pick(SUFFIXES)}`,
    arquetipo: config.arquetipo || rng.pick(ARCHETYPES),
    setorEconomico: economicProfile.nome,
    economicProfileId: economicProfile.id,
    tamanho: size.id,
    employeeTarget: rng.int(size.employeeRange[0], size.employeeRange[1]),
    cashMonthsRange: size.cashMonths,
    maturidadeGestao: maturity,
    pressaoPorResultado: resultPressure,
    estabilidadeFinanceira: financialStability,
    riscoCrise: clampPercent(rng.int(economicProfile.riscoCriseBase[0], economicProfile.riscoCriseBase[1])),
    culturaCuidado: careCulture,
    culturaCompetitiva: competitiveCulture,
    nivelBurocracia: bureaucracy,
    rotatividadeBase: clampPercent(rng.int(20, 65) + Math.round((resultPressure - maturity) * 0.2)),
    capacidadeRH: clampPercent(rng.int(25, 72) + Math.round((maturity - bureaucracy) * 0.12)),
    rumorGlobal: clampPercent(rng.int(5, 24) + Math.round((100 - financialStability) * 0.08)),
    justicaOrganizacionalMedia: clampPercent(maturity * 0.45 + careCulture * 0.35 + rng.int(-8, 8)),
    suporteOrganizacionalMedio: clampPercent(careCulture * 0.55 + maturity * 0.25 + rng.int(-8, 8)),
    compliance: {
      maturidadeCompliance: complianceMaturity,
      canalDenunciaExiste: complianceMaturity > 32 || rng.chance(72),
      anonimatoPercebido: anonymity,
      protecaoContraRetaliacao: retaliationProtection,
      tempoRespostaMedio: clampPercent(100 - complianceMaturity + rng.int(-8, 14)),
      confiancaNoCanal: channelTrust,
      treinamentoEtica: clampPercent(complianceMaturity + rng.int(-15, 15)),
      politicaAntiAssedio: clampPercent(complianceMaturity + rng.int(-10, 16)),
      politicaAntidiscriminacao: clampPercent(complianceMaturity + rng.int(-10, 16)),
      segurancaPsicologica: clampPercent(careCulture * 0.45 + maturity * 0.25 + retaliationProtection * 0.3),
      historicoRetaliacao: clampPercent(100 - retaliationProtection + competitiveCulture * 0.15 + rng.int(-8, 8)),
      toleranciaLiderancaAbusiva: clampPercent(competitiveCulture * 0.45 + resultPressure * 0.25 + (100 - maturity) * 0.25),
      riscoSubnotificacao: clampPercent(100 - channelTrust + (100 - anonymity) * 0.25 + (100 - retaliationProtection) * 0.3),
    },
    turnoverAcumulado: 0,
    desligamentosRecentes: [],
    setores: [],
    funcionarios: [],
    relacoes: [],
    eventos: [],
    dadosVisiveis: {},
    dadosOcultos: {
      fragilidadeGestao: clampPercent(100 - maturity + rng.int(-8, 8)),
      riscoDependenciaIndividual: 0,
    },
  };
}

module.exports = {
  generateCompany,
};
