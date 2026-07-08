/**
 * Modulo: ui-simple/server
 * Responsabilidade: servir a UI simples e expor API tecnica para o loop semanal.
 * Entrada: porta e seed via linha de comando
 * Saida: servidor HTTP local
 * Nao deve: conter regras de simulacao, campanha ou visual final.
 */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { createGameSession, playWeek } = require("../game/gameLoop");
const { createDailyGameSession, playDayAction, endDay } = require("../game/dayLoop");
const { serializeSession } = require("./uiStateAdapter");
const { listScenarios } = require("../data/scenarioCatalog");
const { exportGameSession, importGameSession } = require("../game/saveLoad");
const { buildGameSnapshot } = require("../game/gameSnapshot");

const DEFAULT_PORT = 4173;
const DEFAULT_SEED = "RH-UI-001";
const MAX_JSON_PAYLOAD_BYTES = 8_000_000;

function startUiSimpleServer(options = {}) {
  const port = options.port || DEFAULT_PORT;
  let session = createGameSession(options.seed || DEFAULT_SEED, { horizonteSemanas: 12 });
  let dailySession = null;

  const server = http.createServer(async (request, response) => {
    try {
      if (request.url === "/api/session" && request.method === "GET") {
        sendJson(response, serializeSession(session));
        return;
      }

      if (request.url === "/api/game-snapshot" && request.method === "GET") {
        sendJson(response, buildGameSnapshot(dailySession || session));
        return;
      }

      if (request.url === "/api/daily/new" && request.method === "POST") {
        const body = await readJson(request);
        dailySession = createDailyGameSession(body.seed || session.seed || DEFAULT_SEED, {
          scenarioId: body.scenarioId || "crescimento_desorganizado",
        });
        sendJson(response, buildGameSnapshot(dailySession));
        return;
      }

      if (request.url === "/api/daily/action" && request.method === "POST") {
        const body = await readJson(request);
        if (!dailySession) dailySession = createDailyGameSession(session.seed || DEFAULT_SEED);
        const result = playDayAction(dailySession, body);
        sendJson(response, { snapshot: buildGameSnapshot(dailySession), result });
        return;
      }

      if (request.url === "/api/daily/end-day" && request.method === "POST") {
        if (!dailySession) dailySession = createDailyGameSession(session.seed || DEFAULT_SEED);
        const report = endDay(dailySession);
        sendJson(response, { snapshot: buildGameSnapshot(dailySession), report });
        return;
      }

      if (request.url === "/api/scenarios" && request.method === "GET") {
        sendJson(response, listScenarios());
        return;
      }

      if (request.url === "/api/export" && request.method === "GET") {
        sendJson(response, exportGameSession(session));
        return;
      }

      if (request.url === "/api/import" && request.method === "POST") {
        const body = await readJson(request);
        session = importGameSession(body.save || body);
        sendJson(response, serializeSession(session));
        return;
      }

      if (request.url === "/api/new" && request.method === "POST") {
        const body = await readJson(request);
        session = createGameSession(body.seed || DEFAULT_SEED, {
          scenarioId: body.scenarioId || "crescimento_desorganizado",
          horizonteSemanas: body.horizonteSemanas || undefined,
        });
        sendJson(response, serializeSession(session));
        return;
      }

      if (request.url === "/api/play-week" && request.method === "POST") {
        const body = await readJson(request);
        const report = playWeek(session, Array.isArray(body.actions) ? body.actions : []);
        sendJson(response, { session: serializeSession(session), report });
        return;
      }

      serveStatic(request, response);
    } catch (error) {
      sendJson(response, { error: error.message }, 500);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`UI simples do RH disponivel em http://127.0.0.1:${port}`);
  });

  return server;
}

function serveStatic(request, response) {
  const urlPath = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, safePath);
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
    response.writeHead(200, { "Content-Type": contentType(filePath) });
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
  return "text/plain; charset=utf-8";
}

if (require.main === module) {
  const portArg = process.argv.find((arg) => arg.startsWith("--port="));
  const seedArg = process.argv.find((arg) => arg.startsWith("--seed="));
  startUiSimpleServer({
    port: portArg ? Number(portArg.slice("--port=".length)) : DEFAULT_PORT,
    seed: seedArg ? seedArg.slice("--seed=".length) : DEFAULT_SEED,
  });
}

module.exports = {
  startUiSimpleServer,
};
