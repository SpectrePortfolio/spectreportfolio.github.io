// Каркас для модели без скелета (цельная фигурка из генератора).
// Кости и веса вершин считаются по форме: ноги, туловище, голова, уши. Движения — формулами, без записанных анимаций.
// Все размеры в настройках — доли высоты фигурки: 0 — подошвы, 1 — макушка.
import * as THREE from 'three';

const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// Движения: name → [длительность, функция(u — доля времени, s — секунды) → поза]
// Поза: sq — сжатие по высоте, lift — подъём, hx/hy/hz — голова (кивок, поворот, наклон), bx/bz — туловище, ear — уши.
const env = (u) => Math.sin(Math.PI * Math.min(1, u));
const MOVES = {
  Idle: [0, () => ({})],
  Yes: [1.25, (u) => ({ hx: 0.3 * Math.sin(u * Math.PI * 4) * env(u), bx: 0.035 * env(u) })],
  No: [1.25, (u) => ({ hy: 0.42 * Math.sin(u * Math.PI * 4) * env(u) })],
  // приветствие: подпрыгивает на месте, склонив голову набок, уши ходят
  Wave: [1.5, (u) => ({ lift: 0.05 * Math.abs(Math.sin(u * Math.PI * 3)) * env(u), sq: -0.03 * env(u), hz: 0.2 * Math.sin(u * Math.PI * 3) * env(u), hx: -0.08 * env(u), ear: 0.3 * Math.sin(u * Math.PI * 8) * env(u) })],
  Duck: [1.1, (u) => ({ sq: 0.2 * Math.pow(env(u), 0.6), hx: 0.16 * env(u), ear: -0.25 * env(u) })],
  Jump: [0, (u, s) => ({ sq: 0.2 * Math.min(1, s / 0.13), hx: 0.1 })],          // присел перед толчком
  Jump_Idle: [0, () => ({ sq: -0.1, hx: -0.14, ear: -0.4 })],                    // вытянулся в полёте, уши назад
  Jump_Land: [0.6, (u, s) => ({ sq: 0.27 * Math.exp(-s * 6.5) * Math.cos(s * 21), hx: 0.2 * Math.exp(-s * 7), ear: 0.35 * Math.exp(-s * 6) * Math.sin(s * 24) })],
};
const KEYS = ['sq', 'lift', 'hx', 'hy', 'hz', 'bx', 'bz', 'ear'];

