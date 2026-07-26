// Readable source mirroring docs/bundle.js (kept in sync manually —
// see README, "Development workflow").
import { MASTER_DECK, HAND_SIZE } from './deck.js';
import { dealHands, generateShortId, pickUniqueName } from './utils.js';
import { createPeer, connectToHost } from './peer.js';

export function App(root) {
  let cardIdCounter = 0;
  function generateCardId() {
    cardIdCounter += 1;
    return 'c' + cardIdCounter + '-' + Math.random().toString(36).slice(2, 6);
  }

  const state = {
    peer: null,
    myId: null,
    myName: null,
    isHost: false,
    hostConn: null,       // client -> host connection
    conns: {},            // host -> map of peerId -> connection
    players: [],          // [{ id, name }], host first
    hand: [],             // [{ id, text, pending, remainingMs }]
    handSize: HAND_SIZE,  // host-adjustable: 3, 5, or 10 cards per player
    pendingCompleteId: null, // id of this player's own in-flight Complete, if any
    slipCheckActive: false,  // true while a "Catch a Slip" challenge has
                              // paused every pending Complete, everywhere
    gameStarted: false,
    gameOver: false,
    winnerName: null,
    autoJoining: false,   // true while auto-joining via a shared link
    pendingHostId: null,
    joinError: null
  };

  // Host-only: cardId -> { playerId, cardText, remainingMs, timeoutId, startedAt }
  // Tracks every in-flight Complete across every player so a global
  // "Catch a Slip" can pause and resume all of them together.
  const pendingRegistry = {};

  function startPendingTimer(playerId, cardId, cardText, durationMs) {
    pendingRegistry[cardId] = { playerId, cardText, remainingMs: durationMs, timeoutId: null, startedAt: null };
    if (!state.slipCheckActive) {
      runPendingTimer(cardId);
    }
    // If a slip-check is already in progress when this timer starts,
    // it's left paused (no timeoutId) until that check resolves.
  }

  function runPendingTimer(cardId) {
    const entry = pendingRegistry[cardId];
    if (!entry) return;
    entry.startedAt = Date.now();
    entry.timeoutId = setTimeout(() => {
      delete pendingRegistry[cardId];
      resolvePendingComplete(entry.playerId, cardId, entry.cardText);
    }, entry.remainingMs);
  }

  function pauseAllPendingTimers() {
    Object.values(pendingRegistry).forEach((entry) => {
      if (entry.timeoutId) {
        clearTimeout(entry.timeoutId);
        entry.remainingMs = Math.max(0, entry.remainingMs - (Date.now() - entry.startedAt));
        entry.timeoutId = null;
        entry.startedAt = null;
      }
    });
  }

  function resumeAllPendingTimers() {
    Object.keys(pendingRegistry).forEach((cardId) => {
      const entry = pendingRegistry[cardId];
      if (entry && entry.timeoutId === null) runPendingTimer(cardId);
    });
  }

  function cancelPendingTimer(cardId) {
    const entry = pendingRegistry[cardId];
    if (entry) {
      if (entry.timeoutId) clearTimeout(entry.timeoutId);
      delete pendingRegistry[cardId];
    }
  }

  // Host-only: a card's 30 seconds have genuinely run out. Announces
  // it to everyone and tells the owning player's client (if it's not
  // this host itself) to actually resolve its own hand.
  function resolvePendingComplete(playerId, cardId, cardText) {
    const player = state.players.find((p) => p.id === playerId);
    const playerName = player ? player.name : 'A player';
    const text = `${playerName} has slipped in ${cardText}`;
    pushAnnouncement(text);
    broadcastToClients({ type: 'announcement', text });

    if (playerId === state.myId) {
      resolveOwnPendingComplete(cardId);
    } else if (state.conns[playerId]) {
      state.conns[playerId].send({ type: 'completeResolved', cardId });
    }
  }

  // Host-only: any player calling "Catch a Slip" pauses every pending
  // Complete, everywhere, until someone gets caught or it's called off.
  function triggerSlipCheck() {
    if (state.slipCheckActive) return;
    state.slipCheckActive = true;
    pauseAllPendingTimers();
    broadcastToClients({ type: 'slipCheckState', active: true });
    render();
  }

  // Host-only: resolves a slip-check — either "Not Caught" (nothing
  // found, resume as normal) or because a specific card just got
  // "Caught!"ed. Either way, everything paused resumes.
  function resolveSlipCheck() {
    if (!state.slipCheckActive) return;
    state.slipCheckActive = false;
    resumeAllPendingTimers();
    broadcastToClients({ type: 'slipCheckState', active: false });
    render();
  }

  let pendingTickInterval = null;
  function startPendingTicker() {
    if (pendingTickInterval) return;
    pendingTickInterval = setInterval(() => {
      if (!state.pendingCompleteId) {
        clearInterval(pendingTickInterval);
        pendingTickInterval = null;
        return;
      }
      if (!state.slipCheckActive) {
        const card = state.hand.find((c) => c.id === state.pendingCompleteId);
        if (card) card.remainingMs = Math.max(0, card.remainingMs - 1000);
      }
      render();
    }, 1000);
  }

  function render() {
    if (!state.myId) {
      if (state.autoJoining) {
        root.innerHTML = `
          <div class="lobby">
            <h2>Joining Game...</h2>
            <p>Connecting to host <strong>${state.pendingHostId}</strong></p>
          </div>`;
        return;
      }
      root.innerHTML = `
        <div class="lobby">
          <h2>Slip It In</h2>
          ${state.joinError ? `<p class="error-text">${state.joinError}</p>` : ''}
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
          <code class="host-id">${state.myId}</code>
          <div><button id="copyLinkBtn">Copy Invite Link</button></div>` : `<p>Waiting for host to start...</p>`}
          <p>You are: <strong>${state.myName || 'assigning your name...'}</strong></p>
          <h4>Players (${state.players.length})</h4>
          <ul>${state.players.map(p => `<li>${p.name}${p.id === state.myId ? ' (you)' : ''}</li>`).join('')}</ul>
          ${state.isHost ? `
            <div class="hand-size-row">
              <label for="handSizeSelect">Cards per hand:</label>
              <select id="handSizeSelect">
                <option value="3" ${state.handSize === 3 ? 'selected' : ''}>3</option>
                <option value="5" ${state.handSize === 5 ? 'selected' : ''}>5</option>
                <option value="10" ${state.handSize === 10 ? 'selected' : ''}>10</option>
              </select>
            </div>` : ''}
          ${state.isHost ? `<button id="startBtn" ${state.players.length < 2 ? 'disabled' : ''}>Start Game</button>` : ''}
        </div>`;
      if (state.isHost) {
        root.querySelector('#startBtn').onclick = startGame;
        root.querySelector('#handSizeSelect').onchange = (e) => {
          state.handSize = Number(e.target.value);
        };
        const copyBtn = root.querySelector('#copyLinkBtn');
        copyBtn.onclick = () => {
          const link = `${window.location.origin}${window.location.pathname}?host=${state.myId}`;
          navigator.clipboard.writeText(link).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Invite Link'; }, 2000);
          }).catch(() => {
            alert('Could not copy automatically. Invite link:\n' + link);
          });
        };
      }
      return;
    }

    if (state.gameOver) {
      root.innerHTML = `
        <div class="lobby">
          <h2>Game Over</h2>
          <p><strong>${state.winnerName || 'A player'}</strong> ran out of cards and wins!</p>
          ${state.isHost
            ? `<button id="newGameBtn">Start New Game</button>`
            : `<p>Waiting for the host to start a new game...</p>`}
        </div>`;
      if (state.isHost) {
        root.querySelector('#newGameBtn').onclick = startGame;
      }
      return;
    }

    root.innerHTML = `
      <div class="game-layout">
        <div class="hand-panel">
          <h3>Your Hand</h3>
          ${state.hand.map((c) => {
            if (c.pending) {
              const secondsLeft = Math.ceil((c.remainingMs || 0) / 1000);
              return `
                <div class="card card-pending">
                  <div class="card-text">${c.text}</div>
                  <div class="pending-label">${state.slipCheckActive ? 'Frozen — someone called Catch a Slip!' : `Clearing in ${secondsLeft}s...`}</div>
                  <div class="card-actions">
                    <button class="catch-btn" data-id="${c.id}">Caught!</button>
                  </div>
                </div>`;
            }
            const completeDisabled = !!state.pendingCompleteId;
            return `
              <div class="card">
                <div class="card-text">${c.text}</div>
                <div class="card-actions">
                  <button class="complete-btn" data-id="${c.id}" ${completeDisabled ? 'disabled' : ''}>Complete</button>
                </div>
              </div>`;
          }).join('')}
        </div>
        <div class="footer-bar">
          <div class="player-list">
            ${state.players.map(p => `<span class="player-chip">${p.name}${p.id === state.myId ? ' (you)' : ''}</span>`).join('')}
          </div>
          <div class="footer-actions">
            <button id="drawCardBtn" class="draw-btn">Draw 1 Card</button>
            ${state.slipCheckActive
              ? `<button id="notCaughtBtn" class="not-caught-btn">Not Caught</button>`
              : `<button id="catchSlipBtn" class="catch-slip-btn">Catch a Slip</button>`}
          </div>
        </div>
      </div>`;

    root.querySelectorAll('.complete-btn').forEach((el) => {
      el.addEventListener('click', () => {
        completeCard(el.getAttribute('data-id'));
      });
    });

    root.querySelectorAll('.catch-btn').forEach((el) => {
      el.addEventListener('click', () => {
        catchCard(el.getAttribute('data-id'));
      });
    });

    root.querySelector('#drawCardBtn').onclick = () => {
      drawOneCard();
    };

    const catchSlipBtn = root.querySelector('#catchSlipBtn');
    if (catchSlipBtn) catchSlipBtn.onclick = () => catchASlip();

    const notCaughtBtn = root.querySelector('#notCaughtBtn');
    if (notCaughtBtn) notCaughtBtn.onclick = () => notCaught();
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
    state.myName = pickUniqueName([]);
    warnBeforeUnload();
    attemptHostId();
  }

  // Warns the host before they navigate away, refresh, or close the
  // tab, since doing so drops every connected player. Browsers no
  // longer allow a custom message in this dialog, but they still show
  // their own built-in confirmation prompt.
  function warnBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });
  }

  // Requests a 5-character host ID from the broker. If it's already
  // taken by another active game, retries with a new random ID.
  function attemptHostId(attemptsLeft = 5) {
    const desiredId = generateShortId();
    const peer = createPeer(
      (id) => {
        state.peer = peer;
        state.myId = id;
        addPlayer({ id, name: state.myName });
        attachHostConnectionHandler(peer);
        render();
      },
      (err) => {
        if (err.type === 'unavailable-id' && attemptsLeft > 0) {
          attemptHostId(attemptsLeft - 1);
        } else {
          alert('Peer error: ' + err.message);
        }
      },
      desiredId
    );
  }

  function attachHostConnectionHandler(peer) {
    peer.on('connection', (conn) => {
      // Registered immediately (not inside conn.on('open')) so a
      // message that arrives right at connection time can never race
      // ahead of state.conns being populated for this player.
      state.conns[conn.peer] = conn;
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
      const name = pickUniqueName(state.players.map((p) => p.name));
      addPlayer({ id: conn.peer, name });
      broadcastToClients({ type: 'players', players: state.players });
      render();
    } else if (msg.type === 'completeStarted') {
      startPendingTimer(conn.peer, msg.cardId, msg.card, 30000);
    } else if (msg.type === 'catchSlip') {
      cancelPendingTimer(msg.cardId);
      const newCard = drawReplacement();
      conn.send({ type: 'slipResult', cardId: msg.cardId, newCard });
      if (state.slipCheckActive) resolveSlipCheck();
    } else if (msg.type === 'requestDraw') {
      const newCard = drawReplacement();
      conn.send({ type: 'drawResult', newCard });
    } else if (msg.type === 'catchASlipRequest') {
      triggerSlipCheck();
    } else if (msg.type === 'notCaughtRequest') {
      resolveSlipCheck();
    } else if (msg.type === 'handEmpty') {
      const player = state.players.find((p) => p.id === conn.peer);
      const winnerName = player ? player.name : 'A player';
      applyGameOver(winnerName);
    }
  }

  function joinGame(hostId, opts = {}) {
    state.isHost = false;
    state.pendingHostId = hostId;
    if (opts.auto) state.autoJoining = true;
    state.peer = createPeer(
      (id) => {
        state.myId = id;
        connectToHost(state.peer, hostId, (conn) => {
          state.hostConn = conn;
          conn.send({ type: 'hello' });
          conn.on('data', (msg) => handleClientMessage(msg));
          conn.on('close', () => alert('Disconnected from host.'));
          render();
        });
      },
      (err) => {
        state.autoJoining = false;
        state.joinError = `Could not connect to "${hostId}" (${err.message}). You can try entering the Host ID manually below.`;
        render();
      }
    );
  }

  // Auto-joins if the page was opened via a shared invite link
  // (?host=XXXXX). Falls back to the normal manual-entry lobby if
  // the link is missing, malformed, or the connection fails.
  function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const hostParam = params.get('host');
    if (hostParam) {
      joinGame(hostParam.trim().toUpperCase(), { auto: true });
    }
  }

  function handleClientMessage(msg) {
    if (msg.type === 'players') {
      state.players = msg.players;
      const me = state.players.find((p) => p.id === state.myId);
      if (me) state.myName = me.name;
    } else if (msg.type === 'yourHand') {
      state.hand = msg.hand.map((text) => ({ id: generateCardId(), text, pending: false }));
      state.pendingCompleteId = null;
      state.slipCheckActive = false;
      state.gameStarted = true;
      state.gameOver = false;
      state.winnerName = null;
    } else if (msg.type === 'slipResult') {
      const card = state.hand.find((c) => c.id === msg.cardId);
      if (card) card.text = msg.newCard;
    } else if (msg.type === 'drawResult') {
      state.hand.push({ id: generateCardId(), text: msg.newCard, pending: false });
    } else if (msg.type === 'completeResolved') {
      resolveOwnPendingComplete(msg.cardId);
    } else if (msg.type === 'slipCheckState') {
      state.slipCheckActive = msg.active;
    } else if (msg.type === 'gameOver') {
      state.gameOver = true;
      state.winnerName = msg.winnerName;
    } else if (msg.type === 'announcement') {
      pushAnnouncement(msg.text);
    }
    render();
  }

  function startGame() {
    const ids = state.players.map((p) => p.id);
    const hands = dealHands(MASTER_DECK, ids, state.handSize);
    state.gameStarted = true;
    state.gameOver = false;
    state.winnerName = null;
    state.pendingCompleteId = null;
    state.slipCheckActive = false;
    state.hand = hands[state.myId].map((text) => ({ id: generateCardId(), text, pending: false }));
    Object.entries(state.conns).forEach(([id, conn]) => {
      conn.send({ type: 'yourHand', hand: hands[id] });
    });
    render();
  }

  // Starts the 30-second Complete process for one of this player's own
  // cards. The card stays visible (marked pending) until it actually
  // resolves. While a card is pending, this player can't start
  // Completing another one, but every other player remains unaffected
  // — until someone calls "Catch a Slip", which pauses everyone's
  // pending cards at once.
  function completeCard(cardId) {
    if (state.pendingCompleteId) return;
    const card = state.hand.find((c) => c.id === cardId);
    if (!card || card.pending) return;

    card.pending = true;
    card.remainingMs = 30000;
    state.pendingCompleteId = cardId;
    startPendingTicker();

    if (state.isHost) {
      startPendingTimer(state.myId, cardId, card.text, 30000);
    } else {
      state.hostConn.send({ type: 'completeStarted', cardId, card: card.text });
    }
    render();
  }

  // Cancels an in-flight Complete countdown early and draws a new
  // random card in its place. No announcement fires, since the
  // Complete never actually resolved. If a "Catch a Slip" challenge
  // was in progress, being Caught! resolves it — everyone else's
  // paused timers resume.
  function catchCard(cardId) {
    const card = state.hand.find((c) => c.id === cardId);
    if (!card || !card.pending) return;

    card.pending = false;
    if (state.pendingCompleteId === cardId) {
      state.pendingCompleteId = null;
      if (pendingTickInterval) {
        clearInterval(pendingTickInterval);
        pendingTickInterval = null;
      }
    }

    if (state.isHost) {
      cancelPendingTimer(cardId);
      card.text = drawReplacement();
      if (state.slipCheckActive) resolveSlipCheck();
    } else {
      state.hostConn.send({ type: 'catchSlip', cardId });
    }
    render();
  }

  // Adds one extra randomly-drawn card to this player's hand, growing
  // it by one — not a swap, just an additional card.
  function drawOneCard() {
    if (state.isHost) {
      const text = drawReplacement();
      state.hand.push({ id: generateCardId(), text, pending: false });
      render();
    } else {
      state.hostConn.send({ type: 'requestDraw' });
    }
  }

  // Calls a "Catch a Slip" challenge: pauses every pending Complete,
  // for every player, until someone gets Caught! or it's called off
  // with Not Caught. Anyone can call this — the whole point is that
  // hands are private, so you never know for certain who (if anyone)
  // currently has a card counting down.
  function catchASlip() {
    if (state.isHost) {
      triggerSlipCheck();
    } else {
      state.hostConn.send({ type: 'catchASlipRequest' });
    }
  }

  // Calls off an active "Catch a Slip" challenge with no card caught —
  // every paused timer resumes exactly where it left off.
  function notCaught() {
    if (state.isHost) {
      resolveSlipCheck();
    } else {
      state.hostConn.send({ type: 'notCaughtRequest' });
    }
  }

  // Called on the completing player's own client once their card's
  // timer has actually elapsed: only now does it leave the hand, and
  // only now is the hand checked for the win condition.
  function resolveOwnPendingComplete(cardId) {
    state.hand = state.hand.filter((c) => c.id !== cardId);
    if (state.pendingCompleteId === cardId) {
      state.pendingCompleteId = null;
      if (pendingTickInterval) {
        clearInterval(pendingTickInterval);
        pendingTickInterval = null;
      }
    }
    render();
    checkHandEmpty();
  }

  // Shows a transient toast notification. Implemented as a DOM overlay
  // outside of #app so it survives the full-replace re-renders that
  // the rest of the UI does, and doesn't need to be threaded through
  // every render() branch.
  function pushAnnouncement(text) {
    let container = document.getElementById('announcements');
    if (!container) {
      container = document.createElement('div');
      container.id = 'announcements';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'announcement-toast';
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  // The deck itself is never consumed — dealing only copies out of it,
  // never removes from it — so every draw samples uniformly across
  // the whole deck.
  function drawReplacement() {
    return MASTER_DECK[Math.floor(Math.random() * MASTER_DECK.length)];
  }

  // When a player's hand hits zero — which, for a Complete action,
  // only happens once its timer has actually resolved — the game
  // ends for everyone, naming that player as the winner.
  function checkHandEmpty() {
    if (state.hand.length === 0 && !state.gameOver) {
      if (state.isHost) {
        applyGameOver(state.myName);
      } else if (state.hostConn) {
        state.hostConn.send({ type: 'handEmpty' });
      }
    }
  }

  // Host-only: marks the game over locally, records who won, and
  // tells every client.
  function applyGameOver(winnerName) {
    state.gameOver = true;
    state.winnerName = winnerName;
    broadcastToClients({ type: 'gameOver', winnerName });
    render();
  }

  initFromUrl();
  render();
}
