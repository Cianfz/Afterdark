import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { Room } from '../types';
import { Play, Check, X, ThumbsUp, ThumbsDown, Trophy } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export function PlayerView({ onBack }: Props) {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  
  const [room, setRoom] = useState<Room | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    socket.on('room:state_update', (r: Room) => {
      setRoom(r);
    });

    socket.on('player:error', (msg: string) => {
      setError(msg);
      setJoined(false);
    });

    socket.on('room:destroyed', () => {
      alert('A sala foi fechada pelo Host.');
      onBack();
    });

    return () => {
      socket.off('room:state_update');
      socket.off('player:error');
      socket.off('room:destroyed');
    };
  }, [onBack]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (roomCode.length !== 4 || !nickname) return;
    
    socket.emit('player:join_room', { roomId: roomCode, nickname });
    setJoined(true);
  };

  const handleAnswerChange = (cat: string, val: string) => {
    setAnswers(prev => ({ ...prev, [cat]: val }));
  };

  const handleStop = () => {
    if (room) {
      socket.emit('player:submit_answers', { roomId: room.id, answers, isStop: true });
    }
  };

  // Enviar se o host mudou o estado por tempo
  useEffect(() => {
    if (room && room.state !== 'PLAYING' && joined) {
      // Quando sai do playing (por tempo ou porque outro apertou), envia o que tem
       const me = room.players.find(p => p.id === socket.id);
       if (me && !me.hasStopped && room.state === 'VOTING' && Object.keys(answers).length > 0) {
          socket.emit('player:submit_answers', { roomId: room.id, answers, isStop: false });
       }
    }
  }, [room?.state, joined, answers, room]);


  const handleVote = (targetPlayerId: string, isValid: boolean) => {
    if (room) {
      socket.emit('player:vote', { roomId: room.id, targetPlayerId, isValid });
    }
  };

  if (!joined || !room) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center">
        <button onClick={onBack} className="absolute top-6 left-6 text-slate-400">Voltar</button>
        <div className="w-full max-w-sm space-y-6">
          <h2 className="text-3xl font-black text-center mb-8">ENTRAR NA SALA</h2>
          
          {error && <div className="bg-rose-500/20 text-rose-400 p-4 rounded-xl text-center font-bold border border-rose-500/50">{error}</div>}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-slate-400 font-bold mb-2 ml-1">Código da TV</label>
              <input 
                type="text" 
                maxLength={4}
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: BXYZ"
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-center text-3xl font-black text-white focus:border-indigo-500 focus:outline-none uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-2 ml-1">Seu Apelido</label>
              <input 
                type="text" 
                maxLength={10}
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Ex: João"
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-xl font-bold text-white focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-2xl py-4 rounded-2xl mt-4"
            >
              JOGAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  // LOBBY
  if (room.state === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Check className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-black mb-2">Você está na sala!</h2>
        <p className="text-xl text-slate-400">Olhe para a TV e aguarde o Host iniciar.</p>
      </div>
    );
  }

  // DRAW
  if (room.state === 'DRAW') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl text-slate-400 font-bold">PREPARE-SE...</h2>
      </div>
    );
  }

  // PLAYING
  if (room.state === 'PLAYING') {
    const me = room.players.find(p => p.id === socket.id);
    
    if (me?.hasStopped) {
      return (
        <div className="min-h-screen bg-indigo-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-4xl font-black text-indigo-300 mb-4">STOP!</h2>
          <p className="text-xl">Aguarde os outros jogadores...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col h-[100dvh]">
        <div className="bg-slate-800 rounded-2xl p-4 flex justify-between items-center mb-4 shrink-0 border border-slate-700">
          <div className="font-bold text-slate-400">Letra</div>
          <div className="text-4xl font-black text-indigo-400">{room.currentLetter}</div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pb-24">
          {room.categories.map(cat => (
            <div key={cat} className="space-y-2">
              <label className="block font-bold text-lg text-slate-300 ml-1">{cat}</label>
              <input
                type="text"
                value={answers[cat] || ''}
                onChange={e => handleAnswerChange(cat, e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-xl font-bold focus:border-indigo-500 focus:outline-none"
                placeholder={`Com a letra ${room.currentLetter}...`}
              />
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800">
          <button 
            onClick={handleStop}
            className="w-full bg-rose-600 active:bg-rose-700 text-white font-black text-3xl py-5 rounded-2xl shadow-xl shadow-rose-600/20"
          >
            STOP!
          </button>
        </div>
      </div>
    );
  }

  // VOTING
  if (room.state === 'VOTING') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col p-4">
        <div className="text-center mb-6 mt-4">
          <div className="text-slate-400 font-bold mb-1">Avaliando:</div>
          <div className="text-2xl font-black text-indigo-400 uppercase">{room.categories[room.currentCategoryIndex]}</div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {room.players.map(p => {
             // Não vota em si mesmo para simplificar, mas vamos mostrar a todos
             const isMe = p.id === socket.id;
             const ans = p.answers[room.categories[room.currentCategoryIndex]] || '';
             
             return (
              <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-400">{p.nickname}</span>
                  {isMe && <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded text-xs font-bold">Você</span>}
                </div>
                <div className="text-2xl font-bold break-words">{ans || <span className="text-slate-600 italic">Em branco</span>}</div>
                
                {!isMe && ans && (
                  <div className="flex gap-2 pt-2 border-t border-slate-700">
                    <button 
                      onClick={() => handleVote(p.id, false)}
                      className="flex-1 py-3 flex justify-center items-center gap-2 bg-rose-500/10 text-rose-400 rounded-xl font-bold active:bg-rose-500/30"
                    >
                      <ThumbsDown className="w-5 h-5" /> Não
                    </button>
                    <button 
                      onClick={() => handleVote(p.id, true)}
                      className="flex-1 py-3 flex justify-center items-center gap-2 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold active:bg-emerald-500/30"
                    >
                      <ThumbsUp className="w-5 h-5" /> Sim
                    </button>
                  </div>
                )}
              </div>
             )
          })}
        </div>
      </div>
    );
  }

  // SCOREBOARD
  if (room.state === 'SCOREBOARD') {
    const me = room.players.find(p => p.id === socket.id);
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl text-slate-400 font-bold mb-2">Seus Pontos</h2>
        <div className="text-8xl font-black text-indigo-400 mb-8">{me?.score}</div>
        <p className="text-xl text-slate-500">Olhe para a TV para o placar completo!</p>
      </div>
    );
  }

  // GAME_OVER
  if (room.state === 'GAME_OVER') {
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const me = room.players.find(p => p.id === socket.id);
    const isWinner = me && sorted[0]?.id === me.id;
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        {isWinner ? (
          <>
            <Trophy className="w-24 h-24 text-yellow-400 animate-bounce" />
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">VOCÊ VENCEU! 🎉</h2>
            <p className="text-xl text-slate-300">Incrível! Você é o mestre do STOP!</p>
          </>
        ) : (
          <>
            <div className="text-6xl">👏</div>
            <h2 className="text-4xl font-black text-indigo-400">FIM DE JOGO!</h2>
            <p className="text-xl text-slate-300">Bom jogo! Olhe para a TV para ver o campeão geral!</p>
          </>
        )}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl w-full max-w-xs">
          <span className="text-slate-500 text-xs font-bold uppercase block">SUA PONTUAÇÃO</span>
          <span className="text-5xl font-black text-white">{me?.score || 0} pts</span>
        </div>
      </div>
    );
  }

  return null;
}
