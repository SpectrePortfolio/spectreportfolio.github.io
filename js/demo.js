// Шаблон полноценного демо-лендинга: первый экран, бегущая строка, «о нас», каталог с кнопками,
// галерея, форма брони/заказа и подвал. Характер задают data-b и css/demos.css.
// У каждого сайта своя фирменная механика:
//   магазин — рейл с одеждой (js/rail.js) и карусель образов; ресторан — круг из тарелок вокруг описания блюда;
//   кофейня — стикеры, которые можно таскать; стоматология — «до/после»; фитнес — раздвигающиеся панели и пульс;
//   недвижимость — слайд-шоу и список объектов с большим превью.
import { DEMOS, ORDER, photo } from './demos.js';
import { mark, seal } from './works.js';
import { railHTML } from './rail.js';

const ico = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICO = {
  bag: ico('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  cal: ico('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4"/>'),
  heart: ico('<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.600A4 4 0 0 1 19 10c0 5.500-7 10-7 10z"/>'),
  clock: ico('<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>'),
  people: ico('<circle cx="9" cy="8.500" r="3.200"/><path d="M3 19.500c.400-3.400 2.700-5.200 6-5.200s5.600 1.800 6 5.200M16 5.600a3.200 3.200 0 0 1 0 5.800M17.500 14.600c2 .600 3.200 2.200 3.500 4.900"/>'),
  tag: ico('<path d="M3.500 12.500V4.500h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.400"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  check: ico('<path d="m5 12.500 4.500 4.500L19 7.500"/>'),
  arrow: ico('<path d="M7 17 17 7M8 7h9v9"/>'),
  left: ico('<path d="m14 6-6 6 6 6"/>'),
  right: ico('<path d="m10 6 6 6-6 6"/>'),
  sides: ico('<path d="m9 7-5 5 5 5M15 7l5 5-5 5"/>'),
  close: ico('<path d="M6 6l12 12M18 6 6 18"/>'),
};

const pic = (id, w, sizes, alt, extra = '') =>
  `<img src="${photo(id, w)}" srcset="${photo(id, w / 2)} ${w / 2}w, ${photo(id, w)} ${w}w" sizes="${sizes}" alt="${alt}" decoding="async" ${extra}>`;
const price = (p) => (/^[\d.,]+$/.test(p) ? `${p} €` : p);
const pad2 = (n) => String(n).padStart(2, '0');
const PULSE = 'M0 60h180l20-40 30 90 34-110 30 100 22-40h180l20-40 30 90 34-110 30 100 22-40h180l20-40 30 90 34-110 30 100 22-40h252';
const ITEM_SIZES = '(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 25vw';

export function demoHTML(id, L, { words, btn, TG }) {
  const d = DEMOS[id], t = L.demos[id], m = L.more[id], k = L.dock;
  const type = L.concepts.items[id].type;
  const lock = `${mark(id)}<span class="wm">${d.name}</span>`;
  const full = d.hero === 'full';
  const heroSizes = full ? '100vw' : '(max-width: 860px) 100vw, 50vw';
  const tick = [...t.nav, d.name, type, t.note];
  const addBtn = `<button class="d-add" type="button" data-add><span class="d-add-a">${m.act}</span><span class="d-add-b">${m.done}</span><i>${ICO.plus}${ICO.check}</i></button>`;
  const foot = (it) => `<div class="d-item-foot"><span class="d-price">${price(it.p)}</span>${addBtn}</div>`;
  const info = (it, n) => `<article class="lkc-info"><span class="lkc-num">${pad2(n + 1)} / ${pad2(t.items.length)}</span><h3>${it.n}</h3><p>${it.d}</p>${foot(it)}</article>`;
  const navBtns = `<div class="lkc-nav"><button type="button" data-look-go="-1" aria-label="${k.prev}">${ICO.left}</button><button type="button" data-look-go="1" aria-label="${k.next}">${ICO.right}</button><div class="lkc-prog"><i></i></div></div>`;

  // ---------- первый экран ----------
  const copy = `<div class="d-hero-copy">
      <p class="d-eyebrow"><i></i>${t.note}</p>
      <h1 class="rvw">${words(t.title)}</h1>
      <p class="d-sub">${t.sub}</p>
      <div class="d-actions">
        <a class="d-btn" href="#/${id}" data-to="d-book"><span>${t.cta}</span>${ICO.arrow}</a>
        <a class="d-link" href="#/${id}" data-to="d-list">${t.listTitle}</a>
      </div>
    </div>`;
  const float = `<a class="d-float" href="#/${id}" data-to="d-list">
      ${pic(d.img[2], 800, '64px', t.items[0].n)}
      <span><b>${t.items[0].n}</b><em>${price(t.items[0].p)}</em></span>
      <i>${ICO.plus}</i>
    </a>`;
  let hero, heroSection = null;
  if (d.hero === 'rail') {
    hero = `<div class="d-hero-copy"><p class="d-eyebrow"><i></i>${t.note}</p><h1 class="rvw">${words(t.title)}</h1></div>${railHTML(id, L, ICO)}`;
  } else if (d.hero === 'float') {
    // парящий стакан и зёрна: слои с разной глубиной идут за курсором и разлетаются при прокрутке.
    // Тени и размытие запечены в картинки (*-s.webp, bean*-b1/-b2.webp) с прозрачными полями — размеры учтены в css/fx.css.
    const beans = [[9, 30, .5, 14, -20, 1], [20, 72, .9, 34, 35, 0], [31, 16, .42, 10, 60, 1], [70, 14, .6, 18, -40, 0], [84, 34, .46, 12, 15, 1], [90, 70, 1.1, 44, -10, 2], [62, 82, .5, 16, 80, 0], [38, 84, .7, 26, -55, 0], [4, 56, 1.25, 52, 25, 2]];
    const obj = (cls, src, x, y, s, dep, r, extra = '') => `<img class="fl-o ${cls}" src="img/cut/${src}.webp" alt="" draggable="false" style="--x:${x}%;--y:${y}%;--s:${s};--d:${dep};--r:${r}deg" ${extra}>`;
    hero = `<div class="d-hero-copy fl-copy"><p class="d-eyebrow"><i></i>${t.note}</p><h1 class="rvw">${words(t.title)}</h1></div>
    <div class="fl-scene" aria-hidden="true">
      <span class="fl-glow"></span>
      ${beans.map(([x, y, sc, dep, r, blur], i) => obj(`fl-bean${blur ? ` fl-blur${blur}` : ''}`, `bean${i % 6}${blur ? `-b${blur}` : ''}`, x, y, sc, dep, r)).join('')}
      ${obj('fl-croissant', 'croissant-s', 15, 44, 1, 26, -14)}
      ${obj('fl-glass', 'glass-s', 82, 52, 1, 30, 9)}
      <div class="fl-o fl-cup" style="--x:50%;--y:60%;--s:1;--d:20;--r:0deg"><img src="img/cut/cup-s.webp" alt="" draggable="false" fetchpriority="high"><span class="fl-cup-mk">${mark(id)}</span></div>
    </div>
    <a class="fl-tag" href="#/${id}" data-to="d-list"><i></i><b>${t.items[0].n}</b><em>${price(t.items[0].p)}</em></a>
    <div class="fl-foot"><p class="d-sub">${t.sub}</p><div class="d-actions"><a class="d-btn" href="#/${id}" data-to="d-book"><span>${t.cta}</span>${ICO.arrow}</a><a class="d-link" href="#/${id}" data-to="d-list">${t.listTitle}</a></div></div>`;
  } else if (d.hero === 'zoom') {
    // первый экран закреплён: при прокрутке камера «влетает» в дом и оказывается в гостиной
    const it = t.items[0], hot = it.d.split(', ');
    heroSection = `<section class="zm" id="d-top" data-sp="pin" data-live>
    <div class="zm-stage">
      <div class="zm-s zm-s1">${pic(d.img[0], 1800, '100vw', d.name, 'fetchpriority="high"')}</div>
      <div class="zm-s zm-s2">${pic(d.img[1], 1400, '100vw', it.n)}</div>
      ${copy.replace('d-hero-copy', 'd-hero-copy zm-copy1')}
      <div class="zm-copy2"><span>${it.n}</span><p>${m.about.d}</p></div>
      ${hot.slice(0, 3).map((txt, i) => `<span class="zm-hot zm-hot${i + 1}" style="--i:${i}"><i></i>${txt.charAt(0).toUpperCase() + txt.slice(1)}</span>`).join('')}
      <div class="zm-card zm-price"><span>${it.n}</span><b data-zm-num="${it.p}">${it.p}</b><em>${it.tag}</em>
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50C30 46 44 30 70 34s40 6 62-10 44-14 68-20" /></svg></div>
      <div class="zm-card zm-list">${t.items.map((x, n) => `<div class="zm-li"><span>${pad2(n + 1)}</span><b>${x.n}</b><em>${x.tag}</em></div>`).join('')}</div>
      <div class="zm-bar"><i></i></div>
    </div>
  </section>`;
  } else {
    hero = `<div class="d-hero-media">${pic(d.img[0], 1800, heroSizes, d.name, 'fetchpriority="high" data-px=".06"')}</div>${copy}${float}`;
  }
  if (id === 'fitness') hero += `<div class="d-timer" aria-hidden="true"><i></i><b data-timer="2700">45:00</b><span>${m.stats[1]}</span></div>`;
  if (id === 'dental') {
    hero += `<div class="d-glass d-glass-a"><b>${d.stats[2]}</b><span>${m.stats[2]}</span></div>
    <div class="d-glass d-glass-b">${ICO.clock}<div>${d.opts[1][1].map((v, i) => `<em class="${i === 1 ? 'on' : ''}">${v}</em>`).join('')}</div></div>`;
  }

  // ---------- каталог ----------
  let catalog;
  if (id === 'shop') {
    catalog = `<div class="lkc" data-look>
      <div class="lkc-stage">${t.items.map((it, n) => `<button class="lkc-it" type="button" data-look-i="${n}" aria-label="${it.n}">${pic(d.img[2 + n], 800, '(max-width: 860px) 60vw, 30vw', it.n, 'loading="lazy"')}</button>`).join('')}</div>
      <div class="lkc-side">${t.items.map(info).join('')}${navBtns}</div>
    </div>`;
  } else if (id === 'restaurant') {
    // круг из тарелок: активное блюдо наверху, его описание в центре
    catalog = `<div class="orb" data-look="orbit" data-live>
      <div class="orb-ring">${[0, 1, 2, 3, 0, 1, 2, 3].map((n, i) => `<button class="lkc-it orb-it" type="button" data-look-i="${i}" style="--n:${i}" aria-label="${t.items[n].n}">${pic(d.img[2 + n], 800, '(max-width: 860px) 26vw, 200px', t.items[n].n, 'loading="lazy"')}</button>`).join('')}</div>
      <div class="lkc-side orb-center">${t.items.map(info).join('')}${navBtns}</div>
    </div>`;
  } else if (id === 'fitness') {
    catalog = `<div class="pan">${t.items.map((it, n) => `<article class="pan-it${n ? '' : ' on'}" data-pan>
        ${pic(d.img[2 + n], 800, '(max-width: 860px) 100vw, 40vw', it.n, 'loading="lazy"')}
        <span class="d-tag">${it.tag}</span>
        <div class="pan-in"><h3>${it.n}</h3><div class="pan-more"><div><p>${it.d}</p>${foot(it)}</div></div></div>
      </article>`).join('')}</div>`;
  } else if (id === 'realty') {
    catalog = `<div class="hl" data-hl>
      <div class="hl-list">${t.items.map((it, n) => `<article class="hl-row${n ? '' : ' on'}" data-hl-i="${n}">
        <span class="hl-n">${pad2(n + 1)}</span>
        <div class="hl-main"><h3>${it.n}</h3><p>${it.d}</p></div>
        <span class="hl-tag">${it.tag}</span>
        <div class="hl-buy"><span class="d-price">${it.p}</span>${addBtn}</div>
      </article>`).join('')}</div>
      <div class="hl-view">${t.items.map((it, n) => `<figure class="hl-img${n ? '' : ' on'}">${pic(d.img[2 + n], 800, '(max-width: 860px) 100vw, 45vw', it.n, 'loading="lazy"')}<figcaption>${it.tag}</figcaption></figure>`).join('')}</div>
    </div>`;
  } else {
    catalog = `<div class="d-items">${t.items.map((it, n) => `<article class="d-item rv" style="--i:${n}">
        <div class="d-item-media">${pic(d.img[2 + n], 800, ITEM_SIZES, it.n, 'loading="lazy"')}${it.tag ? `<span class="d-tag">${it.tag}</span>` : ''}</div>
        <div class="d-item-body"><h3>${it.n}</h3><p>${it.d}</p></div>
        ${foot(it)}
      </article>`).join('')}</div>`;
  }

  const pulse = id === 'fitness' ? `<div class="d-pulse" data-live aria-hidden="true"><svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path pathLength="1" d="${PULSE}"/><path class="d-pulse-dot" pathLength="1" d="${PULSE}"/></svg></div>` : '';
  const beforeAfter = id === 'dental' ? `<section class="d-ba-sec">
      <div class="d-ba-copy"><h2 class="rvw">${words(t.items[3].n)}</h2><p class="rv">${t.items[3].d}</p><span class="d-ba-hint rv">${ICO.sides}${t.items[3].tag}</span></div>
      <div class="d-ba" data-ba data-live>
        ${pic(d.img[5], 800, '(max-width: 860px) 100vw, 50vw', t.items[3].n, 'loading="lazy"')}
        <div class="d-ba-b">${pic(d.img[5], 800, '(max-width: 860px) 100vw, 50vw', '', 'loading="lazy"')}</div>
        <i class="d-ba-h">${ICO.sides}</i>
      </div>
    </section>` : '';

  return `
<div class="d d-${id} d-h-${d.hero}" data-b="${id}">
  <header class="d-nav">
    <a class="d-logo lk" href="#/${id}" data-to="d-top">${lock}</a>
    <nav>
      <a href="#/${id}" data-to="d-list">${t.nav[0]}</a>
      <a href="#/${id}" data-to="d-about">${t.nav[1]}</a>
      <a href="#/${id}" data-to="d-book">${t.nav[2]}</a>
    </nav>
    <div class="d-nav-r">
      <button class="d-cnt" type="button" data-to="d-book" aria-label="${m.done}">${ICO[d.counter]}<b>0</b></button>
      <a class="d-btn d-btn-sm" href="#/${id}" data-to="d-book">${t.cta}</a>
    </div>
  </header>

  ${heroSection || `<section class="d-hero" id="d-top" data-live${d.hero === 'float' ? ' data-par data-sp="top"' : id === 'dental' ? ' data-par' : ''}>${hero}</section>`}

  <div class="d-ticker" data-live aria-hidden="true"><div>${[0, 1].map(() => tick.map((w) => `<span>${w}</span>`).join('')).join('')}</div></div>
  ${pulse}

  <section class="d-about" id="d-about">
    <div class="d-about-media rvi">${pic(d.img[1], 1400, '(max-width: 860px) 100vw, 50vw', m.about.t, 'loading="lazy" data-px=".05"')}</div>
    <div class="d-about-copy">
      <h2 class="rvw">${words(m.about.t)}</h2>
      <p class="rv">${m.about.d}</p>
      <dl class="d-stats">${d.stats.map((n, i) => `<div class="rv" style="--i:${i}"><dt data-n>${n}</dt><dd>${m.stats[i]}</dd></div>`).join('')}</dl>
    </div>
  </section>

  <section class="d-list" id="d-list">
    <div class="d-head"><h2 class="rvw">${words(t.listTitle)}</h2><a class="d-link" href="#/${id}" data-to="d-book">${t.cta}</a></div>
    ${catalog}
  </section>
  ${beforeAfter}

  <section class="d-gallery">
    <p class="d-quote" data-sp style="--n:${t.strip.split(' ').length}">${words(t.strip)}</p>
    <div class="d-mosaic">
      ${[6, 7, 8].map((n, i) => `<figure class="g${i + 1} rvi" style="--i:${i}">${pic(d.img[n], i ? 1000 : 1400, '(max-width: 860px) 100vw, 55vw', d.name, `loading="lazy"${i ? '' : ' data-px=".05"'}`)}</figure>`).join('')}
    </div>
  </section>

  <section class="d-book" id="d-book">
    <div class="d-book-copy">
      <h2 class="rvw">${words(m.book.t)}</h2>
      <p class="rv">${m.book.d}</p>
    </div>
    <div class="d-form rv">
      ${d.opts.map(([ic, vals]) => `<div class="d-row"><span class="d-row-ico">${ICO[ic]}</span><div class="d-chips">${vals.map((v, i) => `<button class="d-chip" type="button" data-chip aria-pressed="${i === 1}">${v}</button>`).join('')}</div></div>`).join('')}
      <button class="d-btn d-submit" type="button" data-submit><span>${m.book.go}</span>${ICO.arrow}${ICO.check}</button>
      <p class="d-form-note">${t.note}</p>
    </div>
  </section>

  <footer class="d-foot">
    <span class="lk d-foot-logo">${lock}</span>
    <nav>
      <a href="#/${id}" data-to="d-list">${t.nav[0]}</a>
      <a href="#/${id}" data-to="d-about">${t.nav[1]}</a>
      <a href="#/${id}" data-to="d-book">${t.nav[2]}</a>
    </nav>
    <p>© ${new Date().getFullYear()} ${d.name}. ${type}.</p>
  </footer>

  <section class="d-end rv" id="d-end">
    <span class="logo">SPECTRE</span>
    <h2>${k.endTitle.replace('{name}', d.name)}</h2>
    <p>${k.endSub}</p>
    <div class="actions">
      ${btn(k.endCta, TG)}
      <a class="link" href="#/">${k.other}</a>
    </div>
  </section>
</div>
<div class="d-toast" role="status" aria-live="polite">${k.toast}</div>`;
}

export const demoNeighbours = (id) => {
  const i = ORDER.indexOf(id);
  return [ORDER[(i + ORDER.length - 1) % ORDER.length], ORDER[(i + 1) % ORDER.length]];
};
