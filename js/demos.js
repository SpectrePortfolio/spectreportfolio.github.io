// Шесть концептов. Тексты лежат в js/lang/*.js, здесь характер каждого сайта: цвета, шрифты, фото, опции формы.
const gf = (q) => `https://fonts.googleapis.com/css2?${q}&display=swap`;

export const ORDER = ['restaurant', 'coffee', 'dental', 'shop', 'fitness', 'realty'];

// Фото: Unsplash (свободная лицензия), сохранены в папке img как <id>-<ширина>.webp.
// Порядок в img: [первый экран, «о нас», 4 позиции, 3 кадра галереи].
// У каждого кадра две ширины (1800/900, 1400/700, 1000/500 или 800/400), на телефон уходит меньшая.
// Исходник любого кадра: https://images.unsplash.com/photo-<id>
export const photo = (id, w) => `img/${id}-${w}.webp`;

export const DEMOS = {
  restaurant: {
    name: 'Nocturne', hero: 'full', counter: 'bag', bg: '#1a0a0f', ink: '#f1e7da', acc: '#c8a15a', c4: '#5a1a28', fontName: 'Cormorant Garamond',
    dots: ['#c8a15a', '#f6e3b8'], add: true, glow: ['#c8a15a', '#fff0cf'],
    fonts: gf('family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Jost:wght@400;500'),
    img: ['1653259038915-7cf0b7a4dd6c', '1558030089-02acba3c214e', '1661331312661-150b7338aeef', '1731601816614-2423297fe97b', '1739660740431-68dbe10e999e', '1598215430510-9c05e85c1aa3', '1575184560884-5f3ece6e636c', '1666600638841-4fe4a01ae260', '1488992783499-418eb1f62d08'],
    stats: ['140', '40', '6'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['18:00', '19:30', '21:00']], ['people', ['2', '4', '6', '8']]],
  },
  coffee: {
    name: 'Doppio', hero: 'float', counter: 'bag', bg: '#f2ede6', ink: '#1b1310', acc: '#f26a1b', c4: '#c9b8a3', fontName: 'Manrope ExtraBold',
    dots: ['#1b1310', '#f26a1b'], add: false, glow: ['#ffb26b', '#fff0df'],
    fonts: gf('family=Manrope:wght@500;800'),
    img: ['1541167760496-1628856ab772', '1511537190424-bbbab87ac5eb', '1579992357154-faf4bde95b3d', '1502462041640-b3d7e50d0662', '1442512595331-e89e73853f31', '1517701550927-30cf4ba1dba5', '1453614512568-c4024d13c247', '1785288661906-9c71358c5785', '1599940778173-e276d4acb2bb'],
    stats: ['7:00', '10', '4'],
    opts: [['clock', ['7:30', '8:00', '8:30', '9:00']], ['tag', ['S', 'M', 'L']], ['bag', ['1', '2', '3', '4']]],
  },
  dental: {
    name: 'Enamel', hero: 'split', counter: 'cal', bg: '#f4f9fc', ink: '#0b2a4a', acc: '#00a3a3', c4: '#4b7bd8', fontName: 'Geologica Light',
    dots: ['#00a3a3', '#4b7bd8'], add: false, glow: ['#19d3d3', '#c8ffff'],
    fonts: gf('family=Geologica:wght@300;400;600'),
    img: ['1704455306925-1401c3012117', '1777331903190-341a3dd0441b', '1606811841689-23dfddce3e95', '1588776814546-daab30f310ce', '1698749778813-ad5f2814e50f', '1654373535457-383a0a4d00f9', '1643660526741-094639fbe53a', '1629909614456-6b1c5c94cecc', '1612994451093-c6791c8989cd'],
    stats: ['12', '15', '0 €'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['9:00', '11:30', '14:00', '17:30']]],
  },
  shop: {
    name: 'FORMA', hero: 'rail', counter: 'bag', bg: '#ecebe7', ink: '#0c0c0c', acc: '#ff5b00', c4: '#b9b6ad', fontName: 'Sofia Sans Condensed',
    dots: ['#0c0c0c', '#6a665e'], add: false, glow: ['#ffffff', '#ff5b00'],
    fonts: gf('family=Sofia+Sans+Extra+Condensed:wght@800'),
    img: ['1747814965215-15a273e27aa6', '1551488831-00ddcb6c6bd3', '1539533113208-f6df8cc8b543', '1574201635302-388dd92a4c3f', '1761726080936-220271160e16', '1600857062241-98e5dba7f214', '1552393700-42696fb89bfa', '1699797467199-6bdf301649e8', '1560796952-f1c9b838544c'],
    stats: ['2', '30', '100%'],
    opts: [['tag', ['XS', 'S', 'M', 'L', 'XL']], ['bag', ['1', '2', '3']]],
  },
  fitness: {
    name: 'RUSH', hero: 'full', counter: 'cal', bg: '#f2330d', ink: '#0a0a0a', acc: '#ffffff', c4: '#7a1500', fontName: 'Oswald Bold',
    dots: ['#0a0a0a', '#ffffff'], add: false, glow: ['#ff3d17', '#ffb199'],
    fonts: gf('family=Oswald:wght@500;700'),
    img: ['1554284126-aa88f22d8b74','1517130038641-a774d04afb3c', '1599058917212-d750089bc07e', '1722925541142-5db2668ca492', '1583473848882-f9a5bc7fd2ee', '1599447292325-2cffaa79bcbb', '1689877020200-403d8542d95d', '1632077804406-188472f1a810', '1461897104016-0b3b00cc81ee'],
    stats: ['12', '45', '28'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['07:00', '12:30', '18:00', '20:30']]],
  },
  realty: {
    name: 'Atrium', hero: 'zoom', counter: 'heart', bg: '#dde2df', ink: '#14201b', acc: '#1f5a44', c4: '#b9a98f', fontName: 'Forum',
    dots: ['#1f5a44', '#14201b'], add: false, glow: ['#4fd1a0', '#e9fff5'],
    fonts: gf('family=Forum&family=Jost:wght@400;500'),
    img: ['1580587771525-78b9dba3b914', '1705321963943-de94bb3f0dd3', '1630703103084-4ac45d397a0c', '1598714805247-5dd440d87124', '1702014862053-946a122b920d', '1617817643768-8855fc457e3a', '1628745277862-bc0b2d68c50c', '1600210491305-7396500b5b31', '1554793000-245d3a3c2a51'],
    stats: ['5%', '14', '0 €'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['10:00', '13:00', '16:00', '19:00']]],
  },
};

const loaded = new Set();
export function loadFonts(id) {
  const d = DEMOS[id];
  if (!d || loaded.has(id)) return;
  loaded.add(id);
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = d.fonts;
  document.head.appendChild(l);
}

export const loadAllFonts = () => ORDER.forEach(loadFonts);

// Заранее подгружаем фото первого экрана, чтобы после перехода сайт открылся уже с картинкой.
const warmed = new Set();
export function warmHero(id) {
  if (warmed.has(id) || !DEMOS[id]) return;
  warmed.add(id);
  new Image().src = photo(DEMOS[id].img[0], innerWidth < 900 ? 900 : 1800);
}
