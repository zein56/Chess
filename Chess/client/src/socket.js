import { io } from 'socket.io-client';
export const socket = io();
export const pid = (() => {
  let p = localStorage.getItem('chess_pid');
  if (!p) { p = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2); localStorage.setItem('chess_pid', p); }
  return p;
})();
