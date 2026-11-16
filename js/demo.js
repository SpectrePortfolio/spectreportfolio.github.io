// Шаблон полноценного демо-лендинга: первый экран, бегущая строка, «о нас», каталог с кнопками,
// галерея, форма брони/заказа и подвал. Характер задают data-b и css/demos.css, порядок разделов — поле flow.
// У каждого сайта своя фирменная механика, которую можно потрогать (подробно — в шапке js/play.js):
//   магазин — рейл с одеждой (js/rail.js); ресторан — круг из тарелок, который крутят рукой; кофейня — предметы,
//   которые можно оттянуть; стоматология — «до/после»; фитнес — ползунок нагрузки и пульс; недвижимость — «влёт» в дом;
//   салон красоты — зеркало-лупа; автосервис — тахометр; онлайн-школа — колода карточек; отель — солнце и время суток.
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
  hand: ico('<path d="M9 11.500V5a1.500 1.500 0 0 1 3 0v5m0-1.500a1.500 1.500 0 0 1 3 0V11m0-.500a1.500 1.500 0 0 1 3 0V15a6 6 0 0 1-6 6h-.700a6 6 0 0 1-4.800-2.400L5 14.600a1.600 1.600 0 0 1 2.500-2L9 14.300"/>'),
};

// Шкала тахометра (автосервис): дуга от −130° до +130°, деления 0…8, красная зона от 6,5.
function tachoSVG() {
  const pt = (a, r) => { const t = (a * Math.PI) / 180; return `${(100 + r * Math.sin(t)).toFixed(1)} ${(100 - r * Math.cos(t)).toFixed(1)}`; };
  const ang = (v) => -130 + (v / 8) * 260;
  const arc = (a0, a1, r) => `M${pt(a0, r)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(a1, r)}`;
  let s = `<path class="tc-arc" d="${arc(-130, ang(6.5), 86)}"/><path class="tc-red" d="${arc(ang(6.5), 130, 86)}"/>`;
  for (let i = 0; i <= 16; i++) {
    const a = ang(i / 2), big = i % 2 === 0, hot = i >= 13 ? ' hot' : '';
    s += `<path class="tk${hot}" d="M${pt(a, 86)}L${pt(a, big ? 72 : 78)}"/>`;
    if (big) { const [x, y] = pt(a, 59).split(' '); s += `<text class="${hot.trim()}" x="${x}" y="${y}">${i / 2}</text>`; }
  }
  return s;
}
// Дуга, по которой ходит солнце (отель): половина синусоиды в рамке 100×100, растягивается под блок.
const SUN_ARC = `M0 100${Array.from({ length: 24 }, (_, i) => `L${(((i + 1) / 24) * 100).toFixed(1)} ${(100 * (1 - Math.sin(((i + 1) / 24) * Math.PI))).toFixed(1)}`).join('')}`;

const pic = (id, w, sizes, alt, extra = '') =>
  `<img src="${photo(id, w)}" srcset="${photo(id, w / 2)} ${w / 2}w, ${photo(id, w)} ${w}w" sizes="${sizes}" alt="${alt}" decoding="async" ${extra}>`;
const price = (p) => (/^[\d.,]+$/.test(p) ? `${p} €` : p);
const pad2 = (n) => String(n).padStart(2, '0');
const PULSE = 'M0 60h180l20-40 30 90 34-110 30 100 22-40h180l20-40 30 90 34-110 30 100 22-40h180l20-40 30 90 34-110 30 100 22-40h252';
const ITEM_SIZES = '(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 25vw';

