import { createSpectre } from './spectre.js';
import { DEMOS, ORDER, CASES, loadFonts, loadAllFonts, warmHero } from './demos.js';
import { demoHTML, demoNeighbours } from './demo.js';
import { initRail } from './rail.js';
import { initPlay } from './play.js';
import { WORKS, SERVICE_INDEX, worksGrid } from './works.js';
import { adopt, onRate, clockInfo, regroupSoon, hush, economy } from './clock.js';

const TG = 'https://t.me/hovatsavsem';
const REVIEWS = 'https://t.me/specreview';
const LANGS = ['ru', 'en', 'de', 'es'];
const BLUE = ['#2447ff', '#e8edff'];

const $ = (s, r = document) => r.querySelector(s);
// Обработчик движения мыши срабатывает не чаще одного раза за кадр.
const perFrame = (fn) => { let ev = null, queued = false; return (e) => { ev = e; if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; fn(ev); }); } }; };
const site = $('#site'), page = $('#demo'), veil = $('#veil');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;

const spectre = createSpectre($('#gl'));
if (!spectre) document.body.classList.add('no-gl');
const fx = spectre || { morph() {}, palette() {}, place() {}, alpha() {}, burst() {} };

// Облегчённый режим: включается, если нет видеоускорения (WebGL) или кадры идут медленно.
// Отключает размытия, наклоны, параллакс и уменьшает число частиц — см. блок .lite в css/fx.css.
const rootEl = document.documentElement;
const isLite = () => rootEl.classList.contains('lite');
const goLite = () => { if (!isLite()) { rootEl.classList.add('lite'); spectre?.lighten(); economy(); } };
if (!spectre || spectre.mode !== 'webgl') goLite();
{
  let n = 0, slow = 0, prev = performance.now();
  const probe = (now) => {
    const d = now - prev; prev = now;
    if (n > 15 && d > 30 && d < 500) slow++;
    if (++n < 150) requestAnimationFrame(probe); else if (slow > 40) goLite();
  };
  requestAnimationFrame(probe);
}

let L = null, lang = 'ru', current = null, busy = false, lastPt = null, preview = null, homeY = 0, intro = false;
const glCanvas = $('#gl');

// ---------- примерка названия ----------
// Посетитель вводит название своего бизнеса на главной — оно подставляется в строки концептов и во все демо-сайты.
let own = '';
try { own = (localStorage.getItem('spectre-name') || '').slice(0, 24); } catch {}
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ownName = () => own.trim();

