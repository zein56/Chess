import { useState } from 'react';
import { Chess } from 'chess.js';
import Board from './Board.jsx';
import { MoveList } from './Game.jsx';

export default function Local({ onLeave }) {
  const [chess, setChess] = useState(() => new Chess());
  const [flip, setFlip] = useState(true);
  const [last, setLast] = useState(null);
  const over = chess.isGameOver();
  const turn = chess.turn();

  function move(from, to, promotion) {
    const c = new Chess(); c.loadPgn(chess.pgn());
    try { c.move({ from, to, promotion }); } catch { return; }
    setChess(c); setLast({ from, to });
  }
  function undo() {
    const c = new Chess(); c.loadPgn(chess.pgn()); c.undo(); setChess(c);
    const h = c.history({ verbose: true }).pop(); setLast(h ? { from: h.from, to: h.to } : null);
  }
  const status = chess.isCheckmate() ? `Checkmate. ${turn === 'w' ? 'Black' : 'White'} wins.`
    : over ? 'Draw.' : `${turn === 'w' ? 'White' : 'Black'} to move${chess.inCheck() ? ' — check!' : '.'}`;

  return (
    <div className="game">
      <div className="stage">
        <div className="bar"><span className="chip black" /><strong>Black</strong></div>
        <div className={flip && turn === 'b' ? 'turned' : ''}>
          <Board fen={chess.fen()} orientation={flip ? turn : 'w'} lastMove={last} check={chess.inCheck()} canMove={!over} onMove={move} />
        </div>
        <div className="bar"><span className="chip white" /><strong>White</strong></div>
      </div>
      <aside className="panel">
        <p className={`status ${over ? 'over' : ''}`}>{status}</p>
        <MoveList moves={chess.history()} />
        <label className="toggle"><input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} /> Flip board each turn</label>
        <div className="row">
          <button className="btn ghost" onClick={undo} disabled={!chess.history().length}>Undo</button>
          <button className="btn ghost" onClick={() => { setChess(new Chess()); setLast(null); }}>New game</button>
          <button className="btn ghost" onClick={onLeave}>Leave</button>
        </div>
      </aside>
    </div>
  );
}
