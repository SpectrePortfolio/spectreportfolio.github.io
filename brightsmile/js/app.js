// BrightSmile — интерфейс: шапка, появление блоков, кнопки, наклон карточек, отзывы, запись (демо).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── заголовки по словам: каждое слово в своей маске, выезжает снизу ──
// Работает с тем, что уже есть в разметке: слова берутся из текста, цветные <em> и строки <span> сохраняются.
function split(el) {
  let i = 0;
  const walk = (node, cls) => {
    const out = document.createDocumentFragment();
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { out.append(' '); return; }
          const w = document.createElement('span'), inner = document.createElement('i');
          w.className = 'w'; inner.textContent = part; inner.style.setProperty('--i', i++);
          if (cls) inner.className = cls;
          w.append(inner); out.append(w);
        });
      } else if (n.nodeType === 1 && n.tagName === 'EM') out.append(walk(n, n.className));
      else if (n.nodeType === 1) { const keep = n.cloneNode(false); keep.append(walk(n, cls)); out.append(keep); }
    });
    return out;
  };
  const frag = walk(el, '');
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  el.textContent = '';
  el.append(frag);
  el.classList.add('split');
}
$$('h1.split, h2.rv').forEach(split);

// ── вступление: страница ждёт готовности 3D-сцены, чтобы всё появилось одним движением ──
let started = false;
function go() {
  if (started) return;
  started = true;
  root.classList.add('go');
  if (!calm) setTimeout(count, 1100);
}
window.addEventListener('bs:ready', go);
setTimeout(go, 3500);                       // сцена не успела или не запустилась — показываем страницу всё равно

// ── шапка и меню ──
const nav = $('#nav');
$('#burger').addEventListener('click', () => root.classList.toggle('menu-open'));
$$('#links a').forEach((a) => a.addEventListener('click', () => root.classList.remove('menu-open')));
const sections = $$('main > section');
const links = $$('#links a');
const progress = $('#progress'), fab = $('#fab'), bubble = $('#bubble');
const hero = $('#home'), reviews = $('#reviews');

// ── прокрутка: один расчёт на кадр ──
// Положения блоков меряются заранее (при загрузке и изменении размеров), чтобы при прокрутке не трогать раскладку.
let pending = [], marks = [], docH = 1, heroB = 0, revT = 0, revB = 0, queued = false;
function measure() {
  const y = window.scrollY;
  pending = $$('.rv:not(.on)').map((el) => ({ el, top: el.getBoundingClientRect().top + y }));
  marks = sections.map((s) => ({ id: s.id, top: s.offsetTop }));
  docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  heroB = hero.offsetTop + hero.offsetHeight;
  revT = reviews.offsetTop; revB = revT + reviews.offsetHeight;
  onScroll();
}
function onScroll() {
  queued = false;
  const y = window.scrollY, vh = window.innerHeight;
  nav.classList.toggle('stuck', y > 30);
  progress.style.setProperty('--p', Math.min(1, y / docH).toFixed(4));
  fab.classList.toggle('show', y > vh * 0.9);
  root.classList.toggle('hero-off', y > heroB);                       // анимации первого экрана стоят, пока его не видно
  root.classList.toggle('rev-on', y + vh > revT && y < revB);          // ленты отзывов едут только на экране
  if (pending.length) pending = pending.filter((p) => { if (p.top < y + vh * 0.9) { p.el.classList.add('on'); return false; } return true; });
  let cur = marks.length ? marks[0].id : '';
  for (const m of marks) if (m.top < y + vh * 0.45) cur = m.id;
  links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + cur));
  if (y > 120) hideBubble();
}
window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
new ResizeObserver(measure).observe(document.body);
window.addEventListener('load', measure);
measure();
fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }));

// ── счётчики на первом экране ──
function count() {
  $$('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, suf = el.dataset.suf || '';
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });
}