export function buildRig(src, cfg) {
  const H = cfg.height;
  src.updateMatrixWorld(true);
  // рост и подошвы считаются по телу; слой-кайма (он чуть шире) в расчёт не идёт
  const box = new THREE.Box3();
  src.traverse((o) => { if (o.isMesh && !o.userData.fringe) box.expandByObject(o); });
  const size = box.getSize(new THREE.Vector3());
  const k = H / size.y;
  // фигурка приводится к нужному росту, подошвы — в ноль, середина — на ось
  const fit = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + size.x / 2), -box.min.y, -(box.min.z + size.z / 2)));
  if (cfg.yaw) fit.premultiply(new THREE.Matrix4().makeRotationY(cfg.yaw));

  const group = new THREE.Group();
  const root = new THREE.Bone(), body = new THREE.Bone(), head = new THREE.Bone();
  const ears = (cfg.ears || []).map(() => new THREE.Bone());
  root.add(body); body.add(head); for (const e of ears) head.add(e);
  const nz = cfg.neckZ || 0;
  body.position.set(0, cfg.hip * H, 0);
  head.position.set(0, (cfg.neck - cfg.hip) * H, nz * H);
  head.rotation.order = 'YXZ';
  ears.forEach((e, i) => { const c = cfg.ears[i]; e.position.set(c[0] * H, (c[1] - cfg.neck) * H, (c[2] - nz) * H); });
  group.add(root);
  group.updateMatrixWorld(true);
  const bones = [root, body, head, ...ears];
  const skeleton = new THREE.Skeleton(bones);

  const v = new THREE.Vector3();
  src.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone();
    // сжатая модель хранит позиции и нормали целыми числами — перед пересчётом переводим в обычные
    for (const name of ['position', 'normal']) {
      const a = geo.attributes[name]; if (!a || a.array instanceof Float32Array) continue;
      const f = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
      geo.setAttribute(name, new THREE.BufferAttribute(f, 3));
    }
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(fit, o.matrixWorld));
    const pos = geo.attributes.position, n = pos.count;
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const dbg = cfg.debug ? new Float32Array(n * 3) : null;
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).divideScalar(H);
      // голова начинается выше шеи; у щёк, свисающих по бокам, граница опущена
      const thr = cfg.neck - (cfg.cheekDrop || 0) * sstep(cfg.cheekX[0], cfg.cheekX[1], Math.abs(v.x));
      const wh = sstep(thr - cfg.neckBlend, thr + cfg.neckBlend, v.y);
      let we = 0, ei = 0;
      ears.forEach((e, j) => {
        const c = cfg.ears[j];
        const d = Math.hypot(v.x - c[0], v.y - c[1], v.z - c[2]);
        const w = 1 - sstep(c[3] * 0.45, c[3], d);
        if (w > we) { we = w; ei = j; }
      });
      we *= wh;
      const wb = (1 - wh) * sstep(cfg.hip - cfg.hipBlend, cfg.hip + cfg.hipBlend, v.y);
      si.set([0, 1, 2, 3 + ei], i * 4);
      sw.set([1 - wh - wb, wb, wh - we, we], i * 4);
      if (dbg) dbg.set([wh - we, wb, we], i * 3);
    }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    let mat = o.material;
    if (dbg) { geo.setAttribute('color', new THREE.BufferAttribute(dbg, 3)); mat = new THREE.MeshBasicMaterial({ vertexColors: true }); }
    const mesh = new THREE.SkinnedMesh(geo, mat);
    mesh.castShadow = !o.userData.fringe; mesh.frustumCulled = false;
    if (o.userData.fringe && dbg) mesh.visible = false;
    group.add(mesh);
    mesh.bind(skeleton, new THREE.Matrix4());
  });

  const clips = {}; for (const name in MOVES) clips[name] = true;
  const st = { cur: 'Idle', s: 0, once: false };
  const p = {}; for (const key of KEYS) p[key] = 0;
  let t = 0, twitch = 3, tw = -1, twEar = 0;

  function act(name, once) {
    if (!MOVES[name]) return false;
    if (st.cur === name && !once) return true;
    st.cur = name; st.s = 0; st.once = !!once;
    return true;
  }
  function apply(dt, snap) {
    const [dur, fn] = MOVES[st.cur];
    const goal = fn(dur ? st.s / dur : 0, st.s);
    const a = snap ? 1 : 1 - Math.exp(-dt * 22);
    for (const key of KEYS) p[key] += ((goal[key] || 0) - p[key]) * a;
    // дыхание и лёгкое покачивание идут всегда
    const breath = Math.sin(t * 1.9);
    root.scale.set(1 + p.sq * 0.5, 1 - p.sq, 1 + p.sq * 0.5);
    root.position.y = p.lift * H;
    body.scale.set(1 + breath * 0.006, 1 + breath * 0.011, 1 + breath * 0.012);
    body.rotation.set(p.bx + Math.sin(t * 0.7) * 0.008, 0, p.bz + Math.sin(t * 0.55) * 0.012);
    head.rotation.set(p.hx + Math.sin(t * 1.3) * 0.016, p.hy + Math.sin(t * 0.43) * 0.02, p.hz + Math.sin(t * 0.8 + 1) * 0.022);
    const flick = tw >= 0 ? Math.sin(tw * Math.PI) * 0.4 : 0;
    ears.forEach((e, i) => {
      const side = cfg.ears[i][0] < 0 ? -1 : 1;
      e.rotation.z = -side * (p.ear + (twEar === i ? flick : 0));
      e.rotation.x = -Math.abs(p.ear) * 0.5;
    });
  }
  function update(dt) {
    t += dt; st.s += dt;
    const dur = MOVES[st.cur][0];
    if (st.once && dur && st.s >= dur) { st.cur = 'Idle'; st.s = 0; st.once = false; }
    twitch -= dt;
    if (twitch < 0 && ears.length) { twitch = 3.5 + Math.random() * 5; tw = 0; twEar = Math.floor(Math.random() * ears.length); }
    if (tw >= 0) { tw += dt / 0.28; if (tw >= 1) tw = -1; }
    apply(dt, false);
  }
  // застывший кадр движения — для проверки (?act=Yes&at=0.5)
  function pose(name, at) { if (MOVES[name]) { st.cur = name; st.s = at; st.once = false; apply(0, true); } }

  return { group, clips, head, act, update, pose, busy: () => st.cur !== 'Idle' };
}
