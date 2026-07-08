import * as Phaser from "/vendor/phaser.esm.js";
import { BootScene } from "../scenes/BootScene.js";
import { PreloadScene } from "../scenes/PreloadScene.js";
import { MainMenuScene } from "../scenes/MainMenuScene.js";
import { OfficeScene } from "../scenes/OfficeScene.js";
import { HudScene } from "../scenes/HudScene.js";
import { DialogScene } from "../scenes/DialogScene.js";
import { NotebookScene } from "../scenes/NotebookScene.js";
import { ReportScene } from "../scenes/ReportScene.js";

export const phaserConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#080B10",
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, MainMenuScene, OfficeScene, HudScene, DialogScene, NotebookScene, ReportScene],
};
