import { loadSheet, makeSprites } from './assets.js';
import { Input } from './input.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');

async function boot() {
  await loadSheet();
  const sprites = makeSprites();
  const input = new Input(canvas);
  const game = new Game(canvas, input, sprites);
  window.__game = game;   // handy for debugging / automated playtesting

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.draw();
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch(err => {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#26282e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f4f1de';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Failed to load: ' + err, canvas.width / 2, canvas.height / 2);
  ctx.fillText('(serve this folder over HTTP, e.g. python3 -m http.server)', canvas.width / 2, canvas.height / 2 + 24);
});
