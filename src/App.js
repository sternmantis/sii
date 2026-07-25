// Readable source mirroring public/bundle.js (kept in sync manually —
// see README, "Development workflow").
import { MASTER_DECK, HAND_SIZE } from './deck.js';
import { dealHands, shortId, generateShortId } from './utils.js';
import { createPeer, connectToHost } from './peer.js';

export function App(root) {
  const state = {
    peer: null,
    myId: null,
    isHost: false,
    hostConn: null,       // client -> host connection
    conns: {},            // host -> map of peerId -> connection
    players: [],          // ordered list of peerIds (host first)
    hand: [],
    board: [],
    gameStarted: false
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
          <h4>Players (${state.players.length})</h4>
          <ul>${state.players.map(id => `<li>${shortId(id)}${id === state.myId ? ' (you)' : ''}</li>`).join('')}</ul>
          ${state.isHost ? `<button id="startBtn" ${state.players.length < 2 ? 'disabled' : ''}>Start Game</button>` : ''}
        </div>`;
      if (state.isHost) {
        root.querySelector('#startBtn').onclick = startGame;
      }
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

  function addPlayer(id) {
    if (!state.players.includes(id)) state.players.push(id);
  }

  function removePlayer(id) {
    state.players = state.players.filter((p) => p !== id);
    delete state.conns[id];
  }

  function hostGame() {
    state.isHost = true;
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
        addPlayer(id);
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
        addPlayer(conn.peer);
        broadcastToClients({ type: 'players', players: state.players });
        render();
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
    if (msg.type === 'playCard') {
      applyPlay(conn.peer, msg.card);
    }
  }

  function joinGame(hostId) {
    state.isHost = false;
    state.peer = createPeer(
      (id) => {
        state.myId = id;
        connectToHost(state.peer, hostId, (conn) => {
          state.hostConn = conn;
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
    }
    render();
  }

  function startGame() {
    const hands = dealHands(MASTER_DECK, state.players, HAND_SIZE);
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

  render();
}
