// Портфолио по направлениям: айдентика, интерфейсы, моушн, соцсети, печать.
// Каждый кейс — живая сцена для одного из шести вымышленных брендов: настоящие фото, тексты бренда, зацикленная анимация.
// Все размеры внутри сцены заданы в em от ширины сцены, поэтому кейс одинаково выглядит на любом экране.
import { DEMOS, CASES, photo } from './demos.js';

export const WORKS = ['identity', 'ui', 'motion', 'social', 'print'];
export const SERVICE_INDEX = { identity: 1, ui: 2, motion: 3, social: 4, print: 5 };

const TOOTH = 'M128 72C108 52 62 52 58 96C55 130 72 150 78 180C82 204 86 226 98 226C112 226 108 176 128 176C148 176 144 226 158 226C170 226 174 204 178 180C184 150 201 130 198 96C194 52 148 52 128 72Z';
const MARKS = {
  restaurant: '<path d="M22 6A18 18 0 1 0 40 24 13 13 0 0 1 22 6z"/><circle cx="34" cy="12" r="3" fill="var(--m2)"/>',
  coffee: '<circle cx="17" cy="24" r="12"/><circle cx="31" cy="24" r="10" fill="none" stroke="var(--m2)" stroke-width="4"/>',
  dental: `<path transform="translate(-2.5 -5) scale(.207)" d="${TOOTH}"/><path d="M40 3l1.7 4.3L46 9l-4.3 1.7L40 15l-1.7-4.3L34 9l4.3-1.7z" fill="var(--m2)"/>`,
  shop: '<rect x="9" y="7" width="10" height="34"/><rect x="22" y="7" width="18" height="10"/><circle cx="28" cy="27" r="6" fill="var(--m2)"/>',
  fitness: '<path d="M15 7h11L15 41H4z"/><path d="M30 7h9L28 41h-9z" opacity=".65"/><path d="M43 7h4L36 41h-4z" fill="var(--m2)"/>',
  realty: '<path fill-rule="evenodd" d="M8 40V22a16 16 0 0 1 32 0v18zM17 40V23a7 7 0 0 1 14 0v17z"/><rect x="5" y="41.5" width="38" height="3" rx="1.5" fill="var(--m2)"/>',
  beauty: '<path d="M24 5c9 8 11 21 0 38C13 26 15 13 24 5z"/><path d="M7 21c9-1 15 5 16 21C12 38 6 31 7 21z" opacity=".55"/><circle cx="37" cy="14" r="3.6" fill="var(--m2)"/>',
  auto: '<path fill-rule="evenodd" d="M24 5a19 19 0 1 0 0 38 19 19 0 0 0 0-38zm0 8a11 11 0 1 1 0 22 11 11 0 0 1 0-22z"/><path d="M21.500 26.500 38 9l-9.500 20z" fill="var(--m2)"/>',
  school: '<path d="M22 4c1.700 12 5.400 15.700 17 18-11.600 2.300-15.300 6-17 18-1.700-12-5.400-15.700-17-18 11.600-2.300 15.300-6 17-18z"/><circle cx="39" cy="38" r="4.500" fill="var(--m2)"/>',
  hotel: '<path d="M9 26a15 15 0 0 1 30 0z"/><path d="M4 33c5-3.500 9 3.500 14 0s9-3.500 14 0 8 3 12 0v5c-4 3-8 3-12 0s-9-3.500-14 0-9 3.500-14 0z" fill="var(--m2)"/>',
};

export const mark = (id) => `<svg class="mk" viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">${MARKS[id]}</svg>`;
const wm = (id) => `<span class="wm">${DEMOS[id].name}</span>`;
const lockup = (id) => `<span class="lk">${mark(id)}${wm(id)}</span>`;

// Круглая печать с бегущим по кругу текстом — её же используют демо-сайты.
export function seal(id, text) {
  const line = `${text} • `.repeat(3);
  return `<svg class="seal" viewBox="0 0 100 100" aria-hidden="true">
    <defs><path id="seal-${id}" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0"/></defs>
    <circle class="seal-bg" cx="50" cy="50" r="50"/>
    <g class="seal-spin"><text><textPath href="#seal-${id}" textLength="230" lengthAdjust="spacing">${line}</textPath></text></g>
    <g class="seal-mk" transform="translate(33 33) scale(.71)" fill="currentColor">${MARKS[id]}</g>
  </svg>`;
}

