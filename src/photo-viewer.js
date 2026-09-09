const MIN_SCALE = 1;
const MAX_SCALE = 5;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// All coordinates are CSS pixels relative to the centre of the photo viewport.
export function createPhotoViewer(container, { src, alt, onError }) {
  const events = new AbortController();
  const listen = (element, type, callback, options = {}) =>
    element.addEventListener(type, callback, { ...options, signal: events.signal });
  const viewport = document.createElement('div');
  viewport.className = 'photo-viewport';
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'group');
  viewport.setAttribute('aria-label', 'Фотография. Приближение колёсиком или двумя пальцами.');
  const image = document.createElement('img');
  image.className = 'photo-zoom-image';
  image.alt = alt;
  image.draggable = false;
  image.decoding = 'async';
  const loading = document.createElement('span');
  loading.className = 'photo-loading';
  loading.textContent = 'Открываем мгновение…';
  viewport.append(image, loading);

  const controls = document.createElement('div');
  controls.className = 'photo-zoom-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Масштаб фотографии');
  function button(id, text, label) {
    const element = document.createElement('button');
    element.type = 'button';
    element.id = id;
    element.textContent = text;
    element.setAttribute('aria-label', label);
    controls.append(element);
    return element;
  }
  const minus = button('photo-zoom-out', '−', 'Уменьшить фотографию');
  const reset = button('photo-zoom-reset', '100%', 'Вернуть исходный масштаб');
  const plus = button('photo-zoom-in', '+', 'Приблизить фотографию');
  const hint = document.createElement('p');
  hint.className = 'photo-zoom-hint';
  hint.textContent = 'Колёсико или два пальца — приблизить';
  container.append(viewport, controls, hint);

  let ready = false, destroyed = false;
  let scale = 1, x = 0, y = 0;
  let width = 1, height = 1, baseWidth = 1, baseHeight = 1;
  const pointers = new Map();
  let gesture = null, moved = false, hadMultiplePointers = false, lastTap = null, lastTouchEnd = -Infinity;

  function bound() {
    const limitX = Math.max(0, (baseWidth * scale - width) / 2);
    const limitY = Math.max(0, (baseHeight * scale - height) / 2);
    x = clamp(x, -limitX, limitX);
    y = clamp(y, -limitY, limitY);
    if (scale === 1) x = y = 0;
  }
  function render() {
    bound();
    image.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    viewport.classList.toggle('is-zoomed', scale > 1.001);
    viewport.dataset.scale = String(scale);
    const focused = document.activeElement;
    minus.disabled = !ready || scale <= MIN_SCALE;
    plus.disabled = !ready || scale >= MAX_SCALE;
    reset.disabled = !ready;
    if ((focused === plus && plus.disabled) || (focused === minus && minus.disabled)) reset.focus({ preventScroll: true });
    reset.textContent = `${Math.round(scale * 100)}%`;
    reset.setAttribute('aria-label', `Масштаб ${Math.round(scale * 100)}%. Вернуть исходный масштаб`);
    hint.textContent = scale > 1.001 ? 'Перетяни фото, чтобы рассмотреть детали' : 'Колёсико или два пальца — приблизить';
  }
  function local(point) {
    const rect = viewport.getBoundingClientRect();
    return { x: point.clientX - rect.left - width / 2, y: point.clientY - rect.top - height / 2 };
  }
  function zoomTo(value, anchor = { x: 0, y: 0 }) {
    if (!ready) return;
    const next = clamp(value, MIN_SCALE, MAX_SCALE);
    const ratio = next / scale;
    x = anchor.x - (anchor.x - x) * ratio;
    y = anchor.y - (anchor.y - y) * ratio;
    scale = next;
    render();
  }
  function resetView() {
    scale = 1; x = y = 0;
    render();
  }
  function fit() {
    if (!ready || destroyed) return;
    const oldWidth = baseWidth, oldHeight = baseHeight;
    width = Math.max(1, viewport.clientWidth);
    const maxHeight = Math.min(680, window.innerHeight * (container.closest('dialog').classList.contains('has-description') ? .55 : .65));
    height = Math.max(72, Math.min(maxHeight, width * image.naturalHeight / image.naturalWidth));
    viewport.style.height = `${height}px`;
    const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    baseWidth = image.naturalWidth * ratio;
    baseHeight = image.naturalHeight * ratio;
    image.style.width = `${baseWidth}px`;
    image.style.height = `${baseHeight}px`;
    x *= baseWidth / oldWidth;
    y *= baseHeight / oldHeight;
    render();
    rebaseGesture();
  }
  function pairInfo() {
    const [a, b] = [...pointers.values()].slice(0, 2).map(local);
    return { centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)) };
  }
  function rebaseGesture() {
    if (pointers.size >= 2) {
      const pair = pairInfo();
      gesture = { kind: 'pinch', scale, x, y, ...pair };
    } else if (pointers.size === 1) {
      const point = [...pointers.values()][0];
      gesture = { kind: 'pan', clientX: point.clientX, clientY: point.clientY, x, y, lastY: point.clientY };
    } else gesture = null;
  }

  listen(viewport, 'pointerdown', event => {
    if (!ready || event.button !== 0) return;
    if (!pointers.size) { moved = false; hadMultiplePointers = false; }
    pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (pointers.size > 1) { hadMultiplePointers = true; lastTap = null; }
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
    rebaseGesture();
  });
  listen(viewport, 'pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    if (gesture.kind === 'pinch' && pointers.size >= 2) {
      moved = true;
      const pair = pairInfo();
      scale = clamp(gesture.scale * pair.distance / gesture.distance, MIN_SCALE, MAX_SCALE);
      const ratio = scale / gesture.scale;
      x = pair.centre.x - (gesture.centre.x - gesture.x) * ratio;
      y = pair.centre.y - (gesture.centre.y - gesture.y) * ratio;
      render();
    } else if (pointers.size === 1) {
      const dx = event.clientX - gesture.clientX, dy = event.clientY - gesture.clientY;
      if (Math.hypot(dx, dy) > 7) moved = true;
      if (scale > 1.001) {
        x = gesture.x + dx; y = gesture.y + dy;
        render();
      } else if (event.pointerType === 'touch') {
        // A single finger at 100% still scrolls the description in the modal.
        container.closest('dialog').scrollTop -= event.clientY - gesture.lastY;
      }
      gesture.lastY = event.clientY;
    }
  });
  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    if (event.pointerType === 'touch') lastTouchEnd = performance.now();
    const isTap = event.type === 'pointerup' && event.pointerType === 'touch' && !moved && !hadMultiplePointers;
    pointers.delete(event.pointerId);
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (isTap) {
      const now = performance.now();
      if (lastTap && now - lastTap.time < 320 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 28) {
        zoomTo(scale > 1.001 ? 1 : 2.5, local(event)); lastTap = null;
      } else lastTap = { time: now, x: event.clientX, y: event.clientY };
    }
    if (!pointers.size) viewport.classList.remove('is-dragging');
    rebaseGesture();
  }
  listen(viewport, 'pointerup', endPointer);
  listen(viewport, 'pointercancel', endPointer);
  listen(viewport, 'lostpointercapture', endPointer);
  listen(viewport, 'dblclick', event => {
    event.preventDefault();
    // Touch double-taps can also synthesize a dblclick; apply the zoom only once.
    if (performance.now() - lastTouchEnd < 500) return;
    zoomTo(scale > 1.001 ? 1 : 2.5, local(event));
  });
  listen(viewport, 'wheel', event => {
    if (!ready) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    zoomTo(scale * Math.exp(-clamp(delta, -300, 300) * .0025), local(event));
  }, { passive: false });
  listen(viewport, 'dragstart', event => event.preventDefault());
  function activateButton(element, action) {
    let touchStart = null, lastTouchActivation = -Infinity;
    listen(element, 'pointerdown', event => {
      if (event.pointerType === 'touch') touchStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    listen(element, 'pointercancel', () => { touchStart = null; });
    listen(element, 'pointerup', event => {
      if (!touchStart || event.pointerId !== touchStart.id) return;
      const isTap = Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) < 10;
      touchStart = null;
      if (isTap && !element.disabled) {
        // Some mobile browsers suppress the first synthesized click after a pinch.
        lastTouchActivation = performance.now();
        action();
      }
    });
    listen(element, 'click', event => {
      if (event.detail > 0 && performance.now() - lastTouchActivation < 500) return;
      action();
    });
  }
  activateButton(minus, () => zoomTo(scale - .5));
  activateButton(plus, () => zoomTo(scale + .5));
  activateButton(reset, resetView);
  listen(image, 'load', () => {
    ready = true;
    loading.hidden = true;
    viewport.classList.add('is-ready');
    fit();
  });
  listen(image, 'error', () => { if (!destroyed) onError?.(); });
  const resize = new ResizeObserver(fit);
  resize.observe(container);
  listen(window, 'resize', fit);
  image.src = src;
  render();

  return {
    handleKey(event) {
      if (!ready || event.ctrlKey || event.metaKey || event.altKey) return false;
      if (event.key === '+' || event.key === '=') zoomTo(scale + .5);
      else if (event.key === '-' || event.key === '_') zoomTo(scale - .5);
      else if (event.key === '0') resetView();
      else if (scale > 1.001 && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        if (event.key === 'ArrowLeft') x += 40;
        if (event.key === 'ArrowRight') x -= 40;
        if (event.key === 'ArrowUp') y += 40;
        if (event.key === 'ArrowDown') y -= 40;
        render();
      } else return false;
      event.preventDefault();
      return true;
    },
    destroy() {
      destroyed = true;
      events.abort();
      resize.disconnect();
      for (const id of pointers.keys()) if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
      pointers.clear();
    },
  };
}
