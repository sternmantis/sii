// Readable source mirroring docs/bundle.js (kept in sync manually —
// see README, "Development workflow").
import { MASTER_DECK, HAND_SIZE } from './deck.js';
import { dealHands, generateShortId, pickUniqueName } from './utils.js';
import { createPeer, connectToHost } from './peer.js';

export function App(root) {
  const state = {
    peer: null,
    myId: null,
    myName: null,
    isHost: false,
    hostConn: null,       // client -> host connection
    conns: {},            // host -> map of peerId -> connection
    players: [],          // [{ id, name }], host first
    hand: [],
    pool: [],             // host-authoritative: cards removed from any
                           // hand (via Complete or Caught Slipping),
                           // available to be redrawn by anyone
    gameStarted: false,
    gameOver: false
  };

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
          <p>You are: <strong>${state.myName || 'assigning your name...'}</strong></p>
          <h4>Players (${state.players.length})</h4>
          <ul>${state.players.map(p => `<li>${p.name}${p.id === state.myId ? ' (you)' : ''}</li>`).join('')}</ul>
          ${state.isHost ? `<button id="startBtn" ${state.players.length < 2 ? 'disabled' : ''}>Start Game</button>` : ''}
        </div>`;
      if (state.isHost) {
        root.querySelector('#startBtn').onclick = startGame;
      }
      return;
    }

    if (state.gameOver) {
      root.innerHTML = `
        <div class="lobby">
          <h2>Game Over</h2>
          <p>A player ran out of cards — the game has ended for everyone.</p>
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
                <button class="complete-btn" data-idx="${i}">Complete</button>
                <button class="slip-btn" data-idx="${i}">Caught Slipping</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="player-list">
          ${state.players.map(p => `<span class="player-chip">${p.name}${p.id === state.myId ? ' (you)' : ''}</span>`).join('')}
        </div>
      </div>`;

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
      const name = pickUniqueName(state.players.map((p) => p.name));
      addPlayer({ id: conn.peer, name });
      broadcastToClients({ type: 'players', players: state.players });
      render();
    } else if (msg.type === 'cardRemoved') {
      addToPool(msg.card);
      const player = state.players.find((p) => p.id === conn.peer);
      const playerName = player ? player.name : 'A player';
      scheduleAnnouncement(playerName, msg.card);
    } else if (msg.type === 'requestSlip') {
      const newCard = drawReplacement();
      addToPool(msg.oldCard);
      conn.send({ type: 'slipResult', idx: msg.idx, newCard });
    } else if (msg.type === 'handEmpty') {
      applyGameOver();
    }
  }

  function joinGame(hostId) {
    state.isHost = false;
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
      (err) => alert('Peer error: ' + err.message)
    );
  }

  function handleClientMessage(msg) {
    if (msg.type === 'players') {
      state.players = msg.players;
      const me = state.players.find((p) => p.id === state.myId);
      if (me) state.myName = me.name;
    } else if (msg.type === 'yourHand') {
      state.hand = msg.hand;
      state.gameStarted = true;
    } else if (msg.type === 'slipResult') {
      state.hand[msg.idx] = msg.newCard;
    } else if (msg.type === 'gameOver') {
      state.gameOver = true;
    } else if (msg.type === 'announcement') {
      pushAnnouncement(msg.text);
    }
    render();
  }

  function startGame() {
    const ids = state.players.map((p) => p.id);
    const hands = dealHands(MASTER_DECK, ids, HAND_SIZE);
    state.pool = [];
    state.gameStarted = true;
    state.hand = hands[state.myId];
    Object.entries(state.conns).forEach(([id, conn]) => {
      conn.send({ type: 'yourHand', hand: hands[id] });
    });
    render();
  }

  // Removes a card from the local hand entirely. It joins the shared
  // pool of removed cards (so it can be drawn again later by anyone),
  // and starts a 30-second delayed announcement to everyone.
  function completeCard(idx) {
    const removed = state.hand.splice(idx, 1)[0];
    if (state.isHost) {
      addToPool(removed);
      scheduleAnnouncement(state.myName, removed);
    } else {
      state.hostConn.send({ type: 'cardRemoved', card: removed });
    }
    render();
    checkHandEmpty();
  }

  // Swaps a card for a random one drawn from the shared pool of
  // previously removed cards (falling back to the full master deck if
  // the pool is empty). The old card then joins the pool itself, so
  // it too can be drawn again later by anyone.
  function slipCard(idx) {
    const oldCard = state.hand[idx];
    if (state.isHost) {
      const newCard = drawReplacement();
      addToPool(oldCard);
      state.hand[idx] = newCard;
      render();
    } else {
      state.hostConn.send({ type: 'requestSlip', idx, oldCard });
    }
  }

  // Host-only: starts a 30-second timer for a completed card. The
  // player's name and the card text are captured right now, in this
  // closure — so even if that player disconnects before the timer
  // fires, the announcement still goes out on schedule using the
  // data captured here, not a live lookup at fire-time.
  function scheduleAnnouncement(playerName, card) {
    setTimeout(() => {
      const text = `${playerName} has slipped in ${card}`;
      pushAnnouncement(text);
      broadcastToClients({ type: 'announcement', text });
    }, 30000);
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

  // Host-only: the shared, authoritative pool of removed cards.
  function addToPool(card) {
    state.pool.push(card);
  }

  function drawReplacement() {
    if (state.pool.length > 0) {
      const i = Math.floor(Math.random() * state.pool.length);
      return state.pool.splice(i, 1)[0];
    }
    return MASTER_DECK[Math.floor(Math.random() * MASTER_DECK.length)];
  }

  // When a player's hand hits zero, the game ends for everyone.
  function checkHandEmpty() {
    if (state.hand.length === 0 && !state.gameOver) {
      if (state.isHost) {
        applyGameOver();
      } else if (state.hostConn) {
        state.hostConn.send({ type: 'handEmpty' });
      }
    }
  }

  // Host-only: marks the game over locally and tells every client.
  function applyGameOver() {
    state.gameOver = true;
    broadcastToClients({ type: 'gameOver' });
    render();
  }

  render();
}
