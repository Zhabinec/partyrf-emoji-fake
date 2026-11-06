const musicLevel = document.querySelector('#music-level');
const effectsLevel = document.querySelector('#effects-level');
const settings = document.querySelector('#sound-settings');
const volumeKey = 'emoji-fake-volume';
const cues = new Map();
const volumes = { scanner: .48, confirm: .5, verdict: .55, 'clock-tick': .38 };
const background = new Audio('./assets/space-jazz.mp3');
background.loop = true;
background.preload = 'none';
let context;
let musicGain;
let effectsGain;
let phase;

try {
  const saved = JSON.parse(localStorage.getItem(volumeKey));
  musicLevel.value = saved?.music ?? 100;
  effectsLevel.value = saved?.effects ?? 100;
} catch {}

export function setSoundPhase(next = phase) {
  phase = next;
  if (!context) return;
  const playing = phase && !document.hidden && musicLevel.valueAsNumber > 0;
  if (!playing) {
    background.pause();
    if (!phase && background.readyState) background.currentTime = 0;
    return;
  }
  const level = phase === 'lobby' ? .38 : ['briefing', 'verdict'].includes(phase) ? .04 : .19;
  musicGain.gain.setTargetAtTime(level * musicLevel.valueAsNumber / 100, context.currentTime, .08);
  if (background.paused) void background.play().catch(() => {});
}

export function unlockSound(enteringRoom = false) {
  if (!window.AudioContext) return;
  if (!context) {
    context = new AudioContext();
    musicGain = context.createGain();
    musicGain.gain.value = 0;
    context.createMediaElementSource(background).connect(musicGain).connect(context.destination);
    effectsGain = context.createGain();
    effectsGain.gain.value = effectsLevel.valueAsNumber / 100;
    effectsGain.connect(context.destination);
  }
  if (context.state !== 'running') void context.resume().catch(() => {});
  if (enteringRoom && !phase && musicLevel.valueAsNumber > 0) {
    void background.play().catch(() => {});
  } else setSoundPhase();
}

export async function playEffect(name, stillCurrent = () => true) {
  if (!context || document.hidden || effectsLevel.valueAsNumber === 0) return;
  if (!cues.has(name)) {
    cues.set(name, fetch('./assets/' + name + '.mp3')
      .then(response => {
        if (!response.ok) throw new Error('Sound unavailable');
        return response.arrayBuffer();
      })
      .then(buffer => context.decodeAudioData(buffer))
      .catch(() => null));
  }
  const buffer = await cues.get(name);
  if (!buffer || !stillCurrent() || document.hidden || effectsLevel.valueAsNumber === 0 || context.state !== 'running') return;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = volumes[name];
  source.connect(gain).connect(effectsGain);
  source.onended = () => gain.disconnect();
  source.start();
}

function showLevels() {
  document.querySelector('#music-value').textContent = musicLevel.value + '%';
  document.querySelector('#effects-value').textContent = effectsLevel.value + '%';
}

showLevels();
document.querySelector('#sound-toggle').addEventListener('click', () => {
  unlockSound();
  document.querySelector('#header-menu').open = false;
  settings.showModal();
});
settings.addEventListener('close', () => document.querySelector('#header-menu summary').focus());
settings.addEventListener('input', () => {
  unlockSound();
  effectsGain?.gain.setTargetAtTime(effectsLevel.valueAsNumber / 100, context.currentTime, .025);
  showLevels();
  try {
    localStorage.setItem(volumeKey, JSON.stringify({ music: musicLevel.valueAsNumber, effects: effectsLevel.valueAsNumber }));
  } catch {}
});
document.addEventListener('visibilitychange', () => setSoundPhase());
