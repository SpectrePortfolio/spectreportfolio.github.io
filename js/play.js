// Фирменные механики демо-сайтов — то, что посетитель может потрогать руками. У каждого бизнеса своя:
//   ресторан   — круг тарелок крутится рукой (живёт в js/main.js рядом с каруселью);
//   кофейня    — парящие предметы можно оттянуть, они пружинят обратно;
//   стоматология — шторка «до и после» (js/main.js);
//   магазин    — рейл с одеждой (js/rail.js);
//   фитнес     — ползунок нагрузки: растёт пульс, разгорается фото, ускоряется линия пульса;
//   недвижимость — «влёт» в дом при прокрутке (css/fx.css);
//   салон красоты — зеркало-лупа над портретом;
//   автосервис — тахометр: нажмите и держите, стрелка уходит в красную зону;
//   онлайн-школа — колода карточек курсов: смахнуть вправо — выбрать, влево — дальше;
//   отель      — солнце на дуге: перетащите, и над бухтой сменится время суток.
//
// Правила для всех: двигаются только transform / opacity (через переменные CSS, расчёт в css/fx.css); пока посетитель
// ничего не трогает, ничего не считается — постоянных циклов нет; обработчики снимаются при смене страницы.
// Положение блока на экране читается один раз в начале жеста, а не на каждое движение указателя.
import { subscribe, retime } from './clock.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const pad2 = (n) => String(n).padStart(2, '0');

// Слой во весь первый экран (жар у фитнеса, время суток у отеля) меняется не в каждом кадре экрана, а примерно 55–60 раз
// в секунду. На экране 165 Гц перекраска всего экрана в каждом кадре занимает встроенную видеокарту целиком (замер
// 2026-11-17: 113 кадров вместо 165). Ручка под курсором при этом двигается на полной частоте — она маленькая.
function paced(apply, gap = 15) {
  let val = 0, queued = false, last = 0;
  const run = (now) => {
    if (now - last < gap) { requestAnimationFrame(run); return; }
    queued = false; last = now; apply(val);
  };
  return (v) => { val = v; if (!queued) { queued = true; requestAnimationFrame(run); } };
}

/** Подключает механики к только что собранной странице. Возвращает функцию отключения. */
export function initPlay(page, { onPick } = {}) {
  const ac = new AbortController(), stops = [];
  const on = (el, type, fn, opts) => el.addEventListener(type, fn, { signal: ac.signal, ...opts });
  lens(page, on); tacho(page, on, stops); power(page, on); sun(page, on); toss(page, on); deck(page, on, onPick);
  return () => { ac.abort(); stops.forEach((f) => f()); };
}

// ---------- салон красоты: зеркало-лупа ----------
// Круглое зеркало ездит за курсором (на телефоне его таскают пальцем), внутри — тот же портрет, увеличенный вокруг
// центра зеркала. И зеркало, и картинка в нём двигаются своим transform: перерисовки нет.
function lens(page, on) {
  const hero = page.querySelector('[data-lens]');
  if (!hero) return;
  const media = hero.querySelector('.d-hero-media'), glass = hero.querySelector('.lens');
  let rect = null, drag = false, w = 0, h = 0, s = 0, ox = 0, oy = 0;
  const place = (x, y) => {
    const m = s * 0.3; // зеркало может выйти за край фото не больше чем на треть
    hero.style.setProperty('--cx', `${clamp(x, m, w - m).toFixed(1)}px`);
    hero.style.setProperty('--cy', `${clamp(y, m, h - m).toFixed(1)}px`);
  };
  const reset = () => {
    rect = null;
    w = media.offsetWidth; h = media.offsetHeight; s = glass.offsetWidth; ox = media.offsetLeft; oy = media.offsetTop;
    for (const [k, v] of [['--lw', w], ['--lh', h], ['--ox', ox], ['--oy', oy]]) hero.style.setProperty(k, `${v}px`);
    place(w * 0.46, h * 0.6);
  };
  const move = (e, anywhere) => {
    if (!rect) rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left - ox, y = e.clientY - rect.top - oy;
    if (!anywhere && (x < -30 || y < -30 || x > w + 30 || y > h + 30)) return; // курсор над текстом — зеркало ждёт на месте
    place(x, y);
    hero.classList.add('used');
  };
  on(hero, 'pointermove', (e) => { if (drag) move(e, true); else if (e.pointerType === 'mouse') move(e, false); });
  on(glass, 'pointerdown', (e) => { drag = true; rect = null; try { glass.setPointerCapture(e.pointerId); } catch {} });
  const up = () => { drag = false; };
  on(glass, 'pointerup', up); on(glass, 'pointercancel', up);
  on(window, 'scroll', () => { rect = null; }, { passive: true });
  on(window, 'resize', reset, { passive: true });
  reset();
}

