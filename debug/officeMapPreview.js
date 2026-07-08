/**
 * Modulo: officeMapPreview
 * Responsabilidade: gerar preview tecnico do escritorio procedural.
 * Entrada: seed opcional
 * Saida: ASCII no console e JSON em src/debug/output
 * Nao deve: criar UI Phaser ou alterar simulacao.
 */

const fs = require("fs");
const path = require("path");
const { createGameSession } = require("../game/gameLoop");
const { generateOfficeMap, TILE } = require("../game/officeMapGenerator");

function runOfficeMapPreview(seed = "RH-MAPA-PREVIEW-001") {
  const session = createGameSession(seed);
  const map = generateOfficeMap(session.state);

  console.log("\nOFFICE_MAP_PREVIEW");
  console.log(`Seed: ${seed}`);
  console.log(`Dimensoes: ${map.width}x${map.height}`);
  console.log(`Salas: ${map.rooms.length}`);
  console.log(`NPCs: ${map.npcPlacements.length}`);
  console.log(`Valido: ${map.validation.valid}`);
  if (map.validation.errors.length) {
    map.validation.errors.forEach((error) => console.log(`- ${error}`));
  }
  console.log("");
  console.log(renderAsciiMap(map));
  writeMapJson(map, seed);
  return map;
}

function renderAsciiMap(map) {
  const npcByPoint = new Set(map.npcPlacements.map((npc) => `${npc.x},${npc.y}`));
  const interactableByPoint = new Set(map.interactables.map((item) => `${item.x},${item.y}`));
  const doorByPoint = new Set(map.doors.map((door) => `${door.x},${door.y}`));

  return map.tiles
    .map((row, y) =>
      row
        .map((tile, x) => {
          const key = `${x},${y}`;
          if (npcByPoint.has(key)) return "n";
          if (interactableByPoint.has(key)) return "i";
          if (doorByPoint.has(key)) return "+";
          return tile === TILE.FLOOR ? "." : "#";
        })
        .join("")
    )
    .join("\n");
}

function writeMapJson(map, seed) {
  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const safeSeed = seed.replace(/[^a-z0-9_-]/gi, "_");
  const filePath = path.join(outputDir, `office-map-${safeSeed}.json`);
  fs.writeFileSync(filePath, JSON.stringify(map, null, 2), "utf8");
  console.log(`\nArquivo JSON gerado: ${path.relative(process.cwd(), filePath)}`);
}

if (require.main === module) {
  runOfficeMapPreview(process.argv[2] || "RH-MAPA-PREVIEW-001");
}

module.exports = {
  runOfficeMapPreview,
  renderAsciiMap,
};
