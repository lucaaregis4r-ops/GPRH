import * as Phaser from "/vendor/phaser.esm.js";
import { endDay, playDailyAction, unlockTechnology, upgradeTechnology } from "../api/rhGameClient.js";
import { GPRHTheme } from "../theme/gprhTheme.js";
import { createPixelButton, drawPixelPanel } from "../ui/pixelUi.js";

const TABS = [
  { id: "resumo", label: "Resumo" },
  { id: "demandas", label: "Demandas" },
  { id: "sinais", label: "Sinais" },
  { id: "pessoas", label: "Pessoas" },
  { id: "decisoes", label: "Decisoes" },
  { id: "dashboard", label: "Dashboard" },
  { id: "projetos", label: "Projetos" },
];

export class NotebookScene extends Phaser.Scene {
  constructor() {
    super("NotebookScene");
    this.activeTab = "resumo";
    this.busy = false;
  }

  create(data) {
    this.snapshot = data.snapshot;
    this.location = data.location || null;
    this.message = data.message || "";
    this.activeTab = data.activeTab || this.activeTab || "resumo";
    this.selectedEmployeeId = data.selectedEmployeeId || this.selectedEmployeeId || null;
    this.peoplePage = Number.isInteger(this.peoplePage) ? this.peoplePage : 0;
    this.demandFilter = this.demandFilter || "todas";
    this.demandQuery = this.demandQuery || "";
    this.selectedDecisionType = data.selectedDecisionType || this.selectedDecisionType || null;
    this.selectedDecisionId = data.selectedDecisionId || this.selectedDecisionId || null;
    this.decisionPage = Number.isInteger(this.decisionPage) ? this.decisionPage : 0;
    this.decisionFilter = this.decisionFilter || "todas";
    this.decisionQuery = this.decisionQuery || "";
    this.busy = false;

    this.width = Math.min(840, this.scale.width - 64);
    this.height = Math.min(560, this.scale.height - 64);
    this.x = this.scale.width / 2 - this.width / 2;
    this.y = this.scale.height / 2 - this.height / 2;

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, GPRHTheme.colors.bg, 0.42).setOrigin(0, 0);
    drawPixelPanel(this, this.x, this.y, this.width, this.height, { depth: 4 });
    this.add.text(this.x + 20, this.y + 18, "Caderno do RH", {
      fontFamily: GPRHTheme.font.family,
      fontSize: "22px",
      color: GPRHTheme.colors.cream,
    }).setDepth(10);

    this.tabGroup = this.add.group();
    this.renderTabs();
    this.contentGroup = this.add.group();
    this.feedbackText = this.add.text(this.x + 22, this.y + this.height - 58, this.message, {
      fontFamily: GPRHTheme.font.family,
      fontSize: "13px",
      color: this.message ? GPRHTheme.colors.cream : GPRHTheme.colors.muted,
      wordWrap: { width: this.width - 44 },
    }).setDepth(10);
    this.renderActiveTab();

    this.add.text(this.x + 22, this.y + this.height - 30, "Esc ou Tab para voltar", {
      fontFamily: GPRHTheme.font.family,
      fontSize: "13px",
      color: GPRHTheme.colors.muted,
    }).setDepth(10);

