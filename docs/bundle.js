// Hand-written, matches src/*.js above. No build step needed — this is
// the file GitHub Pages actually serves. If you edit src/, mirror the
// change here (see README "Development workflow").
(function () {
  const MASTER_DECK = [
    "The Ace of Shadows", "A Whisper in the Dark", "Sudden Betrayal",
    "Fortune's Favor", "The Last Stand", "Echoes of the Past",
    "A Twist of Fate", "The Silent Guardian", "Reckless Gambit",
    "The Hidden Path", "A Moment of Clarity", "The Broken Oath",
    "Storm on the Horizon", "The Wanderer's Map", "A Debt Repaid",
    "The Iron Resolve", "Fleeting Glory", "The Forgotten Key",
    "A Spark of Hope", "The Long Con", "Shattered Alliance",
    "The Final Gambit", "A Stroke of Luck", "The Quiet Storm",
    "Rising Tide", "The Cunning Trap", "A Second Chance",
    "The Bold Advance", "Whispers of Doubt", "The Golden Opportunity",
    "A Calculated Risk", "The Steady Hand", "Turning Point",
    "The Desperate Measure", "A New Alliance", "The Sharpened Blade",
    "Fading Light", "The Unexpected Ally", "A Costly Mistake",
    "The Grand Deception", "Rally the Troops", "The Empty Promise",
    "A Sudden Reversal", "The Waiting Game", "Bold Ambition",
    "The Last Resort", "A Fragile Truce", "The Master Plan",
    "Unforeseen Consequence", "The Final Hour", "A Glimmer of Truth",
    "The Reluctant Hero", "Chaos Unleashed", "The Patient Predator"
  ];
  const HAND_SIZE = 5;

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function shortId(id) { return id ? id.slice(0, 5) : 'unknown'; }
  const ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function generateShortId() {
    let id = '';
    for (let i = 0; i < 5; i++) {
      id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
    }
    return id;
  }
  const NAME_POOL = [
    'binker', 'bungle', 'chungle', 'bingus', 'binkus',
    'trundle', 'fundus', 'chungus', 'Ted Cruz'
  ];
  function randomName() {
    return NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
  }
  function dealHands(deck, playerIds, handSize) {
    const shuffled = shuffle(deck);
    const hands = {};
    let cursor = 0;
    playerIds.forEach((id) => {
      hands[id] = shuffled.slice(cursor, cursor + handSize);
      cursor += handSize;
    });
    return hands;
  }

  const root = document.getElementById('app');
  const state = {
    peer: null, myId: null, myName: null, isHost: false, hostConn: null,
    conns: {}, players: [], hand: [], board: [], gameStarted: false, gameOver: false
  };

  function nameFor(id) {
    const p = state.players.find((pl) => pl.id === id);
    return p ? p.name : shortId(id);
  }

  function render() {
    if (!state.myId) {
      root.innerHTML = `
        <div class="lobby">
          <h2>P2P Card Game</h2>
          <button id="createBtn">Create Game (Host)</button>
          <div class="join-row">
            <input id="hostIdInput" placeholder="Host ID" maxlength="5" />
            <button id="joinBtn">Join Game</button>
          </div>
        </div>`;
      root.querySelector('#createBtn').onclick = hostGame;
      root.querySelector('#joinBtn').onclick = () => {
        const id = root.querySelector('#hostIdInput').value.trim().toUpperCase();
        if (id) joinGame(id);
      };
      return;
    }

    if (!state.gameStarted) {
      root.innerHTML = `
        <div class="lobby">
          <h2>${state.isHost ? 'Hosting Game' : 'Joined Game'}</h2>
          ${state.isHost ? `<p>Share this Host ID with other players:</p>
          <code class="host-id">${state.myId}</code>` : `<p>Waiting for host to start...</p>`}
          <p>You are: <strong>${state.myName}</strong></p>
          <h4>Players (${state.players.length})</h4>
          <ul>${state.players.map(p => `<li>${p.name}${p.id === state.myId ? ' (you)' : ''}</li>`).join('')}</ul>
          ${state.isHost ? `<button id="startBtn" ${state.players.length < 2 ? 'disabled' : ''}>Start Game</button>` : ''}
        </div>`;
      if (state.isHost) root.querySelector('#startBtn').onclick = startGame;
      return;
    }

    if (state.gameOver) {
      root.innerHTML = `
        <div class="lobby">
          <h2>Game Over</h2>
          <p>A player ran out of cards — the game has ended for everyone.</p>
          <h4>Final Board</h4>
          <div class="board-cards">
            ${state.board.map(p => `<div class="played-card"><span class="player-tag">${nameFor(p.playerId)}</span>${p.card}</div>`).join('')}
          </div>
        </div>`;
      return;
    }

    root.innerHTML = `
      <div class="game-layout">
        <div class="hand-panel">
          <h3>Your Hand</h3>
          ${state.hand.map((c, i) => `
            <div class="card">
              <div class="card-text">${c}</div>
              <div class="card-actions">
                <button class="play-btn" data-idx="${i}">Play</button>
                <button class="complete-btn" data-idx="${i}">Complete</button>
                <button class="slip-btn" data-idx="${i}">Caught Slipping</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="board-panel">
          <h3>Shared Board</h3>
          <div class="board-cards">
            ${state.board.map(p => `<div class="played-card"><span class="player-tag">${nameFor(p.playerId)}</span>${p.card}</div>`).join('')}
          </div>
        </div>
        <div class="player-list">
          <h4>Players</h4>
          ${state.players.map(p => `<span class="player-chip">${p.name}${p.id === state.myId ? ' (you)' : ''}</span>`).join('')}
        </div>
      </div>`;

    root.querySelectorAll('.play-btn').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-idx'));
        const card = state.hand[idx];
        playCard(card);
        state.hand = state.hand.filter((_, i) => i !== idx);
        render();
      });
    });

    root.querySelectorAll('.complete-btn').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-idx'));
        completeCard(idx);
      });
    });

    root.querySelectorAll('.slip-btn').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-idx'));
        slipCard(idx);
      });
    });
  }

  function broadcastToClients(msg, exceptId) {
    Object.entries(state.conns).forEach(([id, conn]) => {
      if (id !== exceptId) conn.send(msg);
    });
  }
  function addPlayer(player) {
    if (!state.players.find((p) => p.id === player.id)) {
      state.players.push(player);
    }
  }
  function removePlayer(id) {
    state.players = state.players.filter((p) => p.id !== id);
    delete state.conns[id];
  }

  function hostGame() {
    state.isHost = true;
    state.myName = randomName();
    attemptHostId();
  }

  // Requests a 5-character host ID from the broker (free public
  // PeerJS signaling service). If it's already taken by another
  // active game, retries with a new random ID.
  function attemptHostId(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 5;
    const desiredId = generateShortId();
    const peer = new Peer(desiredId);
    peer.on('open', (id) => {
      state.peer = peer;
      state.myId = id;
      addPlayer({ id, name: state.myName });
      attachHostConnectionHandler(peer);
      render();
    });
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && attemptsLeft > 0) {
        attemptHostId(attemptsLeft - 1);
      } else {
        alert('Peer error: ' + err.message);
      }
    });
  }

  function attachHostConnectionHandler(peer) {
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        state.conns[conn.peer] = conn;
      });
      conn.on('data', (msg) => handleHostMessage(conn, msg));
      conn.on('close', () => {
        removePlayer(conn.peer);
        broadcastToClients({ type: 'players', players: state.players });
        render();
      });
    });
  }

  function handleHostMessage(conn, msg) {
    if (msg.type === 'hello') {
      addPlayer({ id: conn.peer, name: msg.name });
      broadcastToClients({ type: 'players', players: state.players });
      render();
    } else if (msg.type === 'playCard') {
      applyPlay(conn.peer, msg.card);
    } else if (msg.type === 'handEmpty') {
      applyGameOver();
    }
  }

  function joinGame(hostId) {
    state.isHost = false;
    state.myName = randomName();
    state.peer = new Peer();
    state.peer.on('open', (id) => {
      state.myId = id;
      const conn = state.peer.connect(hostId, { reliable: true });
      conn.on('open', () => {
        state.hostConn = conn;
        conn.send({ type: 'hello', name: state.myName });
        render();
      });
      conn.on('data', (msg) => handleClientMessage(msg));
      conn.on('close', () => alert('Disconnected from host.'));
    });
    state.peer.on('error', (err) => alert('Peer error: ' + err.message));
  }

  function handleClientMessage(msg) {
    if (msg.type === 'players') state.players = msg.players;
    else if (msg.type === 'yourHand') { state.hand = msg.hand; state.gameStarted = true; }
    else if (msg.type === 'cardPlayed') state.board.push({ playerId: msg.playerId, card: msg.card });
    else if (msg.type === 'gameOver') state.gameOver = true;
    render();
  }

  function startGame() {
    const ids = state.players.map((p) => p.id);
    const hands = dealHands(MASTER_DECK, ids, HAND_SIZE);
    state.gameStarted = true;
    state.hand = hands[state.myId];
    Object.entries(state.conns).forEach(([id, conn]) => conn.send({ type: 'yourHand', hand: hands[id] }));
    render();
  }

  function playCard(card) {
    if (state.isHost) applyPlay(state.myId, card);
    else state.hostConn.send({ type: 'playCard', card });
  }

  function applyPlay(playerId, card) {
    state.board.push({ playerId, card });
    broadcastToClients({ type: 'cardPlayed', playerId, card }, playerId);
    render();
  }

  // Removes a card from the local hand entirely.
  function completeCard(idx) {
    state.hand.splice(idx, 1);
    render();
    checkHandEmpty();
  }

  // Swaps a card for a new random one from the master deck — purely
  // local/private, no need to coordinate through the host.
  function slipCard(idx) {
    const replacement = MASTER_DECK[Math.floor(Math.random() * MASTER_DECK.length)];
    state.hand[idx] = replacement;
    render();
  }

  // When a player's hand hits zero, the game ends for everyone.
  function checkHandEmpty() {
    if (state.hand.length === 0 && !state.gameOver) {
      if (state.isHost) applyGameOver();
      else if (state.hostConn) state.hostConn.send({ type: 'handEmpty' });
    }
  }

  function applyGameOver() {
    state.gameOver = true;
    broadcastToClients({ type: 'gameOver' });
    render();
  }

  render();
})();