// ---------- графика ----------
const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const CURVE = 'M12 80C44 80 44 20 70 20s30 48 50 48';
// Иллюстрации услуг: стекло, градиент и отдельные слои (a1–a4), которые разъезжаются при наведении.
const ILLU = [
  `<rect class="gl" x="6" y="8" width="120" height="84" rx="13"/><circle class="dot" cx="19" cy="21" r="2.600"/><circle class="dot" cx="28" cy="21" r="2.600"/><circle class="dot" cx="37" cy="21" r="2.600"/><rect class="ln" x="52" y="17.500" width="62" height="7" rx="3.500"/><rect class="a1" x="16" y="34" width="60" height="48" rx="8" fill="url(#ig0)"/><rect class="gl a2" x="82" y="34" width="34" height="21" rx="6"/><rect class="gl a3" x="82" y="61" width="34" height="21" rx="6"/><g class="a4"><path d="M96 60l5.500 19 4.500-7.500 8.500-1.500z" fill="#fff" stroke="#05060f" stroke-width="1.500" stroke-linejoin="round"/></g>`,
  `<path class="a3" d="M103 6l14 24H89z" fill="var(--i1)"/><circle class="a1" cx="50" cy="52" r="34" fill="url(#ig1)"/><rect class="gl a2" x="60" y="38" width="56" height="56" rx="14"/><circle class="a4" cx="88" cy="66" r="9" fill="var(--i1)"/>`,
  `<rect class="gl" x="38" y="3" width="56" height="94" rx="13"/><rect x="46" y="13" width="40" height="28" rx="7" fill="url(#ig2)"/><rect class="ln" x="46" y="48" width="40" height="6" rx="3"/><rect class="ln" x="46" y="59" width="26" height="6" rx="3"/><rect x="46" y="76" width="40" height="12" rx="6" fill="var(--i1)"/><g class="a2"><rect class="gl2" x="84" y="22" width="44" height="24" rx="12"/><circle cx="116" cy="34" r="8" fill="url(#ig2)"/></g><g class="a3"><rect class="gl2" x="4" y="50" width="42" height="28" rx="9"/><path d="M15 65l6 6 13-14" stroke="var(--i1)" stroke-width="3.200" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  `<path d="${CURVE}" stroke="var(--i4)" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/><circle cx="35" cy="62" r="9" fill="var(--i2)" opacity=".28"/><circle cx="52" cy="32" r="11" fill="var(--i2)" opacity=".5"/><rect x="6" y="74" width="12" height="12" rx="2.500" transform="rotate(45 12 80)" fill="var(--i1)"/><rect x="114" y="62" width="12" height="12" rx="2.500" transform="rotate(45 120 68)" fill="var(--i1)"/><g class="mo-ball"><circle r="14" fill="url(#ig3)"/></g>`,
  `<g class="a2"><rect class="gl" x="54" y="12" width="62" height="74" rx="13" transform="rotate(9 85 49)"/></g><g class="a1"><g transform="rotate(-6 49 52)"><rect x="18" y="14" width="62" height="74" rx="13" fill="url(#ig4)"/><circle cx="32" cy="28" r="6" fill="var(--i5)" opacity=".85"/><rect x="42" y="25" width="26" height="6" rx="3" fill="var(--i5)" opacity=".6"/><rect x="26" y="42" width="46" height="34" rx="8" fill="var(--i5)" opacity=".28"/></g></g><g class="a3"><circle class="gl2" cx="100" cy="74" r="18"/><path d="M100 83s-9-5.500-9-11.500a5 5 0 0 1 9-2.800 5 5 0 0 1 9 2.800c0 6-9 11.500-9 11.500z" fill="var(--i1)"/></g>`,
  `<g class="a2"><rect class="gl" x="28" y="30" width="86" height="52" rx="9" transform="rotate(-15 71 56)"/></g><g class="a3"><rect class="gl2" x="24" y="27" width="86" height="52" rx="9" transform="rotate(-4 67 53)"/></g><g class="a1"><g transform="rotate(8 63 50)"><rect x="20" y="24" width="86" height="52" rx="9" fill="url(#ig5)"/><circle cx="38" cy="42" r="7" fill="var(--i5)" opacity=".9"/><rect x="50" y="38.500" width="34" height="7" rx="3.500" fill="var(--i5)" opacity=".7"/><rect x="30" y="58" width="50" height="5" rx="2.500" fill="var(--i5)" opacity=".4"/></g></g>`,
];
const illu = (i) => `<svg viewBox="0 0 132 100" fill="none" aria-hidden="true"><defs><linearGradient id="ig${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--i1)"/><stop offset="1" style="stop-color:var(--i2)"/></linearGradient></defs>${ILLU[i]}</svg>`;

const btn = (label, href, cls = '') => `<a class="btn ${cls}" href="${href}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}><span>${label}</span><i class="btn-ico">${ARROW}</i></a>`;
const words = (text) => text.split(' ').map((w, i) => `<span class="wd"><span style="--i:${i}">${w}</span></span>`).join(' ');
const pad2 = (n) => String(n).padStart(2, '0');
// Отзывы: даты публикации в канале (месяц с нуля, день) и оттенки аватаров, в порядке items из lang-файлов.
const REV_DATES = [[1, 5], [5, 23], [5, 28], [6, 30], [9, 20], [3, 29]];
const REV_HUE = [228, 262, 196, 330, 158, 22];
const revDate = (i) => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(new Date(2026, REV_DATES[i][0], REV_DATES[i][1]));
const TG_ICON = '<svg class="r-tg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.400 3.300 2.900 10.400c-1.100.400-1.100 1.100-.200 1.400l4.700 1.500 1.800 5.600c.200.600.400.800.900.800.400 0 .600-.200.900-.500l2.300-2.200 4.700 3.500c.900.500 1.500.200 1.700-.800l3.100-14.700c.300-1.300-.500-1.900-1.400-1.700zM8.200 13l10-6.300c.500-.300.900-.100.500.200l-8.200 7.400-.300 3.400z"/></svg>';
const isWork = (k) => !!k && k.startsWith('w:');
const SERVICE_WORK = Object.fromEntries(Object.entries(SERVICE_INDEX).map(([k, v]) => [v, k]));

// ---------- язык ----------
function pickLang() {
  let saved = null;
  try { saved = localStorage.getItem('spectre-lang'); } catch {}
  if (LANGS.includes(saved)) return saved;
  const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
  return LANGS.includes(nav) ? nav : 'en';
}
async function setLang(next) {
  L = (await import(`./lang/${next}.js`)).default;
  lang = next;
  try { localStorage.setItem('spectre-lang', next); } catch {}
  document.documentElement.lang = next;
  renderMain();
  if (current) renderPage(current);
  setTitle();
}
function setTitle() {
  if (isWork(current)) document.title = `${L.services.items[SERVICE_INDEX[current.slice(2)]].t} — SPECTRE`;
  else if (current) document.title = `${ownName() || DEMOS[current].name} — ${L.concepts.items[current].type} · SPECTRE`;
  else document.title = L.meta.title;
  $('meta[name=description]').content = L.meta.desc;
}

// ---------- главная ----------
function renderMain() {
  const t = L;
  site.innerHTML = `
<header class="nav">
  <a class="logo" href="#top">SPECTRE</a>
  <nav class="nav-links">
    <a href="#concepts">${t.nav.concepts}</a><a href="#services">${t.nav.services}</a>
    <a href="#team">${t.nav.team}</a><a href="#reviews">${t.nav.reviews}</a>
  </nav>
  <div class="nav-side">
    <div class="langs" role="group" aria-label="Language">
      ${LANGS.map((l) => `<button type="button" data-lang="${l}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`).join('')}
    </div>
    <a class="btn btn-sm" href="${TG}" target="_blank" rel="noopener">${t.nav.cta}</a>
  </div>
</header>
<main id="top">
  <section class="hero" data-live>
    <h1>${t.hero.title[0]} <span class="grad">${t.hero.title[1]}</span></h1>
    <p class="lead">${t.hero.sub}</p>
    <div class="actions">
      ${btn(t.hero.cta, '#concepts')}
      <a class="link" href="${TG}" target="_blank" rel="noopener">${t.hero.cta2}</a>
    </div>
    <span class="scroll-cue" aria-hidden="true">${t.hero.scroll}</span>
  </section>

  <section class="concepts" id="concepts">
    <div class="sec-head">
      <h2 class="rvw">${words(t.concepts.title)}</h2>
      <p>${touch ? t.concepts.subTouch : t.concepts.sub}</p>
    </div>
    <div class="nm rv${ownName() ? ' has' : ''}">
      <label class="nm-l" for="nm-in">${t.name.label}</label>
      <span class="nm-f"><input id="nm-in" type="text" maxlength="24" value="${esc(own)}" placeholder="${t.name.ph}" data-name autocomplete="off" spellcheck="false" enterkeyhint="done"><button type="button" data-name-x aria-label="${t.name.clear}">${CROSS}</button></span>
      <span class="nm-h">${t.name.hint}</span>
    </div>
    <ul class="c-list">
      ${ORDER.map((id, i) => `<li class="rv" style="--i:${i}"><a class="c-row" href="#/${id}" data-id="${id}" data-b="${id}" style="--c:${DEMOS[id].glow[0]}">
        <span class="c-main">
          <span class="c-type">${t.concepts.items[id].type}</span>
          <span class="c-style">${t.concepts.items[id].style}</span>
        </span>
        <span class="c-side"><span class="c-brand">${ownName() ? esc(ownName()) : DEMOS[id].name}</span><span class="c-sw"><i></i><i></i><i></i></span></span>
        <span class="c-go">${ARROW}</span>
      </a></li>`).join('')}
    </ul>
  </section>

  <div class="ticker" data-live aria-hidden="true"><div class="ticker-in">
    ${[0, 1].map(() => t.services.items.map((s, i) => `<span class="${i % 2 ? '' : 'fill'}">${s.t}</span><b></b>`).join('')).join('')}
  </div></div>

  <section class="services" id="services">
    <div class="sec-head"><h2 class="rvw">${words(t.services.title)}</h2><p>${t.services.sub}</p></div>
    <div class="s-grid" data-live>
      ${t.services.items.map((s, i) => `<a class="s-card tilt rv${i === 0 ? ' s-wide s-blue' : i === 5 ? ' s-wide s-white' : ''}" href="${i === 0 ? '#concepts' : `#/w/${SERVICE_WORK[i]}`}" style="--i:${i}">
        <div class="s-art">${illu(i)}</div>
        <span class="s-go">${ARROW}</span>
        <h3>${s.t}</h3><p>${s.d}</p>
        <ul class="s-tags">${s.tags.map((g) => `<li>${g}</li>`).join('')}</ul>
        <span class="s-more"><span>${i === 0 ? t.works.sites : t.works.open}</span><em>${pad2(i === 0 ? ORDER.length : CASES.length)}</em></span>
      </a>`).join('')}
    </div>
  </section>

  <section class="team" id="team">
    <div class="sec-head"><h2 class="rvw">${words(t.team.title)}</h2><p>${t.team.sub}</p></div>
    <ol class="steps">
      ${t.team.steps.map((s, i) => `<li class="rv" style="--i:${i}"><h3>${s.t}</h3><p>${s.d}</p></li>`).join('')}
    </ol>
  </section>

  <section class="brief" id="brief">
    <div class="sec-head"><h2 class="rvw">${words(t.brief.title)}</h2><p>${t.brief.sub}</p></div>
    <div class="bf rv">
      <div class="bf-q">
        <div class="bf-step"><h3><b>01</b>${t.brief.q[0]}<em>${t.brief.multi}</em></h3>
          <div class="bf-chips" data-bf="what">${t.services.items.map((s, i) => `<button class="bf-chip" type="button" data-v="${i}" aria-pressed="false">${s.t}</button>`).join('')}<button class="bf-chip" type="button" data-v="x" aria-pressed="false">${t.brief.unsure}</button></div></div>
        <div class="bf-step"><h3><b>02</b>${t.brief.q[1]}</h3>
          <div class="bf-chips" data-bf="biz">${ORDER.map((id) => `<button class="bf-chip" type="button" data-v="${id}" aria-pressed="false">${t.concepts.items[id].type}</button>`).join('')}<button class="bf-chip" type="button" data-v="x" aria-pressed="false">${t.brief.other}</button></div></div>
        <div class="bf-step"><h3><b>03</b>${t.brief.q[2]}</h3>
          <div class="bf-chips" data-bf="when">${t.brief.when.map((w, i) => `<button class="bf-chip" type="button" data-v="${i}" aria-pressed="false">${w}</button>`).join('')}</div></div>
      </div>
      <div class="bf-out">
        <div class="bf-chat">
          <div class="bf-top"><span class="bf-av">S</span><div><b>SPECTRE</b><span>Telegram</span></div>${TG_ICON}</div>
          <p class="bf-msg is-empty" data-bf-msg></p>
        </div>
        <a class="btn bf-send" href="${TG}" target="_blank" rel="noopener" data-bf-send><span>${t.brief.send}</span><i class="btn-ico">${ARROW}</i></a>
        <p class="bf-note">${t.brief.note}</p>
      </div>
    </div>
  </section>

  <section class="reviews" id="reviews">
    <div class="sec-head"><h2 class="rvw">${words(t.reviews.title)}</h2><p>${t.reviews.sub}</p></div>
    <div class="r-wall rv" data-live>
      ${[0, 1].map((row) => `<div class="r-line${row ? ' rev' : ''}"><div class="r-run">${[0, 1].map((copy) => (row ? [3, 4, 5, 0, 1, 2] : [0, 1, 2, 3, 4, 5]).map((i) => { const r = t.reviews.items[i]; return `<figure class="r-card"${copy ? ' aria-hidden="true"' : ''}>
        <figcaption><span class="r-av" style="--h:${REV_HUE[i]}">${r.a[0]}</span><div><b>${r.a}</b><span>${revDate(i)}</span></div>${TG_ICON}</figcaption>
        <blockquote>${r.q}</blockquote>
      </figure>`; }).join('')).join('')}</div></div>`).join('')}
    </div>
    <a class="link" href="${REVIEWS}" target="_blank" rel="noopener">${t.reviews.more}</a>
  </section>

  <section class="end rv">
    <h2>${t.end.title}</h2>
    <p>${t.end.sub}</p>
    ${btn(t.end.cta, TG, 'btn-light')}
  </section>
</main>
<footer class="foot"><span class="logo">SPECTRE © ${new Date().getFullYear()}</span><span>${t.foot}</span></footer>`;
  bindConcepts();
  updateBrief();
  watch(site);
}

function saveName() { try { if (ownName()) localStorage.setItem('spectre-name', ownName()); else localStorage.removeItem('spectre-name'); } catch {} }
function applyName() {
  const n = ownName();
  site.querySelectorAll('.c-row').forEach((r) => { $('.c-brand', r).textContent = n || DEMOS[r.dataset.id].name; });
  $('.nm', site)?.classList.toggle('has', !!n);
  updateBrief();
}

// ---------- заявка: три вопроса и готовое сообщение для Telegram ----------
// Ответы хранятся кодами (номер услуги, id концепта, номер срока), поэтому переживают смену языка.
const bf = { what: new Set(), biz: null, when: null };
function briefText() {
  const b = L.brief, parts = [];
  if (bf.what.size) parts.push(b.what.replace('{v}', [...bf.what].map((v) => (v === 'x' ? b.unsure : L.services.items[+v].t)).join(', ')));
  if (bf.biz) parts.push(b.biz.replace('{v}', bf.biz === 'x' ? b.other : L.concepts.items[bf.biz].type));
  if (ownName()) parts.push(b.name.replace('{v}', ownName()));
  if (bf.when !== null) parts.push(b.time.replace('{v}', b.when[bf.when]));
  return bf.what.size || bf.biz || bf.when !== null ? `${b.hello} ${parts.join(' ')}` : '';
}
function updateBrief() {
  const box = $('.bf', site);
  if (!box) return;
  box.querySelectorAll('.bf-chip').forEach((c) => {
    const g = c.parentElement.dataset.bf, v = c.dataset.v;
    c.setAttribute('aria-pressed', g === 'what' ? bf.what.has(v) : String(bf[g]) === v);
  });
  const text = briefText(), msg = $('[data-bf-msg]', box);
  msg.textContent = text || L.brief.empty;
  msg.classList.toggle('is-empty', !text);
  $('[data-bf-send]', box).href = text ? `${TG}?text=${encodeURIComponent(text)}` : TG;
}
function pickBrief(c) {
  const g = c.parentElement.dataset.bf, v = c.dataset.v;
  if (g === 'what') {
    if (bf.what.has(v)) bf.what.delete(v);
    else { if (v === 'x') bf.what.clear(); else bf.what.delete('x'); bf.what.add(v); }
  } else if (g === 'when') bf.when = String(bf.when) === v ? null : +v;
  else bf.biz = bf.biz === v ? null : v;
  updateBrief();
}

function showPreview(id) {
  if (preview === id || current) return;
  preview = id;
  site.querySelectorAll('.c-row').forEach((r) => r.classList.toggle('is-on', r.dataset.id === id));
  if (id) { loadFonts(id); warmHero(id); fx.morph(id); fx.palette(...DEMOS[id].glow, true); }
  else { fx.morph('spectre'); fx.palette(...BLUE, true); }
}

let rowObserver = null;
function bindConcepts() {
  const list = $('.c-list', site);
  rowObserver?.disconnect();
  if (touch) {
    rowObserver = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) showPreview(e.target.dataset.id);
    }, { rootMargin: '-46% 0px -46% 0px' });
    list.querySelectorAll('.c-row').forEach((r) => rowObserver.observe(r));
  } else {
    // Одно делегированное событие на весь список: строки не меняют высоту, поэтому цель под курсором не «убегает».
    const pick = (e) => { const r = e.target.closest('.c-row'); if (r) showPreview(r.dataset.id); };
    list.addEventListener('pointerover', pick);
    list.addEventListener('pointermove', pick);
    list.addEventListener('focusin', pick);
    list.addEventListener('pointerleave', () => showPreview(null));
  }
}

