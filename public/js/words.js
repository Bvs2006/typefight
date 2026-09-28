// Client word bank for TypeFight

const CLIENT_WORD_BANK = {
  easy: [
    'cat', 'dog', 'run', 'fire', 'moon', 'code', 'game',
    'fast', 'jump', 'star', 'duel', 'fist', 'kick', 'draw',
    'iron', 'rock', 'wind', 'blade', 'page', 'ink', 'dash',
    'punch', 'hero', 'grit', 'lead', 'line', 'bold', 'mark'
  ],
  medium: [
    'rocket', 'battle', 'typing', 'thunder', 'shadow', 'warrior',
    'pencil', 'sketch', 'dragon', 'knight', 'strike', 'combat',
    'master', 'sprint', 'impact', 'legend', 'arena', 'doodle',
    'eraser', 'scroll', 'clash', 'spark', 'parry', 'combo',
    'graphite', 'notebook', 'reflex'
  ],
  hard: [
    'algorithm', 'architecture', 'javascript', 'programming',
    'multiplayer', 'development', 'championship', 'devastating',
    'lightning', 'adrenaline', 'victorious', 'counterbalance',
    'synchronization', 'imagination', 'typewriter', 'retaliation',
    'quickdraw', 'electrifying', 'masterpiece', 'annihilation'
  ],
  splitLeft: [
    'tree', 'fast', 'star', 'gear', 'race', 'base', 'water',
    'great', 'craft', 'brave', 'trade', 'badge', 'sweet', 'extra',
    'batter', 'target', 'desert', 'beast', 'cave', 'cast', 'draw',
    'fade', 'gate', 'wave', 'rage', 'dare', 'fear', 'crab', 'vase'
  ],
  splitRight: [
    'moon', 'lion', 'pink', 'jump', 'link', 'look', 'milk',
    'join', 'hook', 'loop', 'plum', 'monk', 'mini', 'pool',
    'kill', 'lump', 'poll', 'pill', 'oil', 'hop', 'noon',
    'million', 'opinion', 'minimum', 'onion', 'poly'
  ]
};

class WordManager {
  constructor() {
    this.bank = CLIENT_WORD_BANK;
    this.recentWords = { 1: [], 2: [] };
  }

  getWord(difficulty = 'medium', mode = 'standard', playerSide = 1) {
    let pool;
    if (mode === 'split') {
      pool = playerSide === 1 ? this.bank.splitLeft : this.bank.splitRight;
    } else {
      pool = this.bank[difficulty] || this.bank.medium;
    }

    const recents = this.recentWords[playerSide] || [];
    const available = pool.filter(w => !recents.includes(w));
    const selectionList = available.length > 0 ? available : pool;

    const chosen = selectionList[Math.floor(Math.random() * selectionList.length)];

    recents.push(chosen);
    if (recents.length > 4) recents.shift();
    this.recentWords[playerSide] = recents;

    return chosen;
  }

  reset() {
    this.recentWords = { 1: [], 2: [] };
  }
}

window.wordManager = new WordManager();
