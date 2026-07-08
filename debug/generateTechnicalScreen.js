/**
 * Modulo: generateTechnicalScreen
 * Responsabilidade: gerar uma tela tecnica estatica para visualizar a engine.
 * Entrada: seed e dias simulados via linha de comando
 * Saida: HTML em src/debug/output/technical-screen.html
 * Nao deve: criar gameplay, UI jogavel, campanha, vitoria/derrota ou avatares.
 */

const fs = require("fs");
const path = require("path");
const { createProceduralRHSimulation, advanceDays } = require("../simulation/simulationEngine");
const { average, collectCoherenceAlerts, collectRangeAlerts } = require("../tests/testUtils");
const { summarizePerceptionAccuracy } = require("../knowledge/perceptionDiagnostics");

function generateTechnicalScreen(seed = "RH-TECNICO-001", simulatedDays = 30) {
  const state = createProceduralRHSimulation(seed);
  const initial = summarizeState(state);

  if (simulatedDays > 0) {
    advanceDays(state, simulatedDays);
  }

  const final = summarizeState(state);
  const alerts = [...collectRangeAlerts(state), ...collectCoherenceAlerts(state)];
  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const html = renderHtml(state, initial, final, alerts, simulatedDays);
  const filePath = path.join(outputDir, "technical-screen.html");
  fs.writeFileSync(filePath, html, "utf8");

  console.log(`Tela tecnica gerada: ${path.relative(process.cwd(), filePath)}`);
  return filePath;
}

function summarizeState(state) {
  return {
    satisfaction: average(state.employees.map((employee) => employee.satisfacao)),
    fear: average(state.employees.map((employee) => employee.medo)),
    climate: average(state.sectors.map((sector) => sector.climaSetor)),
    exitRisk: average(state.employees.map((employee) => employee.riscoDeSaida)),
    overload: average(state.employees.map((employee) => employee.sobrecarga)),
    productivity: average(state.employees.map((employee) => employee.produtividade)),
    cash: state.economy.caixaAtual,
  };
}