// ---------- страницы: демо-сайт или раздел портфолио ----------
function dock(home, prev, label, next, cta) {
  return `<div class="dock">
  <a class="dock-home" href="#/" aria-label="${home}">SPECTRE</a>
  <div class="dock-sw"><a href="${prev}" aria-label="${L.dock.prev}">‹</a><span>${label}</span><a href="${next}" aria-label="${L.dock.next}">›</a></div>
  <a class="dock-cta" href="${TG}" target="_blank" rel="noopener">${cta}</a>
</div>`;
}

function renderDemo(id) {
  const [prev, next] = demoNeighbours(id);
  page.innerHTML = demoHTML(id, L, { words, btn, TG, name: ownName() ? esc(ownName()) : '', nameLen: [...ownName()].length })
    + dock(L.dock.back, `#/${prev}`, L.concepts.items[id].type, `#/${next}`, L.dock.want);
}
function renderWork(id) {
  const i = WORKS.indexOf(id), n = WORKS.length;
  const s = L.services.items[SERVICE_INDEX[id]];
  const prev = WORKS[(i + n - 1) % n], next = WORKS[(i + 1) % n];
  loadAllFonts();
  page.innerHTML = `
<div class="w">
  <header class="w-top"><a class="logo" href="#/">SPECTRE</a><a class="w-x" href="#/" aria-label="${L.works.back}">${CROSS}</a></header>
  <section class="w-hero">
    <p class="w-idx">${pad2(i + 1)} / ${pad2(n)}</p>
    <h1 class="rvw">${words(s.t)}</h1>
    <p class="lead">${L.works.d[id]}</p>
    <ul class="s-tags">${s.tags.map((g) => `<li>${g}</li>`).join('')}</ul>
  </section>
  <section class="w-grid">${worksGrid(id, L)}</section>
  <p class="w-note">${L.works.note}</p>
  <a class="w-next" href="#/w/${next}"><div><span>${L.works.next}</span><b>${L.services.items[SERVICE_INDEX[next]].t}</b></div><i>${ARROW}</i></a>
  <section class="end rv">
    <h2>${L.end.title}</h2>
    <p>${L.end.sub}</p>
    ${btn(L.end.cta, TG, 'btn-light')}
  </section>
</div>
${dock(L.works.back, `#/w/${prev}`, s.t, `#/w/${next}`, L.hero.cta2)}`;
}

