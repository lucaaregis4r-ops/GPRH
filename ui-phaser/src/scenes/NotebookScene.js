import * as Phaser from "/vendor/phaser.esm.js";
import { endDay, playDailyAction } from "../api/rhGameClient.js";
import { GPRHTheme } from "../theme/gprhTheme.js";
import { createPixelButton, drawPixelPanel } from "../ui/pixelUi.js";

const TABS = [
  { id: "resumo", label: "Resumo" },
  { id: "sinais", label: "Sinais" },
  { id: "pessoas", label: "Pessoas" },
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
  }

  renderTabs() {
    this.tabGroup.clear(true, true);
    TABS.forEach((tab, index) => {
      const tabText = this.add
        .text(this.x + 22 + index * 118, this.y + 58, tab.label, {
          fontFamily: GPRHTheme.font.family,
          fontSize: "14px",
          color: tab.id === this.activeTab ? "#ffffff" : GPRHTheme.colors.cream,
          backgroundColor: tab.id === this.activeTab ? "#D92736" : "#242424",
          padding: { x: 12, y: 7 },
          fixedWidth: 104,
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
    if (this.activeTab === "sinais") this.renderSignals(contentX, contentY);
    if (this.activeTab === "pessoas") this.renderPeople(contentX, contentY);
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

  renderPeople(x, y) {
    const employees = this.snapshot.playerKnowledge.employees.slice(0, 6);
    const cardWidth = Math.floor((this.width - 62) / 2);
    employees.forEach((employee, index) => {
      const demandText = employee.demandasPendentes.length > 0 ? `${employee.demandasPendentes.length} demanda(s)` : "sem demanda visivel";
      const perception = employee.percepcaoRH;
      const cardX = x + (index % 2) * (cardWidth + 10);
      const cardY = y + Math.floor(index / 2) * 96;
      this.addCard(
        cardX,
        cardY,
        cardWidth,
        86,
        employee.nome,
        `${employee.cargo}\n${demandText}\nSobrecarga ${perception.sobrecargaEstimada} | Conf. ${perception.confiabilidadeGeral}`
      );
    });
  }

  renderProjects(x, y) {
    const agenda = this.snapshot.playerKnowledge.agenda;
    const dailyProjects = agenda.projetosDiarios;
    const projectActions = buildProjectActions(this.snapshot, this.location).slice(0, 4);
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

  applySnapshotAndRestart(snapshot, message, activeTab) {
    const officeScene = this.scene.get("OfficeScene");
    if (officeScene && typeof officeScene.applySnapshot === "function") {
      officeScene.applySnapshot(snapshot);
    }
    this.scene.restart({ snapshot, message, activeTab, location: this.location });
  }

  close() {
    this.scene.stop();
    this.scene.resume("OfficeScene");
  }
}

function countPendingDemands(snapshot) {
  return snapshot.playerKnowledge.employees.reduce((sum, employee) => sum + employee.demandasPendentes.length, 0);
}

function buildProjectActions(snapshot, location) {
  const firstSector = snapshot.world.sectors.find((sector) => sector.id === location?.sectorId) || snapshot.world.sectors[0];
  const firstEmployee = snapshot.playerKnowledge.employees[0];

  return (snapshot.actionAvailability || [])
    .filter((action) => action.tempo?.tipo === "projeto")
    .filter((action) => isAllowedAtLocation(action, location))
    .map((action) => {
      const alvo = targetForAction(action, firstSector, firstEmployee);
      if (!alvo) return null;
      return { tipo: action.tipo, nome: action.nome, alvo };
    })
    .filter(Boolean);
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

function targetForAction(action, firstSector, firstEmployee) {
  if (action.alvo === "setor" && firstSector) return { sectorId: firstSector.id };
  if (action.alvo === "funcionario" && firstEmployee) return { employeeId: firstEmployee.id };
  if (action.alvo === "empresa") return {};
  return null;
}
