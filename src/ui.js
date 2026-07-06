// HUD, hotbar, menus, toasts — laid out like the video: hearts + level/wave
// top-left, boss bar top-centre, "New Weapon" toast top-right, hotbar bottom.

import { PALETTE, XP } from './constants.js';

const px = (n) => `bold ${n}px "Courier New", monospace`;

export class UI {
  constructor(game) {
    this.game = game;
    this.toasts = [];        // {title, body, t}
    this.banner = null;      // {text, t}
  }

  toast(title, body = '') { this.toasts.push({ title, body, t: 4 }); }
  showBanner(text) { this.banner = { text, t: 2.2 }; }

  update(dt) {
    for (const t of this.toasts) t.t -= dt;
    this.toasts = this.toasts.filter(t => t.t > 0);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
  }

  // ------------------------------------------------------------- in-game HUD
  drawHUD(ctx, S) {
    const g = this.game;
    const p = g.player;

    // hearts (supports halves)
    const hp = Math.max(0, p.hearts);
    for (let i = 0; i < p.maxHearts; i++) {
      const x = 14 + i * 30, y = 12;
      let spr = S.heartEmpty;
      if (hp >= i + 1) spr = S.heartFull;
      else if (hp > i) spr = S.heartHalf;
      ctx.drawImage(spr, x, y, 26, 26);
    }

    // XP bar + level
    const lvlY = 46;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(14, lvlY, 150, 10);
    ctx.fillStyle = PALETTE.xp;
    ctx.fillRect(14, lvlY, 150 * g.xpProgress(), 10);
    ctx.fillStyle = PALETTE.ui;
    ctx.font = px(13);
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${g.level}`, 14, lvlY + 24);
    ctx.fillText(`Wave ${g.waves.wave}${g.impossible ? '  [IMPOSSIBLE]' : ''}`, 14, lvlY + 41);

    // score with coin icon
    ctx.drawImage(S.coin, 12, lvlY + 50, 18, 18);
    ctx.fillText(`${g.score}`, 34, lvlY + 64);

    // resources (bottom-left)
    const ry = ctx.canvas.height - 88;
    ctx.drawImage(S.trunk, 12, ry, 20, 20);
    ctx.fillText(`${p.wood}`, 36, ry + 15);
    ctx.drawImage(S.rocks, 12, ry + 24, 20, 20);
    ctx.fillText(`${p.stone}`, 36, ry + 39);
    ctx.drawImage(S.sapling, 12, ry + 48, 20, 20);
    ctx.fillText(`${p.saplings}`, 36, ry + 63);

    // prep timer / wave state (top-centre)
    ctx.textAlign = 'center';
    const cx = ctx.canvas.width / 2;
    if (g.waves.state === 'prep') {
      ctx.font = px(16);
      ctx.fillStyle = PALETTE.ui;
      ctx.fillText(`Next wave in ${Math.ceil(g.waves.timer)}s`, cx, 26);
    } else {
      const left = g.enemies.filter(e => !e.dead).length + g.waves.toSpawn.length;
      ctx.font = px(13);
      ctx.fillStyle = PALETTE.uiDim;
      ctx.fillText(`${left} enemies remain`, cx, 22);
    }

    // boss bar
    const boss = g.enemies.find(e => e.isBoss && !e.dead);
    if (boss) {
      ctx.font = px(15);
      ctx.fillStyle = PALETTE.boss;
      ctx.fillText('BOSS BATTLE!', cx, 44);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(cx - 160, 52, 320, 12);
      ctx.fillStyle = PALETTE.boss;
      ctx.fillRect(cx - 160, 52, 320 * Math.max(0, boss.hp / boss.maxHp), 12);
      ctx.font = px(11);
      ctx.fillStyle = PALETTE.ui;
      ctx.fillText(boss.name, cx, 76);
    }

    // toasts (top-right) — "New Weapon" unlock notifications
    let ty = 14;
    ctx.textAlign = 'left';
    for (const t of this.toasts) {
      ctx.globalAlpha = Math.min(1, t.t);
      const w = 235;
      ctx.fillStyle = 'rgba(20,22,40,0.85)';
      ctx.fillRect(ctx.canvas.width - w - 12, ty, w, t.body ? 44 : 28);
      ctx.fillStyle = PALETTE.xp;
      ctx.font = px(13);
      ctx.fillText(t.title, ctx.canvas.width - w - 2, ty + 18);
      if (t.body) {
        ctx.fillStyle = PALETTE.ui;
        ctx.font = px(11);
        ctx.fillText(t.body, ctx.canvas.width - w - 2, ty + 34);
      }
      ty += (t.body ? 50 : 34);
      ctx.globalAlpha = 1;
    }

    // wave banner (centre flash)
    if (this.banner) {
      ctx.globalAlpha = Math.min(1, this.banner.t);
      ctx.font = px(38);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(cx - 220, ctx.canvas.height / 2 - 92, 440, 60);
      ctx.fillStyle = PALETTE.ui;
      ctx.fillText(this.banner.text, cx, ctx.canvas.height / 2 - 50);
      ctx.globalAlpha = 1;
    }

    this.drawHotbar(ctx, S);

    // level-up choice overlay
    if (g.pendingUpgrades) this.drawUpgradeChoice(ctx);
  }

  drawHotbar(ctx, S) {
    const g = this.game;
    const items = g.hotbar;
    const n = items.length;
    const size = 44, pad = 5;
    const w = n * (size + pad);
    const x0 = (ctx.canvas.width - w) / 2;
    const y = ctx.canvas.height - size - 12;
    ctx.font = px(10);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (size + pad);
      const sel = i === g.hotbarIndex;
      ctx.fillStyle = sel ? 'rgba(60,64,90,0.8)' : 'rgba(20,22,40,0.55)';
      ctx.fillRect(x, y, size, size);
      ctx.strokeStyle = sel ? PALETTE.ui : 'rgba(244,241,222,0.4)';
      ctx.lineWidth = sel ? 3 : 1;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      const it = items[i];
      if (it.sprite && S[it.sprite]) ctx.drawImage(S[it.sprite], x + 7, y + 7, size - 14, size - 14);
      ctx.fillStyle = PALETTE.ui;
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1), x + 3, y + 12);
      if (it.count !== undefined) {
        ctx.textAlign = 'right';
        ctx.fillText(String(it.count()), x + size - 4, y + size - 5);
      }
    }
  }

  drawUpgradeChoice(ctx) {
    const g = this.game;
    const cx = ctx.canvas.width / 2, cy = ctx.canvas.height / 2;
    ctx.fillStyle = 'rgba(15,17,35,0.82)';
    ctx.fillRect(cx - 250, cy - 110, 500, 210);
    ctx.strokeStyle = PALETTE.ui;
    ctx.strokeRect(cx - 250.5, cy - 110.5, 500, 210);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.xp;
    ctx.font = px(22);
    ctx.fillText('LEVEL UP!', cx, cy - 74);
    ctx.fillStyle = PALETTE.ui;
    ctx.font = px(14);
    ctx.fillText('Choose an upgrade:', cx, cy - 46);
    g.pendingUpgrades.forEach((u, i) => {
      ctx.font = px(16);
      ctx.fillStyle = PALETTE.ui;
      ctx.fillText(`[${i + 1}]  ${u.name}`, cx, cy - 8 + i * 30);
    });
  }

  // ------------------------------------------------------------- menus
  drawTitle(ctx, S, blink) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    this.chalkboard(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.ui;
    ctx.font = px(44);
    ctx.fillText('YOU PROBABLY', W / 2, H / 2 - 130);
    ctx.fillText("WON'T SURVIVE", W / 2, H / 2 - 82);
    ctx.font = px(15);
    ctx.fillStyle = PALETTE.uiDim;
    ctx.fillText('a zombie island survival game', W / 2, H / 2 - 48);

    ctx.drawImage(S.zombie, W / 2 - 140, H / 2 - 20, 44, 44);
    ctx.drawImage(S.skeleton, W / 2 - 80, H / 2 - 20, 44, 44);
    ctx.drawImage(S.ghost, W / 2 + 40, H / 2 - 20, 44, 44);
    ctx.drawImage(S.lava, W / 2 + 100, H / 2 - 20, 44, 44);
    ctx.drawImage(S.player, W / 2 - 22, H / 2 - 24, 52, 52);

    ctx.fillStyle = PALETTE.ui;
    ctx.font = px(20);
    ctx.fillText('[1]  PLAY', W / 2, H / 2 + 80);
    ctx.fillStyle = PALETTE.boss;
    ctx.fillText('[2]  IMPOSSIBLE MODE', W / 2, H / 2 + 116);
    if (blink) {
      ctx.fillStyle = PALETTE.uiDim;
      ctx.font = px(12);
      ctx.fillText('WASD move · mouse aim · LMB use · RMB build/plant · 1-9 hotbar', W / 2, H / 2 + 168);
      ctx.fillText('chop trees for wood · mine rocks for stone · survive the waves', W / 2, H / 2 + 188);
    }
    ctx.font = px(10);
    ctx.fillStyle = PALETTE.uiDim;
    ctx.fillText('fan clone of "You Probably Won\'t Survive" by BadGameDev · art: Kenney 1-Bit Pack (CC0)', W / 2, H - 16);
  }

  drawGameOver(ctx, S, stats) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    this.chalkboard(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.boss;
    ctx.font = px(40);
    ctx.fillText("YOU DIDN'T SURVIVE.", W / 2, H / 2 - 90);
    ctx.fillStyle = PALETTE.ui;
    ctx.font = px(18);
    ctx.fillText(`(told you so)`, W / 2, H / 2 - 58);
    ctx.font = px(20);
    ctx.drawImage(S.coin, W / 2 - 108, H / 2 - 16, 22, 22);
    ctx.fillText(`Score: ${stats.score}`, W / 2 + 10, H / 2 + 2);
    ctx.fillText(`Waves survived: ${stats.wave}`, W / 2, H / 2 + 34);
    if (stats.best !== undefined) {
      ctx.drawImage(S.crown, W / 2 - 128, H / 2 + 48, 22, 22);
      ctx.fillText(`Best: ${stats.best}`, W / 2, H / 2 + 66);
    }
    ctx.font = px(16);
    ctx.fillStyle = PALETTE.xp;
    ctx.fillText('[R]  Try again', W / 2, H / 2 + 110);
    ctx.fillStyle = PALETTE.uiDim;
    ctx.fillText('[M]  Menu', W / 2, H / 2 + 138);
  }

  chalkboard(ctx) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = '#26282e';
    ctx.fillRect(0, 0, W, H);
    // subtle chalk noise
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < 90; i++) {
      ctx.fillRect((i * 97) % W, (i * 211) % H, 2 + (i % 3), 1 + (i % 2));
    }
  }
}
