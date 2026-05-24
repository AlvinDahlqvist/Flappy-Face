// js/grading.js — pure scoring → letter-grade.
//
// Inputs are the final-run stats; output is a grade letter, the breakdown,
// and a CSS color string for visual use.

export const GRADE_THRESHOLDS = Object.freeze({
  S: 80, A: 50, B: 25, C: 10, D: 0,
});

const COLORS = Object.freeze({
  S: '#ffd166',
  A: '#06d6a0',
  B: '#5eb3d6',
  C: '#ff8c42',
  D: '#ef476f',
});

export function gradeRun({ score = 0, coins = 0, bestCombo = 0, nearMisses = 0, isNewBest = false } = {}) {
  const base  = Math.max(0, score);
  const bonus = coins * 0.5 + bestCombo * 1.5 + nearMisses * 0.3;
  const total = base + bonus;
  let grade;
  if (isNewBest || total >= GRADE_THRESHOLDS.S) grade = 'S';
  else if (total >= GRADE_THRESHOLDS.A) grade = 'A';
  else if (total >= GRADE_THRESHOLDS.B) grade = 'B';
  else if (total >= GRADE_THRESHOLDS.C) grade = 'C';
  else grade = 'D';
  return {
    grade,
    breakdown: { base, bonus: Number(bonus.toFixed(1)), total: Number(total.toFixed(1)) },
    color: COLORS[grade],
  };
}
