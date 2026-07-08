const state = {
  session: null,
  queue: [],
};

const els = {
  companyLine: document.querySelector("#companyLine"),
  scenarioLine: document.querySelector("#scenarioLine"),
  seedForm: document.querySelector("#seedForm"),
  seedInput: document.querySelector("#seedInput"),
  metricsGrid: document.querySelector("#metricsGrid"),
  actionSelect: document.querySelector("#actionSelect"),
  targetSelect: document.querySelector("#targetSelect"),
  modeSelect: document.querySelector("#modeSelect"),
  prepDaysInput: document.querySelector("#prepDaysInput"),
  addActionButton: document.querySelector("#addActionButton"),
  clearQueueButton: document.querySelector("#clearQueueButton"),
  advanceWeekButton: document.querySelector("#advanceWeekButton"),
  saveLocalButton: document.querySelector("#saveLocalButton"),
  loadLocalButton: document.querySelector("#loadLocalButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  importJsonButton: document.querySelector("#importJsonButton"),
  saveJsonInput: document.querySelector("#saveJsonInput"),
  actionQueue: document.querySelector("#actionQueue"),
  employeesTable: document.querySelector("#employeesTable"),
  sectorsTable: document.querySelector("#sectorsTable"),
  signalsList: document.querySelector("#signalsList"),
  plannedActionsList: document.querySelector("#plannedActionsList"),
  weeklyReport: document.querySelector("#weeklyReport"),
  toast: document.querySelector("#toast"),
};

async function init() {
  bindEvents();
  await loadSession();
}

function bindEvents() {
  els.seedForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const seed = els.seedInput.value.trim() || "RH-UI-001";
    const session = await postJson("/api/new", { seed, horizonteSemanas: 12 });
    state.session = session;
    state.queue = [];
    els.weeklyReport.textContent = "Nova empresa gerada. Planeje a semana e avance.";
    render();
    showToast(`Empresa gerada para ${seed}`);
  });

  els.actionSelect.addEventListener("change", renderTargetOptions);
  els.modeSelect.addEventListener("change", syncPrepInput);

  els.addActionButton.addEventListener("click", () => {
    const request = buildActionRequest();
    if (!request) return;
    state.queue.push(request);
    renderQueue();
  });

  els.clearQueueButton.addEventListener("click", () => {
    state.queue = [];
    renderQueue();
  });

  els.advanceWeekButton.addEventListener("click", advanceWeek);
  els.saveLocalButton.addEventListener("click", saveLocal);
  els.loadLocalButton.addEventListener("click", loadLocal);
  els.exportJsonButton.addEventListener("click", exportJson);
  els.importJsonButton.addEventListener("click", importJson);
}

async function loadSession() {
  state.session = await fetchJson("/api/session");
  els.seedInput.value = state.session.seed;
  render();
}

async function advanceWeek() {
  if (!state.session || state.session.status !== "em_andamento") {
    showToast("Periodo tecnico encerrado. Gere uma nova seed para jogar de novo.");
    return;
  }

  const payload = { actions: state.queue };
  const result = await postJson("/api/play-week", payload);
  state.session = result.session;
  state.queue = [];
  render();
  els.weeklyReport.textContent = renderWeeklyReport(result.report);
  if (state.session.avaliacaoFinal) {
    els.weeklyReport.textContent += `\n\n${renderFinalEvaluation(state.session.avaliacaoFinal)}`;
  }
  showToast(`Semana ${result.report.semana} concluida`);
}

async function exportJson() {
  const save = await fetchJson("/api/export");
  els.saveJsonInput.value = JSON.stringify(save, null, 2);
  showToast("JSON exportado para o campo de save.");
  return save;
}

