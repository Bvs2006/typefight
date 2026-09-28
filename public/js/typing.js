// Typing Engine for TypeFight
// Manages word buffers, real-time WPM, accuracy, character validation, and dual-player local typing

class PlayerTypingSession {
  constructor(playerNumber, isAi = false) {
    this.playerNumber = playerNumber;
    this.isAi = isAi;

    this.currentWord = '';
    this.typedBuffer = '';
    this.wordStartTime = 0;
    this.sessionStartTime = 0;

    // Word telemetry
    this.correctCharsInWord = 0;
    this.mistakesInWord = 0;
    this.hasError = false;

    // Lifetime match telemetry
    this.totalWordsCompleted = 0;
    this.totalKeystrokes = 0;
    this.totalCorrectKeystrokes = 0;
    this.totalMistakes = 0;
    this.combo = 0;
    this.maxCombo = 0;

    // Real-time metrics
    this.currentWpm = 0;
    this.avgWpm = 0;
    this.accuracy = 100;
  }

  setWord(word) {
    this.currentWord = word.toLowerCase();
    this.typedBuffer = '';
    this.hasError = false;
    this.mistakesInWord = 0;
    this.correctCharsInWord = 0;
    this.wordStartTime = performance.now();
    if (!this.sessionStartTime) {
      this.sessionStartTime = performance.now();
    }
  }

  handleKeystroke(char) {
    if (!this.currentWord) return null;

    const lowerChar = char.toLowerCase();
    this.totalKeystrokes += 1;

    const expectedIndex = this.typedBuffer.length;
    const expectedChar = this.currentWord[expectedIndex];

    if (lowerChar === expectedChar && !this.hasError) {
      // Correct keystroke
      this.typedBuffer += lowerChar;
      this.correctCharsInWord += 1;
      this.totalCorrectKeystrokes += 1;

      // Realtime telemetry update
      this.updateMetrics();

      if (window.audioManager) {
        window.audioManager.playKeystroke(false);
      }

      // Check if word is finished
      if (this.typedBuffer === this.currentWord) {
        return this.completeWord();
      }

      return { type: 'char_correct', char: lowerChar, buffer: this.typedBuffer };
    } else {
      // Mistake
      this.mistakesInWord += 1;
      this.totalMistakes += 1;
      this.hasError = true;

      // Mistake breaks combo if combo was active
      let comboBroken = false;
      if (this.combo > 0) {
        this.combo = 0;
        comboBroken = true;
        if (window.audioManager) {
          window.audioManager.playComboBroken();
        }
      } else if (window.audioManager) {
        window.audioManager.playKeystroke(true);
      }

      this.updateMetrics();
      return {
        type: 'char_incorrect',
        char: lowerChar,
        comboBroken,
        mistakesInWord: this.mistakesInWord
      };
    }
  }

  handleBackspace() {
    if (this.typedBuffer.length > 0) {
      this.typedBuffer = this.typedBuffer.slice(0, -1);
      this.hasError = false;
      this.updateMetrics();
      return true;
    }
    return false;
  }

  updateMetrics() {
    const elapsedMinutes = Math.max(0.01, (performance.now() - this.sessionStartTime) / 60000);
    this.avgWpm = Math.round((this.totalCorrectKeystrokes / 5) / elapsedMinutes);

    const total = this.totalKeystrokes || 1;
    this.accuracy = Math.min(100, Math.max(0, Math.round((this.totalCorrectKeystrokes / total) * 100)));
  }

  completeWord() {
    const now = performance.now();
    const durationMs = Math.max(50, now - this.wordStartTime);
    const durationMinutes = durationMs / 60000;

    // Word specific WPM
    const wordWpm = Math.round((this.currentWord.length / 5) / durationMinutes);
    this.currentWpm = wordWpm;

    // Word specific accuracy
    const wordKeys = this.currentWord.length + this.mistakesInWord;
    const wordAcc = Math.min(100, Math.round((this.currentWord.length / wordKeys) * 100));

    // Update combo
    this.combo += 1;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.totalWordsCompleted += 1;

    const completedWord = this.currentWord;

    return {
      type: 'word_completed',
      playerNumber: this.playerNumber,
      word: completedWord,
      durationMs,
      wpm: wordWpm,
      avgWpm: this.avgWpm,
      accuracy: wordAcc,
      totalAccuracy: this.accuracy,
      combo: this.combo,
      correctChars: this.currentWord.length,
      totalKeystrokes: wordKeys
    };
  }

  reset() {
    this.currentWord = '';
    this.typedBuffer = '';
    this.wordStartTime = 0;
    this.sessionStartTime = 0;
    this.correctCharsInWord = 0;
    this.mistakesInWord = 0;
    this.hasError = false;
    this.totalWordsCompleted = 0;
    this.totalKeystrokes = 0;
    this.totalCorrectKeystrokes = 0;
    this.totalMistakes = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.currentWpm = 0;
    this.avgWpm = 0;
    this.accuracy = 100;
  }
}

