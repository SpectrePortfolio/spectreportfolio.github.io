// Десять концептов. Тексты лежат в js/lang/*.js, здесь характер каждого сайта: цвета, шрифты, фото, опции формы.
// Устройство страницы задают поля:
//   hero — первый экран: full (фото на весь экран), split (текст и фото рядом), float (парящие предметы), rail (рейл с одеждой), zoom («влёт»);
//   list — каталог: grid (карточки, по умолчанию), lkc (карусель), orb (круг), pan (раздвижные панели), hl (список с большим превью);
//   timer, pulse, glass, ba — добавки: таймер на первом экране, линия пульса, стеклянные карточки над фото, блок «до и после».
const gf = (q) => `https://fonts.googleapis.com/css2?${q}&display=swap`;

export const ORDER = ['restaurant', 'coffee', 'dental', 'shop', 'fitness', 'realty', 'beauty', 'auto', 'school', 'hotel'];
// Портфолио по направлениям (js/works.js) собрано для первых шести брендов.
export const CASES = ORDER.slice(0, 6);

// Фото: Unsplash (свободная лицензия), сохранены в папке img как <id>-<ширина>.webp.
// Порядок в img: [первый экран, «о нас», 4 позиции, 3 кадра галереи].
// У каждого кадра две ширины (1800/900, 1400/700, 1000/500 или 800/400), на телефон уходит меньшая.
// Исходник любого кадра: https://images.unsplash.com/photo-<id>
export const photo = (id, w) => `img/${id}-${w}.webp`;

