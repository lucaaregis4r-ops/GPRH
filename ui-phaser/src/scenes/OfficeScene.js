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
    this.nextRoutinePulseAt = 0;
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
    this.pulseNpcRoutineTargets();
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
    this.syncNpcRoutineTargets();
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
      this.renderRoomProps(room, map, tileSize);
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

    const npcVisualPlan = buildNpcVisualPlan(this.snapshot, map);
    const npcPlacementOccupancy = new Map();
    npcVisualPlan.visiblePlacements.forEach((npcPlacement, index) => {
      const snapshotNpc = findSnapshotNpc(this.snapshot, npcPlacement.employeeId) || npcPlacement;
      const visualNpc = spreadOverlappingNpcPlacement(
        createVisualNpcPlacement(map, snapshotNpc, tileSize, index, this.snapshot.world.workspace),
        npcPlacementOccupancy,
        tileSize
      );
      const key = visualNpc.npc.estadoVisivel === "trabalhando" ? "npcTile" : "npcAlertTile";
      const sprite = this.npcGroup.create(visualNpc.worldX, visualNpc.worldY, key);
      sprite.body.setSize(20, 24);
      sprite.body.setImmovable(true);
      sprite.setData("npc", visualNpc.npc);
      const label = this.add
        .text(sprite.x - 24, sprite.y + 20, npcLabelText(visualNpc.npc), {
          fontFamily: GPRHTheme.font.family,
          fontSize: "10px",
          color: GPRHTheme.colors.cream,
          backgroundColor: "rgba(17,21,27,0.72)",
          padding: { x: 3, y: 1 }
        })
        .setDepth(4)
        .setVisible(false);
      sprite.setData("label", label);
      if (visualNpc.npc.estadoVisivel !== "trabalhando" || visualNpc.npc.currentState === "informal_chat") {
        const bubble = this.add.image(sprite.x + 10, sprite.y - 18, "talkBubble").setDepth(6);
        sprite.setData("bubble", bubble);
      }
      sprite.setData("routine", createNpcRoutine(map, visualNpc.npc, tileSize, sprite.x, sprite.y, this.time.now, this.snapshot.world.workspace));
    });
    this.renderNpcGroupIndicators(npcVisualPlan.hiddenGroups, map, tileSize);

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
        label: npcInteractionLabel(this.nearbyNpc),
        estadoVisivel: this.nearbyNpc.estadoVisivel,
        disponibilidade: this.nearbyNpc.disponibilidade,
        roomId: this.nearbyNpc.roomId,
        sectorId: this.nearbyNpc.setorId
      };
    }

    this.updateNpcLabelVisibility(maxDistance + 22);

    if (this.nearbyInteractable) {
      this.interactionText
        .setText(`E - ${this.nearbyInteractable.label}`)
        .setPosition(this.player.x - 54, this.player.y - 44)
        .setVisible(true);
    } else {
      this.interactionText.setVisible(false);
    }
  }

  updateNpcLabelVisibility(maxDistance) {
    this.npcGroup.children.iterate((sprite) => {
      if (!sprite) return;
      const label = sprite.getData("label");
      if (!label) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
      label.setVisible(distance <= maxDistance);
    });
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

      advanceNpcRouteIfReached(routine, sprite.x, sprite.y);
      const waypoint = currentNpcWaypoint(routine);
      const distance = waypoint ? Phaser.Math.Distance.Between(sprite.x, sprite.y, waypoint.x, waypoint.y) : 0;
      if (!waypoint || distance < 4 || routine.speed <= 0) {
        sprite.body.setVelocity(0, 0);
      } else {
        this.physics.moveTo(sprite, waypoint.x, waypoint.y, routine.speed);
      }

      const moving = Boolean(waypoint) && distance >= 4 && routine.speed > 0;
      sprite.setAngle(moving ? Math.sin((now + routine.phase) / 130) * routine.walkTilt : Math.sin((now + routine.phase) / 520) * 0.8);
      sprite.setScale(1, moving ? 1 : 1 + Math.sin((now + routine.phase) / 460) * 0.018);
      updateNpcAttachments(sprite);
    });
  }

  pulseNpcRoutineTargets() {
    const now = this.time.now;
    if (now < this.nextRoutinePulseAt || !this.npcGroup || !this.snapshot?.world?.officeMap) return;
    this.nextRoutinePulseAt = now + 4200;
    const map = this.snapshot.world.officeMap;
    const tileSize = map.tileSize;

    this.npcGroup.children.iterate((sprite) => {
      if (!sprite) return;
      const npc = sprite.getData("npc");
      const routine = sprite.getData("routine");
      if (!npc || !routine) return;
      const target = resolveNpcWorldTarget(map, npc, tileSize, this.snapshot.world.workspace);
      if (sameWorldTarget(routine, target)) return;
      sprite.setData(
        "routine",
        createNpcRoutine(map, npc, tileSize, sprite.x, sprite.y, this.time.now, this.snapshot.world.workspace)
      );
    });
  }

  syncNpcRoutineTargets() {
    if (!this.npcGroup || !this.snapshot?.world?.officeMap) return;
    const map = this.snapshot.world.officeMap;
    const tileSize = map.tileSize;
    this.npcGroup.children.iterate((sprite) => {
      if (!sprite) return;
      const npc = findSnapshotNpc(this.snapshot, sprite.getData("npc")?.employeeId);
      if (!npc) return;
      const target = resolveNpcWorldTarget(map, npc, tileSize, this.snapshot.world.workspace);
      const previous = sprite.getData("npc") || {};
      const mergedNpc = { ...previous, ...npc, roomId: target.roomId };
      sprite.setData("npc", mergedNpc);
      sprite.setData("routine", {
        ...createNpcRoutine(map, mergedNpc, tileSize, sprite.x, sprite.y, this.time.now, this.snapshot.world.workspace),
        targetX: target.worldX,
        targetY: target.worldY,
        pulseIndex: 0,
      });
      updateNpcStateBadge(sprite, npc);
    });
  }

  renderRoomProps(room, map, tileSize) {
    const centerX = room.x * tileSize + (room.width * tileSize) / 2;
    const centerY = room.y * tileSize + (room.height * tileSize) / 2;
    const leftX = (room.x + 1) * tileSize + tileSize / 2;
    const topY = (room.y + 2) * tileSize + tileSize / 2;
    const rightX = (room.x + room.width - 2) * tileSize + tileSize / 2;
    const bottomY = (room.y + room.height - 2) * tileSize + tileSize / 2;

    if (room.sectorId) {
      this.add.image(leftX, topY, "screenTile").setDepth(1);
      if (room.width >= 7) this.add.image(rightX, bottomY, "plantTile").setDepth(1);
      if (room.width >= 8) this.add.image(leftX, bottomY, "kanbanTile").setDepth(1);
      this.renderWorkspaceDesks(room, map, tileSize);
      return;
    }

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

    if (room.id === "banheiro") {
      this.add.image(leftX, centerY, "waterCoolerTile").setDepth(1).setScale(0.85);
      this.add.image(rightX, centerY, "fileCabinetTile").setDepth(1).setScale(0.75);
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

  renderWorkspaceDesks(room, map, tileSize) {
    const workspace = this.snapshot.world.workspace;
    const desks = (workspace?.desks || [])
      .filter((desk) => desk.roomId === room.id || desk.sectorId === room.sectorId)
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));

    const visibleDeskLimit = visualDeskLimitForRoom(room);
    desks.slice(0, visibleDeskLimit).forEach((desk) => {
      const target = deskVisualTarget(map, workspace, desk, tileSize);
      this.add.image(target.worldX, target.worldY, "deskTile").setDepth(1);
      this.add.image(target.worldX + tileSize * 0.28, target.worldY - tileSize * 0.05, "screenTile").setDepth(2).setScale(0.82);
    });

    if (desks.length > visibleDeskLimit) {
      this.renderDeskGroupMarker(room, tileSize, desks.length - visibleDeskLimit);
    }
  }

  renderDeskGroupMarker(room, tileSize, hiddenCount) {
    const x = (room.x + room.width - 2.1) * tileSize;
    const y = (room.y + room.height - 2.2) * tileSize;
    this.add.rectangle(x, y, 34, 16, GPRHTheme.colors.border, 0.82).setDepth(1);
    this.add.image(x - 10, y, "deskTile").setDepth(2).setScale(0.62);
    this.add
      .text(x - 1, y - 6, `+${hiddenCount}`, {
        fontFamily: GPRHTheme.font.family,
        fontSize: "9px",
        color: GPRHTheme.colors.muted,
      })
      .setDepth(3);
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

  renderNpcGroupIndicators(hiddenGroups, map, tileSize) {
    hiddenGroups.forEach((group) => {
      const room = map.rooms.find((candidate) => candidate.id === group.roomId);
      if (!room || group.hiddenCount <= 0) return;
      const x = (room.x + room.width - 1.4) * tileSize;
      const y = (room.y + room.height - 1.35) * tileSize;
      const marker = this.add.rectangle(x, y, 34, 20, GPRHTheme.colors.redDark, 0.92).setDepth(7);
      marker.setStrokeStyle(1, GPRHTheme.colors.red);
      this.add
        .text(x - 12, y - 7, `+${group.hiddenCount}`, {
          fontFamily: GPRHTheme.font.family,
          fontSize: "11px",
          color: GPRHTheme.colors.cream,
        })
        .setDepth(8);
      this.add
        .text(x - 32, y + 12, group.label || "no local", {
          fontFamily: GPRHTheme.font.family,
          fontSize: "8px",
          color: GPRHTheme.colors.muted,
          backgroundColor: "rgba(17,21,27,0.72)",
          padding: { x: 3, y: 1 },
        })
        .setDepth(8);
    });
  }
}