const SMALL = [900, 700, 400, 400, 400, 400, 700, 500, 500];
const im = (id, n, big) => `<img src="${photo(DEMOS[id].img[n], SMALL[n] * (big ? 2 : 1))}" alt="" loading="lazy" decoding="async">`;
const price = (p) => (/^[\d.,]+$/.test(p) ? `${p} €` : p);
const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CHECK = ic('<path d="m5 12.5 4.500 4.500L19 7.500"/>');
const HEART = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.500s-7.500-4.700-7.500-10.300A4.200 4.200 0 0 1 12 7.600a4.200 4.200 0 0 1 7.500 2.600c0 5.600-7.500 10.300-7.500 10.300z"/></svg>';
const PLUS = ic('<path d="M12 5v14M5 12h14"/>');
const GRID = ic('<rect x="4" y="4" width="6.500" height="6.500" rx="1"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1"/>');
const PEOPLE = ic('<circle cx="9" cy="8.500" r="3.200"/><path d="M3 19.500c.400-3.400 2.700-5.200 6-5.200s5.600 1.800 6 5.200M16 5.600a3.200 3.200 0 0 1 0 5.800M17.500 14.600c2 .600 3.200 2.200 3.500 4.900"/>');
const BAR = '<div class="ph-bar"><span>9:41</span><i></i></div>';

// ---------- айдентика ----------
function identity(id) {
  const d = DEMOS[id];
  return `<div class="idb">
    <div class="idb-main">${lockup(id)}</div>
    <div class="idb-alt">${mark(id)}</div>
    <div class="idb-photo">${im(id, 1, true)}<span class="lk">${mark(id)}${wm(id)}</span></div>
    <div class="idb-type"><span class="idb-aa">Aa</span><span>${d.fontName}</span></div>
    <div class="idb-pal">${[d.bg, d.ink, d.acc, d.c4].map((c) => `<i style="background:${c}"><em>${c.toUpperCase()}</em></i>`).join('')}</div>
    <div class="idb-pat">${mark(id).repeat(12)}</div>
  </div>`;
}

// ---------- интерфейсы: три экрана одного приложения ----------
function ui(id, t, m) {
  const d = DEMOS[id], it = t.items[0];
  const opts = d.opts[d.opts.length - 1][1].slice(0, 4);
  return `<div class="ux mo">
    <div class="ph ph-l"><div class="sc">
      <div class="pa-img">${im(id, 2, true)}<span class="pa-like">${HEART}</span></div>
      <div class="pa-sheet">
        <i class="pa-grab"></i>
        <h4>${it.n}</h4><p>${it.d}</p>
        <div class="pa-opts">${opts.map((v, i) => `<span class="${i === 1 ? 'on' : ''}">${v}</span>`).join('')}</div>
        <div class="pa-buy"><b>${price(it.p)}</b><span class="ph-cta">${m.act}</span></div>
      </div>
    </div></div>
    <div class="ph ph-c"><div class="sc">
      ${BAR}
      <div class="ph-top">${mark(id)}${wm(id)}<span class="ph-av"></span></div>
      <div class="sc-scroll"><div class="sc-in">
        <h4 class="pb-title">${t.listTitle}</h4>
        <div class="ph-chips">${t.nav.map((n) => `<span>${n}</span>`).join('')}</div>
        <div class="pb-hero">${im(id, 0)}<span>${t.note}</span></div>
        ${t.items.map((x, n) => `<div class="pb-row">${im(id, 2 + n)}<div><b>${x.n}</b><em>${price(x.p)}</em></div><i>${PLUS}</i></div>`).join('')}
      </div></div>
      <div class="ph-tabs"><i class="on"></i><i></i><i></i><i></i></div>
    </div></div>
    <div class="ph ph-r"><div class="sc">
      ${BAR}
      <h4 class="pc-title">${m.book.t}</h4>
      ${d.opts.slice(0, 2).map(([, vals]) => `<div class="pc-row">${vals.slice(0, 4).map((v, i) => `<span class="${i === 1 ? 'on' : ''}">${v}</span>`).join('')}</div>`).join('')}
      <div class="pc-sum">${im(id, 2)}<div><b>${it.n}</b><em>${price(it.p)}</em></div></div>
      <span class="ph-cta pc-cta">${m.book.go}</span>
      <div class="pc-ok"><i>${CHECK}</i><b>${m.done}</b></div>
    </div></div>
    <div class="ux-toast"><i>${CHECK}</i><span>${m.done}</span></div>
  </div>`;
}

