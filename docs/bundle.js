// Hand-written, matches src/*.js above. No build step needed — this is
// the file GitHub Pages actually serves. If you edit src/, mirror the
// change here (see README "Development workflow").
(function () {
  const MASTER_DECK = [
"pocket jerky", "man glitter", "gravy tuxedo", "emotional lasagna",
  "backup mustache", "car jerky", "beef curtains", "moon jerky",
  "wizard chili", "goblin taxes", "raccoon dues", "thunder cape",
  "casserole diplomacy", "jerky negotiations", "mall wizardry", "elevator karaoke",
  "confetti insurance", "yard sale karma", "foot massage voucher", "gym membership curse",
  "carpool prophecy", "birthday cake tax", "lawn gnome census", "thermostat conspiracy",
  "printer mood swings", "storm cellar confidence", "umbrella confidence", "competitive lawn mowing",
  "weather psychic retirement", "karaoke feud", "book club initiation", "glitter shipment",
  "miracle insurance", "ghost tour receipt", "yard sale empire", "confetti cult",
  "nap schedule union", "snack thief apology", "team-building grudge", "thermostat war",
  "secret Santa diplomacy", "motivational poster refund", "vending machine curse", "tax audit karma",
  "parking validation stamp", "jury duty excuse", "HOA newsletter cult", "cryptid census",
  "mustache retirement plan", "fanny pack emergency", "sock drawer hierarchy", "garden gnome census",
  "lawn mower feud", "traffic cone loyalty", "mailbox curse", "glove compartment receipts",
  "exorcist side hustle", "fortune cookie fortune", "cereal mascot comeback", "mall Santa tell-all",
  "karaoke machine curse", "thunder cape rental", "apocalypse coupon", "time machine warranty",
  "séance Groupon", "cryptid discount card", "weather forecast leak", "umbrella surplus",
  "gnome union rep", "stapler loyalty program", "birthday cake mixup", "spice rack alphabetization",
  "gas station sushi confidence", "airline peanut nostalgia", "donut integrity", "good scissors mystery",
  "missing silverware", "expired coupon guilt", "mystery Tupperware", "cake with wrong name",
  "golden retriever alibi", "clown union dues", "mime confession", "tooth fairy debt",
  "orange peel superstition", "whistling suspicion", "raccoon felony record", "morning person deflection",
  "ironed jeans confidence", "umbrella stockpile", "weather forecaster credibility", "plane clap etiquette",
  "office cryptid theory", "chef taste-test rule", "dog bark instinct", "unofficial mayor election",
  "unlabeled key mystery", "horse-eating hyperbole", "family spy theory", "barista name error",
  "drinks-sometime promise", "hotel pillow standards", "jigsaw puzzle guilt", "llama connection",
  "neighborhood maze incident", "houseplant naming ceremony", "gas station bathroom ranking", "cereal company complaint letter",
  "favorite traffic cone", "parking lot nap", "vending machine negotiation", "junk drawer vibe system",
  "mannequin mistaken identity", "spare umbrella generosity", "handwriting distrust", "parallel parking ovation",
  "discontinued ranch flavor", "pickle toothpaste", "bacon candle scent", "gluten-free thoughts and prayers",
  "expired fortune cookie wisdom", "secret sauce theft", "last known good donut", "backup weatherman",
  "backup mayor inauguration", "loyalty point dispute", "tax return theatrics", "retirement casserole",
  "office birthday tax collector", "printer retirement plan", "nap union dispute", "snack thief manifesto",
  "karaoke song monopoly", "confetti tax audit", "yard sale conglomerate", "thermostat truce negotiations",
  "fortune teller Yelp review", "band greatest hits reunion", "secret Santa oversaturation", "mayor inauguration snacks",
  "miracle return policy", "DMV reschedule saga", "ghost accountant advice", "small talk cousin theory",
  "truck nobody talks about", "thunder cape rental dispute", "motivational poster typo", "shuttle retirement plan",
  "loyalty point refund request", "nap schedule dispute", "cereal mascot comeback tour", "discount card scandal",
  "garden gnome sponsorship", "parking validation cousin", "cake tax collector shift", "I don't trust people who eat candy corn",
  "I don't trust people who fold their pizza", "nobody who owns a golden retriever is capable of real evil", "I refuse to trust anyone who says 'no offense' before being offensive", "people who talk during movies are secretly lizards",
  "I've never met a mime I didn't suspect of something", "anyone who microwaves fish at the office should register as a felon", "I think clowns unionized decades ago and nobody noticed", "I don't believe anyone who says they don't really watch TV",
  "I've always suspected the tooth fairy has a gambling problem", "I don't trust anyone who peels an orange in one piece", "nobody who whistles in public has been fully honest with a therapist", "I think every raccoon has committed at least one felony",
  "anyone who says they're not a morning person is hiding something bigger", "I've never trusted a man who irons his jeans", "people who own three or more umbrellas are planning something", "I don't believe weather forecasters have ever been outside",
  "nobody who claps when the plane lands has read the safety card", "I think every office has one person who's secretly a cryptid", "I refuse to trust a chef who doesn't taste their own food", "I don't trust a dog that doesn't bark at the mailman",
  "people who alphabetize their spice rack are hiding something", "I think every small town has one unofficial mayor nobody elected", "I've never trusted a man who owns a single unlabeled key", "nobody who says they could eat a horse has thought that through",
  "I think every family has one relative who might be a spy", "I don't trust a barista who doesn't get my name wrong", "anyone who says we should get drinks sometime rarely means it", "I think every hotel pillow is secretly the same pillow",
  "I've never finished a jigsaw puzzle and I'm not ashamed", "I think every gas station has exactly one honest bathroom", "I don't trust anyone who says they love public speaking", "nobody who owns a fog machine has ever used it responsibly",
  "I think every family reunion has one unresolved conspiracy", "I've never trusted a cat that makes eye contact too long", "anyone who irons their socks is planning a coup", "I think every school had one kid who might've been an adult",
  "I don't trust anyone who says the wifi password out loud twice", "nobody who owns matching luggage has ever missed a flight", "I think every neighborhood has one dog running the whole block", "deep fried Twinkie",
  "slippery when wet", "still warm", "extra saucy", "handle with care",
  "goes down smooth", "comes in a family pack", "bigger on the inside", "hard to swallow",
  "better with two hands", "size doesn't matter", "made fresh daily", "worth the wait",
  "hits different at 2am", "not as sticky as it looks", "needs a firm grip", "best served warm",
  "loosens up after a minute", "takes two tries", "leaves a mark", "smells better than it looks",
  "gets better the longer you wait", "sturdier than it looks", "runs hot", "double-wrapped for a reason",
  "doesn't taste like much at first", "goes further than you'd think", "easier the second time", "leaves you sticky",
  "comes with instructions for a reason", "tighter than expected", "softer in the morning", "needs to breathe first",
  "better on the second date", "comes pre-shaken", "tastes like a bad decision", "looks small in the package",
  "needs a warning label", "goes in easier sideways", "lasts longer refrigerated", "I once won a hot dog eating contest by accident",
  "my emotional support animal is a lawn chair", "I've been banned from exactly one Chuck E. Cheese", "I have a whole system for microwave popcorn timing", "I know a guy who knows a guy who owns a llama",
  "I once got lost in my own neighborhood for forty minutes", "I've named every houseplant I've ever killed", "I have strong opinions about hotel pillows", "I once tried to return a fish I caught myself",
  "I keep a mental ranking of every gas station bathroom I've used", "I've written a strongly worded letter to a cereal company", "I have a favorite traffic cone", "I've fallen asleep in a grocery store parking lot on purpose",
  "I once negotiated with a vending machine for twenty minutes", "I have a system for organizing junk drawers by vibe", "I've been mistaken for a mannequin at least once", "I keep a spare umbrella specifically for other people's emergencies",
  "I've never trusted my own handwriting on important forms", "I once got a standing ovation for parallel parking", "I've read a hotel's fire safety card cover to cover for fun", "I once cried during a car commercial and won't explain why",
  "I have a nemesis at the DMV and she doesn't know it", "I've practiced a fake laugh in the mirror", "I once applauded during a fire drill", "I keep receipts I don't need just in case",
  "I've had a staring contest with a goose and lost", "I once wore sunglasses indoors to avoid a conversation", "I have a backup nickname I've never used", "I've rehearsed an argument with someone who wasn't there",
  "I once said 'you too' when a waiter told me to enjoy my meal", "discount time travel", "emergency backup soul", "unlicensed guardian angel",
  "expired gym membership guilt", "secondhand thunder", "borrowed confidence", "refurbished bravado",
  "clearance rack destiny", "factory-reset karma", "last-minute miracle", "overnight prophecy",
  "rush-order redemption", "gift-wrapped apology", "hand-me-down superstition", "bootleg enlightenment",
  "knockoff nirvana", "pop-up shrine", "flash-sale forgiveness", "limited-edition guilt trip",
  "seasonal existential crisis", "buy-one-get-one regret", "store-brand serenity", "off-peak enlightenment",
  "layaway redemption arc", "self-checkout confession", "curbside epiphany", "drive-thru wisdom",
  "fast-track forgiveness", "backorder destiny", "overstock nostalgia", "clearance-bin bravery",
  "bulk-size humility", "trial-size confidence", "free-sample loyalty", "warranty-void honesty"
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
  function pickUniqueName(existingNames) {
    const taken = new Set(existingNames);
    const available = NAME_POOL.filter((n) => !taken.has(n));
    const pool = available.length > 0 ? available : NAME_POOL;
    return pool[Math.floor(Math.random() * pool.length)];
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
    conns: {}, players: [], hand: [], pool: [], gameStarted: false, gameOver: false
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
      if (state.isHost) root.querySelector('#startBtn').onclick = startGame;
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
    state.peer = new Peer();
    state.peer.on('open', (id) => {
      state.myId = id;
      const conn = state.peer.connect(hostId, { reliable: true });
      conn.on('open', () => {
        state.hostConn = conn;
        conn.send({ type: 'hello' });
        render();
      });
      conn.on('data', (msg) => handleClientMessage(msg));
      conn.on('close', () => alert('Disconnected from host.'));
    });
    state.peer.on('error', (err) => alert('Peer error: ' + err.message));
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
    Object.entries(state.conns).forEach(([id, conn]) => conn.send({ type: 'yourHand', hand: hands[id] }));
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
  // player's name and card text are captured now, in this closure —
  // so even if that player disconnects before the timer fires, the
  // announcement still goes out on schedule.
  function scheduleAnnouncement(playerName, card) {
    setTimeout(() => {
      const text = playerName + ' has slipped in ' + card;
      pushAnnouncement(text);
      broadcastToClients({ type: 'announcement', text });
    }, 30000);
  }

  // Shows a transient toast notification via a DOM overlay outside of
  // #app, so it survives the full-replace re-renders the rest of the
  // UI does.
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