function buildNpcVisualPlan(snapshot, map) {
  const placementsByRoom = new Map();
  (map.npcPlacements || []).forEach((placement, index) => {
    const npc = findSnapshotNpc(snapshot, placement.employeeId) || placement;
    const roomId = npc.currentRoomId || npc.homeRoomId || placement.roomId;
    if (!placementsByRoom.has(roomId)) placementsByRoom.set(roomId, []);
    placementsByRoom.get(roomId).push({ placement, npc, index });
  });

  const visiblePlacements = [];
  const hiddenGroups = [];
  placementsByRoom.forEach((items, roomId) => {
    const room = map.rooms.find((candidate) => candidate.id === roomId) || map.rooms.find((candidate) => candidate.sectorId === items[0]?.npc?.setorId);
    const limit = visualNpcLimitForRoom(room);
    const sorted = items
      .slice()
      .sort((left, right) => npcVisibilityPriority(right.npc, right.index) - npcVisibilityPriority(left.npc, left.index));
    sorted.slice(0, limit).forEach((item) => visiblePlacements.push(item.placement));
    if (sorted.length > limit) {
      hiddenGroups.push({
        roomId: room?.id || roomId,
        sectorId: room?.sectorId || items[0]?.npc?.setorId || null,
        hiddenCount: sorted.length - limit,
        totalCount: sorted.length,
        label: room?.tipo === "setor" ? "no setor" : "no local",
      });
    }
  });

  return { visiblePlacements, hiddenGroups };
}

