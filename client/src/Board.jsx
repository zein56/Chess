import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';

export default function Board({ fen, orientation = 'w', lastMove, check, canMove, onMove }) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const [sel, setSel] = useState(null);
  const [promo, setPromo] = useState(null);

  const targets = useMemo(() => {
    if (!sel) return {};
    const t = {};
    chess.moves({ square: sel, verbose: true }).forEach((m) => { t[m.to] = m; });
    return t;
  }, [sel, chess]);

  const rows = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const cols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const kingSq = check ? chess.board().flat().find((p) => p && p.type === 'k' && p.color === chess.turn())?.square : null;

  function tap(sq) {
    if (!canMove) return;
    const piece = chess.get(sq);
    if (sel && targets[sq]) {
      const m = targets[sq];
      if (m.promotion) { setPromo({ from: sel, to: sq }); return; }
      setSel(null); onMove(sel, sq);
    } else if (piece && piece.color === chess.turn()) {
      setSel(sel === sq ? null : sq);
    } else setSel(null);
  }
  function pick(p) { const { from, to } = promo; setPromo(null); setSel(null); onMove(from, to, p); }

  return (
    <div className="board-wrap">
      <div className="board" role="grid" aria-label="Chess board">
        {rows.map((r) => cols.map((c) => {
          const sq = FILES[c] + r;
          const piece = chess.get(sq);
          const dark = (c + r) % 2 === 1;
          const cls = ['sq', dark ? 'dark' : 'light'];
          if (sel === sq) cls.push('sel');
          if (lastMove && (lastMove.from === sq || lastMove.to === sq)) cls.push('last');
          if (kingSq === sq) cls.push('check');
          const isTarget = !!targets[sq];
          return (
            <button key={sq} className={cls.join(' ')} onClick={() => tap(sq)} aria-label={sq}>
              {piece && <span className={`pc ${piece.color === 'w' ? 'white' : 'black'}`}>{GLYPH[piece.type]}</span>}
              {isTarget && <i className={piece ? 'cap' : 'dot'} />}
              {r === (orientation === 'w' ? 1 : 8) && <b className="coord f">{FILES[c]}</b>}
              {c === (orientation === 'w' ? 0 : 7) && <b className="coord r">{r}</b>}
            </button>
          );
        }))}
      </div>
      {promo && (
        <div className="promo" role="dialog" aria-label="Choose promotion">
          <p>Promote to</p>
          <div>{['q', 'r', 'b', 'n'].map((p) => (
            <button key={p} onClick={() => pick(p)} className={`pc ${chess.turn() === 'w' ? 'white' : 'black'}`}>{GLYPH[p]}</button>
          ))}</div>
          <button className="link" onClick={() => setPromo(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