async function importJson() {
  const raw = els.saveJsonInput.value.trim();
  if (!raw) {
    showToast("Cole um JSON de save antes de importar.");
    return;
  }
  const save = JSON.parse(raw);
  state.session = await postJson("/api/import", { save });
  state.queue = [];
  els.seedInput.value = state.session.seed;
  els.weeklyReport.textContent = "Save importado. Continue a partir do estado carregado.";
  render();
  showToast("Save importado.");
}

async function saveLocal() {
  const save = await exportJson();
  localStorage.setItem("rhProceduralSimpleSave", JSON.stringify(save));
  showToast("Save salvo no navegador.");
}

async function loadLocal() {
  const raw = localStorage.getItem("rhProceduralSimpleSave");
  if (!raw) {
    showToast("Nenhum save local encontrado.");
    return;
  }
  els.saveJsonInput.value = JSON.stringify(JSON.parse(raw), null, 2);
  await importJson();
}

function render() {
  if (!state.session) return;
  renderHeader();
  renderMetrics();
  renderActions();
  renderTables();
  renderSignals();
  renderPlannedActions();
  renderQueue();
}

function renderHeader() {
  const company = state.session.company;
  els.companyLine.textContent = `${company.nome} | ${company.arquetipo} | ${company.segmento} | ${company.tamanho}`;
  if (state.session.scenario) {
    els.scenarioLine.textContent = `${state.session.scenario.nome}: ${state.session.scenario.premissa}`;
  }
}

function renderMetrics() {
  const metrics = [
    ["Semana", `${state.session.semanaAtual}/${state.session.horizonteSemanas}`],
    ["Dia", state.session.calendar.dia],
    ["Energia RH", `${state.session.rh.energiaAtual}/${state.session.rh.energiaSemanal}`],
    ["Caixa", formatMoney(state.session.economy.caixa)],
    ["Clima medio", state.session.summary.climaMedio],
    ["Risco medio", state.session.summary.riscoSaidaMedio],
    ["Satisfacao", state.session.summary.satisfacaoMedia],
    ["Sobrecarga", state.session.summary.sobrecargaMedia],
    ["Demandas", state.session.summary.demandasPendentes],
    ["Turnover", `${state.session.company.taxaTurnover}%`],
    ["Funcionarios", state.session.summary.funcionariosAtivos],
    ["Status", state.session.status],
  ];

  els.metricsGrid.innerHTML = metrics
    .map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`)
    .join("");
}

function renderActions() {
  const current = els.actionSelect.value;
  els.actionSelect.innerHTML = state.session.availableActions
    .map(
      (action) =>
        `<option value="${escapeHtml(action.tipo)}">${escapeHtml(action.nome)} | ${escapeHtml(action.categoria)} | energia ${action.custoEnergia}</option>`
    )
    .join("");
  if (current && state.session.availableActions.some((action) => action.tipo === current)) {
    els.actionSelect.value = current;
  }
  renderTargetOptions();
  syncPrepInput();
}

function renderTargetOptions() {
  const action = selectedAction();
  if (!action) return;

  const options = targetOptionsFor(action);
  els.targetSelect.innerHTML = options.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`).join("");
  els.targetSelect.disabled = action.alvo === "empresa" || options.length === 0;
}

function targetOptionsFor(action) {
  if (action.alvo === "funcionario") {
    return state.session.targetOptions.employees.map((employee) => ({
      id: employee.id,
      label: `${employee.nome} - ${employee.cargo}`,
    }));
  }
  if (action.alvo === "setor") {
    return state.session.targetOptions.sectors.map((sector) => ({
      id: sector.id,
      label: sector.nome,
    }));
  }
  if (action.alvo === "denuncia") {
    return state.session.targetOptions.reportCases.map((reportCase) => ({
      id: reportCase.id,
      label: `${reportCase.id} - ${reportCase.status} - sev ${reportCase.severidade}`,
    }));
  }
  if (action.alvo === "funcionario_desligado") return [];
  return [{ id: "empresa", label: "Empresa" }];
}

