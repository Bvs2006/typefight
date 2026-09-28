// Main Coordinator and State Machine for TypeFight

class GameManager {
  constructor() {
    this.canvas = document.getElementById('battle-canvas');
    this.renderer = new window.SketchRenderer(this.canvas);
    this.typing = window.typingManager;
    this.combat = window.combatManager;
    this.words = window.wordManager;
    this.audio = window.audioManager;
    this.network = window.networkManager;
    this.ui = window.uiManager;
    this.ai = new window.AIOpponent(this.typing);

    // Current game configuration
    this.currentState = 'MAIN_MENU';
    this.gameMode = 'ai'; // 'ai', 'split', 'online'
    this.aiDifficulty = 'normal';
    this.onlinePlayerNum = 1;
    this.battleActive = false;
    this.matchStartTime = 0;

    // Player HP
    this.hp = { 1: 100, 2: 100 };
    this.damageDealt = { 1: 0, 2: 0 };

    this.init();
  }

  init() {
    this.setupRenderLoop();
    this.setupButtonListeners();
    this.setupNetworkCallbacks();
    this.setupTypingCallbacks();
    this.setupAiCallbacks();

    // Start on Main Menu
    this.setState('MAIN_MENU');
  }

  setupRenderLoop() {
    const loop = () => {
      this.renderer.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  setState(newState) {
    this.currentState = newState;
    console.log(`[GameManager] State -> ${newState}`);

    switch (newState) {
      case 'MAIN_MENU':
        this.battleActive = false;
        this.typing.stop();
        this.ai.stop();
        this.renderer.resetFighters();
        this.ui.showScreen('mainMenu');
        this.ui.hideModal('gameOverModal');
        break;

      case 'OFFLINE_MENU':
        this.ui.showScreen('offlineMenu');
        break;

      case 'ONLINE_MENU':
        this.ui.showScreen('onlineMenu');
        break;

      case 'ROOM_WAITING':
        this.ui.showScreen('roomWaiting');
        break;

      case 'BATTLE':
        this.ui.showScreen('battleHud');
        this.typing.start();
        if (this.gameMode === 'ai') {
          this.ai.start();
        }
        break;

      case 'GAME_OVER':
        this.battleActive = false;
        this.typing.stop();
        this.ai.stop();
        break;
    }
  }

  setupButtonListeners() {
    // Audio unlock on first user gesture
    window.addEventListener('pointerdown', () => this.audio.ensureContext(), { once: true });
    window.addEventListener('keydown', () => this.audio.ensureContext(), { once: true });

    // Main Menu Buttons
    document.getElementById('btn-menu-offline').addEventListener('click', () => {
      this.audio.playWordComplete();
      this.setState('OFFLINE_MENU');
    });

    document.getElementById('btn-menu-online').addEventListener('click', () => {
      this.audio.playWordComplete();
      this.setState('ONLINE_MENU');
    });

    document.getElementById('btn-menu-howto').addEventListener('click', () => {
      this.audio.playWordComplete();
      this.ui.showModal('howToPlayModal');
    });

    document.getElementById('btn-menu-settings').addEventListener('click', () => {
      this.audio.playWordComplete();
      this.ui.showModal('settingsModal');
    });

    // Close Modals
    document.getElementById('btn-close-howto').addEventListener('click', () => {
      this.ui.hideModal('howToPlayModal');
    });
    document.getElementById('btn-close-settings').addEventListener('click', () => {
      this.ui.hideModal('settingsModal');
    });

    // Back to Main Menu
    document.getElementById('btn-back-offline').addEventListener('click', () => {
      this.setState('MAIN_MENU');
    });
    document.getElementById('btn-back-online').addEventListener('click', () => {
      this.setState('MAIN_MENU');
    });

    // Offline Mode Choices
    document.querySelectorAll('.btn-ai-start').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const diff = e.target.getAttribute('data-diff') || 'normal';
        this.startOfflineAiBattle(diff);
      });
    });

    document.getElementById('btn-start-split').addEventListener('click', () => {
      this.startOfflineSplitBattle();
    });

    // Online Mode Buttons
    document.getElementById('btn-create-room').addEventListener('click', async () => {
      this.audio.playWordComplete();
      const res = await this.network.createRoom('medium');
      if (res && res.success) {
        this.onlinePlayerNum = 1;
        document.getElementById('display-room-code').textContent = res.roomCode;
        document.getElementById('room-status-text').textContent = 'Waiting for opponent to enter code...';
        this.updateRoomReadyUI([{ playerNumber: 1, ready: false }]);
        this.setState('ROOM_WAITING');
      }
    });

    document.getElementById('btn-join-room').addEventListener('click', async () => {
      const codeInput = document.getElementById('input-room-code');
      const code = (codeInput.value || '').trim();
      if (!code) {
        alert('Please enter a room code.');
        return;
      }
      this.audio.playWordComplete();
      const res = await this.network.joinRoom(code);
      if (res && res.success) {
        this.onlinePlayerNum = 2;
        document.getElementById('display-room-code').textContent = res.roomCode;
        document.getElementById('room-status-text').textContent = 'Connected! Click READY UP when prepared.';
        this.setState('ROOM_WAITING');
      } else {
        alert(res.message || 'Could not join room.');
      }
    });

    document.getElementById('btn-copy-code').addEventListener('click', () => {
      const code = document.getElementById('display-room-code').textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
        const copyBtn = document.getElementById('btn-copy-code');
        copyBtn.textContent = 'COPIED!';
        setTimeout(() => copyBtn.textContent = 'COPY CODE', 1500);
      }
    });

    document.getElementById('btn-ready-up').addEventListener('click', () => {
      this.audio.playWordComplete();
      this.network.sendReady();
    });

    document.getElementById('btn-leave-room').addEventListener('click', () => {
      window.location.reload();
    });

    // Game Over Buttons
    document.getElementById('btn-rematch').addEventListener('click', () => {
      this.audio.playWordComplete();
      this.ui.hideModal('gameOverModal');
      if (this.gameMode === 'online') {
        this.network.requestRematch();
      } else if (this.gameMode === 'split') {
        this.startOfflineSplitBattle();
      } else {
        this.startOfflineAiBattle(this.aiDifficulty);
      }
    });

    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
      this.setState('MAIN_MENU');
    });

    // Settings Controls
    const volSlider = document.getElementById('setting-volume');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        this.audio.setVolume(parseFloat(e.target.value));
      });
    }

    const muteBtn = document.getElementById('btn-toggle-sound');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        muteBtn.textContent = isMuted ? 'UNMUTE SOUND' : 'MUTE SOUND';
      });
    }
  }

  // --- Offline Mode: Player vs AI ---
  startOfflineAiBattle(difficulty = 'normal') {
    this.gameMode = 'ai';
    this.aiDifficulty = difficulty;
    this.ai.setDifficulty(difficulty);
    this.typing.setMode('single');

    this.renderer.fighters[1].name = 'YOU';
    this.renderer.fighters[2].name = `AI (${difficulty.toUpperCase()})`;

    this.resetBattleState();

    // Assign initial words
    const w1 = this.words.getWord(difficulty, 'standard', 1);
    const w2 = this.words.getWord(difficulty, 'standard', 2);
    this.typing.sessions[1].setWord(w1);
    this.typing.sessions[2].setWord(w2);
    this.typing.updateDisplay(1);
    this.typing.updateDisplay(2);

    this.ui.startCountdown(() => {
      this.battleActive = true;
      this.matchStartTime = performance.now();
      this.setState('BATTLE');
    });
  }

  // --- Offline Mode: Same-Keyboard Split PvP ---
  startOfflineSplitBattle() {
    this.gameMode = 'split';
    this.typing.setMode('split');

    this.renderer.fighters[1].name = 'P1 (LEFT KEYS)';
    this.renderer.fighters[2].name = 'P2 (RIGHT KEYS)';

    this.resetBattleState();

    // Assign left and right partition words
    const w1 = this.words.getWord('medium', 'split', 1);
    const w2 = this.words.getWord('medium', 'split', 2);
    this.typing.sessions[1].setWord(w1);
    this.typing.sessions[2].setWord(w2);
    this.typing.updateDisplay(1);
    this.typing.updateDisplay(2);

    this.ui.startCountdown(() => {
      this.battleActive = true;
      this.matchStartTime = performance.now();
      this.setState('BATTLE');
    });
  }

  resetBattleState() {
    this.hp = { 1: 100, 2: 100 };
    this.damageDealt = { 1: 0, 2: 0 };
    this.typing.reset();
    this.renderer.resetFighters();
    this.words.reset();
  }

  // --- Word Completion & Attack Handling ---
  setupTypingCallbacks() {
    this.typing.onWordCompleted = (payload) => {
      if (!this.battleActive) return;

      if (this.gameMode === 'online') {
        // Send to authoritative server
        this.network.sendWordCompleted({
          word: payload.word,
          durationMs: payload.durationMs,
          wpm: payload.wpm,
          accuracy: payload.accuracy,
          combo: payload.combo,
          correctChars: payload.correctChars,
          totalKeystrokes: payload.totalKeystrokes
        });
      } else {
        // Offline combat processing
        this.processOfflineAttack(payload.playerNumber, payload);
      }
    };

    this.typing.onComboBroken = (playerNum) => {
      this.ui.showComboAlert(playerNum, 'COMBO BROKEN!');
      if (this.gameMode === 'online') {
        this.network.sendComboBroken();
      }
    };
  }

  setupAiCallbacks() {
    this.ai.onWordCompleted = (payload) => {
      if (!this.battleActive) return;
      this.processOfflineAttack(2, payload);
    };

    this.ai.onComboBroken = (playerNum) => {
      this.ui.showComboAlert(playerNum, 'COMBO BROKEN!');
    };
  }

  processOfflineAttack(attackerNum, payload) {
    const defenderNum = attackerNum === 1 ? 2 : 1;

    // Calculate combat damage
    const combat = this.combat.calculateDamage({
      wpm: payload.wpm,
      accuracy: payload.accuracy,
      combo: payload.combo,
      word: payload.word
    });

    const damage = combat.damage;
    this.hp[defenderNum] = Math.max(0, this.hp[defenderNum] - damage);
    this.damageDealt[attackerNum] += damage;

    this.renderer.fighters[defenderNum].hp = this.hp[defenderNum];

    // Audio SFX
    this.audio.playWordComplete();
    this.audio.playSwish();

    // Trigger visual attack and impact
    const attackSpeed = this.combat.getAttackDuration(payload.wpm);
    this.renderer.triggerAttack(attackerNum, attackSpeed);

    setTimeout(() => {
      this.audio.playHit();
      if (payload.combo >= 2) {
        this.audio.playCombo(payload.combo);
      }
      this.renderer.triggerHit(defenderNum, damage, payload.combo);
    }, attackSpeed * 0.45);

    // Give next word
    const nextMode = this.gameMode === 'split' ? 'split' : 'standard';
    const nextWord = this.words.getWord(this.aiDifficulty || 'medium', nextMode, attackerNum);
    this.typing.sessions[attackerNum].setWord(nextWord);
    this.typing.updateDisplay(attackerNum);

    // If opponent was AI, tell AI to resume
    if (attackerNum === 2 && this.gameMode === 'ai' && this.hp[1] > 0 && this.hp[2] > 0) {
      this.ai.scheduleNextKeystroke();
    }

    // Check for Victory
    if (this.hp[defenderNum] <= 0) {
      this.finishBattle(attackerNum);
    }
  }

  finishBattle(winnerNum) {
    this.battleActive = false;
    this.renderer.setVictory(winnerNum);
    const durationSeconds = Math.round((performance.now() - this.matchStartTime) / 1000);

    const s1 = this.typing.sessions[1];
    const s2 = this.typing.sessions[2];

    const winnerName = this.renderer.fighters[winnerNum].name;

    setTimeout(() => {
      this.setState('GAME_OVER');
      this.ui.showGameOver({
        winnerNum,
        winnerName,
        durationSeconds,
        statsP1: {
          wpm: s1.avgWpm || s1.currentWpm,
          accuracy: s1.accuracy,
          totalWords: s1.totalWordsCompleted,
          maxCombo: s1.maxCombo,
          totalDamage: this.damageDealt[1]
        },
        statsP2: {
          wpm: s2.avgWpm || s2.currentWpm,
          accuracy: s2.accuracy,
          totalWords: s2.totalWordsCompleted,
          maxCombo: s2.maxCombo,
          totalDamage: this.damageDealt[2]
        }
      });
    }, 700);
  }

  // --- Network Multiplayer Callbacks ---
  setupNetworkCallbacks() {
    this.network.onPlayerJoined = (data) => {
      document.getElementById('room-status-text').textContent = 'Opponent joined! Both players must READY UP.';
      this.updateRoomReadyUI(data.players);
    };

    this.network.onReadyStateUpdate = (data) => {
      this.updateRoomReadyUI(data.players);
    };

    this.network.onCountdownStart = () => {
      this.gameMode = 'online';
      this.typing.setMode('single');

      this.renderer.fighters[1].name = this.onlinePlayerNum === 1 ? 'YOU (P1)' : 'OPPONENT (P1)';
      this.renderer.fighters[2].name = this.onlinePlayerNum === 2 ? 'YOU (P2)' : 'OPPONENT (P2)';

      this.resetBattleState();

      this.ui.startCountdown(() => {
        this.battleActive = true;
        this.matchStartTime = performance.now();
        this.setState('BATTLE');
      });
    };

    this.network.onMatchStart = (data) => {
      const myWord = data.words[this.onlinePlayerNum];
      const oppWord = data.words[this.onlinePlayerNum === 1 ? 2 : 1];

      this.typing.sessions[this.onlinePlayerNum].setWord(myWord);
      this.typing.sessions[this.onlinePlayerNum === 1 ? 2 : 1].setWord(oppWord);

      this.typing.updateDisplay(1);
      this.typing.updateDisplay(2);
    };

    this.network.onBattleAttack = (data) => {
      const { attacker, defender, damage, attackSpeedMs, combo, nextWord, hp } = data;

      this.hp[1] = hp[1];
      this.hp[2] = hp[2];
      this.renderer.fighters[1].hp = hp[1];
      this.renderer.fighters[2].hp = hp[2];

      this.audio.playWordComplete();
      this.audio.playSwish();

      this.renderer.triggerAttack(attacker, attackSpeedMs);

      setTimeout(() => {
        this.audio.playHit();
        if (combo >= 2) this.audio.playCombo(combo);
        this.renderer.triggerHit(defender, damage, combo);
      }, attackSpeedMs * 0.45);

      // Set new word for attacker
      this.typing.sessions[attacker].setWord(nextWord);
      this.typing.updateDisplay(attacker);
    };

    this.network.onComboBroken = (data) => {
      this.ui.showComboAlert(data.playerNumber, 'COMBO BROKEN!');
    };

    this.network.onMatchEnded = (data) => {
      this.battleActive = false;
      this.renderer.setVictory(data.winner);

      const winnerName = data.winner === this.onlinePlayerNum ? 'YOU' : 'OPPONENT';

      setTimeout(() => {
        this.setState('GAME_OVER');
        this.ui.showGameOver({
          winnerNum: data.winner,
          winnerName,
          durationSeconds: data.durationSeconds,
          statsP1: data.stats[1],
          statsP2: data.stats[2],
          isOnline: true
        });
      }, 700);
    };

    this.network.onRematchAccepted = (data) => {
      this.resetBattleState();
      this.updateRoomReadyUI(data.players);
      this.setState('ROOM_WAITING');
    };

    this.network.onOpponentLeft = (data) => {
      alert(data.message);
      this.setState('MAIN_MENU');
    };
  }

  updateRoomReadyUI(players) {
    const listEl = document.getElementById('ready-status-list');
    if (!listEl) return;

    let html = '';
    const p1 = players.find(p => p.playerNumber === 1);
    const p2 = players.find(p => p.playerNumber === 2);

    html += `<div class="ready-item ${p1 && p1.ready ? 'is-ready' : ''}">PLAYER 1: ${p1 ? (p1.ready ? 'READY ✓' : 'NOT READY') : 'WAITING...'}</div>`;
    html += `<div class="ready-item ${p2 && p2.ready ? 'is-ready' : ''}">PLAYER 2: ${p2 ? (p2.ready ? 'READY ✓' : 'NOT READY') : 'WAITING FOR OPPONENT...'}</div>`;

    listEl.innerHTML = html;
  }
}

// Start application when DOM loads
window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameManager();
});
