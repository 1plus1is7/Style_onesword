import fs from 'fs';
import path from 'path';

export interface SkillDef {
  trigger: string;
  action: string;
  modifiers: string[];
}

export interface Skill extends SkillDef {
  cost: number;
  cooldown: number;
}

const dataPath = path.join(__dirname, '..', '..', 'shared', 'skills.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const triggers = new Set<string>(data.triggers);
const actions = new Set<string>(data.actions);
const modifiers = new Set<string>(data.modifiers);

export function buildSkill(def: SkillDef): Skill | undefined {
  if (!triggers.has(def.trigger) || !actions.has(def.action)) {
    return undefined;
  }
  for (const m of def.modifiers) {
    if (!modifiers.has(m)) {
      return undefined;
    }
  }
  const cost = 1 + def.modifiers.length;
  const cooldown = cost * 1000; // ms placeholder
  return { ...def, cost, cooldown };
}
