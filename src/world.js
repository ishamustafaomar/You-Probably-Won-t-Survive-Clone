// Island map: ground, water border, trees, rocks, buildable walls, saplings.

import { TILE, WORLD, BUILD, PALETTE } from './constants.js';

export const CELL = {
  WATER: 0,
  GROUND: 1,
};

export class World {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.cols = WORLD.COLS;
    this.rows = WORLD.ROWS;
    this.w = this.cols * TILE;
    this.h = this.rows * TILE;
    this.grid = new Uint8Array(this.cols * this.rows);   // CELL values
    this.deco = [];                                       // {x,y,kind}
    this.obstacles = new Map();                           // "c,r" -> obstacle
    this.genIsland();
    this.plantInitial();
  }

  idx(c, r) { return r * this.cols + c; }
  key(c, r) { return c + ',' + r; }
  inBounds(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }

  cell(c, r) {
    if (!this.inBounds(c, r)) return CELL.WATER;
    return this.grid[this.idx(c, r)];
  }

  genIsland() {
    const cx = this.cols / 2, cy = this.rows / 2;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const nx = (c - cx) / (this.cols * 0.46);
        const ny = (r - cy) / (this.rows * 0.44);
        const d = nx * nx + ny * ny;
        const wobble = (this.rng() - 0.5) * 0.16;
        this.grid[this.idx(c, r)] = d + wobble < 1 ? CELL.GROUND : CELL.WATER;
      }
    }
    // remove wobble-generated offshore specks: keep only ground connected to the centre
    const keep = new Uint8Array(this.cols * this.rows);
    const stack = [[this.cols >> 1, this.rows >> 1]];
    keep[this.idx(this.cols >> 1, this.rows >> 1)] = 1;
    while (stack.length) {
      const [c, r] = stack.pop();
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
        if (this.inBounds(nc, nr) && !keep[this.idx(nc, nr)] && this.grid[this.idx(nc, nr)] === CELL.GROUND) {
          keep[this.idx(nc, nr)] = 1;
          stack.push([nc, nr]);
        }
      }
    }
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === CELL.GROUND && !keep[i]) this.grid[i] = CELL.WATER;
    }
    // ground decals
    for (let i = 0; i < 640; i++) {
      const c = (this.rng() * this.cols) | 0, r = (this.rng() * this.rows) | 0;
      if (this.cell(c, r) === CELL.GROUND) {
        this.deco.push({
          c, r,
          kind: ['grassA', 'grassB', 'grassC'][(this.rng() * 3) | 0],
        });
      }
    }
  }

  plantInitial() {
    // dense clustered forest, like the updated version of the game
    let placed = 0, guard = 0;
    const treeCells = [];
    while (placed < WORLD.TREES && guard++ < 8000) {
      let c, r;
      if (treeCells.length && this.rng() < 0.55) {
        // grow a cluster around an existing tree
        const [bc, br] = treeCells[(this.rng() * treeCells.length) | 0];
        c = bc + ((this.rng() * 5) | 0) - 2;
        r = br + ((this.rng() * 5) | 0) - 2;
      } else {
        c = (this.rng() * this.cols) | 0;
        r = (this.rng() * this.rows) | 0;
      }
      if (this.canPlaceObstacle(c, r) && !this.nearCenter(c, r, 3)) {
        this.addTree(c, r, this.rng() < WORLD.FAKE_TREE_CHANCE);
        treeCells.push([c, r]);
        placed++;
      }
    }
    placed = 0; guard = 0;
    while (placed < WORLD.ROCKS && guard++ < 5000) {
      const c = (this.rng() * this.cols) | 0, r = (this.rng() * this.rows) | 0;
      if (this.canPlaceObstacle(c, r) && !this.nearCenter(c, r, 3)) {
        this.obstacles.set(this.key(c, r), { type: 'rock', c, r, hp: 3, maxHp: 3 });
        placed++;
      }
    }
  }

  nearCenter(c, r, d) {
    return Math.abs(c - this.cols / 2) < d && Math.abs(r - this.rows / 2) < d;
  }

  canPlaceObstacle(c, r) {
    return this.inBounds(c, r) && this.cell(c, r) === CELL.GROUND && !this.obstacles.has(this.key(c, r));
  }

  addTree(c, r, fake = false) {
    this.obstacles.set(this.key(c, r), { type: 'tree', c, r, hp: 3, maxHp: 3, fake });
  }

  addSapling(c, r, fromPlayer = true) {
    this.obstacles.set(this.key(c, r), {
      type: 'sapling', c, r, hp: 1, maxHp: 1,
      growAt: WORLD.SAPLING_GROW_TIME * (0.8 + this.rng() * 0.5),
      t: 0, fromPlayer,
    });
  }

  addWall(c, r, kind) {
    const cfg = BUILD[kind];
    this.obstacles.set(this.key(c, r), { type: 'wall', kind, c, r, hp: cfg.hp, maxHp: cfg.hp });
  }

  obstacleAt(c, r) { return this.obstacles.get(this.key(c, r)); }

  removeObstacle(ob) { this.obstacles.delete(this.key(ob.c, ob.r)); }

  // solid for walking entities (ghost-phased and projectiles handle their own rules)
  isSolid(c, r) {
    if (this.cell(c, r) !== CELL.GROUND) return true;
    const ob = this.obstacleAt(c, r);
    return !!ob && ob.type !== 'sapling';
  }

  update(dt, game) {
    for (const ob of [...this.obstacles.values()]) {
      if (ob.type === 'sapling') {
        ob.t += dt;
        if (ob.t >= ob.growAt) {
          // don't grow a solid tree under someone's feet — wait for the tile to clear
          const occupied = (e) => !e.dead &&
            Math.floor(e.x / TILE) === ob.c && Math.floor(e.y / TILE) === ob.r;
          if (occupied(game.player) || game.enemies.some(occupied)) continue;
          const fakeChance = ob.fromPlayer ? WORLD.FAKE_SAPLING_CHANCE : WORLD.FAKE_TREE_CHANCE;
          this.removeObstacle(ob);
          this.addTree(ob.c, ob.r, this.rng() < fakeChance);
          game.fx.puff(ob.c * TILE + TILE / 2, ob.r * TILE + TILE / 2, '#7ec850');
        }
      }
    }
  }

  // circle-vs-grid collision resolve; returns corrected position
  collide(x, y, radius) {
    const minC = Math.floor((x - radius) / TILE), maxC = Math.floor((x + radius) / TILE);
    const minR = Math.floor((y - radius) / TILE), maxR = Math.floor((y + radius) / TILE);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (!this.isSolid(c, r)) continue;
        const bx = c * TILE, by = r * TILE;
        const nx = Math.max(bx, Math.min(x, bx + TILE));
        const ny = Math.max(by, Math.min(y, by + TILE));
        const dx = x - nx, dy = y - ny;
        const d2 = dx * dx + dy * dy;
        if (d2 === 0) {
          // centre is inside the solid tile: push out along the shortest axis
          const ox = x - (bx + TILE / 2), oy = y - (by + TILE / 2);
          if (Math.abs(ox) >= Math.abs(oy)) x = ox >= 0 ? bx + TILE + radius : bx - radius;
          else y = oy >= 0 ? by + TILE + radius : by - radius;
        } else if (d2 < radius * radius) {
          const d = Math.sqrt(d2);
          const push = radius - d;
          x += (dx / d) * push;
          y += (dy / d) * push;
        }
      }
    }
    return [x, y];
  }

  draw(ctx, S, cam) {
    const c0 = Math.max(0, Math.floor(cam.x / TILE));
    const r0 = Math.max(0, Math.floor(cam.y / TILE));
    const c1 = Math.min(this.cols - 1, Math.ceil((cam.x + cam.w) / TILE));
    const r1 = Math.min(this.rows - 1, Math.ceil((cam.y + cam.h) / TILE));

    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, 0, cam.w, cam.h);

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = c * TILE - cam.x, y = r * TILE - cam.y;
        if (this.cell(c, r) === CELL.GROUND) {
          ctx.fillStyle = PALETTE.ground;
          ctx.fillRect(x, y, TILE, TILE);
        } else {
          // water sparkle on tiles adjacent to land
          if (this.cell(c + 1, r) === CELL.GROUND || this.cell(c - 1, r) === CELL.GROUND ||
              this.cell(c, r + 1) === CELL.GROUND || this.cell(c, r - 1) === CELL.GROUND) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(S.water, x, y, TILE, TILE);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    for (const d of this.deco) {
      if (d.c < c0 || d.c > c1 || d.r < r0 || d.r > r1) continue;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(S[d.kind], d.c * TILE - cam.x, d.r * TILE - cam.y, TILE, TILE);
      ctx.globalAlpha = 1;
    }

    for (const ob of this.obstacles.values()) {
      if (ob.c < c0 - 1 || ob.c > c1 + 1 || ob.r < r0 - 1 || ob.r > r1 + 1) continue;
      const x = ob.c * TILE - cam.x, y = ob.r * TILE - cam.y;
      const dmg = ob.hp < ob.maxHp;
      if (ob.type === 'tree') {
        // trees render slightly larger, anchored to tile bottom
        const s = TILE * 1.5;
        ctx.drawImage(S.tree, x + TILE / 2 - s / 2, y + TILE - s, s, s);
      } else if (ob.type === 'sapling') {
        ctx.drawImage(S.sapling, x + TILE * 0.15, y + TILE * 0.15, TILE * 0.7, TILE * 0.7);
      } else if (ob.type === 'rock') {
        ctx.drawImage(S.rocks, x, y, TILE, TILE);
      } else if (ob.type === 'wall') {
        ctx.drawImage(ob.kind === 'wood' ? S.wallWood : S.wallStone, x, y, TILE, TILE);
      }
      if (dmg) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + 4, y - 6, TILE - 8, 4);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(x + 4, y - 6, (TILE - 8) * (ob.hp / ob.maxHp), 4);
      }
    }
  }
}