    this.input.keyboard.once("keydown-ESC", () => this.close());
    this.input.keyboard.once("keydown-TAB", () => this.close());
    this.input.keyboard.on("keydown", this.handleDemandSearchKey, this);
    this.input.keyboard.on("keydown", this.handleDecisionSearchKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard.off("keydown", this.handleDemandSearchKey, this);
      this.input.keyboard.off("keydown", this.handleDecisionSearchKey, this);
    });
  }

  renderTabs() {
    this.tabGroup.clear(true, true);
    TABS.forEach((tab, index) => {
      const tabText = this.add
        .text(this.x + 22 + index * 112, this.y + 58, tab.label, {
          fontFamily: GPRHTheme.font.family,
          fontSize: "14px",
          color: tab.id === this.activeTab ? "#ffffff" : GPRHTheme.colors.cream,
          backgroundColor: tab.id === this.activeTab ? "#D92736" : "#242424",
          padding: { x: 12, y: 7 },
          fixedWidth: 98,
          align: "center",
        })
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.activeTab = tab.id;
          this.renderActiveTab();
          this.renderTabs();
        });
      tabText.setDepth(5);
      this.tabGroup.add(tabText);
    });
  }

  renderActiveTab() {
    this.contentGroup.clear(true, true);
    const contentX = this.x + 24;
    const contentY = this.y + 104;

    if (this.activeTab === "resumo") this.renderSummary(contentX, contentY);
    if (this.activeTab === "demandas") this.renderDemands(contentX, contentY);
    if (this.activeTab === "sinais") this.renderSignals(contentX, contentY);
    if (this.activeTab === "pessoas") this.renderPeople(contentX, contentY);
    if (this.activeTab === "decisoes") this.renderDecisions(contentX, contentY);
    if (this.activeTab === "dashboard") this.renderDashboard(contentX, contentY);
    if (this.activeTab === "projetos") this.renderProjects(contentX, contentY);
  }

  renderSummary(x, y) {
    const agenda = this.snapshot.playerKnowledge.agenda;
    const time = agenda.tempoDia;
    const demands = countPendingDemands(this.snapshot);
    const briefing = this.snapshot.playerKnowledge.briefing;
    const cardWidth = Math.floor((this.width - 66) / 3);

    this.addCard(x, y, cardWidth, 86, "Empresa", `${this.snapshot.company.nome}\n${this.snapshot.company.segmento}`);
    this.addCard(
      x + cardWidth + 9,
      y,
      cardWidth,
      86,
      "Expediente",
      time ? `${time.horaAtual} ate ${time.horaFim}\n${time.tempoRestanteMin} min restantes` : "Horario indisponivel"
    );
    this.addCard(
      x + (cardWidth + 9) * 2,
      y,
      cardWidth,
      86,
      "Atencao",
      `${demands} demanda(s)\n${this.snapshot.playerKnowledge.visibleSignals.length} sinal(is)`
    );

    this.addCard(
      x,
      y + 104,
      this.width - 48,
      120,
      "Leitura do dia",
      [
        `Local atual: ${this.location?.label || "Corredor"}`,
        `Energia semanal RH: ${agenda.energiaAtual}/${agenda.energiaSemanal}`,
        time ? `Energia diaria: ${time.energiaDiaria} | Foco: ${time.focoDiario}` : "",
        `Projetos diarios em andamento: ${agenda.projetosDiarios.length}`,
        "",
        briefing?.resumo || "Sem briefing resumido disponivel.",
      ]
        .filter(Boolean)
        .join("\n")
    );
    const today = this.snapshot.playerKnowledge.hoje;
    this.addCard(
      x,
      y + 238,
      this.width - 48,
      106,
      today?.titulo || "Prioridades de hoje",
      [
        ...(today?.priorities || []).slice(0, 3).map((item) => `${priorityLabel(item.prioridade)} ${item.label}`),
        `Dica: ${today?.tutorialHint || "Observe, investigue e so depois intervenha."}`,
      ].join("\n")
    );
    this.addButton(x, this.y + this.height - 98, "Encerrar dia", () => this.handleEndDay(), 150);
  }

  renderSignals(x, y) {
    const signals = this.snapshot.playerKnowledge.visibleSignals.slice(-8).reverse();
    if (signals.length === 0) {
      this.addContentText(x, y, "Nenhum sinal recente visivel.", 15, "#334155", this.width - 48);
      return;
    }

    signals.slice(0, 5).forEach((signal, index) => {
      const confidence = signal.confiabilidade ? `confiabilidade ${signal.confiabilidade}` : "confiabilidade incerta";
      this.addCard(x, y + index * 72, this.width - 48, 62, `Dia ${signal.dia} | ${signal.tipo}`, `${confidence}\n${signal.descricao}`);
    });
  }

  renderDemands(x, y) {
    const allDemands = this.snapshot.playerKnowledge.demandas || [];
    const priorityFiltered = this.demandFilter === "criticas"
      ? allDemands.filter((demand) => demand.prioridade >= 3)
      : allDemands;
    const query = normalizeSearch(this.demandQuery);
    const demands = priorityFiltered.filter((demand) => {
      if (!query) return true;
      const sector = this.snapshot.world.sectors.find((item) => item.id === demand.sectorId);
      return normalizeSearch(`${demand.employeeName} ${demandLabel(demand.tipo)} ${sector?.nome || ""}`).includes(query);
    });
    this.addContentText(x, y, `Fila de demandas | ${demands.length} exibida(s)`, 15, GPRHTheme.colors.cream, this.width - 48);
    this.addButton(x, y + 28, "Todas", () => {
      this.demandFilter = "todas";
      this.renderActiveTab();
    }, 92);
    this.addButton(x + 102, y + 28, "Criticas", () => {
      this.demandFilter = "criticas";
      this.renderActiveTab();
    }, 100);
    this.addContentText(x + 220, y + 34, `Busca: ${this.demandQuery || "digite nome, tipo ou setor"}`, 12, GPRHTheme.colors.muted, this.width - 268);

    if (demands.length === 0) {
      this.addCard(x, y + 76, this.width - 48, 74, "Fila vazia", "Nenhuma demanda corresponde ao filtro atual.");
      return;
    }

    demands.slice(0, 4).forEach((demand, index) => {
      const rowY = y + 76 + index * 78;
      const prazo = demand.prazoRespostaDias == null ? "sem prazo" : `${demand.prazoRespostaDias}d de prazo`;
      this.addCard(
        x,
        rowY,
        this.width - 190,
        68,
        `${priorityLabel(demand.prioridade)} | ${demand.employeeName}`,
        `${demandLabel(demand.tipo)} | aberta ha ${demand.diasEmAberto}d | ${prazo}\nFonte: pedido direto do funcionario`
      );
      this.addButton(x + this.width - 176, rowY + 16, "Atender", () => this.handleDemand(demand), 128);
    });
  }

  renderPeople(x, y) {
    const employees = this.snapshot.playerKnowledge.employees;
    const pageSize = 6;
    const pageCount = Math.max(1, Math.ceil(employees.length / pageSize));
    this.peoplePage = Math.max(0, Math.min(this.peoplePage, pageCount - 1));
    const visible = employees.slice(this.peoplePage * pageSize, (this.peoplePage + 1) * pageSize);
    const listWidth = 260;

    this.addContentText(x, y, `Equipe | pagina ${this.peoplePage + 1}/${pageCount}`, 15, GPRHTheme.colors.cream, listWidth);
    visible.forEach((employee, index) => {
      this.addButton(x, y + 30 + index * 42, employee.nome, () => {
        this.selectedEmployeeId = employee.id;
        this.renderActiveTab();
      }, listWidth);
    });
    if (this.peoplePage > 0) this.addButton(x, y + 292, "Anterior", () => {
      this.peoplePage -= 1;
      this.renderActiveTab();
    }, 120);
    if (this.peoplePage < pageCount - 1) this.addButton(x + 132, y + 292, "Proxima", () => {
      this.peoplePage += 1;
      this.renderActiveTab();
    }, 120);

    const selected = employees.find((employee) => employee.id === this.selectedEmployeeId);
    if (!selected) {
      this.addCard(x + 280, y, this.width - 328, 160, "Ficha individual", "Selecione uma pessoa para ver a ficha e definir explicitamente o alvo das acoes.");
      return;
    }
    const perception = selected.percepcaoRH;
    const ledger = (this.snapshot.playerKnowledge.ledgerConhecimento?.pessoas || []).find((item) => item.employeeId === selected.id);
    const sector = this.snapshot.world.sectors.find((item) => item.id === selected.setorId);
    this.addCard(
      x + 280,
      y,
      this.width - 328,
      186,
      selected.nome,
      `${selected.cargo} | ${sector?.nome || "setor desconhecido"}\n` +
        `Sobrecarga estimada ${perception.sobrecargaEstimada}\nEngajamento estimado ${perception.engajamentoEstimado}\nRisco de saida estimado ${perception.riscoSaidaEstimado}\n` +
        `Confiabilidade ${ledger?.confiabilidade ?? perception.confiabilidadeGeral}% | fonte: ${sourceLabel(ledger?.fonte)}`
    );
    this.addCard(
      x + 280,
      y + 200,
      this.width - 328,
      106,
      "Demandas conhecidas",
      selected.demandasPendentes.length
        ? selected.demandasPendentes.map((demand) => `${priorityLabel(demand.prioridade)} ${demandLabel(demand.tipo)} (${demand.diasEmAberto}d)`).join("\n")
        : "Nenhuma demanda visivel. Ausencia de sinal nao significa ausencia de problema."
    );
  }

  renderDashboard(x, y) {
    const dashboard = this.snapshot.playerKnowledge.dashboard;
    const base = dashboard.baseline || {};
    const cardWidth = Math.floor((this.width - 62) / 2);

    this.addCard(
      x,
      y,
      cardWidth,
      84,
      "Cobertura",
      `Pessoas ${metricValue(base.employeeCount)} | Setores ${metricValue(base.sectorCount)}\nSinais ${metricValue(base.discoveredSignals)} | Demandas ${metricValue(base.pendingDemands)}`
    );
    this.addCard(
      x + cardWidth + 10,
      y,
      cardWidth,
      84,
      dashboard.available ? `Dashboard nivel ${dashboard.level}` : "Dashboard bloqueado",
      dashboard.available
        ? `Confiabilidade ${dashboard.reliability}%\nDados agregados disponiveis`
        : "Desbloqueie Dashboard Basico para medias de clima, carga e risco."
    );

    if (!dashboard.available || !dashboard.basic) {
      this.addCard(x, y + 104, this.width - 48, 84, "Leitura disponivel", "Sem dashboard, o RH depende de observacao direta, sinais descobertos e conversas.");
      this.renderTechList(x, y + 208);
      return;
    }

    const basic = dashboard.basic;
    this.addCard(
      x,
      y + 104,
      cardWidth,
      112,
      "Indicadores humanos",
      `Sobrecarga ${metricValue(basic.averageOverload)}\nSatisfacao ${metricValue(basic.averageSatisfaction)}\nConfianca RH ${metricValue(basic.averageRhTrust)}`
    );
    this.addCard(
      x + cardWidth + 10,
      y + 104,
      cardWidth,
      112,
      "Risco e produtividade",
      `Risco saida ${metricValue(basic.averageTurnoverRisk)}\nProdutividade ${metricValue(basic.averageProductivity)}`
    );

    if (dashboard.intermediate) {
      const work = dashboard.intermediate;
      this.addCard(
        x,
        y + 236,
        cardWidth,
        116,
        "Trabalho sustentavel",
        `Entrega ${metricValue(work.averageDeliveryCapacity)}\nQualidade ${metricValue(work.averageDeliveryQuality)}\nSustentabilidade ${metricValue(work.averageWorkSustainability)}`
      );
      this.addCard(
        x + cardWidth + 10,
        y + 236,
        cardWidth,
        116,
        "Alertas",
        (work.trendAlerts || []).slice(0, 3).join("\n")
      );
    } else {
      this.addCard(x, y + 236, this.width - 48, 78, "Nivel intermediario bloqueado", "Evolua o dashboard para ver entrega, qualidade, sustentabilidade e setores tensionados.");
    }
  }

  renderDecisions(x, y) {
    const catalog = this.snapshot.playerKnowledge.decisionCatalog || { total: 0, options: [] };
    const query = normalizeSearch(this.decisionQuery);
    const filtered = catalog.options.filter((option) => {
      if (this.decisionFilter !== "todas" && option.fase !== this.decisionFilter) return false;
      if (!query) return true;
      return normalizeSearch(`${option.nome} ${option.targetName} ${option.targetType}`).includes(query);
    });
    const pageSize = 5;
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    this.decisionPage = Math.max(0, Math.min(this.decisionPage, pageCount - 1));
    const page = filtered.slice(this.decisionPage * pageSize, (this.decisionPage + 1) * pageSize);
    const listWidth = 310;

    this.addContentText(x, y, `Catalogo contextual: ${catalog.total} decisoes | ${filtered.length} exibida(s)`, 14, GPRHTheme.colors.cream, this.width - 48);
    [
      { id: "todas", label: "Todas", width: 78 },
      { id: "investigacao", label: "Investigar", width: 104 },
      { id: "intervencao", label: "Intervir", width: 92 },
    ].forEach((filter, index) => {
      const offset = [0, 88, 202][index];
      this.addButton(x + offset, y + 28, filter.label, () => {
        this.decisionFilter = filter.id;
        this.decisionPage = 0;
        this.renderActiveTab();
      }, filter.width);
    });
    this.addContentText(x, y + 66, `Busca: ${this.decisionQuery || "digite acao, pessoa ou setor"}`, 12, GPRHTheme.colors.muted, listWidth);

    page.forEach((decision, index) => {
      this.addButton(x, y + 92 + index * 40, truncateLabel(`${phaseTag(decision.fase)} ${decision.nome} - ${decision.targetName}`, 39), () => {
        this.selectedDecisionId = decision.id;
        this.selectedDecisionType = decision.tipo;
        this.renderActiveTab();
      }, listWidth);
    });
    if (this.decisionPage > 0) this.addButton(x, y + 300, "Anterior", () => {
      this.decisionPage -= 1;
      this.renderActiveTab();
    }, 102);
    this.addContentText(x + 112, y + 308, `${this.decisionPage + 1}/${pageCount}`, 12, GPRHTheme.colors.muted, 60);
    if (this.decisionPage < pageCount - 1) this.addButton(x + 172, y + 300, "Proxima", () => {
      this.decisionPage += 1;
      this.renderActiveTab();
    }, 102);

    const selectedOption = catalog.options.find((decision) => decision.id === this.selectedDecisionId);
    const selected = selectedOption ? decorateCatalogDecision(this.snapshot, selectedOption, this.location) : null;
    if (!selected) {
      this.addCard(x + 330, y + 66, this.width - 378, 188, "Previa obrigatoria", "Escolha uma decisao do catalogo. Busca e filtros permitem encontrar centenas de combinacoes sem escolher alvos automaticamente.");
      return;
    }

    const action = selected.action;
    const targetName = selected.targetName;
    const duration = decisionDuration(action);
    const riskText = action.riscos.length ? action.riscos.map(humanizeKey).join(", ") : "risco nao identificado";
    const effectText = action.efeitosEsperados.length ? action.efeitosEsperados.map(humanizeKey).join(", ") : "efeito incerto";
    this.addCard(
      x + 330,
      y + 66,
      this.width - 378,
      220,
      action.nome,
      `Alvo: ${targetName}\nFase: ${selected.fase} | Local: ${locationLabel(action.tempo?.exigeLocal)}\n` +
        `Diagnostico: ${selected.diagnostico.texto} (${selected.diagnostico.confiabilidade}%)\n` +
        `Custo: ${action.custoEnergia} energia, $${action.custoFinanceiro} | Tempo: ${duration} min\n` +
        `Expectativa: ${effectText}\nRiscos: ${riskText}\n` +
        `Confianca da hipotese: ${selected.diagnostico.confiabilidade}%`
    );
    this.addButton(
      x + 330,
      y + 300,
      selected.availableHere ? "Confirmar decisao" : "Local inadequado",
      () => this.handleDecision(selected),
      this.width - 378
    );
  }

  renderTechList(x, y) {
    const techs = (this.snapshot.playerKnowledge.technologies || []).slice(0, 7);
    this.addContentText(x, y, "Tecnologias de RH", 14, GPRHTheme.colors.cream, this.width - 48);
    const summary = techs.map((tech) => `${tech.unlocked ? "OK" : "--"} ${tech.name}: nivel ${tech.level}/${tech.maxLevel}`).join("\n");
    this.addCard(x, y + 26, this.width - 48, 118, "Maturidade de informacao", summary);

    const dashboard = techs.find((tech) => tech.id === "basic_dashboard");
    const orgChart = techs.find((tech) => tech.id === "org_chart");
    if (dashboard && !dashboard.unlocked) {
      this.addButton(x, y + 160, "Desbloquear Dashboard Basico", () => this.handleTechnology("unlock", dashboard.id), 250);
    } else if (dashboard && dashboard.level < dashboard.maxLevel) {
      this.addButton(x, y + 160, "Evoluir Dashboard", () => this.handleTechnology("upgrade", dashboard.id), 190);
    }
    if (orgChart && !orgChart.unlocked) {
      this.addButton(x + 270, y + 160, "Desbloquear Organograma", () => this.handleTechnology("unlock", orgChart.id), 230);
    } else if (orgChart && orgChart.level < orgChart.maxLevel) {
      this.addButton(x + 270, y + 160, "Evoluir Organograma", () => this.handleTechnology("upgrade", orgChart.id), 200);
    }
  }

  renderProjects(x, y) {
    const agenda = this.snapshot.playerKnowledge.agenda;
    const dailyProjects = agenda.projetosDiarios;
    const projectActions = buildProjectActions(this.snapshot, this.location, this.selectedEmployeeId).slice(0, 4);
    this.addContentText(x, y, "Projetos em andamento", 15, GPRHTheme.colors.cream, this.width - 48);
    if (dailyProjects.length === 0) {
      this.addCard(x, y + 30, this.width - 48, 72, "Nenhum projeto", "Use uma sala compativel para iniciar um bloco de trabalho.");
    } else {
      dailyProjects.slice(0, 3).forEach((project, index) => {
        this.addCard(x, y + 30 + index * 78, this.width - 48, 68, project.nome, `${project.progressoMin}/${project.tempoIdealMin} min | ${project.status}`);
        this.addProgressBar(x + 16, y + 78 + index * 78, this.width - 80, project.progressoMin, project.tempoIdealMin);
      });
    }

    this.addContentText(x, y + 270, "Investir 60 min em:", 14, GPRHTheme.colors.muted, this.width - 48);

    if (projectActions.length === 0) {
      this.addCard(x, y + 300, this.width - 48, 60, "Local sem projeto", "Tente a mesa do RH, sala de reuniao ou diretoria.");
      return;
    }

    projectActions.forEach((action, index) => {
      this.addButton(x, y + 300 + index * 36, action.nome, () => this.investInProject(action), this.width - 48);
    });
  }

  addContentText(x, y, text, fontSize, color, width) {
    const item = this.add.text(x, y, text, {
      fontFamily: GPRHTheme.font.family,
      fontSize: `${fontSize}px`,
      color: color === "#334155" || color === "#64748b" ? GPRHTheme.colors.cream : color,
      lineSpacing: 7,
      wordWrap: { width },
    }).setDepth(10);
    this.contentGroup.add(item);
    return item;
  }

  addCard(x, y, width, height, title, body) {
    const bg = this.add.rectangle(x, y, width, height, GPRHTheme.colors.surface, 0.92).setOrigin(0, 0).setDepth(7);
    const border = this.add.rectangle(x, y, width, height).setOrigin(0, 0).setStrokeStyle(1, GPRHTheme.colors.borderLight, 0.85).setDepth(8);
    const marker = this.add.rectangle(x + 6, y + 6, 6, 6, GPRHTheme.colors.red, 1).setOrigin(0, 0).setDepth(9);
    const titleText = this.add
      .text(x + 16, y + 10, title, {
        fontFamily: GPRHTheme.font.family,
        fontSize: "14px",
        color: GPRHTheme.colors.cream,
        wordWrap: { width: width - 28 },
      })
      .setDepth(10);
    const bodyText = this.add
      .text(x + 16, y + 32, body, {
        fontFamily: GPRHTheme.font.family,
        fontSize: "12px",
        color: GPRHTheme.colors.muted,
        lineSpacing: 4,
        wordWrap: { width: width - 28 },
      })
      .setDepth(10);
    [bg, border, marker, titleText, bodyText].forEach((item) => this.contentGroup.add(item));
  }

  addProgressBar(x, y, width, value, max) {
    const ratio = Math.max(0, Math.min(1, max ? value / max : 0));
    const back = this.add.rectangle(x, y, width, 8, GPRHTheme.colors.panel, 1).setOrigin(0, 0).setDepth(9);
    const fill = this.add.rectangle(x, y, Math.max(4, width * ratio), 8, GPRHTheme.colors.red, 1).setOrigin(0, 0).setDepth(10);
    this.contentGroup.add(back);
    this.contentGroup.add(fill);
  }

  addButton(x, y, label, callback, width) {
    const button = createPixelButton(this, x, y, label, callback, { width, primary: label === "Encerrar dia" });
    button.setDepth(10);
    this.contentGroup.add(button);
    return button;
  }

  async investInProject(action) {
    if (this.busy) return;
    this.busy = true;
    this.feedbackText.setText("Registrando bloco de projeto...");

    try {
      const response = await playDailyAction({
        tipo: action.tipo,
        alvo: action.alvo,
        tempoInvestidoMin: 60,
        modo: "projeto",
      });
      this.applySnapshotAndRestart(response.snapshot, `${response.result.nome}: bloco de 60 min registrado.`, "projetos");
    } catch (error) {
      this.busy = false;
      this.feedbackText.setColor("#a33b2d");
      this.feedbackText.setText(`Nao foi possivel investir no projeto: ${error.message}`);
    }
  }

  async handleDemand(demand) {
    if (this.busy) return;
    const tipo = demandActionType(demand.tipo);
    if (!tipo) {
      this.feedbackText.setText("Esta demanda ainda nao possui resposta jogavel.");
      return;
    }
    this.busy = true;
    this.feedbackText.setText(`Atendendo ${demand.employeeName}...`);
    try {
      const response = await playDailyAction({
        tipo,
        alvo: { employeeId: demand.employeeId },
        tempoInvestidoMin: 30,
      });
      this.selectedEmployeeId = demand.employeeId;
      this.applySnapshotAndRestart(response.snapshot, `${demand.employeeName}: demanda atendida.`, "demandas");
    } catch (error) {
      this.busy = false;
      this.feedbackText.setColor("#a33b2d");
      this.feedbackText.setText(`Nao foi possivel atender a demanda: ${error.message}`);
    }
  }

  async handleDecision(decision) {
    if (this.busy) return;
    if (!decision.availableHere) {
      this.feedbackText.setText(`Va para ${locationLabel(decision.action.tempo?.exigeLocal)} antes de confirmar.`);
      return;
    }
    this.busy = true;
    this.feedbackText.setText(`Executando ${decision.nome} para ${decision.targetName}...`);
    try {
      const isProject = decision.action.tempo?.tipo === "projeto";
      const response = await playDailyAction({
        tipo: decision.tipo,
        alvo: decision.alvo,
        diagnostico: decision.diagnostico,
        tempoInvestidoMin: decisionDuration(decision.action),
        ...(isProject ? { modo: "projeto" } : {}),
      });
      const message = isProject
        ? `${decision.nome}: bloco registrado; acompanhe o progresso antes de concluir.`
        : `${decision.nome}: executada; acompanhe sinais e o relatorio do dia.`;
      this.applySnapshotAndRestart(response.snapshot, message, "decisoes");
    } catch (error) {
      this.busy = false;
      this.feedbackText.setColor("#a33b2d");
      this.feedbackText.setText(`Nao foi possivel confirmar a decisao: ${error.message}`);
    }
  }

  handleDemandSearchKey(event) {
    if (this.activeTab !== "demandas" || this.busy) return;
    if (event.key === "Backspace") {
      this.demandQuery = this.demandQuery.slice(0, -1);
      this.renderActiveTab();
      return;
    }
    if (event.key.length === 1 && /[a-zA-Z0-9 -]/.test(event.key) && this.demandQuery.length < 32) {
      this.demandQuery += event.key;
      this.renderActiveTab();
    }
  }

  handleDecisionSearchKey(event) {
    if (this.activeTab !== "decisoes" || this.busy) return;
    if (event.key === "Backspace") {
      this.decisionQuery = this.decisionQuery.slice(0, -1);
      this.decisionPage = 0;
      this.renderActiveTab();
      return;
    }
    if (event.key.length === 1 && /[a-zA-Z0-9 -]/.test(event.key) && this.decisionQuery.length < 40) {
      this.decisionQuery += event.key;
      this.decisionPage = 0;
      this.renderActiveTab();
    }
  }

  async handleEndDay() {
    if (this.busy) return;
    this.busy = true;
    this.feedbackText.setText("Encerrando dia...");

    try {
      const response = await endDay();
      const officeScene = this.scene.get("OfficeScene");
      if (officeScene && typeof officeScene.applySnapshot === "function") {
        officeScene.applySnapshot(response.snapshot);
      }
      this.scene.start("ReportScene", { snapshot: response.snapshot, report: response.report });
    } catch (error) {
      this.busy = false;
      this.feedbackText.setColor("#a33b2d");
      this.feedbackText.setText(`Nao foi possivel encerrar o dia: ${error.message}`);
    }
  }

  async handleTechnology(mode, techId) {
    if (this.busy) return;
    this.busy = true;
    this.feedbackText.setText("Atualizando tecnologia organizacional...");

    try {
      const response = mode === "upgrade" ? await upgradeTechnology(techId) : await unlockTechnology(techId);
      this.applySnapshotAndRestart(response.snapshot, `Tecnologia atualizada: ${response.result.id} nivel ${response.result.level}.`, "dashboard");
    } catch (error) {
      this.busy = false;
      this.feedbackText.setColor("#a33b2d");
      this.feedbackText.setText(`Nao foi possivel atualizar tecnologia: ${error.message}`);
    }
  }

  applySnapshotAndRestart(snapshot, message, activeTab) {
    const officeScene = this.scene.get("OfficeScene");
    if (officeScene && typeof officeScene.applySnapshot === "function") {
      officeScene.applySnapshot(snapshot);
    }
    this.scene.restart({
      snapshot,
      message,
      activeTab,
      location: this.location,
      selectedEmployeeId: this.selectedEmployeeId,
      selectedDecisionType: this.selectedDecisionType,
      selectedDecisionId: this.selectedDecisionId,
    });
  }

  close() {
    this.scene.stop();
    this.scene.resume("OfficeScene");
  }
}