export const DEMOS = {
  restaurant: {
    name: 'Nocturne', hero: 'full', list: 'orb', counter: 'bag', bg: '#1a0a0f', ink: '#f1e7da', acc: '#c8a15a', c4: '#5a1a28', fontName: 'Cormorant Garamond',
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
    name: 'Enamel', hero: 'split', glass: true, ba: true, counter: 'cal', bg: '#f4f9fc', ink: '#0b2a4a', acc: '#00a3a3', c4: '#4b7bd8', fontName: 'Geologica Light',
    dots: ['#00a3a3', '#4b7bd8'], add: false, glow: ['#19d3d3', '#c8ffff'],
    fonts: gf('family=Geologica:wght@300;400;600'),
    img: ['1704455306925-1401c3012117', '1777331903190-341a3dd0441b', '1606811841689-23dfddce3e95', '1588776814546-daab30f310ce', '1698749778813-ad5f2814e50f', '1654373535457-383a0a4d00f9', '1643660526741-094639fbe53a', '1629909614456-6b1c5c94cecc', '1612994451093-c6791c8989cd'],
    stats: ['12', '15', '0 €'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['9:00', '11:30', '14:00', '17:30']]],
  },
  shop: {
    name: 'FORMA', hero: 'rail', list: 'lkc', counter: 'bag', bg: '#ecebe7', ink: '#0c0c0c', acc: '#ff5b00', c4: '#b9b6ad', fontName: 'Sofia Sans Condensed',
    dots: ['#0c0c0c', '#6a665e'], add: false, glow: ['#ffffff', '#ff5b00'],
    fonts: gf('family=Sofia+Sans+Extra+Condensed:wght@800'),
    img: ['1747814965215-15a273e27aa6', '1551488831-00ddcb6c6bd3', '1539533113208-f6df8cc8b543', '1574201635302-388dd92a4c3f', '1761726080936-220271160e16', '1600857062241-98e5dba7f214', '1552393700-42696fb89bfa', '1699797467199-6bdf301649e8', '1560796952-f1c9b838544c'],
    stats: ['2', '30', '100%'],
    opts: [['tag', ['XS', 'S', 'M', 'L', 'XL']], ['bag', ['1', '2', '3']]],
  },
  fitness: {
    name: 'RUSH', hero: 'full', list: 'pan', timer: true, pulse: true, counter: 'cal', bg: '#f2330d', ink: '#0a0a0a', acc: '#ffffff', c4: '#7a1500', fontName: 'Oswald Bold',
    dots: ['#0a0a0a', '#ffffff'], add: false, glow: ['#ff3d17', '#ffb199'],
    fonts: gf('family=Oswald:wght@500;700'),
    img: ['1554284126-aa88f22d8b74','1517130038641-a774d04afb3c', '1599058917212-d750089bc07e', '1722925541142-5db2668ca492', '1583473848882-f9a5bc7fd2ee', '1599447292325-2cffaa79bcbb', '1689877020200-403d8542d95d', '1632077804406-188472f1a810', '1461897104016-0b3b00cc81ee'],
    stats: ['12', '45', '28'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['07:00', '12:30', '18:00', '20:30']]],
  },
  realty: {
    name: 'Atrium', hero: 'zoom', list: 'hl', counter: 'heart', bg: '#dde2df', ink: '#14201b', acc: '#1f5a44', c4: '#b9a98f', fontName: 'Forum',
    dots: ['#1f5a44', '#14201b'], add: false, glow: ['#4fd1a0', '#e9fff5'],
    fonts: gf('family=Forum&family=Jost:wght@400;500'),
    img: ['1580587771525-78b9dba3b914', '1705321963943-de94bb3f0dd3', '1630703103084-4ac45d397a0c', '1598714805247-5dd440d87124', '1702014862053-946a122b920d', '1617817643768-8855fc457e3a', '1628745277862-bc0b2d68c50c', '1600210491305-7396500b5b31', '1554793000-245d3a3c2a51'],
    stats: ['5%', '14', '0 €'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['10:00', '13:00', '16:00', '19:00']]],
  },
  beauty: {
    name: 'Lila', hero: 'split', list: 'lkc', counter: 'cal', bg: '#f6efe9', ink: '#2b1a24', acc: '#b4477a', c4: '#e4c9c0', fontName: 'Playfair Display',
    dots: ['#b4477a', '#2b1a24'], add: false, glow: ['#ff9ec4', '#fff0f6'],
    fonts: gf('family=Playfair+Display:ital,wght@0,500;1,500&family=Jost:wght@400;500'),
    img: ['1636153279424-cb5d1e00f5a2', '1711274094763-ff442e4719ef', '1560869713-bf165a9cfac1', '1557053910-d9eadeed1c58', '1690749138086-7422f71dc159', '1709477542170-f11ee7d471a0', '1676536162793-faa565d976d4', '1706629503650-cade709d15e3', '1636740599648-ae84f705fc2e'],
    stats: ['9', '12', '4.9'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['10:00', '12:30', '15:00', '18:30']]],
  },
  auto: {
    name: 'TORQ', hero: 'full', list: 'pan', counter: 'cal', bg: '#101317', ink: '#eef1f4', acc: '#ffd60a', c4: '#2a3038', fontName: 'Exo 2 ExtraBold Italic',
    dots: ['#ffd60a', '#eef1f4'], add: true, glow: ['#ffd60a', '#fff6c2'],
    fonts: gf('family=Exo+2:ital,wght@1,800'),
    img: ['1492144534655-ae79c964c9d7', '1615906655593-ad0386982a0f', '1727893380169-4dda123e19f7', '1599082267768-4815b2ea6bd2', '1620584898989-d39f7f9ed1b7', '1642075223291-f9ec545889fa', '1770648591901-49294826175c', '1613206485381-b028e578e791', '1605164598708-25701594473e'],
    stats: ['14', '8', '12'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['8:00', '11:00', '14:00', '18:00']]],
  },
  school: {
    name: 'Nova', hero: 'split', glass: true, counter: 'heart', bg: '#f3f1ff', ink: '#17123a', acc: '#6b3df5', c4: '#c8f25a', fontName: 'Rubik SemiBold',
    dots: ['#6b3df5', '#17123a'], add: false, glow: ['#9b7bff', '#efeaff'],
    fonts: gf('family=Rubik:wght@400;600;700'),
    img: ['1573496129661-bd7fcc7e532b', '1616769364512-1e50e8266907', '1576153192396-180ecef2a715', '1587620962725-abab7fe55159', '1704881986205-ee7cb7688f3b', '1790614108104-337c880ec536', '1588091210060-1ee4fab270ae', '1612831455359-970e23a1e4e9', '1471107340929-a87cd0f5b5f3'],
    stats: ['15', '6', '0 €'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['clock', ['10:00', '14:00', '19:00', '20:30']]],
  },
  hotel: {
    name: 'Marea', hero: 'full', list: 'hl', counter: 'cal', bg: '#f1ece2', ink: '#12303a', acc: '#0f6a73', c4: '#d9b98a', fontName: 'Prata',
    dots: ['#0f6a73', '#12303a'], add: false, glow: ['#57d0d6', '#e7fbfc'],
    fonts: gf('family=Prata&family=Jost:wght@400;500'),
    img: ['1783442619815-943376e2ac6c', '1759038086832-795644825e3a', '1711059985570-4c32ed12a12c', '1786995879282-26cb50e30ace', '1705672354908-a068661bc81d', '1651065207291-6503560ae71b', '1790939038591-9705af9434aa', '1572331165267-854da2b10ccc', '1488345979593-09db0f85545f'],
    stats: ['40', '90', '12:00'],
    opts: [['cal', ['12', '13', '14', '15', '16']], ['people', ['1', '2', '3', '4']]],
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
