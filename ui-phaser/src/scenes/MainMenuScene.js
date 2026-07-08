import * as Phaser from "/vendor/phaser.esm.js";
import { startDailySession } from "../api/rhGameClient.js";
import { GPRHTheme } from "../theme/gprhTheme.js";
import { createPixelButton, drawPixelPanel } from "../ui/pixelUi.js";

const DEFAULT_SEED = "RH-PHASER-001";
const PRESET_SEEDS = [
  { label: "Tutorial", seed: "RH-TUTORIAL-001" },
  { label: "Sobrecarga", seed: "RH-SOBRECARGA-001" },
  { label: "Compliance", seed: "RH-COMPLIANCE-001" },
  { label: "Diretoria", seed: "RH-DIRETORIA-001" },
];

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
    this.seed = DEFAULT_SEED;
    this.busy = false;
  }

  create() {
    this.seed = DEFAULT_SEED;
    this.busy = false;
    this.cameras.main.setBackgroundColor("#080B10");
    this.drawBackgroundTexture();

    const headerWidth = Math.min(420, this.scale.width - 64);
    const headerX = this.scale.width / 2 - headerWidth / 2;
    drawPixelPanel(this, headerX, 24, headerWidth, 90, { depth: 2 });
    this.add
      .text(this.scale.width / 2, 44, "GPRH", {
        fontFamily: GPRHTheme.font.family,
        fontSize: "34px",
        color: "#D92736",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(10);
    this.add
      .text(this.scale.width / 2, 82, "GESTAO PROCEDURAL DE RH", {
        fontFamily: GPRHTheme.font.family,
        fontSize: "14px",
        color: GPRHTheme.colors.cream,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    const panelWidth = Math.min(700, this.scale.width - 64);
    const panelHeight = Math.min(420, this.scale.height - 150);
    const x = this.scale.width / 2 - panelWidth / 2;
    const y = 145;
    drawPixelPanel(this, x, y, panelWidth, panelHeight, { depth: 2 });

    this.add
      .text(x + 28, y + 24, "Nova empresa", {
        fontFamily: GPRHTheme.font.family,
        fontSize: "22px",
        color: GPRHTheme.colors.cream,
      })
      .setDepth(10);
    this.add
      .text(x + 28, y + 62, "Digite uma seed ou escolha um ponto de partida.", {
        fontFamily: GPRHTheme.font.family,
        fontSize: "14px",
        color: GPRHTheme.colors.muted,
      })
      .setDepth(10);

    this.seedText = this.add
      .text(x + 28, y + 100, this.buildSeedText(), {
        fontFamily: GPRHTheme.font.family,
        fontSize: "17px",
        color: GPRHTheme.colors.cream,
        backgroundColor: "#242424",
        padding: { x: 12, y: 10 },
        fixedWidth: panelWidth - 56,
      })
      .setDepth(10);

    PRESET_SEEDS.forEach((preset, index) => {
      createPixelButton(this, x + 28 + index * 154, y + 160, preset.label, () => this.setSeed(preset.seed), {
        width: 136,
        align: "center",
      }).setDepth(10);
    });

    createPixelButton(this, x + 28, y + panelHeight - 78, "Iniciar expediente", () => this.startGame(), {
      width: 230,
      primary: true,
      align: "center",
    }).setDepth(10);
    createPixelButton(this, x + 278, y + panelHeight - 78, "Seed aleatoria", () => this.randomizeSeed(), {
      width: 180,
      align: "center",
    }).setDepth(10);

    this.statusText = this.add
      .text(x + 28, y + panelHeight - 34, "Enter inicia | Backspace apaga | letras e numeros editam a seed", {
        fontFamily: GPRHTheme.font.family,
        fontSize: "13px",
        color: GPRHTheme.colors.muted,
      })
      .setDepth(10);

    this.input.keyboard.on("keydown", (event) => this.handleKey(event));
  }

  drawBackgroundTexture() {
    for (let y = 0; y < this.scale.height; y += 8) {
      this.add.rectangle(0, y, this.scale.width, 1, 0x10151b, 0.45).setOrigin(0, 0);
    }
    for (let x = 6; x < this.scale.width; x += 145) {
      for (let y = 6; y < this.scale.height; y += 96) {
        this.add.rectangle(x, y, 3, 3, GPRHTheme.colors.redDark, 0.45).setOrigin(0, 0);
      }
    }
  }

  handleKey(event) {
    if (this.busy) return;
    if (event.key === "Enter") {
      this.startGame();
      return;
    }
    if (event.key === "Backspace") {
      this.seed = this.seed.slice(0, -1) || DEFAULT_SEED;
      this.refreshSeed();
      return;
    }
    if (event.key.length === 1 && /^[a-zA-Z0-9_-]$/.test(event.key) && this.seed.length < 32) {
      if (this.seed === DEFAULT_SEED) this.seed = "";
      this.seed += event.key.toUpperCase();
      this.refreshSeed();
    }
  }

  setSeed(seed) {
    if (this.busy) return;
    this.seed = seed;
    this.refreshSeed();
  }

  randomizeSeed() {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.setSeed(`RH-${suffix}`);
  }

  refreshSeed() {
    this.seedText.setText(this.buildSeedText());
  }

  buildSeedText() {
    return `Seed: ${this.seed}`;
  }

  async startGame() {
    if (this.busy) return;
    this.busy = true;
    this.statusText.setColor("#E8DDBE");
    this.statusText.setText("Gerando empresa...");

    try {
      await startDailySession(this.seed || DEFAULT_SEED);
      this.scene.start("OfficeScene");
    } catch (error) {
      this.busy = false;
      this.statusText.setColor("#D92736");
      this.statusText.setText(`Erro ao iniciar: ${error.message}`);
    }
  }
}
