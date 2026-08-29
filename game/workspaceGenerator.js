/**
 * Modulo: workspaceGenerator
 * Responsabilidade: criar o modelo logico persistente do espaco organizacional.
 * Entrada: company, sectors, employees e rng deterministico
 * Saida: workspace com salas, mesas e pontos de interesse
 * Nao deve: renderizar UI, mover NPCs ou decidir rotina diaria.
 */

const ROOM_TYPES = {
  SECTOR_ROOM: "sector_room",
  HR_ROOM: "hr_room",
  MEETING_ROOM: "meeting_room",
  COFFEE_ROOM: "coffee_room",
  RESTROOM: "restroom",
  DIRECTOR_ROOM: "director_room",
  RECEPTION: "reception",
  HALLWAY: "hallway",
};

const POINT_TYPES = {
  DESK: "desk",
  COFFEE_MACHINE: "coffee_machine",
  MEETING_TABLE: "meeting_table",
  HR_DESK: "hr_desk",
  NOTICE_BOARD: "notice_board",
  RESTROOM_SINK: "restroom_sink",
  EXIT: "exit",
};

function generateWorkspace({ company, sectors, employees, rng }) {
  const workspace = {
    id: "workspace_main",
    companyId: company.id,
    rooms: [],
    desks: [],
    pointsOfInterest: [],
    version: 1,
  };

  const activeEmployees = employees.filter((employee) => employee.status !== "desligado");
  const employeeCountBySector = countEmployeesBySector(activeEmployees);

  addBaseRooms(workspace);
  sectors.forEach((sector, index) => {
    const employeeCount = employeeCountBySector.get(sector.id) || 0;
    const room = createRoom({
      id: `room_${sector.id}`,
      name: sector.nome,
      type: ROOM_TYPES.SECTOR_ROOM,
      sectorId: sector.id,
      capacity: Math.max(1, employeeCount),
      privacy: 45,
      noiseLevel: Math.round(35 + (sector.cargaTrabalho || 50) * 0.25),
      position: gridPosition(index + 5),
      size: roomSizeForCapacity(employeeCount),
    });
    workspace.rooms.push(room);
    createDesksForRoom(workspace, room, Math.max(1, employeeCount), rng);
  });

  addPoint(workspace, "point_recepcao_quadro", "recepcao", POINT_TYPES.NOTICE_BOARD, { x: 2, y: 2 }, ["comunicacao"]);
  addPoint(workspace, "point_recepcao_saida", "recepcao", POINT_TYPES.EXIT, { x: 0, y: 2 }, ["entrada", "saida"]);
  addPoint(workspace, "point_rh_mesa", "rh", POINT_TYPES.HR_DESK, { x: 2, y: 2 }, ["rh"]);
  addPoint(workspace, "point_copa_cafe", "copa", POINT_TYPES.COFFEE_MACHINE, { x: 2, y: 2 }, ["pausa", "social"]);
  addPoint(workspace, "point_reuniao_mesa", "reuniao", POINT_TYPES.MEETING_TABLE, { x: 3, y: 2 }, ["reuniao"]);
  addPoint(workspace, "point_banheiro_pia", "banheiro", POINT_TYPES.RESTROOM_SINK, { x: 2, y: 2 }, ["pausa", "banheiro"]);

  return workspace;
}

function addBaseRooms(workspace) {
  [
    createRoom({
      id: "recepcao",
      name: "Recepcao",
      type: ROOM_TYPES.RECEPTION,
      capacity: 4,
      privacy: 20,
      noiseLevel: 45,
      position: gridPosition(0),
      size: { width: 7, height: 5 },
    }),
    createRoom({
      id: "rh",
      name: "Sala do RH",
      type: ROOM_TYPES.HR_ROOM,
      capacity: 3,
      privacy: 75,
      noiseLevel: 25,
      position: gridPosition(1),
      size: { width: 7, height: 5 },
    }),
    createRoom({
      id: "reuniao",
      name: "Sala de reuniao",
      type: ROOM_TYPES.MEETING_ROOM,
      capacity: 8,
      privacy: 65,
      noiseLevel: 35,
      position: gridPosition(2),
      size: { width: 9, height: 6 },
    }),
    createRoom({
      id: "copa",
      name: "Copa",
      type: ROOM_TYPES.COFFEE_ROOM,
      capacity: 8,
      privacy: 30,
      noiseLevel: 55,
      position: gridPosition(3),
      size: { width: 7, height: 5 },
    }),
    createRoom({
      id: "banheiro",
      name: "Banheiro",
      type: ROOM_TYPES.RESTROOM,
      capacity: 4,
      privacy: 90,
      noiseLevel: 20,
      position: gridPosition(4),
      size: { width: 6, height: 5 },
    }),
    createRoom({
      id: "diretoria",
      name: "Diretoria",
      type: ROOM_TYPES.DIRECTOR_ROOM,
      capacity: 3,
      privacy: 85,
      noiseLevel: 20,
      position: gridPosition(5),
      size: { width: 7, height: 5 },
    }),
  ].forEach((room) => workspace.rooms.push(room));
}

function createRoom({ id, name, type, sectorId = null, capacity, privacy, noiseLevel, position, size }) {
  return {
    id,
    name,
    type,
    sectorId,
    capacity,
    privacy,
    noiseLevel,
    position,
    size,
    deskIds: [],
    pointIds: [],
  };
}

function createDesksForRoom(workspace, room, count, rng) {
  for (let index = 0; index < count; index += 1) {
    const desk = {
      id: `desk_${room.sectorId || room.id}_${String(index + 1).padStart(3, "0")}`,
      roomId: room.id,
      sectorId: room.sectorId,
      assignedEmployeeId: null,
      position: deskPosition(index, room.size, rng),
      status: "available",
    };
    workspace.desks.push(desk);
    room.deskIds.push(desk.id);
    addPoint(workspace, `point_${desk.id}`, room.id, POINT_TYPES.DESK, desk.position, ["trabalho", "mesa"]);
  }
}

function addPoint(workspace, id, roomId, type, position, tags = []) {
  workspace.pointsOfInterest.push({
    id,
    roomId,
    type,
    position,
    tags,
  });
  const room = workspace.rooms.find((item) => item.id === roomId);
  if (room && !room.pointIds.includes(id)) room.pointIds.push(id);
}

function countEmployeesBySector(employees) {
  const counts = new Map();
  employees.forEach((employee) => {
    counts.set(employee.setorId, (counts.get(employee.setorId) || 0) + 1);
  });
  return counts;
}

function gridPosition(index) {
  const columns = 4;
  return {
    x: (index % columns) * 10,
    y: Math.floor(index / columns) * 8,
  };
}

function roomSizeForCapacity(capacity) {
  const width = Math.max(7, Math.min(14, Math.ceil(Math.sqrt(Math.max(1, capacity)) * 3)));
  const height = Math.max(5, Math.ceil(Math.max(1, capacity) / Math.max(1, width - 2)) + 3);
  return { width, height };
}

function deskPosition(index, size, rng) {
  const usableWidth = Math.max(1, size.width - 2);
  const base = {
    x: 1 + (index % usableWidth),
    y: 1 + Math.floor(index / usableWidth),
  };
  if (!rng || typeof rng.chance !== "function") return base;
  return {
    x: base.x,
    y: Math.min(size.height - 2, base.y + (rng.chance(18) ? 1 : 0)),
  };
}

module.exports = {
  ROOM_TYPES,
  POINT_TYPES,
  generateWorkspace,
};
