// Thin wrapper around PeerJS. PeerJS's free public cloud broker is used
// ONLY to exchange connection metadata (signaling) so two browsers can
// find each other. No game data — hands, plays, deck — ever passes
// through it once the direct P2P data channel is open.
export function createPeer(onOpen, onError) {
  const peer = new Peer(); // uses PeerJS default free public broker
  peer.on('open', (id) => onOpen(id, peer));
  peer.on('error', (err) => onError && onError(err));
  return peer;
}

export function connectToHost(peer, hostId, onOpen) {
  const conn = peer.connect(hostId, { reliable: true });
  conn.on('open', () => onOpen(conn));
  return conn;
}
