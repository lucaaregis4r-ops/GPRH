import * as Phaser from "/vendor/phaser.esm.js";
import { GPRHTheme } from "../theme/gprhTheme.js";
import { createPixelButton, drawPixelPanel } from "../ui/pixelUi.js";

export class ReportScene extends Phaser.Scene {
  constructor() {
    super("ReportScene");
  }

  create(data) {
    this.snapshot = data.snapshot;
    this.report = data.report || {};

    const width = Math.min(760, this.scale.width - 64);
    const height = Math.min(560, this.scale.height - 64);
    const x = this.scale.width / 2 - width / 2;
    const y = this.scale.height / 2 - height / 2;

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, GPRHTheme.colors.bg, 0.52).setOrigin(0, 0);
    drawPixelPanel(this, x, y, width, height, { depth: 5 });
    this.add.text(x + 22, y + 18, `Fim do dia ${this.report.dia || ""}`, {
      fontFamily: GPRHTheme.font.family,
      fontSize: "22px",
      color: GPRHTheme.colors.cream,
    }).setDepth(10);

    this.add.text(x + 22, y + 58, this.buildReportText(), {
      fontFamily: GPRHTheme.font.family,
      fontSize: "14px",
      color: GPRHTheme.colors.cream,
      lineSpacing: 8,
      wordWrap: { width: width - 44 },
    }).setDepth(10);

    createPixelButton(this, x + 22, y + height - 42, "Continuar", () => this.close(), {
      width: 150,
      primary: true,
      align: "center",
    }).setDepth(10);

    this.input.keyboard.once("keydown-ENTER", () => this.close());
    this.input.keyboard.once("keydown-ESC", () => this.close());
  }

  buildReportText() {
    const lines = [];
    lines.push(this.report.resumo || "Dia encerrado.");
    lines.push("");
    lines.push("Acoes do dia:");
    if ((this.report.acoes || []).length === 0) {
      lines.push("- Nenhuma acao direta registrada.");
    } else {
      this.report.acoes.slice(0, 5).forEach((action) => {
        lines.push(`- ${action.nome}: ${action.inicio || ""}-${action.fim || ""} | ${action.tempoInvestidoMin || action.progressoMin || 0} min`);
      });
    }

    lines.push("");
    lines.push("Sinais e eventos:");
    if ((this.report.eventosNovos || []).length === 0) {
      lines.push("- Nada relevante apareceu hoje.");
    } else {
      this.report.eventosNovos.slice(0, 4).forEach((event) => {
        lines.push(`- ${event.descricao || event.tipo}`);
      });
    }

    lines.push("");
    lines.push("Projetos:");
    if ((this.report.projetos || []).length === 0) {
      lines.push("- Nenhum projeto em andamento.");
    } else {
      this.report.projetos.slice(0, 4).forEach((project) => {
        lines.push(`- ${project.nome}: ${project.progressoMin}/${project.tempoIdealMin} min | ${project.status}`);
      });
    }

    if (this.report.avaliacaoParcial) {
      const partial = this.report.avaliacaoParcial;
      lines.push("");
      lines.push(`Leitura parcial: ${partial.leituraGeral}`);
      lines.push(`Clima ${partial.clima}; confianca RH ${partial.confiancaRh}; sobrecarga ${partial.sobrecarga}; demandas ${partial.demandasPendentes}.`);
    }

    if (this.report.relatorioSemanal) {
      const weekly = this.report.relatorioSemanal;
      lines.push("");
      lines.push(`Fechamento da semana ${weekly.semana}: ${weekly.diagnostico}`);
      lines.push(weekly.resumo);
      weekly.eventosRelevantes.slice(0, 3).forEach((event) => {
        lines.push(`- Dia ${event.dia}: ${event.descricao || event.tipo}`);
      });
    }

    return lines.join("\n");
  }

  close() {
    this.scene.stop();
    this.scene.resume("OfficeScene");
  }
}
