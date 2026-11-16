// Общий «метроном» фоновых анимаций.
//
// Пока на странице хоть что-то движется, браузер собирает кадр с частотой экрана: 60, 120, 165 раз в секунду.
// На встроенной видеокарте и большом экране это дорого (замеры 2026-11-17: Edge и Chrome, Intel UHD, 2560×1440 @165 Гц):
//   · одна зацикленная анимация на весь экран занимала ~70 % видеокарты;
//   · две маленькие анимации в разных углах стоят как перерисовка всего экрана — браузер объединяет изменившиеся
//     области в один прямоугольник (33–38 % против 8 % у одной);
//   · те же две анимации, обновлённые в разных кадрах, — 10 %.
// Поэтому на экранах от 120 Гц всё фоновое обновляется не в каждом кадре экрана, а в каждом N-м (около 55–70 раз
// в секунду), а движущиеся элементы делятся на N групп по соседству, и группы обновляются по очереди, каждая в своём кадре.
//
// Зацикленные CSS-анимации при этом остаются у браузера (их ведёт видеокарта, занятый главный поток им не мешает):
// анимации назначается ступенчатая функция времени steps(n), и её значение меняется только n раз за цикл. Между
// ступенями кадр не меняется, и браузер его не перерисовывает. Сдвиг группы — это сдвиг времени анимации на долю ступени.
// Циклы на скрипте (частицы, дрейф рейла) подписываются через subscribe() и получают признак «свой кадр».
//
// Прокрутка, курсор, наведение и переходы страниц идут на полной частоте экрана.
// На обычных 60–90 Гц делитель равен 1 и модуль ничего не меняет.

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
  const changed = Math.abs(ms - interval) > 0.15;
  interval = ms;
  base = Math.max(1, Math.round(1000 / ms / 66)); // 165 Гц → 3 (55 к/с), 144 → 2 (72), 120 → 2 (60), до 90 Гц → 1
  if (!applyDiv() && changed && div > 1) { applySteps(); regroup(); }
}
let base = 1, extra = 0, interval = 16.7, eco = false;
/**
 * Экономный режим — для браузера без аппаратного ускорения (облегчённый режим сайта). Там каждый изменившийся кадр
 * собирает процессор, поэтому фон обновляется около 30 раз в секунду на любом экране, в том числе на обычном 60 Гц.
 */