function visualNpcLimitForRoom(room) {
  if (!room) return 4;
  if (room.id === "banheiro") return 2;
  if (room.id === "copa" || room.id === "reuniao") return 5;
  if (room.id === "rh" || room.id === "diretoria") return 4;
  if (room.tipo === "setor") return 4;
  return 3;
}

function visualDeskLimitForRoom(room) {
  if (!room) return 5;
  if (room.tipo !== "setor") return 3;
  return 6;
}

function npcVisibilityPriority(npc, index = 0) {
  let score = 0;
  if ((npc.demandasPendentes || []).length > 0 || npc.estadoVisivel === "quer_conversar") score += 80;
  if (npc.currentState && !["working_at_desk", "focused_work", "idle_at_desk"].includes(npc.currentState)) score += 50;
  if (npc.estadoVisivel && npc.estadoVisivel !== "trabalhando") score += 35;
  if (npc.managerId) score += 4;
  score += stableHash(npc.employeeId || npc.nome || index) % 17;
  return score;
}

function firstName(name) {
  return String(name || "").split(" ")[0] || "Pessoa";
}

function npcLabelText(npc) {
  return `${firstName(npc.nome)}\n${stateShortLabel(npc)}`;
}

function createVisualNpcPlacement(map, npc, tileSize, index, workspace) {
  const target = resolveNpcWorldTarget(map, npc, tileSize, workspace, index);
  return {
    npc: {
      ...npc,
      roomId: target.roomId,
    },
    worldX: target.worldX,
    worldY: target.worldY,
  };
}

