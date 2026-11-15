// Рейл с одеждой для магазина FORMA: настоящие вещи (фото с вырезанным фоном, img/cut/g*.webp) висят на верёвке,
// въезжают при загрузке, качаются при перетаскивании, опускаются при наведении; по клику вещь открывается крупно
// с размерами, а после «в корзину» улетает в иконку.
import { DEMOS } from './demos.js';

// a — пропорции фото (ширина/высота), w — ширина относительно шага рейла, p — цена.
// Порядок совпадает с названиями в lang-файлах (more.shop.rail).
export const RAIL = [
  { a: 0.674, w: 1.3, p: '320 €' },  // тёмно-синий смокинг
  { a: 0.806, w: 1.42, p: '240 €' }, // жакет графит
  { a: 0.701, w: 1.4, p: '130 €' },  // вязаный свитер
  { a: 0.601, w: 1.12, p: '90 €' },  // белая рубашка
  { a: 0.79, w: 1.42, p: '180 €', hook: 1 }, // куртка олива (на фото без вешалки — крючок дорисован)
  { a: 0.617, w: 1.3, p: '150 €' },  // вязаное пончо
  { a: 0.439, w: 0.92, p: '95 €' },  // рубашка с принтом
  { a: 0.44, w: 0.9, p: '110 €' },   // комбинезон
];
const src = (g, w) => `img/cut/g${g}-${w}.webp`;
const HOOK = '<svg class="gm-hook" viewBox="0 0 40 46" aria-hidden="true"><path d="M20 46V26c0-12 14-12 14-2" fill="none" stroke="#3b3b3b" stroke-width="3" stroke-linecap="round"/></svg>';

export function railHTML(id, L, ICO) {
  const d = DEMOS[id], t = L.demos[id], m = L.more[id];
  const order = [...RAIL.keys(), ...RAIL.keys()];
  return `
    <div class="rail" data-rail>
      <svg class="rail-rope" aria-hidden="true"><path/></svg>
      <div class="rail-track">
        ${order.map((g, i) => `<button class="gm${RAIL[g].hook ? ' gm-nohanger' : ''}" type="button" data-gm="${i}" style="--w:${RAIL[g].w};--a:${RAIL[g].a}" aria-label="${m.rail[g]}">
          ${RAIL[g].hook ? HOOK : ''}<img src="${src(g, 320)}" alt="" draggable="false" decoding="async"><span class="gm-tag">${RAIL[g].p}</span>
        </button>`).join('')}
      </div>
    </div>
    <div class="rail-foot">
      <div class="rail-info"><b>${m.hint}</b><span></span></div>
      <div class="rail-bar"><i></i></div>
      <div class="rail-side"><p>${t.sub}</p><a class="d-link" href="#/${id}" data-to="d-list">${t.cta}</a></div>
    </div>
    <div class="gm-view" hidden>
      <button class="gm-close" type="button" data-gm-close aria-label="${L.dock.close}">${L.dock.close}${ICO.close}</button>
      <div class="gm-big"></div>
      <div class="gm-panel">
        <span class="gm-idx"></span>
        <h3></h3>
        <b class="gm-price"></b>
        <div class="d-chips">${d.opts[0][1].map((v, i) => `<button class="d-chip" type="button" data-chip aria-pressed="${i === 1}">${v}</button>`).join('')}</div>
        <button class="d-btn gm-add" type="button" data-gm-add><span>${m.act}</span>${ICO.bag}<i class="gm-spin"></i></button>
        <p>${t.note}</p>
      </div>
    </div>`;
}

