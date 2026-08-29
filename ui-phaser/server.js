import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createDailyGameSession, playDayAction, endDay } = require("../game/dayLoop");
const { buildGameSnapshot } = require("../game/gameSnapshot");
const { unlockTechnology, upgradeTechnology } = require("../rh/organizationalTechTree");
const { SAVE_VERSION, exportGameSession, importGameSession } = require("../game/saveLoad");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PORT = 4180;
const DEFAULT_SEED = "RH-PHASER-001";
const MAX_JSON_PAYLOAD_BYTES = 8_000_000;
const DEFAULT_SAVE_PATH = path.join(__dirname, ".runtime", "autosave.json");

let session = createDailyGameSession(DEFAULT_SEED);

function startPhaserServer(options = {}) {
  const port = options.port || DEFAULT_PORT;
  const persistenceEnabled = options.persistence !== false;
  const savePath = options.savePath || DEFAULT_SAVE_PATH;
  if (options.seed) {
    session = createDailyGameSession(options.seed);
  } else if (persistenceEnabled) {
    session = loadAutosave(savePath) || session;
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (url.pathname === "/api/game-snapshot" && request.method === "GET") {
        sendJson(response, buildGameSnapshot(session));
        return;
      }

      if (url.pathname === "/api/save/status" && request.method === "GET") {
        sendJson(response, getAutosaveStatus(savePath));
        return;
      }

      if (url.pathname === "/api/save/continue" && request.method === "POST") {
        const loaded = loadAutosave(savePath);
        if (!loaded) throw new Error("nenhum autosave disponivel");
        session = loaded;
        sendJson(response, buildGameSnapshot(session));
        return;
      }

      if (url.pathname === "/api/save/reset" && request.method === "POST") {
        const body = await readJson(request);
        session = createDailyGameSession(body.seed || session.seed || DEFAULT_SEED);
        if (persistenceEnabled) persistAutosave(session, savePath, "cenario_reiniciado");
        sendJson(response, buildGameSnapshot(session));
        return;
      }

      if (url.pathname === "/api/daily/new" && request.method === "POST") {
        const body = await readJson(request);
        session = createDailyGameSession(body.seed || DEFAULT_SEED);
        if (persistenceEnabled) persistAutosave(session, savePath, "cenario_iniciado");
        sendJson(response, buildGameSnapshot(session));
        return;
      }

      if (url.pathname === "/api/daily/action" && request.method === "POST") {
        const body = await readJson(request);
        const result = playDayAction(session, body);
        if (persistenceEnabled) persistAutosave(session, savePath, "acao_concluida");
        sendJson(response, { snapshot: buildGameSnapshot(session), result });
        return;
      }

      if (url.pathname === "/api/daily/end-day" && request.method === "POST") {
        const report = endDay(session);
        if (persistenceEnabled) persistAutosave(session, savePath, "dia_encerrado");
        sendJson(response, { snapshot: buildGameSnapshot(session), report });
        return;
      }

      if (url.pathname === "/api/technology/unlock" && request.method === "POST") {
        const body = await readJson(request);
        const result = unlockTechnology(session.state, body.techId);
        if (persistenceEnabled) persistAutosave(session, savePath, "tecnologia_desbloqueada");
        sendJson(response, { snapshot: buildGameSnapshot(session), result });
        return;
      }

      if (url.pathname === "/api/technology/upgrade" && request.method === "POST") {
        const body = await readJson(request);
        const result = upgradeTechnology(session.state, body.techId);
        if (persistenceEnabled) persistAutosave(session, savePath, "tecnologia_evoluida");
        sendJson(response, { snapshot: buildGameSnapshot(session), result });
        return;
      }

      serveStatic(url.pathname, response);
    } catch (error) {
      sendJson(response, { error: error.message }, 500);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`UI Phaser do RH disponivel em http://127.0.0.1:${port}`);
  });

  return server;
}

function persistAutosave(currentSession, savePath, reason) {
  const payload = exportGameSession(currentSession);
  payload.autosave = {
    savedAt: new Date().toISOString(),
    reason,
    seed: currentSession.seed,
    day: currentSession.state.calendar.totalDiasSimulados + 1,
  };
  fs.mkdirSync(path.dirname(savePath), { recursive: true });
  const temporaryPath = `${savePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(temporaryPath, savePath);
  return payload.autosave;
}

function loadAutosave(savePath) {
  try {
    if (!fs.existsSync(savePath)) return null;
    return importGameSession(fs.readFileSync(savePath, "utf8"));
  } catch (error) {
    console.warn(`Autosave ignorado: ${error.message}`);
    return null;
  }
}

function getAutosaveStatus(savePath) {
  try {
    if (!fs.existsSync(savePath)) return { available: false, version: SAVE_VERSION };
    const payload = JSON.parse(fs.readFileSync(savePath, "utf8"));
    return {
      available: true,
      version: payload.version,
      savedAt: payload.autosave?.savedAt || null,
      reason: payload.autosave?.reason || null,
      seed: payload.session?.seed || payload.autosave?.seed || null,
      day: (payload.session?.state?.calendar?.totalDiasSimulados || 0) + 1,
      status: payload.session?.status || "em_andamento",
    };
  } catch (error) {
    return { available: false, version: SAVE_VERSION, error: error.message };
  }
}

function serveStatic(urlPath, response) {
  let filePath;
  if (urlPath === "/") {
    filePath = path.join(__dirname, "index.html");
  } else if (urlPath === "/vendor/phaser.esm.js") {
    filePath = path.join(__dirname, "node_modules", "phaser", "dist", "phaser.esm.js");
  } else {
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    filePath = path.join(__dirname, safePath);
  }

  if (!filePath.startsWith(__dirname)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store",
    });
    response.end(data);
  });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_JSON_PAYLOAD_BYTES) reject(new Error("payload muito grande"));
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("JSON invalido"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const portArg = process.argv.find((arg) => arg.startsWith("--port="));
  const seedArg = process.argv.find((arg) => arg.startsWith("--seed="));
  startPhaserServer({
    port: portArg ? Number(portArg.slice("--port=".length)) : DEFAULT_PORT,
    seed: seedArg ? seedArg.slice("--seed=".length) : DEFAULT_SEED,
  });
}

export { startPhaserServer, persistAutosave, loadAutosave, getAutosaveStatus };
