import * as Phaser from "/vendor/phaser.esm.js";
import { GPRHTheme } from "../theme/gprhTheme.js";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.createFloorTexture("floorTile");
    this.createTileTexture("wallTile", 32, 32, GPRHTheme.colors.wall, GPRHTheme.colors.borderLight);
    this.createTileTexture("doorTile", 32, 32, GPRHTheme.colors.redDark, GPRHTheme.colors.red);
    this.createCharacterTexture("playerTile", GPRHTheme.colors.red, 0x5a321f);
    this.createInteractableTexture("interactableTile");
    this.createDeskTexture("deskTile");
    this.createPlantTexture("plantTile");
    this.createScreenTexture("screenTile");
    this.createTableTexture("meetingTableTile");
    this.createCoffeeTexture("coffeeTile");
    this.createFileCabinetTexture("fileCabinetTile");
    this.createKanbanTexture("kanbanTile");
    this.createClockTexture("clockTile");
    this.createPhoneTexture("phoneTile");
    this.createWaterCoolerTexture("waterCoolerTile");
    this.createServerRackTexture("serverRackTile");
    this.createDocumentStackTexture("documentStackTile");
    this.createAmbientMarkerTexture("ambientSignalTile", GPRHTheme.colors.red, "!");
    this.createAmbientMarkerTexture("conversationSignalTile", GPRHTheme.colors.borderLight, "...");
    this.createAmbientMarkerTexture("demandSignalTile", GPRHTheme.colors.redDark, "?");
    this.createCharacterTexture("npcTile", GPRHTheme.colors.borderLight, 0x5a321f);
    this.createCharacterTexture("npcAlertTile", GPRHTheme.colors.red, 0x5a321f);
    this.createBubbleTexture("talkBubble", 18, 14);
  }

  create() {
    this.scene.start("MainMenuScene");
  }

  createTileTexture(key, width, height, fill, stroke) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(fill, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(2, stroke, 1);
    graphics.strokeRect(1, 1, width - 2, height - 2);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  createFloorTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(GPRHTheme.colors.floor, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(1, 0x17191d, 0.55);
    graphics.lineBetween(0, 0, 32, 0);
    graphics.lineBetween(0, 16, 32, 16);
    graphics.lineBetween(0, 31, 32, 31);
    graphics.fillStyle(0x2b2723, 0.45);
    graphics.fillRect(4, 7, 2, 2);
    graphics.fillRect(24, 23, 2, 2);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createCharacterTexture(key, jacket, hair) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(8, 22, 4, 8);
    graphics.fillRect(14, 22, 4, 8);
    graphics.fillStyle(0x8a4a2e, 1);
    graphics.fillRect(7, 8, 12, 11);
    graphics.fillStyle(hair, 1);
    graphics.fillRect(8, 5, 10, 5);
    graphics.fillStyle(jacket, 1);
    graphics.fillRect(5, 14, 5, 9);
    graphics.fillRect(16, 14, 5, 9);
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillRect(11, 14, 4, 9);
    graphics.fillStyle(0x080b10, 1);
    graphics.fillRect(10, 12, 2, 2);
    graphics.fillRect(15, 12, 2, 2);
    graphics.generateTexture(key, 26, 30);
    graphics.destroy();
  }

  createInteractableTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(GPRHTheme.colors.redDark, 1);
    graphics.fillRect(4, 4, 16, 16);
    graphics.lineStyle(2, GPRHTheme.colors.red, 1);
    graphics.strokeRect(3, 3, 18, 18);
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillRect(9, 9, 6, 6);
    graphics.generateTexture(key, 24, 24);
    graphics.destroy();
  }

  createDeskTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x5a321f, 1);
    graphics.fillRect(2, 8, 28, 12);
    graphics.fillStyle(0x2d1d17, 1);
    graphics.fillRect(5, 20, 4, 8);
    graphics.fillRect(23, 20, 4, 8);
    graphics.lineStyle(1, GPRHTheme.colors.borderLight, 0.8);
    graphics.strokeRect(2, 8, 28, 12);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createPlantTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x3a302c, 1);
    graphics.fillRect(12, 18, 9, 9);
    graphics.fillStyle(0x5f7d55, 1);
    graphics.fillRect(8, 12, 7, 5);
    graphics.fillRect(17, 10, 7, 6);
    graphics.fillRect(13, 6, 6, 8);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createScreenTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x080b10, 1);
    graphics.fillRect(5, 7, 22, 14);
    graphics.lineStyle(1, 0x6b5a4e, 1);
    graphics.strokeRect(5, 7, 22, 14);
    graphics.fillStyle(0xd92736, 0.85);
    graphics.fillRect(8, 10, 5, 2);
    graphics.fillStyle(0xe8ddbe, 0.75);
    graphics.fillRect(8, 14, 12, 2);
    graphics.fillRect(12, 22, 8, 3);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createTableTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x4a2b1e, 1);
    graphics.fillEllipse(16, 16, 28, 16);
    graphics.lineStyle(1, GPRHTheme.colors.borderLight, 0.8);
    graphics.strokeEllipse(16, 16, 28, 16);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createCoffeeTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x6b5a4e, 1);
    graphics.fillRect(8, 8, 16, 17);
    graphics.fillStyle(0xd92736, 1);
    graphics.fillRect(10, 10, 12, 4);
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillRect(12, 17, 8, 5);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createFileCabinetTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x3a302c, 1);
    graphics.fillRect(8, 4, 16, 24);
    graphics.lineStyle(1, 0x6b5a4e, 1);
    graphics.strokeRect(8, 4, 16, 24);
    graphics.lineBetween(8, 12, 24, 12);
    graphics.lineBetween(8, 20, 24, 20);
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillRect(14, 8, 4, 1);
    graphics.fillRect(14, 16, 4, 1);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createKanbanTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x11151b, 1);
    graphics.fillRect(4, 5, 24, 18);
    graphics.lineStyle(1, 0x6b5a4e, 1);
    graphics.strokeRect(4, 5, 24, 18);
    graphics.fillStyle(0xd92736, 1);
    graphics.fillRect(7, 9, 5, 4);
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillRect(14, 9, 5, 4);
    graphics.fillStyle(0xa99b82, 1);
    graphics.fillRect(21, 9, 4, 9);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createClockTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillCircle(16, 14, 8);
    graphics.lineStyle(2, 0x3a302c, 1);
    graphics.strokeCircle(16, 14, 8);
    graphics.lineStyle(1, 0x080b10, 1);
    graphics.lineBetween(16, 14, 16, 9);
    graphics.lineBetween(16, 14, 20, 14);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createPhoneTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x11151b, 1);
    graphics.fillRect(8, 12, 17, 10);
    graphics.fillStyle(0x3a302c, 1);
    graphics.fillRect(10, 8, 12, 5);
    graphics.fillStyle(0xd92736, 1);
    graphics.fillRect(12, 16, 3, 3);
    graphics.fillRect(17, 16, 3, 3);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createWaterCoolerTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x6b8aa0, 1);
    graphics.fillRect(12, 4, 8, 10);
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillRect(10, 14, 12, 14);
    graphics.fillStyle(0xd92736, 1);
    graphics.fillRect(13, 18, 2, 2);
    graphics.fillRect(18, 18, 2, 2);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createServerRackTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0x11151b, 1);
    graphics.fillRect(8, 4, 16, 25);
    graphics.lineStyle(1, 0x6b5a4e, 1);
    graphics.strokeRect(8, 4, 16, 25);
    graphics.fillStyle(0xd92736, 1);
    graphics.fillRect(11, 8, 3, 2);
    graphics.fillRect(11, 15, 3, 2);
    graphics.fillRect(11, 22, 3, 2);
    graphics.fillStyle(0xa99b82, 1);
    graphics.fillRect(16, 8, 5, 2);
    graphics.fillRect(16, 15, 5, 2);
    graphics.fillRect(16, 22, 5, 2);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createDocumentStackTexture(key) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillRect(9, 11, 14, 10);
    graphics.fillStyle(0xa99b82, 1);
    graphics.fillRect(7, 14, 14, 10);
    graphics.fillStyle(0xd92736, 1);
    graphics.fillRect(10, 14, 8, 1);
    graphics.fillRect(10, 18, 6, 1);
    graphics.generateTexture(key, 32, 32);
    graphics.destroy();
  }

  createAmbientMarkerTexture(key, fill, glyph) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(fill, 1);
    graphics.fillRect(2, 2, 22, 16);
    graphics.lineStyle(1, 0xe8ddbe, 0.75);
    graphics.strokeRect(2, 2, 22, 16);
    graphics.fillStyle(0x080b10, 1);
    graphics.fillRect(8, 18, 5, 4);
    graphics.generateTexture(key, 26, 24);
    graphics.destroy();
  }

  createBubbleTexture(key, width, height) {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xe8ddbe, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0x11151b, 1);
    graphics.fillCircle(5, 7, 1.4);
    graphics.fillCircle(9, 7, 1.4);
    graphics.fillCircle(13, 7, 1.4);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
}