function syncPrepInput() {
  const action = selectedAction();
  const planning = els.modeSelect.value === "planejar";
  els.prepDaysInput.disabled = !planning;
  if (planning && action) {
    els.prepDaysInput.value = action.preparoIdealDias || 7;
  }
}

function selectedAction() {
  return state.session.availableActions.find((action) => action.tipo === els.actionSelect.value);
}

function buildActionRequest() {
  const action = selectedAction();
  if (!action) return null;

  const targetId = els.targetSelect.value;
  if (action.alvo !== "empresa" && !targetId) {
    showToast("Escolha um alvo valido para esta acao.");
    return null;
  }

  const request = {
    tipo: action.tipo,
    modo: els.modeSelect.value,
    alvo: buildTarget(action, targetId),
  };

  if (request.modo === "planejar") {
    request.diasPreparo = Number(els.prepDaysInput.value || action.preparoIdealDias || 7);
  }

  return request;
}

function buildTarget(action, targetId) {
  if (action.alvo === "funcionario" || action.alvo === "funcionario_desligado") return { employeeId: targetId };
  if (action.alvo === "setor") return { sectorId: targetId };
  if (action.alvo === "denuncia") return { reportCaseId: targetId };
  return {};
}

function renderQueue() {
  if (!state.queue.length) {
    els.actionQueue.innerHTML = "<li>Nenhuma acao escolhida para esta semana.</li>";
    return;
  }

  els.actionQueue.innerHTML = state.queue
    .map((request, index) => {
      const action = state.session.availableActions.find((item) => item.tipo === request.tipo);
      const target = describeTarget(action, request.alvo);
      const mode = request.modo === "planejar" ? `planejar ${request.diasPreparo} dias` : "executar agora";
      return `<li>
        <strong>${escapeHtml(action ? action.nome : request.tipo)}</strong>
        <small>${escapeHtml(mode)} | ${escapeHtml(target)}</small>
        <button type="button" data-remove-index="${index}">Remover</button>
      </li>`;
    })
    .join("");

  els.actionQueue.querySelectorAll("[data-remove-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.queue.splice(Number(button.dataset.removeIndex), 1);
      renderQueue();
    });
  });
}

function describeTarget(action, target) {
  if (!action || action.alvo === "empresa") return "empresa";
  if (action.alvo === "funcionario") {
    const employee = state.session.targetOptions.employees.find((item) => item.id === target.employeeId);
    return employee ? employee.nome : target.employeeId;
  }
  if (action.alvo === "setor") {
    const sector = state.session.targetOptions.sectors.find((item) => item.id === target.sectorId);
    return sector ? sector.nome : target.sectorId;
  }
  if (action.alvo === "denuncia") return target.reportCaseId;
  return "-";
}

function renderTables() {
  els.employeesTable.innerHTML = state.session.employeesAttention
    .map(
      (employee) => `<tr>
        <td>${escapeHtml(employee.nome)}</td>
        <td>${escapeHtml(employee.cargo)}</td>
        <td>${formatRisk(employee.riscoEstimado, false)}</td>
        <td>${formatRisk(employee.sobrecargaEstimada, false)}</td>
        <td>${employee.confiabilidade}</td>
      </tr>`
    )
    .join("");

  els.sectorsTable.innerHTML = state.session.sectors
    .map(
      (sector) => `<tr>
        <td>${escapeHtml(sector.nome)}</td>
        <td>${sector.funcionariosAtivos}</td>
        <td>${formatRisk(sector.clima, true)}</td>
        <td>${formatRisk(sector.carga, false)}</td>
        <td>${formatRisk(sector.rumor, false)}</td>
      </tr>`
    )
    .join("");
}

function renderSignals() {
  if (!state.session.visibleSignals.length) {
    els.signalsList.innerHTML = "<li>Nenhum sinal visivel recente.</li>";
    return;
  }
  els.signalsList.innerHTML = state.session.visibleSignals
    .map(
      (signal) => `<li>
        <strong>Dia ${signal.dia}: ${escapeHtml(signal.tipo)}</strong>
        <small>confiabilidade ${signal.confiabilidade} | ${escapeHtml(signal.descricao || "")}</small>
      </li>`
    )
    .join("");
}

