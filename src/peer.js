// Thin wrapper around PeerJS. PeerJS's free public cloud broker is used
// ONLY to exchange connection metadata (signaling) so two browsers can
// find each other. No game data — hands, plays, deck — ever passes
// through it once the direct P2P data channel is open.
export function createPeer(onOpen, onError, customId) {
  // Passing an id requests that specific ID from PeerJS's broker
  // instead of the default random UUID. If it's taken, the broker
  // emits an 'unavailable-id' error (handled by the caller, which
  // should retry with a new generated ID).
  const peer = customId ? new Peer(customId) : new Peer();
  peer.on('open', (id) => onOpen(id, peer));
  peer.on('error', (err) => onError && onError(err));
  return peer;
}

export function connectToHost(peer, hostId, onOpen) {
  const conn = peer.connect(hostId, { reliable: true });
  conn.on('open', () => onOpen(conn));
  return conn;
}