function spreadOverlappingNpcPlacement(visualNpc, occupancy, tileSize) {
  const key = `${Math.round(visualNpc.worldX / 8)},${Math.round(visualNpc.worldY / 8)}`;
  const count = occupancy.get(key) || 0;
  occupancy.set(key, count + 1);
  if (count === 0) return visualNpc;

  const radius = tileSize * (0.32 + Math.floor(count / 6) * 0.18);
  const angle = (count * Math.PI * 2) / 6;
  return {
    ...visualNpc,
    worldX: visualNpc.worldX + Math.cos(angle) * radius,
    worldY: visualNpc.worldY + Math.sin(angle) * radius,
  };
}

function stableHash(value) {
  return String(value || "")
    .split("")
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 9973, 17);
}

function createNpcRoutine(map, npc, tileSize, startX, startY, now, workspace) {
  const target = resolveNpcWorldTarget(map, npc, tileSize, workspace);
  const distanceToTarget = Phaser.Math.Distance.Between(startX, startY, target.worldX, target.worldY);
  const routine = {
    targetX: target.worldX || startX,
    targetY: target.worldY || startY,
    speed: distanceToTarget > tileSize * 0.75 ? Math.max(36, speedForNpc(npc)) : speedForNpc(npc),
    phase: stableHash(`${npc.employeeId || npc.nome}:${now}`) % 800,
    walkTilt: npc.estadoVisivel === "distante" ? 1.2 : 2,
    pulseIndex: 0,
    currentVisualMoment: visualMomentForState(npc.currentState),
  };
  return assignNpcRoute(map, routine, startX, startY, routine.targetX, routine.targetY, tileSize);
}

function assignNpcRoute(map, routine, startX, startY, targetX, targetY, tileSize) {
  const route = buildNpcWorldRoute(map, startX, startY, targetX, targetY, tileSize);
  return {
    ...routine,
    targetX,
    targetY,
    route,
    routeIndex: 0,
  };
}

function currentNpcWaypoint(routine) {
  if (!Array.isArray(routine.route)) return { x: routine.targetX, y: routine.targetY };
  return routine.route[routine.routeIndex] || null;
}

function advanceNpcRouteIfReached(routine, worldX, worldY) {
  if (!Array.isArray(routine.route)) return;
  while (routine.routeIndex < routine.route.length) {
    const waypoint = routine.route[routine.routeIndex];
    if (Phaser.Math.Distance.Between(worldX, worldY, waypoint.x, waypoint.y) >= 5) return;
    routine.routeIndex += 1;
  }
}

function sameWorldTarget(routine, target) {
  return (
    Math.abs((routine.targetX || 0) - (target.worldX || 0)) < 2 &&
    Math.abs((routine.targetY || 0) - (target.worldY || 0)) < 2
  );
}

