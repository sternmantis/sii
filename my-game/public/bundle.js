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
    peer: null, myId: null, isHost: false, hostConn: null,
    conns: {}, players: [], hand: [], board: [], gameStarted: false
  };

  function render() {
    if (!state.myId) {
      root.innerHTML = `
        <div class="lobby">
          <h2>P2P Card Game</h2>
          <button id="createBtn">Create Game (Host)</button>
          <div class="join-row">
            <input id="hostIdInput" placeholder="Host ID" />
            <button id="joinBtn">Join Game</button>
          </div>
        </div>`;
      root.querySelector('#createBtn').onclick = hostGame;
      root.querySelector('#joinBtn').onclick = () => {
        const id = root.querySelector('#hostIdInput').value.trim();
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
          <h4>Players (${state.players.length})</h4>
          <ul>${state.players.map(id => `<li>${shortId(id)}${id === state.myId ? ' (you)' : ''}</li>`).join('')}</ul>
          ${state.isHost ? `<button id="startBtn" ${state.players.length < 2 ? 'disabled' : ''}>Start Game</button>` : ''}
        </div>`;
      if (state.isHost) root.querySelector('#startBtn').onclick = startGame;
      return;
    }

    root.innerHTML = `
      <div class="game-layout">
        <div class="hand-panel">
          <h3>Your Hand</h3>
          ${state.hand.map((c, i) => `<div class="card" data-card="${i}">${c}</div>`).join('')}
        </div>
        <div class="board-panel">
          <h3>Shared Board</h3>
          <div class="board-cards">
            ${state.board.map(p => `<div class="played-card"><span class="player-tag">${shortId(p.playerId)}</span>${p.card}</div>`).join('')}
          </div>
        </div>
        <div class="player-list">
          <h4>Players</h4>
          ${state.players.map(id => `<span class="player-chip">${shortId(id)}${id === state.myId ? ' (you)' : ''}</span>`).join('')}
        </div>
      </div>`;

    root.querySelectorAll('.card').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-card'));
        const card = state.hand[idx];
        playCard(card);
        state.hand = state.hand.filter((_, i) => i !== idx);
        render();
      });
    });
  }

  function broadcastToClients(msg, exceptId) {
    Object.entries(state.conns).forEach(([id, conn]) => {
      if (id !== exceptId) conn.send(msg);
    });
  }
  function addPlayer(id) { if (!state.players.includes(id)) state.players.push(id); }
  function removePlayer(id) {
    state.players = state.players.filter((p) => p !== id);
    delete state.conns[id];
  }

  function hostGame() {
    state.isHost = true;
    state.peer = new Peer(); // PeerJS free public broker (signaling only)
    state.peer.on('open', (id) => {
      state.myId = id;
      addPlayer(id);
      render();
    });
    state.peer.on('error', (err) => alert('Peer error: ' + err.message));
    state.peer.on('connection', (conn) => {
      conn.on('open', () => {
        state.conns[conn.peer] = conn;
        addPlayer(conn.peer);
        broadcastToClients({ type: 'players', players: state.players });
        render();
      });
      conn.on('data', (msg) => {
        if (msg.type === 'playCard') applyPlay(conn.peer, msg.card);
      });
      conn.on('close', () => {
        removePlayer(conn.peer);
        broadcastToClients({ type: 'players', players: state.players });
        render();
      });
    });
  }

  function joinGame(hostId) {
    state.isHost = false;
    state.peer = new Peer();
    state.peer.on('open', (id) => {
      state.myId = id;
      const conn = state.peer.connect(hostId, { reliable: true });
      conn.on('open', () => {
        state.hostConn = conn;
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
    render();
  }

  function startGame() {
    const hands = dealHands(MASTER_DECK, state.players, HAND_SIZE);
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

  render();
})();
