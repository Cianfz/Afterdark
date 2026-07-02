import React, { useEffect, useState } from 'react';
import { socket } from '../socket';
import { Room, DEFAULT_PRESET_CATEGORIES } from '../types';
import { Users, Timer, Check, X, ArrowRight, Play, Trophy, Settings, Plus, RotateCcw } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export function HostView({ onBack }: Props) {
  const [room, setRoom] = useState<Room | null>(null);
  const [timer, setTimer] = useState(180);

  // Configuration States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...DEFAULT_PRESET_CATEGORIES]);
  const [customCategory, setCustomCategory] = useState('');
  const [totalRounds, setTotalRounds] = useState(3);

  useEffect(() => {
    const createRoom = () => socket.emit('host:create_room');

    if (socket.connected) {
      createRoom();
    }
    socket.on('connect', createRoom);

    socket.on('host:room_created', (r: Room) => {
      setRoom(r);
      // Initialize configuration from created room
      setSelectedCategories(r.categories || [...DEFAULT_PRESET_CATEGORIES]);
      setTotalRounds(r.totalRounds || 3);
    });

    socket.on('room:state_update', (r: Room) => {
      setRoom(r);
    });

    socket.on('room:timer_update', (t: number) => {
      setTimer(t);
    });

    return () => {
      socket.off('connect', createRoom);
      socket.off('host:room_created');
      socket.off('room:state_update');
      socket.off('room:timer_update');
    };
  }, []);

  // Update room settings on server whenever they change in Host local state
  useEffect(() => {
    if (room && room.state === 'LOBBY') {
      socket.emit('host:update_settings', {
        roomId: room.id,
        categories: selectedCategories,
        totalRounds
      });
    }
  }, [selectedCategories, totalRounds, room?.id, room?.state]);

  const handleToggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCategory.trim();
    if (!trimmed) return;
    if (selectedCategories.includes(trimmed)) {
      setCustomCategory('');
      return;
    }
    setSelectedCategories([...selectedCategories, trimmed]);
    setCustomCategory('');
  };

  const handleStartDraw = () => {
    if (room) {
      socket.emit('host:start_draw', room.id);
    }
  };

  const handleNextRound = () => {
    if (room) {
      socket.emit('host:next_round', room.id);
    }
  };

  const handleFinishGame = () => {
    if (room) {
      socket.emit('host:finish_game', room.id);
    }
  };

  const handleNextCategory = () => {
    if (room) {
      socket.emit('host:next_category', room.id);
    }
  };

  const handleBackToLobby = () => {
    if (room) {
      socket.emit('host:back_to_lobby', room.id);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-xl font-bold tracking-wider text-slate-400">CRIANDO SALA NO AFTERDARK...</p>
      </div>
    );
  }

  // Find overall highest score for final scoreboard
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* HEADER FIXO */}
      <div className="absolute top-6 left-6 flex items-center gap-4 z-10">
        <button 
          onClick={onBack} 
          className="bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold tracking-wider transition-all"
        >
          Voltar ao Início
        </button>
      </div>

      {room.state === 'LOBBY' && (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 my-8">
          {/* LEFT SIDE: INSTRUÇÃO DE ENTRADA & JOGADORES */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/40 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-sm space-y-8">
            <div className="text-center lg:text-left space-y-4">
              <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">
                AFTERDARK
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                Conecte seu celular para usar como controle!
              </p>
              
              <div className="py-6 bg-slate-900/80 border border-slate-800 rounded-2xl text-center shadow-inner">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-1">CÓDIGO DA SALA</span>
                <span className="text-7xl font-black text-indigo-400 tracking-[0.1em] font-mono block">
                  {room.id}
                </span>
              </div>
            </div>

            {/* JOGADORES CONECTADOS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Jogadores Conectados</span>
                </div>
                <span className="bg-indigo-500/10 text-indigo-400 font-black px-3 py-1 rounded-full text-sm">
                  {room.players.length} / 6
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 min-h-[120px] content-start">
                {room.players.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-6 text-slate-500 text-sm italic">
                    <span className="animate-pulse mb-1">Aguardando conexões...</span>
                    <span>Digite o código acima no celular</span>
                  </div>
                ) : (
                  room.players.map(p => (
                    <div 
                      key={p.id} 
                      className="bg-slate-900/80 border border-slate-800/60 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      <span className="font-extrabold text-slate-200 truncate">{p.nickname}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* INICIAR PARTIDA BOTÃO */}
            <div>
              {room.players.length > 0 ? (
                <button 
                  onClick={handleStartDraw}
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-2xl text-2xl font-black tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-white" />
                  INICIAR JOGO
                </button>
              ) : (
                <div className="text-center py-4 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl text-slate-500 font-bold text-sm">
                  Conecte pelo menos 1 jogador para iniciar
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: CONFIGURAÇÃO DE CATEGORIAS & RODADAS */}
          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-sm flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-xl font-black tracking-wide text-slate-200">
                <Settings className="w-6 h-6 text-pink-500" />
                <h2>CONFIGURAR PARTIDA</h2>
              </div>

              {/* SELEÇÃO DE RODADAS */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Número de Rodadas</label>
                <div className="flex gap-2">
                  {[1, 3, 5, 7, 10].map(rNum => (
                    <button
                      key={rNum}
                      onClick={() => setTotalRounds(rNum)}
                      className={`flex-1 py-3 px-4 rounded-xl text-lg font-black transition-all ${
                        totalRounds === rNum 
                          ? 'bg-pink-600 border border-pink-400 text-white shadow-lg shadow-pink-600/20' 
                          : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {rNum} {rNum === 1 ? 'Rodada' : 'Rodadas'}
                    </button>
                  ))}
                </div>
              </div>

              {/* SELEÇÃO DE CAMPOS (CATEGORIAS) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Campos para Preencher</label>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                    {selectedCategories.length} selecionados
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                  {/* Presets */}
                  {DEFAULT_PRESET_CATEGORIES.map(preset => (
                    <button
                      key={preset}
                      onClick={() => handleToggleCategory(preset)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between text-sm font-extrabold transition-all ${
                        selectedCategories.includes(preset)
                          ? 'bg-indigo-600/20 border-indigo-500/80 text-indigo-200'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{preset}</span>
                      {selectedCategories.includes(preset) ? (
                        <div className="w-5 h-5 bg-indigo-500 rounded-md flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-slate-900 border border-slate-700 rounded-md"></div>
                      )}
                    </button>
                  ))}

                  {/* Custom ones if any are added and not part of presets */}
                  {selectedCategories.filter(c => !DEFAULT_PRESET_CATEGORIES.includes(c)).map(custom => (
                    <button
                      key={custom}
                      onClick={() => handleToggleCategory(custom)}
                      className="p-3 rounded-xl border text-left flex items-center justify-between text-sm font-extrabold transition-all bg-purple-600/20 border-purple-500/80 text-purple-200"
                    >
                      <span className="truncate">{custom} (Criado)</span>
                      <X className="w-4 h-4 text-purple-400" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategories(selectedCategories.filter(c => c !== custom));
                      }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* ADICIONAR CAMPO PERSONALIZADO */}
              <form onSubmit={handleAddCustomCategory} className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Criar Campo Personalizado</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={25}
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    placeholder="Ex: Comida, Cor, Profissão..."
                    className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500 hover:text-white text-indigo-400 rounded-xl px-4 flex items-center justify-center transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {room.state === 'DRAW' && (
        <div className="text-center transition-all duration-500 scale-100 opacity-100 space-y-6 z-10">
          <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-6 py-2 rounded-full inline-block font-black text-sm tracking-widest uppercase">
            RODADA {room.currentRound} DE {room.totalRounds}
          </div>
          <h2 className="text-4xl text-slate-400 font-bold tracking-widest">A LETRA É...</h2>
          <div className="text-[16rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-500 drop-shadow-[0_0_60px_rgba(139,92,246,0.4)]">
            {room.currentLetter}
          </div>
        </div>
      )}

      {room.state === 'PLAYING' && (
        <div className="w-full max-w-5xl flex flex-col items-center z-10">
          <div className="flex items-center justify-between w-full mb-12">
            <div className="bg-slate-900/80 border border-slate-800/80 px-8 py-4 rounded-2xl flex items-center gap-6">
              <div>
                <span className="text-xs text-slate-500 font-black uppercase block">RODADA</span>
                <span className="text-2xl font-black text-slate-300">{room.currentRound} / {room.totalRounds}</span>
              </div>
              <div className="w-px h-8 bg-slate-800"></div>
              <div>
                <span className="text-xs text-slate-500 font-black uppercase block">LETRA ATUAL</span>
                <span className="text-4xl font-black text-indigo-400 leading-none">{room.currentLetter}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center bg-slate-900/80 border border-slate-800/80 px-6 py-3 rounded-2xl">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-sm tracking-wider uppercase mb-1">
                <Timer className="w-4 h-4" />
                <span>Tempo</span>
              </div>
              <div className="text-4xl font-mono font-bold text-slate-200">
                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full mb-12">
            {room.players.map(p => (
              <div 
                key={p.id} 
                className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                  p.hasStopped 
                    ? 'bg-rose-950/40 border-rose-500/80 text-rose-200 shadow-lg shadow-rose-950/20' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-black text-white">{p.nickname}</span>
                  {p.hasStopped ? (
                    <span className="bg-rose-600 text-white font-black px-2.5 py-1 rounded-md text-xs animate-bounce">
                      STOP!
                    </span>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-indigo-500/40 animate-ping"></div>
                  )}
                </div>
                <div className="text-sm">
                  {p.hasStopped ? 'Finalizou a rodada!' : 'Preenchendo campos...'}
                </div>
              </div>
            ))}
          </div>

          {room.players.some(p => p.hasStopped) && (
            <div className="text-center space-y-4 animate-in zoom-in duration-300">
              <div className="text-5xl font-black text-rose-500 tracking-wider uppercase drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                STOOOOP!
              </div>
              <p className="text-xl text-slate-400 font-semibold">Prepara o celular para votar nas respostas!</p>
            </div>
          )}
        </div>
      )}

      {room.state === 'VOTING' && (
        <div className="w-full max-w-5xl flex flex-col items-center z-10">
          <div className="flex items-center justify-between w-full mb-8">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-sm">AVALIAÇÃO</span>
              <div className="bg-pink-500/20 border border-pink-500/40 px-6 py-2 rounded-full">
                <span className="text-pink-400 font-black tracking-wider uppercase">
                  {room.categories[room.currentCategoryIndex]}
                </span>
              </div>
            </div>
            <div className="text-slate-400 text-sm font-bold">
              Campo {room.currentCategoryIndex + 1} de {room.categories.length}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-12">
            {room.players.map(p => {
              const answerText = p.answers[room.categories[room.currentCategoryIndex]];
              const startsWithLetter = answerText ? answerText.trim().toUpperCase().startsWith(room.currentLetter) : false;
              
              return (
                <div key={p.id} className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 text-center flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-slate-950 px-2.5 py-1 rounded-md text-xs font-bold text-slate-500">
                    {p.nickname}
                  </div>
                  
                  <div className="pt-4 pb-2">
                    {answerText ? (
                      <div className="space-y-2">
                        <div className="text-3xl font-black text-white break-words px-2">
                          "{answerText}"
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                          {startsWithLetter ? (
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Inicia com '{room.currentLetter}'</span>
                          ) : (
                            <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Não inicia com '{room.currentLetter}'</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-slate-600 italic">
                        Sem resposta
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between w-full bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl">
            <p className="text-lg text-slate-400 font-bold">
              Os outros jogadores votam Sim/Não no celular para aprovar cada resposta!
            </p>
            <button 
              onClick={handleNextCategory}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-4 rounded-xl text-lg font-black tracking-wide hover:from-indigo-400 hover:to-purple-400 transition-all shadow-md active:scale-95"
            >
              {room.currentCategoryIndex < room.categories.length - 1 ? (
                <>
                  <span>Próximo Campo</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span>Ver Placar da Rodada</span>
                  <Trophy className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {room.state === 'SCOREBOARD' && (
        <div className="w-full max-w-4xl text-center z-10 space-y-10 my-6">
          <div className="space-y-2">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce" />
            <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-6 py-1.5 rounded-full inline-block font-black text-xs tracking-widest uppercase">
              FIM DA RODADA {room.currentRound} DE {room.totalRounds}
            </div>
            <h2 className="text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500">
              PLACAR DA RODADA
            </h2>
          </div>
          
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            {sortedPlayers.map((p, i) => {
              const isLeader = i === 0;
              return (
                <div 
                  key={p.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                    isLeader 
                      ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-2 border-yellow-500/40' 
                      : 'bg-slate-950/80 border border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <span className={`text-3xl font-black ${isLeader ? 'text-yellow-400' : 'text-slate-500'}`}>
                      #{i + 1}
                    </span>
                    <span className="text-2xl font-extrabold text-white">{p.nickname}</span>
                  </div>
                  <div className="text-3xl font-black text-indigo-400">{p.score} pts</div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 justify-center">
            {room.currentRound < room.totalRounds ? (
              <button 
                onClick={handleNextRound}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl text-xl font-black tracking-wide shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                PRÓXIMA RODADA ({room.currentRound + 1}/{room.totalRounds})
              </button>
            ) : (
              <button 
                onClick={handleFinishGame}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-12 py-5 rounded-2xl text-2xl font-black tracking-wide shadow-lg shadow-pink-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                VER GRANDE CAMPEÃO! 👑
              </button>
            )}
          </div>
        </div>
      )}

      {room.state === 'GAME_OVER' && (
        <div className="w-full max-w-4xl text-center z-10 space-y-12 my-6">
          <div className="space-y-4">
            <div className="relative inline-block">
              <Trophy className="w-32 h-32 text-yellow-400 mx-auto drop-shadow-[0_0_40px_rgba(234,179,8,0.5)] animate-bounce" />
              <div className="absolute -top-2 -right-2 text-4xl">👑</div>
            </div>
            
            <div className="space-y-1">
              <span className="text-sm text-slate-400 font-extrabold uppercase tracking-widest block">VITÓRIA DO AFTERDARK!</span>
              <h1 className="text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">
                O GRANDE CAMPEÃO
              </h1>
            </div>

            {winner && (
              <div className="inline-block bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-2 border-indigo-500/40 px-12 py-6 rounded-3xl backdrop-blur-md">
                <span className="text-4xl font-black text-white">{winner.nickname}</span>
                <span className="text-3xl font-black text-pink-400 block mt-2">{winner.score} pontos</span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-wider text-left pl-2">Classificação Geral</h3>
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-900">
                <div className="flex items-center gap-6">
                  <span className="text-xl font-black text-slate-500">#{i + 1}</span>
                  <span className="text-lg font-bold text-white">{p.nickname}</span>
                </div>
                <div className="text-xl font-bold text-slate-300">{p.score} pts</div>
              </div>
            ))}
          </div>

          <div>
            <button 
              onClick={handleBackToLobby}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all flex items-center gap-2 mx-auto"
            >
              <RotateCcw className="w-5 h-5" />
              Jogar Novamente (Voltar ao Lobby)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

