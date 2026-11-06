const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const button = (label, action) => `<button type="button" data-action="${action}">${label}</button>`;
const kicker = text => `<p class="kicker">${text}</p>`;
const inspections = ['Проверка документов', 'Досмотр багажа', 'Последний контроль'];
const briefings = [
  ['Паспорта <em>на сканер!</em>', 'В паспорте будет секретный код. Не зачитывай его вслух.'],
  ['Открываем <em>багаж!</em>', 'Новая тройка эмодзи. Старые отговорки ещё в силе.'],
  ['Последний <em>шлюз!</em>', 'Ещё один круг. Кто-то здесь очень убедительно притворяется.'],
];

function checkpoint() {
  return `<svg class="checkpoint" viewBox="0 0 280 190" aria-hidden="true" focusable="false">
    <ellipse class="orbit" cx="140" cy="95" rx="126" ry="47" transform="rotate(-22 140 95)"/>
    <circle class="planet" cx="140" cy="95" r="72"/>
    <path class="orbit" d="M90 70h100M78 95h124M90 120h100"/>
    <path class="scan" d="M79 95h122"/>
    <path class="brackets" d="M56 70V45h25m118 0h25v25m0 50v25h-25m-118 0H56v-25"/>
    <circle class="beacon" cx="230" cy="48" r="6"/>
  </svg>`;
}

function passport(label, word) {
  return `<div class="topic passport"><small>${label}</small><strong>${escape(word)}</strong></div>`;
}

