const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const button = (label, action) => `<button type="button" data-action="${action}">${label}</button>`;
const kicker = text => `<p class="kicker">${text}</p>`;

export function entrance(code) {
  return `
    <section class="intro">
      ${kicker('03–10 ИГРОКОВ / ОНЛАЙН')}
      <h1>Эмодзи<br><em>фейк</em></h1>
      <p class="lede">Одно слово на всех. Почти. Выбирай эмодзи, объясняй связь и вычисли тех, кому досталось другое слово.</p>
      <ol class="beats"><li>Выбери эмодзи</li><li>Объясни связь</li><li>Найди фейка</li></ol>
    </section>
    <section class="panel entry">
      ${kicker('ТОЧКА ВХОДА')}
      <h2>${code ? 'Тебя ждут в комнате' : 'Собираем компанию'}</h2>
      <form data-form="entry">
        <label for="name">Твоё имя</label>
        <input id="name" name="name" maxlength="24" required autocomplete="nickname" placeholder="Например, Саша">
        <label for="code">Код комнаты</label>
        <input id="code" class="room-code" name="code" maxlength="6" value="${escape(code)}" placeholder="Введи код друга" autocomplete="off" autocapitalize="characters">
        <button type="submit" name="mode" value="join">Войти в комнату</button>
        ${code ? '' : '<button type="submit" name="mode" value="create" class="secondary">Создать комнату</button>'}
      </form>
    </section>`;
}
function control(label, action, value, className = '') {
  return `<button type="button" class="${className}" data-action="${action}" data-value="${escape(value)}">${label}</button>`;
}

function renderRoom(state) {
  const isHost = state.host === state.me;
  const nameOf = id => escape(state.players.find(player => player.id === id)?.name ?? 'Игрок');
  const roster = row => `<ul class="roster">${state.players.map(player => row(player.id)).join('')}</ul>`;
  if (state.phase === 'lobby') {
    return `${kicker('ЛОББИ · ' + state.players.length + ' / 10')}
      <h1>Собираем <em>компанию</em></h1>
      <p class="lede">Отправь друзьям ссылку. Для старта нужно минимум три игрока.</p>
      <section class="invite"><strong>${state.code}</strong>${button('Скопировать ссылку', 'copy')}</section>
      <input id="invite-link" class="invite-link" aria-label="Ссылка на комнату" readonly>
      ${roster(id => `<li><span>${nameOf(id)}</span><b>${id === state.host ? 'Хост' : 'В комнате'}</b></li>`)}
      ${isHost && state.players.length >= 3 ? button('Начать игру', 'start') : '<p class="waiting">Ждём старта партии.</p>'}`;
  }
  if (state.phase === 'finished') {
    const { townWins, fakes, words, counts, accused } = state.result;
    return `${kicker('ФИНАЛ')}<h1>${townWins ? 'Фейки <em>раскрыты!</em>' : 'Фейки <em>победили!</em>'}</h1>
      <p class="lede">Общее слово — «${escape(words[0])}». Слово фейков — «${escape(words[1])}».</p>
      <p>Фейки: <strong>${fakes.map(nameOf).join(', ')}</strong></p>
      <p>Под подозрением: <strong>${accused.length ? accused.map(nameOf).join(', ') : 'никто не набрал решающего перевеса'}</strong></p>
      ${roster(id => id in counts ? `<li><span>${nameOf(id)}${fakes.includes(id) ? ' <small>фейк</small>' : ''}</span><b>${counts[id]}</b></li>` : '')}
      ${isHost ? button('Сыграть ещё', 'start') : '<p class="waiting">Хост может начать новую партию.</p>'}`;
  }

  const secret = `<p class="topic"><small>ТВОЁ СЕКРЕТНОЕ СЛОВО</small> ${escape(state.word)}</p>`;
  const history = state.history.length ? `<details class="clues"><summary>Прошлые эмодзи</summary>
    <ul class="roster">${state.history.map(({ id, emoji, round }) => `<li><span>${nameOf(id)} <small>раунд ${round}</small></span><b>${escape(emoji ?? 'Пропуск')}</b></li>`).join('')}</ul></details>` : '';

  if (state.phase === 'vote') {
    return `${kicker('ГОЛОСОВАНИЕ')}<h1>Кто <em>фейк?</em></h1>${secret}
      <p class="lede">Фейков в партии: ${state.fakeCount}. У тебя один голос.</p>
      ${state.done ? '<p class="waiting">Голос принят. Ждём остальных.</p>' :
        `<form data-form="vote"><label for="suspect">Твой подозреваемый</label>
          <select id="suspect" name="value" required><option value="">Выбери игрока</option>
            ${state.players.filter(player => player.id !== state.me).map(player =>
              `<option value="${escape(player.id)}">${nameOf(player.id)}</option>`).join('')}
          </select><button type="submit">Подтвердить голос</button></form>`}${history}`;
  }
  const mine = state.speaker === state.me;
  const choosing = state.phase === 'choose';
  return `${kicker('РАУНД ' + state.round + ' / 3 · ХОД ' + state.turn.join(' / '))}
    <h1>${mine ? (choosing ? 'Выбери <em>эмодзи</em>' : 'Объясни <em>связь</em>') :
      `Ход игрока <em>${nameOf(state.speaker)}</em>`}</h1>
    ${secret}
    ${choosing ? (mine ?
      `<p class="lede">Какой эмодзи ты сможешь связать со своим словом?</p>
        <section class="choices" aria-label="Три эмодзи">${state.options.map(emoji => control(escape(emoji), 'choose', emoji, 'emoji')).join('')}</section>` :
      '<p class="waiting">Игрок выбирает эмодзи.</p>') :
      `<p class="chosen">${escape(state.selected)}</p><p class="lede">${mine ?
        'Объясни связь вслух. Само слово держи в секрете.' : 'Послушай объяснение и запомни подсказку.'}</p>
        ${mine || isHost ? button('Дальше', 'done') : ''}`}
    ${history}`;
}

export function roomScreen(state) {
  return `<section class="panel round">
    <section class="round-status" aria-label="Время и готовность"><span id="progress"></span><time id="timer"></time></section>
    ${renderRoom(state)}
  </section>`;
}
