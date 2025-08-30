import type { WebSocket } from 'ws';

export interface Player {
  id: number;
  socket: WebSocket;
  userId?: number;
  name?: string;
  currentMatch?: number;
  loadout?: {
    weapon: import('./weapons').Weapon;
    skills: import('./skills').Skill[];
  };
  skillCooldowns?: number[];
  combat?: import('./combat').CombatState;
}
