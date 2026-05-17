import { loadAllPhotos } from './assets.js';
import { saveHighscore, loadHighscore, loadSelectedBird } from './storage.js';
import { onFlap, fitCanvas } from './input.js';
import { audio, ScreenShake, ParticleSystem, spawnConfetti, spawnFragments, springStep } from './effects.js';
import { BIRDS, PHOTO_BIRD_ID, getBird, drawWing } from './birds.js';
import { recordGameStart, recordDeath, recordScore, recordCustomComplete, recordCombo } from './achievements.js';
import { pickTheme, buildScene, updateScene, drawScene, drawGround } from './scene.js';

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
    this.theme = pickTheme();
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
    this.combo = 0;
    this.comboPulse = 0;
    this.deathFlash = 0;
    this.overlayDelay = 0;
    this._overlayFired = false;
    this._gameOverResult = null;
    this.onCombo(0);

    if (this.options.mode === 'custom' && this.options.level) {
      this.customPipes = (this.options.level.obstacles || []).map(o => ({ ...o }));
      this.customGap = this.options.level.gap || 150;
      const maxX = this.customPipes.reduce((m, o) => Math.max(m, o.x), 0);
      this.customEnd = maxX + this.viewW;
      this.scrollX = -this.viewW;
      this.lastSpawnX = 0;
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
    this.bird.vy = FLAP_VELOCITY;
    this.bird.squashX = 0.78;
    this.bird.squashY = 1.30;
    this.bird.squashXV = 0;
    this.bird.squashYV = 0;
    this.bird.wingFlap = 1;
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

    if (this.scene) updateScene(this.scene, dt);

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

    this.spawnPipes();

    for (const p of this.pipes) {
      if (!p.scored && p.x + PIPE_WIDTH < this.scrollX + this.bird.x) {
        p.scored = true;
        this.score += 1;
        this.combo += 1;
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

    if (this.checkCollision()) {
      this.die();
    }
  }

  spawnPipes() {
    if (this.options.mode === 'custom') {
      for (const p of this.customPipes) {
        if (p.x - this.scrollX < this.viewW + 200 && !this.pipes.find(pp => pp.id === p.x)) {
          this.pipes.push({
            id: p.x, x: p.x, gapY: p.gapY, gap: this.customGap,
            scored: false, color: PIPE_PALETTE[0],
          });
        }
      }
      if (this.scrollX > this.customEnd) {
        const result = saveHighscore(this.score);
        this.state = 'over';
        recordCustomComplete();
        recordScore(this.score);
        this.onGameOver({ score: this.score, best: result.best, isNew: result.isNew, completed: true });
      }
    } else {
      const spawnEvery = (SPAWN_INTERVAL / 1000) * SCROLL_SPEED;
      while (this.lastSpawnX < this.scrollX + this.viewW + 200) {
        this.lastSpawnX += spawnEvery;
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
        });
      }
    }
  }

  checkCollision() {
    if (this.bird.y + BIRD_RADIUS > this.groundY) return true;
    if (this.bird.y - BIRD_RADIUS < 0) return true;

    for (const p of this.pipes) {
      const px = p.x - this.scrollX;
      if (px + PIPE_WIDTH < this.bird.x - BIRD_RADIUS || px > this.bird.x + BIRD_RADIUS) continue;
      const topRect = { x: px, y: 0, w: PIPE_WIDTH, h: p.gapY - p.gap / 2 };
      const botRect = { x: px, y: p.gapY + p.gap / 2, w: PIPE_WIDTH, h: this.groundY - (p.gapY + p.gap / 2) };
      if (circleRectHit(this.bird.x, this.bird.y, BIRD_RADIUS, topRect)) return true;
      if (circleRectHit(this.bird.x, this.bird.y, BIRD_RADIUS, botRect)) return true;
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
    // Persist score / new-best NOW so the overlay later has the right values.
    this._gameOverResult = saveHighscore(this.score);
    if (this._gameOverResult.isNew) audio.play('cheer');
    recordCombo(this.combo);
    recordDeath();
    recordScore(this.score);
  }

  explodeIntoFragments() {
    spawnFragments(this.particles, {
      x: this.bird.x, y: this.bird.y,
      vy: this.bird.vy, vx: 0,
      radius: BIRD_RADIUS,
    }, this.birdFragSource || this.assets.bird);
    this.shake.kick(8);
    // The 'over' branch in update() will fire onGameOver after this delay,
    // giving the player ~600ms to see the fragments fly + screen shake.
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
      drawScene(ctx, this.scene, this.scrollX, this.timeElapsed, viewW, viewH, this.groundY);
    }

    // ===== pipes =====
    for (const p of this.pipes) {
      const px = p.x - this.scrollX;
      this.drawPipe(px, 0, PIPE_WIDTH, p.gapY - p.gap / 2, true, p.color);
      this.drawPipe(px, p.gapY + p.gap / 2, PIPE_WIDTH, this.groundY - (p.gapY + p.gap / 2), false, p.color);
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

    // ===== speed lines (behind bird) =====
    if (this.state === 'playing' && this.bird.vy > SPEED_LINE_THRESHOLD) {
      drawSpeedLines(ctx, this.bird, this.timeElapsed);
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
    const s = this.birdSprite.totalSize || r * 2;
    ctx.drawImage(this.birdSprite.canvas, -s / 2, -s / 2, s, s);

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
  // Padding for things that extend past the circle (crown, halo, etc.)
  // For fragments we use no padding so each shard is just body, not accessories.
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

