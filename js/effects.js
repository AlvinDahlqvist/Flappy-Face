// ====================== AUDIO ======================

const MUTE_KEY = 'ff.muted';

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
  }

  setMuted(m) {
    this.muted = !!m;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  }

  ensureContext() {
    if (this.ctx || this.muted) return this.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  play(name) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const fn = SOUNDS[name];
    if (fn) fn(ctx, this.master);
  }
}

export const audio = new AudioBus();

const SOUNDS = {
  flap(ctx, out) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t0);
    osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.06);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + 0.1);
  },

  score(ctx, out) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + 0.22);
  },

  splat(ctx, out) {
    const t0 = ctx.currentTime;
    const dur = 0.25;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const decay = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t0);
    filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(out);
    src.start(t0);
  },

  tick(ctx, out) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + 0.09);
  },

  go(ctx, out) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.15);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + 0.27);
  },

  hover(ctx, out) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + 0.06);
  },

  tap(ctx, out) {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(380, t0);
    osc.frequency.exponentialRampToValueAtTime(160, t0 + 0.06);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.connect(g); g.connect(out);
    osc.start(t0); osc.stop(t0 + 0.09);
  },

  milestone(ctx, out) {
    const notes = [659.25, 880, 1318.5];
    notes.forEach((f, i) => {
      const t0 = ctx.currentTime + i * 0.07;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(g); g.connect(out);
      osc.start(t0); osc.stop(t0 + 0.2);
    });
  },

  cheer(ctx, out) {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((f, i) => {
      const t0 = ctx.currentTime + i * 0.09;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      osc.connect(g); g.connect(out);
      osc.start(t0); osc.stop(t0 + 0.28);
    });
  },
};

// ====================== SCREEN SHAKE ======================

export class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.x = 0;
    this.y = 0;
  }
  kick(amount) {
    this.intensity = Math.max(this.intensity, amount);
  }
  update(dt) {
    // Pure exponential decay — smooth and frame-rate-independent.
    this.intensity *= Math.exp(-dt * 5);
    if (this.intensity < 0.1) { this.intensity = 0; this.x = 0; this.y = 0; return; }
    this.x = (Math.random() * 2 - 1) * this.intensity;
    this.y = (Math.random() * 2 - 1) * this.intensity;
  }
}

// Critically-near spring: returns updated { value, velocity } given a target.
// k = stiffness, d = damping. Default values give a snappy "pop" that settles
// in ~400ms with one small overshoot.
export function springStep(value, velocity, target, dt, k = 300, d = 18) {
  const accel = k * (target - value) - d * velocity;
  const nv = velocity + accel * dt;
  const nval = value + nv * dt;
  return [nval, nv];
}

// ====================== PARTICLES ======================

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  add(p) {
    p.life = p.life ?? p.maxLife ?? 1;
    p.maxLife = p.maxLife ?? p.life;
    p.rot = p.rot ?? 0;
    p.vrot = p.vrot ?? 0;
    p.gravity = p.gravity ?? 600;
    p.size = p.size ?? 6;
    this.particles.push(p);
  }

  update(dt) {
    const out = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      out.push(p);
    }
    this.particles = out;
  }

  render(ctx) {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.img) {
        ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.fillStyle = p.color || '#fff';
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  clear() { this.particles = []; }
}

const CONFETTI_COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#fff', '#ffafcc'];

export function spawnConfetti(ps, x, y, amount = 12) {
  for (let i = 0; i < amount; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const speed = 180 + Math.random() * 220;
    ps.add({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vrot: (Math.random() - 0.5) * 12,
      size: 5 + Math.random() * 4,
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      maxLife: 0.9 + Math.random() * 0.5,
      gravity: 700,
    });
  }
}

// Slice a bird image into a GRID×GRID of source rects, spawn one particle per
// chunk that flies outward from the bird's center with random spin. Falls back
// to yellow shards when no photo is uploaded.
export function spawnFragments(ps, bird, img) {
  const GRID = 4;
  const r = bird.radius;
  const totalSize = r * 2;
  if (img) {
    // The bird is rendered cover-fit: image scaled so the smaller dimension
    // fills the 2r square, larger dim cropped. Visible source square has
    // half-extent r/scale around the image center.
    const scale = Math.max(totalSize / img.width, totalSize / img.height);
    const dstCell = totalSize / GRID;
    const srcCellSize = dstCell / scale;
    const visibleHalfSrc = r / scale;
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const localCX = -r + dstCell * (gx + 0.5);
        const localCY = -r + dstCell * (gy + 0.5);
        const cx = bird.x + localCX;
        const cy = bird.y + localCY;
        const dist = Math.hypot(localCX, localCY) || 1;
        const dirX = localCX / dist, dirY = localCY / dist;
        const speed = 180 + Math.random() * 220;
        ps.add({
          x: cx, y: cy,
          vx: dirX * speed + (bird.vx || 0) * 0.5,
          vy: dirY * speed - 120 + (bird.vy || 0) * 0.3,
          vrot: (Math.random() - 0.5) * 14,
          size: dstCell * 1.05,
          img,
          sx: img.width / 2 - visibleHalfSrc + gx * srcCellSize,
          sy: img.height / 2 - visibleHalfSrc + gy * srcCellSize,
          sw: srcCellSize,
          sh: srcCellSize,
          maxLife: 1.2,
          gravity: 900,
        });
      }
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 160 + Math.random() * 200;
      ps.add({
        x: bird.x, y: bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        vrot: (Math.random() - 0.5) * 12,
        size: 6 + Math.random() * 5,
        color: '#ffd166',
        maxLife: 1.0,
        gravity: 900,
      });
    }
  }
}
