/**
 * Modulo: orgChartModel
 * Responsabilidade: criar organograma formal e diagnosticos simples de lideranca.
 * Entrada: state com setores, funcionarios e relacoes
 * Saida: state.orgChart e employee.managerId
 * Nao deve: desbloquear tecnologias, renderizar UI ou revelar influencia informal como certeza ao jogador.
 */

function initializeOrgChart(state) {
  state.orgChart = buildOrgChart(state);
  assignEmployeeManagersFromOrgChart(state);
  return state.orgChart;
}

function buildOrgChart(state) {
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");
  const sectorLeaderById = new Map();

  (state.sectors || []).forEach((sector) => {
    const leader =
      activeEmployees.find((employee) => employee.id === sector.liderancaFormalId) ||
      activeEmployees
        .filter((employee) => employee.setorId === sector.id)
        .sort((left, right) => (right.influenciaInformal || 0) - (left.influenciaInformal || 0))[0] ||
      null;
    if (leader) sectorLeaderById.set(sector.id, leader.id);
  });

  const nodes = activeEmployees.map((employee) => {
    const sectorLeaderId = sectorLeaderById.get(employee.setorId) || null;
    const isSectorLeader = sectorLeaderId === employee.id;
    return {
      employeeId: employee.id,
      sectorId: employee.setorId,
      roleId: employee.cargoFormal?.id || employee.ocupacaoBaseId || null,
      level: isSectorLeader ? 2 : 3,
      managerId: isSectorLeader ? null : sectorLeaderId,
    };
  });

  const edges = nodes
    .filter((node) => node.managerId)
    .map((node) => ({
      fromManagerId: node.managerId,
      toEmployeeId: node.employeeId,
      type: "formal",
    }));

  return {
    nodes,
    edges,
    informalInfluenceEdges: buildInformalInfluenceEdges(state, activeEmployees),
    diagnostics: buildOrgDiagnostics(state, nodes),
    version: 1,
  };
}

function assignEmployeeManagersFromOrgChart(state) {
  const nodeByEmployeeId = new Map((state.orgChart?.nodes || []).map((node) => [node.employeeId, node]));
  (state.employees || []).forEach((employee) => {
    const node = nodeByEmployeeId.get(employee.id);
    employee.managerId = node ? node.managerId : null;
  });
}

function buildInformalInfluenceEdges(state, activeEmployees) {
  const activeIds = new Set(activeEmployees.map((employee) => employee.id));
  const influentialIds = new Set(
    activeEmployees
      .filter((employee) => (employee.influenciaInformal || 0) >= 72)
      .map((employee) => employee.id)
  );

  return (state.relationships || [])
    .filter(
      (relationship) =>
        relationship.ativa !== false &&
        activeIds.has(relationship.fromEmployeeId) &&
        activeIds.has(relationship.toEmployeeId) &&
        (influentialIds.has(relationship.fromEmployeeId) || influentialIds.has(relationship.toEmployeeId)) &&
        ((relationship.confianca || 0) >= 60 || (relationship.dependenciaTecnica || 0) >= 65)
    )
    .slice(0, 30)
    .map((relationship) => {
      const fromIsInfluential = influentialIds.has(relationship.fromEmployeeId);
      return {
        fromManagerId: fromIsInfluential ? relationship.fromEmployeeId : relationship.toEmployeeId,
        toEmployeeId: fromIsInfluential ? relationship.toEmployeeId : relationship.fromEmployeeId,
        type: relationship.dependenciaTecnica >= relationship.confianca ? "technical_dependency" : "informal",
      };
    });
}

function buildOrgDiagnostics(state, nodes) {
  const diagnostics = [];
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");
  const spanByManager = new Map();

  nodes.forEach((node) => {
    if (!node.managerId) return;
    spanByManager.set(node.managerId, (spanByManager.get(node.managerId) || 0) + 1);
  });

  activeEmployees.forEach((employee) => {
    const node = nodes.find((item) => item.employeeId === employee.id);
    if (!node || (!node.managerId && node.level !== 2)) {
      diagnostics.push({
        type: "missing_manager",
        employeeId: employee.id,
        sectorId: employee.setorId,
        severity: 55,
      });
    }
  });

  spanByManager.forEach((span, managerId) => {
    if (span >= 8) {
      const manager = activeEmployees.find((employee) => employee.id === managerId);
      diagnostics.push({
        type: "excessive_span_of_control",
        employeeId: managerId,
        sectorId: manager?.setorId || null,
        severity: Math.min(100, 45 + span * 5),
        span,
      });
    }
  });

  return diagnostics;
}

function getVisibleOrgChartSnapshot(state) {
  const orgChart = state.orgChart || initializeOrgChart(state);
  return {
    version: orgChart.version,
    nodes: orgChart.nodes.map((node) => ({
      employeeId: node.employeeId,
      sectorId: node.sectorId,
      roleId: node.roleId,
      level: node.level,
      managerId: node.managerId,
    })),
    edges: orgChart.edges.map((edge) => ({ ...edge })),
    diagnostics: orgChart.diagnostics.map((diagnostic) => ({ ...diagnostic })),
    informalInfluenceAvailable: false,
  };
}

module.exports = {
  initializeOrgChart,
  buildOrgChart,
  getVisibleOrgChartSnapshot,
};
