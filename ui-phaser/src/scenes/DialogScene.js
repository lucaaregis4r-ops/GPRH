import * as Phaser from "/vendor/phaser.esm.js";
import { playDailyAction } from "../api/rhGameClient.js";
import { GPRHTheme } from "../theme/gprhTheme.js";
import { createPixelButton, drawPixelPanel } from "../ui/pixelUi.js";

export class DialogScene extends Phaser.Scene {
  constructor() {
    super("DialogScene");
    this.busy = false;
    this.optionTexts = [];
  }

  create(data) {
    this.snapshot = data.snapshot;
    this.interactable = data.interactable || {};
    this.location = data.location || null;
    this.busy = false;
    this.optionTexts = [];

    const width = Math.min(620, this.scale.width - 48);
    const height = this.interactable.tipo === "npc" ? 310 : 290;
    const x = this.scale.width / 2 - width / 2;
    const y = this.scale.height - height - 28;
    const label = this.interactable.label || "Interacao";
    const body =
      this.interactable.tipo === "npc"
        ? buildNpcText(this.interactable)
        : "Este ponto ja vem do snapshot da engine. Acoes por local entram nas proximas etapas.";

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, GPRHTheme.colors.bg, 0.36).setOrigin(0, 0);
    drawPixelPanel(this, x, y, width, height, { depth: 5 });
    this.add.text(x + 18, y + 18, label, {
      fontFamily: GPRHTheme.font.family,
      fontSize: "18px",
      color: GPRHTheme.colors.cream,
    }).setDepth(10);
    this.add.text(x + 18, y + 54, body, {
      fontFamily: GPRHTheme.font.family,
      fontSize: "14px",
      color: GPRHTheme.colors.muted,
      wordWrap: { width: width - 36 },
    }).setDepth(10);

    this.feedbackText = this.add.text(x + 18, y + height - 58, "", {
      fontFamily: GPRHTheme.font.family,
      fontSize: "13px",
      color: "#f0d38a",
      wordWrap: { width: width - 36 },
    }).setDepth(10);

    if (this.interactable.tipo === "npc") {
      this.renderNpcActionMenu(x + 18, y + 118, width - 36);
    } else {
      this.renderLocalActionMenu(x + 18, y + 112, width - 36);
    }

    this.add.text(x + 18, y + height - 28, "Esc para voltar", {
      fontFamily: GPRHTheme.font.family,
      fontSize: "13px",
      color: GPRHTheme.colors.muted,
    }).setDepth(10);

