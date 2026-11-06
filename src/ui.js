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

function rocket() {
  return `<svg class="rocket" viewBox="0 0 88 112" aria-hidden="true" focusable="false">
    <path class="rocket-flame" d="M35 80q-8 14 9 30 17-16 9-30Z"/>
    <path class="rocket-fin" d="M32 51Q8 64 13 86l21-12m22-23q24 13 19 35L54 74"/>
    <path class="rocket-body" d="M44 3Q17 24 28 72l6 11h20l6-11Q71 24 44 3Z"/>
    <circle class="rocket-window" cx="44" cy="40" r="10"/>
  </svg>`;
}

function inspector() {
  return `<svg class="inspector" viewBox="0 0 106 86" aria-hidden="true" focusable="false">
    <path class="antennae" d="M35 24 24 9m47 15L82 9"/>
    <circle cx="23" cy="8" r="5"/><circle cx="83" cy="8" r="5"/>
    <path d="M53 17c27 0 42 14 42 32S72 79 53 82C34 79 11 67 11 49s15-32 42-32Z"/>
    <ellipse class="inspector-eye" cx="35" cy="48" rx="8" ry="12" transform="rotate(-21 35 48)"/>
    <ellipse class="inspector-eye" cx="71" cy="48" rx="8" ry="12" transform="rotate(21 71 48)"/>
    <path class="inspector-smile" d="M46 66q7 5 14 0"/>
  </svg>`;
}

export function entrance(code, testBots = false) {
  return `
    <section class="intro">
      ${checkpoint()}
      ${rocket()}
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
        ${testBots && !code ? '<button type="submit" name="mode" value="create-test" class="secondary" formnovalidate>Тест с ботами</button>' : ''}
      </form>
    </section>`;
}
function control(label, action, value, className = '') {
  return `<button type="button" class="${className}" data-action="${action}" data-value="${escape(value)}">${label}</button>`;
}

function evidenceCard(name, clues) {
  return `<strong>${name}</strong><span class="evidence-emojis">${clues.map(({ emoji, round }) =>
    `<span title="Раунд ${round}">${emoji ? escape(emoji) : '<small>Пропуск</small>'}</span>`).join('')}</span>`;
}

function renderRoom(state) {
  const isHost = state.host === state.me;
  const nameOf = id => escape(state.players.find(player => player.id === id)?.name ?? 'Игрок');
  const roster = row => `<ul class="roster">${state.players.map(player => row(player.id)).join('')}</ul>`;
  const finaleButton = label => isHost ? button(label, 'next-finale') : '<p class="waiting">Хост откроет следующий экран.</p>';
  if (state.phase === 'briefing') {
    const [title, caption] = state.nextPhase === 'vote'
      ? ['Пора сделать <em>выбор!</em>', 'Перед вами три улики на каждого. Кого отправим на досмотр?']
      : state.nextPhase === 'verdict'
        ? ['Сканер, <em>не подведи!</em>', 'Голоса приняты. Проверяем, кто прилетел с Земли.']
        : briefings[state.round - 1];
    const art = state.nextPhase === 'verdict'
      ? '<div class="scan-passport" aria-hidden="true"><span>✦</span></div>'
      : inspector();
    return `<div class="scene briefing">${art}${kicker('СВЯЗЬ С ТАМОЖНЕЙ')}<h1>${title}</h1><p>${caption}</p></div>`;
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
        ${townWins ? inspector() : rocket()}
        <span class="stamp">${townWins ? 'ПРИШЕЛЬЦЫ ПОБЕДИЛИ' : 'ДОПУСК РАЗРЕШЁН'}</span>
        <h1>${townWins ? 'Землян <em>вычислили!</em>' : 'Земляне <em>прошли контроль!</em>'}</h1>
        <p class="revealed-crew">Под прикрытием: <strong>${fakes.map(nameOf).join(', ')}</strong></p>
        ${finaleButton('Момент партии')}
      </div>`;
  }
  if (state.phase === 'moment') {
    const { moment } = state;
    return `<div class="scene">
      ${inspector()}
      ${kicker('УЛИКА ИЗ БАГАЖА')}
      <h1>${moment ? 'И как это <em>объяснили?</em>' : 'Багаж <em>пуст!</em>'}</h1>
      ${moment ? `<p class="chosen">${escape(moment.emoji)}</p>
        <p>${nameOf(moment.id)}, у тебя был код <strong>«${escape(moment.word)}»</strong>. Как ты объяснил этот эмодзи в раунде №${moment.round}?</p>`
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
    const cards = state.players.map(({ id }) => {
      const content = evidenceCard(nameOf(id), state.history.filter(entry => entry.id === id));
      return state.done || id === state.me
        ? `<div class="evidence-card">${content}${id === state.me ? '<small>Это ты</small>' : ''}</div>`
        : control(content, 'vote', id, 'evidence-card suspect');
    });
    return `${kicker('ФИНАЛЬНОЕ ГОЛОСОВАНИЕ')}<h1>Кто прилетел <em>с Земли?</em></h1>
      <p class="lede">${state.done ? 'Голос принят. Ждём остальных.' : 'Нажми на карточку подозреваемого. У тебя один голос.'}</p>
      <p>Людей под прикрытием: ${state.fakeCount}</p>
      <section class="evidence-grid" aria-label="Улики за три раунда">${cards.join('')}</section>`;
  }
  const label = kicker(inspections[state.round - 1] + ' · ' + state.round + '/3');
  if (state.phase === 'choose') {
    return `${label}<h1>Что у тебя <em>в багаже?</em></h1>${secret}
      ${state.options
        ? `<p class="lede">Выбери один эмодзи, который сможешь связать со своим кодом.</p>
          <section class="choices" aria-label="Три эмодзи">${state.options.map(emoji => control(`<span>${escape(emoji)}</span>`, 'choose', emoji, 'emoji')).join('')}</section>`
        : `<p class="chosen">${escape(state.selected)}</p><p class="waiting">Выбор запечатан. Ждём остальных.</p>`}`;
  }
  return `${label}<h1>Открываем <em>багаж!</em></h1>${secret}
    <p class="lede">Объясняйте свои эмодзи вслух, задавайте вопросы и спорьте в любом порядке. Код держите в секрете.</p>
    <section class="evidence-grid discussion-cards" aria-label="Эмодзи этого раунда">
      ${state.cards.map(clue => `<div class="evidence-card">${evidenceCard(nameOf(clue.id), [clue])}</div>`).join('')}
    </section>`;
}

export function roomScreen(state) {
  const clock = state.deadline !== null && state.phase !== 'briefing'
    ? '<div class="countdown"><time id="timer"></time><progress id="time-bar" aria-label="Осталось времени"></progress><span class="clock-warning" id="clock-warning" hidden>Шлюз закрывается</span></div>' : '';
  return `<section class="panel round">
    <section class="round-status" aria-label="Время и готовность"><span id="progress"></span>${clock}</section>
    ${renderRoom(state)}
  </section>`;
}
