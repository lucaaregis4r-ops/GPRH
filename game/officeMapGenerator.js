/**
 * Modulo: officeMapGenerator
 * Responsabilidade: transformar empresa/setores/funcionarios em mapa de escritorio.
 * Entrada: state da engine
 * Saida: mapa deterministico com salas, corredores, spawns e validacao
 * Nao deve: depender de Phaser nem executar regras de simulacao.
 */

const { createRng } = require("../core/rng");

const TILE = {
  WALL: 0,
  FLOOR: 1,
};

function generateOfficeMap(state, options = {}) {
  const rng = createRng(`${state.seed}:office-map`);
  const employeeCountBySector = countActiveEmployeesBySector(state);
  const sectorRooms = state.sectors.map((sector) => ({
    id: `room_${sector.id}`,
    tipo: "setor",
    nome: sector.nome,
    sectorId: sector.id,
    employeeCount: employeeCountBySector.get(sector.id) || 0,
  }));
  const baseRooms = [
    { id: "recepcao", tipo: "recepcao", nome: "Recepcao" },
    { id: "rh", tipo: "rh", nome: "Sala do RH" },
    { id: "reuniao", tipo: "reuniao", nome: "Sala de reuniao" },
    { id: "copa", tipo: "copa", nome: "Copa" },
    { id: "banheiro", tipo: "banheiro", nome: "Banheiro" },
    { id: "diretoria", tipo: "diretoria", nome: "Diretoria" },
  ];
  const roomSpecs = [...baseRooms, ...shuffle(sectorRooms, rng)];
  const columns = Math.max(4, Math.ceil(roomSpecs.length / 2));
  const cellWidth = options.cellWidth || 18;
  const cellHeight = options.cellHeight || 11;
  const corridorHeight = 3;
  const width = columns * cellWidth + 2;
  const height = cellHeight * 2 + corridorHeight + 4;
  const corridorY = 2 + cellHeight;
  const tiles = createTiles(width, height, TILE.WALL);

  const corridor = { id: "corredor_principal", x: 1, y: corridorY, width: width - 2, height: corridorHeight };
  carveRect(tiles, corridor, TILE.FLOOR);

  const rooms = roomSpecs.map((room, index) => {
    const column = index % columns;
    const top = index < columns;
    const maxRoomWidth = cellWidth - 2;
    const maxRoomHeight = cellHeight - 2;
    const desired = desiredRoomSize(room, maxRoomWidth, maxRoomHeight);
    const roomWidth = rng.int(Math.max(desired.width, maxRoomWidth - 1), maxRoomWidth);
    const roomHeight = rng.int(Math.max(desired.height, maxRoomHeight - 1), maxRoomHeight);
    const x = 2 + column * cellWidth + rng.int(0, Math.max(0, maxRoomWidth - roomWidth));
    const y = top
      ? 2 + rng.int(0, Math.max(0, maxRoomHeight - roomHeight))
      : corridorY + corridorHeight + rng.int(0, Math.max(0, maxRoomHeight - roomHeight));
    const door = {
      x: x + Math.floor(roomWidth / 2),
      y: top ? corridorY : corridorY + corridorHeight - 1,
    };
    const rect = {
      ...room,
      x,
      y,
      width: roomWidth,
      height: roomHeight,
      door,
      center: { x: x + Math.floor(roomWidth / 2), y: y + Math.floor(roomHeight / 2) },
    };

    carveRect(tiles, rect, TILE.FLOOR);
    carveDoorConnection(tiles, rect, door, top);
    return rect;
  });

  const spawnPoints = buildSpawnPoints(state, rooms);
  const npcPlacements = buildNpcPlacements(state, rooms, spawnPoints);
  const interactables = buildMapInteractables(state, rooms);
  const map = {
    seed: state.seed,
    width,
    height,
    tileSize: 32,
    tiles,
    legend: { wall: TILE.WALL, floor: TILE.FLOOR },
    rooms,
    doors: rooms.map((room) => ({ roomId: room.id, x: room.door.x, y: room.door.y })),
    corridors: [corridor],
    spawnPoints,
    interactables,
    npcPlacements,
  };

  map.validation = validateOfficeMap(map, state);
  return map;
}

