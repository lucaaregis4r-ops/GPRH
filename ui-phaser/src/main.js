import * as Phaser from "/vendor/phaser.esm.js";
import { phaserConfig } from "./config/phaserConfig.js";

window.addEventListener("load", () => {
  new Phaser.Game(phaserConfig);
});
