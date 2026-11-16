// Общий «метроном» фоновых анимаций.
//
// Пока на странице хоть что-то движется, браузер собирает кадр с частотой экрана: 60, 120, 165 раз в секунду.
// На встроенной видеокарте и большом экране это дорого (замеры 2026-11-17: Edge, Intel UHD, 2560×1440 @165 Гц):
//   · одна зацикленная анимация на весь экран занимала ~70 % видеокарты;
//   · две маленькие анимации в разных углах стоят как перерисовка всего экрана — браузер объединяет изменившиеся
//     области в один прямоугольник (33 % против 8 % у одной);
//   · те же две анимации, обновлённые в разных кадрах, — 10 %.
// Поэтому на экранах от 120 Гц всё фоновое (частицы, дрейф рейла, зацикленные CSS-анимации) ведёт этот модуль:
//   1) каждая анимация обновляется не в каждом кадре экрана, а в каждом N-м — около 55–70 раз в секунду;
//   2) анимации на экране делятся на N групп по соседству, и группы обновляются по очереди, каждая в своём кадре.
// Прокрутка, курсор, наведение и переходы страниц идут на полной частоте экрана.
// На обычных 60–90 Гц делитель равен 1 и модуль ничего не меняет: CSS-анимации остаются на стороне браузера.

const subs = new Map();   // fn -> { el }: fn(now, tick) вызывается каждый кадр; tick — «кадр нулевой группы»
const rateSubs = new Set();
let div = 1, count = 0, running = false;

// ---------- частота экрана ----------
// Берём нижние значения интервалов между кадрами: пропущенные кадры длиннее, а короче периода экрана кадр быть не может.
let probe = null, probePrev = 0;
function measure() {
  if (probe) return;
  probe = [];
  probePrev = 0;
  kick();
}
function probeFrame(now) {
  if (probePrev) probe.push(now - probePrev);
  probePrev = now;
  if (probe.length < 48) return;
  const s = probe.slice(6).sort((a, b) => a - b);
  probe = null;
  const ms = s[Math.floor(s.length * 0.2)];
  if (!(ms > 2 && ms < 40)) return;
  interval = ms;
  base = Math.max(1, Math.round(1000 / ms / 66)); // 165 Гц → 3 (55 к/с), 144 → 2 (72), 120 → 2 (60), до 90 Гц → 1
  applyDiv();
}
let base = 1, extra = 0, interval = 16.7;
function applyDiv() {
  const next = base + extra;
  if (next === div) return;
  div = next;
  if (div < 2) release(); else regroup();
  for (const fn of rateSubs) fn(div);
}

// ---------- страховка от перегрузки ----------
// Если браузер пропускает кадры (видеокарта занята другими программами, слабое устройство), фон обновляется ещё реже.
// Кадры считаются окнами по ~2 секунды. Два окна подряд с долей пропусков выше 10 % — делитель растёт на единицу, и дальше
// на единицу за каждое следующее такое окно; ниже ~24 обновлений в секунду фон не опускается. Четыре спокойных окна подряд —
// делитель возвращается на шаг. Один короткий провал (подгрузка страницы, декодирование фото) страховку не включает.
// Работает и на 60 Гц: там при перегрузке включается управление CSS-анимациями.
let lwPrev = 0, lwN = 0, lwDrop = 0, lwCalm = 0, lwHot = 0, lwSkip = 0, watchUntil = 0;
function watchLoad(now) {
  const d = now - lwPrev; lwPrev = now;
  if (d > 250 || probe || now < lwSkip) { lwN = 0; lwDrop = 0; return; } // вкладка была скрыта, идёт замер частоты или переход
  lwN++;
  if (d > interval * 1.7) lwDrop++;
  if (lwN < Math.round(2000 / interval)) return;
  const share = lwDrop / lwN;
  lwN = 0; lwDrop = 0;
  const cap = Math.max(0, Math.floor(1000 / interval / 24) - base);
  if (share > 0.1) { lwCalm = 0; if (++lwHot >= 2 && extra < cap) { extra++; applyDiv(); } }
  else {
    lwHot = 0;
    if (share < 0.02) { if (++lwCalm >= 4 && extra > 0) { lwCalm = 0; extra--; applyDiv(); } } else lwCalm = 0;
  }
}
/** Не считать пропуски кадров ближайшие ms миллисекунд: идёт переход между страницами, это не перегрузка. */
export function hush(ms) { lwSkip = Math.max(lwSkip, performance.now() + ms); lwHot = 0; }