    this.input.keyboard.once("keydown-ESC", () => this.close());
    this.input.keyboard.once("keydown-E", () => this.close());
  }

  renderNpcActionMenu(x, y, width) {
    const options = buildNpcActionOptions(this.interactable, this.snapshot, this.location);
    if (options.length === 0) {
      this.feedbackText.setText("Nenhuma acao contextual disponivel para esta pessoa agora.");
      return;
    }

    this.add.text(x, y - 24, "Escolha uma conversa:", {
      fontFamily: GPRHTheme.font.family,
      fontSize: "13px",
      color: GPRHTheme.colors.muted,
    }).setDepth(10);

    options.forEach((option, index) => {
      const optionText = createPixelButton(this, x, y + index * 30, `${index + 1}. ${option.label} - ${option.duration} min`, () => this.executeNpcAction(option), {
        width,
      }).setDepth(10);

      this.optionTexts.push(optionText);
      this.input.keyboard.once(`keydown-${index + 1}`, () => this.executeNpcAction(option));
    });
  }

  renderLocalActionMenu(x, y, width) {
    const options = buildLocalActionOptions(this.interactable, this.snapshot, this.location);
    if (options.length === 0) {
      this.feedbackText.setText("Este local ainda nao oferece uma acao mecanica nesta etapa.");
      return;
    }

    this.add.text(x, y - 24, "Acoes deste local:", {
      fontFamily: GPRHTheme.font.family,
      fontSize: "13px",
      color: GPRHTheme.colors.muted,
    }).setDepth(10);

    options.forEach((option, index) => {
      const optionText = createPixelButton(this, x, y + index * 30, `${index + 1}. ${option.label} - ${option.duration} min`, () => this.executeLocalAction(option), {
        width,
      }).setDepth(10);

      this.optionTexts.push(optionText);
      this.input.keyboard.once(`keydown-${index + 1}`, () => this.executeLocalAction(option));
    });
  }

  async executeNpcAction(option) {
    if (this.busy) return;
    this.busy = true;
    this.setOptionsEnabled(false);
    this.feedbackText.setColor("#f0d38a");
    this.feedbackText.setText("Conversa em andamento...");

    try {
      const response = await playDailyAction({
        tipo: option.tipo,
        alvo: { employeeId: this.interactable.employeeId },
        tempoInvestidoMin: option.duration,
      });

      this.snapshot = response.snapshot;
      const officeScene = this.scene.get("OfficeScene");
      if (officeScene && typeof officeScene.applySnapshot === "function") {
        officeScene.applySnapshot(response.snapshot);
      }

      this.feedbackText.setColor("#aee5bd");
      this.feedbackText.setText(buildOutcomeText(response.result));
    } catch (error) {
      this.feedbackText.setColor("#ffb4a8");
      this.feedbackText.setText(`Nao foi possivel executar: ${error.message}`);
      this.busy = false;
      this.setOptionsEnabled(true);
    }
  }

  async executeLocalAction(option) {
    if (this.busy) return;
    this.busy = true;
    this.setOptionsEnabled(false);
    this.feedbackText.setColor("#f0d38a");
    this.feedbackText.setText("Acao do local em andamento...");

    try {
      const response = await playDailyAction({
        tipo: option.tipo,
        alvo: option.alvo,
        tempoInvestidoMin: option.duration,
        ...(option.modo ? { modo: option.modo } : {}),
      });

      this.snapshot = response.snapshot;
      const officeScene = this.scene.get("OfficeScene");
      if (officeScene && typeof officeScene.applySnapshot === "function") {
        officeScene.applySnapshot(response.snapshot);
      }

      this.feedbackText.setColor("#aee5bd");
      this.feedbackText.setText(buildOutcomeText(response.result));
    } catch (error) {
      this.feedbackText.setColor("#ffb4a8");
      this.feedbackText.setText(`Nao foi possivel executar: ${error.message}`);
      this.busy = false;
      this.setOptionsEnabled(true);
    }
  }

  setOptionsEnabled(enabled) {
    this.optionTexts.forEach((text) => {
      text.setAlpha(enabled ? 1 : 0.55);
      if (enabled) {
        text.setInteractive({ useHandCursor: true });
      } else {
        text.disableInteractive();
      }
    });
  }

  close() {
    this.scene.stop();
    this.scene.resume("OfficeScene");
  }
}

function buildNpcText(npc) {
  const stateText =
    {
      quer_conversar: "parece querer falar com o RH.",
      sobrecarregado_aparente: "parece sobrecarregado, mas isso ainda e uma leitura imperfeita.",
      distante: "parece distante e pouco disponivel.",
      trabalhando: "esta trabalhando no setor.",
    }[npc.estadoVisivel] || "esta no escritorio.";

  return `${npc.label} ${stateText}`;
}

function buildNpcActionOptions(npc, snapshot, location) {
  const actionByType = new Map((snapshot.actionAvailability || []).map((action) => [action.tipo, action]));
  const baseOptions = [
    { tipo: "checkin_individual_rapido", label: "Check-in rapido", preferredDuration: 20 },
    { tipo: "conversa_individual_profunda", label: "Conversar com calma", preferredDuration: 30 },
    { tipo: "mapeamento_tarefas_reais", label: "Perguntar sobre tarefas reais", preferredDuration: 30 },
    { tipo: "reconhecer_contribuicao", label: "Reconhecer contribuicao", preferredDuration: 20 },
  ];

  if (npc.estadoVisivel === "quer_conversar" || npc.disponibilidade === "procurando_rh") {
    baseOptions.unshift({ tipo: "responder_pedido_conversa", label: "Responder pedido de conversa", preferredDuration: 30 });
  }

  return baseOptions
    .map((option) => {
      const action = actionByType.get(option.tipo);
      if (!action || action.alvo !== "funcionario" || action.alvosDisponiveis <= 0) return null;
      if (!isAllowedAtLocation(action, location, npc)) return null;
      return {
        ...option,
        duration: chooseDuration(action.tempo, option.preferredDuration),
      };
    })
    .filter(Boolean);
}