function renderPlannedActions() {
  if (!state.session.rh.acoesPlanejadas.length) {
    els.plannedActionsList.innerHTML = "<li>Nenhuma acao em andamento.</li>";
    return;
  }
  els.plannedActionsList.innerHTML = state.session.rh.acoesPlanejadas
    .map(
      (plan) => `<li>
        <strong>${escapeHtml(plan.nome)}</strong>
        <small>${escapeHtml(plan.status)} | dia ${plan.executarNoDia} | preparo ${plan.diasPreparados}/${plan.diasPreparoPlanejados} (${plan.qualidadePlanejamento}%)</small>
      </li>`
    )
    .join("");
}

function renderWeeklyReport(report) {
  const lines = [];
  lines.push(`RELATORIO_SEMANAL ${report.semana}`);
  lines.push(`Dias: ${report.diaInicial} -> ${report.diaFinal}`);
  lines.push(`Energia RH: ${report.energiaAntes} -> ${report.energiaDepois}`);
  lines.push(`Diagnostico: ${report.progresso.diagnostico} | score ${report.progresso.score}`);
  lines.push(`Resumo: ${report.resumo}`);
  lines.push("");
  lines.push("Mudancas:");
  Object.entries(report.mudancas).forEach(([key, value]) => {
    lines.push(`- ${key}: ${formatDelta(value)}`);
  });
  lines.push("");
  lines.push(`Acoes executadas: ${report.acoesExecutadas.length}`);
  lines.push(`Acoes planejadas: ${report.acoesPlanejadas.length}`);
  lines.push(`Acoes rejeitadas: ${report.acoesRejeitadas.length}`);
  if (report.acoesRejeitadas.length) {
    report.acoesRejeitadas.forEach((item) => lines.push(`- rejeitada: ${item.request.tipo} | ${item.motivo}`));
  }
  lines.push(`Eventos relevantes: ${report.eventosDaSemana.length}`);
  report.eventosDaSemana.slice(-6).forEach((event) => lines.push(`- Dia ${event.dia}: ${event.tipo} | sev ${Math.round(event.severidade)}`));
  return lines.join("\n");
}

function renderFinalEvaluation(evaluation) {
  const lines = [];
  lines.push(`AVALIACAO_FINAL: ${evaluation.scenario.nome}`);
  lines.push(`Classificacao: ${evaluation.classificacao} | score ${evaluation.score}`);
  lines.push(`Periodo: ${evaluation.diasSimulados} dias | ${evaluation.semanasJogadas} semanas`);
  lines.push(`Resumo: ${evaluation.historiaEmergente}`);
  lines.push("");
  lines.push("Objetivos:");
  evaluation.criterios.forEach((criterion) => {
    lines.push(`- ${criterion.ok ? "OK" : "ATENCAO"} ${criterion.nome}: ${criterion.valor} ${criterion.operador} ${criterion.alvo}`);
  });
  return lines.join("\n");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
  return response.json();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Falha HTTP ${response.status}`);
  return data;
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function formatRisk(value, highIsGood) {
  const cls = highIsGood ? (value < 35 ? "value-risk" : value < 55 ? "value-warn" : "value-ok") : value > 70 ? "value-risk" : value > 50 ? "value-warn" : "value-ok";
  return `<span class="${cls}">${value}</span>`;
}

function formatDelta(value) {
  if (Math.abs(value) < 0.05) return "0";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 2400);
}

function escapeHtml(value) {
  value = String(value ?? "");
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

init().catch((error) => {
  els.companyLine.textContent = "Erro ao carregar UI.";
  els.weeklyReport.textContent = error.stack || error.message;
});