// ---------- автосервис: тахометр ----------
// Пока держат — обороты растут к отсечке, отпустили — падают к холостым. Цикл подписан на общий метроном и идёт
// только пока стрелка движется; стрелка обновляется в «своём» кадре, чтобы не совпадать с другими анимациями экрана.
function tacho(page, on, stops) {
  const el = page.querySelector('[data-tacho]');
  if (!el) return;
  const needle = el.querySelector('.tacho-needle'), read = el.querySelector('[data-rpm]');
  const IDLE = 800, MAX = 8000;
  let rpm = IDLE, held = false, off = null, last = 0, shown = IDLE, textAt = 0;
  const angle = (v) => `rotate(${(-130 + clamp(v / MAX) * 260).toFixed(2)}deg)`;
  const frame = (now, tick) => {
    if (!tick) return;
    const dt = Math.min(0.06, (now - last) / 1000); last = now;
    rpm += ((held ? MAX + 200 : IDLE) - rpm) * (1 - Math.exp(-dt * (held ? 1.7 : 2.6)));
    const v = held && rpm > 7300 ? rpm + Math.sin(now / 28) * 140 : rpm; // у отсечки стрелка дрожит
    needle.style.transform = angle(v);
    if (now - textAt > 70) {
      textAt = now;
      const r = Math.round(Math.min(v, MAX) / 10) * 10;
      if (r !== shown) { shown = r; read.textContent = r; }
      el.classList.toggle('hot', v > 6500);
    }
    if (!held && Math.abs(rpm - IDLE) < 6) {
      rpm = shown = IDLE; read.textContent = IDLE; needle.style.transform = angle(IDLE); el.classList.remove('hot');
      if (off) { off(); off = null; }
    }
  };
  const wake = () => { if (!off) { last = performance.now(); off = subscribe(frame, el); } };
  const down = () => { held = true; el.classList.add('held', 'used'); wake(); };
  const up = () => { held = false; el.classList.remove('held'); };
  on(el, 'pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch {} down(); });
  on(el, 'pointerup', up); on(el, 'pointercancel', up); on(el, 'lostpointercapture', up);
  on(el, 'contextmenu', (e) => e.preventDefault()); // долгое нажатие пальцем не должно открывать меню
  on(el, 'keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !held) { e.preventDefault(); down(); } });
  on(el, 'keyup', up); on(el, 'blur', up);
  stops.push(() => { if (off) off(); });
}

// ---------- фитнес: ползунок нагрузки ----------
// Значение 0…1 уходит в переменную --pw на первом экране и на линии пульса: растут цифры пульса, разгорается фото,
// линия пульса становится выше. Когда ползунок отпустили, анимации пульса получают новую скорость.
function power(page, on) {
  const el = page.querySelector('[data-pw]');
  if (!el) return;
  const hero = el.closest('.d-hero'), track = el.querySelector('.pw-track'), out = el.querySelector('[data-bpm]'), line = page.querySelector('.d-pulse');
  let drag = false, value = 0.3, rect = null, shown = 0;
  const bpm = () => Math.round(62 + value * 123);
  const speed = () => {
    const rate = bpm() / 99, list = []; // при нагрузке по умолчанию (99 уд/мин) скорость обычная
    for (const host of [hero, line]) {
      if (!host) continue;
      for (const a of host.getAnimations({ subtree: true })) {
        if (a.animationName === 'pulse' || a.animationName === 'pulse-run') { try { a.updatePlaybackRate(rate); list.push(a.ready); } catch {} }
      }
    }
    // новая скорость вступает в силу со следующего кадра — тогда метроном и пересчитает ступени под неё
    Promise.allSettled(list).then(retime);
  };
  const heat = paced((v) => {
    hero.style.setProperty('--heat', v.toFixed(3));
    if (line) line.style.setProperty('--pw', v.toFixed(3));
  });
  const set = (t) => {
    value = clamp(t);
    track.style.setProperty('--pw', value.toFixed(3)); // ручка и полоска — сразу
    heat(value);                                       // жар на весь экран — реже
    const b = bpm();
    if (b !== shown) { shown = b; out.textContent = b; }
    track.setAttribute('aria-valuenow', Math.round(value * 100));
  };
  const at = (e) => set((e.clientX - rect.left) / rect.width);
  on(track, 'pointerdown', (e) => {
    drag = true; rect = track.getBoundingClientRect();
    el.classList.add('used'); hero.classList.add('pw-drag');
    try { track.setPointerCapture(e.pointerId); } catch {}
    at(e); e.preventDefault();
  });
  on(track, 'pointermove', (e) => { if (drag) at(e); });
  const up = () => { if (drag) { drag = false; hero.classList.remove('pw-drag'); speed(); } };
  on(track, 'pointerup', up); on(track, 'pointercancel', up);
  on(track, 'keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 0.06 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.06 : 0;
    if (d) { e.preventDefault(); el.classList.add('used'); set(value + d); speed(); }
  });
  set(value);
}

// ---------- отель: время суток ----------
// Солнце ездит по дуге; положение 0…1 уходит в --t, от неё в css/fx.css считаются слои рассвета, заката и ночи.
function sun(page, on) {
  const el = page.querySelector('[data-sun]');
  if (!el) return;
  const hero = el.closest('.d-hero'), knob = el.querySelector('.sun'), lab = el.querySelector('.sun-lab');
  const names = el.dataset.sun.split('|');
  let drag = false, value = 0.3, rect = null, text = '';
  const sky = paced((v) => hero.style.setProperty('--sky', v.toFixed(3)));
  const set = (t) => {
    value = clamp(t);
    el.style.setProperty('--t', value.toFixed(3)); // солнце на дуге — сразу
    sky(value);                                    // небо на весь экран — реже
    const min = Math.round((5.5 + value * 18) * 6) * 10; // от 05:30 до 23:30, шаг 10 минут
    const s = `${pad2(Math.floor(min / 60))}:${pad2(min % 60)} · ${names[value < 0.2 ? 0 : value < 0.55 ? 1 : value < 0.8 ? 2 : 3]}`;
    if (s !== text) { text = s; lab.textContent = s; }
    knob.setAttribute('aria-valuenow', Math.round(value * 100));
  };
  on(knob, 'pointerdown', (e) => {
    drag = true; rect = el.getBoundingClientRect();
    el.classList.add('used'); hero.classList.add('sunning');
    try { knob.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  });
  on(knob, 'pointermove', (e) => { if (drag) set((e.clientX - rect.left) / rect.width); });
  const up = () => { drag = false; hero.classList.remove('sunning'); };
  on(knob, 'pointerup', up); on(knob, 'pointercancel', up);
  on(knob, 'keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 0.04 : e.key === 'ArrowLeft' ? -0.04 : 0;
    if (d) { e.preventDefault(); el.classList.add('used'); set(value + d); }
  });
  set(value);
}

// ---------- кофейня: предметы можно оттянуть ----------
// Смещение пишется в --dx / --dy самого предмета; при отпускании оно сбрасывается, и CSS-переход с перелётом
// возвращает предмет на место. Только мышью и пером: на телефоне палец на первом экране должен листать страницу.
function toss(page, on) {
  const scene = page.querySelector('.fl-scene');
  if (!scene) return;
  let cur = null;
  on(scene, 'pointerdown', (e) => {
    const o = e.target.closest('.fl-o');
    if (!o || e.pointerType === 'touch') return;
    e.preventDefault();
    cur = { o, x: e.clientX, y: e.clientY };
    o.classList.remove('back'); o.classList.add('drag');
    scene.closest('.d-hero').classList.add('used');
    try { o.setPointerCapture(e.pointerId); } catch {}
  });
  on(scene, 'pointermove', (e) => {
    if (!cur) return;
    const dx = e.clientX - cur.x, dy = e.clientY - cur.y;
    cur.o.style.setProperty('--dx', `${dx}px`); cur.o.style.setProperty('--dy', `${dy}px`);
    cur.o.style.setProperty('--dr', `${clamp(dx / 14, -16, 16).toFixed(1)}deg`);
  });
  const up = () => {
    if (!cur) return;
    const o = cur.o; cur = null;
    o.classList.remove('drag'); o.classList.add('back');
    o.style.setProperty('--dx', '0px'); o.style.setProperty('--dy', '0px'); o.style.setProperty('--dr', '0deg');
    setTimeout(() => o.classList.remove('back'), 950);
  };
  on(scene, 'pointerup', up); on(scene, 'pointercancel', up);
}

// ---------- онлайн-школа: колода карточек ----------
// Верхнюю карточку тянут в сторону: дальше порога она улетает (вправо — «выбрать», влево — «дальше») и уходит под низ
// колоды. Место в стопке задаёт атрибут data-pos, остальное считает CSS.
function deck(page, on, onPick) {
  const el = page.querySelector('[data-deck]');
  if (!el) return;
  const stage = el.querySelector('.deck-stage'), num = el.querySelector('.deck-num');
  const order = [...stage.querySelectorAll('.deck-card')], n = order.length;
  let drag = null, busy = false;
  const lay = () => {
    order.forEach((c, i) => { c.dataset.pos = i; c.style.zIndex = n - i; });
    num.textContent = `${pad2(+order[0].dataset.i + 1)} / ${pad2(n)}`;
  };
  const fly = (dir) => {
    if (busy) return;
    busy = true;
    const c = order[0];
    c.classList.remove('drag'); c.classList.add('fly');
    c.style.transform = `translate(${dir * 125}%, -4%) rotate(${dir * 16}deg)`;
    c.style.opacity = '0';
    el.style.setProperty('--sw', 0);
    el.classList.add('used');
    if (dir > 0 && !c.classList.contains('is-on')) { c.classList.add('is-on'); if (onPick) onPick(); }
    setTimeout(() => {
      order.push(order.shift());
      c.classList.remove('fly'); c.classList.add('swap'); // без перехода встаёт под низ колоды и там проявляется
      c.style.transform = '';
      lay();
      requestAnimationFrame(() => requestAnimationFrame(() => { c.classList.remove('swap'); c.style.opacity = ''; }));
      busy = false;
    }, 360);
  };
  on(stage, 'pointerdown', (e) => {
    const c = e.target.closest('.deck-card');
    if (!c || c !== order[0] || busy || e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY, dx: 0 };
    c.classList.add('drag');
    try { c.setPointerCapture(e.pointerId); } catch {}
  });
  on(stage, 'pointermove', (e) => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    order[0].style.transform = `translate(${drag.dx}px, ${((e.clientY - drag.y) * 0.25).toFixed(1)}px) rotate(${(drag.dx / 22).toFixed(2)}deg)`;
    el.style.setProperty('--sw', clamp(drag.dx / 140, -1, 1).toFixed(2));
  });
  const up = () => {
    if (!drag) return;
    const dx = drag.dx, c = order[0];
    drag = null;
    if (Math.abs(dx) > Math.min(140, stage.clientWidth * 0.3)) { fly(dx > 0 ? 1 : -1); return; }
    c.classList.remove('drag'); c.style.transform = ''; el.style.setProperty('--sw', 0);
  };
  on(stage, 'pointerup', up); on(stage, 'pointercancel', up);
  on(el, 'click', (e) => { const b = e.target.closest('[data-deck-go]'); if (b) fly(+b.dataset.deckGo); });
  on(el, 'keydown', (e) => { if (e.key === 'ArrowRight') fly(1); else if (e.key === 'ArrowLeft') fly(-1); });
  lay();
}
