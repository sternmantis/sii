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
