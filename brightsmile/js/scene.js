// BrightSmile — 3D-сцена: зуб на постаменте, персонаж, неоновый контур, зал клиники.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildRig } from './mascot-rig.js';

// Персонаж — хомяк Брайти: цельная фигурка без скелета (форма из генератора по картинке клиента, картинка наложена
// спереди как текстура, спина и бока докрашены цветом вершин). Кости и движения строит mascot-rig.js.
// Чтобы вернуть персонажа, собранного в коде, откройте страницу с ?proc.
const QS = new URLSearchParams(location.search);
const MASCOT = {
  url: 'models/mascot.glb', yaw: 0, height: 2.42,
  // каркас — доли высоты фигурки (см. mascot-rig.js); ?weights показывает раскладку по костям
  rig: { neck: 0.5, neckBlend: 0.03, neckZ: 0, cheekX: [0.12, 0.22], cheekDrop: 0.05, hip: 0.2, hipBlend: 0.07, ears: [[-0.27, 0.81, 0, 0.1], [0.21, 0.88, 0, 0.1]] },
};
// Параметры адреса для проверки: ?model=путь&yaw=&h= — другая модель, ?cam=x,y,z,tx,ty,tz — камера вплотную без интерфейса,
// ?act=Wave&at=0.5 — застывший кадр анимации, ?look=x,y — направление взгляда, ?still — без вступления,
// ?q=N — уровень качества, ?aa=0/1 — сглаживание, ?nogl — вид без WebGL, ?prof — без ограничения кадров (замер).
// ?model= принимает только файлы из папки models этого сайта — чужой адрес подставить нельзя
const ASKED = QS.get('model');
const MODEL = QS.has('proc') ? null : (ASKED && /^models\/[\w-]+\.glb$/.test(ASKED) ? ASKED : MASCOT.url);
const OWN = MODEL === MASCOT.url;
const MODEL_YAW = parseFloat(QS.get('yaw') || (OWN ? MASCOT.yaw : 0));
const MODEL_H = parseFloat(QS.get('h') || (OWN ? MASCOT.height : 2.25));
const POSE = QS.get('act');
const LOOK = QS.get('look') ? QS.get('look').split(',').map(Number) : null;
if (QS.get('cam')) document.documentElement.classList.add('dbg');
const DEBUG_CAM = QS.get('cam') ? QS.get('cam').split(',').map(Number) : null;
const PROF = QS.has('prof');
const STILL = QS.has('still');

const canvas = document.getElementById('stage');
const root = document.documentElement;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

// Встроенные и мобильные видеокарты начинают с уровня качества пониже.
function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return name || '';
  } catch (e) { return ''; }
}
const LOW_GPU = QS.has('low') || /Intel|UHD|Iris|HD Graphics|Mali|Adreno \(TM\) [1-5]|PowerVR|Microsoft Basic/i.test(gpuName());

