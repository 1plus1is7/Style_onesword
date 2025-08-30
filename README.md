# Style_onesword

Prototype repository for an online quarter-view pixel fighting arena. The design specifications are documented in [docs/online_fighting_arena_v0.2.md](docs/online_fighting_arena_v0.2.md).

## Server

A TypeScript WebSocket server lives under `server/` and uses SQLite for storing user accounts and match results.

### Running the server

```
cd server
npm install
npm run dev
```

This starts a WebSocket server on `ws://localhost:8080` which supports login, simple matchmaking, and recording match results.

### Practice with an AI bot

After connecting, send a JSON message `{ "type": "practice", "difficulty": "easy" }` to begin a solo session against an AI bot. The bot runs a simple finite state machine cycling through approach, attack, retreat, and guard behaviors. Difficulty affects its reaction time and guard chance. End the session by reporting a `match_result`.

### Loadout and skills

Players may configure a weapon and two custom skills before entering a match. Send a message:

```
{ "type": "set_loadout", "weapon": "sword", "skills": [
  {"trigger": "button", "action": "melee_slash", "modifiers": ["fire"]},
  {"trigger": "button", "action": "projectile", "modifiers": []}
] }
```

Each part is validated against `shared/skills.json` and assigned a simple cost and derived cooldown. Use a skill during practice with:

```
{ "type": "use_skill", "index": 0 }
```

The server responds with `skill_executed` including the resolved cost.

### Match results and progression

After a fight, report the outcome:

```
{ "type": "match_result", "opponentId": 2, "result": "win", "damageDealt": 123, "damageTaken": 45, "lengthMs": 180000 }
```

The server stores a record and updates the player's wins, losses, experience, and level.
Experience awards 100 XP for a win and 50 XP for a loss; levels require `level × 1000` XP.
Once processed, the server replies with a `profile` message containing the updated user stats.

## Client

A minimal Godot 4 project is available in `client/` demonstrating 8-way movement, attacks, guard, and dash placeholders.
The `Main` scene connects to the local WebSocket server on startup, logs in as a guest, and begins a practice match
against the AI bot while printing server events to the Godot output.

Open the project with Godot 4 and run the `Main` scene.

## Shared data

Shared JSON definitions for weapons, skills, and combat rules are located in the `shared/` directory.