class TypingManager {
  constructor() {
    this.sessions = {
      1: new PlayerTypingSession(1),
      2: new PlayerTypingSession(2)
    };

    this.mode = 'single'; // 'single' (P1 vs AI or Online), 'split' (2 players same keyboard)
    this.active = false;
    this.onWordCompleted = null;
    this.onComboBroken = null;

    // Split keyboard key sets
    this.splitKeysP1 = new Set(['q','w','e','r','t','a','s','d','f','g','z','x','c','v','b']);
    this.splitKeysP2 = new Set(['y','u','i','o','p','h','j','k','l','n','m']);

    this.bindEvents();
  }

  setMode(mode) {
    this.mode = mode; // 'single' or 'split'
  }

  start() {
    this.active = true;
    this.sessions[1].sessionStartTime = performance.now();
    this.sessions[2].sessionStartTime = performance.now();
  }

  stop() {
    this.active = false;
  }

  reset() {
    this.active = false;
    this.sessions[1].reset();
    this.sessions[2].reset();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;

      // Ignore functional hotkeys like F5, Ctrl, Alt
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Tab' || e.key === 'Escape') return;

      const key = e.key;

      if (this.mode === 'single') {
        // Player 1 controls the full keyboard
        if (key === 'Backspace') {
          e.preventDefault();
          this.sessions[1].handleBackspace();
          this.updateDisplay(1);
        } else if (key.length === 1 && /[a-zA-Z]/.test(key)) {
          e.preventDefault();
          const result = this.sessions[1].handleKeystroke(key);
          this.updateDisplay(1);
          if (result && result.type === 'word_completed' && this.onWordCompleted) {
            this.onWordCompleted(result);
          } else if (result && result.comboBroken && this.onComboBroken) {
            this.onComboBroken(1);
          }
        }
      } else if (this.mode === 'split') {
        // Same Keyboard PvP: Player 1 (Left hand) vs Player 2 (Right hand)
        const lowerKey = key.toLowerCase();

        // Check Player 1 (Left keys)
        if (this.splitKeysP1.has(lowerKey)) {
          e.preventDefault();
          const result = this.sessions[1].handleKeystroke(lowerKey);
          this.updateDisplay(1);
          if (result && result.type === 'word_completed' && this.onWordCompleted) {
            this.onWordCompleted(result);
          } else if (result && result.comboBroken && this.onComboBroken) {
            this.onComboBroken(1);
          }
        }
        // Check Player 2 (Right keys)
        else if (this.splitKeysP2.has(lowerKey)) {
          e.preventDefault();
          const result = this.sessions[2].handleKeystroke(lowerKey);
          this.updateDisplay(2);
          if (result && result.type === 'word_completed' && this.onWordCompleted) {
            this.onWordCompleted(result);
          } else if (result && result.comboBroken && this.onComboBroken) {
            this.onComboBroken(2);
          }
        }
        // Backspaces: Left Backspace (e.g. `1` or Tab) vs standard Backspace
        else if (key === 'Backspace') {
          e.preventDefault();
          this.sessions[2].handleBackspace();
          this.updateDisplay(2);
        } else if (key === '`' || key === 'Tab') {
          e.preventDefault();
          this.sessions[1].handleBackspace();
          this.updateDisplay(1);
        }
      }
    });
  }

  updateDisplay(playerNumber) {
    const session = this.sessions[playerNumber];
    const wordEl = document.getElementById(`word-display-${playerNumber}`);
    if (!wordEl) return;

    const word = session.currentWord;
    const typed = session.typedBuffer;

    let html = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (i < typed.length) {
        // Correctly typed: bold pencil stroke
        html += `<span class="char-correct">${char}</span>`;
      } else if (i === typed.length) {
        // Active character with pencil caret
        if (session.hasError) {
          html += `<span class="char-current char-error">${char}</span>`;
        } else {
          html += `<span class="char-current">${char}</span>`;
        }
      } else {
        // Pending
        html += `<span class="char-pending">${char}</span>`;
      }
    }

    wordEl.innerHTML = html;

    // Update HUD metrics
    const wpmEl = document.getElementById(`hud-wpm-${playerNumber}`);
    const accEl = document.getElementById(`hud-acc-${playerNumber}`);
    const comboEl = document.getElementById(`hud-combo-${playerNumber}`);

    if (wpmEl) wpmEl.textContent = session.currentWpm || session.avgWpm || 0;
    if (accEl) accEl.textContent = `${session.accuracy}%`;
    if (comboEl) {
      comboEl.textContent = `x${session.combo}`;
      comboEl.className = session.combo >= 4 ? 'hud-combo-high' : '';
    }
  }
}

window.TypingManager = TypingManager;
window.typingManager = new TypingManager();