if (fine && !calm) {
  // карточки первого экрана слегка поворачиваются за курсором
  const groups = $$('.cards');
  let raf = 0, mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => {
    if (root.classList.contains('hero-off')) return;
    mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      for (const g of groups) { g.style.setProperty('--px', (mx * 10).toFixed(2) + 'deg'); g.style.setProperty('--py', (-my * 8).toFixed(2) + 'deg'); }
    });
  }, { passive: true });

  // наклон карточек услуг и врачей с бликом под курсором
  $$('[data-tilt]').forEach((el) => {
    let r = null;
    el.addEventListener('pointerenter', () => { r = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', (e) => {
      if (!r) r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.classList.add('tilting');
      el.style.setProperty('--ry', ((x - 0.5) * 12).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', () => {
      r = null;
      el.classList.remove('tilting');
      el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg');
    });
  });

  // «магнитные» кнопки: слегка тянутся к курсору
  $$('.btn').forEach((b) => {
    let r = null;
    b.addEventListener('pointerenter', () => { r = b.getBoundingClientRect(); });
    b.addEventListener('pointermove', (e) => {
      if (!r) return;
      b.style.setProperty('--bx', (((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(1) + 'px');
      b.style.setProperty('--by', (((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(1) + 'px');
    });
    b.addEventListener('pointerleave', () => { r = null; b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
  });
}

// ── «Watch Video» — облёт сцены камерой, кольцо показывает ход ──
const watch = $('#watch'), wl = $('.wl', watch);
watch.addEventListener('click', () => {
  if (watch.classList.contains('live')) return;
  if (root.classList.contains('no-gl')) { $('#about').scrollIntoView({ behavior: calm ? 'auto' : 'smooth' }); return; }
  hideBubble();
  window.dispatchEvent(new Event('bs:orbit'));
  watch.classList.add('live'); wl.textContent = wl.dataset.live;
  setTimeout(() => { watch.classList.remove('live'); wl.textContent = wl.dataset.idle; }, 6600);
});

// ── реплики персонажа ──
const LINES = ['Brush twice a day!', 'Don\'t forget to floss!', 'That smile suits you!', 'See you at your checkup!', 'Two minutes, every time!'];
let line = 0, bubbleT = 0;
function hideBubble() { if (bubble.classList.contains('show')) { bubble.classList.remove('show'); clearTimeout(bubbleT); } }
window.addEventListener('bs:say', (e) => {
  const { kind, x, y } = e.detail;
  bubble.textContent = kind === 'hello' ? 'Hi, I\'m Brighty! Tap me' : LINES[line++ % LINES.length];
  bubble.hidden = false;
  bubble.style.setProperty('--x', Math.round(Math.min(x, window.innerWidth - 250)) + 'px');
  bubble.style.setProperty('--y', Math.round(Math.max(y, 90)) + 'px');
  requestAnimationFrame(() => bubble.classList.add('show'));
  clearTimeout(bubbleT);
  bubbleT = setTimeout(hideBubble, kind === 'hello' ? 4200 : 2600);
});

// ── отзывы: две ленты едут сами ──
const REVIEWS = [
  ['Olivia R.', 'Veneers', 'I used to hide my smile in photos. Dr. Carter showed me a 3D preview first — the result looks exactly like it.'],
  ['Marcus T.', 'Dental implant', 'Honestly painless. I was back at work the next morning and the implant feels like my own tooth.'],
  ['Hannah K.', 'Kids checkup', 'My five-year-old asked when we can go back. The mascot did half of the dentist\'s job!'],
  ['Daniel S.', 'Clear aligners', 'Eleven months, no metal, and nobody at the office even noticed I was wearing them.'],
  ['Priya M.', 'Whitening', 'One hour in the chair and eight shades brighter. No sensitivity afterwards at all.'],
  ['George L.', 'Checkup & hygiene', 'On time, clear prices, zero upselling. Exactly what a dentist should be.'],
  ['Elena V.', 'Smile makeover', 'They planned everything around my wedding date and delivered a week early.'],
  ['Tom B.', 'Emergency visit', 'Called at 8 am with a cracked tooth, was in the chair by 9:30. Lifesavers.'],
  ['Aisha N.', 'Orthodontics', 'Dr. Martinez explains every step. I always knew what was coming next and why.'],
  ['Chris W.', 'General dentistry', 'Fifteen years of dental anxiety gone after two visits. Calm, gentle, patient.'],
];
const icon = (id, cls = '') => `<svg${cls ? ` class="${cls}"` : ''}><use href="#i-${id}"/></svg>`;
// тексты отзывов заданы выше в этом файле, от посетителей ничего не подставляется
const card = ([n, s, t]) => `<article class="rcard">${icon('quote', 'qm')}<span class="stars">${icon('star').repeat(5)}</span><p>${t}</p><div class="who"><i>${n[0]}</i><span><b>${n}</b><small>${s}</small></span></div></article>`;
const fill = (el, list) => { const h = list.map(card).join(''); el.innerHTML = h + h; };
fill($('#marq'), REVIEWS.slice(0, 6));
fill($('#marq2'), REVIEWS.slice(4).concat(REVIEWS.slice(0, 2)));

// ── запись (демо) ──
const days = $('#days');
const now = new Date();
for (let i = 1, n = 0; n < 6; i++) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
  if (d.getDay() === 0) continue;
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.v = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  b.dataset.s = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const wd = document.createElement('small'), dn = document.createElement('b');
  wd.textContent = d.toLocaleDateString('en-US', { weekday: 'short' });
  dn.textContent = d.getDate();
  b.append(wd, dn);
  if (n === 0) b.classList.add('on');
  days.append(b); n++;
}
const sum = $('#sum');
const pick = (name, short) => { const b = $(`.chips[data-name="${name}"] .on`); return b ? ((short && b.dataset.s) || b.dataset.v || b.textContent) : ''; };
const summary = () => { sum.textContent = `${pick('service')} · ${pick('day', true)} · ${pick('time')}`; };
const choose = (g, b) => {
  $$('button', g).forEach((x) => x.classList.toggle('on', x === b));
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  summary();
};
$$('.chips').forEach((g) => g.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) choose(g, b); }));
$$('[data-pick]').forEach((a) => a.addEventListener('click', () => {
  const g = $('.chips[data-name="service"]');
  const b = $$('button', g).find((x) => x.textContent === a.dataset.pick);
  if (b) choose(g, b);
}));
summary();

const form = $('#form'), done = $('#done'), submit = $('button[type=submit]', form);
function confetti() {
  if (calm) return;
  const colors = ['#f5b921', '#ffd35a', '#7fb83a', '#ffffff', '#58b7b3'];
  for (let i = 0; i < 34; i++) {
    const c = document.createElement('i');
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 220;
    c.className = 'confetti';
    c.style.background = colors[i % colors.length];
    c.style.setProperty('--cx', Math.round(Math.cos(a) * d) + 'px');
    c.style.setProperty('--cy', Math.round(Math.sin(a) * d * 0.8 + 90) + 'px');
    c.style.setProperty('--cr', Math.round((Math.random() - 0.5) * 900) + 'deg');
    c.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
    done.append(c);
    c.addEventListener('animationend', () => c.remove());
  }
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (submit.classList.contains('busy')) return;
  let ok = true;
  for (const inp of $$('input', form)) {
    const good = inp.name === 'phone' ? inp.value.replace(/\D/g, '').length >= 7 : inp.value.trim().length >= 2;
    inp.parentElement.classList.remove('bad');
    if (!good) { void inp.offsetWidth; inp.parentElement.classList.add('bad'); if (ok) inp.focus(); ok = false; }
  }
  if (!ok) return;
  const name = form.elements.name.value.trim().split(' ')[0];
  const lb = $('.lb', submit), text = lb.textContent;
  submit.classList.add('busy'); lb.textContent = 'Booking…';
  setTimeout(() => {                                   // демо: изображаем отправку, данные никуда не уходят
    submit.classList.remove('busy'); lb.textContent = text;
    $('#doneText').textContent = `${name}, we saved ${pick('service')} for you on ${pick('day')} at ${pick('time')}. We'll call to confirm.`;
    done.hidden = false;
    confetti();
    window.dispatchEvent(new Event('bs:cheer'));
  }, 850);
});
$('#again').addEventListener('click', () => { done.hidden = true; form.reset(); });
