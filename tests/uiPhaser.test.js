/**
 * Modulo: uiPhaser.test
 * Responsabilidade: validar scaffold Phaser minimo sem abrir navegador.
 */

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { assert } = require("./testUtils");

async function run() {
  await testPhaserServerSmoke();
}

async function testPhaserServerSmoke() {
  const { startPhaserServer } = await import("../ui-phaser/server.js");
  const port = 4191;
  const saveDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "gprh-ui-save-"));
  const savePath = path.join(saveDirectory, "autosave.json");
  const server = startPhaserServer({ port, seed: "RH-PHASER-TEST-001", savePath });

  try {
    const html = await get(`http://127.0.0.1:${port}/`);
    const main = await get(`http://127.0.0.1:${port}/src/main.js`);
    const mainMenuScene = await get(`http://127.0.0.1:${port}/src/scenes/MainMenuScene.js`);
    const officeScene = await get(`http://127.0.0.1:${port}/src/scenes/OfficeScene.js`);
    const hudScene = await get(`http://127.0.0.1:${port}/src/scenes/HudScene.js`);
    const dialogScene = await get(`http://127.0.0.1:${port}/src/scenes/DialogScene.js`);
    const notebookScene = await get(`http://127.0.0.1:${port}/src/scenes/NotebookScene.js`);
    const reportScene = await get(`http://127.0.0.1:${port}/src/scenes/ReportScene.js`);
    const preloadScene = await get(`http://127.0.0.1:${port}/src/scenes/PreloadScene.js`);
    const theme = await get(`http://127.0.0.1:${port}/src/theme/gprhTheme.js`);
    const pixelUi = await get(`http://127.0.0.1:${port}/src/ui/pixelUi.js`);
    const phaserConfig = await get(`http://127.0.0.1:${port}/src/config/phaserConfig.js`);
    const phaser = await get(`http://127.0.0.1:${port}/vendor/phaser.esm.js`);
    const snapshot = JSON.parse(await get(`http://127.0.0.1:${port}/api/game-snapshot`));
    const employeeId = snapshot.world.officeMap.npcPlacements[0].employeeId;
    const sectorId = snapshot.world.sectors[0].id;
    const actionResponse = JSON.parse(
      await post(`http://127.0.0.1:${port}/api/daily/action`, {
        tipo: "checkin_individual_rapido",
        alvo: { employeeId },
        tempoInvestidoMin: 20,
      })
    );
    const projectResponse = JSON.parse(
      await post(`http://127.0.0.1:${port}/api/daily/action`, {
        tipo: "pesquisa_clima_simples",
        alvo: { sectorId },
        tempoInvestidoMin: 60,
        modo: "projeto",
      })
    );
    const endDayResponse = JSON.parse(await post(`http://127.0.0.1:${port}/api/daily/end-day`, {}));
    const techResponse = JSON.parse(
      await post(`http://127.0.0.1:${port}/api/technology/unlock`, { techId: "basic_dashboard" })
    );

    assert(html.includes("RH Procedural - Phaser"), "HTML Phaser deve carregar");
    assert(main.includes("new Phaser.Game"), "main.js deve iniciar Phaser");
    assert(mainMenuScene.includes("startDailySession"), "MainMenuScene deve iniciar sessao por seed");
    assert(mainMenuScene.includes("PRESET_SEEDS"), "MainMenuScene deve oferecer seeds de referencia");
    assert(mainMenuScene.includes("continueGame"), "MainMenuScene deve permitir continuar autosave");
    assert(mainMenuScene.includes("restartSavedGame"), "MainMenuScene deve permitir reiniciar campanha salva");
    assert(preloadScene.includes('this.scene.start("MainMenuScene")'), "PreloadScene deve abrir menu inicial");
    assert(officeScene.includes("npcGroup"), "OfficeScene deve renderizar grupo de NPCs");
    assert(officeScene.includes("inferCurrentLocation"), "OfficeScene deve detectar sala atual");
    assert(officeScene.includes("renderRoomProps"), "OfficeScene deve renderizar props visuais por sala");
    assert(officeScene.includes("renderRoomDetails"), "OfficeScene deve renderizar detalhes visuais de sala");
    assert(officeScene.includes("updatePlayerWalkFeedback"), "OfficeScene deve aplicar feedback visual de caminhada");
    assert(officeScene.includes("updateNpcRoutines"), "OfficeScene deve aplicar rotina visual aos NPCs");
    assert(officeScene.includes("pulseNpcRoutineTargets"), "OfficeScene deve pulsar alvos visuais de rotina durante o dia");
    assert(officeScene.includes("createNpcRoutine"), "OfficeScene deve criar rotina visual por NPC");
    assert(officeScene.includes("nextVisualRoutineTarget"), "OfficeScene deve derivar micro deslocamentos visuais de rotina");
    assert(officeScene.includes("workRoomMicroTarget"), "OfficeScene deve variar trabalho dentro da sala sem mover regra para UI");
    assert(officeScene.includes("roomActivityTarget"), "OfficeScene deve mover NPCs para pontos de atividade por estado");
    assert(officeScene.includes("visualMomentForState"), "OfficeScene deve rotular momentos visuais de rotina");
    assert(officeScene.includes("npcInteractionLabel"), "OfficeScene deve comunicar indisponibilidade temporaria de NPC");
    assert(officeScene.includes("resolveNpcWorldTarget"), "OfficeScene deve posicionar NPCs pelo snapshot da engine");
    assert(officeScene.includes("buildNpcWorldRoute"), "OfficeScene deve calcular rota de NPC sobre o mapa");
    assert(officeScene.includes("isWalkableTile"), "rota de NPC deve usar apenas tiles transitaveis");
    assert(officeScene.includes("currentNpcWaypoint"), "NPC deve percorrer rota por waypoints");
    assert(officeScene.includes("renderWorkspaceDesks"), "OfficeScene deve renderizar mesas distribuidas por workspace");
    assert(officeScene.includes("deskVisualTarget"), "OfficeScene deve distribuir mesas no mapa visual");
    assert(officeScene.includes("npcStandTargetForDesk"), "OfficeScene deve posicionar NPC ao lado da mesa, nao em cima dela");
    assert(officeScene.includes("slackingTarget"), "OfficeScene deve posicionar morcegada fora da mesa");
    assert(!officeScene.includes("chooseNextNpcStep"), "OfficeScene nao deve decidir passos aleatorios de NPC");
    assert(officeScene.includes("renderAmbientSignals"), "OfficeScene deve renderizar sinais ambientais");
    assert(officeScene.includes("createVisualNpcPlacement"), "OfficeScene deve reposicionar visualmente NPCs procurando RH");
    assert(officeScene.includes("buildNpcVisualPlan"), "OfficeScene deve renderizar amostra visual de NPCs por sala");
    assert(officeScene.includes("visualNpcLimitForRoom"), "OfficeScene deve limitar NPCs visiveis por sala");
    assert(officeScene.includes("renderNpcGroupIndicators"), "OfficeScene deve indicar funcionarios ocultos no grupo");
    assert(officeScene.includes("visualDeskLimitForRoom"), "OfficeScene deve reduzir excesso visual de mesas");
    assert(officeScene.includes("renderDeskGroupMarker"), "OfficeScene deve indicar mesas extras sem poluir a sala");
    assert(hudScene.includes("buildBottomLeftText"), "HudScene deve renderizar barra inferior");
    assert(hudScene.includes("routinePeriodLabel"), "HudScene deve comunicar periodo sincronizado do expediente");
    assert(hudScene.includes("buildTutorialHint"), "HudScene deve mostrar tutorial contextual");
    assert(hudScene.includes("drawStatusBadges"), "HudScene deve renderizar badges de estado");
    assert(hudScene.includes("Sinais"), "HudScene deve mostrar resumo de sinais");
    assert(dialogScene.includes("playDailyAction"), "DialogScene deve chamar API diaria");
    assert(dialogScene.includes("checkin_individual_rapido"), "DialogScene deve oferecer conversa por proximidade");
    assert(dialogScene.includes("buildLocalActionOptions"), "DialogScene deve oferecer acoes por local");
    assert(dialogScene.includes("conter_rumor"), "DialogScene deve usar copa para rumor");
    assert(dialogScene.includes("drawPixelPanel"), "DialogScene deve usar painel pixelado");
    assert(!dialogScene.includes("firstEmployeeId"), "DialogScene nao deve escolher primeira pessoa automaticamente");
    assert(notebookScene.includes("Projetos"), "NotebookScene deve ter aba de projetos");
    assert(notebookScene.includes("Demandas"), "NotebookScene deve ter fila de demandas");
    assert(notebookScene.includes("renderDemands"), "NotebookScene deve renderizar demandas priorizadas");
    assert(notebookScene.includes("handleDemandSearchKey"), "NotebookScene deve buscar demandas por texto");
    assert(notebookScene.includes("handleDemand"), "NotebookScene deve atender demanda com alvo explicito");
    assert(notebookScene.includes("selectedEmployeeId"), "NotebookScene deve exigir selecao explicita de pessoa");
    assert(notebookScene.includes("renderDecisions"), "NotebookScene deve separar fluxo de decisao");
    assert(notebookScene.includes("decisionCatalog"), "NotebookScene deve consumir catalogo contextual de decisoes");
    assert(notebookScene.includes("handleDecisionSearchKey"), "NotebookScene deve buscar entre centenas de decisoes");
    assert(notebookScene.includes("decisionPage"), "NotebookScene deve paginar o catalogo de decisoes");
    assert(notebookScene.includes("decorateCatalogDecision"), "NotebookScene deve montar previa para cada alvo contextual");
    assert(notebookScene.includes("handleDecision"), "NotebookScene deve confirmar decisao somente apos previa");
    assert(notebookScene.includes("Previa obrigatoria"), "NotebookScene deve mostrar previa antes da execucao");
    assert(!notebookScene.includes("firstEmployee"), "NotebookScene nao deve escolher primeira pessoa automaticamente");
    assert(notebookScene.includes("Dashboard"), "NotebookScene deve ter aba de dashboard");
    assert(notebookScene.includes("renderDashboard"), "NotebookScene deve renderizar dashboard de RH");
    assert(notebookScene.includes("unlockTechnology"), "NotebookScene deve desbloquear tecnologias");
    assert(notebookScene.includes("drawPixelPanel"), "NotebookScene deve usar painel pixelado");
    assert(notebookScene.includes("addCard"), "NotebookScene deve organizar conteudo em cards");
    assert(notebookScene.includes("addProgressBar"), "NotebookScene deve mostrar progresso visual de projetos");
    assert(notebookScene.includes("endDay"), "NotebookScene deve permitir encerrar dia");
    assert(notebookScene.includes("ReportScene"), "NotebookScene deve abrir relatorio de fim de dia");
    assert(notebookScene.includes('modo: "projeto"'), "NotebookScene deve investir blocos de tempo em projetos");
    assert(notebookScene.includes("isAllowedAtLocation"), "NotebookScene deve filtrar projetos por local");
    assert(notebookScene.includes("Prioridades de hoje"), "NotebookScene deve renderizar painel Hoje");
    assert(reportScene.includes("Fim do dia"), "ReportScene deve mostrar relatorio diario");
    assert(reportScene.includes("Leitura parcial"), "ReportScene deve mostrar avaliacao parcial");
    assert(reportScene.includes("Variacoes observadas"), "ReportScene deve mostrar variacoes numericas");
    assert(reportScene.includes("Causalidade e acompanhamento"), "ReportScene deve mostrar causalidade e follow-up");
    assert(reportScene.includes("createPixelButton"), "ReportScene deve usar botao pixelado");
    assert(preloadScene.includes("createFloorTexture"), "PreloadScene deve gerar piso pixel art");
    assert(preloadScene.includes("createDeskTexture"), "PreloadScene deve gerar props de escritorio");
    assert(preloadScene.includes("createCoffeeTexture"), "PreloadScene deve gerar props de copa");
    assert(preloadScene.includes("createFileCabinetTexture"), "PreloadScene deve gerar arquivo de escritorio");
    assert(preloadScene.includes("createServerRackTexture"), "PreloadScene deve gerar rack de TI");
    assert(preloadScene.includes("createWaterCoolerTexture"), "PreloadScene deve gerar bebedouro");
    assert(preloadScene.includes("createAmbientMarkerTexture"), "PreloadScene deve gerar marcadores ambientais");
    assert(theme.includes("GPRHTheme"), "tema visual GPRH deve ser servido");
    assert(pixelUi.includes("drawPixelPanel"), "helpers de UI pixelada devem ser servidos");
    assert(phaserConfig.includes("MainMenuScene"), "config Phaser deve registrar menu inicial");
    assert(phaserConfig.includes("ReportScene"), "config Phaser deve registrar ReportScene");
    assert(phaser.includes("Phaser"), "vendor Phaser deve ser servido");
    assert(snapshot.world.officeMap.validation.valid, "snapshot Phaser deve conter mapa valido");
    assert(snapshot.world.officeMap.npcPlacements.length > 0, "snapshot Phaser deve conter posicionamento de NPCs");
    assert(snapshot.world.officeMap.npcPlacements[0].estadoVisivel, "NPC placement deve conter estado visivel");
    assert(snapshot.actionAvailability[0].tempo.duracoesPermitidasMin.length > 0, "snapshot deve conter duracoes para UI Phaser");
    assert(snapshot.playerKnowledge.agenda.tempoDia.tempoRestanteMin > 0, "snapshot Phaser deve conter tempo diario");
    assert(actionResponse.result.tempoInvestidoMin === 20, "API Phaser deve executar acao diaria por proximidade");
    assert(actionResponse.snapshot.playerKnowledge.agenda.energiaAtual < snapshot.playerKnowledge.agenda.energiaAtual, "acao deve atualizar snapshot");
    assert(projectResponse.result.progressoMin === 60, "API Phaser deve registrar bloco de projeto");
    assert(projectResponse.snapshot.playerKnowledge.agenda.projetosDiarios.length > 0, "snapshot deve expor projetos diarios");
    assert(endDayResponse.report.avaliacaoParcial.leituraGeral, "API Phaser deve retornar avaliacao parcial de fim de dia");
    assert(Array.isArray(endDayResponse.report.projetos), "API Phaser deve retornar projetos no relatorio diario");
    assert(techResponse.snapshot.playerKnowledge.dashboard.available, "API Phaser deve desbloquear dashboard basico");
    const newSeedSnapshot = JSON.parse(await post(`http://127.0.0.1:${port}/api/daily/new`, { seed: "RH-MENU-TEST-001" }));
    assert(newSeedSnapshot.seed === "RH-MENU-TEST-001", "API Phaser deve iniciar sessao com seed escolhida");
    const saveStatus = JSON.parse(await get(`http://127.0.0.1:${port}/api/save/status`));
    assert(saveStatus.available, "API Phaser deve criar autosave versionado");
    assert(saveStatus.version === 3, "autosave Phaser deve usar versao atual");
    assert(saveStatus.seed === "RH-MENU-TEST-001", "autosave deve preservar seed da campanha");
    const continued = JSON.parse(await post(`http://127.0.0.1:${port}/api/save/continue`, {}));
    assert(continued.seed === "RH-MENU-TEST-001", "API Phaser deve continuar campanha salva");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(saveDirectory, { recursive: true, force: true });
  }
}

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          if (response.statusCode >= 400) {
            reject(new Error(`GET ${url} retornou ${response.statusCode}`));
            return;
          }
          resolve(raw);
        });
      })
      .on("error", reject);
  });
}

function post(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          if (response.statusCode >= 400) {
            reject(new Error(`POST ${url} retornou ${response.statusCode}: ${raw}`));
            return;
          }
          resolve(raw);
        });
      }
    );
    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

module.exports = {
  run,
};
