// SPECTRE — облако частиц, которое принимает форму любого бизнеса.
// Чистый WebGL без библиотек: один draw call, вся анимация в шейдере.
import { subscribe, regroupSoon } from './clock.js';

const VS = `
attribute vec3 aFrom, aTo;
attribute vec4 aRnd;
uniform float uMix, uTime, uBurst, uScale, uDpr, uSize, uWave, uHw, uFade;
uniform vec2 uRes, uMouse, uOffset, uRot, uReg;
varying float vA, vT;
void main(){
  float m = clamp(uMix * 1.6 - aRnd.x * 0.6, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  vec3 p = mix(aFrom, aTo, m);
  float arc = sin(m * 3.14159);
  p += arc * 0.32 * vec3(sin(aRnd.y * 6.283 + uTime), cos(aRnd.z * 6.283 + uTime * 0.7), sin(aRnd.w * 6.283 + uTime * 0.5));
  p += normalize(p + 0.001) * sin(p.y * 5.0 + uTime * 1.4 + p.x * 3.0) * 0.07 * uWave;
  p += 0.012 * vec3(sin(uTime * 1.3 + aRnd.y * 40.0), cos(uTime * 1.1 + aRnd.z * 40.0), sin(uTime * 0.9 + aRnd.w * 40.0));
  p += normalize(p + (aRnd.yzw - 0.5) * 0.4) * uBurst * (1.2 + aRnd.x * 4.5);
  float cy = cos(uRot.x), sy = sin(uRot.x);
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  float cx = cos(uRot.y), sx = sin(uRot.y);
  p.yz = mat2(cx, -sx, sx, cx) * p.yz;
  float z = 3.2 - p.z;
  float aspect = uRes.x / uRes.y;
  vec2 ndc = p.xy / z * 2.4 * uScale;
  ndc.x /= aspect;
  ndc += uOffset;
  vec2 d = (ndc - uMouse) * vec2(aspect, 1.0);
  float f = 1.0 - smoothstep(0.0, 0.38, length(d));
  ndc += normalize(d + 0.0001) / vec2(aspect, 1.0) * f * 0.13;
  // uFade гасит пыль к краям полосы вокруг объекта; uReg переводит координаты всего окна в координаты суженного холста
  float edge = 1.0 - uFade * smoothstep(0.78, 1.0, abs(ndc.x - uOffset.x) / uHw);
  ndc.x = (ndc.x - uReg.x) / uReg.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = uSize * uDpr * (0.55 + aRnd.x) * 3.2 / z * (1.0 + f * 1.4);
  vA = (0.35 + 0.65 * aRnd.z) * edge;
  vT = clamp(aRnd.w + f * 0.6, 0.0, 1.0);
}`;

const FS = `
precision mediump float;
uniform vec3 uC1, uC2;
uniform float uAlpha, uAdd;
varying float vA, vT;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float a = (1.0 - smoothstep(0.02, 0.25, d)) * vA * uAlpha;
  vec3 col = mix(uC1, uC2, vT);
  gl_FragColor = vec4(col * a, a);
}`;

const TOOTH = 'M128 72C108 52 62 52 58 96C55 130 72 150 78 180C82 204 86 226 98 226C112 226 108 176 128 176C148 176 144 226 158 226C170 226 174 204 178 180C184 150 201 130 198 96C194 52 148 52 128 72Z';

function rr(x, a, b, w, h, r) {
  x.beginPath();
  if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h);
  x.fill();
}

