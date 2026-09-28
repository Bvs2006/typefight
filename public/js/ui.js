// UI View Manager and Screen Transitions for TypeFight

class UIManager {
  constructor() {
    this.screens = {
      mainMenu: document.getElementById('screen-main-menu'),
      offlineMenu: document.getElementById('screen-offline-menu'),
      onlineMenu: document.getElementById('screen-online-menu'),
      roomWaiting: document.getElementById('screen-room-waiting'),
      battleHud: document.getElementById('screen-battle-hud'),
      howToPlayModal: document.getElementById('modal-how-to-play'),
      settingsModal: document.getElementById('modal-settings'),
      gameOverModal: document.getElementById('modal-game-over')
    };

    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownText = document.getElementById('countdown-text');
  }

  showScreen(screenName) {
    // Hide all main screen overlays
    const screenKeys = ['mainMenu', 'offlineMenu', 'onlineMenu', 'roomWaiting', 'battleHud'];
    screenKeys.forEach(k => {
      if (this.screens[k]) {
        this.screens[k].classList.add('hidden');
      }
    });

    if (this.screens[screenName]) {
      this.screens[screenName].classList.remove('hidden');
    }
  }

  showModal(modalName) {
    if (this.screens[modalName]) {
      this.screens[modalName].classList.remove('hidden');
    }
  }

  hideModal(modalName) {
    if (this.screens[modalName]) {
      this.screens[modalName].classList.add('hidden');
    }
  }

  startCountdown(callback) {
    this.countdownOverlay.classList.remove('hidden');
    const counts = ['3', '2', '1', 'FIGHT!'];
    let step = 0;

    const tick = () => {
      if (step < counts.length) {
        const text = counts[step];
        this.countdownText.textContent = text;
        this.countdownText.className = 'countdown-anim';

        // Play countdown audio
        if (window.audioManager) {
          window.audioManager.playCountdown(step === 3 ? 0 : 3 - step);
        }

        step++;
        setTimeout(tick, 900);
      } else {
        this.countdownOverlay.classList.add('hidden');
        if (callback) callback();
      }
    };

    tick();
  }

  showComboAlert(playerNum, text = 'COMBO BROKEN!') {
    const alertEl = document.getElementById(`combo-alert-${playerNum}`);
    if (!alertEl) return;

    alertEl.textContent = text;
    alertEl.classList.remove('hidden');
    alertEl.className = 'sketch-alert sketch-alert-pop';

    setTimeout(() => {
      alertEl.classList.add('hidden');
    }, 1200);
  }

  showGameOver({ winnerNum, winnerName, durationSeconds, statsP1, statsP2, isOnline = false }) {
    const titleEl = document.getElementById('game-over-title');
    const subtitleEl = document.getElementById('game-over-subtitle');

    if (titleEl) {
      titleEl.textContent = `${winnerName} WINS!`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = `Battle Duration: ${durationSeconds} seconds`;
    }

    // Populate stats tables
    const populateStats = (num, stats) => {
      const wpm = document.getElementById(`stat-wpm-${num}`);
      const acc = document.getElementById(`stat-acc-${num}`);
      const words = document.getElementById(`stat-words-${num}`);
      const combo = document.getElementById(`stat-combo-${num}`);
      const dmg = document.getElementById(`stat-dmg-${num}`);

      if (wpm) wpm.textContent = stats.wpm || stats.avgWpm || 0;
      if (acc) acc.textContent = `${stats.accuracy || 100}%`;
      if (words) words.textContent = stats.totalWords || stats.wordsCompleted || 0;
      if (combo) combo.textContent = `x${stats.maxCombo || 0}`;
      if (dmg) dmg.textContent = `${stats.totalDamage || stats.totalDamageDealt || 0} HP`;
    };

    populateStats(1, statsP1);
    populateStats(2, statsP2);

    this.showModal('gameOverModal');

    if (window.audioManager) {
      window.audioManager.playVictory();
    }
  }
}

window.uiManager = new UIManager();
