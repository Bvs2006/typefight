const assert = require('assert');
const {
  calculateSpeedBonus,
  calculateAccuracyMultiplier,
  calculateComboMultiplier,
  calculateDamage,
  validateWordCompletion
} = require('../server/combatEngine');

console.log('--- Testing Combat Calculations ---');

// 1. Speed Bonus tests
assert.strictEqual(calculateSpeedBonus(15), 0, '0-20 WPM should have +0 bonus');
assert.strictEqual(calculateSpeedBonus(30), 2, '21-40 WPM should have +2 bonus');
assert.strictEqual(calculateSpeedBonus(50), 5, '41-60 WPM should have +5 bonus');
assert.strictEqual(calculateSpeedBonus(75), 8, '61-80 WPM should have +8 bonus');
assert.strictEqual(calculateSpeedBonus(95), 12, '81+ WPM should have +12 bonus');
console.log('✓ Speed bonus tiers verified');

// 2. Accuracy Multiplier tests
assert.strictEqual(calculateAccuracyMultiplier(98), 1.25, '95-100% accuracy should have 1.25x');
assert.strictEqual(calculateAccuracyMultiplier(92), 1.10, '90-94% accuracy should have 1.10x');
assert.strictEqual(calculateAccuracyMultiplier(85), 1.00, '80-89% accuracy should have 1.00x');
assert.strictEqual(calculateAccuracyMultiplier(70), 0.75, '<80% accuracy should have 0.75x');
console.log('✓ Accuracy multipliers verified');

// 3. Combo Multiplier tests
assert.strictEqual(calculateComboMultiplier(1), 1.00, 'Combo 1 should have 1.0x');
assert.strictEqual(calculateComboMultiplier(4), 1.15, 'Combo 3-4 should have 1.15x');
assert.strictEqual(calculateComboMultiplier(6), 1.30, 'Combo 5-7 should have 1.3x');
assert.strictEqual(calculateComboMultiplier(10), 1.50, 'Combo 8+ should have 1.5x');
console.log('✓ Combo multipliers verified');

// 4. Combined damage calculation
// Example: 75 WPM (+8 bonus), 96% accuracy (1.25x), Combo 3 (1.15x) -> (10 + 8) * 1.25 * 1.15 = 18 * 1.25 * 1.15 = 25.875 -> 26
const res1 = calculateDamage({ wpm: 75, accuracy: 96, combo: 3, word: 'cat' });
assert.strictEqual(res1.damage, 26, 'Combined damage should match expected formula result');
console.log(`✓ Combined damage example calculated: ${res1.damage} HP`);

// 5. Anti-cheat validation
const validCheck = validateWordCompletion({
  word: 'thunder',
  durationMs: 1200,
  wpm: 70,
  accuracy: 95
});
assert.strictEqual(validCheck.valid, true, 'Reasonable completion should be valid');

// Impossible speed: 7 chars in 50ms (less than 45ms * 7 = 315ms)
const cheatCheck = validateWordCompletion({
  word: 'thunder',
  durationMs: 50,
  wpm: 840,
  accuracy: 100
});
assert.strictEqual(cheatCheck.valid, false, 'Inhumanly fast completion should be rejected');
console.log(`✓ Anti-cheat successfully rejected impossible event: ${cheatCheck.reason}`);

console.log('All combat & anti-cheat unit tests passed!');