function buildNpcWorldRoute(map, startWorldX, startWorldY, targetWorldX, targetWorldY, tileSize) {
  const start = nearestWalkableTile(map, worldToTile(startWorldX, startWorldY, tileSize));
  const target = nearestWalkableTile(map, worldToTile(targetWorldX, targetWorldY, tileSize));
  if (!start || !target) return [{ x: targetWorldX, y: targetWorldY }];

  const queue = [start];
  const visited = new Set([tileKey(start)]);
  const previous = new Map();
  let cursor = 0;

  while (cursor < queue.length) {
    const current = queue[cursor];
    cursor += 1;
    if (current.x === target.x && current.y === target.y) break;

    walkableNeighbors(map, current).forEach((next) => {
      const key = tileKey(next);
      if (visited.has(key)) return;
      visited.add(key);
      previous.set(key, current);
      queue.push(next);
    });
  }

  if (!visited.has(tileKey(target))) return [{ x: targetWorldX, y: targetWorldY }];

  const tiles = [];
  let step = target;
  while (step) {
    tiles.push(step);
    if (step.x === start.x && step.y === start.y) break;
    step = previous.get(tileKey(step));
  }
  tiles.reverse();

  const compressed = compressTileRoute(tiles);
  const route = compressed.map((tile) => ({
    x: tile.x * tileSize + tileSize / 2,
    y: tile.y * tileSize + tileSize / 2,
  }));
  if (route.length) route[route.length - 1] = { x: targetWorldX, y: targetWorldY };
  return route;
}

function worldToTile(worldX, worldY, tileSize) {
  return {
    x: Math.floor(worldX / tileSize),
    y: Math.floor(worldY / tileSize),
  };
}

function nearestWalkableTile(map, origin) {
  if (isWalkableTile(map, origin.x, origin.y)) return origin;
  const queue = [origin];
  const visited = new Set([tileKey(origin)]);
  let cursor = 0;

  while (cursor < queue.length && cursor < 80) {
    const current = queue[cursor];
    cursor += 1;
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    for (const next of neighbors) {
      if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height) continue;
      const key = tileKey(next);
      if (visited.has(key)) continue;
      if (isWalkableTile(map, next.x, next.y)) return next;
      visited.add(key);
      queue.push(next);
    }
  }
  return null;
}

function walkableNeighbors(map, tile) {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ].filter((candidate) => isWalkableTile(map, candidate.x, candidate.y));
}

function isWalkableTile(map, x, y) {
  return Boolean(map.tiles?.[y] && map.tiles[y][x] === map.legend.floor);
}

function compressTileRoute(route) {
  if (route.length <= 2) return route;
  const compressed = [route[0]];
  for (let index = 1; index < route.length - 1; index += 1) {
    const previous = route[index - 1];
    const current = route[index];
    const next = route[index + 1];
    const sameHorizontal = previous.y === current.y && current.y === next.y;
    const sameVertical = previous.x === current.x && current.x === next.x;
    if (!sameHorizontal && !sameVertical) compressed.push(current);
  }
  compressed.push(route[route.length - 1]);
  return compressed;
}

function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}

function nextVisualRoutineTarget(map, npc, tileSize, workspace, pulseIndex = 0) {
  const base = resolveNpcWorldTarget(map, npc, tileSize, workspace, pulseIndex);
  const state = npc.currentState || "working_at_desk";
  const hash = stableHash(`${npc.employeeId || npc.nome}:${pulseIndex}`);

  if (state === "working_at_desk" || state === "focused_work" || state === "idle_at_desk") {
    const shouldShift = state !== "focused_work" && hash % 3 === 0;
    if (!shouldShift) {
      return { ...base, speed: 0, moment: visualMomentForState(state) };
    }
    return workRoomMicroTarget(map, npc, tileSize, hash, state);
  }

  if (state === "slacking_off") {
    return {
      ...slackingTarget(map, npc, tileSize, pulseIndex + hash),
      speed: 24,
      moment: "fora_da_mesa",
    };
  }

  if (state === "coffee_break" || state === "informal_chat") {
    return roomActivityTarget(map, "copa", npc, tileSize, hash, state === "informal_chat" ? "conversa_na_copa" : "pausa_na_copa", 34);
  }

  if (state === "meeting") {
    return roomActivityTarget(map, "reuniao", npc, tileSize, hash, "em_reuniao", 36);
  }

  if (state === "restroom_break") {
    return roomActivityTarget(map, "banheiro", npc, tileSize, hash, "indisponivel", 38);
  }

  if (state === "going_to_hr") {
    return roomActivityTarget(map, "rh", npc, tileSize, hash, "procurando_rh", 42);
  }

  if (state === "leaving_work") {
    return roomActivityTarget(map, "recepcao", npc, tileSize, hash, "saindo", 46);
  }

  return { ...base, speed: speedForNpc(npc), moment: visualMomentForState(state) };
}

