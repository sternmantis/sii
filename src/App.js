// Readable source mirroring docs/bundle.js (kept in sync manually —
// see README, "Development workflow").
import { MASTER_DECK, HAND_SIZE } from './deck.js';
import { dealHands, shortId, generateShortId, randomName } from './utils.js';
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
    board: [],
    gameStarted: false,
    gameOver: false
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
    state.peer = createPeer(
      (id) => {
        state.myId = id;
        connectToHost(state.peer, hostId, (conn) => {
          state.hostConn = conn;
          conn.send({ type: 'hello', name: state.myName });
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
    } else if (msg.type === 'yourHand') {
      state.hand = msg.hand;
      state.gameStarted = true;
    } else if (msg.type === 'cardPlayed') {
      state.board.push({ playerId: msg.playerId, card: msg.card });
    } else if (msg.type === 'gameOver') {
      state.gameOver = true;
    }
    render();
  }

  function startGame() {
    const ids = state.players.map((p) => p.id);
    const hands = dealHands(MASTER_DECK, ids, HAND_SIZE);
    state.gameStarted = true;
    state.hand = hands[state.myId];
    Object.entries(state.conns).forEach(([id, conn]) => {
      conn.send({ type: 'yourHand', hand: hands[id] });
    });
    render();
  }

  // Called when the LOCAL player plays a card (host or client).
  function playCard(card) {
    if (state.isHost) {
      applyPlay(state.myId, card);
    } else {
      state.hostConn.send({ type: 'playCard', card });
    }
  }

  // Host-authoritative: update board and broadcast to everyone else.
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

  // Swaps a card for a new random one from the master deck. This is a
  // purely local/private action — no one else sees your hand anyway,
  // so there's no need to coordinate the swap through the host.
  function slipCard(idx) {
    const replacement = MASTER_DECK[Math.floor(Math.random() * MASTER_DECK.length)];
    state.hand[idx] = replacement;
    render();
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
