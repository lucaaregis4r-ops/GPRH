import * as Phaser from "/vendor/phaser.esm.js";
import { fetchGameSnapshot } from "../api/rhGameClient.js";
import { PlayerController } from "../input/playerController.js";
import { GPRHTheme } from "../theme/gprhTheme.js";

export class OfficeScene extends Phaser.Scene {
  constructor() {
    super("OfficeScene");
    this.snapshot = null;
    this.playerController = null;
    this.nearbyInteractable = null;
    this.nearbyNpc = null;
    this.currentLocation = null;
  }

  async create() {
    this.cameras.main.setBackgroundColor("#080B10");
    this.loadingText = this.add.text(24, 24, "Carregando escritorio...", {
      fontFamily: GPRHTheme.font.family,
      fontSize: "18px",
      color: GPRHTheme.colors.cream
    }).setScrollFactor(0);

    try {
      this.snapshot = await fetchGameSnapshot();
      this.loadingText.destroy();
      this.buildOffice();
      this.scene.launch("HudScene", { snapshot: this.snapshot, location: this.currentLocation });
    } catch (error) {
      this.loadingText.setText(`Erro ao carregar snapshot: ${error.message}`);
    }
  }

  update() {
    if (!this.playerController) return;
    this.playerController.update();
    this.updatePlayerWalkFeedback();
    this.updateNpcRoutines();
    this.updateNearbyInteractable();
    this.updateHudLocation();

    if (this.playerController.interactionPressed() && this.nearbyInteractable) {
      this.scene.launch("DialogScene", { interactable: this.nearbyInteractable, snapshot: this.snapshot, location: this.currentLocation });
      this.scene.pause();
    }

    if (this.playerController.notebookPressed()) {
      this.scene.launch("NotebookScene", { snapshot: this.snapshot, location: this.currentLocation });
      this.scene.pause();
    }
  }

  applySnapshot(snapshot) {
    this.snapshot = snapshot;
    this.scene.stop("HudScene");
    this.scene.launch("HudScene", { snapshot: this.snapshot, location: this.currentLocation });
  }

  buildOffice() {
    const map = this.snapshot.world.officeMap;
    const tileSize = map.tileSize;
    this.wallGroup = this.physics.add.staticGroup();
    this.interactableGroup = this.physics.add.staticGroup();
    this.npcGroup = this.physics.add.group({ allowGravity: false, immovable: true });

    map.tiles.forEach((row, y) => {
      row.forEach((tile, x) => {
        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;
        if (tile === map.legend.wall) {
          const wall = this.wallGroup.create(worldX, worldY, "wallTile");
          wall.setSize(tileSize, tileSize);
        } else {
          this.add.image(worldX, worldY, "floorTile").setDepth(-2);
        }
      });
    });

    map.doors.forEach((door) => {
      this.add.image(door.x * tileSize + tileSize / 2, door.y * tileSize + tileSize / 2, "doorTile").setDepth(-1);
    });

    map.rooms.forEach((room) => {
      this.add
        .text(room.x * tileSize + 8, room.y * tileSize + 6, room.nome, {
          fontFamily: GPRHTheme.font.family,
          fontSize: "11px",
          color: GPRHTheme.colors.cream,
          backgroundColor: "rgba(17,21,27,0.82)",
          padding: { x: 4, y: 2 }
        })
        .setDepth(3);
      this.renderRoomProps(room, tileSize);
      this.renderRoomDetails(room, tileSize);
    });
    this.renderAmbientSignals(map, tileSize);

    map.interactables.forEach((interactable) => {
      const sprite = this.interactableGroup.create(
        interactable.x * tileSize + tileSize / 2,
        interactable.y * tileSize + tileSize / 2,
        "interactableTile"
      );
      sprite.body.setCircle(16);
      sprite.setData("interactable", interactable);
    });

    map.npcPlacements.forEach((npc, index) => {
      const visualNpc = createVisualNpcPlacement(map, npc, tileSize, index);
      const key = npc.estadoVisivel === "trabalhando" ? "npcTile" : "npcAlertTile";
      const sprite = this.npcGroup.create(visualNpc.worldX, visualNpc.worldY, key);
      sprite.body.setSize(20, 24);
      sprite.body.setImmovable(true);
      sprite.setData("npc", visualNpc.npc);
      const label = this.add
        .text(sprite.x - 22, sprite.y + 16, firstName(npc.nome), {
          fontFamily: GPRHTheme.font.family,
          fontSize: "10px",
          color: GPRHTheme.colors.cream,
          backgroundColor: "rgba(17,21,27,0.72)",
          padding: { x: 3, y: 1 }
        })
        .setDepth(4);
      sprite.setData("label", label);
      if (npc.estadoVisivel !== "trabalhando") {
        const bubble = this.add.image(sprite.x + 10, sprite.y - 18, "talkBubble").setDepth(6);
        sprite.setData("bubble", bubble);
      }
      sprite.setData("routine", createNpcRoutine(map, visualNpc.npc, tileSize, sprite.x, sprite.y, this.time.now));
    });

    const spawn = map.spawnPoints.find((point) => point.roomId === "rh") || map.spawnPoints[0];
    this.player = this.physics.add.sprite(spawn.x * tileSize + tileSize / 2, spawn.y * tileSize + tileSize / 2, "playerTile");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(18, 22);
    this.currentLocation = inferCurrentLocation(map, this.player.x, this.player.y);
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.player, this.npcGroup);
    this.playerController = new PlayerController(this, this.player);

