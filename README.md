# TypeFight — 1v1 Pencil-Sketch Typing Battle Game

> **Type Fast. Strike First.**

A fast-paced 1v1 typing combat duel rendered in an authentic notebook pencil-sketch aesthetic. Typing speed, accuracy, and combo streaks directly power combat strikes in real time.

---

## 🎮 Game Concept

Two hand-drawn pencil fighters face off on opposite sides of a notebook arena. Words appear directly above their heads. Typing the displayed words correctly triggers dynamic attack animations that damage your opponent. The player who depletes the opponent's 100 HP to 0 wins!

### Combat Formula:
- **Base Damage:** 10
- **Speed Bonus:** Up to +12 bonus damage based on WPM tiers (0-20: +0, 21-40: +2, 41-60: +5, 61-80: +8, 81+: +12).
- **Accuracy Multiplier:** 95%+ grants a 1.25x damage multiplier (80-89%: 1.0x, <80%: 0.75x).
- **Combo Multiplier:** Up to 1.5x damage for high consecutive word streaks.
- **Mistakes:** Breaking rhythm breaks your active combo!
- **Dynamic Attack Animations:** Higher typing WPM produces faster, snappier attack animations.

---

## 🎨 Pencil-Sketch Art Direction

- **Notebook Paper Canvas:** Warm off-white paper, horizontal ruled blue lines, vertical red margin, and notebook spiral binding holes.
- **Rough Pencil Fighters:** Hand-drawn stickman duelists with spiky anime hair, ninja headbands, and sharpened #2 pencil swords.
- **Organic Motion:** Procedural micro-jitter evokes a stop-motion flipbook feel.
- **Comic Impact Effects:** Handwritten popups (`"POW!"`, `"WHAM!"`, `"SCRATCH!"`, `"HIT!"`), floating `-17 HP` numbers, graphite lead dust particles, and screen shake.
- **Crosshatched Health Bars:** Hand-sketched HP bars with graphite shading.

---

## 🕹️ Game Modes

### 1. Offline Mode
- **Player vs AI:** 3 difficulty tiers with human-like simulated typing delays, random typos, and backspace error recovery:
  - **Easy:** ~30 WPM, 85% accuracy
  - **Normal:** ~60 WPM, 93% accuracy
  - **Hard:** ~95 WPM, 97% accuracy
- **Same-Keyboard PvP (Split Keyboard):** Two players share one keyboard simultaneously!
  - **Player 1 (Left hand):** `Q W E R T A S D F G Z X C V B`
  - **Player 2 (Right hand):** `Y U I O P H J K L N M`

### 2. Online Mode (1v1)
- Authoritative Node.js + Socket.IO server.
- Room code matchmaking (e.g. `X7K4P`) with one-click copy button.
- Synchronized ready lobby and 3-2-1-FIGHT countdown.
- Server-side anti-cheat validation (rejects inhuman keystroke speeds `<45ms/char`).
- Complete post-battle statistics comparison and rematch system.

---

## 🔊 Audio Design
100% procedural sound synthesis built on the Web Audio API — zero external audio dependencies:
- Pencil keystroke scritches & typewriter clicks
- Pencil lead snap on word completion
- Attack sword swish
- Punch impact thud
- Ascending combo bell chime
- Pre-battle countdown beeps & fight gong
- Victory fanfare

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)

### Installation
```bash
# Clone the repository
git clone https://github.com/Bvs2006/typefight.git
cd typefight

# Install dependencies
npm install

# Run automated tests
npm test

# Start the server
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```
