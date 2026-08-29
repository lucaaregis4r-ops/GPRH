/**
 * Modulo: workspaceAssignment
 * Responsabilidade: atribuir funcionarios ativos a mesas e salas logicas.
 * Entrada: state com workspace, setores e funcionarios
 * Saida: state normalizado com deskId, homeRoomId e currentRoomId
 * Nao deve: decidir rotina, aplicar efeitos de indicadores ou renderizar UI.
 */

const { createRng } = require("../core/rng");
const { generateWorkspace, ROOM_TYPES, POINT_TYPES } = require("./workspaceGenerator");
const { normalizeEmployeeSimulationFields } = require("../simulation/employeeSimulationDefaults");

function ensureWorkspace(state) {
  if (!state.workspace || !Array.isArray(state.workspace.rooms) || !Array.isArray(state.workspace.desks)) {
    state.workspace = generateWorkspace({
      company: state.company,
      sectors: state.sectors || [],
      employees: state.employees || [],
      rng: createRng(`${state.seed || state.company?.seed || "workspace"}:workspace`),
    });
  }

  ensureWorkspaceAmenities(state.workspace);
  assignEmployeesToDesks(state);
  return state.workspace;
}

function ensureWorkspaceAmenities(workspace) {
  if (!(workspace.rooms || []).some((room) => room.id === "banheiro")) {
    workspace.rooms.push({
      id: "banheiro",
      name: "Banheiro",
      type: ROOM_TYPES.RESTROOM,
      sectorId: null,
      capacity: 4,
      privacy: 90,
      noiseLevel: 20,
      position: { x: 0, y: 0 },
      size: { width: 6, height: 5 },
      deskIds: [],
      pointIds: [],
    });
  }

  workspace.pointsOfInterest = workspace.pointsOfInterest || [];
  const restroom = workspace.rooms.find((room) => room.id === "banheiro");
  if (!workspace.pointsOfInterest.some((point) => point.id === "point_banheiro_pia")) {
    workspace.pointsOfInterest.push({
      id: "point_banheiro_pia",
      roomId: "banheiro",
      type: POINT_TYPES.RESTROOM_SINK,
      position: { x: 2, y: 2 },
      tags: ["pausa", "banheiro"],
    });
  }
  if (restroom && !restroom.pointIds.includes("point_banheiro_pia")) restroom.pointIds.push("point_banheiro_pia");
}

function assignEmployeesToDesks(state) {
  const workspace = state.workspace;
  if (!workspace) return state;

  const roomById = new Map((workspace.rooms || []).map((room) => [room.id, room]));
  const desks = workspace.desks || [];
  const deskById = new Map(desks.map((desk) => [desk.id, desk]));
  const activeEmployees = (state.employees || []).filter((employee) => employee.status !== "desligado");

  desks.forEach((desk) => {
    if (desk.assignedEmployeeId && !activeEmployees.some((employee) => employee.id === desk.assignedEmployeeId)) {
      desk.assignedEmployeeId = null;
      desk.status = "available";
    }
  });

  activeEmployees.forEach((employee) => {
    const existingDesk = employee.deskId ? deskById.get(employee.deskId) : null;
    if (existingDesk && (!existingDesk.assignedEmployeeId || existingDesk.assignedEmployeeId === employee.id)) {
      assignEmployeeToDesk(employee, existingDesk, roomById);
      return;
    }

    const desk = findAvailableDeskForEmployee(employee, desks) || createFallbackDeskForEmployee(workspace, employee, roomById);
    assignEmployeeToDesk(employee, desk, roomById);
  });

  return state;
}

function assignEmployeeToDesk(employee, desk, roomById) {
  const room = roomById.get(desk.roomId);
  desk.assignedEmployeeId = employee.id;
  desk.status = "occupied";
  employee.deskId = desk.id;
  employee.homeRoomId = desk.roomId;
  employee.currentRoomId = employee.currentRoomId || desk.roomId;
  if (!employee.currentLocationId) employee.currentLocationId = desk.id;
  if (room && room.sectorId && !employee.setorId) employee.setorId = room.sectorId;
}

function findAvailableDeskForEmployee(employee, desks) {
  return (
    desks.find((desk) => desk.sectorId === employee.setorId && !desk.assignedEmployeeId) ||
    desks.find((desk) => !desk.assignedEmployeeId)
  );
}

function createFallbackDeskForEmployee(workspace, employee, roomById) {
  let room = (workspace.rooms || []).find((item) => item.sectorId === employee.setorId);
  if (!room) {
    room = {
      id: `room_${employee.setorId || "sem_setor"}`,
      name: "Setor sem sala definida",
      type: "sector_room",
      sectorId: employee.setorId || null,
      capacity: 1,
      privacy: 40,
      noiseLevel: 45,
      position: { x: 0, y: 0 },
      size: { width: 7, height: 5 },
      deskIds: [],
      pointIds: [],
    };
    workspace.rooms.push(room);
    roomById.set(room.id, room);
  }

  const desk = {
    id: `desk_fallback_${employee.id}`,
    roomId: room.id,
    sectorId: employee.setorId || room.sectorId || null,
    assignedEmployeeId: null,
    position: { x: 1 + (room.deskIds.length % Math.max(1, room.size.width - 2)), y: 1 },
    status: "available",
  };
  workspace.desks.push(desk);
  room.deskIds.push(desk.id);
  workspace.pointsOfInterest = workspace.pointsOfInterest || [];
  workspace.pointsOfInterest.push({
    id: `point_${desk.id}`,
    roomId: room.id,
    type: "desk",
    position: desk.position,
    tags: ["trabalho", "mesa", "fallback"],
  });
  room.pointIds.push(`point_${desk.id}`);
  return desk;
}

function normalizeEmployeeWorkspaceFields(employee) {
  normalizeEmployeeSimulationFields(employee);
  if (typeof employee.deskId === "undefined") employee.deskId = null;
  if (typeof employee.homeRoomId === "undefined") employee.homeRoomId = null;
  if (typeof employee.currentRoomId === "undefined") employee.currentRoomId = employee.homeRoomId || null;
  if (typeof employee.currentLocationId === "undefined") employee.currentLocationId = employee.deskId || null;
  if (typeof employee.targetLocationId === "undefined") employee.targetLocationId = null;
  return employee;
}

function normalizeWorkspaceState(state) {
  (state.employees || []).forEach(normalizeEmployeeWorkspaceFields);
  ensureWorkspace(state);
  return state;
}

module.exports = {
  ensureWorkspace,
  assignEmployeesToDesks,
  normalizeEmployeeWorkspaceFields,
  normalizeWorkspaceState,
};