function renderHtml(state, initial, final, alerts, simulatedDays) {
  const criticalEmployees = state.employees
    .slice()
    .sort((left, right) => right.riscoDeSaida - left.riscoDeSaida)
    .slice(0, 10);
  const importantRelations = state.relationships
    .slice()
    .sort((left, right) => right.conflito + right.dependenciaTecnica - (left.conflito + left.dependenciaTecnica))
    .slice(0, 10);
  const employeesById = new Map(state.employees.map((employee) => [employee.id, employee]));
  const recentActions = (state.acoesFuncionarios || []).slice(-12);
  const pendingDemands = state.employees.filter((employee) => employee.status !== "desligado" && employee.demandasPendentes.length);
  const visibleSignals = (state.visibleSignals || []).filter((signal) => signal.visivelParaRH);
  const hiddenSignals = (state.visibleSignals || []).filter((signal) => !signal.visivelParaRH);
  const recentVisibleSignals = visibleSignals.slice(-12);
  const functionalAttention = state.employees
    .filter((employee) => employee.status !== "desligado")
    .slice()
    .sort(
      (left, right) =>
        (right.riscoPorSobrecargaFuncional || 0) +
        (right.trabalhoInvisivel || 0) -
        ((left.riscoPorSobrecargaFuncional || 0) + (left.trabalhoInvisivel || 0))
    )
    .slice(0, 10);
  const perceptionAccuracy = summarizePerceptionAccuracy(state);
  const complianceEvents = state.organizationEvents.filter((event) => event.tags && event.tags.includes("compliance"));

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Engine RH - Tela Tecnica</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fa;
      --ink: #1d2733;
      --muted: #637083;
      --line: #d7dee8;
      --panel: #ffffff;
      --accent: #1f7a8c;
      --warn: #b05a00;
      --risk: #b42318;
      --ok: #287d3c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 14px/1.45 Arial, Helvetica, sans-serif;
    }
    header {
      padding: 20px 28px 14px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }
    h1, h2, h3 { margin: 0; font-weight: 700; letter-spacing: 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 16px; margin-bottom: 12px; }
    h3 { font-size: 14px; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      margin-top: 10px;
      color: var(--muted);
    }
    main {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 18px;
      padding: 18px 28px 28px;
    }
    section, aside {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 16px;
    }
    .stack { display: grid; gap: 14px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 12px;
      min-height: 92px;
    }
    .label { color: var(--muted); font-size: 12px; }
    .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .delta { margin-top: 4px; color: var(--muted); }
    .bar {
      height: 8px;
      background: #e8edf3;
      border-radius: 999px;
      overflow: hidden;
      margin-top: 9px;
    }
    .bar > span {
      display: block;
      height: 100%;
      width: var(--value);
      background: var(--accent);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px 7px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th { color: var(--muted); font-size: 12px; font-weight: 700; }
    .tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background: #e9f5f7;
      color: #135e6d;
      font-size: 12px;
      white-space: nowrap;
    }
    .risk { color: var(--risk); font-weight: 700; }
    .warn { color: var(--warn); font-weight: 700; }
    .ok { color: var(--ok); font-weight: 700; }
    .list { margin: 0; padding-left: 18px; }
    .list li { margin: 4px 0; }
    @media (max-width: 980px) {
      main { grid-template-columns: 1fr; padding: 14px; }
      header { padding: 16px 14px 12px; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 620px) {
      .grid { grid-template-columns: 1fr; }
      th, td { padding: 7px 5px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(state.company.nome)}</h1>
    <div class="meta">
      <span>Seed: ${escapeHtml(state.seed)}</span>
      <span>Arquétipo: ${escapeHtml(state.company.arquetipo)}</span>
      <span>Segmento: ${escapeHtml(state.company.setorEconomico)}</span>
      <span>Dias simulados: ${simulatedDays}</span>
      <span>Mês ${state.calendar.mesAtual}, ano ${state.calendar.anoAtual}</span>
    </div>
  </header>
  <main>
    <aside class="stack">
      <section>
        <h2>Empresa</h2>
        <p><span class="label">Tamanho</span><br>${escapeHtml(state.company.tamanho)}</p>
        <p><span class="label">Funcionários</span><br>${state.employees.length}</p>
        <p><span class="label">Setores</span><br>${state.sectors.length}</p>
        <p><span class="label">Relações</span><br>${state.relationships.length}</p>
        <p><span class="label">Eventos organizacionais</span><br>${state.organizationEvents.length}</p>
        <p><span class="label">Memórias individuais</span><br>${state.employees.reduce((sum, employee) => sum + employee.memorias.length, 0)}</p>
        <p><span class="label">Sinais visiveis ao RH</span><br>${visibleSignals.length}</p>
        <p><span class="label">Sinais ocultos/debug</span><br>${hiddenSignals.length}</p>
        <p><span class="label">Taxa turnover empresa</span><br>${Math.round(state.company.taxaTurnover || 0)}%</p>
        <p><span class="label">Denuncias registradas</span><br>${state.reportCases.length}</p>
        <p><span class="label">Energia RH</span><br>${state.rh.energiaAtual}/${state.rh.energiaSemanal}</p>
        <p><span class="label">Acoes RH executadas</span><br>${state.rh.acoesExecutadas.length}</p>
        <p><span class="label">Acoes RH planejadas</span><br>${state.rh.acoesPlanejadas.length}</p>
        <p><span class="label">Aprovacoes diretoria</span><br>${state.rh.aprovacoesDiretoria.length}</p>
        <p><span class="label">Ações autônomas</span><br>${state.acoesFuncionarios.length}</p>
        <p><span class="label">Turnover acumulado</span><br>${state.company.turnoverAcumulado || 0}</p>
      </section>
      <section>
        <h2>Financeiro</h2>
        <p><span class="label">Caixa</span><br>${formatMoney(state.economy.caixaAtual)}</p>
        <p><span class="label">Receita mensal</span><br>${formatMoney(state.economy.receitaMensalAtual)}</p>
        <p><span class="label">Folha</span><br>${formatMoney(state.economy.folhaPagamentoMensal)}</p>
        <p><span class="label">Inflação acumulada</span><br>${formatPercent(state.economy.inflacaoAcumulada)}</p>
      </section>
      <section>
        <h2>Compliance</h2>
        <p><span class="label">Confianca no canal</span><br>${Math.round(state.company.compliance.confiancaNoCanal)}</p>
        <p><span class="label">Anonimato percebido</span><br>${Math.round(state.company.compliance.anonimatoPercebido)}</p>
        <p><span class="label">Protecao contra retaliacao</span><br>${Math.round(state.company.compliance.protecaoContraRetaliacao)}</p>
        <p><span class="label">Risco de subnotificacao</span><br>${Math.round(state.company.compliance.riscoSubnotificacao)}</p>
      </section>
      <section>
        <h2>Alertas Técnicos</h2>
        ${alerts.length ? `<ul class="list">${alerts.map((alert) => `<li>${escapeHtml(alert)}</li>`).join("")}</ul>` : '<p class="ok">Sem alertas estruturais.</p>'}
      </section>
    </aside>
    <div class="stack">
      <section>
        <h2>Indicadores</h2>
        <div class="grid">
          ${metric("Satisfação", initial.satisfaction, final.satisfaction)}
          ${metric("Medo", initial.fear, final.fear)}
          ${metric("Clima", initial.climate, final.climate)}
          ${metric("Risco de saída", initial.exitRisk, final.exitRisk)}
          ${metric("Sobrecarga", initial.overload, final.overload)}
          ${metric("Produtividade", initial.productivity, final.productivity)}
          ${metricMoney("Caixa", initial.cash, final.cash)}
          ${metric("Pressão por resultado", state.company.pressaoPorResultado, state.company.pressaoPorResultado)}
        </div>
      </section>
      <section>
        <h2>Setores</h2>
        <table>
          <thead><tr><th>Setor</th><th>Funcionários</th><th>Carga</th><th>Clima</th><th>Especialização</th><th>Turnover</th><th>Segurança psic.</th></tr></thead>
          <tbody>
            ${state.sectors
              .map(
                (sector) => `<tr>
                  <td>${escapeHtml(sector.nome)}</td>
                  <td>${sector.funcionariosIds.length}</td>
                  <td>${sector.cargaTrabalho}</td>
                  <td>${formatRiskValue(sector.climaSetor, true)}</td>
                  <td>${sector.nivelEspecializacao}</td>
                  <td>${Math.round(sector.taxaTurnover || 0)}%</td>
                  <td>${formatRiskValue(sector.psychologicalSafety || 0, true)}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Funcionários em Atenção</h2>
        <p class="label">Valores internos reais para debug tecnico.</p>
        <table>
          <thead><tr><th>Nome</th><th>Setor</th><th>Cargo</th><th>Ensino</th><th>Especialização</th><th>Sobrecarga real</th><th>Risco real</th></tr></thead>
          <tbody>
            ${criticalEmployees
              .map((employee) => {
                const sector = state.sectors.find((item) => item.id === employee.setorId);
                return `<tr>
                  <td>${escapeHtml(employee.nome)}</td>
                  <td>${escapeHtml(sector ? sector.nome : "-")}</td>
                  <td>${escapeHtml(formatCargo(employee.cargoFormal))}</td>
                  <td>${escapeHtml(employee.escolaridade || "-")}</td>
                  <td>${employee.especializacao}</td>
                  <td>${formatRiskValue(employee.sobrecarga, false)}</td>
                  <td>${formatRiskValue(employee.riscoDeSaida, false)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Leitura RH Imperfeita</h2>
        <p class="label">Estimativas derivadas apenas de sinais visiveis. Nao sao copia dos valores reais.</p>
        <table>
          <thead><tr><th>Funcionário</th><th>Satisfacao estimada</th><th>Sobrecarga estimada</th><th>Risco estimado</th><th>Confianca</th><th>Sinais</th></tr></thead>
          <tbody>
            ${criticalEmployees
              .map((employee) => {
                const perception = employee.percepcaoRH || {};
                return `<tr>
                  <td>${escapeHtml(employee.nome)}</td>
                  <td>${formatRiskValue(perception.satisfacaoEstimada || 0, true)}</td>
                  <td>${formatRiskValue(perception.sobrecargaEstimada || 0, false)}</td>
                  <td>${formatRiskValue(perception.riscoSaidaEstimado || 0, false)}</td>
                  <td>${Math.round(perception.confiabilidadeGeral || 0)}</td>
                  <td>${(perception.sinaisRecentes || []).length}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Sinais Visiveis Recentes</h2>
        <table>
          <thead><tr><th>Dia</th><th>Funcionario</th><th>Sinal</th><th>Confiabilidade</th><th>Interpretacoes</th></tr></thead>
          <tbody>
            ${recentVisibleSignals.length
              ? recentVisibleSignals
                  .map((signal) => {
                    const employee = signal.funcionarioId ? employeesById.get(signal.funcionarioId) : null;
                    return `<tr>
                      <td>${signal.dia}</td>
                      <td>${escapeHtml(employee ? employee.nome : "-")}</td>
                      <td>${escapeHtml(signal.tipo)}</td>
                      <td>${Math.round(signal.confiabilidade)}</td>
                      <td>${escapeHtml((signal.interpretacoesPossiveis || []).join(", "))}</td>
                    </tr>`;
                  })
                  .join("")
              : '<tr><td colspan="5">Nenhum sinal visivel registrado.</td></tr>'}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Funcoes Reais e Trabalho Invisivel</h2>
        <table>
          <thead><tr><th>Funcionario</th><th>Cargo</th><th>Acumulo</th><th>Desvio</th><th>Invisivel</th><th>Risco funcional</th></tr></thead>
          <tbody>
            ${functionalAttention
              .map(
                (employee) => `<tr>
                  <td>${escapeHtml(employee.nome)}</td>
                  <td>${escapeHtml(formatCargo(employee.cargoFormal))}</td>
                  <td>${formatRiskValue(employee.indiceAcumuloFuncao || 0, false)}</td>
                  <td>${formatRiskValue(employee.indiceDesvioFuncao || 0, false)}</td>
                  <td>${formatRiskValue(employee.trabalhoInvisivel || 0, false)}</td>
                  <td>${formatRiskValue(employee.riscoPorSobrecargaFuncional || 0, false)}</td>
                </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Diagnostico de Percepcao RH</h2>
        <p><span class="label">Erro medio satisfacao</span><br>${perceptionAccuracy.satisfactionErrorAverage.toFixed(1)}</p>
        <p><span class="label">Erro medio risco de saida</span><br>${perceptionAccuracy.exitRiskErrorAverage.toFixed(1)}</p>
        <p><span class="label">Erro medio sobrecarga</span><br>${perceptionAccuracy.overloadErrorAverage.toFixed(1)}</p>
        <p><span class="label">Falsos negativos de alto risco</span><br>${perceptionAccuracy.highRiskFalseNegativeCount}</p>
        <p><span class="label">Sobrecargas ocultas</span><br>${perceptionAccuracy.overloadedHiddenCount}</p>
      </section>
      <section>
        <h2>Ações Autônomas Recentes</h2>
        <table>
          <thead><tr><th>Dia</th><th>Funcionário</th><th>Ação</th><th>Visibilidade</th></tr></thead>
          <tbody>
            ${recentActions.length
              ? recentActions
                  .map((action) => {
                    const employee = employeesById.get(action.funcionarioId);
                    return `<tr>
                      <td>${action.dia}</td>
                      <td>${escapeHtml(employee ? employee.nome : action.funcionarioId)}</td>
                      <td>${escapeHtml(action.tipo)}</td>
                      <td>${action.visivelParaRH ? "visível" : "oculta"}</td>
                    </tr>`;
                  })
                  .join("")
              : '<tr><td colspan="4">Nenhuma ação autônoma registrada.</td></tr>'}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Acoes RH Recentes</h2>
        <table>
          <thead><tr><th>Dia</th><th>Acao</th><th>Planejamento</th><th>Energia</th><th>Sinais</th></tr></thead>
          <tbody>
            ${state.rh.acoesExecutadas.length
              ? state.rh.acoesExecutadas
                  .slice(-10)
                  .map(
                    (action) => `<tr>
                      <td>${action.dia}</td>
                      <td>${escapeHtml(action.nome)}</td>
                      <td>${action.planejamento && !action.planejamento.improvisada ? `${Math.round(action.planejamento.qualidadePlanejamento)}%` : "improvisada"}</td>
                      <td>${action.custoEnergia}</td>
                      <td>${action.sinaisGerados.length}</td>
                    </tr>`
                  )
                  .join("")
              : '<tr><td colspan="5">Nenhuma acao RH executada neste preview.</td></tr>'}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Acoes RH Planejadas</h2>
        <table>
          <thead><tr><th>Acao</th><th>Status</th><th>Executar no dia</th><th>Preparo</th><th>Motivo</th></tr></thead>
          <tbody>
            ${state.rh.acoesPlanejadas.length
              ? state.rh.acoesPlanejadas
                  .slice(-10)
                  .map(
                    (plan) => `<tr>
                      <td>${escapeHtml(plan.nome)}</td>
                      <td>${escapeHtml(plan.status)}</td>
                      <td>${plan.executarNoDia}</td>
                      <td>${plan.diasPreparados}/${plan.diasPreparoPlanejados} (${Math.round(plan.qualidadePlanejamento)}%)</td>
                      <td>${escapeHtml(plan.motivoBloqueio || "-")}</td>
                    </tr>`
                  )
                  .join("")
              : '<tr><td colspan="5">Nenhuma acao RH planejada neste preview.</td></tr>'}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Demandas e Sinais</h2>
        <table>
          <thead><tr><th>Funcionário</th><th>Busca externa</th><th>Proposta</th><th>Demandas</th><th>Absenteísmo</th></tr></thead>
          <tbody>
            ${pendingDemands
              .concat(state.employees.filter((employee) => employee.status !== "desligado" && employee.estadoDeBuscaExterna))
              .filter((employee, index, list) => list.findIndex((item) => item.id === employee.id) === index)
              .slice(0, 12)
              .map(
                (employee) => `<tr>
                  <td>${escapeHtml(employee.nome)}</td>
                  <td>${employee.estadoDeBuscaExterna ? "sim" : "não"}</td>
                  <td>${employee.propostaExternaRecebida ? "sim" : "não"}</td>
                  <td>${escapeHtml(employee.demandasPendentes.map((demand) => `${demand.tipo}:${demand.status}`).join(", ") || "-")}</td>
                  <td>${employee.absenteismo}</td>
                </tr>`
              )
              .join("") || '<tr><td colspan="5">Nenhuma demanda ou sinal crítico registrado.</td></tr>'}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Memórias Individuais em Funcionários Críticos</h2>
        <table>
          <thead><tr><th>Funcionário</th><th>Última memória</th><th>Papel</th><th>Intensidade</th></tr></thead>
          <tbody>
            ${criticalEmployees
              .map((employee) => {
                const memory = employee.memorias[employee.memorias.length - 1];
                return `<tr>
                  <td>${escapeHtml(employee.nome)}</td>
                  <td>${memory ? escapeHtml(memory.descricao) : "-"}</td>
                  <td>${memory ? escapeHtml(memory.papelNoEvento) : "-"}</td>
                  <td>${memory ? memory.intensidade : "-"}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Relações Críticas</h2>
        <table>
          <thead><tr><th>Funcionários</th><th>Confiança</th><th>Conflito</th><th>Dependência técnica</th></tr></thead>
          <tbody>
            ${importantRelations
              .map((relation) => {
                const left = employeesById.get(relation.fromEmployeeId);
                const right = employeesById.get(relation.toEmployeeId);
                return `<tr>
                  <td>${escapeHtml(left.nome)} ↔ ${escapeHtml(right.nome)}</td>
                  <td>${relation.confianca}</td>
                  <td>${formatRiskValue(relation.conflito, false)}</td>
                  <td>${formatRiskValue(relation.dependenciaTecnica, false)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Eventos Organizacionais Recentes</h2>
        <ul class="list">
          ${state.organizationEvents
            .slice(-10)
            .map((event) => `<li><span class="tag">${escapeHtml(event.tipo)}</span> Dia ${event.dia}: ${escapeHtml(event.descricao)} · severidade ${event.severidade}</li>`)
            .join("")}
        </ul>
      </section>
      <section>
        <h2>Compliance e Denuncias Recentes</h2>
        <table>
          <thead><tr><th>Dia</th><th>Tipo</th><th>Setor</th><th>Severidade</th><th>Visivel RH</th></tr></thead>
          <tbody>
            ${complianceEvents.slice(-10).length
              ? complianceEvents
                  .slice(-10)
                  .map((event) => {
                    const sector = state.sectors.find((item) => item.id === event.setorId);
                    return `<tr>
                      <td>${event.dia}</td>
                      <td>${escapeHtml(event.tipo)}</td>
                      <td>${escapeHtml(sector ? sector.nome : "-")}</td>
                      <td>${event.severidade}</td>
                      <td>${event.visivelParaRH ? "sim" : "nao"}</td>
                    </tr>`;
                  })
                  .join("")
              : '<tr><td colspan="5">Nenhum evento de compliance registrado.</td></tr>'}
          </tbody>
        </table>
      </section>
    </div>
  </main>
</body>
</html>`;
}

function metric(label, initial, final) {
  const roundedInitial = Math.round(initial);
  const roundedFinal = Math.round(final);
  const delta = roundedFinal - roundedInitial;
  return `<div class="metric">
    <div class="label">${label}</div>
    <div class="value">${roundedFinal}</div>
    <div class="delta">inicial ${roundedInitial} · delta ${delta >= 0 ? "+" : ""}${delta}</div>
    <div class="bar" style="--value: ${Math.max(0, Math.min(100, roundedFinal))}%"><span></span></div>
  </div>`;
}

function metricMoney(label, initial, final) {
  const delta = final - initial;
  return `<div class="metric">
    <div class="label">${label}</div>
    <div class="value">${formatMoney(final)}</div>
    <div class="delta">delta ${delta >= 0 ? "+" : ""}${formatMoney(delta)}</div>
    <div class="bar" style="--value: 100%"><span></span></div>
  </div>`;
}

function formatRiskValue(value, inverse) {
  const rounded = Math.round(value);
  const critical = inverse ? rounded < 30 : rounded > 75;
  const warning = inverse ? rounded < 45 : rounded > 60;
  const className = critical ? "risk" : warning ? "warn" : "";
  return className ? `<span class="${className}">${rounded}</span>` : String(rounded);
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCargo(cargoFormal) {
  if (!cargoFormal) return "-";
  if (typeof cargoFormal === "string") return cargoFormal;
  return cargoFormal.nome || "-";
}

if (require.main === module) {
  const seed = process.argv[2] || "RH-TECNICO-001";
  const requestedDays = Number.parseInt(process.argv[3], 10);
  generateTechnicalScreen(seed, Number.isFinite(requestedDays) ? requestedDays : 30);
}

module.exports = {
  generateTechnicalScreen,
};
