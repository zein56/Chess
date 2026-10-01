import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { unlock } from './sound.js';
addEventListener('pointerdown', unlock, { once: true });
createRoot(document.getElementById('root')).render(<App />);
