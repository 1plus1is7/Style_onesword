import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database<sqlite3.Database, sqlite3.Statement>;

export async function initDB(filename: string) {
  db = await open({ filename, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      opponent_id INTEGER,
      result TEXT,
      damage_dealt INTEGER,
      damage_taken INTEGER,
      length_ms INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')*1000),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
}

export async function getOrCreateUser(name: string) {
  let user = await db.get('SELECT * FROM users WHERE name = ?', name);
  if (!user) {
    const result = await db.run('INSERT INTO users (name) VALUES (?)', name);
    user = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
  }
  return user;
}

export async function getUser(id: number) {
  return db.get('SELECT * FROM users WHERE id = ?', id);
}

export async function recordMatch(
  userId: number,
  opponentId: number,
  result: string,
  damageDealt: number,
  damageTaken: number,
  lengthMs: number
) {
  await db.run(
    'INSERT INTO matches (user_id, opponent_id, result, damage_dealt, damage_taken, length_ms) VALUES (?, ?, ?, ?, ?, ?)',
    userId,
    opponentId,
    result,
    damageDealt,
    damageTaken,
    lengthMs
  );
  if (result === 'win') {
    await db.run('UPDATE users SET wins = wins + 1 WHERE id = ?', userId);
  } else if (result === 'loss') {
    await db.run('UPDATE users SET losses = losses + 1 WHERE id = ?', userId);
  }

  // award experience: 100 for win, 50 for loss
  const gained = result === 'win' ? 100 : 50;
  const current = await getUser(userId);
  let xp = current.xp + gained;
  let level = current.level;
  while (xp >= level * 1000) {
    xp -= level * 1000;
    level += 1;
  }
  await db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', xp, level, userId);
  return getUser(userId);
}
