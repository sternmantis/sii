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

Nothing to install or build. Just open `docs/index.html` in a
browser, or serve the `docs/` folder with GitHub Pages.

1. One player clicks **Create Game (Host)** and shares the displayed
   Host ID (via chat, text, whatever) with 1–3 friends.
2. Each friend opens the page, pastes the Host ID into **Join Game**.
   Everyone is randomly assigned a display name (binker, bungle,
   chungle, bingus, binkus, trundle, fundus, chungus, or Ted Cruz) —
   not guaranteed unique.
3. Once 2–4 players have joined, the host clicks **Start Game** — this
   shuffles `deck.js` and deals 5 cards to each player privately.
4. Each card in your hand has three actions:
   - **Play** — moves the card to the shared board, visible to everyone.
   - **Complete** — removes the card from your hand entirely (it's done).
   - **Caught Slipping** — swaps the card for a new random one from the
     master deck, without changing your hand size.
5. As soon as any player's hand reaches zero cards, the game ends for
   everyone — a "Game Over" screen with the final board is shown to
   all connected players.

## Deployment (GitHub Pages)

1. Push this repo to GitHub.
2. In repo Settings → Pages, set **Source** to "Deploy from a branch,"
   **Branch** to `main`, and the folder to **`/docs`** — this is the
   only subfolder option GitHub Pages supports besides the repo root,
   which is why this project uses `docs/` instead of `public/`.
3. Save, wait about a minute, then visit the URL GitHub shows you
   (`https://<username>.github.io/<repo>/`) — that's the entire
   deployment.

## Development workflow

`src/*.js` is kept as readable, modular source for maintenance. There
is no bundler wired up (intentionally, so nothing needs to run
locally) — `docs/bundle.js` is the hand-synced, flattened version
that actually ships. When you change logic in `src/`, mirror the same
change into `docs/bundle.js` before pushing.

## Alternative: true hidden hands

If you later want cryptographically private hands (not just
UI-hidden), you'd need a trusted party to shuffle/deal — i.e. a small
backend (Node/Express + Socket.io) deployed somewhere that executes
server code (Railway, Render, Fly.io — not GitHub Pages, which is
static-only). That's a different architecture from this one and was
intentionally traded away here in favor of "zero infrastructure to
run."
