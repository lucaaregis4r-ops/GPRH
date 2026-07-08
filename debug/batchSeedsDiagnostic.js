/**
 * Modulo: batchSeedsDiagnostic
 * Responsabilidade: diagnosticar multiplas seeds da engine procedural.
 * Entrada: quantidade opcional de seeds via linha de comando
 * Saida: resumo comparativo no console
 * Nao deve: alterar UI, criar acoes de RH ou expandir sistemas de jogo.
 */

const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { average, collectCoherenceAlerts, collectRangeAlerts } = require("../tests/testUtils");

const DEFAULT_SEED_COUNT = 20;

function runBatchSeedsDiagnostic(seedCount = DEFAULT_SEED_COUNT) {
  const rows = [];

  for (let index = 1; index <= seedCount; index += 1) {
    const seed = `RH-BATCH-${String(index).padStart(3, "0")}`;
    const state = createProceduralRHSimulation(seed);
    const initial = summarizeState(state);
    const cashInitial = state.economy.caixaAtual;
    const initialAlerts = [...collectRangeAlerts(state), ...collectCoherenceAlerts(state)];

    advanceDays(state, 30);

    const final = summarizeState(state);
    const finalAlerts = [...collectRangeAlerts(state), ...collectCoherenceAlerts(state)];
    const crisis = state.history.some((event) => event.type === "economic_event");

    rows.push({
      seed,
      empresa: state.company.nome,
      arquetipo: state.company.arquetipo,
      segmento: state.company.setorEconomico,
      funcionarios: state.employees.length,
      satisfacaoInicial: initial.satisfacaoMedia,
      satisfacaoFinal: final.satisfacaoMedia,
      medoInicial: initial.medoMedio,
      medoFinal: final.medoMedio,
      climaInicial: initial.climaMedio,
      climaFinal: final.climaMedio,
      caixaInicial: cashInitial,
      caixaFinal: state.economy.caixaAtual,
      inflacaoAcumulada: state.economy.inflacaoAcumulada,
      crise: crisis ? "sim" : "nao",
      eventosOrganizacionais: state.organizationEvents.length,
      memoriasIndividuais: state.employees.reduce((sum, employee) => sum + employee.memorias.length, 0),
      relacoes: state.relationships.length,
      alertas: [...initialAlerts, ...finalAlerts],
    });
  }

  printDiagnostic(rows);
  return rows;
}

function summarizeState(state) {
  return {
    satisfacaoMedia: Math.round(average(state.employees.map((employee) => employee.satisfacao))),
    medoMedio: Math.round(average(state.employees.map((employee) => employee.medo))),
    climaMedio: Math.round(average(state.sectors.map((sector) => sector.climaSetor))),
  };
}

function printDiagnostic(rows) {
  console.log("\nDIAGNOSTICO DE MULTIPLAS SEEDS");
  console.log(`Seeds avaliadas: ${rows.length}`);
  console.log("");

  rows.forEach((row) => {
    console.log(
      [
        row.seed,
        `empresa=${row.empresa}`,
        `arquetipo=${row.arquetipo}`,
        `segmento=${row.segmento}`,
        `func=${row.funcionarios}`,
        `sat=${row.satisfacaoInicial}->${row.satisfacaoFinal}`,
        `medo=${row.medoInicial}->${row.medoFinal}`,
        `clima=${row.climaInicial}->${row.climaFinal}`,
        `caixa=${formatMoney(row.caixaInicial)}->${formatMoney(row.caixaFinal)}`,
        `inflacao=${(row.inflacaoAcumulada * 100).toFixed(2)}%`,
        `crise=${row.crise}`,
        `eventos=${row.eventosOrganizacionais}`,
        `memInd=${row.memoriasIndividuais}`,
        `rel=${row.relacoes}`,
      ].join(" | ")
    );

    if (row.alertas.length) {
      console.log(`  ALERTAS: ${row.alertas.join("; ")}`);
    }
  });

  const rowsWithAlerts = rows.filter((row) => row.alertas.length);
  console.log("");
  console.log(`Seeds com alertas: ${rowsWithAlerts.length}`);
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

if (require.main === module) {
  const requestedCount = Number.parseInt(process.argv[2], 10);
  runBatchSeedsDiagnostic(Number.isFinite(requestedCount) ? requestedCount : DEFAULT_SEED_COUNT);
}

module.exports = {
  runBatchSeedsDiagnostic,
};
