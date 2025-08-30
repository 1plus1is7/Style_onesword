import fs from 'fs';
import path from 'path';

export interface Weapon {
  id: string;
  name: string;
  reach: number;
  attackSpeed: number;
}

const dataPath = path.join(__dirname, '..', '..', 'shared', 'weapons.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const weapons = new Map<string, Weapon>(
  (data.weapons as Weapon[]).map((w) => [w.id, w])
);

export function getWeapon(id: string): Weapon | undefined {
  return weapons.get(id);
}