function renderPage(key) {
  rail?.destroy(); rail = null;
  stopPlay?.(); stopPlay = null;
  if (isWork(key)) renderWork(key.slice(2)); else renderDemo(key);
  watch(page);
  initLook(page);
  initTimer(page);
  if (!isWork(key)) stopPlay = initPlay(page, { onPick: updateCount });
  if (key === 'shop') rail = initRail(page, { names: L.more.shop.rail, lite: isLite(), onAdd: () => { extraAdds++; updateCount(); } });
}

// Счётчик в шапке демо-сайта: отмеченные позиции каталога плюс вещи, добавленные с рейла.
let rail = null, extraAdds = 0, stopPlay = null;
function updateCount() {
  const cnt = $('.d-cnt', page);
  if (!cnt) return;
  const n = page.querySelectorAll('.d-item.is-on, .lkc-info.is-on, .pan-it.is-on, .hl-row.is-on, .deck-card.is-on').length + extraAdds;
  cnt.querySelector('b').textContent = n;
  cnt.classList.toggle('has', n > 0);
  cnt.classList.remove('bump'); void cnt.offsetWidth; cnt.classList.add('bump');
}

// Карусели каталога. Обычная: центральная карточка в фокусе, соседние уменьшены и размыты.
// Круговая (ресторан): тарелки стоят по кругу, активная наверху, круг проворачивается.
// Листаются сами, стрелками, свайпом или нажатием на карточку. Круг ресторана ещё и крутится рукой: его берут за любое
// место и ведут по дуге, после отпускания он докручивается по инерции и встаёт на ближайшее блюдо.
let lookTimer = null;
function initLook(root) {
  clearInterval(lookTimer);
  const el = root.querySelector('[data-look]');
  if (!el) return;
  const orbit = el.dataset.look === 'orbit';
  const its = [...el.querySelectorAll('.lkc-it')], infos = [...el.querySelectorAll('.lkc-info')], bar = el.querySelector('.lkc-prog i');
  const n = its.length, m = infos.length;
  let cur = 0, turn = 0, touched = 0;
  const set = (i) => {
    let d = (((i - cur) % n) + n) % n;
    if (d > n / 2) d -= n;
    turn += d; cur = (((cur + d) % n) + n) % n;
    paint();
  };
  const paint = () => {
    if (orbit) {
      el.style.setProperty('--orb', `${(-turn * 360) / n}deg`);
      its.forEach((it, k) => it.classList.toggle('on', k === cur));
    } else {
      its.forEach((it, k) => {
        let o = (((k - cur) % n) + n) % n;
        if (o > n / 2) o -= n;
        const prev = +it.style.getPropertyValue('--o') || 0;
        if (Math.abs(o - prev) > 1.5) { it.classList.add('jump'); requestAnimationFrame(() => requestAnimationFrame(() => it.classList.remove('jump'))); }
        it.style.setProperty('--o', o); it.style.setProperty('--a', Math.abs(o));
        it.classList.toggle('far', Math.abs(o) > 1); it.classList.toggle('on', o === 0);
      });
    }
    infos.forEach((x, k) => x.classList.toggle('on', k === cur % m));
    bar.style.transform = `scaleX(${((cur % m) + 1) / m})`;
  };
  el._go = (dir) => { touched = Date.now(); set(cur + dir); };
  el._set = (i) => { touched = Date.now(); set(i === cur ? cur + 1 : i); };
  set(0);
  lookTimer = setInterval(() => {
    if (!el.isConnected) { clearInterval(lookTimer); return; }
    if (Date.now() - touched > 7000 && !document.hidden) set(cur + 1);
  }, 3600);
  const stage = el.querySelector('.lkc-stage, .orb-ring');
  if (orbit) { spinByHand(el, stage, n, () => turn, (v) => { touched = Date.now(); turn = v; cur = ((turn % n) + n) % n; paint(); }); return; }
  let sx = null;
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 36) { el._swiped = Date.now(); el._go(dx < 0 ? 1 : -1); }
  });
}