    this.cameras.main.setBounds(0, 0, map.width * tileSize, map.height * tileSize);
    this.physics.world.setBounds(0, 0, map.width * tileSize, map.height * tileSize);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.25);

    this.interactionText = this.add
      .text(0, 0, "", {
        fontFamily: GPRHTheme.font.family,
        fontSize: "13px",
        color: GPRHTheme.colors.cream,
        backgroundColor: "rgba(142,28,38,0.92)",
        padding: { x: 8, y: 5 }
      })
      .setDepth(50)
      .setVisible(false);
  }

  updateNearbyInteractable() {
    this.nearbyInteractable = null;
    this.nearbyNpc = null;
    this.currentLocation = inferCurrentLocation(this.snapshot.world.officeMap, this.player.x, this.player.y);
    const maxDistance = 46;

    this.npcGroup.children.iterate((sprite) => {
      if (!sprite) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      if (distance <= maxDistance) {
        const candidate = sprite.getData("npc");
        if (!this.nearbyNpc || distance < this.nearbyNpc.distance) {
          this.nearbyNpc = { ...candidate, distance };
        }
      }
    });

    this.interactableGroup.children.iterate((sprite) => {
      if (!sprite) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      if (distance <= maxDistance) {
        this.nearbyInteractable = sprite.getData("interactable");
      }
    });

    if (this.nearbyNpc) {
      this.nearbyInteractable = {
        tipo: "npc",
        employeeId: this.nearbyNpc.employeeId,
        label: `${this.nearbyNpc.nome} - ${this.nearbyNpc.cargo}`,
        estadoVisivel: this.nearbyNpc.estadoVisivel,
        disponibilidade: this.nearbyNpc.disponibilidade,
        roomId: this.nearbyNpc.roomId,
        sectorId: this.nearbyNpc.setorId
      };
    }

    if (this.nearbyInteractable) {
      this.interactionText
        .setText(`E - ${this.nearbyInteractable.label}`)
        .setPosition(this.player.x - 54, this.player.y - 44)
        .setVisible(true);
    } else {
      this.interactionText.setVisible(false);
    }
  }

  updatePlayerWalkFeedback() {
    if (!this.playerController || !this.player) return;
    if (this.playerController.isMoving()) {
      this.player.setAngle(Math.sin(this.time.now / 90) * 2.5);
      this.player.setScale(1, 1 + Math.sin(this.time.now / 80) * 0.035);
      return;
    }
    this.player.setAngle(0);
    this.player.setScale(1, 1);
  }

  updateNpcRoutines() {
    const now = this.time.now;
    this.npcGroup.children.iterate((sprite) => {
      if (!sprite) return;
      const routine = sprite.getData("routine");
      if (!routine) return;

      const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, routine.targetX, routine.targetY);
      if (now >= routine.nextDecisionAt || distance < 5) {
        chooseNextNpcStep(routine, sprite.x, sprite.y, now);
      }

      if (routine.pauseUntil && now < routine.pauseUntil) {
        sprite.body.setVelocity(0, 0);
      } else {
        this.physics.moveTo(sprite, routine.targetX, routine.targetY, routine.speed);
      }

      if (sprite.x < routine.minX || sprite.x > routine.maxX || sprite.y < routine.minY || sprite.y > routine.maxY) {
        sprite.setPosition(Phaser.Math.Clamp(sprite.x, routine.minX, routine.maxX), Phaser.Math.Clamp(sprite.y, routine.minY, routine.maxY));
        chooseNextNpcStep(routine, sprite.x, sprite.y, now);
      }

      sprite.setAngle(Math.sin((now + routine.phase) / 130) * routine.walkTilt);
      updateNpcAttachments(sprite);
    });
  }

  renderRoomProps(room, tileSize) {
    const centerX = room.x * tileSize + (room.width * tileSize) / 2;
    const centerY = room.y * tileSize + (room.height * tileSize) / 2;
    const leftX = (room.x + 1) * tileSize + tileSize / 2;
    const topY = (room.y + 2) * tileSize + tileSize / 2;
    const rightX = (room.x + room.width - 2) * tileSize + tileSize / 2;
    const bottomY = (room.y + room.height - 2) * tileSize + tileSize / 2;

    if (room.id === "reuniao") {
      this.add.image(centerX, centerY, "meetingTableTile").setDepth(1);
      this.add.image(leftX, centerY, "screenTile").setDepth(1);
      this.add.image(rightX, topY, "kanbanTile").setDepth(1);
      return;
    }

    if (room.id === "copa") {
      this.add.image(leftX, centerY, "coffeeTile").setDepth(1);
      this.add.image(centerX, bottomY, "waterCoolerTile").setDepth(1);
      this.add.image(rightX, bottomY, "plantTile").setDepth(1);
      return;
    }

    if (room.id === "recepcao") {
      this.add.image(centerX - tileSize, centerY, "deskTile").setDepth(1);
      this.add.image(centerX, centerY - tileSize, "clockTile").setDepth(1);
      this.add.image(centerX - tileSize * 0.55, centerY, "phoneTile").setDepth(2);
      this.add.image(rightX, bottomY, "plantTile").setDepth(1);
      return;
    }

    if (room.id === "diretoria") {
      this.add.image(centerX, centerY, "deskTile").setDepth(1);
      this.add.image(centerX + tileSize, centerY - tileSize, "screenTile").setDepth(1);
      this.add.image(centerX - tileSize * 0.55, centerY, "phoneTile").setDepth(2);
      this.add.image(leftX, topY, "kanbanTile").setDepth(1);
      this.add.image(rightX, bottomY, "plantTile").setDepth(1);
      return;
    }

    if (room.id === "rh") {
      this.add.image(leftX, topY, "fileCabinetTile").setDepth(1);
      this.add.image(centerX, centerY, "deskTile").setDepth(1);
      this.add.image(centerX + tileSize * 0.55, centerY, "documentStackTile").setDepth(2);
      this.add.image(rightX, bottomY, "plantTile").setDepth(1);
      return;
    }

    if (room.nome && String(room.nome).toLowerCase().includes("ti")) {
      this.add.image(leftX, topY, "serverRackTile").setDepth(1);
      this.add.image(centerX, centerY, "deskTile").setDepth(1);
      this.add.image(centerX + tileSize * 0.75, centerY, "screenTile").setDepth(1);
      return;
    }

    this.add.image(leftX, topY, "screenTile").setDepth(1);
    this.add.image(centerX, centerY, "deskTile").setDepth(1);
    this.add.image(centerX + tileSize * 0.6, centerY, "documentStackTile").setDepth(2);
    if (room.width >= 7) {
      this.add.image(leftX, bottomY, "kanbanTile").setDepth(1);
    }
    if (room.width >= 6) {
      this.add.image(rightX, bottomY, "plantTile").setDepth(1);
    }
  }

  renderAmbientSignals(map, tileSize) {
    const sectorById = new Map(this.snapshot.world.sectors.map((sector) => [sector.id, sector]));
    const hasRumor = this.snapshot.world.sectors.some((sector) => sector.leitura.rumor === "atencao" || sector.leitura.rumor === "critico");
    const hasDemand = this.snapshot.playerKnowledge.employees.some((employee) => employee.demandasPendentes.length > 0);

    map.rooms.forEach((room) => {
      if (!room.sectorId) return;
      const sector = sectorById.get(room.sectorId);
      if (!sector) return;
      const hasAttention =
        sector.leitura.clima === "atencao" ||
        sector.leitura.clima === "critico" ||
        sector.leitura.carga === "atencao" ||
        sector.leitura.carga === "critico";
      const hasSectorRumor = sector.leitura.rumor === "atencao" || sector.leitura.rumor === "critico";
      if (hasAttention) {
        this.renderSignalMarker(room, tileSize, "ambientSignalTile", "sinal de atencao");
      }
      if (hasSectorRumor) {
        this.renderSignalMarker(room, tileSize, "conversationSignalTile", "rumor");
      }
    });

    if (hasRumor) {
      const copa = map.rooms.find((room) => room.id === "copa");
      if (copa) this.renderSignalMarker(copa, tileSize, "conversationSignalTile", "conversa baixa");
    }

    if (hasDemand) {
      const rh = map.rooms.find((room) => room.id === "rh");
      if (rh) this.renderSignalMarker(rh, tileSize, "demandSignalTile", "alguem procurando RH");
    }
  }

  renderSignalMarker(room, tileSize, textureKey, label) {
    const x = (room.x + room.width - 1.25) * tileSize;
    const y = (room.y + 1.25) * tileSize;
    const marker = this.add.image(x, y, textureKey).setDepth(5);
    this.add
      .text(x + 12, y - 7, label, {
        fontFamily: GPRHTheme.font.family,
        fontSize: "9px",
        color: GPRHTheme.colors.muted,
        backgroundColor: "rgba(17,21,27,0.72)",
        padding: { x: 3, y: 1 },
      })
      .setDepth(5);
    this.tweens.add({
      targets: marker,
      y: y - 3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  renderRoomDetails(room, tileSize) {
    const top = room.y * tileSize + tileSize * 1.35;
    const left = room.x * tileSize + tileSize * 0.85;
    const width = Math.max(tileSize, (room.width - 1.7) * tileSize);
    const line = this.add.rectangle(left, top, width, 2, GPRHTheme.colors.border, 0.75).setOrigin(0, 0).setDepth(0);
    const dotCount = Math.max(1, Math.floor(room.width / 3));
    for (let i = 0; i < dotCount; i += 1) {
      this.add.rectangle(left + 12 + i * tileSize * 2, top + tileSize * 0.7, 4, 4, GPRHTheme.colors.redDark, 0.65).setOrigin(0, 0).setDepth(0);
    }
    return line;
  }

  updateHudLocation() {
    const hudScene = this.scene.get("HudScene");
    if (hudScene && typeof hudScene.setLocation === "function") {
      hudScene.setLocation(this.currentLocation);
    }
  }
}

function firstName(name) {
  return String(name || "").split(" ")[0] || "Pessoa";
}

function createVisualNpcPlacement(map, npc, tileSize, index) {
  if (npc.disponibilidade !== "procurando_rh") {
    return {
      npc,
      worldX: npc.x * tileSize + tileSize / 2,
      worldY: npc.y * tileSize + tileSize / 2,
    };
  }

  const rh = map.rooms.find((room) => room.id === "rh");
  if (!rh) {
    return {
      npc,
      worldX: npc.x * tileSize + tileSize / 2,
      worldY: npc.y * tileSize + tileSize / 2,
    };
  }

  const offsetX = ((stableHash(npc.employeeId || npc.nome) % 3) - 1) * tileSize * 0.55;
  const offsetY = (index % 2 === 0 ? 0.55 : -0.55) * tileSize;
  return {
    npc: {
      ...npc,
      roomId: "rh",
      estadoVisivel: "quer_conversar",
    },
    worldX: (rh.x + rh.width / 2) * tileSize + offsetX,
    worldY: (rh.y + rh.height / 2) * tileSize + offsetY,
  };
}

function stableHash(value) {
  return String(value || "")
    .split("")
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 9973, 17);
}

function createNpcRoutine(map, npc, tileSize, startX, startY, now) {
  const room = map.rooms.find((candidate) => candidate.id === npc.roomId) || map.rooms.find((candidate) => candidate.sectorId === npc.setorId);
  const margin = tileSize * 1.15;
  const minX = room ? room.x * tileSize + margin : startX - tileSize;
  const maxX = room ? (room.x + room.width) * tileSize - margin : startX + tileSize;
  const minY = room ? room.y * tileSize + margin : startY - tileSize;
  const maxY = room ? (room.y + room.height) * tileSize - margin : startY + tileSize;
  const routine = {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY),
    targetX: startX,
    targetY: startY,
    speed: speedForNpc(npc),
    pauseUntil: now + Phaser.Math.Between(250, 1600),
    nextDecisionAt: now + Phaser.Math.Between(700, 2600),
    phase: Phaser.Math.Between(0, 800),
    walkTilt: npc.estadoVisivel === "distante" ? 1.2 : 2,
  };
  chooseNextNpcStep(routine, startX, startY, now);
  return routine;
}

