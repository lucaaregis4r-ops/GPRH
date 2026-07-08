import { GPRHTheme } from "../theme/gprhTheme.js";

export function drawPixelPanel(scene, x, y, width, height, options = {}) {
  const colors = GPRHTheme.colors;
  const depth = options.depth || 0;
  const shadowOffset = options.shadowOffset ?? GPRHTheme.panel.shadowOffset;
  const fill = options.fill ?? colors.panel;

  const shadow = scene.add.rectangle(x + shadowOffset, y + shadowOffset, width, height, colors.shadow, 0.82).setOrigin(0, 0).setDepth(depth);
  const panel = scene.add.rectangle(x, y, width, height, fill, options.alpha ?? 0.98).setOrigin(0, 0).setDepth(depth + 1);
  const outer = scene.add.rectangle(x, y, width, height).setOrigin(0, 0).setStrokeStyle(2, colors.border).setDepth(depth + 2);
  const inner = scene.add
    .rectangle(x + 4, y + 4, width - 8, height - 8)
    .setOrigin(0, 0)
    .setStrokeStyle(1, colors.borderLight, 0.55)
    .setDepth(depth + 2);

  const cornerSize = options.cornerSize ?? GPRHTheme.panel.corner;
  const corners = [
    scene.add.rectangle(x + 6, y + 6, cornerSize, cornerSize, colors.red, 1).setOrigin(0, 0).setDepth(depth + 3),
    scene.add.rectangle(x + width - 6 - cornerSize, y + 6, cornerSize, cornerSize, colors.red, 1).setOrigin(0, 0).setDepth(depth + 3),
    scene.add.rectangle(x + 6, y + height - 6 - cornerSize, cornerSize, cornerSize, colors.red, 1).setOrigin(0, 0).setDepth(depth + 3),
    scene.add.rectangle(x + width - 6 - cornerSize, y + height - 6 - cornerSize, cornerSize, cornerSize, colors.red, 1).setOrigin(0, 0).setDepth(depth + 3),
  ];

  return { shadow, panel, outer, inner, corners };
}

export function createPixelButton(scene, x, y, label, callback, options = {}) {
  const colors = GPRHTheme.colors;
  const width = options.width || 180;
  const fill = options.primary ? colors.red : colors.surface;
  const stroke = options.primary ? colors.redDark : colors.borderLight;

  const button = scene.add
    .text(x, y, label, {
      fontFamily: GPRHTheme.font.family,
      fontSize: options.fontSize || GPRHTheme.font.body,
      color: options.color || GPRHTheme.colors.cream,
      backgroundColor: `#${fill.toString(16).padStart(6, "0")}`,
      padding: { x: 10, y: 7 },
      fixedWidth: width,
      align: options.align || "left",
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", callback)
    .on("pointerover", () => button.setStyle({ backgroundColor: `#${stroke.toString(16).padStart(6, "0")}` }))
    .on("pointerout", () => button.setStyle({ backgroundColor: `#${fill.toString(16).padStart(6, "0")}` }));

  return button;
}
