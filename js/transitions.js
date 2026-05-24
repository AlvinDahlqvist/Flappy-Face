// js/transitions.js — screen-to-screen transition runner.
// Replaces the direct .classList.toggle('active') flip with a pixel-dissolve wipe.

import { isReducedMotion } from './settings.js';

const TILE_SIZE = 32;

let layer = null;
let layerCanvas = null;

function ensureLayer() {
  if (layer) return;
  layer = document.createElement('div');
  layer.className = 'transition-layer';
  layerCanvas = document.createElement('canvas');
  layer.appendChild(layerCanvas);
  document.body.appendChild(layer);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function tileList(w, h) {
  const cols = Math.ceil(w / TILE_SIZE);
  const rows = Math.ceil(h / TILE_SIZE);
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({ x: c * TILE_SIZE, y: r * TILE_SIZE });
    }
  }
  return shuffle(tiles);
}

function fillPhase(ctx, tiles, ratio) {
  ctx.fillStyle = '#0d1b3d';
  const count = Math.floor(tiles.length * ratio);
  for (let i = 0; i < count; i++) {
    const t = tiles[i];
    ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE);
  }
}

function revealPhase(ctx, tiles, ratio, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0d1b3d';
  const count = Math.floor(tiles.length * ratio);
  for (let i = count; i < tiles.length; i++) {
    const t = tiles[i];
    ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE);
  }
}

async function pixelWipe(swapFn) {
  ensureLayer();
  const w = window.innerWidth;
  const h = window.innerHeight;
  layerCanvas.width = w;
  layerCanvas.height = h;
  layer.classList.add('active');
  const ctx = layerCanvas.getContext('2d');
  const tiles = tileList(w, h);
  const DURATION_FILL = 180;
  const DURATION_REVEAL = 180;

  // FILL phase
  await new Promise(resolve => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION_FILL);
      ctx.clearRect(0, 0, w, h);
      fillPhase(ctx, tiles, t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

  // Swap screens (DOM changes happen while fully covered)
  await swapFn();

  // REVEAL phase
  await new Promise(resolve => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION_REVEAL);
      revealPhase(ctx, tiles, t, w, h);
      if (t < 1) requestAnimationFrame(tick);
      else { ctx.clearRect(0, 0, w, h); resolve(); }
    };
    requestAnimationFrame(tick);
  });

  layer.classList.remove('active');
}

async function opacityFade(swapFn) {
  await swapFn();
}

// Public API: run swapFn (which must update DOM to show the new screen) inside a transition.
export async function transition(swapFn) {
  if (isReducedMotion()) return opacityFade(swapFn);
  return pixelWipe(swapFn);
}
