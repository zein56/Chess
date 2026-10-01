import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { Chess } from 'chess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// In-memory store (v1). MySQL can replace this later for history/ratings.
const games = new Map();
const uid = () => Math.random().toString(36).slice(2, 8);
const clean = (n) => String(n || 'Guest').trim().slice(0, 16) || 'Guest';

function publicState(g) {
  const c = g.chess;
  const hist = c.history({ verbose: true });
  const last = hist[hist.length - 1];
  return {
    id: g.id,
    fen: c.fen(),
    turn: c.turn(),
    status: g.status,
    result: g.result,
    check: c.inCheck(),
    moves: hist.map((m) => m.san),
    lastMove: last ? { from: last.from, to: last.to } : null,
    players: {
      w: g.players.w && { name: g.players.w.name },
      b: g.players.b && { name: g.players.b.name },
    },
  };
}
const lobby = () =>
  [...games.values()]
    .filter((g) => g.status === 'waiting')
    .sort((a, b) => b.created - a.created)
    .map((g) => {
      const host = g.players.w || g.players.b;
      return { id: g.id, host: host.name, hostColor: g.players.w ? 'w' : 'b' };
    });
const pushLobby = () => io.to('lobby').emit('lobby:list', lobby());
const push = (g) => io.to(g.id).emit('game:state', publicState(g));

function finish(g) {
  const c = g.chess;
  if (c.isCheckmate()) { g.status = 'over'; g.result = { type: 'checkmate', winner: c.turn() === 'w' ? 'b' : 'w' }; }
  else if (c.isStalemate()) { g.status = 'over'; g.result = { type: 'stalemate' }; }
  else if (c.isInsufficientMaterial()) { g.status = 'over'; g.result = { type: 'insufficient' }; }
  else if (c.isThreefoldRepetition()) { g.status = 'over'; g.result = { type: 'repetition' }; }
  else if (c.isDraw()) { g.status = 'over'; g.result = { type: 'fifty-move' }; }
}

function newGame(pid, name, color, sid) {
  const c = color === 'b' || (color === 'random' && Math.random() < 0.5) ? 'b' : 'w';
  const g = { id: uid(), chess: new Chess(), status: 'waiting', result: null, created: Date.now(), players: { w: null, b: null } };
  g.players[c] = { pid, name, sid };
  games.set(g.id, g);
  return { g, color: c };
}
function seat(g, pid, name, sid) {
  for (const c of ['w', 'b']) {
    if (g.players[c]?.pid === pid) { g.players[c].sid = sid; g.players[c].name = name; return c; }
  }
  const c = !g.players.w ? 'w' : !g.players.b ? 'b' : null;
  if (!c) return null;
  g.players[c] = { pid, name, sid };
  if (g.players.w && g.players.b) g.status = 'playing';
  return c;
}

io.on('connection', (socket) => {
  socket.on('lobby:join', () => { socket.join('lobby'); socket.emit('lobby:list', lobby()); });

  socket.on('game:create', ({ pid, name, color }, cb) => {
    const { g, color: c } = newGame(pid, clean(name), color, socket.id);
    socket.join(g.id); pushLobby();
    cb?.({ id: g.id, color: c });
  });

  socket.on('game:quick', ({ pid, name }, cb) => {
    const open = [...games.values()].find((g) => g.status === 'waiting' && ![g.players.w, g.players.b].some((p) => p?.pid === pid));
    if (open) return cb?.({ id: open.id });
    const { g } = newGame(pid, clean(name), 'random', socket.id);
    socket.join(g.id); pushLobby();
    cb?.({ id: g.id });
  });

  socket.on('game:join', ({ id, pid, name }, cb) => {
    const g = games.get(id);
    if (!g) return cb?.({ error: 'Game not found. It may have been closed.' });
    const color = seat(g, pid, clean(name), socket.id);
    socket.join(id);
    cb?.({ color });
    push(g); pushLobby();
  });

  socket.on('game:move', ({ id, pid, from, to, promotion }, cb) => {
    const g = games.get(id);
    if (!g || g.status !== 'playing') return cb?.({ error: 'Game is not active.' });
    if (g.players[g.chess.turn()]?.pid !== pid) return cb?.({ error: 'Not your turn.' });
    try { g.chess.move({ from, to, promotion }); } catch { return cb?.({ error: 'Illegal move.' }); }
    finish(g); push(g); cb?.({ ok: true });
  });

  socket.on('game:resign', ({ id, pid }) => {
    const g = games.get(id);
    if (!g || g.status !== 'playing') return;
    const c = ['w', 'b'].find((k) => g.players[k]?.pid === pid);
    if (!c) return;
    g.status = 'over'; g.result = { type: 'resign', winner: c === 'w' ? 'b' : 'w' };
    push(g);
  });

  socket.on('disconnect', () => {
    for (const g of games.values()) {
      if (g.status === 'waiting' && [g.players.w, g.players.b].some((p) => p?.sid === socket.id)) games.delete(g.id);
    }
    pushLobby();
  });
});

setInterval(() => {
  for (const [id, g] of games) if (Date.now() - g.created > 6 * 3600e3) games.delete(id);
}, 600e3);

const dist = path.join(__dirname, '../client/dist');
app.use(express.static(dist));
app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html'), (e) => e && res.status(404).send('Run "npm run build" first.')));

server.listen(PORT, () => console.log(`Chess server on :${PORT}`));
