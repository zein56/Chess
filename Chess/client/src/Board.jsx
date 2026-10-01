import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';

// \uFE0E forces text (not emoji) rendering on iOS/Android
export const GLYPH = { k: '♚\uFE0E', q: '♛\uFE0E', r: '♜\uFE0E', b: '♝\uFE0E', n: '♞\uFE0E', p: '♟\uFE0E' };
const FILES = 'abcdefgh';

export default function Board({ fen, orientation = 'w', lastMove, canMove, onMove, overlay }) {
  // optimistic state: show our own move instantly while the server confirms
  const [opt, setOpt] = useState(null);
  useEffect(() => { setOpt(null); }, [fen]);
  const shown = opt?.fen || fen;
  const last = opt?.last || lastMove;
  const chess = useMemo(() => new Chess(shown), [shown]);

  const boardRef = useRef(null);
  const [sel, setSel] = useState(null);
  const [promo, setPromo] = useState(null);
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const wasSel = useRef(false);
  const skipAnim = useRef(false);
  const prev = useRef({ fen: shown, orient: orientation });

  const targets = useMemo(() => {
    const t = {};
    if (sel) chess.moves({ square: sel, verbose: true }).forEach((m) => { t[m.to] = m; });
    return t;
  }, [sel, chess]);

  const rows = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const cols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const inCheck = chess.inCheck();
  const kingSq = inCheck ? chess.board().flat().find((p) => p && p.type === 'k' && p.color === chess.turn())?.square : null;

  const cell = (sq) => {
    const f = FILES.indexOf(sq[0]), r = +sq[1];
    return orientation === 'w' ? [f, 8 - r] : [7 - f, r - 1];
  };
  function sqAt(x, y) {
    const b = boardRef.current; if (!b) return null;
    const R = b.getBoundingClientRect(), s = R.width / 8;
    const cx = Math.floor((x - R.left) / s), cy = Math.floor((y - R.top) / s);
    if (cx < 0 || cx > 7 || cy < 0 || cy > 7) return null;
    return orientation === 'w' ? FILES[cx] + (8 - cy) : FILES[7 - cx] + (cy + 1);
  }

  // slide animation for moves that were not made by dragging/tapping here
  useLayoutEffect(() => {
    const p = prev.current;
    if (skipAnim.current) skipAnim.current = false;
    else if (last && p.fen !== shown && p.orient === orientation && boardRef.current) {
      const el = boardRef.current.querySelector(`[data-sq="${last.to}"] .pc`);
      if (el) {
        const [fx, fy] = cell(last.from), [tx, ty] = cell(last.to), s = boardRef.current.clientWidth / 8;
        el.style.zIndex = 6;
        el.animate([{ transform: `translate(${(fx - tx) * s}px,${(fy - ty) * s}px)` }, { transform: 'translate(0,0)' }],
          { duration: 170, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => { el.style.zIndex = ''; };
      }
    }
    prev.current = { fen: shown, orient: orientation };
    setSel(null);
  }, [shown]); // eslint-disable-line

  function apply(from, to, promotion) {
    const c = new Chess(shown);
    try { c.move({ from, to, promotion }); } catch { return; }
    skipAnim.current = true;
    setOpt({ fen: c.fen(), last: { from, to } });
    setSel(null); setPromo(null);
    onMove(from, to, promotion);
  }
  function commit(from, to, m) {
    const mv = m || chess.moves({ square: from, verbose: true }).find((x) => x.to === to);
    if (!mv) return;
    if (mv.promotion) { setPromo({ from, to }); setSel(null); return; }
    apply(from, to);
  }

  function down(e) {
    if (!canMove || promo || (e.button !== undefined && e.button > 0)) return;
    const sq = sqAt(e.clientX, e.clientY); if (!sq) return;
    const piece = chess.get(sq);
    if (sel && targets[sq]) { commit(sel, sq, targets[sq]); return; }
    if (piece && piece.color === chess.turn()) {
      wasSel.current = sel === sq;
      setSel(sq);
      dragRef.current = { from: sq, piece, sx: e.clientX, sy: e.clientY, moved: false };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    } else setSel(null);
  }
  function move(e) {
    const d = dragRef.current; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.moved = true;
    setDrag({ from: d.from, piece: d.piece, x: e.clientX, y: e.clientY, hover: sqAt(e.clientX, e.clientY) });
  }
  function up(e) {
    const d = dragRef.current; dragRef.current = null; setDrag(null);
    if (!d) return;
    if (!d.moved) { if (wasSel.current) setSel(null); return; }
    const to = sqAt(e.clientX, e.clientY);
    const m = to && chess.moves({ square: d.from, verbose: true }).find((x) => x.to === to);
    if (m) commit(d.from, to, m); else setSel(null);
  }
  function cancel() { dragRef.current = null; setDrag(null); }

  return (
    <div className="board-wrap">
      <div ref={boardRef} className={`board ${canMove ? 'can' : ''}`} aria-label="Chess board"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onContextMenu={(e) => e.preventDefault()}>
        {rows.map((r) => cols.map((c) => {
          const sq = FILES[c] + r, piece = chess.get(sq);
          const cls = ['sq', (c + r) % 2 === 1 ? 'dark' : 'light'];
          if (sel === sq) cls.push('sel');
          if (last && (last.from === sq || last.to === sq)) cls.push('last');
          if (kingSq === sq) cls.push('check');
          if (drag?.hover === sq && targets[sq]) cls.push('hover');
          return (
            <div key={sq} data-sq={sq} className={cls.join(' ')}>
              {piece && <span className={`pc ${piece.color === 'w' ? 'white' : 'black'} ${drag?.from === sq ? 'lifted' : ''}`}>{GLYPH[piece.type]}</span>}
              {targets[sq] && <i className={piece ? 'cap' : 'dot'} />}
              {r === (orientation === 'w' ? 1 : 8) && <b className="coord f">{FILES[c]}</b>}
              {c === (orientation === 'w' ? 0 : 7) && <b className="coord r">{r}</b>}
            </div>
          );
        }))}
      </div>
      {drag && <span className={`pc ghost ${drag.piece.color === 'w' ? 'white' : 'black'}`} style={{ left: drag.x, top: drag.y }}>{GLYPH[drag.piece.type]}</span>}
      {promo && (
        <div className="promo" role="dialog" aria-label="Choose promotion">
          <p>Promote to</p>
          <div>{['q', 'r', 'b', 'n'].map((p) => (
            <button key={p} onClick={() => apply(promo.from, promo.to, p)} className={`pc ${chess.turn() === 'w' ? 'white' : 'black'}`}>{GLYPH[p]}</button>
          ))}</div>
          <button className="link" onClick={() => setPromo(null)}>Cancel</button>
        </div>
      )}
      {overlay}
    </div>
  );
}