function loop(now) {
  if (!subs.size && !(gov.size && div > 1) && !probe && now > watchUntil) { running = false; return; }
  requestAnimationFrame(loop);
  if (probe) probeFrame(now);
  watchLoad(now);
  const phase = ++count % div;
  if (gov.size && div > 1) stepCss(now, phase);
  for (const fn of subs.keys()) fn(now, phase === 0);
}
function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

/**
 * Подписка на кадры. el — элемент, который подписчик перерисовывает (холст, рейл): его область учитывается
 * при делении анимаций на группы. Возвращает функцию отписки.
 */
export function subscribe(fn, el) {
  subs.set(fn, { el: el || null }); kick(); regroupSoon();
  return () => { subs.delete(fn); regroupSoon(); };
}
/** Сообщает, когда меняется делитель частоты (например, окно перенесли на другой монитор). */
export function onRate(fn) { rateSubs.add(fn); }
export const clockInfo = () => ({ div, css: gov.size, groups });

// ---------- зацикленные CSS-анимации ----------
// Браузер ведёт их сам на полной частоте экрана. Забираем управление: ставим на паузу и двигаем время вручную.
const gov = new Map(); // Animation -> { el, box, t, last, phase, live, hold }
let groups = 0;
// Паузу по наведению из CSS (animation-play-state) управляемая анимация не видит — повторяем её здесь:
// [что останавливается, при каком состоянии предка].
const HOLD = [['.r-run', '.r-wall:hover']];

/**
 * Находит в root зацикленные CSS-анимации и берёт их под управление.
 * Анимации вне блоков .mo / [data-live] привязываются к ближайшему разделу: он получает атрибут data-gov,
 * и вызывающий код должен переключать на нём класс .play так же, как на остальных (вернётся true, если такие появились).
 */
export function adopt(root) {
  if (div < 2 || !root || !root.getAnimations) return false;
  let tagged = false, list = [];
  try { list = root.getAnimations({ subtree: true }); } catch { return false; }
  for (const a of list) {
    if (gov.has(a) || !a.animationName) continue; // у переходов animationName нет — их не трогаем
    const eff = a.effect, el = eff && eff.target;
    if (!el || a.playState === 'idle') continue;
    let loops = 0;
    try { loops = eff.getComputedTiming().iterations; } catch {}
    if (loops !== Infinity) continue;
    let box = el.closest('.mo, [data-live], [data-gov]');
    if (!box) {
      box = el.closest('section, footer');
      if (box) { box.setAttribute('data-gov', ''); box.classList.add('play'); tagged = true; }
    }
    const hold = HOLD.find(([sel]) => el.matches(sel));
    gov.set(a, { el, box, t: +a.currentTime || 0, last: 0, phase: 0, live: false, hold: hold ? hold[1] : null });
    try { a.pause(); } catch {}
  }
  if (gov.size) kick();
  regroup();
  return tagged;
}

function stepCss(now, phase) {
  let again = null;
  // сначала все чтения: playState у CSS-анимации заставляет браузер досчитать стили
  for (const [a, g] of gov) {
    if (g.phase !== phase) continue;
    if (!g.el.isConnected) { gov.delete(a); continue; }
    g.live = !g.box || g.box.classList.contains('play');
    if (!g.live) continue;
    const ps = a.playState;
    if (ps === 'idle') { gov.delete(a); g.live = false; } // анимацию отменили (сменился класс, блок скрыт)
    else if (ps !== 'paused') (again || (again = [])).push(a); // браузер снял паузу сам: блок вернулся на экран
  }
  if (again) for (const a of again) { try { a.pause(); const g = gov.get(a); g.t = +a.currentTime || g.t; } catch {} }
  for (const [a, g] of gov) {
    if (g.phase !== phase || !g.live) continue;
    const dt = Math.min(100, now - (g.last || now)); g.last = now;
    if (g.hold && g.el.closest(g.hold)) continue;
    g.t += dt;
    a.currentTime = g.t;
  }
}

