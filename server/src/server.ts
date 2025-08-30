import { WebSocketServer } from 'ws';
import type { WebSocket, RawData } from 'ws';
import path from 'path';
import { initDB, getOrCreateUser, recordMatch } from './db';
import { enqueue, remove } from './matchmaker';
import { Player } from './types';
import { spawnBot, Bot } from './bot';
import { buildSkill, SkillDef, Skill } from './skills';

const wss = new WebSocketServer({ port: 8080 });
const players = new Map<number, Player>();
const bots = new Map<number, Bot>();
let nextPlayerId = 1;

initDB(path.join(__dirname, '..', 'arena.db')).then(() => {
  console.log('Database initialized');
});

wss.on('connection', (socket: WebSocket) => {
  const id = nextPlayerId++;
  const player: Player = { id, socket };
  players.set(id, player);
  socket.send(JSON.stringify({ type: 'welcome', id }));

  socket.on('message', (data: RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(player, msg);
    } catch (err) {
      console.error('Invalid message from', id, err);
    }
  });

  socket.on('close', () => {
    players.delete(id);
    remove(player);
    const bot = bots.get(id);
    if (bot) {
      bot.stop();
      bots.delete(id);
    }
  });
});

async function handleMessage(player: Player, msg: any) {
  switch (msg.type) {
    case 'ping':
      player.socket.send(JSON.stringify({ type: 'pong', time: Date.now() }));
      break;
    case 'login':
      if (typeof msg.name === 'string') {
        const user = await getOrCreateUser(msg.name);
        player.userId = user.id;
        player.name = user.name;
        player.socket.send(JSON.stringify({ type: 'login_ok', user }));
      }
      break;
    case 'queue':
      enqueue(player);
      break;
    case 'practice':
      if (!bots.has(player.id)) {
        const matchId = Date.now();
        player.currentMatch = matchId;
        player.socket.send(
          JSON.stringify({ type: 'match_start', opponent: 'bot', matchId })
        );
        const bot = spawnBot(player, msg.difficulty);
        bots.set(player.id, bot);
      }
      break;
    case 'set_loadout':
      if (
        typeof msg.weapon === 'string' &&
        Array.isArray(msg.skills) &&
        msg.skills.length === 2
      ) {
        const built: Skill[] = [];
        let valid = true;
        for (const def of msg.skills as SkillDef[]) {
          const skill = buildSkill(def);
          if (!skill) {
            valid = false;
            break;
          }
          built.push(skill);
        }
        if (valid) {
          player.loadout = { weapon: msg.weapon, skills: built as any };
          player.socket.send(JSON.stringify({ type: 'loadout_ok' }));
        } else {
          player.socket.send(
            JSON.stringify({ type: 'error', message: 'invalid_skill' })
          );
        }
      }
      break;
    case 'use_skill':
      if (
        player.loadout &&
        typeof msg.index === 'number' &&
        player.loadout.skills[msg.index]
      ) {
        const skill = player.loadout.skills[msg.index];
        player.socket.send(
          JSON.stringify({ type: 'skill_executed', index: msg.index, skill })
        );
      }
      break;
    case 'match_result':
      if (player.userId) {
        const user = await recordMatch(
          player.userId,
          msg.opponentId,
          msg.result,
          msg.damageDealt,
          msg.damageTaken,
          msg.lengthMs
        );
        player.socket.send(JSON.stringify({ type: 'profile', user }));
      }
      const bot = bots.get(player.id);
      if (bot) {
        bot.stop();
        bots.delete(player.id);
      }
      break;
    default:
      console.log('Unknown message from', player.id, msg);
  }
}

console.log('Arena server listening on ws://localhost:8080');
