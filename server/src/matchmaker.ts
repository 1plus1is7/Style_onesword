import { Player } from './types';

const queue: Player[] = [];

export function enqueue(player: Player) {
  if (!queue.includes(player)) {
    queue.push(player);
    tryMatch();
  }
}

export function remove(player: Player) {
  const idx = queue.indexOf(player);
  if (idx >= 0) {
    queue.splice(idx, 1);
  }
}

function tryMatch() {
  if (queue.length >= 2) {
    const p1 = queue.shift()!;
    const p2 = queue.shift()!;
    const matchId = Date.now();
    p1.currentMatch = matchId;
    p2.currentMatch = matchId;
    p1.socket.send(JSON.stringify({ type: 'match_start', opponent: p2.id, matchId }));
    p2.socket.send(JSON.stringify({ type: 'match_start', opponent: p1.id, matchId }));
  }
}
