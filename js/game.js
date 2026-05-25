import { loadAllPhotos } from './assets.js';
import { saveHighscore, loadHighscore, loadSelectedBird } from './storage.js';
import { onFlap, fitCanvas } from './input.js';
import { audio, ScreenShake, ParticleSystem, spawnConfetti, spawnFragments, springStep, spawnRingBurst } from './effects.js';
import { BIRDS, PHOTO_BIRD_ID, getBird, drawWing, drawBirdWithState } from './birds.js';
import { recordGameStart, recordDeath, recordScore, recordCustomComplete, recordCombo, recordCoins, recordNearMisses } from './achievements.js';
import { pickTheme, buildScene, updateScene, drawScene, drawGround } from './scene.js';
import { isReducedMotion } from './settings.js';

const GRAVITY = 1600;
const FLAP_VELOCITY = -480;
const SCROLL_SPEED = 200;
const SPAWN_INTERVAL = 1500;
const PIPE_WIDTH = 70;
const BIRD_RADIUS = 26;
const GROUND_HEIGHT = 60;
const COUNTDOWN_SECONDS = 3.0;
const DYING_DURATION = 0.32;          // seconds the bird shows X-eyes before exploding
const SPEED_LINE_THRESHOLD = 520;     // bird.vy at which speed lines appear

