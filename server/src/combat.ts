import fs from 'fs';
import path from 'path';
import { Weapon, getWeapon } from './weapons';

interface CancelRule {
  from: string;
  to: string;
  onHit?: boolean;
}

interface CombatRules {
  comboChains: string[][];
  cancelRules: CancelRule[];
}

const dataPath = path.join(__dirname, '..', '..', 'shared', 'combat_rules.json');
const rules: CombatRules = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CombatAction =
  | 'light'
  | 'heavy'
  | 'air_light'
  | 'ground_light'
  | 'dash'
  | 'guard'
  | 'parry'
  | 'jump';

export interface CombatState {
  comboChain?: string[];
  comboIndex: number;
  lastAction?: string;
  dashReadyAt: number;
  parryWindowUntil: number;
  parryRecoverUntil: number;
  hp: number;
  gauge: number;
  hurtbox: Box;
  hitbox?: Box;
  hitboxActiveUntil: number;
  airborne: boolean;
  weapon: Weapon;
}

const defaultWeapon = getWeapon('sword')!;

export function createCombatState(weapon: Weapon = defaultWeapon): CombatState {
  return {
    comboIndex: 0,
    dashReadyAt: 0,
    parryWindowUntil: 0,
    parryRecoverUntil: 0,
    hp: 100,
    gauge: 50,
    hurtbox: { x: 0, y: 0, w: 40, h: 80 },
    hitboxActiveUntil: 0,
    airborne: false,
    weapon,
  };
}

export function setWeapon(state: CombatState, weapon: Weapon) {
  state.weapon = weapon;
}

export interface ActionOutcome {
  ok: boolean;
  reason?: string;
  comboChain?: string[];
  comboIndex?: number;
  hitbox?: Box;
}

export function performAction(
  state: CombatState,
  action: CombatAction,
  context: { onHit?: boolean } = {}
): ActionOutcome {
  const now = Date.now();

  if (action === 'parry') {
    if (now < state.parryRecoverUntil) {
      return { ok: false, reason: 'parry_cooldown' };
    }
    state.parryWindowUntil = now + 200; // 0.2s parry window
    state.parryRecoverUntil = now + 1000; // 1s before next parry
    state.comboChain = undefined;
    state.comboIndex = 0;
    state.lastAction = action;
    return { ok: true };
  }

  if (action === 'dash') {
    if (now < state.dashReadyAt) {
      return { ok: false, reason: 'dash_cooldown' };
    }
    state.dashReadyAt = now + 500; // 0.5s cooldown
    state.comboChain = undefined;
    state.comboIndex = 0;
    state.lastAction = action;
    return { ok: true };
  }

  if (action === 'guard') {
    state.comboChain = undefined;
    state.comboIndex = 0;
    state.lastAction = action;
    return { ok: true };
  }

  if (action === 'jump') {
    state.airborne = true;
    state.comboChain = undefined;
    state.comboIndex = 0;
    state.lastAction = action;
    return { ok: true };
  }

  if (state.lastAction) {
    const rule = rules.cancelRules.find(
      (r) =>
        r.from === state.lastAction &&
        r.to === action &&
        (!r.onHit || context.onHit)
    );
    if (rule) {
      state.comboChain = undefined;
      state.comboIndex = 0;
      state.lastAction = action;
      return { ok: true };
    }
  }

  let chain = state.comboChain;
  let index = state.comboIndex;

  if (!chain) {
    const match = rules.comboChains.find((c) => c[0] === action);
    if (match) {
      chain = match;
      index = 1;
    } else {
      chain = undefined;
      index = 0;
    }
  } else {
    if (chain[index] === action) {
      index++;
      if (index >= chain.length) {
        chain = undefined;
        index = 0;
      }
    } else {
      const match = rules.comboChains.find((c) => c[0] === action);
      if (match) {
        chain = match;
        index = 1;
      } else {
        chain = undefined;
        index = 0;
      }
    }
  }

  state.comboChain = chain;
  state.comboIndex = index;
  state.lastAction = action;

  if (
    action === 'light' ||
    action === 'heavy' ||
    action === 'air_light' ||
    action === 'ground_light'
  ) {
    const baseW = action === 'heavy' ? 30 : 20;
    const width = baseW * state.weapon.reach;
    state.hitbox = {
      x: state.hurtbox.x + state.hurtbox.w,
      y: state.hurtbox.y,
      w: width,
      h: 10,
    };
    state.hitboxActiveUntil = now + Math.round(150 / state.weapon.attackSpeed);
  }

  return { ok: true, comboChain: chain, comboIndex: index, hitbox: state.hitbox };
}

export function registerHit(state: CombatState): boolean {
  const now = Date.now();
  if (now < state.parryWindowUntil) {
    state.parryWindowUntil = 0;
    return true;
  }
  return false;
}

export function setPosition(state: CombatState, x: number, y: number) {
  state.hurtbox.x = x;
  state.hurtbox.y = y;
}

export function update(state: CombatState) {
  const now = Date.now();
  if (state.hitbox && now > state.hitboxActiveUntil) {
    state.hitbox = undefined;
  }
}

function boxesIntersect(a: Box, b: Box) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function attemptHit(
  attacker: CombatState,
  defender: CombatState,
  damage: number,
) {
  const now = Date.now();
  if (!attacker.hitbox || now > attacker.hitboxActiveUntil) {
    return { hit: false };
  }
  if (!boxesIntersect(attacker.hitbox, defender.hurtbox)) {
    return { hit: false };
  }
  attacker.hitbox = undefined;

  if (registerHit(defender)) {
    return { hit: true, parried: true };
  }

  if (defender.lastAction === 'guard' && defender.gauge > 0) {
    defender.gauge = Math.max(0, defender.gauge - damage);
    return { hit: true, guarded: true, gauge: defender.gauge };
  }

  defender.hp = Math.max(0, defender.hp - damage);
  return { hit: true, hp: defender.hp };
}
