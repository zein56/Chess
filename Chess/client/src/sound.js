// Synthesized sound effects (no audio files needed) + haptics.
const AC = window.AudioContext || window.webkitAudioContext;
let ctx, noise, muted = localStorage.getItem('chess_muted') === '1';

export const isMuted = () => muted;
export function setMuted(m) { muted = m; localStorage.setItem('chess_muted', m ? '1' : '0'); }
export function unlock() { try { if (!ctx && AC) ctx = new AC(); if (ctx && ctx.state === 'suspended') ctx.resume(); } catch {} return ctx; }

function noiseBuf() {
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}
function tone(f, t, dur, { type = 'sine', gain = 0.2, to } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function click(t, { gain = 0.5, freq = 1000, dur = 0.06 } = {}) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.3;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(ctx.destination); s.start(t); s.stop(t + dur + 0.02);
}
const knock = (t, g = 1) => { click(t, { gain: 0.55 * g, freq: 900 }); tone(170, t, 0.09, { gain: 0.3 * g, to: 85 }); };

const SOUNDS = {
  move: (t) => knock(t),
  capture: (t) => { click(t, { gain: 0.9, freq: 700 }); tone(130, t, 0.16, { gain: 0.45, to: 55 }); knock(t + 0.045, 0.7); },
  castle: (t) => { knock(t); knock(t + 0.13, 0.8); },
  check: (t) => { knock(t); tone(740, t + 0.07, 0.14, { type: 'triangle', gain: 0.16 }); tone(988, t + 0.14, 0.18, { type: 'triangle', gain: 0.14 }); },
  promote: (t) => { knock(t); [523, 659, 784, 1046].forEach((f, i) => tone(f, t + 0.06 + i * 0.07, 0.14, { type: 'triangle', gain: 0.14 })); },
  start: (t) => { tone(392, t, 0.16, { type: 'triangle', gain: 0.16 }); tone(587, t + 0.12, 0.28, { type: 'triangle', gain: 0.16 }); },
  end: (t) => [523, 440, 349, 262].forEach((f, i) => tone(f, t + i * 0.16, 0.34, { type: 'triangle', gain: 0.16 })),
  illegal: (t) => tone(150, t, 0.14, { type: 'square', gain: 0.07, to: 110 }),
};
const HAPTIC = { move: 8, capture: 18, castle: 14, check: [14, 40, 14], promote: 20, end: [30, 60, 30], illegal: 25, start: 10 };

export function play(name) {
  if (muted) return;
  try { navigator.vibrate?.(HAPTIC[name] || 0); } catch {}
  if (!unlock()) return;
  SOUNDS[name]?.(ctx.currentTime + 0.005);
}
export function soundForSan(san = '') {
  if (san.includes('#') || san.includes('+')) return 'check';
  if (san.includes('=')) return 'promote';
  if (san.startsWith('O-O')) return 'castle';
  if (san.includes('x')) return 'capture';
  return 'move';
}