let renderer;
try {
  if (QS.has('nogl')) throw new Error('nogl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: QS.get('aa') !== '0', powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true });
} catch (e) {
  root.classList.add('no-gl');
  emit('bs:ready');
}

if (renderer) start();

function start() {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;           // тени обновляются один раз за кадр, вручную
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;

  const scene = new THREE.Scene();
  const BG = new THREE.Color('#141c10');
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 13, 30);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.34;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const mirrorCam = new THREE.PerspectiveCamera(30, 1, 0.1, 80);   // камера под полом — для отражений
  mirrorCam.layers.set(1);
  const REFL = 1;                                                    // слой предметов, которые отражаются в полу
  const reflect = (o) => { o.traverse((c) => c.layers.enable(REFL)); return o; };

  // ── Свет ────────────────────────────────────────────────────────────
  // Освещение зала запечено в текстуры стены и пола; настоящий свет нужен только зубу, постаменту и персонажу.
  const hemi = new THREE.HemisphereLight('#ffe7b0', '#22331c', 0.72);
  const key = new THREE.DirectionalLight('#fff1d6', 1.75);
  key.position.set(-3.5, 7.5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -2;
  key.shadow.camera.near = 1; key.shadow.camera.far = 22;
  key.shadow.bias = -0.0006;
  const rimL = new THREE.PointLight('#ffc23a', 34, 14, 2);
  rimL.position.set(1.2, 3.6, -2.6);
  scene.add(reflect(hemi), reflect(key), reflect(rimL));

  // ── Зал ─────────────────────────────────────────────────────────────
  const room = new THREE.Group();
  scene.add(room);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const lam = (o) => new THREE.MeshLambertMaterial({ color: o.color, side: o.side || THREE.FrontSide });   // матовые предметы зала
  const glow = (color, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });

  // пол: запечённый свет + отражение предметов; обычные источники света на него не считаются
  const reflRT = new THREE.WebGLRenderTarget(4, 4);
  const floorMat = new THREE.ShaderMaterial({
    uniforms: {
      tRefl: { value: reflRT.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uRefl: { value: 1 },
      uCam: { value: new THREE.Vector3() }, uBg: { value: BG.clone() }, uFog: { value: new THREE.Vector2(13, 30) },
    },
    vertexShader: `
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform sampler2D tRefl; uniform vec2 uRes, uFog; uniform float uRefl; uniform vec3 uCam, uBg;
      varying vec3 vW;
      void main(){
        float d = length(vW.xz);
        vec3 col = mix(vec3(0.034, 0.034, 0.019), vec3(0.011, 0.015, 0.008), smoothstep(1.5, 15.0, d));
        vec2 a = vW.xz - vec2(0.0, 0.4), b = vW.xz - vec2(7.0, -0.6);
        col += vec3(1.0, 0.6, 0.16) * (0.05 * exp(-dot(a, a) / 16.0) + 0.035 * exp(-dot(b, b) / 12.0));
        vec3 V = normalize(uCam - vW);
        if (uRefl > 0.0) {
          vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1.0 - uv.y;
          vec2 px = 2.2 / uRes;
          vec3 r = texture2D(tRefl, uv).rgb * 0.36
                 + (texture2D(tRefl, uv + vec2(px.x, 0.0)).rgb + texture2D(tRefl, uv - vec2(px.x, 0.0)).rgb
                 +  texture2D(tRefl, uv + vec2(0.0, px.y * 1.6)).rgb + texture2D(tRefl, uv - vec2(0.0, px.y * 1.6)).rgb) * 0.16;
          float fres = pow(1.0 - max(V.y, 0.0), 2.5);
          col += r * uRefl * (0.16 + 0.6 * fres);
        }
        col = mix(col, uBg, smoothstep(uFog.x, uFog.y, length(uCam - vW)));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 48), floorMat);
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  // тени ловит небольшой круг под постаментом — так расчёт тени идёт не по всему полу
  const catcher = new THREE.Mesh(new THREE.CircleGeometry(6.5, 40), new THREE.ShadowMaterial({ opacity: 0.5 }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.006; catcher.receiveShadow = true; catcher.renderOrder = 1;
  room.add(catcher);

  // стена: градиент с тёплым пятном от неона нарисован заранее
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 16), new THREE.MeshBasicMaterial({ map: wallTex(), fog: false }));
  wall.position.set(0, 8, -7.5);
  room.add(wall);
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 9, 0.12), new THREE.MeshBasicMaterial({ color: '#1f2716', fog: false }), 26);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 26; i++) { m4.setPosition(-15.5 + i * 0.42, 4.5, -7.4); slats.setMatrixAt(i, m4); }
  room.add(slats);
  // картины слева
  for (const [x, w] of [[-7.6, 1.5], [-5.4, 1.3]]) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w, 2.1, 0.08), lam({ color: '#55603c' }));
    fr.position.set(x, 4.3, -7.3);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, 1.8), lam({ color: '#6f7a52' }));
    inner.position.set(x, 4.3, -7.25);
    room.add(fr, inner);
  }
  // стойка ресепшена справа
  const desk = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 1.5, 48, 1, true, Math.PI * 1.02, Math.PI * 0.62), lam({ color: '#8a6a3c', side: THREE.DoubleSide }));
  desk.position.set(10.2, 0.85, -3.2);
  const deskTop = new THREE.Mesh(new THREE.RingGeometry(3.7, 4.35, 48, 1, Math.PI * 0.52, Math.PI * 0.62), lam({ color: '#cdbf9f' }));
  deskTop.rotation.x = -Math.PI / 2;
  deskTop.position.set(10.2, 1.61, -3.2);
  const strip = new THREE.Mesh(new THREE.CylinderGeometry(4.22, 4.22, 0.07, 48, 1, true, Math.PI * 1.02, Math.PI * 0.62), glow('#ffb52e', 2.6));
  strip.position.set(10.2, 0.12, -3.2);
  const strip2 = strip.clone(); strip2.position.y = 1.52;
  room.add(desk, deskTop, reflect(strip), strip2);
  // полки справа
  for (const y of [4.6, 5.9]) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.1, 0.7), lam({ color: '#6b5a36' }));
    sh.position.set(8.2, y, -7.0);
    const led = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.03, 0.05), glow('#ffc04a', 2.2));
    led.position.set(8.2, y - 0.07, -6.7);
    room.add(sh, led);
    for (let i = 0; i < 4; i++) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3 + (i % 2) * 0.18, 16), lam({ color: i % 2 ? '#d9cfb4' : '#5d7a45' }));
      pot.position.set(6.3 + i * 1.25 + (y > 5 ? 0.4 : 0), y + 0.22, -7.0);
      room.add(pot);
    }
  }
  // подвесные лампы
  const spotTex = radialTex('rgba(255,178,60,1)');
  const lamps = [[-8.2, 5.6, -2.5], [1.6, 7.3, -5.5], [3.0, 7.0, -5.8], [9.5, 7.4, -5]];
  for (const [x, y, z] of lamps) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 6, 6), lam({ color: '#111111' }));
    cord.position.set(x, y + 3.3, z);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.42, 28, 1, true), lam({ color: '#2f3a22', side: THREE.DoubleSide }));
    shade.position.set(x, y + 0.2, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), glow('#ffd98a', 3.2));
    bulb.position.set(x, y + 0.05, z);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: spotTex, color: '#ffe2a8', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(x, y + 0.02, z); sp.scale.setScalar(1.5);
    room.add(cord, shade, reflect(bulb), sp);
  }
  // растения — тёмные кроны по краям
  const leafM = lam({ color: '#274a22' });
  const leafG = new THREE.SphereGeometry(1, 10, 8);
  const plant = (x, z, s) => {
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const l = new THREE.Mesh(leafG, leafM);
      const a = i * 2.4, r = 0.35 + (i % 3) * 0.22;
      l.position.set(Math.cos(a) * r, 1.3 + (i % 4) * 0.42, Math.sin(a) * r);
      l.scale.set(0.5, 0.16, 0.24);
      l.rotation.set(0.5 * Math.sin(a), a, 0.7);
      g.add(l);
    }
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.85, 20), lam({ color: '#d6ccb2' }));
    pot.position.y = 0.42;
    g.add(pot);
    g.position.set(x, 0, z); g.scale.setScalar(s);
    room.add(reflect(g));
  };
  plant(-9.5, -4.5, 1.5); plant(4.6, -6.2, 1.25); plant(-6.4, 2.2, 1.1);

  // ── Неоновый контур зуба ───────────────────────────────────────────
  const neonPts = [[0, 0.62], [0.42, 0.98], [0.9, 0.86], [1.06, 0.3], [0.93, -0.4], [0.72, -1.2], [0.5, -1.42], [0.34, -0.9], [0.18, -0.42], [0, -0.3]];
  const full = neonPts.concat(neonPts.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
  const curve = new THREE.CatmullRomCurve3(full.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'catmullrom', 0.5);
  const neonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc14a') });
  const neon = new THREE.Mesh(new THREE.TubeGeometry(curve, 260, 0.016, 12, true), neonMat);
  neon.position.set(1.15, 3.55, -3.4);
  neon.scale.setScalar(2.35);
  scene.add(reflect(neon));
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({
    map: radialTex('rgba(255,190,70,0.22)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.position.set(1.1, 3.4, -3.6);
  scene.add(halo);
  // свечение неона: полупрозрачные оболочки вокруг трубки вместо полноэкранного эффекта
  const glowMats = [];
  for (const [r, o] of [[0.034, 0.2], [0.07, 0.055]]) {
    const gm = new THREE.MeshBasicMaterial({ color: '#ffb640', transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending });
    gm.userData.o = o;
    glowMats.push(gm);
    const g = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, r, 8, true), gm);
    g.position.copy(neon.position); g.scale.copy(neon.scale);
    scene.add(reflect(g));
  }
  // пятна света на полу
  const pool = (x, z, w, d, o) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: spotTex, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); m.renderOrder = 2;
    scene.add(m);
    return m;
  };
  const pedPool = pool(0, 0.3, 8.5, 7.5, 0.3);
  pool(7.2, -0.4, 9, 6, 0.26);

  // ── Постамент и зуб ────────────────────────────────────────────────
  const stage = new THREE.Group();
  scene.add(stage);
  const spin = new THREE.Group();   // всё, что крутится рукой
  stage.add(spin);

  const wood = std({ color: '#a8824c', roughness: 0.5, metalness: 0.05 });
  const prof = [[1.02, 0.0], [1.95, 0.0], [1.98, 0.06], [1.98, 0.3], [1.9, 0.38], [1.12, 0.38], [1.02, 0.3], [1.02, 0.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const ped = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), wood);
  ped.castShadow = true; ped.receiveShadow = true;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.03, 48), std({ color: '#15130c', roughness: 1 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.02;
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.035, 10, 90), glow('#ffb82e', 2.0));
  ledRing.rotation.x = Math.PI / 2; ledRing.position.y = 0.04;
  // кольцо-всплеск при приземлении персонажа
  const burst = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  burst.rotation.x = -Math.PI / 2; burst.position.y = 0.42; burst.visible = false;
  stage.add(ped, hole, ledRing, burst);

  const TOOTH_Y = 1.42, TOOTH_S = 1.12;
  const tooth = new THREE.Mesh(toothGeometry(), new THREE.MeshPhysicalMaterial({
    color: '#ebe4d2', roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.14, sheen: 0.4, sheenColor: new THREE.Color('#fff3cf'), sheenRoughness: 0.5,
  }));
  tooth.castShadow = true; tooth.receiveShadow = true;
  tooth.position.y = TOOTH_Y;
  tooth.scale.setScalar(TOOTH_S);
  spin.add(tooth);
  reflect(stage);
  const FEET_Y = 2.455, MS = 1.4;

  // ── Персонаж ───────────────────────────────────────────────────────
  const LDIR = key.position.clone().normalize();
  const mascot = new THREE.Group();
  mascot.position.y = FEET_Y;
  mascot.scale.setScalar(MS);
  mascot.visible = STILL;
  spin.add(mascot);

  let model = null, proc = null, ready = false;
  const setReady = () => { ready = true; reflect(mascot); emit('bs:ready'); };
  // запасной персонаж из кода: отдельный файл, грузится только при ?proc или если модель не открылась
  const useProc = () => import('./mascot-proc.js').then((m) => { proc = m.buildProc(LDIR); mascot.add(proc.group); setReady(); });
  if (!MODEL) useProc();
  if (MODEL) {
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(MODEL, (g) => {
      const obj = g.scene;
      obj.updateMatrixWorld(true);
      if (!g.animations.length) {
        // цельная фигурка без скелета: кости и движения строятся в коде
        obj.traverse((o) => {
          if (!o.isMesh || !o.material.map) return;
          if (o.material.name === 'Fringe') { o.userData.fringe = true; o.material = fringeMaterial(o.material.map); }
          else if (o.geometry.attributes.color) o.material = furMaterial(o.material.map);
        });
        const rig = buildRig(obj, { ...MASCOT.rig, height: MODEL_H, yaw: MODEL_YAW, debug: QS.has('weights') });
        mascot.add(rig.group);
        model = { rig, clips: rig.clips, head: rig.head, cur: null };
        setReady();
        return;
      }
      // модель со своим скелетом и записанными анимациями (?model=…)
      let headBone = null;
      obj.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
        if (o.isBone && !headBone && /^head$/i.test(o.name)) headBone = o;
      });
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const k = MODEL_H / size.y;
      obj.scale.multiplyScalar(k);
      obj.position.set(-(box.min.x + size.x / 2) * k, -box.min.y * k, -(box.min.z + size.z / 2) * k);
      const turn = new THREE.Group(); turn.rotation.y = MODEL_YAW; turn.add(obj);
      mascot.add(turn);
      const mixer = new THREE.AnimationMixer(obj);
      const clips = {};
      for (const c of g.animations) clips[c.name.split('|').pop().replace(/^Robot_/, '')] = mixer.clipAction(c);
      model = { mixer, clips, head: headBone, cur: null };
      mixer.addEventListener('finished', () => act('Idle'));
      act('Idle');
      setReady();
    }, undefined, useProc);
  }
  // Материал хомяка: спереди — картинка, там, где её не видно (вес в альфе цвета вершины), — цвет вершины с рисунком шерсти.
  // Кайма: тонкий слой с рисунком по срединной поверхности фигуры. Тело модели его закрывает, наружу выглядывает только
  // мягкий пушистый край шерсти с картинки. Виден только спереди: при повороте плавно гаснет, тело остаётся цельным.
  function fringeMaterial(map) {
    const mat = new THREE.MeshBasicMaterial({ map, alphaToCoverage: true, toneMapped: false, side: THREE.DoubleSide, fog: false });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec3 vFrontN; varying vec3 vView;`)
        .replace('#include <skinnormal_vertex>', `#include <skinnormal_vertex>
          #ifdef USE_SKINNING
            vFrontN = normalMatrix * (skinMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz;
          #else
            vFrontN = normalMatrix * vec3(0.0, 0.0, 1.0);
          #endif`)
        .replace('#include <project_vertex>', `#include <project_vertex>
          vView = -mvPosition.xyz;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vFrontN; varying vec3 vView;`)
        .replace('#include <map_fragment>', `
          vec4 texel = texture2D(map, vMapUv);
          float frontView = smoothstep(0.62, 0.9, dot(normalize(vFrontN), normalize(vView)));
          diffuseColor = vec4(texel.rgb, texel.a * frontView);
          if (diffuseColor.a < 0.06) discard;`);
    };
    return mat;
  }
  function furMaterial(map) {
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    // Спереди хомяк — это сама картинка клиента: её цвета (без цветокоррекции сцены) и её свет. Чем сильнее модель
    // повёрнута, тем больше работает цвет вершин. Тело всегда цельное и непрозрачное; пушистый край даёт слой-кайма.
    const mat = new THREE.MeshPhysicalMaterial({
      map, vertexColors: true, roughness: 0.9, metalness: 0, envMapIntensity: 0.3, specularIntensity: 0.15,
      sheen: 0.3, sheenColor: new THREE.Color('#bfeef0'), sheenRoughness: 0.6,
      toneMapped: false,
    });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec3 vRest; varying vec3 vFrontN; varying float vRestNz;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vRest = position; vRestNz = normal.z;`)
        // куда сейчас смотрит «перёд» этой части тела (с учётом поворота головы) — в координатах камеры
        .replace('#include <skinnormal_vertex>', `#include <skinnormal_vertex>
          #ifdef USE_SKINNING
            vFrontN = normalMatrix * (skinMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz;
          #else
            vFrontN = normalMatrix * vec3(0.0, 0.0, 1.0);
          #endif`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uGlow;
          varying vec3 vRest; varying vec3 vFrontN; varying float vRestNz;
          float fh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          float fn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
                       mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
        .replace('#include <map_fragment>', `
          vec4 texel = texture2D(map, vMapUv);
          // насколько эта часть тела сейчас повёрнута к камере лицом (с учётом поворота головы)
          float frontView = smoothstep(0.6, 0.88, dot(normalize(vFrontN), normalize(vViewPosition)));
          vec3 fill = vColor.rgb;
          float furry = clamp((fill.b - fill.r) * 7.0, 0.0, 1.0);                    // шерсть бирюзовая, костюм серый
          // шерсть на спине и боках: тонкие волоски, вытянутые сверху вниз, в два слоя, и крупные мягкие пятна — без повторов
          vec3 fp = vec3(vRest.x * 56.0, vRest.y * 8.5, vRest.z * 56.0);
          float strand = fn(fp) * 0.5 + fn(fp * vec3(2.1, 1.7, 2.1) + 7.3) * 0.3 + fn(vRest * 3.3 + 2.0) * 0.2;
          fill *= mix(1.0, 0.76 + strand * 0.5, furry);
          // в альфе цвета вершины два веса: строгий (картинке можно верить под любым углом) и свободный (только анфас)
          float wLoose = min(1.0, vColor.a * 2.0), wStrict = max(0.0, vColor.a * 2.0 - 1.0);
          float wPhoto = mix(wStrict, wLoose, frontView);
          // у самого контура рисунка картинка полупрозрачна — там вместо неё берётся заливка, чтобы не подмешивался фон
          wPhoto *= smoothstep(0.55, 0.95, texel.a);
          // у самой кромки картинка годится только строго анфас: чуть сбоку светлые волоски края растягиваются в блики,
          // поэтому при повороте кромка переходит на заливку
          float fvRaw = dot(normalize(vFrontN), normalize(vViewPosition));
          float nearEdge = 1.0 - smoothstep(0.62, 0.97, texture2D(map, vMapUv, 4.6).a);
          wPhoto *= 1.0 - nearEdge * (1.0 - smoothstep(0.9, 0.985, fvRaw));
          diffuseColor.rgb = mix(fill, texel.rgb, wPhoto);
          float furFill = furry * (1.0 - wPhoto);
          float furMask = mix(furry, clamp((texel.b - texel.r) * 5.0, 0.0, 1.0), wPhoto);`)
        .replace('#include <color_fragment>', '')
        // картинка уже нарисована со своим светом: большая часть её яркости идёт как собственное свечение
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += diffuseColor.rgb * uGlow;
          // мягкая светлая кайма по краю меха на спине и боках — как у пушистой шерсти против света
          float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4);
          totalEmissiveRadiance += vec3(0.62, 0.9, 0.9) * rim * 0.3 * furFill;
          diffuseColor.rgb *= 1.0 - uGlow;`)
        .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
          material.sheenColor *= furMask;`);
      sh.uniforms.uGlow = { value: parseFloat(QS.get('glow') || '0.82') };
    };
    return mat;
  }
  // переключить анимацию модели: once — проиграть один раз и вернуться к Idle
  function act(name, once, fade = 0.22) {
    if (model && model.rig) return model.rig.act(name, once);
    const a = model && model.clips[name];
    if (!a) return false;
    if (model.cur === a && !once) return true;
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    if (model.cur && model.cur !== a) a.crossFadeFrom(model.cur, fade, false);
    a.play();
    model.cur = a;
    return true;
  }
  const busy = () => !!(model && (model.rig ? model.rig.busy() : model.cur && model.cur !== model.clips.Idle));

  // ── Пылинки в свете ────────────────────────────────────────────────
  const dustN = 110, dustP = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustP[i * 3] = (Math.random() - 0.5) * 13; dustP[i * 3 + 1] = 0.6 + Math.random() * 6.5; dustP[i * 3 + 2] = -4 + Math.random() * 9; }
  const dustG = new THREE.BufferGeometry();
  dustG.setAttribute('position', new THREE.BufferAttribute(dustP, 3));
  const dust = new THREE.Points(dustG, new THREE.PointsMaterial({
    map: radialTex('rgba(255,226,165,1)'), size: 0.075, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  // ── Уровни качества ────────────────────────────────────────────────
  // Сцена рисуется напрямую, без полноэкранных эффектов. Если кадры идут медленно, она сама снижает
  // разрешение, затем отключает отражения в полу и тени.
  const RAW = window.devicePixelRatio || 1;
  const TIERS = [];
  for (const [pr, shadow, refl] of [[1.5, true, true], [1.25, true, true], [1.0, true, true], [0.85, true, false], [0.7, false, false], [0.55, false, false]]) {
    const v = Math.min(RAW, pr), prev = TIERS[TIERS.length - 1];
    if (!prev || prev.pr - v > 0.05 || prev.shadow !== shadow || prev.refl !== refl) TIERS.push({ pr: v, shadow, refl: refl && QS.get('refl') !== '0' });
  }
  const FIXED_Q = QS.has('q');
  const LOW_START = 1.25;              // с какого разрешения начинают встроенные видеокарты
  let saved = -1;
  try { saved = parseInt(sessionStorage.getItem('bs-q') || '-1', 10); } catch (e) {}
  let tier = FIXED_Q ? parseInt(QS.get('q'), 10) || 0 : Math.max(saved, LOW_GPU ? TIERS.findIndex((q) => q.pr <= LOW_START) : 0, 0);
  tier = clamp(tier, 0, TIERS.length - 1);
  let W = 0, H2 = 0, narrow = false, sized = false;
  const buf = new THREE.Vector2();
  function applyTier() {
    const q = TIERS[tier];
    renderer.setPixelRatio(q.pr);
    if (W) {
      renderer.setSize(W, H2, false);
      renderer.getDrawingBufferSize(buf);
      floorMat.uniforms.uRes.value.copy(buf);
      reflRT.setSize(Math.max(2, Math.round(buf.x * 0.5)), Math.max(2, Math.round(buf.y * 0.5)));
    }
    floorMat.uniforms.uRefl.value = q.refl ? 1 : 0;
    key.castShadow = q.shadow;
    catcher.visible = q.shadow;
    root.dataset.q = tier;
  }
  // Два признака перегрузки: медленно идут кадры самой сцены или страница начала пропускать кадры экрана.
  let warm = 90, qn = 0, qsum = 0, bad = 0, gn = 0, glong = 0, gbad = 0, lastRaf = 0;
  function lower() {
    if (tier >= TIERS.length - 1) return;
    tier++; bad = 0; warm = 40; qn = qsum = gn = glong = 0;
    applyTier();
    try { sessionStorage.setItem('bs-q', tier); } catch (e) {}   // следующая страница начнёт сразу с подходящего уровня
  }
  function quality(ms) {
    if (ms > 250) return;                  // вкладка была в фоне — такой кадр не показатель
    if (warm > 0) { warm--; return; }      // первые полторы секунды идёт подготовка шейдеров
    qsum += ms;
    if (++qn < 45) return;
    const avg = qsum / qn; qn = 0; qsum = 0;
    bad = avg > 26 ? bad + 1 : 0;
    if (bad >= 2) lower();
  }
  function cadence(gap) {                  // gap — время между соседними кадрами экрана
    if (gap > 250 || warm > 0) return;
    gn++; if (gap > 22) glong++;
    if (gn < 240) return;
    const share = glong / gn; gn = glong = 0;
    gbad = share > 0.15 ? gbad + 1 : 0;
    if (gbad >= 2) { gbad = 0; lower(); }       // два окна подряд — значит, это не разовая заминка
  }

  // ── Размер и позы камеры ───────────────────────────────────────────
  const secs = { hero: document.getElementById('home'), about: document.getElementById('about'), book: document.getElementById('contact') };
  const M = { vh: 1, heroB: 0, aTop: 0, aboutB: 0, bTop: 0, bookB: 0 };   // раскладка разделов: меряется при изменении размеров, а не в каждом кадре
  function resize() {
    sized = true;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    M.vh = window.innerHeight;
    M.heroB = secs.hero.offsetTop + secs.hero.offsetHeight;
    M.aTop = secs.about.offsetTop; M.aboutB = M.aTop + secs.about.offsetHeight;
    M.bTop = secs.book.offsetTop; M.bookB = M.bTop + secs.book.offsetHeight;
    if (!w || !h || (w === W && h === H2)) return;
    W = w; H2 = h;
    narrow = w < 900;
    camera.aspect = mirrorCam.aspect = w / h;
    camera.updateProjectionMatrix(); mirrorCam.updateProjectionMatrix();
    applyTier();
  }
  applyTier();
  const ro = new ResizeObserver(() => { sized = false; });
  ro.observe(canvas); ro.observe(document.body);
  window.addEventListener('resize', () => { sized = false; });

  // [положение камеры], [точка взгляда], поворот персонажа к тексту
  const POSES = {
    hero: () => narrow ? [[0, 3.0, 24], [0, 6.3, 0], 0] : [[-0.45, 2.9, 14.6], [-0.45, 2.75, 0], 0],
    about: () => [[-0.7, 4.0, 12.4], [-2.45, 3.75, 0], -0.34],
    book: () => [[1.7, 3.9, 14.6], [4.1, 3.6, 0], 0.4],
  };
  const cam = { p: new THREE.Vector3(), t: new THREE.Vector3() };
  const goal = { p: new THREE.Vector3(), t: new THREE.Vector3(), face: 0 };
  let visible = true, orbit = 0, orbitT = 0, zone = 'hero', zoneT = -1;

  function target() {
    const vh = M.vh, y = window.scrollY;
    const on = (top, bottom) => bottom > y && top < y + vh;
    visible = narrow ? on(0, M.heroB) : (on(0, M.heroB) || on(M.aTop, M.aboutB) || on(M.bTop, M.bookB));
    let a, b, t, z;
    if (narrow) { a = b = POSES.hero(); t = 0; z = 'hero'; }
    else if (y < M.aTop + vh * 0.6) { a = POSES.hero(); b = POSES.about(); t = smooth(clamp(y / (M.aTop - vh * 0.1), 0, 1)); z = t > 0.8 ? 'about' : t < 0.2 ? 'hero' : zone; }
    else { a = b = POSES.book(); t = 0; z = y > M.bTop - vh * 0.45 ? 'book' : 'none'; }
    if (DEBUG_CAM) { a = b = [DEBUG_CAM.slice(0, 3), DEBUG_CAM.slice(3), 0]; visible = true; }
    goal.p.set(lerp(a[0][0], b[0][0], t), lerp(a[0][1], b[0][1], t), lerp(a[0][2], b[0][2], t));
    goal.t.set(lerp(a[1][0], b[1][0], t), lerp(a[1][1], b[1][1], t), lerp(a[1][2], b[1][2], t));
    goal.face = lerp(a[2], b[2], t);
    if (!narrow && y > M.aTop + vh * 0.6 && y < M.bTop - vh) { cam.p.copy(goal.p); cam.t.copy(goal.t); } // пока сцена закрыта — переставить без пролёта
    if (z !== zone) { zone = z; zoneT = z === 'about' || z === 'book' ? 0.45 : -1; }   // вошли в раздел — персонаж отреагирует
  }

  // ── Взаимодействие ─────────────────────────────────────────────────
  const ptr = { x: LOOK ? LOOK[0] : 0, y: LOOK ? LOOK[1] : 0 };
  const SPIN = QS.has('spin');                                   // ?spin=градусы — застывший поворот персонажа, для проверки
  let drag = null, yaw = SPIN ? parseFloat(QS.get('spin')) * Math.PI / 180 : 0, yawV = 0, lastTouch = 0, hop = 0, wave = 0;
  window.addEventListener('pointermove', (e) => {
    if (!LOOK) {
      ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    if (drag) {
      const dx = e.clientX - drag.x;
      drag.moved += Math.abs(dx);
      yawV = dx * 0.006; yaw += yawV; drag.x = e.clientX;
      lastTouch = performance.now();
    }
  }, { passive: true });
  const grab = document.querySelector('[data-grab]');
  grab.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a,button,.svc,.statbar,.callcard,input')) return;
    drag = { x: e.clientX, moved: 0 };
    root.classList.add('grabbing');
  });
  window.addEventListener('pointerup', (e) => {
    if (!drag) return;
    if (drag.moved < 6) poke(e);
    drag = null;
    root.classList.remove('grabbing');
  });
  const ray = new THREE.Raycaster();
  function poke(e) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    if (ray.intersectObject(spin, true).length) { cheer(); say('trick'); }
  }

  // Прыжок модели — три клипа подряд: толчок, полёт, приземление; высоту задаёт сцена.
  let air = null;       // { t, dur, h, from } — персонаж в воздухе
  let phase = STILL ? 'idle' : 'rise', sq = 0, sv = 0, burstT = -1, fidget = 8, greetT = -1;
  function jump(h = 0.72, dur = 0.6) {
    if (air || phase !== 'idle') return;
    if (model && model.clips.Jump_Idle) { act('Jump', true, 0.1); air = { t: -0.16, dur, h, from: 0 }; }
    else { hop = 1; }
  }
  function land(strength = 1) {
    air = null;
    mascot.position.y = FEET_Y;
    if (model && !act('Jump_Land', true, 0.06)) act('Idle');
    sv = 1.5 * strength;                      // зуб пружинит под весом
    burstT = 0;
    fidget = 9 + Math.random() * 5;
  }
  const TRICKS = ['Wave', 'Jump', 'Yes', 'Duck', 'ThumbsUp', 'Dance'];
  let trick = 0;
  function cheer(name) {
    if (phase !== 'idle') return;
    if (!model) { if (hop <= 0) hop = 1; wave = 1; return; }
    if (air) return;
    let n = typeof name === 'string' ? name : null;
    for (let i = 0; !n && i < TRICKS.length; i++) {
      const c = TRICKS[(trick + i) % TRICKS.length];
      if (c === 'Jump' || model.clips[c]) { n = c; trick = (trick + i + 1) % TRICKS.length; }
    }
    if (n === 'Jump') jump(); else if (n) act(n, true);
    fidget = 9 + Math.random() * 5;
  }
  // облачко с репликой: сцена сообщает странице точку рядом с головой персонажа
  const sayV = new THREE.Vector3();
  function say(kind) {
    if (narrow || orbit || window.scrollY > 80 || DEBUG_CAM) return;
    stage.updateMatrixWorld();
    sayV.set(1.2, FEET_Y + 2.75, 0.2).applyMatrix4(stage.matrixWorld).project(camera);
    emit('bs:say', { kind, x: (sayV.x * 0.5 + 0.5) * W, y: (-sayV.y * 0.5 + 0.5) * H2 });
  }
  window.addEventListener('bs:cheer', () => cheer('Jump'));
  window.addEventListener('bs:orbit', () => { orbit = 1; orbitT = 0; });

  // ── Кадр ───────────────────────────────────────────────────────────
  let rise = STILL ? 1 : 0, drop = 0, first = true, last = 0, t = 0, face = 0, frames = 0;
  const hv = new THREE.Vector2();
  const DROP_H = 8.5;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!sized) resize();
    target();
    if (!visible || document.hidden || !W) { last = 0; lastRaf = 0; return; }
    if (lastRaf && !FIXED_Q && !PROF) cadence(now - lastRaf);
    lastRaf = now;
    if (!PROF && last && now - last < 13.5) return;       // не чаще ~60 кадров в секунду: на экранах 120–165 Гц это вдвое-втрое меньше работы видеокарты
    const real = last ? now - last : 16.7;
    last = now;
    if (!FIXED_Q && !PROF) quality(real);
    const dt = Math.min(real / 1000, 0.05);
    t += dt;
    if (PROF) window.__bsFrames = ++frames;
    if (first) { cam.p.copy(goal.p); cam.t.copy(goal.t); first = false; root.classList.add('gl-ready'); }
    const k = 1 - Math.exp(-dt * 4.2);
    cam.p.lerp(goal.p, k); cam.t.lerp(goal.t, k);

    // вступление: зуб поднимается, персонаж падает сверху, приземляется и машет
    if (phase === 'rise') {
      rise = Math.min(1, rise + dt / 1.0);
      if (rise >= 0.8 && ready) { phase = 'drop'; mascot.visible = true; act('Jump_Idle', false, 0); }
    } else if (phase === 'drop') {
      rise = Math.min(1, rise + dt / 1.0);
      drop = Math.min(1, drop + dt / 0.5);
      mascot.position.y = FEET_Y + DROP_H * (1 - drop * drop);                // ускоряется, как при падении
      if (drop >= 1) { phase = 'idle'; land(1.5); greetT = 0.5; }
    }
    const e1 = 1 - Math.pow(1 - rise, 3);
    // зуб пружинит: сжимается по высоте и раздаётся в стороны
    sv += (-230 * sq - 13 * sv) * dt; sq += sv * dt;
    const ts = TOOTH_S * lerp(0.6, 1, e1);
    tooth.position.y = lerp(0.2, TOOTH_Y, e1) - sq * 0.9;
    tooth.scale.set(ts * (1 + sq * 0.55), ts * (1 - sq), ts * (1 + sq * 0.55));
    if (phase === 'idle' && !air) mascot.position.y = FEET_Y - sq * 1.9 + (hop > 0 ? Math.sin((1 - Math.max(0, hop)) * Math.PI) * 0.42 : 0);
    if (greetT >= 0) { greetT -= dt; if (greetT < 0 && !POSE) { act('Wave', true); say('hello'); } }
    if (burstT >= 0) {
      burstT += dt / 0.7;
      const b = Math.min(1, burstT), eo = 1 - Math.pow(1 - b, 3);
      burst.visible = b < 1; burst.scale.setScalar(1.1 + eo * 2.6); burst.material.opacity = 0.75 * (1 - b);
      if (b >= 1) burstT = -1;
    }

    // прыжок: толчок → полёт по дуге → приземление
    if (air) {
      air.t += dt;
      if (air.t >= 0) {
        if (!air.up) { air.up = true; act('Jump_Idle', false, 0.08); }
        const p = air.t / air.dur;
        mascot.position.y = FEET_Y + air.h * 4 * p * (1 - p);
        if (p >= 1) land(1);
      }
    }
    if (hop > 0) { hop -= dt / 0.62; if (!model) mascot.rotation.y = (1 - Math.max(0, hop)) * Math.PI * 2; }
    wave = Math.max(0, wave - dt / 1.4);

    // живость: изредка кивает или машет сам, реагирует на переход между разделами
    if (phase === 'idle' && model && !POSE) {
      if (zoneT >= 0) { zoneT -= dt; if (zoneT < 0 && !busy() && !air) { act(zone === 'about' ? 'Yes' : 'Wave', true); fidget = 10; } }
      fidget -= dt;
      if (fidget < 0) { fidget = 9 + Math.random() * 6; if (!busy() && !air && !drag) act(Math.random() < 0.5 ? 'Yes' : 'Wave', true); }
    }

    neonMat.color.set('#ffc14a').multiplyScalar(rise < 0.6 ? (Math.sin(rise * 50) > 0.2 ? 1.2 : 0.15) : 1.7 + Math.sin(t * 2.2) * 0.1);

    // вращение рукой с инерцией и возвратом
    if (!drag) {
      yaw += yawV; yawV *= 0.94;
      if (!SPIN && performance.now() - lastTouch > 2600) yaw = lerp(yaw, Math.round(yaw / (Math.PI * 2)) * Math.PI * 2, 1 - Math.exp(-dt * 1.6));
    }
    // облёт камеры по кнопке
    let oa = 0;
    if (orbit) { orbitT += dt / 6.5; if (orbitT >= 1) { orbit = 0; orbitT = 0; } oa = smooth(orbitT) * Math.PI * 2; }
    spin.rotation.y = yaw + Math.sin(t * 0.45) * 0.05;
    face = lerp(face, goal.face, 1 - Math.exp(-dt * 3));
    if (model) mascot.rotation.y = face;

    const dx = cam.p.x - cam.t.x, dz = cam.p.z - cam.t.z;
    const ca = Math.cos(oa), sa = Math.sin(oa);
    const px = ptr.x * (narrow ? 0 : 0.35) + Math.sin(t * 0.31) * 0.06, py = ptr.y * (narrow ? 0 : 0.18) + Math.sin(t * 0.23) * 0.04;
    camera.position.set(cam.t.x + dx * ca - dz * sa + px, cam.p.y - py + (orbit ? Math.sin(oa * 0.5) * 1.6 : 0), cam.t.z + dx * sa + dz * ca);
    camera.lookAt(cam.t);

    // взгляд за курсором
    const facing = Math.cos(yaw);                          // следит только когда повёрнут лицом
    const lx = clamp(ptr.x * 1.6 - (cam.t.x - 0.25) * 0.25, -1, 1) * Math.max(0, facing);
    hv.x = lerp(hv.x, lx, 1 - Math.exp(-dt * 5));
    hv.y = lerp(hv.y, ptr.y, 1 - Math.exp(-dt * 5));
    if (model) {
      if (model.rig) { if (POSE && model.clips[POSE]) model.rig.pose(POSE, parseFloat(QS.get('at') || '0.6')); else model.rig.update(dt); }
      else if (POSE && model.clips[POSE]) { if (model.cur !== model.clips[POSE]) act(POSE); model.mixer.setTime(parseFloat(QS.get('at') || '0.6')); }
      else model.mixer.update(dt);
      if (model.head) { const k = model.rig ? 0.62 : 1; model.head.rotation.y += (hv.x * 0.45 - face * 0.5) * k; model.head.rotation.x += hv.y * 0.18 * k; }   // цельная модель поворачивает голову скромнее: рисунок держится только анфас
    }
    if (proc) proc.update(t, dt, hv, wave);
    dust.rotation.y = t * 0.018; dust.position.y = Math.sin(t * 0.23) * 0.18;
    const pulse = Math.sin(t * 1.7), flash = burstT >= 0 ? (1 - Math.min(1, burstT)) * 1.6 : 0;
    ledRing.material.color.set('#ffb82e').multiplyScalar(1.8 + pulse * 0.3 + flash);
    pedPool.material.opacity = 0.3 + pulse * 0.04 + flash * 0.16;
    const lit = rise < 0.6 ? (Math.sin(rise * 50) > 0.2 ? 0.7 : 0.08) : 1;
    for (const gm of glowMats) gm.opacity = gm.userData.o * lit;

    // отражение: те же предметы глазами камеры, зеркально опущенной под пол
    const q = TIERS[tier];
    floorMat.uniforms.uCam.value.copy(camera.position);
    // дымка начинается сразу за персонажем, как бы далеко ни стояла камера (на телефоне она дальше)
    const fogNear = Math.max(13, camera.position.distanceTo(cam.t) - 1.6);
    scene.fog.near = fogNear; scene.fog.far = fogNear + 17;
    floorMat.uniforms.uFog.value.set(fogNear, fogNear + 17);
    if (q.refl) {
      mirrorCam.position.set(camera.position.x, -camera.position.y, camera.position.z);
      mirrorCam.lookAt(cam.t.x, -cam.t.y, cam.t.z);
      scene.background = null;
      renderer.setRenderTarget(reflRT);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, mirrorCam);
      renderer.setRenderTarget(null);
      scene.background = BG;
    }
    renderer.shadowMap.needsUpdate = q.shadow;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

