// Client Combat Engine for TypeFight

class CombatManager {
  constructor() {
    this.baseDamage = 10;
    this.maxHp = 100;
  }

  getSpeedBonus(wpm) {
    if (wpm >= 81) return 12;
    if (wpm >= 61) return 8;
    if (wpm >= 41) return 5;
    if (wpm >= 21) return 2;
    return 0;
  }

  getAccuracyMultiplier(accuracy) {
    if (accuracy >= 95) return 1.25;
    if (accuracy >= 90) return 1.10;
    if (accuracy >= 80) return 1.00;
    return 0.75;
  }

  getComboMultiplier(combo) {
    if (combo >= 8) return 1.50;
    if (combo >= 5) return 1.30;
    if (combo >= 3) return 1.15;
    return 1.00;
  }

  calculateDamage({ wpm, accuracy, combo = 1, word = '' }) {
    const base = this.baseDamage;
    const speedBonus = this.getSpeedBonus(wpm);
    const accMult = this.getAccuracyMultiplier(accuracy);
    const comboMult = this.getComboMultiplier(combo);

    let lengthBonus = 0;
    if (word && word.length >= 10) lengthBonus = 2;
    else if (word && word.length >= 7) lengthBonus = 1;

    const raw = (base + speedBonus + lengthBonus) * accMult * comboMult;
    const finalDamage = Math.max(1, Math.round(raw));

    return {
      damage: finalDamage,
      base,
      speedBonus,
      lengthBonus,
      accuracyMultiplier: accMult,
      comboMultiplier: comboMult
    };
  }

  getAttackDuration(wpm) {
    // Faster typing -> faster attack animation
    return Math.max(220, Math.min(600, Math.round(500 - (wpm * 2.5))));
  }
}

window.combatManager = new CombatManager();
