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
3. Before starting, the host picks how many cards each player gets —
   **3, 5, or 10** — via a dropdown in the waiting room. Once 2–4
   players have joined, the host clicks **Start Game** to shuffle
   `deck.js` and deal that many cards to each player privately.
4. There is no shared board. Each card in your hand has exactly two
   actions:
   - **Complete** — starts a 30-second countdown on that card. It
     stays in your hand (visibly marked, no longer clickable) for the
     full 30 seconds — it does **not** disappear or join the shared
     pool right away. While the countdown runs, that card shows a
     **Caught!** button — clicking it cancels the countdown early and
     immediately swaps the card for a new random one, functionally
     identical to Caught Slipping, with no announcement (since the
     Complete never actually resolved). If you don't hit Caught!,
     once the 30 seconds elapse the card leaves your hand and every
     player is notified with a toast: "**[Player] has slipped in
     [card text]**". While you have a card counting down, you can't
     start Completing another one, but Caught Slipping still works
     normally on your other cards, and every other player is
     completely unaffected. This timer runs on the host, not on your
     own device, so it still resolves (or can still be Caught!) on
     schedule even if you disconnect right after starting it.
   - **Caught Slipping** — swaps the card for a new one, drawn
     uniformly at random from the full master deck. The deck itself
     is never consumed by dealing or by this draw, so any card —
     including ones already sitting in someone else's hand, or ones
     someone already completed — remains just as likely to come up as
     anything else. Your hand size doesn't change, and there's no
     delay or announcement for this action. Not available on a card
     that's currently counting down from a Complete.

   At the bottom of the screen, a **Draw 1 Card** button adds one
   extra randomly-drawn card to your own hand at any time — this
   grows your hand rather than swapping anything.
5. As soon as any player's hand actually reaches zero cards — which,
   for a Complete action, only happens once its 30-second countdown
   has finished, not the moment the button is pressed — that player is
   declared the winner and the game ends for everyone. A "Game Over"
   screen names them specifically (e.g. "**binker** ran out of cards
   and wins!"). Any Complete countdowns already running elsewhere at
   that point still finish on their original schedule, even after game
   over.
6. From the Game Over screen, the host can click **Start New Game** to
   deal a fresh hand to the same connected players and jump straight
   back into play — no need to reconnect or share the Host ID again.
   Everyone else sees "Waiting for the host to start a new game..."
   until that happens.

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