const DRAW = {
  coffee(x) {
    x.beginPath(); x.moveTo(60, 100); x.lineTo(176, 100); x.lineTo(164, 194);
    x.quadraticCurveTo(160, 208, 148, 208); x.lineTo(88, 208); x.quadraticCurveTo(76, 208, 72, 194); x.closePath(); x.fill();
    x.lineWidth = 13; x.beginPath(); x.arc(180, 142, 26, -1.25, 1.45); x.stroke();
    x.lineWidth = 8;
    for (const sx of [92, 118, 144]) {
      x.beginPath(); x.moveTo(sx, 84); x.bezierCurveTo(sx - 14, 68, sx + 14, 52, sx, 34); x.stroke();
    }
    rr(x, 36, 220, 164, 11, 5);
  },
  dental(x) { x.fill(new Path2D(TOOTH)); },
  shop(x) {
    rr(x, 56, 98, 144, 128, 10);
    x.lineWidth = 12; x.beginPath(); x.arc(128, 98, 38, Math.PI, Math.PI * 2); x.stroke();
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.arc(100, 122, 6, 0, 7); x.arc(156, 122, 6, 0, 7); x.fill();
    x.globalCompositeOperation = 'source-over';
  },
  restaurant(x) {
    x.beginPath(); x.arc(128, 182, 86, Math.PI, Math.PI * 2); x.closePath(); x.fill();
    x.beginPath(); x.arc(128, 84, 11, 0, 7); x.fill();
    rr(x, 24, 192, 208, 12, 6);
    x.globalCompositeOperation = 'destination-out';
    x.lineWidth = 6; x.beginPath(); x.arc(128, 182, 62, Math.PI * 1.12, Math.PI * 1.42); x.stroke();
    x.globalCompositeOperation = 'source-over';
  },
  fitness(x) {
    x.translate(128, 128); x.rotate(-0.42); x.translate(-128, -128);
    rr(x, 56, 119, 144, 18, 4);
    rr(x, 26, 80, 28, 96, 7); rr(x, 60, 94, 20, 68, 5);
    rr(x, 202, 80, 28, 96, 7); rr(x, 176, 94, 20, 68, 5);
  },
  identity(x) {
    x.beginPath(); x.arc(100, 118, 74, 0, 7); x.fill();
    x.globalCompositeOperation = 'xor';
    rr(x, 112, 96, 118, 118, 22);
    x.globalCompositeOperation = 'source-over';
    x.beginPath(); x.moveTo(190, 20); x.lineTo(228, 80); x.lineTo(152, 80); x.closePath(); x.fill();
  },
  ui(x) {
    rr(x, 70, 14, 116, 228, 24);
    x.globalCompositeOperation = 'destination-out';
    rr(x, 82, 30, 92, 196, 12);
    x.globalCompositeOperation = 'source-over';
    rr(x, 92, 42, 72, 52, 8); rr(x, 92, 106, 72, 12, 6); rr(x, 92, 128, 46, 12, 6); rr(x, 92, 186, 72, 26, 13);
  },
  motion(x) {
    x.lineWidth = 16; x.beginPath(); x.arc(128, 128, 96, 0.5, 6.1); x.stroke();
    x.beginPath(); x.moveTo(102, 78); x.lineTo(186, 128); x.lineTo(102, 178); x.closePath(); x.fill();
  },
  social(x) {
    x.fill(new Path2D('M128 222C28 156 24 52 92 52C114 52 128 70 128 84C128 70 142 52 164 52C232 52 228 156 128 222Z'));
  },
  print(x) {
    const poly = (p) => { x.beginPath(); x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]); x.closePath(); x.fill(); };
    poly([128, 30, 220, 78, 128, 126, 36, 78]);
    poly([36, 92, 122, 137, 122, 232, 36, 186]);
    poly([134, 137, 220, 92, 220, 186, 134, 232]);
  },
  beauty(x) { // цветок лотоса
    for (const a of [-1.15, -0.58, 0, 0.58, 1.15]) {
      x.save(); x.translate(128, 196); x.rotate(a);
      x.beginPath(); x.ellipse(0, -80, 25, 84, 0, 0, 7); x.fill();
      x.restore();
    }
    rr(x, 62, 212, 132, 12, 6);
  },
  auto(x) { // автомобиль в профиль
    x.beginPath(); x.moveTo(20, 168); x.lineTo(20, 142); x.quadraticCurveTo(22, 124, 46, 120); x.lineTo(80, 114);
    x.quadraticCurveTo(100, 78, 136, 76); x.lineTo(170, 76); x.quadraticCurveTo(198, 80, 214, 116);
    x.quadraticCurveTo(238, 122, 238, 146); x.lineTo(238, 168); x.closePath(); x.fill();
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.arc(74, 170, 29, 0, 7); x.fill(); x.beginPath(); x.arc(188, 170, 29, 0, 7); x.fill();
    x.beginPath(); x.moveTo(104, 112); x.quadraticCurveTo(116, 90, 138, 88); x.lineTo(138, 112); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(148, 88); x.lineTo(168, 88); x.quadraticCurveTo(188, 92, 198, 112); x.lineTo(148, 112); x.closePath(); x.fill();
    x.globalCompositeOperation = 'source-over';
    x.beginPath(); x.arc(74, 170, 21, 0, 7); x.fill(); x.beginPath(); x.arc(188, 170, 21, 0, 7); x.fill();
  },
  school(x) { // академическая шапочка
    x.beginPath(); x.moveTo(128, 58); x.lineTo(238, 108); x.lineTo(128, 158); x.lineTo(18, 108); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(64, 142); x.lineTo(64, 184); x.quadraticCurveTo(128, 226, 192, 184); x.lineTo(192, 142); x.lineTo(128, 172); x.closePath(); x.fill();
    x.lineWidth = 7; x.beginPath(); x.moveTo(224, 114); x.lineTo(224, 178); x.stroke();
    x.beginPath(); x.arc(224, 190, 11, 0, 7); x.fill();
  },
  hotel(x) { // солнце над морем
    x.beginPath(); x.arc(128, 134, 60, Math.PI, Math.PI * 2); x.closePath(); x.fill();
    x.lineWidth = 9;
    for (const a of [-1.25, -0.63, 0, 0.63, 1.25]) { x.beginPath(); x.moveTo(128 + Math.sin(a) * 78, 134 - Math.cos(a) * 78); x.lineTo(128 + Math.sin(a) * 106, 134 - Math.cos(a) * 106); x.stroke(); }
    x.lineWidth = 12;
    for (const y of [160, 190, 220]) { x.beginPath(); x.moveTo(34, y); x.bezierCurveTo(66, y - 18, 96, y + 18, 128, y); x.bezierCurveTo(160, y - 18, 190, y + 18, 222, y); x.stroke(); }
  },
  realty(x) {
    x.beginPath(); x.moveTo(128, 36); x.lineTo(222, 114); x.lineTo(198, 114); x.lineTo(198, 220);
    x.lineTo(58, 220); x.lineTo(58, 114); x.lineTo(34, 114); x.closePath(); x.fill();
    x.globalCompositeOperation = 'destination-out';
    x.fillRect(112, 162, 32, 58); x.fillRect(76, 128, 26, 26); x.fillRect(154, 128, 26, 26);
    x.globalCompositeOperation = 'source-over';
  },
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// Пробуем WebGL; если браузер его не даёт (выключено аппаратное ускорение, старый драйвер),
// те же частицы рисуются обычным 2D-холстом, только их меньше.
function getGL(canvas) {
  if (/[?&]gl=0\b/.test(location.search)) return null; // ?gl=0 — принудительно проверить запасной режим
  const opts = { alpha: true, premultipliedAlpha: true, antialias: false };
  for (const name of ['webgl', 'experimental-webgl']) {
    try { const gl = canvas.getContext(name, opts); if (gl) return gl; } catch {}
  }
  return null;
}

