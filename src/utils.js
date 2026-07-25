export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function shortId(id) {
  return id ? id.slice(0, 5) : 'unknown';
}

// Generates a 5-character host ID. Excludes visually ambiguous
// characters (0/O, 1/I/L) so players can read and type it out loud
// or over text without mistakes.
const ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateShortId() {
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  }
  return id;
}

export function dealHands(deck, playerIds, handSize) {
  const shuffled = shuffle(deck);
  const hands = {};
  let cursor = 0;
  playerIds.forEach((id) => {
    hands[id] = shuffled.slice(cursor, cursor + handSize);
    cursor += handSize;
  });
  return hands;
}