// ---------- моушн: рекламный ролик из трёх сцен ----------
function motion(id, t, m, type) {
  const d = DEMOS[id], it = t.items[0];
  const letters = [...d.name].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('');
  const kin = t.strip.split(' ').map((w, i) => `<span><i style="--i:${i}">${w}</i></span>`).join(' ');
  return `<div class="mv mo">
    <div class="mv-s mv-1"><div class="mv-logo">${mark(id)}<span class="wm">${letters}</span></div><p class="mv-tag">${type}</p></div>
    <div class="mv-s mv-2">${im(id, 0, true)}<p class="mv-kin">${kin}</p><span class="lk mv-corner">${mark(id)}${wm(id)}</span></div>
    <div class="mv-s mv-3">
      <div class="mv-card">${im(id, 2, true)}</div>
      <div class="mv-offer">${lockup(id)}<h4>${it.n}</h4><b class="mv-price">${price(it.p)}</b><span class="mv-cta">${m.act}</span></div>
    </div>
    <i class="mv-wipe"></i>
    <div class="mv-ui"><span class="mv-play"></span><div class="mv-bar"><i></i></div><span class="mv-time">0:10</span></div>
  </div>`;
}

// ---------- соцсети: сторис и профиль с лентой ----------
function social(id, t, m, type) {
  const d = DEMOS[id], it = t.items[0], handle = `@${d.name.toLowerCase()}`;
  const av = `<span class="so-av">${mark(id)}</span>`;
  return `<div class="sg mo">
    <div class="ph sg-story"><div class="sc">
      <div class="st-slide st-1">${im(id, 0)}<p>${t.title}</p></div>
      <div class="st-slide st-2">${im(id, 2, true)}<p>${it.n}</p><em>${price(it.p)}</em></div>
      <div class="st-slide st-3">${mark(id)}<p>${t.strip}</p></div>
      <div class="st-bars"><i></i><i></i><i></i></div>
      <div class="st-top">${av}<b>${handle}</b></div>
      <span class="st-cta">${t.cta}</span>
    </div></div>
    <div class="sg-prof">
      <div class="sg-top">${av}
        <div class="sg-stats"><div><b>128</b>${GRID}</div><div><b>12.4K</b>${PEOPLE}</div><div><b>4.9K</b>${HEART}</div></div>
      </div>
      <b class="sg-name">${handle}</b>
      <p class="sg-bio">${type}. ${t.note}</p>
      <div class="sg-btns"><span class="on">${m.act}</span><span>${t.nav[2]}</span></div>
      <div class="sg-grid">
        <div class="sg-p">${im(id, 2)}<em>${price(it.p)}</em></div>
        <div class="sg-p sg-acc">${mark(id)}</div>
        <div class="sg-p">${im(id, 6)}</div>
        <div class="sg-p sg-txt"><p>${t.strip}</p></div>
        <div class="sg-p">${im(id, 3)}<i class="sg-like">${HEART}</i></div>
        <div class="sg-p sg-ink">${wm(id)}</div>
      </div>
    </div>
  </div>`;
}

// ---------- печать: афиша, визитки, предмет, печать ----------
const OBJECT = { restaurant: 'menu', coffee: 'cup', dental: 'ticket', shop: 'bag', fitness: 'ticket', realty: 'menu' };
function print(id, t, m, type) {
  const d = DEMOS[id], it = t.items[0];
  const obj = {
    menu: `<div class="pr-menu">${wm(id)}<h4>${t.listTitle}</h4>${t.items.map((x) => `<p><span>${x.n}</span><i></i><b>${x.p}</b></p>`).join('')}<div class="pr-menu-img">${im(id, 3)}</div></div>`,
    cup: `<div class="pr-cup"><i class="lid"></i><div class="body"><span class="sleeve">${mark(id)}</span></div></div>`,
    bag: `<div class="pr-bag"><i class="hd"></i>${lockup(id)}</div>`,
    ticket: `<div class="pr-ticket"><div>${lockup(id)}<b>${it.n}</b></div><div class="stub"><em>${it.tag}</em><span>${it.p}</span></div></div>`,
  }[OBJECT[id]];
  return `<div class="pt" data-live>
    <div class="pt-poster">${im(id, 0)}<div class="pt-poster-in">${lockup(id)}<h4>${t.title}</h4><p>${t.note}</p></div></div>
    <div class="pt-cards">
      <div class="pr-card pr-front">${lockup(id)}</div>
      <div class="pr-card pr-back">${mark(id)}<b>${type}</b><span>${t.note}</span></div>
    </div>
    <div class="pt-obj">${obj}</div>
    <div class="pt-seal">${seal(id, `${d.name} • ${type}`)}</div>
  </div>`;
}

const BUILD = { identity, ui, motion, social, print };

export function worksGrid(work, L) {
  return CASES.map((id, i) => {
    const type = L.concepts.items[id].type;
    return `<article class="cs rv" data-b="${id}">
      <header class="cs-head"><span class="cs-n">${String(i + 1).padStart(2, '0')}</span><span class="lk cs-brand">${mark(id)}${wm(id)}</span><span class="cs-type">${type}</span></header>
      <div class="cs-stage cs-${work}"><div class="sn">${BUILD[work](id, L.demos[id], L.more[id], type)}</div></div>
    </article>`;
  }).join('');
}