function chooseNextNpcStep(routine, currentX, currentY, now) {
  const shouldPause = Phaser.Math.Between(0, 100) < 38;
  if (shouldPause) {
    routine.targetX = currentX;
    routine.targetY = currentY;
    routine.pauseUntil = now + Phaser.Math.Between(800, 2600);
    routine.nextDecisionAt = routine.pauseUntil;
    return;
  }

  routine.pauseUntil = 0;
  routine.targetX = Phaser.Math.Between(Math.round(routine.minX), Math.round(routine.maxX));
  routine.targetY = Phaser.Math.Between(Math.round(routine.minY), Math.round(routine.maxY));
  routine.nextDecisionAt = now + Phaser.Math.Between(1700, 4300);
}

function speedForNpc(npc) {
  if (npc.estadoVisivel === "quer_conversar") return 44;
  if (npc.estadoVisivel === "sobrecarregado_aparente") return 34;
  if (npc.estadoVisivel === "distante") return 22;
  return 28;
}

function updateNpcAttachments(sprite) {
  const label = sprite.getData("label");
  if (label) label.setPosition(sprite.x - 22, sprite.y + 16);
  const bubble = sprite.getData("bubble");
  if (bubble) bubble.setPosition(sprite.x + 10, sprite.y - 18);
}

function inferCurrentLocation(map, worldX, worldY) {
  const tileX = Math.floor(worldX / map.tileSize);
  const tileY = Math.floor(worldY / map.tileSize);
  const room = map.rooms.find(
    (candidate) =>
      tileX >= candidate.x &&
      tileX < candidate.x + candidate.width &&
      tileY >= candidate.y &&
      tileY < candidate.y + candidate.height
  );
  if (!room) return { roomId: "corredor", roomType: "corredor", label: "Corredor" };
  return {
    roomId: room.id,
    roomType: room.tipo,
    sectorId: room.sectorId || null,
    label: room.nome,
  };
}
