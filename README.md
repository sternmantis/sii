# Slip It In (No Backend)

A 3–4 player card game that runs **entirely as static files on GitHub
Pages** — there is no server to deploy or run. Players connect directly
browser-to-browser using WebRTC (via the PeerJS library).

## How multiplayer works without a server

Browsers can't discover each other with zero infrastructure — some
rendezvous point is unavoidable. This project uses **PeerJS's free
public broker** for that one-time handshake only:

- The broker helps two browsers exchange connection info (signaling).
- Once connected, all game data — hands, hand actions, player list —
  travels **directly peer-to-peer**, never through any server you own
  or run.
- One player is the **host**: they generate a 5-character Host ID,
  deal hands to everyone (including themselves), and act as the
  authority for the shared pool of removed cards and the game-over
  condition.

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
browser, or serve the `docs/` folder with GitHub Pages. The page is
mobile-responsive — it scales to fit phone, tablet, and desktop
screens without a separate mobile version.

1. One player clicks **Create Game (Host)** and shares either:
   - the displayed 5-character **Host ID**, which friends type into
     the **Join Game** field, or
   - the **Copy Invite Link** button next to it, which copies a URL
     like `https://<your-pages-url>/?host=ABCDE`. Anyone who opens
     that link joins automatically — no typing required. If the link
     ever fails to connect (e.g. the game already ended), the page
     falls back to the normal screen so they can still enter the Host
     ID manually.
2. Each friend opens the page, pastes the Host ID into **Join Game**.
   Everyone is randomly assigned a display name (binker, bungle,
   chungle, bingus, binkus, trundle, fundus, chungus, or Ted Cruz),
   guaranteed unique among currently connected players — the host
   assigns names centrally and frees a name back up when its player
   disconnects.
3. Once 2–4 players have joined, the host clicks **Start Game** — this
   shuffles `deck.js` and deals 5 cards to each player privately.
4. There is no shared board. Each card in your hand has exactly two
   actions:
   - **Complete** — removes the card from your hand immediately. It
     joins a shared pool of removed cards that anyone can later draw
     again via Caught Slipping. Additionally, a 30-second timer starts
     on the host; when it runs out, every player is notified with a
     toast: "**[Player] has slipped in [card text]**" — revealing what
     was completed, a bit after the fact. This timer runs on the host,
     not on your own device, so the announcement still fires on
     schedule even if you disconnect right after completing the card.
   - **Caught Slipping** — swaps the card for a new one, drawn at
     random from that same shared pool (falling back to the full
     master deck if the pool happens to be empty). Your hand size
     doesn't change, and there's no delayed announcement for this
     action.
5. As soon as any player's hand reaches zero cards, that player is
   declared the winner and the game ends for everyone — a "Game Over"
   screen names them specifically (e.g. "**binker** ran out of cards
   and wins!") for all connected players. Any Complete announcements
   already scheduled before that point will still fire on their
   original 30-second timer, even after game over.

### Host refresh/close warning
If the host refreshes, closes the tab, or navigates away, every other
player's connection drops (the host is the hub everyone else connects
through). To guard against accidental data loss, the host's browser
will show a confirmation prompt before letting that happen. Note:
modern browsers no longer allow custom text in this prompt (a browser
security restriction) — you'll see the browser's own generic "leave
site?" message rather than a game-specific one, but the confirmation
step itself still occurs.

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
