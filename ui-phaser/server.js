import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createDailyGameSession, playDayAction, endDay } = require("../game/dayLoop");
const { buildGameSnapshot } = require("../game/gameSnapshot");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PORT = 4180;
const DEFAULT_SEED = "RH-PHASER-001";
const MAX_JSON_PAYLOAD_BYTES = 8_000_000;

let session = createDailyGameSession(DEFAULT_SEED);

function startPhaserServer(options = {}) {
  const port = options.port || DEFAULT_PORT;
  if (options.seed) session = createDailyGameSession(options.seed);

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (url.pathname === "/api/game-snapshot" && request.method === "GET") {
        sendJson(response, buildGameSnapshot(session));
        return;
      }

      if (url.pathname === "/api/daily/new" && request.method === "POST") {
        const body = await readJson(request);
        session = createDailyGameSession(body.seed || DEFAULT_SEED);
        sendJson(response, buildGameSnapshot(session));
        return;
      }

      if (url.pathname === "/api/daily/action" && request.method === "POST") {
        const body = await readJson(request);
        const result = playDayAction(session, body);
        sendJson(response, { snapshot: buildGameSnapshot(session), result });
        return;
      }

      if (url.pathname === "/api/daily/end-day" && request.method === "POST") {
        const report = endDay(session);
        sendJson(response, { snapshot: buildGameSnapshot(session), report });
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

export { startPhaserServer };
