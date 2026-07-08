/**
 * Modulo: seedCompanyIndex
 * Responsabilidade: listar seeds e empresas geradas para inspecao rapida.
 * Entrada: quantidade, prefixo e opcao --json via linha de comando
 * Saida: tabela no console e JSON opcional em src/debug/output
 * Nao deve: avancar simulacao, criar UI jogavel ou alterar documentos de visao.
 */

const fs = require("fs");
const path = require("path");
const { createProceduralRHSimulation } = require("../simulation/simulationEngine");
const { average, collectCoherenceAlerts, collectRangeAlerts } = require("../tests/testUtils");

const DEFAULT_COUNT = 20;
const DEFAULT_PREFIX = "RH-SEED";

function buildSeedCompanyIndex(count = DEFAULT_COUNT, prefix = DEFAULT_PREFIX, options = {}) {
  const rows = [];

  for (let index = 1; index <= count; index += 1) {
    const seed = `${prefix}-${String(index).padStart(3, "0")}`;
    const state = createProceduralRHSimulation(seed);
    const alerts = [...collectRangeAlerts(state), ...collectCoherenceAlerts(state)];

    rows.push({
      seed,
      empresa: state.company.nome,
      arquetipo: state.company.arquetipo,
      segmento: state.company.setorEconomico,
      tamanho: state.company.tamanho,
      setores: state.sectors.length,
      funcionarios: state.employees.length,
      satisfacaoMedia: Math.round(average(state.employees.map((employee) => employee.satisfacao))),
      medoMedio: Math.round(average(state.employees.map((employee) => employee.medo))),
      climaMedio: Math.round(average(state.sectors.map((sector) => sector.climaSetor))),
      riscoSaidaMedio: Math.round(average(state.employees.map((employee) => employee.riscoDeSaida))),
      caixaInicial: Math.round(state.economy.caixaAtual),
      energiaRh: state.rh.energiaSemanal,
      alertas: alerts,
    });
  }

  printSeedCompanyIndex(rows);
  if (options.writeJson) writeJson(rows, count, prefix);
  return rows;
}

function printSeedCompanyIndex(rows) {
  console.log("\nINDICE_DE_SEEDS_E_EMPRESAS");
  console.log(`Seeds listadas: ${rows.length}`);
  console.log("");
  rows.forEach((row) => {
    console.log(
      [
        row.seed,
        `empresa=${row.empresa}`,
        `arquetipo=${row.arquetipo}`,
        `segmento=${row.segmento}`,
        `tamanho=${row.tamanho}`,
        `setores=${row.setores}`,
        `func=${row.funcionarios}`,
        `sat=${row.satisfacaoMedia}`,
        `medo=${row.medoMedio}`,
        `clima=${row.climaMedio}`,
        `risco=${row.riscoSaidaMedio}`,
        `energiaRH=${row.energiaRh}`,
      ].join(" | ")
    );
    if (row.alertas.length) console.log(`  ALERTAS: ${row.alertas.join("; ")}`);
  });
}

function writeJson(rows, count, prefix) {
  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = path.join(outputDir, `seed-company-index-${safePrefix}-${count}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ generatedAt: new Date().toISOString(), count, prefix, rows }, null, 2), "utf8");
  console.log("");
  console.log(`JSON gerado: ${path.relative(process.cwd(), filePath)}`);
}

if (require.main === module) {
  const count = Number.parseInt(process.argv[2], 10);
  const prefixArg = process.argv.find((arg) => arg.startsWith("--prefix="));
  const prefix = prefixArg ? prefixArg.slice("--prefix=".length) : DEFAULT_PREFIX;
  const writeJson = process.argv.includes("--json");

  buildSeedCompanyIndex(Number.isFinite(count) ? count : DEFAULT_COUNT, prefix, { writeJson });
}

module.exports = {
  buildSeedCompanyIndex,
};
