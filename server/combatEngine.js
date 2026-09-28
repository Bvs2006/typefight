// Combat calculation and Anti-cheat verification engine for TypeFight

const COMBAT_CONFIG = {
  baseDamage: 10,
  maxHp: 100,
  minKeystrokeMs: 45, // Anti-cheat: less than 45ms per character is inhuman (approx >260 WPM burst)
  maxPlausibleWpm: 250,

  speedTiers: [
    { min: 81, max: Infinity, bonus: 12 },
    { min: 61, max: 80, bonus: 8 },
    { min: 41, max: 60, bonus: 5 },
    { min: 21, max: 40, bonus: 2 },
    { min: 0,  max: 20, bonus: 0 }
  ],

  accuracyTiers: [
    { min: 95, max: 100, mult: 1.25 },
    { min: 90, max: 94.99, mult: 1.10 },
    { min: 80, max: 89.99, mult: 1.00 },
    { min: 0,  max: 79.99, mult: 0.75 }
  ],

  comboTiers: [
    { min: 8, max: Infinity, mult: 1.50 },
    { min: 5, max: 7, mult: 1.30 },
    { min: 3, max: 4, mult: 1.15 },
    { min: 1, max: 2, mult: 1.00 }
  ]
};

function calculateSpeedBonus(wpm) {
  for (const tier of COMBAT_CONFIG.speedTiers) {
    if (wpm >= tier.min) {
      return tier.bonus;
    }
  }
  return 0;
}

function calculateAccuracyMultiplier(accuracy) {
  for (const tier of COMBAT_CONFIG.accuracyTiers) {
    if (accuracy >= tier.min) {
      return tier.mult;
    }
  }
  return 0.75;
}

function calculateComboMultiplier(combo) {
  for (const tier of COMBAT_CONFIG.comboTiers) {
    if (combo >= tier.min) {
      return tier.mult;
    }
  }
  return 1.00;
}

/**
 * Calculates final combat damage from typing performance
 * @param {Object} params
 * @param {number} params.wpm - Words per minute
 * @param {number} params.accuracy - Typing accuracy percentage (0-100)
 * @param {number} params.combo - Current combo streak
 * @param {string} [params.word] - Optional word for length scaling
 * @returns {Object} damage details
 */
function calculateDamage({ wpm, accuracy, combo = 1, word = '' }) {
  const base = COMBAT_CONFIG.baseDamage;
  const speedBonus = calculateSpeedBonus(wpm);
  const accMult = calculateAccuracyMultiplier(accuracy);
  const comboMult = calculateComboMultiplier(combo);

  // Slight word length incentive for long words (>8 chars: +1 or +2)
  let lengthBonus = 0;
  if (word && word.length >= 10) {
    lengthBonus = 2;
  } else if (word && word.length >= 7) {
    lengthBonus = 1;
  }

  const rawDamage = (base + speedBonus + lengthBonus) * accMult * comboMult;
  const finalDamage = Math.max(1, Math.round(rawDamage));

  return {
    damage: finalDamage,
    base,
    speedBonus,
    lengthBonus,
    accuracyMultiplier: accMult,
    comboMultiplier: comboMult
  };
}

/**
 * Anti-cheat validation for word completion
 * @param {Object} data
 * @param {string} data.word - Expected target word
 * @param {number} data.durationMs - Time taken in milliseconds
 * @param {number} data.wpm - Claimed WPM
 * @param {number} data.accuracy - Claimed accuracy
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateWordCompletion({ word, durationMs, wpm, accuracy }) {
  if (!word || typeof word !== 'string') {
    return { valid: false, reason: 'Invalid word payload' };
  }

  // Reject completion times faster than humanly possible
  const minAllowedMs = word.length * COMBAT_CONFIG.minKeystrokeMs;
  if (durationMs < minAllowedMs) {
    return {
      valid: false,
      reason: `Completion time too fast: ${durationMs}ms for ${word.length} chars (min: ${minAllowedMs}ms)`
    };
  }

  // Sanity check claimed WPM
  if (wpm > COMBAT_CONFIG.maxPlausibleWpm) {
    return {
      valid: false,
      reason: `WPM exceeds human maximum: ${wpm} WPM`
    };
  }

  if (accuracy < 0 || accuracy > 100) {
    return {
      valid: false,
      reason: `Accuracy out of bounds: ${accuracy}%`
    };
  }

  return { valid: true };
}

module.exports = {
  COMBAT_CONFIG,
  calculateSpeedBonus,
  calculateAccuracyMultiplier,
  calculateComboMultiplier,
  calculateDamage,
  validateWordCompletion
};