function release() {
  for (const [a, g] of gov) { if (g.el.isConnected && (!g.box || g.box.classList.contains('play'))) { try { a.play(); } catch {} } }
  gov.clear(); groups = 0;
}

// ---------- деление на группы ----------
// Задача: разложить движущиеся элементы по N кадрам так, чтобы сумма площадей «общих прямоугольников» была наименьшей.
// Склеиваем по два самых выгодных соседа, пока групп не останется N. Подписчики с элементом (холст, рейл) — всегда группа 0.
const PAD = 36; // анимация выходит за рамку элемента: покачивание, растущее кольцо
function rectOf(el, vw, vh) {
  const r = el.getBoundingClientRect();
  const x0 = Math.max(0, r.left - PAD), y0 = Math.max(0, r.top - PAD), x1 = Math.min(vw, r.right + PAD), y1 = Math.min(vh, r.bottom + PAD);
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
}
const area = (r) => (r[2] - r[0]) * (r[3] - r[1]);
const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

export function regroup() {
  if (div < 2) return;
  const vw = innerWidth, vh = innerHeight;
  const clusters = [];
  let fixed = null;
  for (const s of subs.values()) {
    if (!s.el || !s.el.isConnected) continue;
    const r = rectOf(s.el, vw, vh);
    if (r) fixed = fixed ? union(fixed, r) : r;
  }
  if (fixed) clusters.push({ r: fixed, gs: [], fixed: true });
  const byEl = new Map();
  for (const g of gov.values()) {
    if (!g.el.isConnected || (g.box && !g.box.classList.contains('play'))) { g.phase = 0; continue; }
    let c = byEl.get(g.el);
    if (c === undefined) {
      const r = rectOf(g.el, vw, vh);
      c = r ? { r, gs: [], fixed: false } : null;
      byEl.set(g.el, c);
      if (c) clusters.push(c);
    }
    if (c) c.gs.push(g); else g.phase = 0; // за экраном: в какой группе стоять, не важно
  }
  while (clusters.length > div) {
    let bi = 0, bj = 1, best = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const cost = area(union(clusters[i].r, clusters[j].r)) - area(clusters[i].r) - area(clusters[j].r);
        if (cost < best) { best = cost; bi = i; bj = j; }
      }
    }
    const a = clusters[bi], b = clusters[bj];
    a.r = union(a.r, b.r); a.fixed = a.fixed || b.fixed;
    for (const g of b.gs) a.gs.push(g);
    clusters.splice(bj, 1);
  }
  let p = clusters.some((c) => c.fixed) ? 1 : 0;
  for (const c of clusters) {
    const ph = c.fixed ? 0 : p++;
    for (const g of c.gs) g.phase = ph;
  }
  groups = clusters.length;
}
let regT = 0;
/** Пересобрать группы чуть позже: после прокрутки, появления блока, запуска или остановки подписчика. */
export function regroupSoon() { if (div < 2) return; clearTimeout(regT); regT = setTimeout(regroup, 60); }

// ---------- запуск ----------
if (typeof requestAnimationFrame === 'function') {
  setTimeout(measure, 350); // первые кадры после загрузки неровные
  // Когда метроном никому не нужен (обычный экран, одни CSS-анимации), он стоит. Раз в 8 секунд включаем его на 2,5 секунды,
  // чтобы страховка от перегрузки всё равно видела пропуски кадров.
  setInterval(() => { if (!running && !document.hidden) { watchUntil = performance.now() + 2500; lwN = 0; lwDrop = 0; lwPrev = 0; kick(); } }, 8000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(measure, 300); });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); regroup(); }, 600); }, { passive: true });
}