// Стена зала: вертикальный градиент, тёплое пятно за неоном и затемнение к краям — вместо расчёта света в каждом кадре.
function wallTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  let g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#1a2113'); g.addColorStop(0.45, '#36402a'); g.addColorStop(0.8, '#2d3622'); g.addColorStop(1, '#1b2214');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.save(); x.translate(266, 199); x.scale(1, 1.9);
  g = x.createRadialGradient(0, 0, 0, 0, 0, 62);
  g.addColorStop(0, 'rgba(255,186,70,0.42)'); g.addColorStop(0.5, 'rgba(255,170,60,0.14)'); g.addColorStop(1, 'rgba(255,170,60,0)');
  x.fillStyle = g; x.fillRect(-70, -70, 140, 140);
  x.restore();
  g = x.createLinearGradient(0, 0, 512, 0);
  g.addColorStop(0, 'rgba(8,12,6,0.82)'); g.addColorStop(0.36, 'rgba(8,12,6,0.18)'); g.addColorStop(0.52, 'rgba(8,12,6,0)'); g.addColorStop(0.68, 'rgba(8,12,6,0.2)'); g.addColorStop(1, 'rgba(8,12,6,0.82)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Зуб-моляр: скруглённый куб, четыре бугра сверху и два корня снизу.
function toothGeometry() {
  let g = new THREE.IcosahedronGeometry(1, 32);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position;
  const bump = (v, w) => { const a = Math.min(1, Math.abs(v) / w); return 0.5 * (1 - Math.cos(Math.PI * 2 * a)); };
  const P = 3.4;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = Math.pow(Math.abs(x) ** P + Math.abs(y) ** P + Math.abs(z) ** P, 1 / P);
    x /= n; y /= n; z /= n;
    z *= 0.9;
    const bx = bump(x, 1.0), bz = bump(z, 0.9);
    if (y > 0) {
      const top = smoothstep(0.3, 0.92, y);
      // посередине — ровная площадка для персонажа на уровне вершин бугров: ступни стоят на виду, бугры их не закрывают
      const plat = 1 - smoothstep(0.28, 0.6, Math.hypot(x, z));
      y = y * 0.82 + top * ((0.2 * bx * bz - 0.1 + 0.06 * bx) * (1 - plat) + 0.11 * plat);
      const waist = 1 - 0.07 * (1 - smoothstep(0, 0.5, y));
      x *= waist; z *= waist;
    } else {
      const d = smoothstep(0, 1, -y);
      const lobe = bump(x, 1.0);
      y = y * 0.8 - d * (0.62 * lobe) + d * 0.42 * (1 - smoothstep(0, 0.42, Math.abs(x)));
      z *= 0.93 * (1 - 0.34 * d);
      x *= 0.93 * (1 - 0.08 * d);
    }
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
function smoothstep(a, b, v) { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }

function radialTex(color) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
