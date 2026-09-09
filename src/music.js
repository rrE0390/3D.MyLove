export function createBackgroundMusic() {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./music.css', import.meta.url).href;
  document.head.append(stylesheet);

  const audio = document.createElement('audio');
  audio.id = 'background-music';
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.4;
  const panel = document.createElement('div');
  panel.className = 'music-player';
  panel.hidden = true;
  const status = document.createElement('p');
  status.className = 'music-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  const buttons = [];
  let ready = false, wanted = false, pending = false, manuallyChosen = false, revision = 0;

  function sync(message = '') {
    const playing = !audio.paused && !pending && !audio.error;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', wanted ? 'Приостановить фоновую музыку' : 'Включить фоновую музыку');
      button.querySelector('.music-icon').textContent = wanted ? 'Ⅱ' : '♪';
      button.querySelector('.music-label').textContent = pending ? 'Загрузка…' : playing ? 'Музыка · пауза' : 'Включить музыку';
    }
    status.textContent = message;
    status.hidden = !message;
  }
  function pause() {
    ++revision;
    wanted = pending = false;
    audio.pause();
    sync();
  }
  async function play() {
    if (!ready) return;
    const attempt = ++revision;
    wanted = pending = true;
    sync();
    try {
      if (audio.error) audio.load();
      // Keep play() inside the click handler: mobile browsers require a gesture.
      await audio.play();
      if (attempt !== revision) return;
      pending = false;
      sync();
    } catch (error) {
      if (attempt !== revision) return;
      wanted = pending = false;
      sync(error.name === 'NotAllowedError' ? 'Нажми «Включить музыку», чтобы разрешить звук.' : 'Музыка не загрузилась. Нажми ещё раз, чтобы повторить.');
    }
  }
  function makeButton(className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `music-toggle ${className}`;
    const icon = document.createElement('span');
    icon.className = 'music-icon';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'music-label';
    button.append(icon, label);
    button.addEventListener('click', () => {
      manuallyChosen = true;
      if (wanted || !audio.paused) pause(); else void play();
    });
    buttons.push(button);
    return button;
  }
  panel.append(status, makeButton());
  document.body.append(audio, panel);
  const dialogButton = makeButton('dialog-music');
  dialogButton.hidden = true;
  document.getElementById('photo-dialog')?.append(dialogButton);
  document.getElementById('skip-intro')?.addEventListener('click', () => {
    if (!manuallyChosen && !wanted) void play();
  });
  audio.addEventListener('playing', () => { pending = false; wanted = true; sync(); });
  audio.addEventListener('pause', () => { wanted = pending = false; sync(); });
  audio.addEventListener('waiting', () => { if (wanted) { pending = true; sync(); } });
  audio.addEventListener('error', () => {
    wanted = pending = false;
    sync('Не удалось прочитать музыку. Проверь файл или нажми ещё раз.');
  });
  sync();

  void (async () => {
    try {
      const response = await fetch(new URL('../music-manifest.json', import.meta.url), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      if (!manifest.src) return;
      const base = new URL('../', import.meta.url);
      const source = new URL(manifest.src, base);
      if (source.origin !== base.origin || !source.pathname.startsWith(base.pathname)) throw new Error('Music must be a local site asset');
      audio.src = source.href;
      ready = true;
      panel.hidden = dialogButton.hidden = false;
    } catch (error) {
      console.warn('Фоновая музыка недоступна.', error);
    }
  })();
}