function workRoomMicroTarget(map, npc, tileSize, hash, state) {
  const room =
    map.rooms.find((candidate) => candidate.id === npc.currentRoomId) ||
    map.rooms.find((candidate) => candidate.id === npc.homeRoomId) ||
    map.rooms.find((candidate) => candidate.sectorId === npc.setorId) ||
    map.rooms[0];
  const spots = [
    { x: room.x + 2, y: room.y + 2 },
    { x: room.x + room.width - 2, y: room.y + 2 },
    { x: room.x + 2, y: room.y + room.height - 2 },
    { x: room.x + Math.floor(room.width / 2), y: room.y + room.height - 2 },
  ];
  const spot = spots[hash % spots.length];
  return {
    roomId: room.id,
    worldX: spot.x * tileSize + tileSize / 2,
    worldY: spot.y * tileSize + tileSize / 2,
    speed: state === "idle_at_desk" ? 18 : 22,
    moment: state === "idle_at_desk" ? "circulando_sem_demanda" : "ajuste_de_trabalho",
  };
}

function roomActivityTarget(map, roomId, npc, tileSize, hash, moment, speed) {
  const room =
    map.rooms.find((candidate) => candidate.id === roomId) ||
    map.rooms.find((candidate) => candidate.id === npc.currentRoomId) ||
    map.rooms.find((candidate) => candidate.sectorId === npc.setorId) ||
    map.rooms[0];
  const width = Math.max(1, room.width - 3);
  const height = Math.max(1, room.height - 3);
  const tileX = Phaser.Math.Clamp(room.x + 1 + (hash % width), room.x + 1, room.x + room.width - 2);
  const tileY = Phaser.Math.Clamp(room.y + 1 + (Math.floor(hash / 5) % height), room.y + 1, room.y + room.height - 2);
  return {
    roomId: room.id,
    worldX: tileX * tileSize + tileSize / 2,
    worldY: tileY * tileSize + tileSize / 2,
    speed,
    moment,
  };
}

function visualMomentForState(state) {
  const moments = {
    working_at_desk: "trabalhando",
    focused_work: "em_foco",
    idle_at_desk: "ocioso",
    coffee_break: "pausa_na_copa",
    informal_chat: "conversa_na_copa",
    meeting: "em_reuniao",
    restroom_break: "indisponivel",
    slacking_off: "fora_da_mesa",
    going_to_hr: "procurando_rh",
    leaving_work: "saindo",
  };
  return moments[state] || "rotina";
}

function resolveNpcWorldTarget(map, npc, tileSize, workspace, index = 0) {
  if (npc.currentState === "slacking_off") {
    return slackingTarget(map, npc, tileSize, index);
  }
  const locationId = npc.targetLocationId || npc.currentLocationId || npc.deskId;
  const logicalPoint = findWorkspacePoint(workspace, locationId);
  if (logicalPoint) return pointToWorld(map, logicalPoint, tileSize, npc, index, workspace);

  const desk = findWorkspaceDesk(workspace, npc.deskId);
  if (desk) return pointToWorld(map, desk, tileSize, npc, index, workspace);

  const roomId = npc.currentRoomId || npc.homeRoomId || npc.roomId;
  return roomCenterTarget(map, roomId, npc, tileSize, index);
}

function slackingTarget(map, npc, tileSize, index) {
  const room =
    map.rooms.find((candidate) => candidate.id === npc.currentRoomId) ||
    map.rooms.find((candidate) => candidate.sectorId === npc.setorId) ||
    map.rooms[0];
  const hash = stableHash(npc.employeeId || npc.nome || index);
  const spots = [
    { x: room.x + room.width - 2, y: room.y + 2 },
    { x: room.x + room.width - 2, y: room.y + room.height - 2 },
    { x: room.x + 2, y: room.y + room.height - 2 },
    { x: room.x + Math.floor(room.width / 2), y: room.y + room.height - 2 },
  ];
  const spot = spots[hash % spots.length];
  return {
    roomId: room.id,
    worldX: spot.x * tileSize + tileSize / 2,
    worldY: spot.y * tileSize + tileSize / 2,
  };
}

