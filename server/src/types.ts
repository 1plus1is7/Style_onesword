import type { WebSocket } from 'ws';

export interface Player {
  id: number;
  socket: WebSocket;
  userId?: number;
  name?: string;
  currentMatch?: number;
  loadout?: {
    weapon: string;
    skills: import('./skills').Skill[];
  };
}
