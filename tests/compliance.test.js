/**
 * Modulo: compliance.test
 * Responsabilidade: validar compliance, eventos psicossociais genericos e regras eticas.
 */

const fs = require("fs");
const path = require("path");
const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { PSYCHOSOCIAL_RISK_EVENTS } = require("../data/complianceCatalog");
const { assert, collectCoherenceAlerts, collectRangeAlerts } = require("./testUtils");

const FORBIDDEN_TERMS = ["sexual", "sexo", "estupro", "violencia sexual"];

function run() {
  const state = createProceduralRHSimulation("RH-COMPLIANCE-001");

  assert(state.company.compliance, "empresa deve ter estado de compliance");
  assert(Array.isArray(state.reportCases), "estado deve ter reportCases");

  state.employees.forEach((employee) => {
    assert(employee.socialMarkers, `funcionario ${employee.id} deve ter marcadores sociais`);
    assert(employee.socialMarkers.observacao.includes("nao alteram competencia"), "marcadores devem explicitar regra etica");
  });

  PSYCHOSOCIAL_RISK_EVENTS.forEach((event) => {
    const text = `${event.tipo} ${event.descricao}`.toLowerCase();
    FORBIDDEN_TERMS.forEach((term) => {
      assert(!text.includes(term), `catalogo de compliance contem termo fora de escopo: ${term}`);
    });
  });

  assertNoSocialMarkersInCompetenceCalculations();

  advanceDays(state, 180);

  const sensitiveEvents = state.organizationEvents.filter((event) => event.tags && event.tags.includes("compliance"));
  sensitiveEvents.forEach((event) => {
    const text = `${event.tipo} ${event.descricao}`.toLowerCase();
    FORBIDDEN_TERMS.forEach((term) => {
      assert(!text.includes(term), `evento de compliance contem termo fora de escopo: ${term}`);
    });
  });

  state.reportCases.forEach((reportCase) => {
    assert(reportCase.targetEmployeeId, `denuncia ${reportCase.id} deve ter alvo`);
    assert(reportCase.status, `denuncia ${reportCase.id} deve ter status`);
  });

  const rangeAlerts = collectRangeAlerts(state);
  const coherenceAlerts = collectCoherenceAlerts(state);
  assert(!rangeAlerts.length, `faixas invalidas em compliance:\n${rangeAlerts.join("\n")}`);
  assert(!coherenceAlerts.length, `incoerencias em compliance:\n${coherenceAlerts.join("\n")}`);
}

function assertNoSocialMarkersInCompetenceCalculations() {
  const employeeGenerator = fs.readFileSync(path.join(__dirname, "..", "generators", "employeeGenerator.js"), "utf8");
  const beforeMarkerAssignment = employeeGenerator.split("socialMarkers: generateSocialMarkers")[0];
  assert(
    !beforeMarkerAssignment.includes("socialMarkers"),
    "marcadores sociais nao devem participar dos calculos iniciais de competencia/produtividade"
  );

  const simulationFiles = [
    path.join(__dirname, "..", "simulation", "employeeSimulation.js"),
    path.join(__dirname, "..", "simulation", "employeeActionsSimulation.js"),
  ];
  simulationFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, "utf8");
    assert(!source.includes("socialMarkers"), `${path.basename(filePath)} nao deve usar marcadores sociais em comportamento geral`);
  });
}

module.exports = {
  run,
};