function findWorkspacePoint(workspace, locationId) {
  if (!workspace || !locationId) return null;
  return (workspace.pointsOfInterest || []).find((point) => point.id === locationId);
}

function findWorkspaceDesk(workspace, deskId) {
  if (!workspace || !deskId) return null;
  return (workspace.desks || []).find((desk) => desk.id === deskId);
}

function pointToWorld(map, point, tileSize, npc, index, workspace) {
  if (point.type === "desk" || String(point.id || "").startsWith("point_desk_") || String(point.id || "").startsWith("desk_")) {
    const deskId = String(point.id || "").replace(/^point_/, "");
    const desk = findWorkspaceDesk(workspace, deskId) || { ...point, id: deskId, roomId: point.roomId, sectorId: npc.setorId };
    const target = deskVisualTarget(map, workspace, desk, tileSize);
    return npcStandTargetForDesk(map, target, npc, index, tileSize);
  }

  const room = map.rooms.find((candidate) => candidate.id === point.roomId) || map.rooms.find((candidate) => candidate.sectorId === npc.setorId);
  if (!room) return roomCenterTarget(map, point.roomId, npc, tileSize, index);

  const local = point.position || { x: 1, y: 1 };
  const stableOffset = offsetForNpc(npc, index, tileSize);
  const tileX = Phaser.Math.Clamp(room.x + 1 + (local.x % Math.max(1, room.width - 2)), room.x + 1, room.x + room.width - 2);
  const tileY = Phaser.Math.Clamp(room.y + 1 + (local.y % Math.max(1, room.height - 2)), room.y + 1, room.y + room.height - 2);
  return {
    roomId: room.id,
    worldX: tileX * tileSize + tileSize / 2 + stableOffset.x,
    worldY: tileY * tileSize + tileSize / 2 + stableOffset.y,
  };
}

function npcStandTargetForDesk(map, deskTarget, npc, index, tileSize) {
  const room = map.rooms.find((candidate) => candidate.id === deskTarget.roomId) || map.rooms[0];
  const hash = stableHash(npc.employeeId || npc.nome || index);
  const side = hash % 2 === 0 ? -1 : 1;
  const preferred = [
    { x: deskTarget.worldX, y: deskTarget.worldY + tileSize * 1.08 },
    { x: deskTarget.worldX + side * tileSize * 1.08, y: deskTarget.worldY + tileSize * 0.72 },
    { x: deskTarget.worldX - side * tileSize * 1.08, y: deskTarget.worldY + tileSize * 0.72 },
    { x: deskTarget.worldX, y: deskTarget.worldY - tileSize * 1.08 },
  ];
  const bounds = roomWorldBounds(room, tileSize, 1.05);
  const point = preferred.find((candidate) => pointInWorldBounds(candidate, bounds)) || preferred[0];

  return {
    roomId: deskTarget.roomId,
    worldX: Phaser.Math.Clamp(point.x, bounds.minX, bounds.maxX),
    worldY: Phaser.Math.Clamp(point.y, bounds.minY, bounds.maxY),
  };
}

function roomWorldBounds(room, tileSize, marginTiles = 1) {
  return {
    minX: (room.x + marginTiles) * tileSize,
    maxX: (room.x + room.width - marginTiles) * tileSize,
    minY: (room.y + marginTiles) * tileSize,
    maxY: (room.y + room.height - marginTiles) * tileSize,
  };
}

