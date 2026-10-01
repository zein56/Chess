import { useEffect, useRef, useState } from 'react';
import Board, { GLYPH } from './Board.jsx';
import { socket, pid } from './socket.js';
import { play, soundForSan } from './sound.js';
import { material } from './util.js';

const REASON = { checkmate: 'by checkmate', resign: 'by resignation', stalemate: 'Stalemate', insufficient: 'Not enough material', repetition: 'Threefold repetition', 'fifty-move': 'Fifty-move rule' };

export function EndCard({ title, sub, children }) {
  return <div className="endcard" role="dialog"><h2>{title}</h2><p>{sub}</p><div className="row">{children}</div></div>;
}

export function Bar({ name, color, active, waiting, cap = [], plus = 0 }) {
  return (
    <div className={`bar ${active ? 'active' : ''}`}>
      <span className={`chip ${color === 'w' ? 'white' : 'black'}`} />
      <strong>{name || (waiting ? 'Waiting for opponent…' : '—')}</strong>
      <span className="caps">
        {cap.map((t, i) => <i key={i} className={`pc sm ${color === 'w' ? 'black' : 'white'}`}>{GLYPH[t]}</i>)}
        {plus > 0 && <b>+{plus}</b>}
      </span>
    </div>
  );
}

export function MoveList({ moves }) {
  const ref = useRef(null);
  useEffect(() => { ref.current && (ref.current.scrollTop = ref.current.scrollHeight); }, [moves.length]);
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]]);
  return (
    <ol className="moves" ref={ref}>
      {rows.length === 0 && <li className="muted">No moves yet.</li>}
      {rows.map((r, i) => <li key={i}><em>{i + 1}.</em><span>{r[0]}</span><span>{r[1]}</span></li>)}
    </ol>
  );
}

export default function Game({ id, name, onLeave }) {
  const [s, setS] = useState(null);
  const [me, setMe] = useState(undefined);
  const [fatal, setFatal] = useState('');
  const [toast, setToast] = useState('');
  const [bump, setBump] = useState(0);
  const [flip, setFlip] = useState(false);
  const [hideEnd, setHideEnd] = useState(false);
  const [copied, setCopied] = useState(false);
  const prev = useRef({ n: null, status: null });

  useEffect(() => {
    const onState = (st) => st.id === id && setS(st);
    socket.on('game:state', onState);
    const join = () => socket.emit('game:join', { id, pid, name }, (r) => { if (r.error) setFatal(r.error); else setMe(r.color); });
    join(); socket.on('connect', join);
    return () => { socket.off('game:state', onState); socket.off('connect', join); };
  }, [id, name]);

  useEffect(() => {
    if (!s) return;
    const p = prev.current;
    if (p.n !== null) {
      const moved = s.moves.length > p.n;
      if (moved) play(soundForSan(s.moves[s.moves.length - 1]));
      else if (p.status === 'waiting' && s.status === 'playing') play('start');
      if (p.status !== 'over' && s.status === 'over') setTimeout(() => play('end'), moved ? 450 : 0);
    }
    prev.current = { n: s.moves.length, status: s.status };
    if (s.status !== 'over') setHideEnd(false);
  }, [s]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  if (fatal) return <div className="center"><p className="notice">{fatal}</p><button className="btn" onClick={onLeave}>Back to lobby</button></div>;
  if (!s) return <div className="center"><p className="muted">Loading game…</p></div>;

  const base = me || 'w';
  const orient = flip ? (base === 'w' ? 'b' : 'w') : base;
  const opp = orient === 'w' ? 'b' : 'w';
  const myTurn = s.status === 'playing' && me === s.turn;
  const mat = material(s.fen);
  const link = `${location.origin}${location.pathname}#/game/${id}`;
  const winnerName = s.result?.winner && (s.players[s.result.winner]?.name || (s.result.winner === 'w' ? 'White' : 'Black'));
  const endTitle = !s.result ? '' : !s.result.winner ? 'Draw' : me ? (s.result.winner === me ? 'You won' : 'You lost') : `${winnerName} wins`;
  const endSub = s.result ? (s.result.winner && !me ? '' : '') + (s.result.winner && me ? `${winnerName} wins ${REASON[s.result.type]}` : REASON[s.result.type]) : '';
  const status = s.status === 'waiting' ? 'Share the link and wait for a friend to join.'
    : s.status === 'over' ? `${endTitle} — ${endSub}`
    : me ? (myTurn ? (s.check ? 'Your move — you are in check.' : 'Your move.') : 'Opponent is thinking…')
    : `${s.turn === 'w' ? 'White' : 'Black'} to move (spectating).`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { prompt('Copy this link', link); } };

  return (
    <div className="game">
      <div className="stage">
        <Bar name={s.players[opp]?.name} color={opp} cap={mat.cap[opp]} plus={mat.plus[opp]} active={s.status === 'playing' && s.turn === opp} waiting={s.status === 'waiting'} />
        <Board key={bump} fen={s.fen} orientation={orient} lastMove={s.lastMove} canMove={myTurn}
          onMove={(from, to, promotion) => socket.emit('game:move', { id, pid, from, to, promotion }, (r) => {
            if (r?.error) { setToast(r.error); play('illegal'); setBump((b) => b + 1); }
          })}
          overlay={s.status === 'over' && !hideEnd && (
            <EndCard title={endTitle} sub={endSub}>
              <button className="btn primary" onClick={onLeave}>Back to lobby</button>
              <button className="btn ghost" onClick={() => setHideEnd(true)}>Review board</button>
            </EndCard>
          )} />
        <Bar name={s.players[orient]?.name} color={orient} cap={mat.cap[orient]} plus={mat.plus[orient]} active={s.status === 'playing' && s.turn === orient} />
      </div>
      <aside className="panel">
        <p className={`status ${s.status === 'over' ? 'over' : ''}`} aria-live="polite">{status}</p>
        {s.status === 'waiting' && <button className="btn primary" onClick={copy}>{copied ? 'Link copied' : 'Copy invite link'}</button>}
        <MoveList moves={s.moves} />
        <div className="row">
          {s.status === 'playing' && me && <button className="btn ghost" onClick={() => confirm('Resign this game?') && socket.emit('game:resign', { id, pid })}>Resign</button>}
          <button className="btn ghost" onClick={() => setFlip((f) => !f)}>Flip</button>
          <button className="btn ghost" onClick={onLeave}>Leave</button>
        </div>
      </aside>
      {toast && <div className="toast" role="alert">{toast}</div>}
    </div>
  );
}
