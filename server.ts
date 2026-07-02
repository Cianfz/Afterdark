import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

import { Room, Player, DEFAULT_PRESET_CATEGORIES, GameState } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    }
  });

  // State
  const rooms = new Map<string, Room>();

  // Helpers
  const generateRoomId = () => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 4; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const getRandomLetter = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters.charAt(Math.floor(Math.random() * letters.length));
  };

  // Socket.io Events
  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    // ===============================
    // HOST EVENTS
    // ===============================

    // Criar sala (Host)
    socket.on('host:create_room', () => {
      let roomId = generateRoomId();
      while (rooms.has(roomId)) {
        roomId = generateRoomId();
      }

      const newRoom: Room = {
        id: roomId,
        hostId: socket.id,
        state: 'LOBBY',
        players: [],
        currentLetter: '',
        timer: 180,
        currentCategoryIndex: 0,
        categories: [...DEFAULT_PRESET_CATEGORIES],
        totalRounds: 3,
        currentRound: 1,
      };

      rooms.set(roomId, newRoom);
      socket.join(roomId);
      
      // Envia o ID da sala e estado inicial para a TV (Host)
      socket.emit('host:room_created', newRoom);
    });

    // Atualizar Configurações (Host)
    socket.on('host:update_settings', ({ roomId, categories, totalRounds }) => {
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        room.categories = categories;
        room.totalRounds = Number(totalRounds);
        io.to(roomId).emit('room:state_update', room);
      }
    });

    // Iniciar Sorteio (Host)
    socket.on('host:start_draw', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id && room.players.length > 0) {
        room.state = 'DRAW';
        room.currentLetter = getRandomLetter();
        io.to(roomId).emit('room:state_update', room);
        
        // Simular os 3 segundos de sorteio animado
        // Iniciar Gameplay imediatamente após o sorteio
        setTimeout(() => {
          const r = rooms.get(roomId);
          if (!r || r.state !== 'DRAW') return;
          r.state = 'PLAYING';
          r.timer = 180;
          
          // Reset player answers for the new round
          r.players.forEach(p => {
            p.answers = {};
            p.hasStopped = false;
          });

          io.to(roomId).emit('room:state_update', r);
          
          // Timer logic
          const interval = setInterval(() => {
            const currentR = rooms.get(roomId);
            if (!currentR || currentR.state !== 'PLAYING') {
              clearInterval(interval);
              return;
            }
            if (currentR.timer > 0) {
              currentR.timer -= 1;
              io.to(roomId).emit('room:timer_update', currentR.timer);
            } else {
              clearInterval(interval);
              endRound(roomId);
            }
          }, 1000);
          
        }, 3000); // 3 seconds drawing animation
      }
    });

    // Ir para próxima rodada (Host)
    socket.on('host:next_round', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id && room.currentRound < room.totalRounds) {
        room.currentRound++;
        room.currentCategoryIndex = 0;
        room.timer = 180;
        room.state = 'DRAW';
        room.currentLetter = getRandomLetter();
        io.to(roomId).emit('room:state_update', room);

        // Iniciar Gameplay após sorteio de 3 segundos
        setTimeout(() => {
          const r = rooms.get(roomId);
          if (!r || r.state !== 'DRAW') return;
          r.state = 'PLAYING';
          r.timer = 180;
          r.players.forEach(p => {
            p.answers = {};
            p.hasStopped = false;
          });
          io.to(roomId).emit('room:state_update', r);

          // Timer logic
          const interval = setInterval(() => {
            const currentR = rooms.get(roomId);
            if (!currentR || currentR.state !== 'PLAYING') {
              clearInterval(interval);
              return;
            }
            if (currentR.timer > 0) {
              currentR.timer -= 1;
              io.to(roomId).emit('room:timer_update', currentR.timer);
            } else {
              clearInterval(interval);
              endRound(roomId);
            }
          }, 1000);
        }, 3000);
      }
    });

    // Finalizar o Jogo - Ir para o Placar Final (Host)
    socket.on('host:finish_game', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        room.state = 'GAME_OVER';
        io.to(roomId).emit('room:state_update', room);
      }
    });

    // Próxima categoria na Votação (Host)
    socket.on('host:next_category', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        room.currentCategoryIndex++;
        if (room.currentCategoryIndex >= room.categories.length) {
          // Ir para placar do fim de rodada
          room.state = 'SCOREBOARD';
        }
        io.to(roomId).emit('room:state_update', room);
      }
    });

    // Voltar para Lobby / Reiniciar Tudo (Host)
    socket.on('host:back_to_lobby', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        room.state = 'LOBBY';
        room.currentLetter = '';
        room.currentCategoryIndex = 0;
        room.timer = 180;
        room.currentRound = 1;
        room.players.forEach(p => {
          p.answers = {};
          p.hasStopped = false;
          p.score = 0;
        });
        io.to(roomId).emit('room:state_update', room);
      }
    });


    // ===============================
    // PLAYER EVENTS
    // ===============================

    // Entrar na sala (Player)
    socket.on('player:join_room', ({ roomId, nickname }) => {
      roomId = roomId.toUpperCase();
      const room = rooms.get(roomId);
      
      if (!room) {
        socket.emit('player:error', 'Sala não encontrada.');
        return;
      }
      if (room.state !== 'LOBBY') {
        socket.emit('player:error', 'O jogo já começou.');
        return;
      }
      if (room.players.length >= 6) {
        socket.emit('player:error', 'A sala está cheia (máx 6 jogadores).');
        return;
      }

      const newPlayer: Player = {
        id: socket.id,
        nickname: nickname.substring(0, 10), // Limit name size
        score: 0,
        answers: {},
        hasStopped: false,
      };

      room.players.push(newPlayer);
      socket.join(roomId);
      
      // Notifica todos na sala (incluindo o Host) sobre a nova lista de jogadores
      io.to(roomId).emit('room:state_update', room);
    });

    // Enviar Respostas (Player clicou em STOP ou tempo acabou)
    socket.on('player:submit_answers', ({ roomId, answers, isStop }) => {
      const room = rooms.get(roomId);
      if (!room || room.state !== 'PLAYING') return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.answers = answers;
        player.hasStopped = isStop;

        if (isStop) {
          // Se alguém apertou STOP, finaliza a rodada
          endRound(roomId);
        } else {
          io.to(roomId).emit('room:state_update', room);
        }
      }
    });

    // Votar em uma resposta (Player)
    socket.on('player:vote', ({ roomId, targetPlayerId, isValid }) => {
      const room = rooms.get(roomId);
      if (!room || room.state !== 'VOTING') return;
      
      // No MVP, vamos apenas computar os pontos instantaneamente
      // Aprovar = +10 pontos
      if (isValid) {
        const targetPlayer = room.players.find(p => p.id === targetPlayerId);
        if (targetPlayer) {
          targetPlayer.score += 10;
        }
      }
      
      // Notificar host para atualizar a UI
      io.to(room.hostId).emit('host:vote_received', { targetPlayerId, isValid });
    });


    // ===============================
    // DISCONNECT
    // ===============================
    socket.on('disconnect', () => {
      console.log('Disconnected:', socket.id);
      // Remove player from room or destroy room if host leaves
      for (const [roomId, room] of rooms.entries()) {
        if (room.hostId === socket.id) {
          rooms.delete(roomId);
          io.to(roomId).emit('room:destroyed');
        } else {
          const initialLen = room.players.length;
          room.players = room.players.filter(p => p.id !== socket.id);
          if (room.players.length !== initialLen) {
            io.to(roomId).emit('room:state_update', room);
          }
        }
      }
    });
  });

  const endRound = (roomId: string) => {
    const room = rooms.get(roomId);
    if (room && room.state === 'PLAYING') {
      room.state = 'VOTING';
      room.currentCategoryIndex = 0;
      io.to(roomId).emit('room:state_update', room);
    }
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
