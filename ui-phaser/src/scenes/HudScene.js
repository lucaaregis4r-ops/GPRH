import * as Phaser from "/vendor/phaser.esm.js";
import { GPRHTheme } from "../theme/gprhTheme.js";
import { drawPixelPanel } from "../ui/pixelUi.js";

export class HudScene extends Phaser.Scene {
  constructor() {
    super("HudScene");
  }

  create(data) {
    this.snapshot = data.snapshot;
    this.location = data.location || null;
    this.panelParts = drawPixelPanel(this, 8, 8, this.scale.width - 16, 42, { depth: 90, alpha: 0.94, cornerSize: 5 });
    this.bottomParts = drawPixelPanel(this, 8, this.scale.height - 58, this.scale.width - 16, 50, { depth: 90, alpha: 0.94, cornerSize: 5 });
    this.text = this.add
      .text(18, 19, this.buildHudText(), {
        fontFamily: GPRHTheme.font.family,
        fontSize: "15px",
        color: GPRHTheme.colors.cream,
      })
      .setDepth(95);
    this.locationText = this.add
      .text(this.scale.width - 430, 19, this.buildLocationText(), {
        fontFamily: GPRHTheme.font.family,
        fontSize: "15px",
        color: GPRHTheme.colors.cream,
      })
      .setDepth(95)
      .setOrigin(0, 0);
    this.hint = this.add
      .text(this.scale.width - 210, 19, "Tab Caderno", {
        fontFamily: GPRHTheme.font.family,
        fontSize: "15px",
        color: GPRHTheme.colors.muted,
      })
      .setDepth(95)
      .setOrigin(0, 0);
    this.bottomLeftText = this.add
      .text(20, this.scale.height - 44, this.buildBottomLeftText(), {
        fontFamily: GPRHTheme.font.family,
        fontSize: "14px",
        color: GPRHTheme.colors.cream,
      })
      .setDepth(95);
    this.bottomRightText = this.add
      .text(this.scale.width - 390, this.scale.height - 44, this.buildBottomRightText(), {
        fontFamily: GPRHTheme.font.family,
        fontSize: "14px",
        color: this.hasAttentionAlerts() ? "#D92736" : GPRHTheme.colors.muted,
      })
      .setDepth(95);
    this.drawStatusBadges();

    this.scale.on("resize", this.resize, this);
  }

  resize(gameSize) {
    this.locationText.setX(gameSize.width - 430);
    this.hint.setX(gameSize.width - 210);
    this.bottomLeftText.setY(gameSize.height - 44);
    this.bottomRightText.setPosition(gameSize.width - 390, gameSize.height - 44);
    this.scene.restart({ snapshot: this.snapshot, location: this.location });
  }

  setLocation(location) {
    const nextLabel = location?.label || "Corredor";
    if (this.location?.label === nextLabel) return;
    this.location = location;
    this.locationText.setText(this.buildLocationText());
  }

  buildHudText() {
    const day = this.snapshot.calendar.dia + 1;
    const energy = this.snapshot.playerKnowledge.agenda.energiaAtual;
    const maxEnergy = this.snapshot.playerKnowledge.agenda.energiaSemanal;
    const demands = this.snapshot.playerKnowledge.employees.reduce((sum, employee) => sum + employee.demandasPendentes.length, 0);
    return `Dia ${day} | Energia RH ${energy}/${maxEnergy} | ${demands} demanda(s) pendente(s)`;
  }

  buildLocationText() {
    return `Local: ${this.location?.label || "Corredor"}`;
  }

  buildBottomLeftText() {
    const time = this.snapshot.playerKnowledge.agenda.tempoDia;
    const clock = time ? `${time.horaAtual} | ${time.tempoRestanteMin} min restantes` : "Horario indisponivel";
    return `WASD/setas mover | E interagir | Tab caderno | ${clock}`;
  }

  buildBottomRightText() {
    const signals = this.snapshot.playerKnowledge.visibleSignals.length;
    const demands = this.snapshot.playerKnowledge.employees.reduce((sum, employee) => sum + employee.demandasPendentes.length, 0);
    const projects = this.snapshot.playerKnowledge.agenda.projetosDiarios?.length || 0;
    return `Sinais ${signals} | Demandas ${demands} | Projetos ${projects}`;
  }

  hasAttentionAlerts() {
    const demands = this.snapshot.playerKnowledge.employees.reduce((sum, employee) => sum + employee.demandasPendentes.length, 0);
    return demands > 0 || this.snapshot.playerKnowledge.visibleSignals.length >= 5;
  }

  drawStatusBadges() {
    const y = this.scale.height - 22;
    const startX = this.scale.width - 390;
    const items = [
      { label: "S", active: this.snapshot.playerKnowledge.visibleSignals.length > 0 },
      { label: "D", active: this.snapshot.playerKnowledge.employees.some((employee) => employee.demandasPendentes.length > 0) },
      { label: "P", active: (this.snapshot.playerKnowledge.agenda.projetosDiarios || []).length > 0 },
    ];

    items.forEach((item, index) => {
      const x = startX + index * 34;
      this.add.rectangle(x, y, 22, 18, item.active ? GPRHTheme.colors.red : GPRHTheme.colors.surface, 1).setDepth(95);
      this.add
        .text(x - 4, y - 7, item.label, {
          fontFamily: GPRHTheme.font.family,
          fontSize: "12px",
          color: item.active ? "#FFFFFF" : GPRHTheme.colors.muted,
        })
        .setDepth(96);
    });
  }
}
