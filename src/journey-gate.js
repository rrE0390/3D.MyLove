export function createJourneyGate({ music, onStart, reducedMotion }) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./journey-gate.css', import.meta.url).href;
  document.head.append(stylesheet);
  const gate = document.createElement('section');
  gate.id = 'journey-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'journey-label');
  gate.tabIndex = -1;
  // Critical layout prevents a flash of the underlying page while CSS loads.
  Object.assign(gate.style, { position: 'fixed', inset: '0', zIndex: '40', backgroundColor: '#100c16' });
  gate.innerHTML = `
    <div class="journey-top"><span>Лиза <i aria-hidden="true">♡</i></span><span>ТОЛЬКО ДЛЯ ТЕБЯ</span></div>
    <div class="journey-center">
      <p class="journey-kicker">У КАЖДОЙ ИСТОРИИ ЕСТЬ НАЧАЛО</p>
      <button id="journey-start" type="button" disabled aria-describedby="journey-hint">
        <span class="journey-art" aria-hidden="true">
          <span class="journey-orbit"></span><span class="journey-star star-one">✧</span><span class="journey-star star-two">✦</span>
          <svg class="journey-lock" viewBox="0 0 240 280" fill="none">
            <defs>
              <linearGradient id="lock-gold" x1="55" y1="75" x2="195" y2="235" gradientUnits="userSpaceOnUse"><stop stop-color="#fff1d5"/><stop offset=".3" stop-color="#eec5b1"/><stop offset=".6" stop-color="#b77779"/><stop offset="1" stop-color="#e3ad8e"/></linearGradient>
              <linearGradient id="lock-edge" x1="60" y1="40" x2="160" y2="145" gradientUnits="userSpaceOnUse"><stop stop-color="#ffeaca"/><stop offset=".5" stop-color="#b17c77"/><stop offset="1" stop-color="#f7d4b7"/></linearGradient>
              <radialGradient id="lock-face"><stop stop-color="#f9d8c2"/><stop offset="1" stop-color="#d69a94"/></radialGradient>
            </defs>
            <g class="lock-shackle"><path d="M77 139V88a43 43 0 0 1 86 0v51" stroke="#513039" stroke-width="23" stroke-linecap="round"/><path d="M77 135V86a43 43 0 0 1 86 0v49" stroke="url(#lock-edge)" stroke-width="17" stroke-linecap="round"/><path d="M73 112V86a47 47 0 0 1 72-40" stroke="#fff2db" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/></g>
            <path d="M120 249C104 238 35 195 35 151c0-31 24-47 47-42 16 2 30 13 38 25 8-12 22-23 38-25 23-5 47 11 47 42 0 44-69 87-85 98Z" fill="#643c45" transform="translate(0 5)"/>
            <path d="M120 249C104 238 35 195 35 151c0-31 24-47 47-42 16 2 30 13 38 25 8-12 22-23 38-25 23-5 47 11 47 42 0 44-69 87-85 98Z" fill="url(#lock-gold)" stroke="#f8d6bd" stroke-width="1.4"/>
            <path d="M120 232c-23-17-70-49-70-81 0-21 16-34 33-29 17 4 28 17 37 29 9-12 20-25 37-29 17-5 33 8 33 29 0 32-47 64-70 81Z" stroke="#ffead1" stroke-opacity=".5"/>
            <path d="M53 154c0-24 16-31 29-27" stroke="#fff1db" stroke-width="4" stroke-linecap="round" opacity=".7"/>
            <circle cx="120" cy="179" r="21" fill="url(#lock-face)" stroke="#aa706f" stroke-opacity=".5"/>
            <path d="M120 167a7 7 0 0 0-4 13l-3 12h14l-3-12a7 7 0 0 0-4-13Z" fill="#62414a"/>
            <path d="M118 169a4 4 0 0 0-2 6" stroke="#311e2e" stroke-linecap="round"/>
          </svg>
        </span>
        <span id="journey-label">Начать путешествие</span>
        <span class="journey-button-line" aria-hidden="true"></span>
      </button>
      <p id="journey-hint" role="status">Готовим нашу историю…</p>
    </div>
    <p class="journey-bottom">Один маленький шаг — в наш мир <span aria-hidden="true">♡</span></p>`;
  document.body.append(gate);
  document.body.style.overflow = 'hidden';
  const page = document.getElementById('page');
  const intro = document.getElementById('intro');
  page.inert = true;
  intro.hidden = true;
  gate.focus({ preventScroll: true });
  const button = gate.querySelector('button');
  let started = false;
  gate.addEventListener('keydown', event => {
    if (event.key === 'Tab') { event.preventDefault(); if (!button.disabled) button.focus(); }
  });
  music.ready.finally(() => {
    button.disabled = false;
    gate.querySelector('#journey-hint').textContent = 'Коснись замочка — и наша история оживёт';
    if (document.activeElement === gate) button.focus({ preventScroll: true });
  });
  button.addEventListener('click', () => {
    if (started) return;
    started = true;
    // Audio must start synchronously in this click, before animation/timers.
    music.start();
    button.disabled = true;
    gate.classList.add('is-opening');
    gate.querySelector('#journey-hint').textContent = 'Добро пожаловать в наш мир';
    setTimeout(() => {
      gate.remove();
      onStart();
    }, reducedMotion.matches ? 0 : 850);
  });
}
