import { loadAllPhotos } from './assets.js';
import { saveLevel, loadPhotos } from './storage.js';
import { onCanvasPoint, fitCanvas } from './input.js';

const PIPE_WIDTH = 70;
const GROUND_HEIGHT = 60;
const LEVEL_LENGTH = 3000; // total horizontal length of a custom level

export class Editor {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.obstacles = [];
    this.gap = 150;
    this.tool = 'add';
    this.scrollX = 0;
    this.dragging = null;
    this.rafId = null;
    this.disposers = [];
    this.assets = { bird: null, pipe: null, bg: null };
  }

  async start(initial) {
    this.assets = await loadAllPhotos();
    if (initial) {
      this.obstacles = (initial.obstacles || []).map(o => ({ ...o }));
      this.gap = initial.gap || 150;
    }
    this.resize();

    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    this.disposers.push(() => window.removeEventListener('resize', onResize));

    const disposePoint = onCanvasPoint(this.canvas, {
      onDown: (p) => this.handleDown(p),
      onDrag: (p, ctx) => this.handleDrag(p, ctx),
      onUp: () => { this.dragging = null; },
      onTap: (p) => this.handleTap(p),
      onLongPress: (p) => this.handleLongPress(p),
    });
    this.disposers.push(disposePoint);

    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.disposers.forEach(fn => fn());
    this.disposers = [];
  }

  setTool(t) { this.tool = t; }
  setGap(g) { this.gap = Number(g); }
  getLevel(name) {
    return {
      name: name || 'Untitled',
      gap: this.gap,
      obstacles: this.obstacles.slice().sort((a, b) => a.x - b.x),
      photos: loadPhotos(),
      created: Date.now(),
    };
  }
  clear() { this.obstacles = []; }
  loadObstacles(list, gap) {
    this.obstacles = list.map(o => ({ ...o }));
    if (gap) this.gap = gap;
  }

  resize() {
    const { width, height } = fitCanvas(this.canvas);
    this.viewW = width;
    this.viewH = height;
    this.groundY = this.viewH - GROUND_HEIGHT;
  }

  handleDown(p) {
    const worldX = p.x + this.scrollX;
    if (this.tool === 'move') {
      const hit = this.findObstacleAt(worldX, p.y);
      if (hit) {
        this.dragging = { obstacle: hit, offsetX: hit.x - worldX, offsetY: hit.gapY - p.y };
        return this.dragging;
      }
    }
    // pan scroll if no obstacle hit in move/delete tools; for add tool, only tap matters
    if (this.tool !== 'add') {
      this.dragging = { pan: true, startX: p.x, scrollStart: this.scrollX };
      return this.dragging;
    }
    return null;
  }

  handleDrag(p, ctx) {
    if (!ctx) return;
    if (ctx.pan) {
      const dx = p.x - ctx.startX;
      this.scrollX = clamp(ctx.scrollStart - dx, 0, LEVEL_LENGTH - this.viewW);
    } else if (ctx.obstacle) {
      ctx.obstacle.x = clamp(p.x + this.scrollX + ctx.offsetX, 0, LEVEL_LENGTH - PIPE_WIDTH);
      ctx.obstacle.gapY = clamp(p.y + ctx.offsetY, this.gap / 2 + 30, this.groundY - this.gap / 2 - 30);
    }
  }

  handleTap(p) {
    const worldX = p.x + this.scrollX;
    if (this.tool === 'add') {
      const gapY = clamp(p.y, this.gap / 2 + 30, this.groundY - this.gap / 2 - 30);
      this.obstacles.push({ x: worldX, gapY });
    } else if (this.tool === 'delete') {
      const hit = this.findObstacleAt(worldX, p.y);
      if (hit) this.obstacles = this.obstacles.filter(o => o !== hit);
    }
  }

  handleLongPress(p) {
    const worldX = p.x + this.scrollX;
    const hit = this.findObstacleAt(worldX, p.y);
    if (hit) this.obstacles = this.obstacles.filter(o => o !== hit);
  }

  findObstacleAt(worldX, y) {
    return this.obstacles.find(o => worldX >= o.x - 10 && worldX <= o.x + PIPE_WIDTH + 10);
  }

  loop() {
    this.rafId = requestAnimationFrame(this.loop);
    this.render();
  }

  render() {
    const { ctx, viewW, viewH } = this;
    ctx.clearRect(0, 0, viewW, viewH);

    // background
    if (this.assets.bg) {
      const img = this.assets.bg;
      const scale = Math.max(viewW / img.width, viewH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, 0, (viewH - h) / 2, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, viewW, viewH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, viewH);
      grad.addColorStop(0, '#2a3a5e');
      grad.addColorStop(1, '#0e1530');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // grid hint
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = -this.scrollX % 100; x < viewW; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, this.groundY);
      ctx.stroke();
    }

    // obstacles
    for (const o of this.obstacles) {
      const px = o.x - this.scrollX;
      if (px + PIPE_WIDTH < 0 || px > viewW) continue;
      this.drawPipe(px, 0, PIPE_WIDTH, o.gapY - this.gap / 2);
      this.drawPipe(px, o.gapY + this.gap / 2, PIPE_WIDTH, this.groundY - (o.gapY + this.gap / 2));
      // gap indicator
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.strokeRect(px, o.gapY - this.gap / 2, PIPE_WIDTH, this.gap);
      ctx.setLineDash([]);
    }

    // ground
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(0, this.groundY, viewW, viewH - this.groundY);
    ctx.fillStyle = '#88a06b';
    ctx.fillRect(0, this.groundY, viewW, 6);

    // end-of-level marker
    const endX = LEVEL_LENGTH - this.scrollX;
    if (endX > 0 && endX < viewW) {
      ctx.fillStyle = 'rgba(239, 71, 111, 0.8)';
      ctx.fillRect(endX, 0, 4, this.groundY);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.fillText('END', endX + 8, 20);
    }

    // scrollbar
    const scrollW = (this.viewW / LEVEL_LENGTH) * this.viewW;
    const scrollPos = (this.scrollX / LEVEL_LENGTH) * this.viewW;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, viewH - 4, viewW, 4);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
    ctx.fillRect(scrollPos, viewH - 4, scrollW, 4);

    // help text when empty
    if (this.obstacles.length === 0 && this.tool === 'add') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tap to add pipes', viewW / 2, viewH / 2 - 20);
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('Drag with M tool · Delete with - tool', viewW / 2, viewH / 2 + 8);
      ctx.textAlign = 'left';
    }

    // obstacle count
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '13px system-ui';
    ctx.fillText(`${this.obstacles.length} pipes`, 10, viewH - 12);
  }

  drawPipe(x, y, w, h) {
    if (h <= 0) return;
    const { ctx } = this;
    if (this.assets.pipe) {
      const img = this.assets.pipe;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const tileH = w * (img.height / img.width);
      for (let ty = y; ty < y + h + tileH; ty += tileH) {
        ctx.drawImage(img, x, ty, w, tileH);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    } else {
      ctx.fillStyle = '#73bf2e';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#3d6b18';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
    }
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function saveCurrentLevel(editor, name) {
  const level = editor.getLevel(name);
  saveLevel(level);
  return level;
}

export function exportLevel(level) {
  const blob = new Blob([JSON.stringify(level, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(level.name || 'level').replace(/[^a-z0-9-_]+/gi, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

export function importLevelFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.obstacles || !Array.isArray(data.obstacles)) {
          reject(new Error('Invalid level: missing obstacles'));
          return;
        }
        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