function countActiveEmployeesBySector(state) {
  const counts = new Map();
  (state.employees || [])
    .filter((employee) => employee.status !== "desligado")
    .forEach((employee) => {
      counts.set(employee.setorId, (counts.get(employee.setorId) || 0) + 1);
    });
  return counts;
}

function desiredRoomSize(room, maxRoomWidth, maxRoomHeight) {
  if (room.tipo !== "setor") {
    return {
      width: Math.min(maxRoomWidth, Math.max(8, maxRoomWidth - 2)),
      height: Math.min(maxRoomHeight, Math.max(6, maxRoomHeight - 2)),
    };
  }

  const count = Math.max(1, room.employeeCount || 1);
  const columns = Math.max(2, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  return {
    width: Math.min(maxRoomWidth, Math.max(10, columns * 3 + 3)),
    height: Math.min(maxRoomHeight, Math.max(7, rows * 3 + 3)),
  };
}

function validateOfficeMap(map, state) {
  const errors = [];
  const roomById = new Map(map.rooms.map((room) => [room.id, room]));
  ["recepcao", "rh", "reuniao", "copa", "banheiro", "diretoria"].forEach((roomId) => {
    if (!roomById.has(roomId)) errors.push(`sala obrigatoria ausente: ${roomId}`);
  });

  state.sectors.forEach((sector) => {
    if (!roomById.has(`room_${sector.id}`)) errors.push(`setor sem sala: ${sector.id}`);
  });

  const startRoom = roomById.get("recepcao");
  const reachable = startRoom ? floodFill(map, startRoom.door) : new Set();
  map.rooms.forEach((room) => {
    if (!reachable.has(pointKey(room.door))) errors.push(`sala inacessivel: ${room.id}`);
  });

  const activeEmployeeIds = new Set(state.employees.filter((employee) => employee.status !== "desligado").map((employee) => employee.id));
  activeEmployeeIds.forEach((employeeId) => {
    const placement = map.npcPlacements.find((item) => item.employeeId === employeeId);
    if (!placement) {
      errors.push(`funcionario ativo sem spawn: ${employeeId}`);
      return;
    }
    if (!isFloor(map, placement.x, placement.y)) errors.push(`funcionario em parede: ${employeeId}`);
    if (!reachable.has(pointKey(placement))) errors.push(`funcionario inacessivel: ${employeeId}`);
  });

  map.npcPlacements.forEach((placement) => {
    const room = roomById.get(placement.roomId);
    if (!room || !pointInsideRect(placement, room)) {
      errors.push(`npc fora da sala esperada: ${placement.employeeId}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

function buildSpawnPoints(state, rooms) {
  const points = [];
  rooms.forEach((room) => {
    const capacity = Math.max(1, (room.width - 2) * (room.height - 2));
    for (let index = 0; index < capacity; index += 1) {
      const x = room.x + 1 + (index % Math.max(1, room.width - 2));
      const y = room.y + 1 + Math.floor(index / Math.max(1, room.width - 2));
      if (x < room.x + room.width - 1 && y < room.y + room.height - 1) {
        points.push({
          id: `spawn_${room.id}_${String(index + 1).padStart(3, "0")}`,
          roomId: room.id,
          sectorId: room.sectorId || null,
          x,
          y,
          tipo: room.tipo === "setor" ? "mesa_funcionario" : "interacao",
        });
      }
    }
  });
  return points;
}

function buildNpcPlacements(state, rooms, spawnPoints) {
  const roomBySector = new Map(rooms.filter((room) => room.sectorId).map((room) => [room.sectorId, room]));
  const usedSpawnIds = new Set();

  return state.employees
    .filter((employee) => employee.status !== "desligado")
    .map((employee) => {
      const room = roomBySector.get(employee.setorId) || rooms.find((item) => item.id === "rh") || rooms[0];
      const spawn =
        spawnPoints.find((point) => point.roomId === room.id && !usedSpawnIds.has(point.id)) ||
        spawnPoints.find((point) => !usedSpawnIds.has(point.id));
      usedSpawnIds.add(spawn.id);
      return {
        employeeId: employee.id,
        nome: employee.nome,
        setorId: employee.setorId,
        cargo: employee.cargoFormal ? employee.cargoFormal.nome : "Funcionario",
        roomId: room.id,
        spawnId: spawn.id,
        x: spawn.x,
        y: spawn.y,
        rotinaAtual: inferRoutine(employee),
        estadoVisivel: inferVisibleState(employee),
        disponibilidade: inferAvailability(employee),
      };
    });
}

function buildMapInteractables(state, rooms) {
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const pointInRoom = (roomId, label, type) => {
    const room = byId.get(roomId);
    return {
      id: type,
      tipo: type,
      roomId,
      label,
      x: room.center.x,
      y: room.center.y,
    };
  };

  return [
    pointInRoom("rh", "Mesa do RH", "mesa_rh"),
    pointInRoom("recepcao", "Quadro de avisos", "quadro_avisos"),
    pointInRoom("copa", "Copa", "copa"),
    pointInRoom("banheiro", "Banheiro", "banheiro"),
    pointInRoom("diretoria", "Diretoria", "diretoria"),
    pointInRoom("reuniao", "Mesa de reuniao", "mesa_reuniao"),
    ...state.sectors.map((sector) => {
      const room = byId.get(`room_${sector.id}`);
      return {
        id: `observacao_${sector.id}`,
        tipo: "observacao_setor",
        roomId: room.id,
        sectorId: sector.id,
        label: `Observar ${sector.nome}`,
        x: room.center.x,
        y: room.center.y,
      };
    }),
  ];
}

function createTiles(width, height, value) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => value));
}

function carveRect(tiles, rect, value) {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (tiles[y] && typeof tiles[y][x] !== "undefined") tiles[y][x] = value;
    }
  }
}

function carveDoorConnection(tiles, room, door, top) {
  tiles[door.y][door.x] = TILE.FLOOR;
  const roomEdgeY = top ? room.y + room.height - 1 : room.y;
  const step = top ? 1 : -1;
  for (let y = roomEdgeY; top ? y <= door.y : y >= door.y; y += step) {
    tiles[y][door.x] = TILE.FLOOR;
  }
}

function floodFill(map, start) {
  const visited = new Set();
  const queue = [start];
  while (queue.length) {
    const point = queue.shift();
    const key = pointKey(point);
    if (visited.has(key) || !isFloor(map, point.x, point.y)) continue;
    visited.add(key);
    [
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 },
    ].forEach((next) => {
      if (!visited.has(pointKey(next))) queue.push(next);
    });
  }
  return visited;
}

function isFloor(map, x, y) {
  return Boolean(map.tiles[y] && map.tiles[y][x] === TILE.FLOOR);
}

function pointInsideRect(point, rect) {
  return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function inferRoutine(employee) {
  if ((employee.demandasPendentes || []).some((demand) => demand.status === "pendente")) return "procurando_rh";
  if ((employee.percepcaoRH?.sobrecargaEstimada || 0) >= 75) return "trabalhando_sobrecarregado";
  return "trabalhando";
}

function inferVisibleState(employee) {
  if ((employee.demandasPendentes || []).some((demand) => demand.status === "pendente")) return "quer_conversar";
  if ((employee.percepcaoRH?.sobrecargaEstimada || 0) >= 75) return "sobrecarregado_aparente";
  if ((employee.percepcaoRH?.riscoSaidaEstimado || 0) >= 65) return "distante";
  return "trabalhando";
}

function inferAvailability(employee) {
  if (employee.status !== "ativo") return "indisponivel";
  if ((employee.demandasPendentes || []).some((demand) => demand.status === "pendente")) return "procurando_rh";
  return "disponivel";
}

function shuffle(items, rng) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}

module.exports = {
  TILE,
  generateOfficeMap,
  validateOfficeMap,
};