function glProgram(gl) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null;
}

export function createSpectre(canvas) {
  const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let gl = getGL(canvas), prog = gl && glProgram(gl);
  if (!prog) gl = null;
  let ctx = null;
  if (!gl) {
    // после неудачной попытки WebGL холст уже «занят», поэтому для 2D берём новый на его месте
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh); canvas = fresh;
    ctx = canvas.getContext('2d');
    if (!ctx) return null;
  }
  const N = gl ? (small ? 14000 : 36000) : (small ? 2200 : 4200);
  // На больших экранах холст рисуется в обычном разрешении: частицы мягкие, а встроенной видеокарте вдвое легче.
  const maxDpr = gl && innerWidth * innerHeight < 1100000 ? 1.5 : 1;
  const SIZE = gl ? (small ? 2.0 : 2.3) : 2.6;

  const rnd = new Float32Array(N * 4);
  for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();

  // ---------- формы ----------
  const cache = new Map();
  const dust = (out, k) => {
    const r = 1.3 + Math.random() * 1.1, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1);
    out[k] = r * Math.sin(b) * Math.cos(a); out[k + 1] = r * Math.cos(b) * 0.8; out[k + 2] = r * Math.sin(b) * Math.sin(a) * 0.6;
  };
  function shape(name) {
    if (cache.has(name)) return cache.get(name);
    const out = new Float32Array(N * 3);
    if (!DRAW[name]) {
      for (let i = 0; i < N; i++) {
        const k = i * 3;
        if (i % 10 === 0) { dust(out, k); continue; }
        const a = Math.random() * 6.283, y = 2 * Math.random() - 1, s = Math.sqrt(1 - y * y);
        const r = i % 4 === 0 ? 0.5 + Math.random() * 0.08 : 0.94 + Math.random() * 0.05;
        out[k] = r * s * Math.cos(a); out[k + 1] = r * y; out[k + 2] = r * s * Math.sin(a);
      }
    } else {
      const Q = 220, c = document.createElement('canvas'); c.width = c.height = Q;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.fillStyle = x.strokeStyle = '#fff'; x.lineCap = x.lineJoin = 'round';
      x.scale(Q / 256, Q / 256); DRAW[name](x);
      const d = x.getImageData(0, 0, Q, Q).data, pts = [];
      for (let i = 0; i < Q * Q; i++) if (d[i * 4 + 3] > 128) pts.push(i);
      for (let i = 0; i < N; i++) {
        const k = i * 3;
        if (i % 20 === 0 || !pts.length) { dust(out, k); continue; }
        const p = pts[(Math.random() * pts.length) | 0];
        out[k] = (((p % Q) + Math.random()) / Q * 2 - 1) * 1.18;
        out[k + 1] = -((((p / Q) | 0) + Math.random()) / Q * 2 - 1) * 1.18;
        out[k + 2] = (Math.random() - 0.5) * 0.24;
      }
    }
    cache.set(name, out);
    return out;
  }

  let name = 'spectre';
  let from = new Float32Array(shape(name));
  let to = shape(name);

  // ---------- состояние ----------
  const S = {
    mix: 1, time: 0, burst: 1, burstT: 0, alpha: 0, alphaT: 1, wave: 1, waveT: 1,
    off: [0.4, 0], offT: [0.4, 0], scale: 1, scaleT: 1,
    c1: hex('#2447ff'), c2: hex('#e8edff'), c1T: hex('#2447ff'), c2T: hex('#e8edff'), add: 1, addT: 1,
    mouse: [9, 9], mx: 0, my: 0, rot: 0, tilt: 0,
  };
  let running = false, last = 0, W = 1, H = 1, dpr = 1;
  // Если кадры идут медленно, рисуем меньше частиц: плавность важнее плотности.
  let drawN = N, slow = 0, quick = 0;
  const MIN_N = gl ? 6000 : 1500;

  // ---------- WebGL ----------
  let U = null, bFrom = null, bTo = null;
  if (gl) {
    gl.useProgram(prog);
    U = {};
    for (const n of ['uMix', 'uTime', 'uBurst', 'uScale', 'uDpr', 'uSize', 'uWave', 'uRes', 'uMouse', 'uOffset', 'uRot', 'uC1', 'uC2', 'uAlpha', 'uAdd', 'uHw', 'uFade', 'uReg']) U[n] = gl.getUniformLocation(prog, n);
    const mkBuf = (attr, size, data, usage) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage);
      const loc = gl.getAttribLocation(prog, attr); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return b;
    };
    bFrom = mkBuf('aFrom', 3, from, gl.DYNAMIC_DRAW);
    bTo = mkBuf('aTo', 3, to, gl.DYNAMIC_DRAW);
    mkBuf('aRnd', 4, rnd, gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
  }
  function drawGL() {
    gl.uniform1f(U.uMix, S.mix); gl.uniform1f(U.uTime, S.time); gl.uniform1f(U.uBurst, S.burst);
    gl.uniform1f(U.uScale, S.scale * Math.min(1, (W / H) * 0.78)); gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uSize, SIZE); gl.uniform1f(U.uWave, S.wave);
    gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uMouse, S.mouse[0], S.mouse[1]);
    gl.uniform2f(U.uOffset, S.off[0], S.off[1]); gl.uniform2f(U.uRot, S.rot, S.tilt);
    gl.uniform3fv(U.uC1, S.c1); gl.uniform3fv(U.uC2, S.c2);
    gl.uniform1f(U.uAlpha, S.alpha * (0.55 + 0.45 * (1 - S.add)) + S.alpha * 0.25 * S.add);
    gl.uniform1f(U.uAdd, S.add);
    gl.uniform1f(U.uHw, band().hw); gl.uniform1f(U.uFade, fadeV);
    gl.uniform2f(U.uReg, reg ? reg.x0 + reg.x1 - 1 : 0, reg ? reg.x1 - reg.x0 : 1);
    gl.blendFunc(gl.ONE, S.add > 0.5 ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, drawN);
  }

  // ---------- 2D-холст: та же математика, что в шейдере, но на процессоре ----------
  const BK = 4, buckets = [];
  if (ctx) {
    for (let b = 0; b < BK; b++) buckets.push([]);
    for (let i = 0; i < N; i++) buckets[Math.min(BK - 1, (rnd[i * 4 + 3] * BK) | 0)].push(i);
  }
  function draw2D() {
    const aspect = W / H, sc = S.scale * Math.min(1, aspect * 0.78) * 2.4;
    const cy = Math.cos(S.rot), sy = Math.sin(S.rot), cx = Math.cos(S.tilt), sx = Math.sin(S.tilt);
    const t = S.time, mixv = S.mix, wave = S.wave, burst = S.burst, mx = S.mouse[0], my = S.mouse[1];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = S.add > 0.5 ? 'lighter' : 'source-over';
    ctx.globalAlpha = Math.min(1, S.alpha * 0.85);
    for (let b = 0; b < BK; b++) {
      const k = (b + 0.5) / BK;
      ctx.fillStyle = `rgb(${[0, 1, 2].map((j) => Math.round((S.c1[j] + (S.c2[j] - S.c1[j]) * k) * 255)).join(',')})`;
      const list = buckets[b], lim = Math.ceil(list.length * drawN / N);
      for (let n = 0; n < lim; n++) {
        const i = list[n], i3 = i * 3, i4 = i * 4;
        const r0 = rnd[i4], r1 = rnd[i4 + 1], r2 = rnd[i4 + 2], r3 = rnd[i4 + 3];
        let m = mixv * 1.6 - r0 * 0.6; m = m < 0 ? 0 : m > 1 ? 1 : m; m = m * m * (3 - 2 * m);
        let px = from[i3] + (to[i3] - from[i3]) * m, py = from[i3 + 1] + (to[i3 + 1] - from[i3 + 1]) * m, pz = from[i3 + 2] + (to[i3 + 2] - from[i3 + 2]) * m;
        if (m > 0.001 && m < 0.999) {
          const arc = Math.sin(m * 3.14159) * 0.32;
          px += arc * Math.sin(r1 * 6.283 + t); py += arc * Math.cos(r2 * 6.283 + t * 0.7); pz += arc * Math.sin(r3 * 6.283 + t * 0.5);
        }
        if (wave > 0.002) {
          const w = Math.sin(py * 5 + t * 1.4 + px * 3) * 0.07 * wave / (Math.hypot(px, py, pz) + 0.001);
          px += px * w; py += py * w; pz += pz * w;
        }
        px += 0.012 * Math.sin(t * 1.3 + r1 * 40); py += 0.012 * Math.cos(t * 1.1 + r2 * 40);
        if (burst > 0.002) {
          const dx = px + (r1 - 0.5) * 0.4, dy = py + (r2 - 0.5) * 0.4, dz = pz + (r3 - 0.5) * 0.4;
          const kb = burst * (1.2 + r0 * 4.5) / (Math.hypot(dx, dy, dz) + 0.0001);
          px += dx * kb; py += dy * kb; pz += dz * kb;
        }
        const x1 = cy * px + sy * pz, z1 = -sy * px + cy * pz;
        const y2 = cx * py + sx * z1, z2 = -sx * py + cx * z1;
        const z = 3.2 - z2;
        if (z < 0.2) continue;
        let nx = x1 / z * sc / aspect + S.off[0], ny = y2 / z * sc + S.off[1];
        let f = 0;
        const ddx = (nx - mx) * aspect, ddy = ny - my, dist = Math.hypot(ddx, ddy);
        if (dist < 0.38) {
          const u = dist / 0.38; f = 1 - u * u * (3 - 2 * u);
          const inv = f * 0.13 / (dist + 0.0001);
          nx += ddx * inv / aspect; ny += ddy * inv;
        }
        if (nx < -1.05 || nx > 1.05 || ny < -1.05 || ny > 1.05) continue;
        const s = SIZE * (0.55 + r0) * 3.2 / z * (1 + f * 1.4);
        ctx.fillRect((nx * 0.5 + 0.5) * W - s / 2, (0.5 - ny * 0.5) * H - s / 2, s, s);
      }
    }
  }

  // ---------- полоса вокруг объекта ----------
  // Видеокарта платит за площадь холста в каждом кадре, а объект занимает меньше половины экрана. Поэтому, когда частицы
  // стоят на месте (нет разлёта, превращения и переезда), холст сужается до вертикальной полосы вокруг объекта; пыль перед
  // этим плавно гаснет к её краям. На время любых переходов холст снова становится полноэкранным. Только WebGL, только широкие экраны.
  let reg = null, calmT = 0, fadeV = 0;
  function band() {
    const aspect = W / H, eff = S.scaleT * Math.min(1, aspect * 0.78);
    const hw = (0.9 * eff + 0.13) / aspect / 0.78; // полуширина полосы в координатах окна (−1…1)
    return { hw, x0: Math.max(0, (S.offT[0] - hw + 1) / 2), x1: Math.min(1, (S.offT[0] + hw + 1) / 2) };
  }
  function sizeCanvas() {
    const cw = reg ? Math.round((reg.x1 - reg.x0) * W) : W;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(H * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function setRegion(b) {
    if (b) {
      const left = Math.round(b.x0 * W), cw = Math.round((b.x1 - b.x0) * W);
      reg = { x0: left / W, x1: (left + cw) / W };
      canvas.style.left = `${left}px`; canvas.style.width = `${cw}px`;
    } else { reg = null; canvas.style.left = ''; canvas.style.width = ''; }
    sizeCanvas();
    regroupSoon();
  }
  function trackRegion(dt) {
    const calm = S.mix >= 1 && S.burst < 0.02 && S.burstT < 0.02 && Math.abs(S.off[0] - S.offT[0]) < 0.004 && Math.abs(S.scale - S.scaleT) < 0.004 && W >= 860;
    if (!calm) { calmT = 0; if (reg) setRegion(null); }
    else {
      calmT += dt;
      if (!reg && calmT > 0.5 && fadeV > 0.985) { const b = band(); if (b.x1 - b.x0 < 0.85) setRegion(b); }
    }
    fadeV += ((calm ? 1 : 0) - fadeV) * (1 - Math.exp(-dt * 6));
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, maxDpr);
    if (reg) { reg = null; canvas.style.left = ''; canvas.style.width = ''; calmT = 0; }
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    sizeCanvas();
    wake();
  }

  let flip = false, off = null;
  const SLOW = gl ? 30 : 46;
  const stop = () => { running = false; if (off) { off(); off = null; } };
  // Кадры приходят из общего метронома (js/clock.js): на экранах 120+ Гц частицы рисуются не в каждом кадре.
  function frame(now, tick) {
    if (!running || !tick) return;
    if (!gl && (flip = !flip)) return; // без WebGL рисуем через раз: около 30 кадров в секунду
    const raw = now - last;
    const dt = Math.min(raw / 1000, 0.05); last = now;
    if (raw > SLOW && raw < 400) { if (++slow > 24 && drawN > MIN_N) { drawN = Math.max(MIN_N, Math.round(drawN * 0.72)); slow = 0; quick = 0; } }
    else if (raw < 19 && ++quick > 240) { slow = 0; quick = 0; }
    const k = 1 - Math.exp(-dt * 4), kf = 1 - Math.exp(-dt * 9);
    S.time += dt * (reduced ? 0.25 : 1);
    if (S.mix < 1) S.mix = Math.min(1, S.mix + dt / (reduced ? 0.01 : 1.5));
    S.burst += (S.burstT - S.burst) * (1 - Math.exp(-dt * 3.2));
    S.alpha += (S.alphaT - S.alpha) * kf;
    S.wave += (S.waveT - S.wave) * k;
    S.scale += (S.scaleT - S.scale) * k;
    S.add += (S.addT - S.add) * kf;
    for (let i = 0; i < 2; i++) S.off[i] += (S.offT[i] - S.off[i]) * k;
    for (let i = 0; i < 3; i++) { S.c1[i] += (S.c1T[i] - S.c1[i]) * k; S.c2[i] += (S.c2T[i] - S.c2[i]) * k; }
    S.mx += (S.mouse[0] > 2 ? -S.mx : S.mouse[0] - S.mx) * k * 0.6;
    S.my += (S.mouse[0] > 2 ? -S.my : S.mouse[1] - S.my) * k * 0.6;
    const target = name === 'spectre' ? S.rot + dt * 0.9 : Math.sin(S.time * 0.45) * 0.42 + S.mx * 0.35;
    S.rot += (target - S.rot) * (name === 'spectre' ? 0.25 : k * 0.8);
    S.tilt += (-S.my * 0.22 - S.tilt) * k;

    if (gl) { trackRegion(dt); drawGL(); } else draw2D();

    if (S.alpha < 0.004 && S.alphaT < 0.004) {
      stop();
      if (gl) gl.clear(gl.COLOR_BUFFER_BIT); else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
      // Пустой холст убираем совсем: даже прозрачный, он остаётся полноэкранным слоем, который видеокарта смешивает в каждом кадре.
      canvas.style.display = 'none';
    }
  }
  function wake() {
    if (running || document.hidden) return;
    if (canvas.style.display) canvas.style.display = '';
    running = true; last = performance.now(); off = subscribe(frame, canvas);
  }

  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else wake(); });
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    S.mouse[0] = (e.clientX / W) * 2 - 1; S.mouse[1] = -((e.clientY / H) * 2 - 1);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { S.mouse[0] = 9; });
  if (gl) canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); });
  resize();

  return {
    canvas,
    mode: gl ? 'webgl' : '2d',
    lighten() { drawN = Math.max(MIN_N, Math.round(drawN * 0.6)); },
    info() {
      let gpu = '';
      if (gl) { const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'WebGL'; }
      return { mode: gl ? 'webgl' : '2d', count: drawN, gpu };
    },
    morph(next) {
      if (next === name) return;
      if (S.mix < 1) {
        for (let i = 0; i < N; i++) {
          let m = Math.min(1, Math.max(0, S.mix * 1.6 - rnd[i * 4] * 0.6)); m = m * m * (3 - 2 * m);
          for (let j = 0; j < 3; j++) { const k = i * 3 + j; from[k] += (to[k] - from[k]) * m; }
        }
      } else from.set(to);
      to = shape(next);
      if (next === 'spectre') S.rot = S.rot % 6.283;
      else S.rot = ((S.rot + Math.PI) % 6.283 + 6.283) % 6.283 - Math.PI;
      name = next; S.mix = 0; S.waveT = next === 'spectre' ? 1 : 0;
      if (gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bFrom); gl.bufferSubData(gl.ARRAY_BUFFER, 0, from);
        gl.bindBuffer(gl.ARRAY_BUFFER, bTo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, to);
      }
      wake();
    },
    palette(c1, c2, add, instant) {
      S.c1T = hex(c1); S.c2T = hex(c2); S.addT = add ? 1 : 0;
      if (instant) { S.c1 = S.c1T.slice(); S.c2 = S.c2T.slice(); S.add = S.addT; }
      wake();
    },
    place(x, y, scale, instant) {
      S.offT = [x, y]; S.scaleT = scale;
      if (instant) { S.off = [x, y]; S.scale = scale; }
    },
    alpha(a) { S.alphaT = a; if (a > 0.004) wake(); },
    burst(v, instant) { S.burstT = v; if (instant) S.burst = v; wake(); },
  };
}