export function entrance(code) {
  return `
    <section class="intro">
      ${checkpoint()}
      ${kicker('КОСМИЧЕСКАЯ ТАМОЖНЯ · 3–10 ИГРОКОВ')}
      <h1>Эмодзи<br><em>фейк</em></h1>
      <p class="lede">У пришельцев один код допуска. У землян под прикрытием — похожий. Выбирайте эмодзи, объясняйте их вслух и вычисляйте, кто прилетел с Земли.</p>
      <ol class="beats"><li>Открой паспорт</li><li>Объясни эмодзи</li><li>Вычисли землян</li></ol>
    </section>
    <section class="panel entry">
      ${kicker('ОРБИТАЛЬНЫЙ ТЕРМИНАЛ')}
      <h2>${code ? 'Тебя ждут у шлюза' : 'Посадка открыта'}</h2>
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
  const finaleButton = label => isHost ? button(label, 'next-finale') : '<p class="waiting">Хост откроет следующий экран.</p>';
  if (state.phase === 'briefing') {
    const [title, caption] = state.nextPhase === 'vote'
      ? ['Кого <em>на досмотр?</em>', 'Вспомните объяснения. Сейчас у каждого будет один голос.']
      : state.nextPhase === 'verdict'
        ? ['Сканер, <em>не подведи!</em>', 'Голоса приняты. Проверяем, кто прилетел с Земли.']
        : briefings[state.round - 1];
    return `<div class="scene briefing">${checkpoint()}${kicker('СВЯЗЬ С ТАМОЖНЕЙ')}<h1>${title}</h1><p>${caption}</p></div>`;
  }
  if (state.phase === 'lobby') {
    return `${kicker('У ШЛЮЗА · ' + state.players.length + ' / 10')}
      <h1>Пассажиры <em>на борт!</em></h1>
      <p class="lede">Отправь друзьям ссылку. Для старта нужно минимум три игрока.</p>
      <section class="invite"><strong>${state.code}</strong>${button('Скопировать ссылку', 'copy')}</section>
      <input id="invite-link" class="invite-link" aria-label="Ссылка на комнату" readonly>
      ${roster(id => `<li><span>${nameOf(id)}</span><b>${id === state.host ? 'Хост' : 'В комнате'}</b></li>`)}
      ${isHost && state.players.length >= 3 ? button('Начать досмотр', 'start') : '<p class="waiting">Ждём открытия шлюза.</p>'}`;
  }
  if (state.phase === 'verdict') {
    const { townWins, fakes } = state.result;
    return `<div class="scene verdict" data-verdict="${townWins ? 'caught' : 'escaped'}">
        <span class="stamp">${townWins ? 'ПРИШЕЛЬЦЫ ПОБЕДИЛИ' : 'ЗЕМЛЯНЕ ПОБЕДИЛИ'}</span>
        <h1>${townWins ? 'Землян <em>вычислили!</em>' : 'Земляне <em>прошли контроль!</em>'}</h1>
        <p class="revealed-crew">Под прикрытием: <strong>${fakes.map(nameOf).join(', ')}</strong></p>
        ${finaleButton('Момент партии')}
      </div>`;
  }
  if (state.phase === 'moment') {
    const { moment } = state;
    return `<div class="scene">
      ${kicker('УЛИКА ИЗ БАГАЖА')}
      <h1>${moment ? 'И как это <em>объяснили?</em>' : 'Багаж <em>пуст!</em>'}</h1>
      ${moment ? `<p class="chosen">${escape(moment.emoji)}</p>
        <p>${nameOf(moment.id)} · раунд ${moment.round} · код «${escape(moment.word)}»</p>`
        : '<p>В журнале нет эмодзи от землян.</p>'}
      ${finaleButton('Открыть послесловие')}
    </div>`;
  }
  const history = state.history.length ? `<details class="clues"><summary>Журнал досмотра</summary>
    <ul class="roster">${state.history.map(({ id, emoji, round }) => `<li><span>${nameOf(id)} <small>раунд ${round}</small></span><b>${escape(emoji ?? 'Пропуск')}</b></li>`).join('')}</ul></details>` : '';
  if (state.phase === 'finished') {
    const { fakes, words, counts, accused } = state.result;
    return `${kicker('ПОСЛЕСЛОВИЕ')}<h1>Архив <em>таможни</em></h1>
      <div class="manifest">${passport('КОД ПРИШЕЛЬЦЕВ', words[0])}${passport('КОД ЗЕМЛЯН', words[1])}</div>
      <p>Под подозрением: <strong>${accused.length ? accused.map(nameOf).join(', ') : 'никто не набрал решающего перевеса'}</strong></p>
      ${roster(id => id in counts ? `<li><span>${nameOf(id)}${fakes.includes(id) ? ' <small>землянин</small>' : ''}</span><b>${counts[id]}</b></li>` : '')}
      ${history}
      ${isHost ? button('Сыграть ещё', 'start') : '<p class="waiting">Хост может начать новую партию.</p>'}`;
  }

  const secret = passport('ТВОЙ ПАСПОРТ · СЕКРЕТНЫЙ КОД', state.word);

  if (state.phase === 'vote') {
    return `${kicker('ГОЛОСОВАНИЕ')}<h1>Кто прилетел <em>с Земли?</em></h1>${secret}
      <p class="lede">Людей под прикрытием: ${state.fakeCount}. У тебя один голос.</p>
      ${state.done ? '<p class="waiting">Голос принят. Ждём остальных.</p>' :
        `<form data-form="vote"><label for="suspect">Твой подозреваемый</label>
          <select id="suspect" name="value" required><option value="">Выбери игрока</option>
            ${state.players.filter(player => player.id !== state.me).map(player =>
              `<option value="${escape(player.id)}">${nameOf(player.id)}</option>`).join('')}
          </select><button type="submit">Отправить на досмотр</button></form>`}${history}`;
  }
  const mine = state.speaker === state.me;
  const choosing = state.phase === 'choose';
  return `${kicker(inspections[state.round - 1] + ' · ' + state.round + '/3 · ХОД ' + state.turn.join(' / '))}
    <h1>${mine ? (choosing ? 'Что у тебя <em>в багаже?</em>' : 'И как это <em>сюда попало?</em>') :
      `На досмотре <em>${nameOf(state.speaker)}</em>`}</h1>
    ${secret}
    ${choosing ? (mine ?
      `<p class="lede">Выбери один эмодзи, который сможешь связать со своим кодом.</p>
        <section class="choices" aria-label="Три эмодзи">${state.options.map(emoji => control(escape(emoji), 'choose', emoji, 'emoji')).join('')}</section>` :
      '<p class="waiting">Игрок выбирает эмодзи.</p>') :
      `<p class="chosen">${escape(state.selected)}</p><p class="lede">${mine ?
        'Объясни связь вслух. Сам код держи в секрете.' : 'Послушай объяснение. Подозрительный багаж запоминается.'}</p>
        ${mine || isHost ? button('Следующий пассажир', 'done') : ''}`}
    ${history}`;
}

export function roomScreen(state) {
  const clock = state.deadline !== null && state.phase !== 'briefing'
    ? '<div class="countdown"><time id="timer"></time><progress id="time-bar" aria-label="Осталось времени"></progress></div>' : '';
  return `<section class="panel round">
    <section class="round-status" aria-label="Время и готовность"><span id="progress"></span>${clock}</section>
    ${renderRoom(state)}
  </section>`;
}