function pointInWorldBounds(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function deskVisualTarget(map, workspace, desk, tileSize) {
  const room =
    map.rooms.find((candidate) => candidate.id === desk.roomId) ||
    map.rooms.find((candidate) => candidate.sectorId === desk.sectorId) ||
    map.rooms[0];
  const desks = (workspace?.desks || [])
    .filter((item) => item.roomId === desk.roomId || (desk.sectorId && item.sectorId === desk.sectorId))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const index = Math.max(0, desks.findIndex((item) => item.id === desk.id));
  const columns = Math.max(1, Math.floor((room.width - 2) / 2));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const tileX = Phaser.Math.Clamp(room.x + 1 + column * 2, room.x + 1, room.x + room.width - 2);
  const tileY = Phaser.Math.Clamp(room.y + 2 + row * 2, room.y + 2, Math.max(room.y + 2, room.y + room.height - 3));
  return {
    roomId: room.id,
    worldX: tileX * tileSize + tileSize / 2,
    worldY: tileY * tileSize + tileSize / 2,
  };
}

function roomCenterTarget(map, roomId, npc, tileSize, index) {
  const room =
    map.rooms.find((candidate) => candidate.id === roomId) ||
    map.rooms.find((candidate) => candidate.sectorId === npc.setorId) ||
    map.rooms[0];
  const stableOffset = offsetForNpc(npc, index, tileSize);
  return {
    roomId: room.id,
    worldX: (room.x + room.width / 2) * tileSize + stableOffset.x,
    worldY: (room.y + room.height / 2) * tileSize + stableOffset.y,
  };
}

function offsetForNpc(npc, index, tileSize) {
  const hash = stableHash(npc.employeeId || npc.nome || index);
  return {
    x: ((hash % 3) - 1) * tileSize * 0.18,
    y: (((Math.floor(hash / 3) + index) % 3) - 1) * tileSize * 0.18,
  };
}

function speedForNpc(npc) {
  if (npc.currentState === "working_at_desk" || npc.currentState === "focused_work" || npc.currentState === "idle_at_desk") return 0;
  if (npc.currentState === "coffee_break" || npc.currentState === "informal_chat") return 36;
  if (npc.currentState === "meeting") return 38;
  if (npc.currentState === "restroom_break") return 40;
  if (npc.currentState === "slacking_off") return 24;
  if (npc.currentState === "going_to_hr") return 42;
  if (npc.currentState === "leaving_work") return 46;
  if (npc.estadoVisivel === "quer_conversar") return 44;
  if (npc.estadoVisivel === "sobrecarregado_aparente") return 34;
  if (npc.estadoVisivel === "distante") return 22;
  return 28;
}

function updateNpcAttachments(sprite) {
  const label = sprite.getData("label");
  if (label) label.setPosition(sprite.x - 24, sprite.y + 20);
  const bubble = sprite.getData("bubble");
  if (bubble) bubble.setPosition(sprite.x + 10, sprite.y - 18);
}

function updateNpcStateBadge(sprite, npc) {
  const label = sprite.getData("label");
  if (label) label.setText(npcLabelText(npc));
}

function stateShortLabel(npc) {
  if (npc.visualMoment === "ajuste_de_trabalho") return "circulando";
  if (npc.visualMoment === "fora_da_mesa") return "fora mesa";
  if (npc.currentState === "coffee_break") return "pausa";
  if (npc.currentState === "informal_chat") return "conversa";
  if (npc.currentState === "meeting") return "reuniao";
  if (npc.currentState === "restroom_break") return "banheiro";
  if (npc.currentState === "slacking_off") return "morcegando";
  if (npc.currentState === "focused_work") return "foco";
  if (npc.currentState === "going_to_hr") return "RH";
  if (npc.currentState === "leaving_work") return "saida";
  if (npc.currentState === "idle_at_desk") return "mesa";
  return "trabalho";
}

function npcInteractionLabel(npc) {
  const unavailable = ["meeting", "restroom_break", "leaving_work"].includes(npc.currentState);
  const suffix = unavailable ? " (indisponivel agora)" : "";
  return `${npc.nome} - ${npc.cargo}${suffix}`;
}

function findSnapshotNpc(snapshot, employeeId) {
  return (snapshot?.world?.npcs || []).find((npc) => npc.employeeId === employeeId || npc.id === employeeId);
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
