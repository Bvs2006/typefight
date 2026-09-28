// Network Manager for TypeFight Online 1v1 Multiplayer

class NetworkManager {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.playerNumber = null;
    this.isConnected = false;

    // Callbacks to UI and Game Coordinator
    this.onPlayerJoined = null;
    this.onReadyStateUpdate = null;
    this.onCountdownStart = null;
    this.onMatchStart = null;
    this.onBattleAttack = null;
    this.onComboBroken = null;
    this.onMatchEnded = null;
    this.onOpponentLeft = null;
    this.onRematchAccepted = null;
  }

  init() {
    if (this.socket) return;
    if (typeof io === 'undefined') {
      console.warn('Socket.IO library not loaded');
      return;
    }

    this.socket = io();

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to TypeFight game server with ID:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from game server');
    });

    this.socket.on('player_joined', (data) => {
      if (this.onPlayerJoined) this.onPlayerJoined(data);
    });

    this.socket.on('ready_state_update', (data) => {
      if (this.onReadyStateUpdate) this.onReadyStateUpdate(data);
    });

    this.socket.on('countdown_start', (data) => {
      if (this.onCountdownStart) this.onCountdownStart(data);
    });

    this.socket.on('match_start', (data) => {
      if (this.onMatchStart) this.onMatchStart(data);
    });

    this.socket.on('battle_attack', (data) => {
      if (this.onBattleAttack) this.onBattleAttack(data);
    });

    this.socket.on('player_combo_broken', (data) => {
      if (this.onComboBroken) this.onComboBroken(data);
    });

    this.socket.on('match_ended', (data) => {
      if (this.onMatchEnded) this.onMatchEnded(data);
    });

    this.socket.on('opponent_left', (data) => {
      if (this.onOpponentLeft) this.onOpponentLeft(data);
    });

    this.socket.on('rematch_accepted', (data) => {
      if (this.onRematchAccepted) this.onRematchAccepted(data);
    });
  }

  createRoom(difficulty = 'medium') {
    return new Promise((resolve) => {
      this.init();
      this.socket.emit('create_room', { difficulty }, (response) => {
        if (response && response.success) {
          this.roomCode = response.roomCode;
          this.playerNumber = response.playerNumber;
        }
        resolve(response);
      });
    });
  }

  joinRoom(roomCode) {
    return new Promise((resolve) => {
      this.init();
      this.socket.emit('join_room', { roomCode }, (response) => {
        if (response && response.success) {
          this.roomCode = response.roomCode;
          this.playerNumber = response.playerNumber;
        }
        resolve(response);
      });
    });
  }

  sendReady() {
    if (this.socket) {
      this.socket.emit('player_ready');
    }
  }

  sendWordCompleted(payload) {
    if (this.socket) {
      this.socket.emit('word_completed', payload, (res) => {
        if (res && res.error) {
          console.warn('Word completion rejected by server:', res.error);
        }
      });
    }
  }

  sendComboBroken() {
    if (this.socket) {
      this.socket.emit('combo_broken');
    }
  }

  requestRematch() {
    if (this.socket) {
      this.socket.emit('request_rematch');
    }
  }
}

window.networkManager = new NetworkManager();
