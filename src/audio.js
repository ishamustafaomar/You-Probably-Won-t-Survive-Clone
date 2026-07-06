// Tiny WebAudio synth — no audio assets needed.

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(name) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.connect(this.ctx.destination);

    const tone = (freq, dur, type = 'square', vol = 0.06, slide = 0) => {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); o.start(t); o.stop(t + dur);
    };
    const noise = (dur, vol = 0.08) => {
      const len = this.ctx.sampleRate * dur;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      g.gain.setValueAtTime(vol, t);
      s.connect(g); s.start(t);
    };

    switch (name) {
      case 'shoot':   tone(700, 0.08, 'square', 0.04, -400); break;
      case 'shotgun': noise(0.15, 0.1); tone(200, 0.12, 'square', 0.05, -120); break;
      case 'uzi':     tone(900, 0.05, 'square', 0.03, -500); break;
      case 'sniper':  tone(300, 0.25, 'sawtooth', 0.07, -260); break;
      case 'flame':   noise(0.06, 0.02); break;
      case 'chop':    tone(180, 0.09, 'triangle', 0.08, -60); break;
      case 'mine':    tone(120, 0.09, 'triangle', 0.08, -30); break;
      case 'place':   tone(320, 0.08, 'triangle', 0.06, 80); break;
      case 'hurt':    tone(160, 0.25, 'sawtooth', 0.09, -100); break;
      case 'kill':    tone(440, 0.12, 'square', 0.05, 220); break;
      case 'boom':    noise(0.4, 0.14); tone(70, 0.4, 'sine', 0.12, -40); break;
      case 'wave':    tone(523, 0.15, 'square', 0.05); setTimeout(() => this.play('wave2'), 160); break;
      case 'wave2':   tone(659, 0.2, 'square', 0.05); break;
      case 'pickup':  tone(880, 0.09, 'square', 0.04, 200); break;
      case 'levelup': tone(523, 0.1, 'square', 0.05, 300); break;
      case 'dash':    tone(90, 0.3, 'sawtooth', 0.1, 160); break;
      case 'lava':    tone(220, 0.2, 'sawtooth', 0.06, -140); break;
      case 'unlock':  tone(392, 0.12, 'square', 0.05); setTimeout(() => this.play('wave2'), 130); break;
      case 'die':     tone(220, 0.8, 'sawtooth', 0.1, -180); break;
    }
  }
}
