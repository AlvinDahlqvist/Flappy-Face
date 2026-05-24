// js/share-card.js — renders a shareable 1080x1350 PNG of a run.
//
// buildShareCard({...}) returns { blob, dataUrl, width, height }.
// downloadShareCard(card, name?) triggers a download.
// copyShareCard(card) writes to clipboard if supported, returns true/false.

import { drawScene, pickTheme, buildScene } from './scene.js';

const W = 1080;
const H = 1350;

export async function buildShareCard({ bird, photoImg, grade, score, best, theme }) {
  const cnv = document.createElement('canvas');
  cnv.width = W;
  cnv.height = H;
  const ctx = cnv.getContext('2d');

  // 1. Sky backdrop
  const t = theme || pickTheme();
  const scene = buildScene(t, W, H - 200);
  drawScene(ctx, scene, 0, 0, W, H - 200, H - 200);

  // Solid bottom band for text
  ctx.fillStyle = '#0d1b3d';
  ctx.fillRect(0, H - 200, W, 200);

  // 2. Bird centered
  ctx.save();
  ctx.translate(W / 2, H / 2 - 80);
  const r = 140;
  if (bird && bird.draw) {
    bird.draw(ctx, r);
  } else if (photoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    const scale = Math.max((r * 2) / photoImg.width, (r * 2) / photoImg.height);
    const w = photoImg.width * scale, h = photoImg.height * scale;
    ctx.drawImage(photoImg, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Grade letter (huge)
  ctx.fillStyle = gradeColor(grade);
  ctx.font = '900 320px "Bungee", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(grade || 'D', W / 2, H / 2 + 220);

  // 4. Score row
  ctx.fillStyle = '#f7f7ff';
  ctx.font = 'bold 64px "Press Start 2P", monospace';
  ctx.fillText(`${score}`, W / 2, H - 130);
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.fillStyle = '#a8a8c0';
  ctx.fillText(`BEST ${best}`, W / 2, H - 80);

  // 5. Wordmark
  ctx.fillStyle = '#ffd166';
  ctx.font = '900 40px "Bungee", sans-serif';
  ctx.fillText('FLAPPY FACE', W / 2, H - 30);

  const dataUrl = cnv.toDataURL('image/png');
  const blob = await new Promise(r => cnv.toBlob(r, 'image/png'));
  return { blob, dataUrl, width: W, height: H };
}

function gradeColor(g) {
  switch (g) {
    case 'S': return '#ffd166';
    case 'A': return '#06d6a0';
    case 'B': return '#5eb3d6';
    case 'C': return '#ff8c42';
    case 'D':
    default:  return '#ef476f';
  }
}

export function downloadShareCard(card, filename = 'flappy-face.png') {
  const a = document.createElement('a');
  a.href = card.dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function copyShareCard(card) {
  if (!navigator.clipboard || !window.ClipboardItem) return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': card.blob })]);
    return true;
  } catch (e) {
    console.warn('copy failed', e);
    return false;
  }
}