// Круг тарелок в руке. Угол считается от центра круга до указателя; пока круг ведут, переменная --orb пишется напрямую,
// без перехода (класс .spin), и тарелки в это время лежат в отдельных слоях — двигает их видеокарта.
function spinByHand(el, ring, n, getTurn, setTurn) {
  const step = 360 / n;
  let g = null;
  const angle = (e) => (Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180) / Math.PI;
  ring.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    const r = el.querySelector('.orb-ring').getBoundingClientRect();
    g = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, base: -getTurn() * step, sum: 0, v: 0, t: e.timeStamp, id: e.pointerId, moved: false };
    g.a = angle(e);
  });
  ring.addEventListener('pointermove', (e) => {
    if (!g || e.pointerId !== g.id) return;
    const a = angle(e);
    let d = a - g.a;
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    g.a = a; g.sum += d;
    if (!g.moved) {
      if (Math.abs(g.sum) < 3) return; // лёгкое движение — это нажатие на тарелку, а не вращение
      g.moved = true;
      el.classList.add('spin', 'used');
      try { ring.setPointerCapture(e.pointerId); } catch {}
    }
    const dt = Math.max(1, e.timeStamp - g.t); g.t = e.timeStamp;
    g.v = g.v * 0.7 + (d / dt) * 0.3; // градусов в миллисекунду, сглажено
    el.style.setProperty('--orb', `${(g.base + g.sum).toFixed(2)}deg`);
  });
  const end = (e) => {
    if (!g || (e.pointerId !== undefined && e.pointerId !== g.id)) return;
    const s = g; g = null;
    if (!s.moved) return;
    el._swiped = Date.now();
    const still = e.timeStamp - s.t > 90 ? 0 : s.v; // подержали на месте перед отпусканием — инерции нет
    const target = s.base + s.sum + Math.max(-140, Math.min(140, still * 260));
    void el.offsetWidth;
    el.classList.remove('spin');
    setTurn(-Math.round(target / step));
  };
  ring.addEventListener('pointerup', end);
  ring.addEventListener('pointercancel', end);
}

// Слои с параллаксом (data-par) и свет в зале ресторана идут за курсором; значения уходят в CSS-переменные.
document.addEventListener('pointermove', perFrame((e) => {
  if (e.pointerType === 'touch' && !e.isPrimary) return;
  const par = e.target.closest?.('[data-par]');
  if (par && !isLite()) {
    const r = par.getBoundingClientRect();
    par.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    par.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  }
  const hero = e.target.closest?.('.d-restaurant .d-hero');
  if (hero) {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--sx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    hero.style.setProperty('--sy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  }
}), { passive: true });

// Таймер тренировки у фитнеса: идёт обратный отсчёт, пока открыт сайт.
let timerId = null;
function initTimer(root) {
  clearInterval(timerId);
  const el = root.querySelector('[data-timer]');
  if (!el) return;
  let left = +el.dataset.timer;
  timerId = setInterval(() => {
    if (!el.isConnected) { clearInterval(timerId); return; }
    left = left > 0 ? left - 1 : +el.dataset.timer;
    el.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  }, 1000);
}

// Стикеры кофейни: берём и переносим, где отпустили — там и остаются.
let stk = null;
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest?.('[data-stk]');
  if (!el) return;
  e.preventDefault();
  stk = { el, x: e.clientX - (parseFloat(el.style.getPropertyValue('--tx')) || 0), y: e.clientY - (parseFloat(el.style.getPropertyValue('--ty')) || 0) };
  el.classList.add('drag');
});
document.addEventListener('pointermove', (e) => {
  if (!stk) return;
  stk.el.style.setProperty('--tx', `${e.clientX - stk.x}px`);
  stk.el.style.setProperty('--ty', `${e.clientY - stk.y}px`);
}, { passive: true });
const stkEnd = () => { if (stk) { stk.el.classList.remove('drag'); stk = null; } };
addEventListener('pointerup', stkEnd); addEventListener('pointercancel', stkEnd);

