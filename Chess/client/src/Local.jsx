import { useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { Bar, EndCard, MoveList } from './Game.jsx';
import { play, soundForSan } from './sound.js';
import { material } from './util.js';

const clone = (c) => { const n = new Chess(); n.loadPgn(c.pgn()); return n; };

export default function Local({ onLeave }) {
  const [chess, setChess] = useState(() => new Chess());
  const [auto, setAuto] = useState(true);
  const [manual, setManual] = useState('w');
  const [last, setLast] = useState(null);
  const [hide, setHide] = useState(false);
  const over = chess.isGameOver(), turn = chess.turn();
  const orient = auto ? turn : manual, top = orient === 'w' ? 'b' : 'w';
  const mat = material(chess.fen());
  const nm = (c) => (c === 'w' ? 'White' : 'Black');

  function move(from, to, promotion) {
    const c = clone(chess); let m;
    try { m = c.move({ from, to, promotion }); } catch { return; }
    setChess(c); setLast({ from, to }); setHide(false);
    play(soundForSan(m.san));
    if (c.isGameOver()) setTimeout(() => play('end'), 450);
  }
  function undo() {
    const c = clone(chess); c.undo(); setChess(c); setHide(false);
    const h = c.history({ verbose: true }).pop(); setLast(h ? { from: h.from, to: h.to } : null);
  }
  const mate = chess.isCheckmate();
  const title = mate ? `${nm(turn === 'w' ? 'b' : 'w')} wins` : 'Draw';
  const sub = mate ? 'by checkmate' : chess.isStalemate() ? 'Stalemate' : chess.isInsufficientMaterial() ? 'Not enough material' : 'Draw';
  const status = over ? `${title} — ${sub}` : `${nm(turn)} to move${chess.inCheck() ? ' — check!' : '.'}`;

  return (
    <div className="game">
      <div className="stage">
        <Bar name={nm(top)} color={top} cap={mat.cap[top]} plus={mat.plus[top]} active={!over && turn === top} />
        <Board fen={chess.fen()} orientation={orient} lastMove={last} canMove={!over} onMove={move}
          overlay={over && !hide && (
            <EndCard title={title} sub={sub}>
              <button className="btn primary" onClick={() => { setChess(new Chess()); setLast(null); }}>New game</button>
              <button className="btn ghost" onClick={() => setHide(true)}>Review board</button>
            </EndCard>
          )} />
        <Bar name={nm(orient)} color={orient} cap={mat.cap[orient]} plus={mat.plus[orient]} active={!over && turn === orient} />
      </div>
      <aside className="panel">
        <p className={`status ${over ? 'over' : ''}`}>{status}</p>
        <MoveList moves={chess.history()} />
        <label className="toggle"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Flip board each turn</label>
        <div className="row">
          {!auto && <button className="btn ghost" onClick={() => setManual((m) => (m === 'w' ? 'b' : 'w'))}>Flip</button>}
          <button className="btn ghost" onClick={undo} disabled={!chess.history().length}>Undo</button>
          <button className="btn ghost" onClick={() => { setChess(new Chess()); setLast(null); setHide(false); }}>New game</button>
          <button className="btn ghost" onClick={onLeave}>Leave</button>
        </div>
      </aside>
    </div>
  );
}
