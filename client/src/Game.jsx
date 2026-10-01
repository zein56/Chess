import { useEffect, useState } from 'react';
import Board from './Board.jsx';
import { socket, pid } from './socket.js';

export function resultText(s, me) {
  if (!s.result) return '';
  const r = s.result, who = r.winner && (s.players[r.winner]?.name || (r.winner === 'w' ? 'White' : 'Black'));
  const win = r.winner && me && r.winner === me ? 'You won! ' : '';
  const t = { checkmate: `Checkmate. ${who} wins.`, resign: `${who} wins by resignation.`, stalemate: 'Draw by stalemate.', insufficient: 'Draw: not enough material.', repetition: 'Draw by repetition.', 'fifty-move': 'Draw by fifty-move rule.' };
  return win + t[r.type];
}

function Bar({ name, color, active, waiting }) {
  return (
    <div className={`bar ${active ? 'active' : ''}`}>
      <span className={`chip ${color === 'w' ? 'white' : 'black'}`} />
      <strong>{name || (waiting ? 'Waiting for opponent…' : '—')}</strong>
    </div>
  );
}

export function MoveList({ moves }) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]]);
  return (
    <ol className="moves">
      {rows.length === 0 && <li className="muted">No moves yet.</li>}
      {rows.map((r, i) => <li key={i}><em>{i + 1}.</em><span>{r[0]}</span><span>{r[1]}</span></li>)}
    </ol>
  );
}

export default function Game({ id, name, onLeave }) {
  const [s, setS] = useState(null);
  const [me, setMe] = useState(undefined);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onState = (st) => st.id === id && setS(st);
    socket.on('game:state', onState);
    const join = () => socket.emit('game:join', { id, pid, name }, (r) => {
      if (r.error) setErr(r.error); else setMe(r.color);
    });
    join();
    socket.on('connect', join);
    return () => { socket.off('game:state', onState); socket.off('connect', join); };
  }, [id, name]);

  if (err) return <div className="center"><p className="notice">{err}</p><button className="btn" onClick={onLeave}>Back to lobby</button></div>;
  if (!s) return <div className="center"><p className="muted">Loading game…</p></div>;

  const orient = me || 'w';
  const opp = orient === 'w' ? 'b' : 'w';
  const myTurn = s.status === 'playing' && me === s.turn;
  const link = `${location.origin}${location.pathname}#/game/${id}`;
  const status = s.status === 'waiting' ? 'Share the link and wait for a friend to join.'
    : s.status === 'over' ? resultText(s, me)
    : me ? (myTurn ? (s.check ? 'Your move — you are in check.' : 'Your move.') : 'Opponent is thinking…')
    : `${s.turn === 'w' ? 'White' : 'Black'} to move (spectating).`;

  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { prompt('Copy this link', link); } };

  return (
    <div className="game">
      <div className="stage">
        <Bar name={s.players[opp]?.name} color={opp} active={s.status === 'playing' && s.turn === opp} waiting={s.status === 'waiting'} />
        <Board fen={s.fen} orientation={orient} lastMove={s.lastMove} check={s.check} canMove={myTurn}
          onMove={(from, to, promotion) => socket.emit('game:move', { id, pid, from, to, promotion }, (r) => r?.error && setErr(r.error))} />
        <Bar name={s.players[orient]?.name} color={orient} active={s.status === 'playing' && s.turn === orient} />
      </div>
      <aside className="panel">
        <p className={`status ${s.status === 'over' ? 'over' : ''}`} aria-live="polite">{status}</p>
        {s.status === 'waiting' && <button className="btn" onClick={copy}>{copied ? 'Link copied' : 'Copy invite link'}</button>}
        <MoveList moves={s.moves} />
        <div className="row">
          {s.status === 'playing' && me && <button className="btn ghost" onClick={() => confirm('Resign this game?') && socket.emit('game:resign', { id, pid })}>Resign</button>}
          <button className="btn ghost" onClick={onLeave}>Leave</button>
        </div>
      </aside>
    </div>
  );
}