// Панели фитнеса и список объектов недвижимости: активным становится элемент под курсором или пальцем.
const pick = (e) => {
  const pan = e.target.closest?.('[data-pan]');
  if (pan && !pan.classList.contains('on')) pan.parentElement.querySelectorAll('[data-pan]').forEach((x) => x.classList.toggle('on', x === pan));
  const row = e.target.closest?.('[data-hl-i]');
  if (row && !row.classList.contains('on')) {
    const hl = row.closest('[data-hl]'), i = +row.dataset.hlI;
    hl.querySelectorAll('.hl-row').forEach((x, k) => x.classList.toggle('on', k === i));
    hl.querySelectorAll('.hl-img').forEach((x, k) => x.classList.toggle('on', k === i));
  }
};
document.addEventListener('pointerover', pick);
document.addEventListener('click', pick);

// «До и после»: шторка идёт за курсором или пальцем.
let baEl = null;
const baMove = (el, e) => {
  const r = el.getBoundingClientRect();
  el.classList.add('drag');
  el.style.setProperty('--x', `${Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100))}%`);
};
document.addEventListener('pointerdown', (e) => { const el = e.target.closest?.('[data-ba]'); if (el) { baEl = el; baMove(el, e); } });
document.addEventListener('pointermove', perFrame((e) => {
  if (baEl) { baMove(baEl, e); return; }
  if (e.pointerType === 'mouse') { const el = e.target.closest?.('[data-ba]'); if (el) baMove(el, e); }
}), { passive: true });
addEventListener('pointerup', () => { baEl = null; });
addEventListener('pointercancel', () => { baEl = null; });

// ---------- появление при прокрутке ----------
// Проверяем положение сами в обработчике прокрутки: так блоки гарантированно проявятся,
// даже если браузер придерживает IntersectionObserver.
let pending = [], motions = [], pxEls = [], spEls = [];
const SDA = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()'); // анимации, привязанные к прокрутке, умеет сам браузер
const MOTION = '.mo, [data-live], [data-gov]';
function watch(root) {
  pending = pending.filter((el) => el.isConnected).concat([...root.querySelectorAll('.rv, .rvw, .rvi')]);
  adopt(document.body);
  motions = [...document.querySelectorAll(MOTION)];
  // параллакс фото: в Chrome и Edge его ведёт сам браузер (animation-timeline), фото первого экрана стоит на месте — см. css/fx.css
  pxEls = SDA ? [] : [...document.querySelectorAll('[data-px]')].filter((el) => !el.closest('.d-hero-media'));
  spEls = [...document.querySelectorAll('[data-sp]')];
  reveal();
}
// Зацикленные CSS-анимации на экранах 120+ Гц ведёт общий метроном (js/clock.js). Анимации появляются и позже —
// когда блок выходит на экран или меняется страница, — поэтому после таких событий список обновляется.
let adoptT = 0;
function adoptSoon() {
  clearTimeout(adoptT);
  adoptT = setTimeout(() => { if (adopt(document.body)) { motions = [...document.querySelectorAll(MOTION)]; reveal(); } }, 140);
}
onRate(adoptSoon);
// Цена в карточке «влёта» досчитывается по мере прокрутки, сохраняя формат строки («348 000 €», «€348,000»).
function countPrice(text, k) {
  const m = text.match(/\d[\d\s.,\u00a0]*\d/);
  if (!m) return text;
  const target = +m[0].replace(/\D/g, ''), sep = (m[0].match(/\d([^\d])\d{3}/) || [])[1] || '';
  const v = Math.round(target * (0.86 + 0.14 * (1 - (1 - k) ** 3)) / 100) * 100;
  return text.replace(m[0], String(k >= 1 ? target : v).replace(/\B(?=(\d{3})+$)/g, sep));
}

// Цифры в блоке «о нас» досчитываются от нуля, когда блок появляется на экране.
function countUp(el) {
  const m = el.textContent.match(/^(\d+)(.*)$/s);
  if (!m || +m[1] < 2 || reduced) return;
  const end = +m[1], t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / 1400), e = 1 - (1 - p) ** 3;
    el.textContent = Math.round(end * e) + m[2];
    if (p < 1) requestAnimationFrame(step);
  };
  el.textContent = `0${m[2]}`;
  requestAnimationFrame(step);
}
function reveal() {
  const vh = innerHeight;
  // Сначала все измерения, потом все записи: так браузер пересчитывает вёрстку один раз за кадр, а не на каждом элементе.
  const pr = pending.map((el) => (el.isConnected ? el.getBoundingClientRect() : null));
  const sr = spEls.map((el) => el.getBoundingClientRect());
  const xr = isLite() ? [] : pxEls.map((el) => el.parentElement.getBoundingClientRect());
  const mr = motions.map((el) => el.getBoundingClientRect());

  if (pending.length) pending = pending.filter((el, i) => {
    const r = pr[i];
    if (!r) return false;
    if (!r.width && !r.height) return true; // раздел сейчас скрыт
    if (r.top > vh * 0.94 || r.bottom < 0) return true;
    el.classList.add('in');
    if (el.classList.contains('rv')) setTimeout(() => el.classList.remove('rv', 'in'), 1700);
    const num = el.querySelector('[data-n]');
    if (num) countUp(num);
    return false;
  });
  // Прогресс прокрутки для блоков с data-sp: значение 0…1 уходит в CSS-переменную --p, всю анимацию считает CSS.
  // pin — закреплённая сцена (доля пройденной дорожки), top — от верха блока до его ухода, по умолчанию — проход через экран.
  spEls.forEach((el, i) => {
    const r = sr[i];
    if (!r.height || r.bottom < -300 || r.top > vh + 300) return;
    const mode = el.dataset.sp;
    const raw = mode === 'pin' ? -r.top / Math.max(1, r.height - vh) : mode === 'top' ? -r.top / r.height : (vh - r.top) / (vh + r.height);
    const p = Math.max(0, Math.min(1, raw)).toFixed(3);
    if (el._p === p) return;
    el._p = p;
    // В Chrome и Edge «влёт» и цитату ведёт сам браузер (animation-timeline в css/fx.css) — переменная там не нужна,
    // а её запись заставляла пересчитывать стили всей сцены в каждом кадре.
    if (!(SDA && (mode === 'pin' || el.classList.contains('d-quote')))) el.style.setProperty('--p', p);
    if (mode === 'pin') {
      el.classList.toggle('past', p > 0.14);
      // невидимые слои сцены выключаются совсем (с запасом до момента, когда они начинают проявляться)
      el.classList.toggle('s1off', p > 0.45);
      el.classList.toggle('s2off', p < 0.23);
      el.classList.toggle('c2off', p < 0.46);
      el.classList.toggle('early', p < 0.54);
      const num = el.querySelector('[data-zm-num]');
      if (num) { const txt = countPrice(num.dataset.zmNum, Math.max(0, Math.min(1, (p - 0.72) / 0.2))); if (num.textContent !== txt) num.textContent = txt; }
    }
  });
  xr.forEach((r, i) => {
    if (r.bottom < 0 || r.top > vh || !r.height) return;
    pxEls[i].style.setProperty('--py', `${((r.top + r.height / 2 - vh / 2) * -pxEls[i].dataset.px).toFixed(1)}px`);
  });
  let changed = false;
  motions.forEach((m, i) => {
    const on = mr[i].height > 0 && mr[i].top < vh && mr[i].bottom > 0;
    if (on === m.classList.contains('play')) return;
    m.classList.toggle('play', on);
    changed = true;
  });
  if (changed) adoptSoon();
}

