# P2P Card Game (No Backend)

A 3–4 player card game that runs **entirely as static files on GitHub
Pages** — there is no server to deploy or run. Players connect directly
browser-to-browser using WebRTC (via the PeerJS library).

## How multiplayer works without a server

Browsers can't discover each other with zero infrastructure — some
rendezvous point is unavoidable. This project uses **PeerJS's free
public broker** for that one-time handshake only:

- The broker helps two browsers exchange connection info (signaling).
- Once connected, all game data — hands, plays, board state — travels
  **directly peer-to-peer**, never through any server you own or run.
- One player is the **host**: they shuffle the deck and deal hands to
  everyone (including themselves), then relay played cards to the
  group (star topology).

### Important security note
The deck (`src/deck.js`) ships as plain JS to every browser, since
there is no trusted server to hold it privately. This project hides
each player's hand from the *UI* others see, but a technically curious
player could inspect their own browser's memory/devtools and see more
than intended (e.g. the full deck contents, though not other players'
dealt hands, which are only ever sent directly to the intended
recipient). If you need cryptographically enforced hidden information,
you need a trusted server — see the "Alternative" note at the bottom.

## Running it

Nothing to install or build. Just open `public/index.html` in a
browser, or serve the `public/` folder with GitHub Pages.

1. One player clicks **Create Game (Host)** and shares the displayed
   Host ID (via chat, text, whatever) with 1–3 friends.
2. Each friend opens the page, pastes the Host ID into **Join Game**.
3. Once 2–4 players have joined, the host clicks **Start Game** — this
   shuffles `deck.js` and deals 5 cards to each player privately.
4. Click a card in your hand to play it to the shared board; everyone
   sees the move, no one sees anyone else's remaining hand.

## Deployment (GitHub Pages)

1. Push this repo to GitHub.
2. In repo Settings → Pages, set the source to serve from `public/`
   (or copy `public/`'s contents to a `gh-pages` branch/root).
3. Share the published URL — that's the entire deployment.

## Development workflow

`src/*.js` is kept as readable, modular source for maintenance. There
is no bundler wired up (intentionally, so nothing needs to run
locally) — `public/bundle.js` is the hand-synced, flattened version
that actually ships. When you change logic in `src/`, mirror the same
change into `public/bundle.js` before pushing.

## Alternative: true hidden hands

If you later want cryptographically private hands (not just
UI-hidden), you'd need a trusted party to shuffle/deal — i.e. a small
backend (Node/Express + Socket.io) deployed somewhere that executes
server code (Railway, Render, Fly.io — not GitHub Pages, which is
static-only). That's a different architecture from this one and was
intentionally traded away here in favor of "zero infrastructure to
run."
