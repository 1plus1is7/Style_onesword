import { Player } from './types';

export type BotState = 'idle' | 'approach' | 'attack' | 'retreat' | 'guard';

export interface BotOptions {
  difficulty: 'easy' | 'normal' | 'hard';
}

export class Bot {
  player: Player;
  state: BotState = 'idle';
  opts: BotOptions;
  private timer?: NodeJS.Timeout;

  constructor(player: Player, opts: BotOptions) {
    this.player = player;
    this.opts = opts;
  }

  start() {
    this.schedule();
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private schedule() {
    this.timer = setTimeout(() => this.step(), this.reactionDelay());
  }

  private step() {
    const action = this.decideAction();
    this.player.socket.send(JSON.stringify({ type: 'bot_action', action }));
    this.schedule();
  }

  private decideAction(): string {
    switch (this.state) {
      case 'idle':
        this.state = 'approach';
        return 'move_towards';
      case 'approach':
        this.state = 'attack';
        return 'attack';
      case 'attack':
        this.state = 'retreat';
        return 'move_away';
      case 'retreat':
        if (Math.random() < this.guardChance()) {
          this.state = 'guard';
          return 'guard';
        } else {
          this.state = 'idle';
          return 'idle';
        }
      case 'guard':
        this.state = 'idle';
        return 'idle';
    }
  }

  private reactionDelay() {
    switch (this.opts.difficulty) {
      case 'easy':
        return 600;
      case 'normal':
        return 400;
      case 'hard':
        return 250;
    }
  }

  private guardChance() {
    switch (this.opts.difficulty) {
      case 'easy':
        return 0.1;
      case 'normal':
        return 0.3;
      case 'hard':
        return 0.5;
    }
  }
}

export function spawnBot(player: Player, difficulty: BotOptions['difficulty'] = 'easy') {
  const bot = new Bot(player, { difficulty });
  bot.start();
  return bot;
}