// name — название, которое посетитель ввёл в «примерке» на главной (уже экранированное); без него берётся название концепта.
export function demoHTML(id, L, { words, btn, TG, name: own, nameLen }) {
  const d = DEMOS[id], t = L.demos[id], m = L.more[id], k = L.dock;
  const name = own || d.name;
  const type = L.concepts.items[id].type;
  const lock = `${mark(id)}<span class="wm">${name}</span>`;
  const full = d.hero === 'full';
  const heroSizes = full ? '100vw' : '(max-width: 860px) 100vw, 50vw';
  const tick = [...t.nav, name, type, t.note];
  const addBtn = `<button class="d-add" type="button" data-add><span class="d-add-a">${m.act}</span><span class="d-add-b">${m.done}</span><i>${ICO.plus}${ICO.check}</i></button>`;
  const foot = (it) => `<div class="d-item-foot"><span class="d-price">${price(it.p)}</span>${addBtn}</div>`;
  const info = (it, n) => `<article class="lkc-info"><span class="lkc-num">${pad2(n + 1)} / ${pad2(t.items.length)}</span><h3>${it.n}</h3><p>${it.d}</p>${foot(it)}</article>`;
  const navBtns = `<div class="lkc-nav"><button type="button" data-look-go="-1" aria-label="${k.prev}">${ICO.left}</button><button type="button" data-look-go="1" aria-label="${k.next}">${ICO.right}</button><div class="lkc-prog"><i></i></div></div>`;
  // подсказка к фирменной механике (js/play.js): исчезает, как только посетитель попробовал
  const play = m.play || {};
  const hint = (cls = '') => (play.hint ? `<em class="pl-hint${cls ? ` ${cls}` : ''}" aria-hidden="true">${ICO.hand}<span>${play.hint}</span></em>` : '');

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
    ${hint('fl-ph')}
    <div class="fl-foot"><p class="d-sub">${t.sub}</p><div class="d-actions"><a class="d-btn" href="#/${id}" data-to="d-book"><span>${t.cta}</span>${ICO.arrow}</a><a class="d-link" href="#/${id}" data-to="d-list">${t.listTitle}</a></div></div>`;
  } else if (d.hero === 'zoom') {
    // первый экран закреплён: при прокрутке камера «влетает» в дом и оказывается в гостиной
    const it = t.items[0], hot = it.d.split(', ');
    heroSection = `<section class="zm" id="d-top" data-sp="pin" data-live>
    <div class="zm-stage">
      <div class="zm-s zm-s1">${pic(d.img[0], 1800, '100vw', name, 'fetchpriority="high"')}</div>
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
    // салон красоты: зеркало-лупа — в круге тот же портрет, увеличенный вокруг его центра
    const lens = d.play === 'lens' ? `<div class="lens"><div class="lens-g"><div class="lens-in">${pic(d.img[0], 1800, heroSizes, '', 'draggable="false"')}</div></div><i></i>${hint()}</div>` : '';
    // отель: слои рассвета, заката и ночи над фото и солнце на дуге
    const sun = d.play === 'sun' ? `<i class="sun-tint sun-dawn"></i><i class="sun-tint sun-dusk"></i><i class="sun-tint sun-night"></i>
    <div class="sun-arc" data-sun="${play.times.join('|')}">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${SUN_ARC}"/></svg>
      <div class="sun-run"><button class="sun" type="button" role="slider" aria-label="${play.hint}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="30"><i class="sun-d"></i><i class="sun-n"></i><span class="sun-lab"></span></button></div>
      ${hint()}
    </div>` : '';
    hero = `<div class="d-hero-media">${pic(d.img[0], 1800, heroSizes, name, 'fetchpriority="high" data-px=".06"')}</div>${lens}${sun}${copy}${float}`;
  }
  if (d.timer) {
    // фитнес: под таймером ползунок нагрузки, от него зависят пульс и «жар» первого экрана
    const pw = d.play === 'power' ? `<div class="pw" data-pw>
        <div class="pw-top"><span>${play.load}</span><b><i data-bpm>99</i> ${play.unit}</b></div>
        <div class="pw-track" role="slider" tabindex="0" aria-label="${play.load}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="30"><i class="pw-fill"></i><div class="pw-run"><i class="pw-knob"></i></div></div>
        ${hint()}
      </div>` : '';
    hero += `<div class="d-hud"><div class="d-timer" aria-hidden="true"><i></i><b data-timer="2700">45:00</b><span>${m.stats[1]}</span></div>${pw}</div>${pw ? '<i class="pw-heat"></i>' : ''}`;
  }
  if (d.play === 'tacho') {
    hero += `<div class="tacho" data-tacho role="button" tabindex="0" aria-label="${play.hint}">
      <svg viewBox="0 0 200 200" aria-hidden="true">${tachoSVG()}</svg>
      <i class="tacho-needle"></i>
      <div class="tacho-read"><b data-rpm>800</b><span>${play.unit}</span></div>
      ${hint()}
    </div>`;
  }
  if (d.glass) {
    hero += `<div class="d-glass d-glass-a"><b>${d.stats[2]}</b><span>${m.stats[2]}</span></div>
    <div class="d-glass d-glass-b">${ICO.clock}<div>${d.opts[1][1].map((v, i) => `<em class="${i === 1 ? 'on' : ''}">${v}</em>`).join('')}</div></div>`;
  }

  // ---------- каталог ----------
  let catalog;
  if (d.list === 'lkc') {
    catalog = `<div class="lkc" data-look>
      <div class="lkc-stage">${t.items.map((it, n) => `<button class="lkc-it" type="button" data-look-i="${n}" aria-label="${it.n}">${pic(d.img[2 + n], 800, '(max-width: 860px) 60vw, 30vw', it.n, 'loading="lazy"')}</button>`).join('')}</div>
      <div class="lkc-side">${t.items.map(info).join('')}${navBtns}</div>
    </div>`;
  } else if (d.list === 'orb') {
    // круг из тарелок: активное блюдо наверху, его описание в центре
    catalog = `<div class="orb" data-look="orbit" data-live>
      <div class="orb-ring">${[0, 1, 2, 3, 0, 1, 2, 3].map((n, i) => `<button class="lkc-it orb-it" type="button" data-look-i="${i}" style="--n:${i}" aria-label="${t.items[n].n}">${pic(d.img[2 + n], 800, '(max-width: 860px) 26vw, 200px', t.items[n].n, 'loading="lazy"')}</button>`).join('')}</div>
      <div class="lkc-side orb-center">${t.items.map(info).join('')}${navBtns}</div>
      ${hint('orb-ph')}
    </div>`;
  } else if (d.list === 'deck') {
    // колода карточек: верхнюю смахивают вправо («выбрать») или влево («дальше»), js/play.js
    catalog = `<div class="deck" data-deck>
      <div class="deck-stage">${t.items.map((it, n) => `<article class="deck-card" data-i="${n}">
        <div class="deck-media">${pic(d.img[2 + n], 800, '(max-width: 860px) 86vw, 420px', it.n, 'loading="lazy" draggable="false"')}${it.tag ? `<span class="d-tag">${it.tag}</span>` : ''}
          <b class="deck-st deck-yes">${m.act}</b><b class="deck-st deck-no">${play.skip}</b></div>
        <div class="deck-body"><h3>${it.n}</h3><p>${it.d}</p></div>
        ${foot(it)}
      </article>`).join('')}</div>
      <div class="deck-side">
        <span class="deck-num lkc-num">01 / ${pad2(t.items.length)}</span>
        <p class="deck-hint">${ICO.hand}<span>${play.hint}</span></p>
        <div class="deck-btns">
          <button type="button" data-deck-go="-1">${ICO.close}<span>${play.skip}</span></button>
          <button type="button" class="yes" data-deck-go="1">${ICO.check}<span>${m.act}</span></button>
        </div>
      </div>
    </div>`;
  } else if (d.list === 'pan') {
    catalog = `<div class="pan">${t.items.map((it, n) => `<article class="pan-it${n ? '' : ' on'}" data-pan>
        ${pic(d.img[2 + n], 800, '(max-width: 860px) 100vw, 40vw', it.n, 'loading="lazy"')}
        <span class="d-tag">${it.tag}</span>
        <div class="pan-in"><h3>${it.n}</h3><div class="pan-more"><div><p>${it.d}</p>${foot(it)}</div></div></div>
      </article>`).join('')}</div>`;
  } else if (d.list === 'hl') {
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

  const pulse = d.pulse ? `<div class="d-pulse" data-live aria-hidden="true"><svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path pathLength="1" d="${PULSE}"/><path class="d-pulse-dot" pathLength="1" d="${PULSE}"/></svg></div>` : '';
  const beforeAfter = d.ba ? `<section class="d-ba-sec">
      <div class="d-ba-copy"><h2 class="rvw">${words(t.items[3].n)}</h2><p class="rv">${t.items[3].d}</p><span class="d-ba-hint rv">${ICO.sides}${t.items[3].tag}</span></div>
      <div class="d-ba" data-ba data-live>
        ${pic(d.img[5], 800, '(max-width: 860px) 100vw, 50vw', t.items[3].n, 'loading="lazy"')}
        <div class="d-ba-b">${pic(d.img[5], 800, '(max-width: 860px) 100vw, 50vw', '', 'loading="lazy"')}</div>
        <i class="d-ba-h">${ICO.sides}</i>
      </div>
    </section>` : '';

  // ---------- разделы между бегущей строкой и формой: у каждого сайта свой порядок (поле flow в js/demos.js) ----------
  const parts = {
    about: `<section class="d-about${d.flip ? ' flip' : ''}" id="d-about">
    <div class="d-about-media rvi">${pic(d.img[1], 1400, '(max-width: 860px) 100vw, 50vw', m.about.t, 'loading="lazy" data-px=".05"')}</div>
    <div class="d-about-copy">
      <h2 class="rvw">${words(m.about.t)}</h2>
      <p class="rv">${m.about.d}</p>
      <dl class="d-stats">${d.stats.map((n, i) => `<div class="rv" style="--i:${i}"><dt data-n>${n}</dt><dd>${m.stats[i]}</dd></div>`).join('')}</dl>
    </div>
  </section>`,
    list: `<section class="d-list" id="d-list">
    <div class="d-head"><h2 class="rvw">${words(t.listTitle)}</h2><a class="d-link" href="#/${id}" data-to="d-book">${t.cta}</a></div>
    ${catalog}
  </section>`,
    ba: beforeAfter,
    gallery: `<section class="d-gallery">
    <p class="d-quote" data-sp style="--n:${t.strip.split(' ').length}">${words(t.strip)}</p>
    <div class="d-mosaic${d.mos ? ` mos-${d.mos}` : ''}">
      ${[6, 7, 8].map((n, i) => `<figure class="g${i + 1} rvi" style="--i:${i}">${pic(d.img[n], i ? 1000 : 1400, '(max-width: 860px) 100vw, 55vw', name, `loading="lazy"${i ? '' : ' data-px=".05"'}`)}</figure>`).join('')}
    </div>
  </section>`,
  };
  const flow = (d.flow || ['about', 'list', 'ba', 'gallery']).map((key) => parts[key]).join('\n  ');

  return `
<div class="d d-${id} d-h-${d.hero}" data-b="${id}"${own ? ` style="--nl:${nameLen || 8}"` : ''}>
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

  ${heroSection || `<section class="d-hero" id="d-top" data-live${d.hero === 'float' ? ' data-par data-sp="top"' : d.glass ? ' data-par' : ''}${d.play === 'lens' ? ' data-lens' : ''}>${hero}</section>`}

  <div class="d-ticker" data-live aria-hidden="true"><div>${[0, 1].map(() => tick.map((w) => `<span>${w}</span>`).join('')).join('')}</div></div>
  ${pulse}

  ${flow}

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
    <p>© ${new Date().getFullYear()} ${name}. ${type}.</p>
  </footer>

  <section class="d-end rv" id="d-end">
    <span class="logo">SPECTRE</span>
    <h2>${(own ? k.endTitleOwn : k.endTitle).replace('{name}', name)}</h2>
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