// ---------- переходы ----------
function routeKey() {
  const m = location.hash.match(/^#\/(w\/)?(\w+)/);
  if (!m) return null;
  if (m[1]) return WORKS.includes(m[2]) ? `w:${m[2]}` : null;
  return DEMOS[m[2]] ? m[2] : null;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function apply(key) {
  hush(4500); // страница собирается заново — пропуски кадров в эти секунды не признак перегрузки
  if (!current) homeY = scrollY;
  extraAdds = 0;
  if (!key) { rail?.destroy(); rail = null; stopPlay?.(); stopPlay = null; }
  current = key; preview = null;
  const d = key && !isWork(key) ? DEMOS[key] : null;
  site.hidden = !!key; page.hidden = !key;
  if (key) renderPage(key);
  else { page.innerHTML = ''; site.querySelectorAll('.is-on').forEach((r) => r.classList.remove('is-on')); }
  document.body.style.backgroundColor = d ? d.bg : '#000';
  $('meta[name=theme-color]').content = d ? d.bg : '#000000';
  scrollTo({ top: key ? 0 : homeY, behavior: 'instant' });
  fx.morph(key ? key.replace('w:', '') : 'spectre');
  if (d) fx.palette(...d.dots, d.add, true); else fx.palette(...BLUE, true, true);
  setTitle(); layout(true);
  adoptSoon();
}

async function go(key) {
  if (busy || key === current) return;
  busy = true;
  hush(6000);
  const d = key && !isWork(key) ? DEMOS[key] : null;
  if (d) loadFonts(key);
  if (reduced) { apply(key); busy = false; return; }
  const x = lastPt ? lastPt[0] : innerWidth / 2, y = lastPt ? lastPt[1] : innerHeight / 2;
  lastPt = null;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
  veil.style.background = d ? d.bg : (isWork(key) || isWork(current)) ? BLUE[0] : '#000';
  veil.hidden = false;
  fx.burst(1);
  await veil.animate(
    [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${r}px at ${x}px ${y}px)` }],
    { duration: 620, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' },
  ).finished;
  apply(key);
  fx.burst(1, true);
  // У демо-сайтов частицы работают заставкой: собираются в символ бизнеса поверх цветного фона и уступают место сайту.
  if (d) { intro = true; glCanvas.style.zIndex = 51; layout(true); }
  await Promise.race([document.fonts.ready, wait(500)]);
  await wait(60);
  fx.burst(0);
  if (d) { await wait(1150); intro = false; layout(); }
  await veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: 'ease-out', fill: 'forwards' }).finished;
  veil.hidden = true;
  veil.getAnimations().forEach((a) => a.cancel());
  glCanvas.style.zIndex = '';
  busy = false;
  if (routeKey() !== current) go(routeKey());
}

// ---------- позиция объекта и полоса прогресса ----------
const prog = document.createElement('div');
prog.className = 'prog'; document.body.appendChild(prog);
const clamp = (v) => Math.max(0, Math.min(1, v));
let docH = 0, layoutN = 0;
function layout(instant) {
  const vh = innerHeight, mobile = innerWidth < 860, y = scrollY;
  const ms = innerWidth / vh < 0.75 ? 1.25 : 0.6; // размер объекта на узких экранах
  // высоту страницы перемеряем изредка: каждый такой замер заставляет браузер пересчитывать вёрстку
  if (instant || !docH || layoutN++ % 40 === 0) docH = document.documentElement.scrollHeight;
  if (layoutN % 30 === 0) regroupSoon(); // при прокрутке на экран выходят другие анимации — группы для метронома пересобираются
  const sec = current ? null : $('.concepts', site);
  const secR = sec ? sec.getBoundingClientRect() : null;
  reveal();
  prog.style.transform = `scaleX(${clamp(y / Math.max(1, docH - vh))})`;
  rail?.wake();
  if (current && !isWork(current)) {
    fx.alpha(intro ? 1 : 0);
    fx.place(0, 0, mobile ? ms : 0.9, instant);
    return;
  }
  if (current) {
    fx.alpha(clamp(1 - y / (vh * 0.75)) * (mobile ? 0.9 : 1));
    if (mobile) fx.place(0, 0.44, ms, instant); else fx.place(0.46, 0.02, 0.95, instant);
    return;
  }
  let a = clamp(1 - y / (vh * 0.8));
  if (secR) {
    const vis = clamp(((Math.min(secR.bottom, vh) - Math.max(secR.top, 0)) / vh) * 1.7 - 0.35);
    a = Math.max(a, vis * (mobile ? 0.5 : 1));
  }
  fx.alpha(a);
  if (mobile) fx.place(0, y < vh * 0.5 ? 0.42 : 0.5, ms, instant); else fx.place(0.54, 0, 0.95, instant);
}

let ticking = false;
const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; layout(); }); } };
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll, { passive: true });

// ---------- события ----------
document.addEventListener('click', (e) => {
  const lb = e.target.closest('[data-lang]');
  if (lb) { setLang(lb.dataset.lang); return; }
  // примерка названия и заявка на главной
  if (e.target.closest('[data-name-x]')) {
    own = '';
    const inp = $('[data-name]', site);
    if (inp) { inp.value = ''; inp.focus(); }
    saveName(); applyName();
    return;
  }
  const bc = e.target.closest('.bf-chip');
  if (bc) { pickBrief(bc); return; }
  // «живые» кнопки демо-сайтов: корзина, выбор времени, отправка формы
  const add = e.target.closest('[data-add]');
  if (add) {
    add.closest('.d-item, .lkc-info, .pan-it, .hl-row, .deck-card').classList.toggle('is-on');
    updateCount();
    return;
  }
  const lg = e.target.closest('[data-look-go]');
  if (lg) { lg.closest('[data-look]')._go(+lg.dataset.lookGo); return; }
  const li = e.target.closest('[data-look-i]');
  if (li) { const el = li.closest('[data-look]'); if (Date.now() - (el._swiped || 0) > 300) el._set(+li.dataset.lookI); return; }
  const chip = e.target.closest('[data-chip]');
  if (chip) {
    chip.parentElement.querySelectorAll('[data-chip]').forEach((c) => c.setAttribute('aria-pressed', c === chip));
    return;
  }
  const sub = e.target.closest('[data-submit]');
  if (sub) {
    const toast = $('.d-toast', page);
    sub.classList.add('ok'); toast.classList.add('on');
    clearTimeout(sub._t);
    sub._t = setTimeout(() => { sub.classList.remove('ok'); toast.classList.remove('on'); }, 3200);
    return;
  }
  const to = e.target.closest('[data-to]');
  if (to) {
    e.preventDefault();
    document.getElementById(to.dataset.to)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    return;
  }
  const a = e.target.closest('a[href^="#/"]');
  if (a) lastPt = [e.clientX || innerWidth / 2, e.clientY || innerHeight / 2];
});
addEventListener('hashchange', () => go(routeKey()));
// выделение текста отключено везде, кроме полей ввода
document.addEventListener('selectstart', (e) => { const el = e.target.nodeType === 1 ? e.target : e.target.parentElement; if (!el || !el.closest('input, textarea')) e.preventDefault(); });
document.addEventListener('input', (e) => {
  const inp = e.target.closest?.('[data-name]');
  if (!inp) return;
  own = inp.value.replace(/\s+/g, ' ').slice(0, 24);
  saveName(); applyName();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest?.('[data-name]')) e.target.blur(); });
document.addEventListener('dragstart', (e) => e.preventDefault());

// наклон карточек, подсветка и «магнитные» кнопки — один обработчик на документ
if (!touch && !reduced) {
  let magEl = null;
  document.addEventListener('pointermove', perFrame((e) => {
    if (e.pointerType !== 'mouse' || !e.target.closest || isLite()) return;
    const card = e.target.closest('.s-card');
    if (card) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    }
    const b = e.target.closest('.btn, .c-go, .s-go, .w-x, .d-btn, .lkc-nav button');
    if (magEl && magEl !== b) magEl.style.removeProperty('translate');
    magEl = b;
    if (b) {
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.16}px ${(e.clientY - r.top - r.height / 2) * 0.28}px`;
    }
  }), { passive: true });

  // кольцо-курсор
  const el = document.createElement('div');
  el.className = 'cur'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<span></span>';
  document.body.appendChild(el);
  let x = 0, y = 0, tx = 0, ty = 0, run = false, seen = false;
  const loop = () => {
    x += (tx - x) * 0.22; y += (ty - y) * 0.22;
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) > 0.2) requestAnimationFrame(loop); else run = false;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY;
    if (!seen) { seen = true; x = tx; y = ty; }
    el.classList.add('on');
    el.classList.toggle('is-link', !!e.target.closest?.('a, button'));
    if (!run) { run = true; requestAnimationFrame(loop); }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('on'));
}

