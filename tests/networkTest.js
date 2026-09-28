const { io } = require('socket.io-client');
const assert = require('assert');

async function testOnlineMultiplayer() {
  console.log('--- Starting Online Multiplayer Integration Test ---');
  const serverUrl = 'http://localhost:3000';

  const client1 = io(serverUrl);
  const client2 = io(serverUrl);

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
  });
  console.log('✓ Both test clients connected to server');

  // 1. Client 1 creates room
  const createRes = await new Promise((resolve) => {
    client1.emit('create_room', { difficulty: 'easy' }, resolve);
  });
  assert(createRes.success, 'Room creation failed');
  assert(createRes.roomCode && createRes.roomCode.length === 5, 'Invalid room code');
  console.log(`✓ Room created with code: ${createRes.roomCode}`);

  // 2. Client 2 joins room
  const joinRes = await new Promise((resolve) => {
    client2.emit('join_room', { roomCode: createRes.roomCode }, resolve);
  });
  assert(joinRes.success, 'Room join failed');
  assert.strictEqual(joinRes.playerNumber, 2, 'Player 2 should have playerNumber 2');
  console.log('✓ Client 2 joined room successfully');

  // 3. Both players ready up
  const countdownPromise = new Promise((resolve) => {
    client1.on('countdown_start', (data) => {
      resolve(data);
    });
  });

  client1.emit('player_ready');
  client2.emit('player_ready');

  const countdownData = await countdownPromise;
  console.log(`✓ Countdown started: ${countdownData.durationSeconds}s`);

  // 4. Wait for match_start
  const matchStartData = await new Promise((resolve) => {
    client1.on('match_start', (data) => {
      resolve(data);
    });
  });
  assert(matchStartData.words[1] && matchStartData.words[2], 'Words not assigned');
  console.log(`✓ Match started with initial words: P1="${matchStartData.words[1]}", P2="${matchStartData.words[2]}"`);

  // 5. Test word completed & battle attack
  const attackPromise = new Promise((resolve) => {
    client2.on('battle_attack', (data) => {
      resolve(data);
    });
  });

  const p1Word = matchStartData.words[1];
  client1.emit('word_completed', {
    word: p1Word,
    durationMs: 1200,
    wpm: 65,
    accuracy: 96,
    combo: 1,
    correctChars: p1Word.length,
    totalKeystrokes: p1Word.length
  });

  const attackData = await attackPromise;
  assert.strictEqual(attackData.attacker, 1, 'Attacker should be 1');
  assert.strictEqual(attackData.defender, 2, 'Defender should be 2');
  assert(attackData.damage > 0, 'Damage must be positive');
  assert.strictEqual(attackData.hp[2], 100 - attackData.damage, 'Defender HP must be deducted');
  console.log(`✓ Battle attack event confirmed: P1 dealt ${attackData.damage} damage to P2. P2 HP: ${attackData.hp[2]}`);

  // 6. Test Anti-cheat rejection
  const p2Word = matchStartData.words[2];
  const cheatRes = await new Promise((resolve) => {
    client2.emit('word_completed', {
      word: p2Word,
      durationMs: 10, // impossible time!
      wpm: 800,
      accuracy: 100,
      combo: 1,
      correctChars: p2Word.length,
      totalKeystrokes: p2Word.length
    }, resolve);
  });
  assert(cheatRes && cheatRes.error, 'Anti-cheat should reject cheat payload');
  console.log(`✓ Anti-cheat test confirmed: ${cheatRes.error}`);

  client1.disconnect();
  client2.disconnect();

  console.log('✓ All multiplayer integration tests passed successfully!');
  process.exit(0);
}

testOnlineMultiplayer().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
