/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import { HostView } from './components/HostView';
import { PlayerView } from './components/PlayerView';

export default function App() {
  const [view, setView] = useState<'HOME' | 'HOST' | 'PLAYER'>('HOME');

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  if (view === 'HOST') {
    return <HostView onBack={() => setView('HOME')} />;
  }

  if (view === 'PLAYER') {
    return <PlayerView onBack={() => setView('HOME')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-12 text-center">
        <div className="space-y-4">
          <h1 className="text-6xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            AFTERDARK
          </h1>
          <p className="text-xl font-extrabold text-slate-200 tracking-wider uppercase">
            Pra jogar com a Galera!
          </p>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Transforme sua TV em tabuleiro e seu Celular em controle. Sem instalar nada!
          </p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={() => setView('HOST')}
            className="w-full py-5 px-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] rounded-2xl font-black text-xl transition-all shadow-xl shadow-indigo-600/30 border border-indigo-400/20"
          >
            CRIAR SALA (TV)
          </button>
          <button 
            onClick={() => setView('PLAYER')}
            className="w-full py-5 px-6 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] border border-slate-700/60 rounded-2xl font-bold text-xl transition-all shadow-md"
          >
            ENTRAR NO JOGO (Celular)
          </button>
        </div>
      </div>
    </div>
  );
}