function buildLocalActionOptions(interactable, snapshot, location) {
  const actionByType = new Map((snapshot.actionAvailability || []).map((action) => [action.tipo, action]));
  const firstSectorId = snapshot.world.sectors[0]?.id;
  const firstEmployeeId = snapshot.playerKnowledge.employees[0]?.id;
  const sectorId = interactable.sectorId || location?.sectorId || firstSectorId;
  const recipes = {
    observacao_setor: [
      { tipo: "conversa_com_lideranca", label: "Conversar com lideranca local", preferredDuration: 30, alvo: { sectorId } },
      { tipo: "revisar_sinais_compliance", label: "Revisar sinais do setor", preferredDuration: 30, alvo: { sectorId } },
      { tipo: "priorizar_tarefas_criticas", label: "Priorizar tarefas criticas", preferredDuration: 60, alvo: { sectorId } },
    ],
    copa: [{ tipo: "conter_rumor", label: "Escutar e conter rumor", preferredDuration: 30, alvo: { sectorId } }],
    mesa_reuniao: [
      { tipo: "alinhar_lideranca", label: "Preparar alinhamento de lideranca", preferredDuration: 60, alvo: { sectorId }, modo: "projeto" },
      { tipo: "pesquisa_clima_simples", label: "Preparar pesquisa de clima", preferredDuration: 60, alvo: { sectorId }, modo: "projeto" },
    ],
    mesa_rh: [{ tipo: "pesquisa_clima_simples", label: "Preparar pesquisa na mesa do RH", preferredDuration: 60, alvo: { sectorId }, modo: "projeto" }],
    diretoria: [
      {
        tipo: "formalizar_funcao_informal",
        label: "Levar caso funcional a diretoria",
        preferredDuration: 60,
        alvo: { employeeId: firstEmployeeId },
        modo: "projeto",
      },
    ],
  };

  return (recipes[interactable.tipo] || [])
    .map((recipe) => {
      const action = actionByType.get(recipe.tipo);
      if (!action || action.alvosDisponiveis <= 0) return null;
      if (!isAllowedAtLocation(action, location, interactable)) return null;
      return {
        ...recipe,
        duration: chooseDuration(action.tempo, recipe.preferredDuration),
      };
    })
    .filter(Boolean);
}

function isAllowedAtLocation(action, location, context) {
  const required = action.tempo?.exigeLocal || "qualquer";
  if (required === "qualquer") return true;
  if (action.requerAprovacaoDiretoria && (location?.roomId === "diretoria" || context?.roomId === "diretoria")) return true;
  if (required === "sala_reuniao") return location?.roomId === "reuniao" || context?.roomId === "reuniao";
  if (required === "mesa_rh") return context?.tipo === "mesa_rh" || location?.roomId === "rh";
  if (required === "setor") return Boolean(context?.sectorId || location?.sectorId || location?.roomType === "setor");
  return true;
}

function chooseDuration(tempo, preferredDuration) {
  const durations = tempo?.duracoesPermitidasMin || [preferredDuration];
  if (durations.includes(preferredDuration)) return preferredDuration;
  return durations.find((duration) => duration >= preferredDuration) || durations[durations.length - 1];
}

function buildOutcomeText(result) {
  const quality = result.qualidadePlanejamento || result.qualidadePrevista || 0;
  const qualityLabel = quality >= 75 ? "consistente" : quality >= 45 ? "parcial" : "fragil";
  const statusText = result.status === "executada" ? "A acao foi registrada" : `Status: ${result.status}`;
  const minutes = result.tempoInvestidoMin || result.progressoMin || 0;

  return `${statusText}. Voce dedicou ${minutes} min. A leitura gerada foi ${qualityLabel}; novos sinais e percepcoes podem aparecer no caderno e nos relatorios.`;
}
