/**
 * Modulo: complianceSimulation
 * Responsabilidade: manter estado de compliance, denuncias e subnotificacao.
 * Entrada: state e eventos psicossociais
 * Saida: reportCases, eventos objetivos e pequenos ajustes de confianca/clima
 * Nao deve: criar acoes do RH, cenas explicitas ou linguagem grafica.
 */

const { clampPercent } = require("../core/clamp");
const { REPORT_STATUS } = require("../data/complianceCatalog");
const { createOrganizationEvent } = require("./eventLog");
const { generateMemoriesFromEvent } = require("./memoryInterpretation");

function initializeComplianceState(state) {
  if (!state.reportCases) state.reportCases = [];
  if (!state.complianceState) {
    state.complianceState = {
      processedRiskEventIds: [],
      reportsCreated: 0,
      underReportedEvents: 0,
    };
  }
}

function processPsychosocialRiskEvent(state, event, context) {
  initializeComplianceState(state);
  const reportCase = maybeCreateReportCase(state, event, context);
  applyComplianceConsequences(state, event, reportCase, context);
  return reportCase;
}

function maybeCreateReportCase(state, event, context) {
  const target = context.target;
  const sector = context.sector;
  const compliance = state.company.compliance;
  const closeSupport = context.witness ? 10 : 0;
  const reportingScore =
    event.severidade * 0.3 +
    compliance.confiancaNoCanal * 0.24 +
    compliance.anonimatoPercebido * 0.18 +
    compliance.protecaoContraRetaliacao * 0.18 +
    sector.psychologicalSafety * 0.14 +
    closeSupport -
    sector.reportFear * 0.22 -
    compliance.riscoSubnotificacao * 0.16;

  const reported = state.rng.chance(clampPercent(reportingScore));
  if (!reported) {
    state.complianceState.underReportedEvents += 1;
    return null;
  }

  const welcomed = compliance.confiancaNoCanal + compliance.maturidadeCompliance + compliance.protecaoContraRetaliacao > 150;
  const reportCase = {
    id: state.idFactory.nextId("report_case"),
    origemEventoId: event.id,
    dia: state.calendar.totalDiasSimulados,
    reporterId: target.id,
    targetEmployeeId: target.id,
    allegedAuthorId: context.author ? context.author.id : null,
    setorId: sector.id,
    tipo: event.tipo,
    severidade: event.severidade,
    status: welcomed ? REPORT_STATUS.ACKNOWLEDGED : REPORT_STATUS.NOT_WELCOMED,
    anonimato: compliance.anonimatoPercebido >= 55,
    riscoRetaliacao: clampPercent(100 - compliance.protecaoContraRetaliacao + sector.powerDistance * 0.2),
    confiabilidadeInicial: clampPercent(45 + event.severidade * 0.3 + compliance.maturidadeCompliance * 0.2),
    visivelParaRH: true,
    acoesTomadas: [],
    resultado: welcomed ? "acolhimento_inicial" : "resposta_fragil",
  };

  state.reportCases.push(reportCase);
  state.complianceState.reportsCreated += 1;

  const reportEvent = createOrganizationEvent(state, {
    tipo: welcomed ? "denuncia_acolhida" : "denuncia_nao_acolhida",
    descricao: welcomed
      ? "Uma denuncia foi registrada e recebeu acolhimento inicial."
      : "Uma denuncia foi registrada, mas a resposta inicial foi percebida como fragil.",
    setorId: sector.id,
    funcionariosEnvolvidos: [target.id, ...(context.author ? [context.author.id] : [])],
    severidade: event.severidade,
    origem: "compliance",
    dados: { reportCaseId: reportCase.id },
    visivelParaRH: true,
    tags: ["compliance", "denuncia"],
  });

  generateMemoriesFromEvent(state, reportEvent, {
    rolesByEmployeeId: {
      [target.id]: welcomed ? "beneficiado" : "prejudicado",
      ...(context.author ? { [context.author.id]: "observador" } : {}),
    },
  });

  return reportCase;
}

function applyComplianceConsequences(state, event, reportCase, context) {
  const target = context.target;
  const sector = context.sector;
  const compliance = state.company.compliance;

  if (reportCase && reportCase.status === REPORT_STATUS.ACKNOWLEDGED) {
    target.confiancaNoRH = clampPercent(target.confiancaNoRH + 3);
    target.suportePercebido = clampPercent(target.suportePercebido + 2);
    compliance.confiancaNoCanal = clampPercent(compliance.confiancaNoCanal + 1);
    sector.psychologicalSafety = clampPercent(sector.psychologicalSafety + 1);
    return;
  }

  const omissionPenalty = reportCase ? 4 : 2;
  target.confiancaNoRH = clampPercent(target.confiancaNoRH - omissionPenalty);
  target.confiancaNaGestao = clampPercent(target.confiancaNaGestao - 2);
  target.medo = clampPercent(target.medo + 3);
  target.intencaoSaida = clampPercent(target.intencaoSaida + 2);
  target.riscoDeSaida = target.intencaoSaida;
  sector.psychologicalSafety = clampPercent(sector.psychologicalSafety - 2);
  sector.inclusionClimate = clampPercent(sector.inclusionClimate - 2);
  sector.reportFear = clampPercent(sector.reportFear + 2);
  compliance.riscoSubnotificacao = clampPercent(compliance.riscoSubnotificacao + 1);
}

module.exports = {
  initializeComplianceState,
  processPsychosocialRiskEvent,
};
