const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { getRandomWord } = require('./wordBank');
const {
  COMBAT_CONFIG,
  calculateDamage,
  validateWordCompletion
} = require('./combatEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory active rooms
const rooms = new Map();

// Generate readable 5-character room code (avoiding 0/O and 1/I)
function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function createPlayerState(socketId, playerNumber) {
  return {
    id: socketId,
    playerNumber,
    ready: false,
    hp: COMBAT_CONFIG.maxHp,
    combo: 0,
    maxCombo: 0,
    totalDamageDealt: 0,
    wordsCompleted: 0,
    charsTyped: 0,
    correctChars: 0,
    startTime: 0
  };
}

io.on('connection', (socket) => {
  // 1. Create Room
  socket.on('create_room', ({ difficulty = 'medium' } = {}, callback) => {
    const roomCode = generateRoomCode();
    const player1 = createPlayerState(socket.id, 1);

    const room = {
      code: roomCode,
      difficulty,
      players: [player1],
      state: 'WAITING',
      currentWords: { 1: '', 2: '' },
      previousWords: { 1: '', 2: '' },
      wordStartedAt: { 1: 0, 2: 0 },
      matchStartTime: 0
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerNumber = 1;

    if (typeof callback === 'function') {
      callback({ success: true, roomCode, playerNumber: 1 });
    }
  });

  // 2. Join Room
  socket.on('join_room', ({ roomCode }, callback) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      return callback && callback({ success: false, message: 'Room not found' });
    }

    if (room.players.length >= 2) {
      return callback && callback({ success: false, message: 'Room is already full' });
    }

    if (room.state !== 'WAITING') {
      return callback && callback({ success: false, message: 'Match already in progress' });
    }

    const player2 = createPlayerState(socket.id, 2);
    room.players.push(player2);
    socket.join(code);
    socket.roomCode = code;
    socket.playerNumber = 2;

    // Notify room of second player
    io.to(code).emit('player_joined', {
      playersCount: 2,
      players: room.players.map(p => ({ playerNumber: p.playerNumber, ready: p.ready }))
    });

    if (typeof callback === 'function') {
      callback({ success: true, roomCode: code, playerNumber: 2 });
    }
  });

  // 3. Player Ready
  socket.on('player_ready', () => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room || room.state !== 'WAITING') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.ready = !player.ready; // toggle or set true

    io.to(code).emit('ready_state_update', {
      players: room.players.map(p => ({ playerNumber: p.playerNumber, ready: p.ready }))
    });

    // Both players ready?
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      room.state = 'COUNTDOWN';
      io.to(code).emit('countdown_start', { durationSeconds: 3 });

      // After 3-2-1 countdown, start battle
      setTimeout(() => {
        if (!rooms.has(code) || room.state !== 'COUNTDOWN') return;

        room.state = 'BATTLE';
        room.matchStartTime = Date.now();

        // Assign initial words
        const w1 = getRandomWord(room.difficulty, '', 'standard', 1);
        const w2 = getRandomWord(room.difficulty, '', 'standard', 2);
        room.currentWords[1] = w1;
        room.currentWords[2] = w2;
        room.wordStartedAt[1] = Date.now();
        room.wordStartedAt[2] = Date.now();

        io.to(code).emit('match_start', {
          words: { 1: w1, 2: w2 },
          hp: { 1: COMBAT_CONFIG.maxHp, 2: COMBAT_CONFIG.maxHp }
        });
      }, 3500);
    }
  });

  // 4. Word Completed (Combat event)
  socket.on('word_completed', (payload, callback) => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room || room.state !== 'BATTLE') return;

    const playerNum = socket.playerNumber;
    const opponentNum = playerNum === 1 ? 2 : 1;
    const player = room.players.find(p => p.playerNumber === playerNum);
    const opponent = room.players.find(p => p.playerNumber === opponentNum);

    if (!player || !opponent) return;

    const expectedWord = room.currentWords[playerNum];
    const { word, durationMs, wpm, accuracy, correctChars, totalKeystrokes } = payload;

    // Verify correct word
    if (word !== expectedWord) {
      if (typeof callback === 'function') {
        callback({ error: 'Word mismatch', currentWord: expectedWord });
      }
      return;
    }

    // Anti-cheat verification
    const validation = validateWordCompletion({
      word,
      durationMs,
      wpm,
      accuracy
    });

    if (!validation.valid) {
      console.warn(`[Anti-Cheat] Flagged socket ${socket.id} in room ${code}: ${validation.reason}`);
      if (typeof callback === 'function') {
        callback({ error: 'Anti-cheat flag: ' + validation.reason });
      }
      return;
    }

    // Update player combo and telemetry
    player.combo += 1;
    if (player.combo > player.maxCombo) {
      player.maxCombo = player.combo;
    }
    player.wordsCompleted += 1;
    player.charsTyped += (totalKeystrokes || word.length);
    player.correctChars += (correctChars || word.length);

    // Calculate damage
    const combatResult = calculateDamage({
      wpm,
      accuracy,
      combo: player.combo,
      word
    });

    const damage = combatResult.damage;
    opponent.hp = Math.max(0, opponent.hp - damage);
    player.totalDamageDealt += damage;

    // Pick next word
    room.previousWords[playerNum] = expectedWord;
    const nextWord = getRandomWord(room.difficulty, expectedWord, 'standard', playerNum);
    room.currentWords[playerNum] = nextWord;
    room.wordStartedAt[playerNum] = Date.now();

    // Attack speed: faster typing -> faster attack animation
    const attackSpeedMs = Math.max(220, Math.min(600, Math.round(500 - (wpm * 2.5))));

    // Broadcast attack event to both players
    io.to(code).emit('battle_attack', {
      attacker: playerNum,
      defender: opponentNum,
      damage,
      attackSpeedMs,
      wpm,
      accuracy,
      combo: player.combo,
      nextWord,
      hp: {
        1: room.players.find(p => p.playerNumber === 1).hp,
        2: room.players.find(p => p.playerNumber === 2).hp
      }
    });

    if (typeof callback === 'function') {
      callback({ success: true, nextWord });
    }

    // Check for match completion
    if (opponent.hp <= 0) {
      room.state = 'GAME_OVER';
      const durationSeconds = Math.round((Date.now() - room.matchStartTime) / 1000);

      const p1 = room.players.find(p => p.playerNumber === 1);
      const p2 = room.players.find(p => p.playerNumber === 2);

      const calculateFinalStats = (p) => {
        const avgWpm = durationSeconds > 0
          ? Math.round((p.correctChars / 5) / (durationSeconds / 60))
          : 0;
        const totalKeys = p.charsTyped || 1;
        const finalAcc = Math.min(100, Math.round((p.correctChars / totalKeys) * 100));
        return {
          wpm: avgWpm,
          accuracy: finalAcc,
          totalWords: p.wordsCompleted,
          maxCombo: p.maxCombo,
          totalDamage: p.totalDamageDealt
        };
      };

      io.to(code).emit('match_ended', {
        winner: playerNum,
        durationSeconds,
        stats: {
          1: calculateFinalStats(p1),
          2: calculateFinalStats(p2)
        }
      });
    }
  });

  // 5. Combo Broken Event
  socket.on('combo_broken', () => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room || room.state !== 'BATTLE') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.combo = 0;
      io.to(code).emit('player_combo_broken', { playerNumber: player.playerNumber });
    }
  });

  // 6. Rematch Request
  socket.on('request_rematch', () => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room || room.state !== 'GAME_OVER') return;

    // Reset player HP and stats
    room.players.forEach(p => {
      p.hp = COMBAT_CONFIG.maxHp;
      p.combo = 0;
      p.wordsCompleted = 0;
      p.charsTyped = 0;
      p.correctChars = 0;
      p.totalDamageDealt = 0;
      p.ready = false;
    });

    room.state = 'WAITING';
    io.to(code).emit('rematch_accepted', {
      players: room.players.map(p => ({ playerNumber: p.playerNumber, ready: false }))
    });
  });

  // 7. Disconnection
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    // Remove player
    room.players = room.players.filter(p => p.id !== socket.id);

    if (room.players.length === 0) {
      rooms.delete(code);
    } else {
      io.to(code).emit('opponent_left', {
        message: 'Opponent disconnected from the match.'
      });
      room.state = 'WAITING';
      room.players[0].ready = false;
    }
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`TypeFight Server running at http://localhost:${PORT}`);
  console.log(`Mode: 1v1 Pencil-Sketch Typing Battle`);
  console.log(`===============================================`);
});
