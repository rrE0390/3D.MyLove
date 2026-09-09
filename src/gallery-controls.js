const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createGalleryControls(stage, { onZoom, onRotate, onSelect, onInteraction, stepAngle }) {
  const events = new AbortController();
  const listen = (element, type, callback, options = {}) =>
    element.addEventListener(type, callback, { ...options, signal: events.signal });
  const originalTabIndex = stage.getAttribute('tabindex');
  const originalLabel = stage.getAttribute('aria-label');
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', 'Круг фотографий. Поворот мышью или одним пальцем. Приближение колёсиком, двумя пальцами или кнопками под кругом.');

  const toolbar = document.createElement('div');
  toolbar.className = 'gallery-zoom-controls';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', 'Масштаб круга фотографий');
  const label = document.createElement('span');
  label.className = 'gallery-zoom-label';
  label.textContent = 'Масштаб круга';
  toolbar.append(label);
  function button(id, text, name) {
    const element = document.createElement('button');
    element.type = 'button';
    element.id = id;
    element.textContent = text;
    element.setAttribute('aria-label', name);
    toolbar.append(element);
    return element;
  }
  const minus = button('gallery-zoom-out', '−', 'Отдалить круг фотографий');
  const reset = button('gallery-zoom-reset', '100%', 'Вернуть исходный масштаб круга');
  const plus = button('gallery-zoom-in', '+', 'Приблизить круг фотографий');
  stage.insertAdjacentElement('afterend', toolbar);
  let zoom = 1;
  function updateControls() {
    const focused = document.activeElement;
    minus.disabled = zoom <= MIN_ZOOM;
    plus.disabled = zoom >= MAX_ZOOM;
    if ((focused === minus && minus.disabled) || (focused === plus && plus.disabled)) reset.focus({ preventScroll: true });
    reset.textContent = `${Math.round(zoom * 100)}%`;
    reset.setAttribute('aria-label', `Масштаб круга ${Math.round(zoom * 100)}%. Вернуть исходный масштаб`);
    stage.dataset.zoom = String(zoom);
  }
  function setZoom(value) {
    const next = clamp(value, MIN_ZOOM, MAX_ZOOM);
    if (next === zoom) return;
    zoom = next;
    updateControls();
    onZoom(zoom);
  }
  function activateButton(element, action) {
    let touchStart = null, lastTouch = -Infinity;
    listen(element, 'pointerdown', event => {
      if (event.pointerType === 'touch') touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    listen(element, 'pointercancel', () => { touchStart = null; });
    listen(element, 'pointerup', event => {
      if (!touchStart || event.pointerId !== touchStart.id) return;
      const tapped = Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 10;
      touchStart = null;
      if (tapped && !element.disabled) { lastTouch = performance.now(); action(); }
    });
    listen(element, 'click', event => {
      if (event.detail > 0 && performance.now() - lastTouch < 500) return;
      action();
    });
  }
  activateButton(minus, () => setZoom(zoom - .25));
  activateButton(plus, () => setZoom(zoom + .25));
  activateButton(reset, () => setZoom(1));

  const pointers = new Map();
  let gesture = null, moved = false, multiTouch = false;
  function distance() {
    const [a, b] = [...pointers.values()];
    return Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
  }
  function rebase() {
    if (pointers.size >= 2) {
      gesture = { type: 'pinch', distance: distance(), zoom };
    } else if (pointers.size === 1) {
      const point = [...pointers.values()][0];
      gesture = { type: 'undecided', startX: point.x, startY: point.y, lastX: point.x, lastY: point.y };
    } else gesture = null;
  }
  listen(stage, 'pointerdown', event => {
    if (event.button !== 0) return;
    if (!pointers.size) { moved = false; multiTouch = false; }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) { multiTouch = true; moved = true; }
    stage.setPointerCapture(event.pointerId);
    onInteraction(true);
    rebase();
  });
  listen(stage, 'pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      moved = true;
      setZoom(gesture.zoom * distance() / gesture.distance);
      return;
    }
    const totalX = event.clientX - gesture.startX, totalY = event.clientY - gesture.startY;
    if (gesture.type === 'undecided' && Math.hypot(totalX, totalY) > 7) {
      moved = true;
      gesture.type = Math.abs(totalX) >= Math.abs(totalY) ? 'rotate' : 'scroll';
    }
    if (gesture.type === 'rotate') {
      onRotate((event.clientX - gesture.lastX) / Math.max(1, stage.clientWidth) * Math.PI * 2 * .65);
    } else if (gesture.type === 'scroll' && event.pointerType === 'touch') {
      // touch-action:none lets two fingers pinch; preserve page scrolling for one finger.
      window.scrollBy({ top: gesture.lastY - event.clientY, behavior: 'instant' });
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  });
  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const tapped = event.type === 'pointerup' && !moved && !multiTouch;
    pointers.delete(event.pointerId);
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!pointers.size) onInteraction(false);
    rebase();
    if (tapped) {
      const rect = stage.getBoundingClientRect();
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) onSelect(event.clientX, event.clientY);
    }
  }
  listen(stage, 'pointerup', endPointer);
  listen(stage, 'pointercancel', endPointer);
  listen(stage, 'lostpointercapture', endPointer);
  listen(stage, 'wheel', event => {
    event.preventDefault();
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
    setZoom(zoom * Math.exp(-clamp(event.deltaY * multiplier, -300, 300) * .0025));
  }, { passive: false });
  listen(stage, 'keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') setZoom(zoom + .25);
    else if (event.key === '-' || event.key === '_') setZoom(zoom - .25);
    else if (event.key === '0') setZoom(1);
    else if (event.key === 'ArrowLeft') onRotate(-stepAngle);
    else if (event.key === 'ArrowRight') onRotate(stepAngle);
    else return;
    event.preventDefault();
  });
  updateControls();
  return {
    dispose() {
      events.abort();
      for (const id of pointers.keys()) if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
      pointers.clear();
      onInteraction(false);
      toolbar.remove();
      delete stage.dataset.zoom;
      if (originalTabIndex === null) stage.removeAttribute('tabindex'); else stage.setAttribute('tabindex', originalTabIndex);
      if (originalLabel === null) stage.removeAttribute('aria-label'); else stage.setAttribute('aria-label', originalLabel);
    },
  };
}
