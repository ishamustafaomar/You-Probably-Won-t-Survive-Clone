// Wave director: endless waves, enemy budgets, boss milestones, spawn placement.

import { TILE, WAVES, ENEMIES } from './constants.js';
import { CELL } from './world.js';

export class WaveDirector {
  constructor(game) {
    this.game = game;
    this.wave = 0;
    this.state = 'prep';            // prep | active
    this.timer = WAVES.firstPrep;
    this.toSpawn = [];              // queued enemy types for the active wave
    this.spawnTick = 0;
    this.bossAlive = false;
  }

  get isBossWave() { return this.wave > 0 && this.wave % WAVES.bossEvery === 0; }

  update(dt) {
    const g = this.game;
    if (this.state === 'prep') {
      this.timer -= dt;
      if (this.timer <= 0) this.startWave();
    } else {
      // spawn the queued enemies in bursts so hordes build up fast
      this.spawnTick -= dt;
      if (this.toSpawn.length && this.spawnTick <= 0) {
        this.spawnTick = Math.max(0.4, 1.6 - this.wave * 0.06);
        const burst = Math.min(this.toSpawn.length, 2 + ((this.wave / 4) | 0));
        for (let i = 0; i < burst; i++) {
          const type = this.toSpawn.pop();
          const [x, y] = this.pickSpawn();
          g.spawnEnemy(type, x, y);
        }
      }
      if (!this.toSpawn.length && g.enemies.filter(e => !e.dead).length === 0) {
        this.endWave();
      }
    }
  }

  startWave() {
    const g = this.game;
    this.wave++;
    this.state = 'active';
    g.onWaveStart(this.wave);

    this.toSpawn = [];
    let budget = WAVES.budgetBase + this.wave * WAVES.budgetPerWave;
    const avail = Object.entries(WAVES.roster).filter(([, v]) => this.wave >= v.fromWave);
    let guard = 0;
    while (budget > 0.6 && guard++ < 400) {
      const [type, meta] = avail[(Math.random() * avail.length) | 0];
      if (meta.cost > budget) continue;
      budget -= meta.cost;
      this.toSpawn.push(type);
    }
    // guarantee at least a few zombies
    if (this.toSpawn.length < 3) this.toSpawn.push('zombie', 'zombie', 'zombie');

    if (this.isBossWave) {
      const kind = (this.wave / WAVES.bossEvery) % 2 === 1 ? 'bigZombie' : 'hybrid';
      const [x, y] = this.pickSpawn(true);
      this.game.spawnBoss(kind, x, y, this.wave);
      this.bossAlive = true;
    }
  }

  endWave() {
    this.state = 'prep';
    this.timer = WAVES.prepTime;
    this.bossAlive = false;
    this.game.onWaveEnd(this.wave);
  }

  // Normal mode: island edge. Impossible mode: anywhere on ground.
  pickSpawn(forBoss = false) {
    const g = this.game;
    const w = g.world;
    for (let tries = 0; tries < 200; tries++) {
      let c, r;
      if (g.impossible) {   // impossible mode: everything (bosses too) spawns anywhere
        c = (Math.random() * w.cols) | 0;
        r = (Math.random() * w.rows) | 0;
        if (w.cell(c, r) !== CELL.GROUND || w.isSolid(c, r)) continue;
      } else {
        // ring near the island edge: walk inward from a random border direction
        const a = Math.random() * Math.PI * 2;
        const cx = w.cols / 2, cy = w.rows / 2;
        let rad = Math.max(w.cols, w.rows) / 2;
        c = Math.round(cx + Math.cos(a) * rad);
        r = Math.round(cy + Math.sin(a) * rad * 0.8);
        let guard = 0;
        while (guard++ < 60 && (!w.inBounds(c, r) || w.cell(c, r) !== CELL.GROUND)) {
          c = Math.round(c - Math.cos(a));
          r = Math.round(r - Math.sin(a));
        }
        if (!w.inBounds(c, r) || w.cell(c, r) !== CELL.GROUND || w.isSolid(c, r)) continue;
      }
      const x = c * TILE + TILE / 2, y = r * TILE + TILE / 2;
      // don't spawn right on top of the player
      const p = g.player;
      if ((x - p.x) ** 2 + (y - p.y) ** 2 < (forBoss ? 200 : g.impossible ? 160 : 120) ** 2) continue;
      return [x, y];
    }
    return [w.w / 2 + 200, w.h / 2];
  }
}
