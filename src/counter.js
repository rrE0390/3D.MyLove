// The original site's exact start, made independent of the visitor's time zone.
export const START = Date.parse('2026-02-13T23:46:22+08:00');
const OFFSET = 8 * 60 * 60 * 1000;
const DAY = 86400000;

export function elapsedTogether(now = Date.now()) {
  if (now < START) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const local = new Date(now + OFFSET);
  let months = (local.getUTCFullYear() - 2026) * 12 + local.getUTCMonth() - 1;
  let anchor = Date.UTC(2026, 1 + months, 13, 23, 46, 22) - OFFSET;
  if (anchor > now) {
    months--;
    anchor = Date.UTC(2026, 1 + months, 13, 23, 46, 22) - OFFSET;
  }
  const remainder = now - anchor;
  return { months, days: Math.floor(remainder / DAY), hours: Math.floor(remainder / 3600000) % 24, minutes: Math.floor(remainder / 60000) % 60, seconds: Math.floor(remainder / 1000) % 60 };
}

export function plural(value, forms) {
  const n = value % 100;
  return forms[n >= 11 && n <= 14 ? 2 : n % 10 === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 ? 1 : 2];
}

export function startCounter() {
  const forms = { months: ['месяц', 'месяца', 'месяцев'], days: ['день', 'дня', 'дней'], hours: ['час', 'часа', 'часов'], minutes: ['минута', 'минуты', 'минут'], seconds: ['секунда', 'секунды', 'секунд'] };
  function update() {
    for (const [key, value] of Object.entries(elapsedTogether())) {
      const text = String(value).padStart(2, '0');
      const element = document.getElementById(key);
      if (element.textContent !== text) element.textContent = text;
      document.getElementById(`${key}-label`).textContent = plural(value, forms[key]);
    }
  }
  update();
  let timer;
  function tick() { update(); timer = setTimeout(tick, 1000 - Date.now() % 1000 + 10); }
  function resume() { clearTimeout(timer); if (!document.hidden) tick(); }
  document.addEventListener('visibilitychange', resume);
  tick();
}