export function initRail(page, { names, onAdd, lite }) {
  const el = page.querySelector('[data-rail]');
  if (!el) return null;
  const track = el.querySelector('.rail-track'), rope = el.querySelector('.rail-rope'), ropePath = rope.querySelector('path');
  const gms = [...track.children], n = gms.length, uniq = RAIL.length;
  const hero = el.closest('.d-hero'), info = hero.querySelector('.rail-info'), nameEl = info.querySelector('b'), priceEl = info.querySelector('span');
  const bar = hero.querySelector('.rail-bar i'), view = hero.querySelector('.gm-view'), hint = nameEl.textContent;
  const ang = new Float32Array(n), av = new Float32Array(n), lift = new Float32Array(n);
  const wgt = Array.from({ length: n }, () => 0.7 + Math.random() * 0.6);
  const ac = new AbortController(), sig = ac.signal;
  let W = 0, sp = 0, total = 0, sag = 0, off = 0, vel = 0, hover = -1, drag = null, moved = 0, last = 0, running = false, open = -1;

  function measure() {
    W = el.clientWidth; sp = Math.max(128, Math.min(236, W * 0.125)); total = n * sp; sag = Math.min(48, W * 0.032);
    el.style.setProperty('--gw', `${(sp * 0.82).toFixed(1)}px`);
    rope.setAttribute('viewBox', `0 0 ${W} ${sag * 2 + 8}`);
    rope.style.height = `${sag * 2 + 8}px`;
    ropePath.setAttribute('d', `M0 3Q${W / 2} ${sag * 2 + 3} ${W} 3`);
  }
  measure();
  off = -W * 1.05; vel = W * 2.3; // вещи въезжают слева и раскачиваются

  function frame(now) {
    if (!el.isConnected) { running = false; return; }
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || document.hidden) { running = false; return; }
    const dt = Math.min((now - last) / 1000, 0.04); last = now;
    if (!drag) {
      off += vel * dt; vel *= Math.exp(-dt * 2.2);
      if (!lite && hover < 0 && open < 0 && Math.abs(vel) < 40) off -= 14 * dt; // медленный дрейф, пока ничего не трогают
    }
    let busy = Math.abs(vel) > 2 || !!drag;
    const c = W / 2, tgt = Math.max(-0.5, Math.min(0.5, -vel * 0.00055));
    for (let i = 0; i < n; i++) {
      const x = ((i * sp + off) % total + total) % total - sp * 0.5; // центр вещи
      const u = (x - c) / c, y = sag * (1 - u * u);
      const want = i === hover ? 1 : 0;
      av[i] += ((tgt * wgt[i] - ang[i]) * 42 - av[i] * 3.4) * dt; ang[i] += av[i] * dt;
      lift[i] += (want - lift[i]) * Math.min(1, dt * 9);
      if (Math.abs(av[i]) > 0.004 || Math.abs(ang[i]) > 0.003 || Math.abs(lift[i] - want) > 0.01) busy = true;
      gms[i].style.transform = `translate3d(${x.toFixed(1)}px,${(y + lift[i] * 22).toFixed(1)}px,0) rotate(${ang[i].toFixed(4)}rad) scale(${(1 + lift[i] * 0.07).toFixed(3)})`;
    }
    bar.style.transform = `translateX(${((((-off / total) % 1) + 1) % 1) * 300}%)`;
    if (busy || !lite) requestAnimationFrame(frame); else running = false;
  }
  const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };

  const show = (i) => {
    hover = i;
    track.querySelectorAll('.is-hover').forEach((g) => g.classList.remove('is-hover'));
    if (i >= 0) { gms[i].classList.add('is-hover'); nameEl.textContent = names[i % uniq]; priceEl.textContent = RAIL[i % uniq].p; }
    else { nameEl.textContent = hint; priceEl.textContent = ''; }
    wake();
  };
  track.addEventListener('pointerover', (e) => { const g = e.target.closest('.gm'); if (g && !drag) show(+g.dataset.gm); });
  track.addEventListener('pointerleave', () => { if (!drag) show(-1); });
  track.addEventListener('focusin', (e) => { const g = e.target.closest('.gm'); if (g) show(+g.dataset.gm); });

  el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, t: performance.now() }; moved = 0; wake(); });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x, dtm = Math.max(8, now - drag.t) / 1000;
    off += dx; moved += Math.abs(dx); vel = vel * 0.5 + (dx / dtm) * 0.5;
    drag.x = e.clientX; drag.t = now;
  }, { passive: true, signal: sig });
  const end = (e) => {
    if (!drag) return;
    drag = null;
    if (moved < 6 && e.type === 'pointerup') { const g = document.elementFromPoint(e.clientX, e.clientY)?.closest('.gm'); if (g) openView(+g.dataset.gm); }
  };
  addEventListener('pointerup', end, { signal: sig }); addEventListener('pointercancel', end, { signal: sig });
  track.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const g = e.target.closest('.gm'); if (g) { e.preventDefault(); openView(+g.dataset.gm); } } });
  addEventListener('resize', () => { measure(); wake(); }, { passive: true, signal: sig });

  // ---------- крупный просмотр вещи ----------
  const big = view.querySelector('.gm-big');
  function openView(i) {
    open = i; show(-1);
    const g = i % uniq;
    big.style.setProperty('--a', RAIL[g].a);
    big.innerHTML = `<img src="${src(g, 640)}" alt="${names[g]}" draggable="false">`;
    view.querySelector('.gm-idx').textContent = `${String(g + 1).padStart(2, '0')} / ${String(uniq).padStart(2, '0')}`;
    view.querySelector('h3').textContent = names[g];
    view.querySelector('.gm-price').textContent = RAIL[g].p;
    view.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => view.classList.add('on')));
  }
  function closeView() {
    if (open < 0) return;
    open = -1; view.classList.remove('on', 'busy');
    setTimeout(() => { if (open < 0) view.hidden = true; }, 520);
    wake();
  }
  view.addEventListener('click', (e) => {
    if (e.target.closest('[data-gm-close]')) { closeView(); return; }
    if (!e.target.closest('[data-gm-add]') || view.classList.contains('busy')) return;
    view.classList.add('busy');
    setTimeout(() => {
      // вещь улетает в иконку корзины
      const from = big.getBoundingClientRect(), to = page.querySelector('.d-cnt').getBoundingClientRect();
      const fly = big.cloneNode(true);
      fly.className = 'gm-fly';
      Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
      view.after(fly);
      closeView();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fly.style.transform = `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px,${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(${46 / from.height})`;
        fly.style.opacity = '.2';
      }));
      setTimeout(() => { fly.remove(); onAdd(); }, 820);
    }, 650);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeView(); }, { signal: sig });

  wake();
  return { wake, destroy: () => ac.abort() };
}