function countPendingDemands(snapshot) {
  return snapshot.playerKnowledge.employees.reduce((sum, employee) => sum + employee.demandasPendentes.length, 0);
}

function metricValue(metric) {
  if (metric && typeof metric === "object" && Object.prototype.hasOwnProperty.call(metric, "value")) {
    return `${metric.value} (${metric.reliability}%)`;
  }
  return String(metric ?? "-");
}

function buildProjectActions(snapshot, location, selectedEmployeeId = null) {
  const selectedSector = snapshot.world.sectors.find((sector) => sector.id === location?.sectorId);
  const selectedEmployee = snapshot.playerKnowledge.employees.find((employee) => employee.id === selectedEmployeeId);

  return (snapshot.actionAvailability || [])
    .filter((action) => action.tempo?.tipo === "projeto")
    .filter((action) => isAllowedAtLocation(action, location))
    .map((action) => {
      const alvo = targetForAction(action, selectedSector, selectedEmployee);
      if (!alvo) return null;
      return { tipo: action.tipo, nome: action.nome, alvo };
    })
    .filter(Boolean);
}

function priorityLabel(priority) {
  return priority >= 3 ? "CRITICA" : priority >= 2 ? "ALTA" : "NORMAL";
}

function demandLabel(type) {
  return ({ conversa: "Pedido de conversa", aumento_ou_promocao: "Pedido de carreira" })[type] || type.replaceAll("_", " ");
}

