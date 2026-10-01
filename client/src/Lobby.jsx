import { useEffect, useState } from 'react';
import { socket, pid } from './socket.js';

export default function Lobby({ name, go }) {
  const [list, setList] = useState([]);
  const [color, setColor] = useState('random');

  useEffect(() => {
    const on = (l) => setList(l);
    socket.on('lobby:list', on);
    const join = () => socket.emit('lobby:join');
    join(); socket.on('connect', join);
    return () => { socket.off('lobby:list', on); socket.off('connect', join); };
  }, []);

  const quick = () => socket.emit('game:quick', { pid, name }, (r) => go(`/game/${r.id}`));
  const create = () => socket.emit('game:create', { pid, name, color }, (r) => go(`/game/${r.id}`));

  return (
    <div className="lobby">
      <section className="actions">
        <button className="btn big primary" onClick={quick}><span>Quick match</span><small>Jump into the first open game</small></button>
        <button className="btn big" onClick={() => go('/local')}><span>Play locally</span><small>Two players, one device</small></button>
      </section>

      <section className="create">
        <h2>Create a game</h2>
        <div className="seg" role="radiogroup" aria-label="Your color">
          {[['w', 'White'], ['random', 'Random'], ['b', 'Black']].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={color === v} className={color === v ? 'on' : ''} onClick={() => setColor(v)}>{l}</button>
          ))}
        </div>
        <button className="btn" onClick={create}>Create game</button>
      </section>

      <section className="open">
        <h2>Open games</h2>
        {list.length === 0 && <p className="muted empty">No open games right now. Create one and share the link.</p>}
        <ul>
          {list.map((g) => (
            <li key={g.id}>
              <div><strong>{g.host}</strong><small>plays {g.hostColor === 'w' ? 'White' : 'Black'}</small></div>
              <button className="btn small" onClick={() => go(`/game/${g.id}`)}>Join</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
