import * as Phaser from "/vendor/phaser.esm.js";

export class PlayerController {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.speed = 150;
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      tab: Phaser.Input.Keyboard.KeyCodes.TAB
    });
  }

  update() {
    const body = this.player.body;
    body.setVelocity(0, 0);

    const left = this.cursors.left.isDown || this.keys.a.isDown;
    const right = this.cursors.right.isDown || this.keys.d.isDown;
    const up = this.cursors.up.isDown || this.keys.w.isDown;
    const down = this.cursors.down.isDown || this.keys.s.isDown;

    if (left) body.setVelocityX(-this.speed);
    if (right) body.setVelocityX(this.speed);
    if (up) body.setVelocityY(-this.speed);
    if (down) body.setVelocityY(this.speed);

    body.velocity.normalize().scale(this.speed);
  }

  interactionPressed() {
    return Phaser.Input.Keyboard.JustDown(this.keys.e);
  }

  notebookPressed() {
    return Phaser.Input.Keyboard.JustDown(this.keys.tab);
  }

  isMoving() {
    return Math.abs(this.player.body.velocity.x) > 1 || Math.abs(this.player.body.velocity.y) > 1;
  }
}