function demandActionType(type) {
  return ({ conversa: "responder_pedido_conversa", aumento_ou_promocao: "responder_pedido_carreira" })[type] || null;
}

function sourceLabel(source) {
  return ({ percepcao_rh: "percepcao do RH", observacao_do_rh: "observacao do RH" })[source] || source || "fonte desconhecida";
}

function normalizeSearch(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function decorateCatalogDecision(snapshot, option, location) {
  const employeeId = option.alvo?.employeeId;
  const employee = snapshot.playerKnowledge.employees.find((item) => item.id === employeeId);
  const sector = snapshot.world.sectors.find((item) => item.id === option.sectorId);
  const action = (snapshot.actionAvailability || []).find((item) => item.tipo === option.tipo);
  if (!action) return null;
  return {
    ...option,
    action,
    diagnostico: buildDecisionDiagnosis(employee, sector, option),
    availableHere: isDecisionAllowedAtLocation({ ...action, sectorId: option.sectorId }, location),
  };
}

function buildDecisionDiagnosis(employee, sector, option) {
  if (option.fase === "investigacao") {
    return {
      texto: `informacao ainda insuficiente sobre ${option.targetName}; investigar antes de concluir`,
      confiabilidade: option.confiabilidadeHipotese,
      employeeId: employee?.id || null,
      sectorId: sector?.id || null,
    };
  }
  if (employee) {
    const perception = employee.percepcaoRH;
    const dominant = perception.sobrecargaEstimada >= perception.riscoSaidaEstimado ? "sobrecarga percebida" : "risco de saida percebido";
    return {
      texto: `${dominant} em ${employee.nome}`,
      confiabilidade: perception.confiabilidadeGeral,
      employeeId: employee.id,
      sectorId: employee.setorId,
    };
  }
  return {
    texto: `tensao setorial percebida em ${sector?.nome || "setor"}`,
    confiabilidade: 35,
    sectorId: sector?.id || null,
  };
}

function isDecisionAllowedAtLocation(option, location) {
  const required = option.tempo?.exigeLocal || "qualquer";
  if (required === "setor") return Boolean(option.sectorId && location?.sectorId === option.sectorId);
  return isAllowedAtLocation(option, location);
}

function phaseTag(phase) {
  return phase === "investigacao" ? "[I]" : "[A]";
}

function truncateLabel(value, max) {
  const text = String(value || "");
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function decisionDuration(action) {
  if (action.tempo?.tipo === "projeto") return 60;
  const durations = action.tempo?.duracoesPermitidasMin || [30];
  return durations.includes(action.tempo?.tempoIdealMin) ? action.tempo.tempoIdealMin : durations[0];
}

function humanizeKey(value) {
  return String(value || "").replaceAll("_", " ");
}

function locationLabel(value) {
  return ({ qualquer: "qualquer local", setor: "o setor alvo", mesa_rh: "a mesa do RH", sala_reuniao: "a sala de reuniao" })[value] || value || "qualquer local";
}

function isAllowedAtLocation(action, location) {
  const required = action.tempo?.exigeLocal || "qualquer";
  if (required === "qualquer") return true;
  if (action.requerAprovacaoDiretoria && location?.roomId === "diretoria") return true;
  if (required === "mesa_rh") return location?.roomId === "rh";
  if (required === "sala_reuniao") return location?.roomId === "reuniao";
  if (required === "setor") return Boolean(location?.sectorId || location?.roomType === "setor");
  return true;
}

function targetForAction(action, selectedSector, selectedEmployee) {
  if (action.alvo === "setor" && selectedSector) return { sectorId: selectedSector.id };
  if (action.alvo === "funcionario" && selectedEmployee) return { employeeId: selectedEmployee.id };
  if (action.alvo === "empresa") return {};
  return null;
}