// ---------- диагностика: откройте сайт с ?debug в адресе ----------
if (/[?&]debug\b/.test(location.search)) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.88);color:#7dffb0;font:12px/1.45 monospace;white-space:pre;pointer-events:none';
  document.body.appendChild(box);
  let n = 0, t0 = performance.now(), worst = 0, prev = t0;
  const tick = (now) => {
    n++; worst = Math.max(worst, now - prev); prev = now;
    if (now - t0 >= 1000) {
      const i = spectre?.info() || {};
      const c = clockInfo();
      box.textContent = `кадров в секунду: ${Math.round((n * 1000) / (now - t0))}\nхудший кадр: ${Math.round(worst)} мс\nчастицы: ${i.mode || 'нет'} ${i.count || ''}\nрежим: ${isLite() ? 'облегчённый' : 'полный'}\nвидеокарта: ${i.gpu || 'WebGL недоступен'}\nэкран: ${innerWidth}×${innerHeight} @${devicePixelRatio}\nфон обновляется: ${c.div > 1 ? `в каждом ${c.div}-м кадре` : 'в каждом кадре'}, CSS-анимаций под управлением: ${c.css}, групп: ${c.groups}`;
      n = 0; t0 = now; worst = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- старт ----------
(async () => {
  hush(5000);
  await setLang(pickLang());
  const key = routeKey();
  if (key) { if (!isWork(key)) loadFonts(key); apply(key); homeY = 0; }
  else layout(true);
  fx.burst(1, true);
  document.body.classList.add('ready');
  requestAnimationFrame(() => fx.burst(0));
  setTimeout(loadAllFonts, 1200); // шрифты концептов нужны строкам списка
})();