export function economy(on = true) { if (eco !== on) { eco = on; applyDiv(); } }
function applyDiv() {
  const next = Math.max(base + extra, eco ? Math.round(1000 / interval / 30) : 1);
  if (next === div) return false;
  div = next;
  if (div < 2) release(); else { applySteps(); regroup(); }
  for (const fn of rateSubs) fn(div);
  return true;
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

let needAlign = false;
function loop(now) {
  if (!subs.size && !probe && !needAlign && now > watchUntil) { running = false; return; }
  requestAnimationFrame(loop);
  if (probe) probeFrame(now);
  watchLoad(now);
  const phase = ++count % div;
  if (needAlign && phase === 0 && !probe) { needAlign = false; align(); }
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
const gov = new Map(); // Animation -> { el, box, dur, delay, n, phase }
let groups = 0;

/**
 * Находит в root зацикленные CSS-анимации и назначает им ступенчатый ход.
 * Анимации вне блоков .mo / [data-live] привязываются к ближайшему разделу: он получает атрибут data-gov,
 * и вызывающий код должен переключать на нём класс .play так же, как на остальных (вернётся true, если такие появились).
 * Класс .play нужен только для деления на группы: останавливает и запускает анимации по-прежнему CSS.
 */
export function adopt(root) {
  if (div < 2 || !root || !root.getAnimations) return false;
  let tagged = false, list = [];
  try { list = root.getAnimations({ subtree: true }); } catch { return false; }
  for (const a of list) {
    if (gov.has(a) || !a.animationName) continue; // у переходов animationName нет — их не трогаем
    const eff = a.effect, el = eff && eff.target;
    if (!el || !eff.updateTiming) continue;
    let t = null;
    try { t = eff.getComputedTiming(); } catch {}
    if (!t || t.iterations !== Infinity || !(t.duration > 0)) continue;
    let box = el.closest('.mo, [data-live], [data-gov]');
    if (!box) {
      box = el.closest('section, footer');
      if (box) { box.setAttribute('data-gov', ''); box.classList.add('play'); tagged = true; }
    }
    gov.set(a, { el, box, dur: t.duration, delay: t.delay || 0, n: 0, phase: 0 });
  }
  applySteps();
  regroup();
  return tagged;
}

/** Число ступеней на цикл: чтобы значение менялось раз в div кадров экрана. Учитывает скорость воспроизведения анимации. */
const rateOf = (a) => Math.abs(a.playbackRate) || 1;
function applySteps() {
  const len = interval * div;
  for (const [a, g] of gov) {
    const n = Math.max(1, Math.round(g.dur / (len * rateOf(a))));
    if (n === g.n) continue;
    try { a.effect.updateTiming({ easing: `steps(${n})` }); g.n = n; } catch { gov.delete(a); }
  }
}
/** Скрипт поменял скорость анимации (updatePlaybackRate): пересчитать ступени и заново расставить их по кадрам. */
export function retime() { if (div > 1 && gov.size) { applySteps(); alignSoon(); } }

function release() {
  for (const a of gov.keys()) { try { a.effect.updateTiming({ easing: 'linear' }); } catch {} }
  gov.clear(); groups = 0;
}

/**
 * Расставляет ступени по кадрам. Вызывается из кадра нулевой группы: анимация группы p должна сменить значение
 * через p кадров после него. Ступень ставится за полкадра до нужного кадра, время анимации сдвигается на доли ступени
 * (не больше ~18 мс — глазу незаметно). Длина ступени редко делится на период экрана точно, поэтому выравнивание
 * повторяется раз в полторы секунды.
 */
function align() {
  for (const [a, g] of gov) {
    if (!g.el.isConnected) { gov.delete(a); continue; }
    if (!g.n || (g.box && !g.box.classList.contains('play'))) continue;
    const ct = a.currentTime;
    if (typeof ct !== 'number') continue;
    const sl = g.dur / g.n;
    const wait = (((g.phase - 1 + div) % div) + 0.5) * interval * rateOf(a); // сколько должно оставаться до следующей ступени (во времени анимации)
    const passed = (((ct - g.delay) % sl) + sl) % sl;            // сколько прошло с предыдущей
    let shift = (((sl - wait - passed) % sl) + sl) % sl;
    if (shift > sl / 2) shift -= sl;
    if (Math.abs(shift) > 0.9) { try { a.currentTime = ct + shift; } catch {} }
  }
}
function alignSoon() { if (div > 1 && gov.size) { needAlign = true; kick(); } }

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
  for (const [a, g] of gov) {
    if (!g.el.isConnected || a.playState === 'idle') { gov.delete(a); continue; } // блок удалён или скрыт: анимацию отменил браузер
    if (g.box && !g.box.classList.contains('play')) { g.phase = 0; continue; }
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
  alignSoon();
}
let regT = 0;
/** Пересобрать группы чуть позже: после прокрутки, появления блока, запуска или остановки подписчика. */
export function regroupSoon() { if (div < 2) return; clearTimeout(regT); regT = setTimeout(regroup, 60); }

// ---------- запуск ----------
if (typeof requestAnimationFrame === 'function') {
  setTimeout(measure, 350); // первые кадры после загрузки неровные
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(measure, 300); });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); regroup(); }, 600); }, { passive: true });
  // Ступени понемногу сползают относительно кадров экрана — подравниваем раз в полторы секунды.
  setInterval(() => { if (!document.hidden) alignSoon(); }, 1500);
  // Когда метроном никому не нужен (обычный экран, одни CSS-анимации), он стоит. Раз в 8 секунд включаем его на 2,5 секунды,
  // чтобы страховка от перегрузки всё равно видела пропуски кадров.
  setInterval(() => { if (!running && !document.hidden) { watchUntil = performance.now() + 2500; lwN = 0; lwDrop = 0; lwPrev = 0; kick(); } }, 8000);
}
