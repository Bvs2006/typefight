// Word database for TypeFight

const WORD_BANK = {
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
  // Left-hand only words for split keyboard (Q W E R T A S D F G Z X C V B)
  splitLeft: [
    'tree', 'fast', 'star', 'gear', 'race', 'base', 'water',
    'great', 'craft', 'brave', 'trade', 'badge', 'sweet', 'extra',
    'batter', 'target', 'desert', 'beast', 'cave', 'cast', 'draw',
    'fade', 'gate', 'wave', 'rage', 'dare', 'fear', 'crab', 'vase'
  ],
  // Right-hand only words for split keyboard (Y U I O P H J K L N M)
  splitRight: [
    'moon', 'lion', 'pink', 'jump', 'link', 'look', 'milk',
    'join', 'hook', 'loop', 'plum', 'monk', 'mini', 'pool',
    'kill', 'lump', 'poll', 'pill', 'oil', 'hop', 'noon',
    'million', 'opinion', 'minimum', 'onion', 'poly'
  ]
};

function getRandomWord(difficulty = 'medium', previousWord = '', mode = 'standard', playerSide = 1) {
  let list;
  if (mode === 'split') {
    list = playerSide === 1 ? WORD_BANK.splitLeft : WORD_BANK.splitRight;
  } else {
    list = WORD_BANK[difficulty] || WORD_BANK.medium;
  }

  // Avoid repeating the exact previous word
  const filtered = list.filter(w => w !== previousWord);
  const pool = filtered.length > 0 ? filtered : list;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

module.exports = {
  WORD_BANK,
  getRandomWord
};
