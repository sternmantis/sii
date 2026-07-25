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
    hand: [],             // [{ id, text, pending, pendingUntil }]
    handSize: HAND_SIZE,  // host-adjustable: 3, 5, or 10 cards per player
    pendingCompleteId: null, // id of this player's own in-flight Complete, if any
    gameStarted: false,
    gameOver: false,
    winnerName: null,
    autoJoining: false,   // true while auto-joining via a shared link
    pendingHostId: null,
    joinError: null
  };

  let pendingTickInterval = null;
  function startPendingTicker() {
    if (pendingTickInterval) return;
    pendingTickInterval = setInterval(() => {
      if (!state.pendingCompleteId) {
        clearInterval(pendingTickInterval);
        pendingTickInterval = null;
        return;
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
              const secondsLeft = Math.max(0, Math.ceil((c.pendingUntil - Date.now()) / 1000));
              return `
                <div class="card card-pending">
                  <div class="card-text">${c.text}</div>
                  <div class="pending-label">Clearing in ${secondsLeft}s...</div>
                </div>`;
            }
            const completeDisabled = !!state.pendingCompleteId;
            return `
              <div class="card">
                <div class="card-text">${c.text}</div>
                <div class="card-actions">
                  <button class="complete-btn" data-id="${c.id}" ${completeDisabled ? 'disabled' : ''}>Complete</button>
                  <button class="slip-btn" data-id="${c.id}">Caught Slipping</button>
                </div>
              </div>`;
          }).join('')}
        </div>
        <div class="player-list">
          ${state.players.map(p => `<span class="player-chip">${p.name}${p.id === state.myId ? ' (you)' : ''}</span>`).join('')}
        </div>
      </div>`;

    root.querySelectorAll('.complete-btn').forEach((el) => {
      el.addEventListener('click', () => {
        completeCard(el.getAttribute('data-id'));
      });
    });

    root.querySelectorAll('.slip-btn').forEach((el) => {
      el.addEventListener('click', () => {
        slipCard(el.getAttribute('data-id'));
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
      schedulePendingComplete(conn.peer, msg.cardId, msg.card);
    } else if (msg.type === 'requestSlip') {
      const newCard = drawReplacement();
      conn.send({ type: 'slipResult', cardId: msg.cardId, newCard });
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
      state.hand = msg.hand.map((text) => ({ id: generateCardId(), text, pending: false, pendingUntil: null }));
      state.pendingCompleteId = null;
      state.gameStarted = true;
      state.gameOver = false;
      state.winnerName = null;
    } else if (msg.type === 'slipResult') {
      const card = state.hand.find((c) => c.id === msg.cardId);
      if (card) card.text = msg.newCard;
    } else if (msg.type === 'completeResolved') {
      resolveOwnPendingComplete(msg.cardId);
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
    state.hand = hands[state.myId].map((text) => ({ id: generateCardId(), text, pending: false, pendingUntil: null }));
    Object.entries(state.conns).forEach(([id, conn]) => {
      conn.send({ type: 'yourHand', hand: hands[id] });
    });
    render();
  }

  // Starts the 30-second Complete process for one of this player's own
  // cards. The card stays visible (marked pending) until it actually
  // resolves — it isn't removed from the hand until then. While a
  // card is pending, this player can't start Completing another one,
  // but Caught Slipping and every other player remain unaffected.
  function completeCard(cardId) {
    if (state.pendingCompleteId) return;
    const card = state.hand.find((c) => c.id === cardId);
    if (!card || card.pending) return;

    card.pending = true;
    card.pendingUntil = Date.now() + 30000;
    state.pendingCompleteId = cardId;
    startPendingTicker();

    if (state.isHost) {
      schedulePendingComplete(state.myId, cardId, card.text);
    } else {
      state.hostConn.send({ type: 'completeStarted', cardId, card: card.text });
    }
    render();
  }

  // Swaps a card for a new one, drawn uniformly at random from the
  // full master deck. The deck itself is never consumed by dealing or
  // by this draw, so any card — including ones sitting in someone
  // else's hand or already completed — can always come up again for
  // anyone. Not available on a card that's currently pending a
  // Complete.
  function slipCard(cardId) {
    const card = state.hand.find((c) => c.id === cardId);
    if (!card || card.pending) return;
    if (state.isHost) {
      card.text = drawReplacement();
      render();
    } else {
      state.hostConn.send({ type: 'requestSlip', cardId });
    }
  }

  // Host-only: runs the 30-second timer for one player's Complete
  // action. The player's name and the card text are captured right
  // now, in this closure — so even if that player disconnects before
  // the timer fires, the announcement still fires on schedule. Only
  // the final "your card is cleared" notice back to that specific
  // player is skipped if they're no longer connected.
  function schedulePendingComplete(playerId, cardId, cardText) {
    const player = state.players.find((p) => p.id === playerId);
    const playerName = player ? player.name : 'A player';

    setTimeout(() => {
      const text = `${playerName} has slipped in ${cardText}`;
      pushAnnouncement(text);
      broadcastToClients({ type: 'announcement', text });

      if (playerId === state.myId) {
        resolveOwnPendingComplete(cardId);
      } else if (state.conns[playerId]) {
        state.conns[playerId].send({ type: 'completeResolved', cardId });
      }
    }, 30000);
  }

  // Called on the completing player's own client once their card's
  // 30-second timer has actually elapsed: only now does it leave the
  // hand, and only now is the hand checked for the win condition.
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
  // the whole deck, and anything already in play or already completed
  // remains just as likely to come up as anything else.
  function drawReplacement() {
    return MASTER_DECK[Math.floor(Math.random() * MASTER_DECK.length)];
  }

  // When a player's hand hits zero — which, for a Complete action,
  // only happens once its 30-second timer has actually resolved — the
  // game ends for everyone, naming that player as the winner.
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
