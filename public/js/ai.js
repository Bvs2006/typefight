// AI Opponent for TypeFight
// Simulates human-like typing with organic delays, typos, and backspacing

class AIOpponent {
  constructor(typingManager) {
    this.typingManager = typingManager;
    this.active = false;
    this.difficulty = 'normal'; // 'easy', 'normal', 'hard'
    this.timer = null;

    // Difficulty profiles
    this.profiles = {
      easy: {
        targetWpm: 30,       // ~25-35 WPM
        accuracyChance: 0.85,
        baseCharDelay: 320,  // ms per key
        jitter: 140,
        mistakeRecoveryDelay: 280
      },
      normal: {
        targetWpm: 60,       // ~55-65 WPM
        accuracyChance: 0.93,
        baseCharDelay: 170,
        jitter: 70,
        mistakeRecoveryDelay: 200
      },
      hard: {
        targetWpm: 95,       // ~85-105 WPM
        accuracyChance: 0.97,
        baseCharDelay: 110,
        jitter: 35,
        mistakeRecoveryDelay: 130
      }
    };

    this.onWordCompleted = null;
    this.onComboBroken = null;
  }

  setDifficulty(diff) {
    if (this.profiles[diff]) {
      this.difficulty = diff;
    }
  }

  start() {
    this.active = true;
    this.scheduleNextKeystroke();
  }

  stop() {
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  scheduleNextKeystroke() {
    if (!this.active) return;

    const prof = this.profiles[this.difficulty];
    const delay = Math.max(45, prof.baseCharDelay + (Math.random() - 0.5) * prof.jitter);

    this.timer = setTimeout(() => {
      this.typeStep();
    }, delay);
  }

  typeStep() {
    if (!this.active) return;

    const session = this.typingManager.sessions[2];
    if (!session || !session.currentWord) {
      this.scheduleNextKeystroke();
      return;
    }

    const prof = this.profiles[this.difficulty];
    const word = session.currentWord;
    const currentLength = session.typedBuffer.length;

    // If session currently has an error, AI simulates backspacing to fix it
    if (session.hasError) {
      setTimeout(() => {
        session.handleBackspace();
        this.typingManager.updateDisplay(2);
        this.scheduleNextKeystroke();
      }, prof.mistakeRecoveryDelay);
      return;
    }

    if (currentLength >= word.length) {
      // Word is already completed or awaiting reset
      return;
    }

    // Decide if AI makes a typo
    const makeTypo = Math.random() > prof.accuracyChance;

    if (makeTypo) {
      // Pick random wrong letter
      const wrongChars = 'abcdefghijklmnopqrstuvwxyz'.replace(word[currentLength], '');
      const typo = wrongChars[Math.floor(Math.random() * wrongChars.length)];

      const result = session.handleKeystroke(typo);
      this.typingManager.updateDisplay(2);

      if (result && result.comboBroken && this.onComboBroken) {
        this.onComboBroken(2);
      }

      // Schedule backspace correction step
      this.scheduleNextKeystroke();
    } else {
      // Type correct letter
      const nextChar = word[currentLength];
      const result = session.handleKeystroke(nextChar);
      this.typingManager.updateDisplay(2);

      if (result && result.type === 'word_completed') {
        if (this.onWordCompleted) {
          this.onWordCompleted(result);
        }
      } else {
        this.scheduleNextKeystroke();
      }
    }
  }
}

window.AIOpponent = AIOpponent;
