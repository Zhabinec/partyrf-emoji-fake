import { randomUUID } from 'node:crypto';
import { act, view } from './game.mjs';

export const testBotsEnabled = process.env.TEST_BOTS !== '0';

export function addTestBots(room) {
  for (const name of ['Бот Орбита', 'Бот Шлюз', 'Бот Пиксель', 'Бот Комета', 'Бот Спутник']) {
    room.members.set(randomUUID(), { id: randomUUID(), name, isBot: true });
  }
}

export function runTestBots(room, now) {
  const { game } = room;
  if (!room.testRoom || !['choose', 'vote'].includes(game.phase)) return;
  const members = [...room.members.values()].filter(member => !member.left);
  const players = members.map(member => member.id);
  const { step } = game;
  for (const bot of members.filter(member => member.isBot)) {
    if (game.step !== step) break;
    const state = view(game, bot.id);
    if (now < state.deadline - state.duration + 650) continue;
    let action;
    if (state.options) action = { type: 'choose', value: state.options[Math.floor(Math.random() * state.options.length)] };
    else if (state.phase === 'vote' && !state.done) {
      const suspects = players.filter(id => id !== bot.id);
      action = { type: 'vote', value: suspects[Math.floor(Math.random() * suspects.length)] };
    }
    if (action) act(game, { id: bot.id, isHost: false, players }, { ...action, step }, now);
  }
}
