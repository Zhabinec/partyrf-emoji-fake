import { emojis, words } from './content.mjs';

export const limits = { minPlayers: 3, maxPlayers: 10, name: 24 };
const rounds = 3;
const durations = { briefing: 2500, choose: 12_000, explain: 18_000, vote: 30_000 };

export function newGame() {
  return { phase: 'lobby', step: 0, deadline: null };
}

function enter(game, phase, now) {
  game.phase = phase;
  game.step++;
  game.deadline = durations[phase] ? now + durations[phase] : null;
}

function brief(game, nextPhase, now) {
  game.nextPhase = nextPhase;
  enter(game, 'briefing', now);
}

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function start(game, players, now, random) {
  const pairs = words.filter(pair => pair !== game.pair);
  Object.assign(game, {
    pair: pairs[Math.floor(random() * pairs.length)],
    fakes: shuffle(players, random).slice(0, Math.floor(players.length / 3)),
    order: shuffle(players, random), round: 0, turn: 0, history: [], votes: {},
  });
  brief(game, 'choose', now);
}

function speaker(game) {
  return game.order[(game.turn + game.round) % game.order.length];
}

function prepareTurn(game, now, random) {
  game.options = shuffle(emojis, random).slice(0, 3);
  game.selected = null;
  enter(game, 'choose', now);
}

function nextTurn(game, now, random) {
  game.history.push({ id: speaker(game), emoji: game.selected, round: game.round + 1 });
  game.turn++;
  if (game.turn === game.order.length) {
    game.turn = 0;
    game.round++;
  }
  if (game.round === rounds) brief(game, 'vote', now);
  else if (game.turn === 0) brief(game, 'choose', now);
  else prepareTurn(game, now, random);
}

function reveal(game, now) {
  const counts = Object.fromEntries(game.order.map(id => [id, 0]));
  for (const id of Object.values(game.votes)) counts[id]++;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const firstSafe = ranked[game.fakes.length][1];
  const accused = ranked.filter(([, votes]) => votes > firstSafe).map(([id]) => id);
  const townWins = game.fakes.every(id => accused.includes(id));
  game.result = { counts, accused, townWins, fakes: game.fakes, words: game.pair };
  brief(game, 'verdict', now);
}

export function tick(game, now, random = Math.random) {
  if (game.deadline === null || now < game.deadline) return;
  if (game.phase === 'briefing') {
    if (game.nextPhase === 'choose') prepareTurn(game, now, random);
    else enter(game, game.nextPhase, now);
  } else if (game.phase === 'vote') reveal(game, now);
  else nextTurn(game, now, random);
}

export function act(game, { id, isHost, players }, action, now, random = Math.random) {
  tick(game, now, random);
  if (action.step !== game.step) return 'Этот этап уже закончился.';
  if (action.type === 'start' && ['lobby', 'finished'].includes(game.phase)) {
    if (!isHost) return 'Партию запускает хост.';
    if (players.length < limits.minPlayers) return 'Нужно хотя бы три игрока.';
    start(game, players, now, random);
    return;
  }
  if (action.type === 'next-finale' && ['verdict', 'moment'].includes(game.phase)) {
    if (!isHost) return 'Досье открывает хост.';
    enter(game, game.phase === 'verdict' ? 'moment' : 'finished', now);
    return;
  }
  if (!game.order?.includes(id)) return 'Дождись следующей партии.';
  if (game.phase === 'choose' && action.type === 'choose' && id === speaker(game)) {
    if (!game.options.includes(action.value)) return 'Выбери один из трёх эмодзи.';
    game.selected = action.value;
    enter(game, 'explain', now);
    return;
  }
  if (game.phase === 'explain' && action.type === 'done' && (id === speaker(game) || isHost)) {
    nextTurn(game, now, random);
    return;
  }
  if (game.phase === 'vote' && action.type === 'vote') {
    if (Object.hasOwn(game.votes, id)) return 'Голос уже принят.';
    if (id === action.value || !game.order.includes(action.value)) return 'Выбери другого игрока.';
    game.votes[id] = action.value;
    if (Object.keys(game.votes).length === game.order.length) reveal(game, now);
    return;
  }
  return 'Это действие сейчас недоступно.';
}

export function view(game, id) {
  const { phase, step, deadline } = game;
  const data = { phase, step, deadline, duration: durations[phase] ?? null };
  if (phase === 'lobby') return data;
  if (phase === 'briefing') return { ...data, nextPhase: game.nextPhase, round: game.round + 1 };
  if (phase === 'verdict') return { ...data, result: { townWins: game.result.townWins, fakes: game.fakes } };
  if (phase === 'moment') {
    const clue = game.history.findLast(entry => entry.emoji && game.fakes.includes(entry.id));
    return { ...data, moment: clue ? { ...clue, word: game.pair[1] } : null };
  }
  if (phase === 'finished') return { ...data, result: game.result, history: game.history };
  data.word = game.pair[Number(game.fakes.includes(id))];
  data.history = game.history;
  data.fakeCount = game.fakes.length;
  if (phase === 'vote') {
    data.done = Object.hasOwn(game.votes, id);
    data.progress = [Object.keys(game.votes).length, game.order.length];
    return data;
  }
  data.round = game.round + 1;
  data.turn = [game.turn + 1, game.order.length];
  data.speaker = speaker(game);
  if (phase === 'choose' && id === data.speaker) data.options = game.options;
  if (phase === 'explain') data.selected = game.selected;
  return data;
}
