// js/level-thumbnail.js — renders a small canvas preview of a level + difficulty estimate.

export function renderLevelThumbnail(level, canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  // Sky
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5eb3d6');
  grad.addColorStop(1, '#d2eef4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Ground band
  ctx.fillStyle = '#3a7a3a';
  ctx.fillRect(0, h - 6, w, 6);

  if (!level || !level.obstacles?.length) return;

  // Pipes: project across width
  const minX = Math.min(...level.obstacles.map(o => o.x));
  const maxX = Math.max(...level.obstacles.map(o => o.x));
  const range = Math.max(1, maxX - minX);
  ctx.fillStyle = '#0d1b3d';
  for (const o of level.obstacles) {
    const x = ((o.x - minX) / range) * (w - 4) + 2;
    // gap centered at o.gapY
    const totalH = h - 6;
    const gapTop = (o.gapY - level.gap / 2) / 600 * totalH;
    const gapBot = (o.gapY + level.gap / 2) / 600 * totalH;
    ctx.fillRect(x - 1, 0, 3, Math.max(0, gapTop));
    ctx.fillRect(x - 1, gapBot, 3, Math.max(0, totalH - gapBot));
  }
}

export function difficultyOf(level) {
  if (!level || !level.obstacles?.length) return 'EASY';
  const count = level.obstacles.length;
  const avgGap = level.gap;   // gap is uniform per level today
  if (avgGap <= 110 || count >= 15) return 'HARD';
  if (avgGap >= 180 || count <= 5)  return 'EASY';
  return 'MED';
}