const PIPE_PALETTE = [
  { fill: '#73bf2e', dark: '#5a9a22', edge: '#3d6b18' }, // green
  { fill: '#ef476f', dark: '#c1304f', edge: '#7a1d31' }, // pink
  { fill: '#118ab2', dark: '#0a6585', edge: '#053f54' }, // blue
  { fill: '#ffd166', dark: '#d4a942', edge: '#8a6d24' }, // yellow
  { fill: '#a86bb4', dark: '#7d4787', edge: '#4f2855' }, // purple
  { fill: '#06d6a0', dark: '#04a17b', edge: '#02604a' }, // mint
];

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export class Game {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options || {};
    this.onScore = this.options.onScore || (() => {});
    this.onGameOver = this.options.onGameOver || (() => {});

    this.state = 'countdown';
    this.score = 0;
    this.bird = {
      x: 0, y: 0, vy: 0, rot: 0,
      squashX: 1, squashY: 1, squashXV: 0, squashYV: 0,
      wingFlap: 0,
    };
    this.pipes = [];
    this.scrollX = 0;
    this.lastSpawnX = 0;
    this.lastTime = 0;
    this.assets = { bird: null, pipe: null, bg: null };
    this.birdSprite = null;
    this.scene = null;
    this.theme = null;
    this.rafId = null;
    this.disposers = [];
    this.bgOffset = 0;
    this.paused = false;
    this.shake = new ScreenShake();
    this.particles = new ParticleSystem();
    this.countdown = COUNTDOWN_SECONDS;
    this.countdownLast = Math.ceil(COUNTDOWN_SECONDS) + 1;
    this.goFlash = 0;
    this.popups = [];
    this.dyingTime = 0;
    this.timeElapsed = 0;
    this.combo = 0;
    this.comboPulse = 0;
    this.deathFlash = 0;
    this.overlayDelay = 0;
    this._overlayFired = false;
    this._gameOverResult = null;
    this.onCombo = this.options.onCombo || (() => {});
    this.onCoin = this.options.onCoin || (() => {});
    this.onNearMiss = this.options.onNearMiss || (() => {});
    // depth pass additions
    this.trail = [];          // array of { x, y, rot, squashX, squashY, life }
    this.coins = [];          // { x, y, vx, vy, collected, bob }
    this.coinsCollected = 0;
    this.nearMisses = 0;
    this.lastNearMissPipeId = null;
    // per-run summary stats
    this.flapsThisRun = 0;
    this.bestComboThisRun = 0;
    this.runStartTime = 0;
    this.runDurationMs = 0;
    // Bird visual state — drives pose transforms and eye overlays each render frame.
    this.birdState = {
      pose: 'idle',
      flapPhase: 0,
      flapPhaseV: 0,
      eyeEvent: null,
      eyeEventTtl: 0,
      comboTier: 0,
      recentDamageSource: null,
    };
    // Trail of past bird positions for ghost/rainbow tells (oldest → newest).
    this.birdTrail = [];
    // Bullet-time slowdown when a collision is imminent.
    this.bulletTimeActive = false;
    this.bulletTimeStart = 0;
  }

  // Project the bird ~stepMs ahead at current velocity + gravity.
  // Returns true if a collision would land within that window.
  _predictCollision(stepMs = 150) {
    if (!this.bird) return false;
    const steps = 3;
    const subDt = stepMs / steps / 1000;   // seconds
    let y = this.bird.y;
    let vy = this.bird.vy;
    const ahead = this.bird.x;
    for (let i = 0; i < steps; i++) {
      vy += GRAVITY * subDt;
      y += vy * subDt;
      if (y + this.bird.r >= this.groundY) return true;
      for (const p of this.pipes) {
        const px = p.x - this.scrollX;
        if (ahead + this.bird.r < px) continue;
        if (ahead - this.bird.r > px + PIPE_WIDTH) continue;
        const gapTop = p.gapY - p.gap / 2;
        const gapBot = p.gapY + p.gap / 2;
        if (y - this.bird.r < gapTop || y + this.bird.r > gapBot) return true;
      }
    }
    return false;
  }

  async start() {
    this.assets = await loadAllPhotos();
    const selectedId = loadSelectedBird();
    const usePhoto = selectedId === PHOTO_BIRD_ID && this.assets.bird;
    this.birdMeta = usePhoto ? null : getBird(selectedId);
    this.birdSprite = buildBirdSprite(
      usePhoto ? this.assets.bird : null, this.birdMeta, BIRD_RADIUS, true,
    );
    this.birdFragSource = buildBirdSprite(
      usePhoto ? this.assets.bird : null, this.birdMeta, BIRD_RADIUS, false,
    ).canvas;
    this.theme = this.options.themeOverride || pickTheme();
    recordGameStart();
    this.resize();
    this.reset();
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    this.disposers.push(() => window.removeEventListener('resize', onResize));

    const disposeFlap = onFlap(this.canvas, () => this.handleFlap());
    this.disposers.push(disposeFlap);

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.disposers.forEach(fn => fn());
    this.disposers = [];
  }

  pause() { this.paused = true; }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.lastTime = performance.now();
  }

  resize() {
    const prevH = this.viewH;
    const prevY = this.bird?.y;
    const { width, height } = fitCanvas(this.canvas);
    this.viewW = width;
    this.viewH = height;
    this.groundY = this.viewH - GROUND_HEIGHT;
    if (this.state === 'countdown' || prevY == null) {
      this.bird.x = this.viewW * 0.28;
      this.bird.y = this.viewH * 0.5;
    } else if (prevH) {
      this.bird.y = (prevY / prevH) * this.viewH;
    }
    if (!this.assets.bg && this.theme) {
      this.scene = buildScene(this.theme, this.viewW, this.groundY);
    } else {
      this.scene = null;
    }
  }

  reset() {
    this.score = 0;
    this.bird = {
      x: this.viewW * 0.28, y: this.viewH * 0.5,
      vy: 0, rot: 0,
      squashX: 1, squashY: 1, squashXV: 0, squashYV: 0,
      wingFlap: 0,
    };
    this.pipes = [];
    this.state = 'countdown';
    this.countdown = COUNTDOWN_SECONDS;
    this.countdownLast = Math.ceil(COUNTDOWN_SECONDS) + 1;
    this.goFlash = 0;
    this.particles.clear();
    this.shake.intensity = 0;
    this.popups = [];
    this.dyingTime = 0;
    const _prevCombo = this.combo;
    this.combo = 0;
    this.comboPulse = 0;
    this.deathFlash = 0;
    this.overlayDelay = 0;
    this._overlayFired = false;
    this._gameOverResult = null;
    this.trail = [];
    this.coins = [];
    this.coinsCollected = 0;
    this.nearMisses = 0;
    this.lastNearMissPipeId = null;
    this.flapsThisRun = 0;
    this.bestComboThisRun = 0;
    this.runStartTime = 0;
    this.runDurationMs = 0;
    this.onCombo(0);
    if (_prevCombo >= 5) this._setEyeEvent('comboBreak', 320);

    if (this.options.mode === 'custom' && this.options.level) {
      this.customPipes = (this.options.level.obstacles || []).map(o => ({ ...o }));
      this.customGap = this.options.level.gap || 150;
      const maxX = this.customPipes.reduce((m, o) => Math.max(m, o.x), 0);
      this.customEnd = maxX + this.viewW;
      this.scrollX = -this.viewW;
      this.lastSpawnX = 0;
      // Drop coins between custom pipes
      const sorted = [...this.customPipes].sort((a, b) => a.x - b.x);
      for (let i = 0; i < sorted.length - 1; i++) {
        if (Math.random() < 0.45) {
          const midX = (sorted[i].x + sorted[i + 1].x) / 2;
          this.spawnCoin(midX, this.viewH * (0.30 + Math.random() * 0.40));
        }
      }
    } else {
      this.scrollX = 0;
      const spawnEvery = (SPAWN_INTERVAL / 1000) * SCROLL_SPEED;
      this.lastSpawnX = this.viewW + 100 - spawnEvery;
    }
    this.onScore(this.score);
  }

  retry() {
    this.reset();
  }

  handleFlap() {
    if (this.paused) return;
    if (this.state !== 'playing') return;
    // Visual squish impulse — drives birdState.pose='flap' for the next 200-300ms.
    this.birdState.flapPhase = 1;
    this.birdState.flapPhaseV = -6;
    this.bird.vy = FLAP_VELOCITY;
    this.bird.squashX = 0.78;
    this.bird.squashY = 1.30;
    this.bird.squashXV = 0;
    this.bird.squashYV = 0;
    this.bird.wingFlap = 1;
    this.flapsThisRun += 1;
    audio.play('flap');
  }

  loop(now) {
    this.rafId = requestAnimationFrame(this.loop);
    if (this.paused) { this.lastTime = now; return; }
    const dt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.render();
  }

  update(dt) {
    // Bullet-time: predict near-future collisions and slow dt for 150ms when imminent.
    if (this.state === 'playing' && !this.bulletTimeActive && !isReducedMotion()) {
      if (this._predictCollision(150)) {
        this.bulletTimeActive = true;
        this.bulletTimeStart = performance.now();
      }
    }
    if (this.bulletTimeActive) {
      if (performance.now() - this.bulletTimeStart >= 150) {
        this.bulletTimeActive = false;
      } else {
        dt = dt * 0.25;
      }
    }

    this.timeElapsed += dt;
    this.particles.update(dt);
    this.shake.update(dt);
    if (this.goFlash > 0) this.goFlash -= dt;
    if (this.deathFlash > 0) this.deathFlash = Math.max(0, this.deathFlash - dt * 4);
    if (this.comboPulse > 0) this.comboPulse = Math.max(0, this.comboPulse - dt * 3);

    // Wing flap decays exponentially
    this.bird.wingFlap = Math.max(0, this.bird.wingFlap - dt * 4);

    // Popups: float up, fade out, slight decel
    for (const p of this.popups) {
      p.life -= dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }
    this.popups = this.popups.filter(p => p.life > 0);

    // Spring squash toward 1
    [this.bird.squashX, this.bird.squashXV] = springStep(this.bird.squashX, this.bird.squashXV, 1, dt);
    [this.bird.squashY, this.bird.squashYV] = springStep(this.bird.squashY, this.bird.squashYV, 1, dt);

    if (this.scene) updateScene(this.scene, dt, this.birdState.comboTier);

    if (this.state === 'countdown') {
      const num = Math.ceil(this.countdown);
      if (num !== this.countdownLast && num >= 1 && num <= COUNTDOWN_SECONDS) {
        audio.play('tick');
        this.countdownLast = num;
      }
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.state = 'playing';
        this.goFlash = 0.5;
        this.runStartTime = performance.now();
        audio.play('go');
      }
      this.bird.y = this.viewH * 0.5 + Math.sin(performance.now() / 250) * 12;
      // idle wing flap during countdown
      this.bird.wingFlap = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      return;
    }

    if (this.state === 'dying') {
      this.dyingTime += dt;
      // bird falls + spins during dying for drama
      this.bird.vy += GRAVITY * 0.5 * dt;
      this.bird.y += this.bird.vy * dt;
      this.bird.rot += dt * 12;
      if (this.dyingTime >= DYING_DURATION) {
        this.explodeIntoFragments();
        this.state = 'over';
      }
      return;
    }

    if (this.state === 'over') {
      // Game is over but we hold off on showing the overlay so the player
      // sees the shatter + screen shake first.
      if (this.overlayDelay > 0) {
        this.overlayDelay -= dt;
        if (this.overlayDelay <= 0 && !this._overlayFired && this._gameOverResult) {
          this._overlayFired = true;
          this.onGameOver({
            score: this.score,
            best: this._gameOverResult.best,
            isNew: this._gameOverResult.isNew,
            coins: this.coinsCollected,
            nearMisses: this.nearMisses,
            bestCombo: this.bestComboThisRun,
            flaps: this.flapsThisRun,
            durationMs: this.runDurationMs,
          });
        }
      }
      return;
    }

    // ===== playing =====
    this.bird.vy += GRAVITY * dt;
    this.bird.y += this.bird.vy * dt;
    const targetRot = Math.max(-0.5, Math.min(1.2, this.bird.vy / 600));
    this.bird.rot += (targetRot - this.bird.rot) * Math.min(1, dt * 8);

    this.scrollX += SCROLL_SPEED * dt;
    this.bgOffset = (this.bgOffset + SCROLL_SPEED * 0.3 * dt) % this.viewW;

    // Trail — capture a snapshot every frame, age them out
    this.trail.unshift({
      x: this.bird.x, y: this.bird.y,
      rot: this.bird.rot,
      squashX: this.bird.squashX, squashY: this.bird.squashY,
      life: 0.32,
    });
    const maxTrail = 4 + Math.min(8, Math.floor(this.combo / 2));
    if (this.trail.length > maxTrail) this.trail.length = maxTrail;
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter(t => t.life > 0);

    this.spawnPipes();
    this.updateCoins(dt);

    for (const p of this.pipes) {
      p.wobble *= 0.93;
      p.spawnAge = (p.spawnAge ?? 0) + dt;
      if (!p.scored && p.x + PIPE_WIDTH < this.scrollX + this.bird.x) {
        p.scored = true;
        this.score += 1;
        this.combo += 1;
        if (this.combo > this.bestComboThisRun) this.bestComboThisRun = this.combo;
        this.comboPulse = 1;
        this.onCombo(this.combo);
        audio.play('score');
        spawnConfetti(this.particles, this.bird.x, p.gapY, 12);
        spawnConfetti(this.particles, p.x - this.scrollX + PIPE_WIDTH / 2, p.gapY - p.gap / 2 + 4, 6);
        spawnConfetti(this.particles, p.x - this.scrollX + PIPE_WIDTH / 2, p.gapY + p.gap / 2 - 4, 6);
        this.shake.kick(2 + Math.min(6, this.combo * 0.3));
        // floating "+1" right where you scored
        this.popups.push({
          text: '+1',
          x: this.bird.x + 14,
          y: this.bird.y - 24,
          vy: -90,
          life: 0.7, maxLife: 0.7,
          font: '28px "Bungee", "Press Start 2P", system-ui, sans-serif',
          color: '#ffd166',
        });
        this.onScore(this.score);
        recordScore(this.score);

        const milestoneText = MILESTONES[this.score];
        if (milestoneText) {
          this.popups.push({
            text: milestoneText,
            x: this.viewW / 2,
            y: this.viewH * 0.35,
            vy: -60,
            life: 1.6, maxLife: 1.6,
            font: '40px "Bungee", "Press Start 2P", system-ui, sans-serif',
            color: '#ffd166',
          });
          audio.play('milestone');
          this.shake.kick(5);
          spawnConfetti(this.particles, this.viewW / 2, this.viewH * 0.45, 24);
        }

        // Combo milestones — separate from score milestones, fires at 5, 10, 15...
        if (this.combo > 1 && this.combo % 5 === 0) {
          this.popups.push({
            text: `x${this.combo} COMBO!`,
            x: this.viewW / 2,
            y: this.viewH * 0.55,
            vy: -50,
            life: 1.4, maxLife: 1.4,
            font: '32px "Bungee", "Press Start 2P", system-ui, sans-serif',
            color: '#ef476f',
          });
          audio.play('milestone');
          spawnConfetti(this.particles, this.viewW / 2, this.viewH * 0.55, 18);
        }
      }
    }
    this.pipes = this.pipes.filter(p => p.x - this.scrollX + PIPE_WIDTH > -50);

    this.detectNearMiss();

    if (this.checkCollision()) {
      this.die();
    }

    this._updateBirdState(dt);
  }

  // Fire once per pipe when bird passes within NEAR_MISS px of either gap edge.
  detectNearMiss() {
    const NEAR_MISS = 14;
    for (const p of this.pipes) {
      const px = p.x - this.scrollX;
      // Bird is currently between the pipe's left and right edges?
      if (this.bird.x < px - 2) continue;
      if (this.bird.x > px + PIPE_WIDTH + 2) continue;
      if (p.id === this.lastNearMissPipeId || p.nearMissed) continue;
      const distTop = Math.abs((this.bird.y - BIRD_RADIUS) - (p.gapY - p.gap / 2));
      const distBot = Math.abs((this.bird.y + BIRD_RADIUS) - (p.gapY + p.gap / 2));
      const d = Math.min(distTop, distBot);
      if (d < NEAR_MISS) {
        p.nearMissed = true;
        p.wobble = 1;
        this.lastNearMissPipeId = p.id;
        this.nearMisses += 1;
        this.onNearMiss(this.nearMisses);
        this._setEyeEvent('nearMiss', 220);
        this.score += 2;            // bonus for risk
        audio.play('hover');        // quick whoosh
        this.shake.kick(3);
        this.popups.push({
          text: 'CLOSE!',
          x: this.bird.x,
          y: this.bird.y - 40,
          vy: -100,
          life: 0.9, maxLife: 0.9,
          font: '24px "Bungee", "Press Start 2P", system-ui, sans-serif',
          color: '#06d6a0',
        });
        this.onScore(this.score);
      }
    }
  }

  // ============ COINS ============

  spawnCoin(worldX, worldY) {
    this.coins.push({
      x: worldX, y: worldY,
      vx: 0, vy: 0,
      collected: false,
      bob: Math.random() * Math.PI * 2,
      spawnY: worldY,
    });
  }

  updateCoins(dt) {
    const MAGNET_R = 90;
    const PICKUP_R = BIRD_RADIUS + 12;
    for (const c of this.coins) {
      if (c.collected) continue;
      const sx = c.x - this.scrollX;
      const dx = this.bird.x - sx;
      const dy = this.bird.y - c.y;
      const dist = Math.hypot(dx, dy);
      // Magnet attraction (smooth)
      if (dist < MAGNET_R) {
        const force = (1 - dist / MAGNET_R) * 1200;
        c.vx += (dx / dist) * force * dt;
        c.vy += (dy / dist) * force * dt;
      } else {
        c.vx *= 0.95;
        c.vy *= 0.95;
        // Idle bob
        c.y = c.spawnY + Math.sin(this.timeElapsed * 3 + c.bob) * 4;
        continue;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // Pickup
      if (dist < PICKUP_R) {
        c.collected = true;
        this.coinsCollected += 1;
        this.onCoin(this.coinsCollected);
        this._setEyeEvent('coin', 280);
        this.score += 5;
        this.shake.kick(3);
        audio.play('score');
        spawnConfetti(this.particles, sx, c.y, 12);
        spawnRingBurst(this.particles, sx, c.y, '#ffd166', 18);
        this.popups.push({
          text: '+5',
          x: this.bird.x + 12,
          y: this.bird.y - 30,
          vy: -100,
          life: 0.8, maxLife: 0.8,
          font: '26px "Bungee", "Press Start 2P", system-ui, sans-serif',
          color: '#ffd166',
        });
        this.onScore(this.score);
      }
    }
    // Cull collected + off-screen
    this.coins = this.coins.filter(c =>
      !c.collected && (c.x - this.scrollX + 20 > -50)
    );
  }

  spawnPipes() {
    if (this.options.mode === 'custom') {
      for (const p of this.customPipes) {
        if (p.x - this.scrollX < this.viewW + 200 && !this.pipes.find(pp => pp.id === p.x)) {
          this.pipes.push({
            id: p.x, x: p.x, gapY: p.gapY, gap: this.customGap,
            scored: false, color: PIPE_PALETTE[0],
            wobble: 0, spawnAge: 0,
          });
        }
      }
      if (this.scrollX > this.customEnd) {
        const result = saveHighscore(this.score);
        this.state = 'over';
        if (this.runStartTime) this.runDurationMs = performance.now() - this.runStartTime;
        recordCustomComplete();
        recordScore(this.score);
        recordCoins(this.coinsCollected);
        recordNearMisses(this.nearMisses);
        this.onGameOver({
          score: this.score,
          best: result.best,
          isNew: result.isNew,
          coins: this.coinsCollected,
          nearMisses: this.nearMisses,
          bestCombo: this.bestComboThisRun,
          flaps: this.flapsThisRun,
          durationMs: this.runDurationMs,
          completed: true,
        });
      }
    } else {
      const spawnEvery = (SPAWN_INTERVAL / 1000) * SCROLL_SPEED;
      while (this.lastSpawnX < this.scrollX + this.viewW + 200) {
        this.lastSpawnX += spawnEvery;
        // ~35% chance to drop a coin between this pipe and the next, in the gap area
        if (Math.random() < 0.35) {
          this.spawnCoin(this.lastSpawnX - spawnEvery / 2, this.viewH * (0.30 + Math.random() * 0.40));
        }
        const baseGap = 170;
        const shrink = Math.max(0.6, 1 - this.score * 0.015);
        const gap = baseGap * shrink;
        const margin = 70;
        const minY = margin + gap / 2;
        const maxY = this.groundY - margin - gap / 2;
        const gapY = minY + Math.random() * Math.max(0, maxY - minY);
        this.pipes.push({
          id: this.lastSpawnX,
          x: this.lastSpawnX,
          gapY,
          gap,
          scored: false,
          color: PIPE_PALETTE[Math.floor(Math.random() * PIPE_PALETTE.length)],
          wobble: 0, spawnAge: 0,
        });
      }
    }
  }

  checkCollision() {
    if (this.bird.y + BIRD_RADIUS > this.groundY) { this.birdState.recentDamageSource = 'ground'; return true; }
    if (this.bird.y - BIRD_RADIUS < 0) { this.birdState.recentDamageSource = 'ground'; return true; }

    for (const p of this.pipes) {
      const px = p.x - this.scrollX;
      if (px + PIPE_WIDTH < this.bird.x - BIRD_RADIUS || px > this.bird.x + BIRD_RADIUS) continue;
      const topRect = { x: px, y: 0, w: PIPE_WIDTH, h: p.gapY - p.gap / 2 };
      const botRect = { x: px, y: p.gapY + p.gap / 2, w: PIPE_WIDTH, h: this.groundY - (p.gapY + p.gap / 2) };
      if (circleRectHit(this.bird.x, this.bird.y, BIRD_RADIUS, topRect)) { this.birdState.recentDamageSource = 'topPipe'; return true; }
      if (circleRectHit(this.bird.x, this.bird.y, BIRD_RADIUS, botRect)) { this.birdState.recentDamageSource = 'bottomPipe'; return true; }
    }
    return false;
  }

  die() {
    if (this.state === 'over' || this.state === 'dying') return;
    this.state = 'dying';
    this.dyingTime = 0;
    audio.play('splat');
    this.shake.kick(18);
    this.deathFlash = 1;
    this.bird.vy = Math.max(this.bird.vy, -80);
    if (this.runStartTime) this.runDurationMs = performance.now() - this.runStartTime;
    // Persist score / new-best NOW so the overlay later has the right values.
    this._gameOverResult = saveHighscore(this.score);
    if (this._gameOverResult.isNew) audio.play('cheer');
    recordCombo(this.combo);
    recordCoins(this.coinsCollected);
    recordNearMisses(this.nearMisses);
    recordDeath();
    recordScore(this.score);
  }

  explodeIntoFragments() {
    const src = this.birdState.recentDamageSource;
    // Branch shatter velocity + camera nudge by damage source.
    let vx = 0, vy = this.bird.vy, kick = 8;
    if (src === 'topPipe') {
      vx = -40 - Math.random() * 30;
      vy = Math.max(this.bird.vy, 220);
      kick = 12;
    } else if (src === 'bottomPipe') {
      vx = 40 + Math.random() * 30;
      vy = -180 - Math.random() * 40;
      kick = 12;
    } else if (src === 'ground') {
      vx = (Math.random() - 0.5) * 140;
      vy = -60 - Math.random() * 30;
      kick = 14;
      // Brown dust ring at impact point
      spawnRingBurst(this.particles, this.bird.x, this.groundY, '#aa9966', 24);
    }
    spawnFragments(this.particles, {
      x: this.bird.x, y: this.bird.y,
      vy, vx,
      radius: BIRD_RADIUS,
    }, this.birdFragSource || this.assets.bird);
    this.shake.kick(kick);
    this.overlayDelay = 0.6;
  }

  render() {
    const { ctx, viewW, viewH } = this;
    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);
    ctx.clearRect(-20, -20, viewW + 40, viewH + 40);

    // ===== background =====
    if (this.assets.bg) {
      const img = this.assets.bg;
      const scale = Math.max(viewW / img.width, viewH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, -this.bgOffset, (viewH - h) / 2, w, h);
      ctx.drawImage(img, viewW - this.bgOffset, (viewH - h) / 2, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, viewW, viewH);
    } else if (this.scene) {
      drawScene(ctx, this.scene, this.scrollX, this.timeElapsed, viewW, viewH, this.groundY, this.birdState.comboTier);
    }

    // ===== pipes =====
    for (const p of this.pipes) {
      const px = p.x - this.scrollX;
      const reduced = isReducedMotion();
      const wobX = reduced ? 0 : Math.sin(performance.now() * 0.03) * (p.wobble || 0) * 4;
      const screenX = px + wobX;
      const rise = Math.min(1, (p.spawnAge || 0) / 250);
      const yOffset = reduced ? 0 : (1 - easeOutBack(rise)) * 80;
      this.drawPipe(screenX, 0 + yOffset, PIPE_WIDTH, p.gapY - p.gap / 2, true, p.color);
      this.drawPipe(screenX, p.gapY + p.gap / 2 + yOffset, PIPE_WIDTH, this.groundY - (p.gapY + p.gap / 2), false, p.color);
    }

    // ===== coins (between pipes, before ground) =====
    for (const c of this.coins) {
      if (c.collected) continue;
      const sx = c.x - this.scrollX;
      if (sx < -30 || sx > viewW + 30) continue;
      drawCoin(ctx, sx, c.y, this.timeElapsed + c.bob);
    }

    // ===== ground + grass =====
    if (this.scene) {
      drawGround(ctx, this.scene, this.scrollX, this.timeElapsed, viewW, viewH, this.groundY);
    } else {
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(0, this.groundY, viewW, viewH - this.groundY);
      ctx.fillStyle = '#88a06b';
      ctx.fillRect(0, this.groundY, viewW, 6);
    }

    // ===== bird shadow (after ground, before speed lines/bird) =====
    if (this.state !== 'over') {
      this.drawBirdShadow();
    }

    // ===== speed lines (behind bird) =====
    if (this.state === 'playing' && this.bird.vy > SPEED_LINE_THRESHOLD) {
      drawSpeedLines(ctx, this.bird, this.timeElapsed);
    }

    // ===== bird trail (ghost copies, fading) =====
    if (this.state === 'playing' && this.trail.length) {
      for (const t of this.trail) {
        const alpha = (t.life / 0.32) * 0.35;
        if (alpha <= 0.02) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rot);
        ctx.scale(t.squashX, t.squashY);
        const s = this.birdSprite.totalSize || BIRD_RADIUS * 2;
        ctx.drawImage(this.birdSprite.canvas, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    }

    // ===== bird (skip when exploded) =====
    if (this.state !== 'over') {
      this.drawBird(this.state === 'dying');
    }

    this.particles.render(ctx);

    // countdown / GO
    if (this.state === 'countdown') {
      const num = Math.ceil(this.countdown);
      const tFrac = num - this.countdown;
      this.drawCountdownNumber(String(num), tFrac);
    } else if (this.goFlash > 0) {
      const tFrac = 1 - this.goFlash / 0.5;
      this.drawCountdownNumber('GO!', tFrac, '#06d6a0');
    }

    // warm "in the zone" tint when combo is high
    if (this.combo >= 5 && this.state === 'playing') {
      const intensity = Math.min(0.18, (this.combo - 4) * 0.018);
      ctx.fillStyle = `rgba(255, 130, 70, ${intensity})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // red full-screen flash on death
    if (this.deathFlash > 0) {
      ctx.fillStyle = `rgba(239, 71, 111, ${this.deathFlash * 0.55})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // popups (milestones + "+1")
    for (const p of this.popups) {
      const t = 1 - p.life / p.maxLife;
      const alpha = Math.min(1, p.life / 0.3);
      const scale = 1.6 - t * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = p.font || '40px "Bungee", "Press Start 2P", system-ui, sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color || '#ffd166';
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  // Returns true if the bird is currently inside the horizontal span of a pipe pair
  // AND vertically close to either the top or bottom obstacle edge (within 20px).
  _birdInGap() {
    if (!this.pipes || !this.pipes.length) return false;
    const bx = this.bird.x;
    const by = this.bird.y;
    for (const p of this.pipes) {
      const px = p.x - this.scrollX;
      if (bx + this.bird.r < px) continue;
      if (bx - this.bird.r > px + PIPE_WIDTH) continue;
      const gapTop = p.gapY - p.gap / 2;
      const gapBot = p.gapY + p.gap / 2;
      if (Math.abs(by - gapTop) < 20 || Math.abs(by - gapBot) < 20) return true;
    }
    return false;
  }

  _setEyeEvent(event, ms = 250) {
    this.birdState.eyeEvent = event;
    this.birdState.eyeEventTtl = ms;
  }

  _updateBirdState(dt) {
    // Decay flapPhase toward 0 with a spring so it overshoots back.
    if (isReducedMotion()) {
      this.birdState.flapPhase = 0;
      this.birdState.flapPhaseV = 0;
    } else {
      [this.birdState.flapPhase, this.birdState.flapPhaseV] = springStep(this.birdState.flapPhase, this.birdState.flapPhaseV, 0, dt / 1000, 240, 22);
      if (Math.abs(this.birdState.flapPhase) < 0.002) {
        this.birdState.flapPhase = 0;
        this.birdState.flapPhaseV = 0;
      }
    }

    // Eye event TTL countdown
    if (this.birdState.eyeEvent) {
      this.birdState.eyeEventTtl -= dt;
      if (this.birdState.eyeEventTtl <= 0) {
        this.birdState.eyeEvent = null;
      }
    }

    // Combo tier (0..3) — placeholder pose handling (Task B.3 refines)
    const c = this.combo || 0;
    this.birdState.comboTier = c >= 15 ? 3 : c >= 10 ? 2 : c >= 5 ? 1 : 0;
    // Pose — precedence: dive > scrunch > flap > lean > idle.
    const inDive = this.bird.vy > 8;
    const inFlap = this.birdState.flapPhase > 0.05;
    const highCombo = (this.combo || 0) >= 5;
    const inScrunch = this._birdInGap();

    if (inDive)         this.birdState.pose = 'dive';
    else if (inScrunch) this.birdState.pose = 'scrunch';
    else if (inFlap)    this.birdState.pose = 'flap';
    else if (highCombo) this.birdState.pose = 'lean';
    else                this.birdState.pose = 'idle';

    // Push current bird position into trail for tells in Phase D.
    if (this.bird) {
      this.birdTrail.push({ x: this.bird.x, y: this.bird.y, t: performance.now() });
      if (this.birdTrail.length > 10) this.birdTrail.shift();
    }
  }

  drawCountdownNumber(text, tFrac, color = '#ffd166') {
    const { ctx, viewW, viewH } = this;
    const scale = 1.4 - tFrac * 0.6;
    const alpha = 1 - Math.pow(tFrac, 2);
    ctx.save();
    ctx.translate(viewW / 2, viewH * 0.42);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.font = '96px "Bungee", "Press Start 2P", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  drawPipe(x, y, w, h, isTop, color) {
    if (h <= 0) return;
    const { ctx } = this;
    if (this.assets.pipe) {
      const img = this.assets.pipe;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const tileH = w * (img.height / img.width);
      const startY = isTop ? y + h - tileH : y;
      const dir = isTop ? -1 : 1;
      for (let ty = startY; ty < y + h + tileH && ty > y - tileH; ty += dir * tileH) {
        ctx.drawImage(img, x, ty, w, tileH);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    } else {
      const c = color || PIPE_PALETTE[0];
      // body — left-to-right gradient for 3D feel
      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, c.edge);
      grad.addColorStop(0.15, c.dark);
      grad.addColorStop(0.4, c.fill);
      grad.addColorStop(0.6, c.fill);
      grad.addColorStop(0.85, c.dark);
      grad.addColorStop(1, c.edge);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      // shine highlight strip
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x + w * 0.18, y, w * 0.10, h);
      // edges
      ctx.strokeStyle = c.edge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x, y + h);
      ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h);
      ctx.stroke();

      // CAP — proper chunky lip with double-rim, like the reference image
      const capH = 22;
      const capX = x - 6;
      const capW = w + 12;
      const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
      capGrad.addColorStop(0, c.edge);
      capGrad.addColorStop(0.12, c.dark);
      capGrad.addColorStop(0.45, c.fill);
      capGrad.addColorStop(0.55, c.fill);
      capGrad.addColorStop(0.88, c.dark);
      capGrad.addColorStop(1, c.edge);
      let capY;
      if (isTop) {
        capY = y + h - capH;
      } else {
        capY = y;
      }
      ctx.fillStyle = capGrad;
      ctx.fillRect(capX, capY, capW, capH);
      // cap shine
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(capX + 6, capY + 4, 5, capH - 8);
      // cap inner rim (the dark line under the lip)
      ctx.fillStyle = c.edge;
      if (isTop) {
        ctx.fillRect(capX, capY, capW, 3);
        ctx.fillRect(capX, capY + capH - 3, capW, 3);
      } else {
        ctx.fillRect(capX, capY, capW, 3);
        ctx.fillRect(capX, capY + capH - 3, capW, 3);
      }
      // outline whole cap
      ctx.strokeStyle = c.edge;
      ctx.lineWidth = 3;
      ctx.strokeRect(capX, capY, capW, capH);
    }
  }

  // Soft elliptical shadow on the ground under the bird. Shrinks + fades as
  // the bird climbs higher, grounds it in the world.
  drawBirdShadow() {
    const { ctx, bird } = this;
    const heightAboveGround = this.groundY - bird.y;
    if (heightAboveGround < 0) return;
    const t = Math.min(1, heightAboveGround / (this.viewH * 0.6));
    const widthScale = 1 - t * 0.55;
    const alpha = 0.32 * (1 - t * 0.6);
    if (alpha <= 0.02) return;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(bird.x, this.groundY - 3, BIRD_RADIUS * 0.95 * widthScale, BIRD_RADIUS * 0.30 * widthScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBird(dying) {
    if (!this.birdSprite) return;
    const { ctx, bird } = this;
    const r = BIRD_RADIUS;
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rot);
    ctx.scale(bird.squashX, bird.squashY);

    // ====== WING (behind body — tip pokes out the back) ======
    const wingFill = this.birdMeta?.wingFill || '#fff8d6';
    const wingStroke = this.birdMeta?.wingStroke || '#c9a740';
    drawWing(ctx, r, bird.wingFlap, wingFill, wingStroke);

    // ====== BODY ======
    if (this.birdMeta) {
      // Procedural bird — route through drawBirdWithState so pose transforms
      // and eye-event overlays are applied each render frame.
      drawBirdWithState(this.birdMeta, ctx, r, this.birdState);
    } else {
      // Photo bird — drawn from pre-rendered sprite (circle-clipped image).
      // DO NOT wrap with drawBirdWithState; the bird.draw() API does not apply.
      const s = this.birdSprite.totalSize || r * 2;
      ctx.drawImage(this.birdSprite.canvas, -s / 2, -s / 2, s, s);
    }

    // ====== X-EYES (only when dying) ======
    if (dying) {
      const eyeOffsets = [
        { x: -r * 0.32, y: -r * 0.15 },
        { x:  r * 0.32, y: -r * 0.15 },
      ];
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1a1a2e';
      for (const e of eyeOffsets) {
        // white circle behind the X for visibility on photo birds
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        // X
        const sz = r * 0.16;
        ctx.beginPath();
        ctx.moveTo(e.x - sz, e.y - sz);
        ctx.lineTo(e.x + sz, e.y + sz);
        ctx.moveTo(e.x + sz, e.y - sz);
        ctx.lineTo(e.x - sz, e.y + sz);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

// ============ HELPERS ============

function circleRectHit(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// Pre-render the bird once. If `img` is provided, use the photo (circle-clipped).
// Otherwise call the preset's draw function from `birdMeta`.
function buildBirdSprite(img, birdMeta, radius, padded = true) {
  const size = radius * 2;
  const dpr = window.devicePixelRatio || 1;
  const c = document.createElement('canvas');
  const pad = padded ? Math.ceil(radius * 0.6) : 0;
  const totalSize = size + pad * 2;
  c.width = Math.ceil(totalSize * dpr);
  c.height = Math.ceil(totalSize * dpr);
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.translate(radius + pad, radius + pad);

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (birdMeta && birdMeta.draw) {
    birdMeta.draw(ctx, radius);
  } else {
    // Fallback: simple yellow circle so the game never breaks
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  return { canvas: c, radius, pad, totalSize };
}

// Spinning gold coin — flips horizontally for 3D, pulsing halo behind.
function drawCoin(ctx, x, y, t) {
  const spin = Math.cos(t * 4.5);
  const absSpin = Math.abs(spin);
  const h = 16;
  // Width oscillates 0 → 14 with spin. Clamp to a small minimum so the
  // inner-ring inset never goes negative (ctx.ellipse throws on neg radius).
  const w = Math.max(0, 14 * absSpin);

  ctx.save();
  ctx.translate(x, y);

  // pulsing halo behind
  const haloAlpha = 0.20 + 0.18 * Math.sin(t * 5);
  ctx.fillStyle = `rgba(255, 220, 80, ${haloAlpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();

  // Edge state — when the coin is mostly on its edge, render a thin vertical
  // bar. Threshold matched so the ellipse branch never has w < 3.
  if (absSpin < 0.22) {
    ctx.fillStyle = '#a8782e';
    ctx.fillRect(-2, -h, 4, h * 2);
    ctx.fillStyle = '#7a4f00';
    ctx.fillRect(-2, -h, 1, h * 2);
    ctx.restore();
    return;
  }

  // outer rim
  ctx.fillStyle = '#7a4f00';
  ctx.beginPath();
  ctx.ellipse(0, 0, w + 2, h + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // face
  ctx.fillStyle = spin >= 0 ? '#ffd166' : '#e3b350';
  ctx.beginPath();
  ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  // inner ring — defensively clamped
  const innerW = Math.max(0.1, w - 2);
  const innerH = Math.max(0.1, h - 2);
  ctx.strokeStyle = '#fff5b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, innerW, innerH, 0, 0, Math.PI * 2);
  ctx.stroke();
  // star mark (only when mostly face-on)
  if (spin > 0.4) {
    ctx.fillStyle = '#7a4f00';
    ctx.font = `${Math.round(h * 1.05)}px "Bungee", "Press Start 2P", system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 1);
  }
  ctx.restore();
}

function drawSpeedLines(ctx, bird, t) {
  const overspeed = Math.min(1, (bird.vy - 520) / 800);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + 0.4 * overspeed})`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const yOff = (i - 2) * 14;
    const xJit = (Math.sin(t * 30 + i) * 6);
    const len = 28 + Math.random() * 22 + overspeed * 24;
    ctx.beginPath();
    ctx.moveTo(bird.x - 30 + xJit, bird.y + yOff);
    ctx.lineTo(bird.x - 30 - len + xJit, bird.y + yOff - 6);
    ctx.stroke();
  }
  ctx.restore();
}

// ============ AMBIENT WORLD ============

const MILESTONES = {
  5: 'NICE!',
  10: 'NOT BAD!',
  15: 'OK OK!',
  20: 'GETTING WARM!',
  25: 'HOT!',
  30: 'ON FIRE!',
  40: 'STAY COOL!',
  50: 'UNREAL!',
  75: 'WHO ARE YOU?!',
  100: '100?! HOW?!',
};

