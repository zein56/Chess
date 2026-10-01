const START = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };

// Captured pieces + material balance, derived from a FEN string.
export function material(fen) {
  const cnt = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const ch of fen.split(' ')[0]) {
    const l = ch.toLowerCase();
    if (/[a-z]/i.test(ch) && 'pnbrq'.includes(l)) cnt[ch === l ? 'b' : 'w'][l]++;
  }
  const cap = { w: [], b: [] }, score = { w: 0, b: 0 };
  for (const c of ['w', 'b']) {
    const other = c === 'w' ? 'b' : 'w';
    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      const missing = Math.max(0, START[t] - cnt[other][t]);
      for (let i = 0; i < missing; i++) cap[c].push(t);
      score[c] += missing * VAL[t];
    }
  }
  return { cap, plus: { w: score.w - score.b, b: score.b - score.w } };
}
