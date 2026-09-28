// Canvas 2D Pencil-Sketch Renderer for TypeFight
// Delivers an authentic "someone drew a fighting game in a notebook" aesthetic

class SketchRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Logical dimensions
    this.width = 960;
    this.height = 540;

    // Handle high DPI displays
    this.dpr = window.devicePixelRatio || 1;
    this.initCanvasSize();

    // Camera shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeDecay = 0.9;

    // Particles (graphite lead fragments)
    this.particles = [];

    // Comic impact popups (POW!, HIT!, SCRATCH!, etc.)
    this.impacts = [];

    // Floating damage numbers
    this.damageNumbers = [];

    // Fighter states
    this.fighters = {
      1: {
        x: 230,
        y: 360,
        baseX: 230,
        baseY: 360,
        facing: 1, // 1 = right, -1 = left
        state: 'idle', // idle, attack, hurt, victory, defeat
        animTimer: 0,
        animDuration: 400,
        attackProgress: 0,
        hp: 100,
        maxHp: 100,
        name: 'PLAYER 1',
        pencilColor: '#1d1d1f'
      },
      2: {
        x: 730,
        y: 360,
        baseX: 730,
        baseY: 360,
        facing: -1,
        state: 'idle',
        animTimer: 0,
        animDuration: 400,
        attackProgress: 0,
        hp: 100,
        maxHp: 100,
        name: 'PLAYER 2',
        pencilColor: '#1d1d1f'
      }
    };

    // Global sketch wobble seed for flipbook stop-motion animation
    this.wobblePhase = 0;
    this.lastFrameTime = performance.now();

    // Comic impact words list
    this.impactWords = ['POW!', 'HIT!', 'SCRATCH!', 'WHAM!', 'SLASH!', 'CRACK!', 'BAM!'];
  }

  initCanvasSize() {
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  // --- Hand-Drawn Sketch Drawing Helpers ---

  // Imperfect pencil line with micro-jitter
  drawSketchLine(x1, y1, x2, y2, options = {}) {
    const {
      color = '#1f1e1d',
      width = 2.2,
      jitter = 1.4,
      roughness = 1.8,
      passes = 2
    } = options;

    this.ctx.strokeStyle = color;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let p = 0; p < passes; p++) {
      this.ctx.lineWidth = width * (0.8 + Math.random() * 0.4);
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);

      // Divide line into small segments with subtle curve
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy);
      const segments = Math.max(2, Math.floor(dist / 22));

      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const curX = x1 + dx * t;
        const curY = y1 + dy * t;

        // Add perpendicular jitter
        const nx = -dy / (dist || 1);
        const ny = dx / (dist || 1);
        const offset = (Math.random() - 0.5) * jitter * roughness;

        if (i === segments) {
          this.ctx.lineTo(x2 + nx * offset * 0.4, y2 + ny * offset * 0.4);
        } else {
          this.ctx.lineTo(curX + nx * offset, curY + ny * offset);
        }
      }
      this.ctx.stroke();
    }
  }

  // Imperfect hand-drawn circle (for stickman head, fists, etc.)
  drawSketchCircle(cx, cy, radius, options = {}) {
    const {
      color = '#1f1e1d',
      width = 2.2,
      jitter = 1.5,
      passes = 2
    } = options;

    this.ctx.strokeStyle = color;
    this.ctx.lineCap = 'round';

    for (let p = 0; p < passes; p++) {
      this.ctx.lineWidth = width * (0.8 + Math.random() * 0.35);
      this.ctx.beginPath();

      const steps = 16;
      for (let i = 0; i <= steps + 1; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const rOffset = (Math.random() - 0.5) * jitter;
        const r = radius + rOffset;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }
  }

  // Crosshatch shading for HP bars or shadows
  drawSketchHatch(x, y, w, h, percent, color = '#2c2b2a') {
    if (percent <= 0) return;
    const fillWidth = Math.max(0, Math.min(w, w * (percent / 100)));
    const spacing = 6;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, fillWidth, h);
    this.ctx.clip();

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.8;

    // Diagonal hatch lines ///
    for (let lx = x - h; lx < x + fillWidth + h; lx += spacing) {
      this.drawSketchLine(lx, y + h, lx + h, y, {
        color,
        width: 1.6,
        jitter: 0.8,
        passes: 1
      });
    }

    // Secondary crosshatch if high density
    if (percent > 60) {
      for (let lx = x - h; lx < x + fillWidth + h; lx += spacing * 1.5) {
        this.drawSketchLine(lx, y, lx + h, y + h, {
          color: 'rgba(44, 43, 42, 0.4)',
          width: 1.2,
          jitter: 0.8,
          passes: 1
        });
      }
    }
    this.ctx.restore();
  }

  // --- Background / Notebook Texture ---

  drawNotebookPaper() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Off-white sketch paper tint
    ctx.fillStyle = '#f8f4eb';
    ctx.fillRect(0, 0, w, h);

    // 2. Notebook spiral binding on the left edge (holes)
    ctx.fillStyle = '#e5decf';
    ctx.fillRect(0, 0, 48, h);

    // Notebook ring holes
    for (let y = 30; y < h; y += 42) {
      ctx.fillStyle = '#ded5c3';
      ctx.beginPath();
      ctx.arc(24, y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Hole pencil rim
      this.drawSketchCircle(24, y, 7, { color: '#a0998a', width: 1.2, jitter: 0.8, passes: 1 });

      // Ring shadow
      ctx.strokeStyle = '#6f695c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(24, y, 10, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    }

    // 3. Vertical red margin line
    this.drawSketchLine(78, 0, 78, h, {
      color: 'rgba(215, 75, 75, 0.45)',
      width: 2.0,
      jitter: 1.0,
      passes: 1
    });

    // 4. Horizontal ruled blue/grey notebook lines
    const lineSpacing = 32;
    for (let y = 64; y < h; y += lineSpacing) {
      this.drawSketchLine(52, y, w - 16, y, {
        color: 'rgba(150, 175, 205, 0.28)',
        width: 1.4,
        jitter: 0.6,
        passes: 1
      });
    }

    // 5. Arena sketch floor / ground scribble
    const groundY = 430;
    this.drawSketchLine(90, groundY, w - 30, groundY, {
      color: '#2a2825',
      width: 2.6,
      jitter: 1.8,
      passes: 2
    });

    // Little scribbled grass / dust tufts along ground
    for (let gx = 120; gx < w - 50; gx += 50) {
      this.drawSketchLine(gx, groundY, gx - 6, groundY - 8, { color: '#66615b', width: 1.4, passes: 1 });
      this.drawSketchLine(gx + 4, groundY, gx + 8, groundY - 11, { color: '#66615b', width: 1.4, passes: 1 });
    }

    // Subtly scribbled corner doodle
    this.drawSketchLine(w - 70, 24, w - 24, 24, { color: '#b0a99c', width: 1.2, passes: 1 });
    this.drawSketchLine(w - 24, 24, w - 24, 70, { color: '#b0a99c', width: 1.2, passes: 1 });
  }

  // --- Sketch HP Bars ---

  drawHealthBar(pNum) {
    const f = this.fighters[pNum];
    const isP1 = pNum === 1;
    const barW = 260;
    const barH = 22;
    const x = isP1 ? 110 : this.width - 110 - barW;
    const y = 36;

    // Sketch box border
    this.drawSketchLine(x, y, x + barW, y, { width: 2.2 });
    this.drawSketchLine(x + barW, y, x + barW, y + barH, { width: 2.2 });
    this.drawSketchLine(x + barW, y + barH, x, y + barH, { width: 2.2 });
    this.drawSketchLine(x, y + barH, x, y, { width: 2.2 });

    // Inner hatched health fill
    const healthPercent = Math.max(0, (f.hp / f.maxHp) * 100);
    const hatchColor = healthPercent > 35 ? '#1f1e1d' : '#ab2a2a'; // red pencil when low
    this.drawSketchHatch(x + 2, y + 2, barW - 4, barH - 4, healthPercent, hatchColor);

    // Player Label & HP Text
    this.ctx.fillStyle = '#1f1e1d';
    this.ctx.font = 'bold 20px "Patrick Hand", "Comic Sans MS", cursive, sans-serif';
    this.ctx.textAlign = isP1 ? 'left' : 'right';
    const textX = isP1 ? x : x + barW;
    this.ctx.fillText(`${f.name}   [${Math.round(f.hp)}/100 HP]`, textX, y - 8);
  }

  // --- Hand-Drawn Pencil Stickman Fighter ---

  drawFighter(pNum) {
    const f = this.fighters[pNum];
    const isP1 = pNum === 1;
    const facing = f.facing;
    const t = performance.now() * 0.004;

    // Animation progress calculations
    let offsetX = 0;
    let offsetY = 0;
    let bodyAngle = 0;
    let armAngle = 0;
    let swordSlash = false;

    // Subtle idle breathing
    if (f.state === 'idle') {
      offsetY = Math.sin(t * 3 + (isP1 ? 0 : Math.PI)) * 3;
      bodyAngle = Math.sin(t * 2) * 0.04;
    } else if (f.state === 'attack') {
      const p = f.attackProgress; // 0 -> 1
      if (p < 0.3) {
        // Windup: pull arm back, step back slightly
        offsetX = -facing * 18 * (p / 0.3);
        armAngle = -facing * 1.2 * (p / 0.3);
      } else if (p < 0.7) {
        // Lunge forward with pencil sword!
        const lungeT = (p - 0.3) / 0.4;
        offsetX = facing * 90 * Math.sin(lungeT * Math.PI * 0.5);
        armAngle = facing * 1.5;
        swordSlash = true;
      } else {
        // Recovery
        const recT = (p - 0.7) / 0.3;
        offsetX = facing * 90 * (1 - recT);
        armAngle = facing * (1.5 * (1 - recT));
      }
    } else if (f.state === 'hurt') {
      // Recoil backward, shake
      offsetX = -facing * 28 + (Math.random() - 0.5) * 8;
      offsetY = -10 + Math.random() * 6;
      bodyAngle = -facing * 0.25;
      armAngle = -facing * 0.8;
    } else if (f.state === 'victory') {
      // Jumping for joy!
      offsetY = -Math.abs(Math.sin(t * 6)) * 24;
      armAngle = facing * 2.2;
    } else if (f.state === 'defeat') {
      // Fallen down
      offsetY = 32;
      bodyAngle = facing * 1.2;
    }

    const curX = f.baseX + offsetX;
    const curY = f.baseY + offsetY;

    this.ctx.save();
    this.ctx.translate(curX, curY);

    // Fighter shadow scribble
    this.drawSketchLine(-25, 42, 25, 42, { color: 'rgba(60, 55, 50, 0.4)', width: 3.5, passes: 1 });

    // Rotate body slightly if animated
    this.ctx.rotate(bodyAngle);

    // 1. Head (Sketchy circle)
    const headRadius = 22;
    const headY = -68;
    this.drawSketchCircle(0, headY, headRadius, { width: 2.6, jitter: 1.6 });

    // Simple facial features
    if (f.state === 'hurt') {
      // Pain face: > < eyes
      this.drawSketchLine(-7, headY - 4, -2, headY, { width: 2, passes: 1 });
      this.drawSketchLine(-2, headY, -7, headY + 4, { width: 2, passes: 1 });
      this.drawSketchLine(2, headY, 7, headY - 4, { width: 2, passes: 1 });
      this.drawSketchLine(2, headY, 7, headY + 4, { width: 2, passes: 1 });
      // Wavy mouth
      this.drawSketchLine(-5, headY + 10, 5, headY + 11, { width: 2, jitter: 1.2, passes: 1 });
    } else if (f.state === 'defeat') {
      // Dizzy X eyes
      this.drawSketchLine(-8, headY - 4, -2, headY + 4, { width: 2, passes: 1 });
      this.drawSketchLine(-2, headY - 4, -8, headY + 4, { width: 2, passes: 1 });
      this.drawSketchLine(2, headY - 4, 8, headY + 4, { width: 2, passes: 1 });
      this.drawSketchLine(8, headY - 4, 2, headY + 4, { width: 2, passes: 1 });
    } else {
      // Determined fighting eyes
      const eyeX = facing * 5;
      this.drawSketchLine(eyeX - 3, headY - 4, eyeX + 4, headY - 2, { width: 2.2, passes: 1 }); // fierce eyebrow
      this.drawSketchCircle(eyeX, headY, 2.5, { width: 1.8, passes: 1 });
      // Mouth
      if (f.state === 'victory') {
        // Big smile
        this.ctx.beginPath();
        this.ctx.arc(eyeX, headY + 7, 6, 0, Math.PI);
        this.ctx.stroke();
      } else {
        this.drawSketchLine(eyeX - 4, headY + 9, eyeX + 5, headY + 8, { width: 2, passes: 1 });
      }
    }

    // Headband / Sketch Hair detail for distinction
    if (isP1) {
      // Spiky anime-style sketch hair
      this.drawSketchLine(-16, headY - 14, -26, headY - 32, { width: 2.4 });
      this.drawSketchLine(-26, headY - 32, -8, headY - 22, { width: 2.4 });
      this.drawSketchLine(-8, headY - 22, 6, headY - 38, { width: 2.4 });
      this.drawSketchLine(6, headY - 38, 14, headY - 20, { width: 2.4 });
      this.drawSketchLine(14, headY - 20, 24, headY - 30, { width: 2.4 });
    } else {
      // Fighting ninja headband with trailing tails
      this.drawSketchLine(-24, headY - 6, 24, headY - 6, { width: 3.2 });
      // Flowing tails
      const tailOffset = Math.sin(t * 5) * 5;
      this.drawSketchLine(-20, headY - 6, -38, headY - 4 + tailOffset, { width: 2.6 });
      this.drawSketchLine(-38, headY - 4 + tailOffset, -52, headY + 6 + tailOffset, { width: 2.2 });
    }

    // 2. Spine / Torso
    const neckY = headY + headRadius;
    const hipY = 2;
    this.drawSketchLine(0, neckY, 0, hipY, { width: 3.2, jitter: 1.4 });

    // Subtle sketch rib hatch
    this.drawSketchLine(-6, neckY + 16, 6, neckY + 16, { width: 1.8, passes: 1 });
    this.drawSketchLine(-5, neckY + 28, 5, neckY + 28, { width: 1.8, passes: 1 });

    // 3. Legs
    const footY = 40;
    if (f.state === 'defeat') {
      this.drawSketchLine(0, hipY, -18, footY - 10, { width: 2.8 });
      this.drawSketchLine(0, hipY, 24, footY - 8, { width: 2.8 });
    } else {
      // Stance: back leg and lead leg
      const backFootX = -facing * 22;
      const leadFootX = facing * 18;
      // Knee bends
      const backKneeX = -facing * 14;
      const backKneeY = hipY + 18;
      const leadKneeX = facing * 12;
      const leadKneeY = hipY + 18;

      this.drawSketchLine(0, hipY, backKneeX, backKneeY, { width: 2.8 });
      this.drawSketchLine(backKneeX, backKneeY, backFootX, footY, { width: 2.8 });

      this.drawSketchLine(0, hipY, leadKneeX, leadKneeY, { width: 2.8 });
      this.drawSketchLine(leadKneeX, leadKneeY, leadFootX, footY, { width: 2.8 });
    }

    // 4. Arms & Pencil Sword
    const shoulderY = neckY + 8;
    const elbowX = facing * 14;
    const elbowY = shoulderY + 14;
    const handX = facing * (24 + Math.cos(armAngle) * 14);
    const handY = shoulderY + Math.sin(armAngle) * 18;

    // Back arm (guard)
    this.drawSketchLine(0, shoulderY, -facing * 12, shoulderY + 12, { width: 2.4 });
    this.drawSketchLine(-facing * 12, shoulderY + 12, -facing * 18, shoulderY + 4, { width: 2.4 });

    // Lead arm (holding pencil weapon)
    this.drawSketchLine(0, shoulderY, elbowX, elbowY, { width: 2.8 });
    this.drawSketchLine(elbowX, elbowY, handX, handY, { width: 2.8 });

    // Hand fist
    this.drawSketchCircle(handX, handY, 4, { width: 2.0, passes: 1 });

    // THE PENCIL SWORD (An actual sketched yellow #2 pencil with lead tip!)
    this.ctx.save();
    this.ctx.translate(handX, handY);
    const weaponAngle = (facing === 1 ? -0.4 : Math.PI + 0.4) + armAngle;
    this.ctx.rotate(weaponAngle);

    // Pencil wooden body
    const pLength = 54;
    this.drawSketchLine(-10, -2, pLength, -2, { color: '#e69f24', width: 4.0, passes: 2 }); // Yellow shaft
    this.drawSketchLine(-10, 2, pLength, 2, { color: '#ba7b11', width: 2.5, passes: 1 });

    // Metal ferrule & Pink eraser at back
    this.drawSketchLine(-10, 0, -16, 0, { color: '#a0a0a0', width: 4.8, passes: 1 }); // silver band
    this.drawSketchLine(-16, 0, -24, 0, { color: '#e3848b', width: 4.8, passes: 2 }); // pink eraser

    // Sharpened wood cone & Sharp graphite lead tip
    this.drawSketchLine(pLength, -2, pLength + 14, 0, { color: '#d8b98b', width: 2.2, passes: 1 });
    this.drawSketchLine(pLength, 2, pLength + 14, 0, { color: '#d8b98b', width: 2.2, passes: 1 });
    // Graphite needle point
    this.drawSketchLine(pLength + 10, 0, pLength + 20, 0, { color: '#1a1918', width: 3.2, passes: 2 });

    this.ctx.restore();

    // 5. Hand-drawn Slash Arc Effect (on attack strike)
    if (swordSlash) {
      const slashX = facing * 70;
      const slashY = -30;
      this.drawSlashArc(slashX, slashY, facing);
    }

    this.ctx.restore();
  }

  // Hand-drawn comic slash swoosh
  drawSlashArc(cx, cy, facing) {
    this.ctx.save();
    this.ctx.strokeStyle = '#2b2a29';
    this.ctx.lineWidth = 3.5;
    this.ctx.lineCap = 'round';

    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      const r = 50 + i * 14;
      const startAngle = facing === 1 ? -Math.PI * 0.55 : Math.PI * 0.05;
      const endAngle = facing === 1 ? Math.PI * 0.25 : Math.PI * 0.85;

      this.ctx.arc(cx, cy, r, startAngle, endAngle);
      this.ctx.stroke();
    }

    // Speed lines
    for (let j = 0; j < 4; j++) {
      const sx = cx + (Math.random() - 0.5) * 30;
      const sy = cy + (Math.random() - 0.5) * 40;
      this.drawSketchLine(sx, sy, sx + facing * 45, sy + (Math.random() - 0.5) * 20, {
        color: '#4a4642',
        width: 1.8,
        passes: 1
      });
    }

    this.ctx.restore();
  }

  // --- Attack / Hit / Particles Triggers ---

  triggerAttack(attackerNum, attackSpeedMs = 400) {
    const attacker = this.fighters[attackerNum];
    attacker.state = 'attack';
    attacker.animDuration = attackSpeedMs;
    attacker.animTimer = performance.now();
    attacker.attackProgress = 0;
  }

  triggerHit(defenderNum, damage, combo = 1) {
    const defender = this.fighters[defenderNum];
    defender.state = 'hurt';
    defender.animDuration = 320;
    defender.animTimer = performance.now();

    // Screen shake
    this.shakeIntensity = Math.min(18, 6 + Math.floor(damage * 0.5));
    this.shakeDuration = 220;

    // Spawn graphite fragment particles
    const px = defender.baseX;
    const py = defender.baseY - 40;
    const particleCount = 14 + Math.min(20, damage);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      this.particles.push({
        x: px + (Math.random() - 0.5) * 30,
        y: py + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        gravity: 0.25,
        size: 1.5 + Math.random() * 3.5,
        alpha: 1.0,
        life: 300 + Math.random() * 200,
        born: performance.now()
      });
    }

    // Spawn comic impact sketch ("POW!", "HIT!", "SCRATCH!")
    const impactWord = this.impactWords[Math.floor(Math.random() * this.impactWords.length)];
    this.impacts.push({
      text: combo >= 4 ? `${impactWord} x${combo}` : impactWord,
      x: px + (Math.random() - 0.5) * 60,
      y: py - 40 - Math.random() * 30,
      scale: 0.4,
      targetScale: 1.2 + Math.min(0.8, combo * 0.15),
      rotation: (Math.random() - 0.5) * 0.5,
      alpha: 1.0,
      duration: 550,
      born: performance.now()
    });

    // Spawn floating damage pencil text
    this.damageNumbers.push({
      damage,
      x: px + (Math.random() - 0.5) * 40,
      y: py - 70,
      vy: -1.6,
      alpha: 1.0,
      duration: 850,
      born: performance.now()
    });
  }

  setVictory(winnerNum) {
    const loserNum = winnerNum === 1 ? 2 : 1;
    this.fighters[winnerNum].state = 'victory';
    this.fighters[loserNum].state = 'defeat';
  }

  resetFighters() {
    for (let i = 1; i <= 2; i++) {
      const f = this.fighters[i];
      f.state = 'idle';
      f.hp = 100;
      f.attackProgress = 0;
    }
    this.particles = [];
    this.impacts = [];
    this.damageNumbers = [];
    this.shakeIntensity = 0;
  }

  // --- Update Loop ---

  update(now) {
    // 1. Update fighter animation timers
    for (let i = 1; i <= 2; i++) {
      const f = this.fighters[i];
      if (f.state === 'attack') {
        const elapsed = now - f.animTimer;
        f.attackProgress = Math.min(1, elapsed / f.animDuration);
        if (f.attackProgress >= 1) {
          f.state = 'idle';
          f.attackProgress = 0;
        }
      } else if (f.state === 'hurt') {
        if (now - f.animTimer >= f.animDuration) {
          if (f.hp > 0) f.state = 'idle';
          else f.state = 'defeat';
        }
      }
    }

    // 2. Camera shake decay
    if (this.shakeDuration > 0) {
      this.shakeDuration -= 16;
      this.shakeIntensity *= this.shakeDecay;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }

    // 3. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const age = now - p.born;
      if (age >= p.life) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha = 1 - (age / p.life);
    }

    // 4. Update impacts
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const imp = this.impacts[i];
      const age = now - imp.born;
      if (age >= imp.duration) {
        this.impacts.splice(i, 1);
        continue;
      }
      // Scale pop up and fade
      const progress = age / imp.duration;
      imp.scale += (imp.targetScale - imp.scale) * 0.25;
      imp.alpha = 1 - Math.pow(progress, 2);
    }

    // 5. Update damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      const age = now - d.born;
      if (age >= d.duration) {
        this.damageNumbers.splice(i, 1);
        continue;
      }
      d.y += d.vy;
      d.alpha = 1 - (age / d.duration);
    }
  }

  // --- Render Loop ---

  render() {
    const now = performance.now();
    this.update(now);

    const ctx = this.ctx;
    ctx.save();

    // Apply Camera Shake
    if (this.shakeIntensity > 0) {
      const ox = (Math.random() - 0.5) * this.shakeIntensity;
      const oy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(ox, oy);
    }

    // 1. Draw sketchbook paper background
    this.drawNotebookPaper();

    // 2. Draw fighters
    this.drawFighter(1);
    this.drawFighter(2);

    // 3. Draw health bars
    this.drawHealthBar(1);
    this.drawHealthBar(2);

    // 4. Draw graphite particles
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(35, 33, 31, ${p.alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    // 5. Draw comic impact doodles ("POW!", "WHAM!")
    for (const imp of this.impacts) {
      ctx.save();
      ctx.translate(imp.x, imp.y);
      ctx.rotate(imp.rotation);
      ctx.scale(imp.scale, imp.scale);

      // Jagged comic star burst
      ctx.strokeStyle = `rgba(35, 33, 31, ${imp.alpha})`;
      ctx.fillStyle = `rgba(255, 245, 210, ${imp.alpha * 0.85})`;
      ctx.lineWidth = 2.4;

      ctx.beginPath();
      const points = 10;
      for (let p = 0; p < points * 2; p++) {
        const radius = (p % 2 === 0) ? 38 : 18;
        const angle = (p / (points * 2)) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Comic text
      ctx.fillStyle = `rgba(200, 35, 35, ${imp.alpha})`;
      ctx.font = '900 24px "Patrick Hand", "Impact", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(imp.text, 0, 0);

      ctx.restore();
    }

    // 6. Draw floating damage numbers
    for (const d of this.damageNumbers) {
      ctx.save();
      ctx.fillStyle = `rgba(195, 30, 30, ${d.alpha})`;
      ctx.font = 'bold 28px "Patrick Hand", "Comic Sans MS", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`-${d.damage} HP`, d.x, d.y);
      ctx.restore();
    }

    ctx.restore();
  }
}

window.SketchRenderer = SketchRenderer;
