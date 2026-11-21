// BrightSmile — запасной персонаж, собранный в коде из простых форм с шерстью-оболочками.
// Загружается только по адресу с ?proc или если файл модели не открылся (см. js/scene.js).
import * as THREE from 'three';

export function buildProc(LDIR) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const furMats = [];
  function fur(geo, scale, { root = '#1f6f7c', tip = '#8fd4d6', len = 0.07, layers = 16, density = 0.0075 } = {}) {
    const avg = (scale[0] + scale[1] + scale[2]) / 3;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uLen: { value: len }, uInv: { value: new THREE.Vector3(1 / scale[0], 1 / scale[1], 1 / scale[2]) },
        uTime: { value: 0 }, uDensity: { value: avg / density },
        uRoot: { value: new THREE.Color(root) }, uTip: { value: new THREE.Color(tip) },
        uLight: { value: LDIR }, uLightCol: { value: new THREE.Color('#fff0d8').multiplyScalar(1.0) },
        uRimCol: { value: new THREE.Color('#ffe2a6') }, uAmb: { value: new THREE.Color('#70777c') },
      },
      vertexShader: `
        attribute float aShell;
        uniform float uLen, uTime; uniform vec3 uInv;
        varying vec3 vBase, vN, vW; varying float vS;
        void main(){
          vS = aShell; vBase = position;
          vec3 p = position + normal * uInv * uLen * aShell;
          p.y -= uInv.y * uLen * 0.42 * aShell * aShell;
          p.x += sin(uTime * 1.6 + position.y * 7.0 + position.z * 3.0) * uInv.x * uLen * 0.14 * aShell * aShell;
          vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
          vN = normalize(mat3(modelMatrix) * (normal * uInv * uInv));
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform vec3 uRoot, uTip, uLight, uLightCol, uRimCol, uAmb; uniform float uDensity;
        varying vec3 vBase, vN, vW; varying float vS;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main(){
          vec3 q = vBase * uDensity; vec3 c = floor(q); vec3 f = fract(q) - 0.5;
          float r = hash(c);
          if (vS > 0.001) {
            if (r < vS * 0.62 + 0.03) discard;
            if (length(f) > 0.72 * (1.0 - vS * 0.62)) discard;
          }
          vec3 n = normalize(vN);
          float w = clamp(dot(n, uLight) * 0.5 + 0.5, 0.0, 1.0); w *= w;
          vec3 V = normalize(cameraPosition - vW);
          float rim = pow(1.0 - max(dot(n, V), 0.0), 2.6);
          vec3 col = mix(uRoot, uTip, vS * vS * 0.85 + r * 0.18);
          float occ = mix(0.58, 1.0, vS);
          vec3 lit = col * (uAmb + uLightCol * w) * occ + uRimCol * rim * (0.2 + 0.8 * vS) * 0.2;
          gl_FragColor = vec4(lit, 1.0);
        }`,
    });
    furMats.push(mat);
    const g = geo.clone();
    const sh = new Float32Array(layers);
    for (let i = 0; i < layers; i++) sh[i] = i / (layers - 1);
    g.setAttribute('aShell', new THREE.InstancedBufferAttribute(sh, 1));
    const mesh = new THREE.InstancedMesh(g, mat, layers);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  const SPH = new THREE.SphereGeometry(1, 56, 40);
  const SPH_S = new THREE.SphereGeometry(1, 28, 20);
  const part = (geo, mat, pos, scale, rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (scale) m.scale.set(...(scale.length ? scale : [scale, scale, scale]));
    if (rot) m.rotation.set(...rot);
    m.castShadow = true;
    return m;
  };
  const at = (mesh, pos, rot) => { mesh.position.set(...pos); if (rot) mesh.rotation.set(...rot); return mesh; };
  const capsuleBetween = (a, b, r, mat) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, A.distanceTo(B), 8, 18), mat);
    m.position.copy(A).lerp(B, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    m.castShadow = true;
    return m;
  };

  const suit = std({ color: '#15171a', roughness: 0.72 });
  const suitHi = std({ color: '#23262b', roughness: 0.6 });
  const white = new THREE.MeshPhysicalMaterial({ color: '#fbf8ef', roughness: 0.25, clearcoat: 0.8 });
  const pink = std({ color: '#f29aa6', roughness: 0.45 });
  const dark = std({ color: '#1a1410', roughness: 0.5 });

  const group = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  group.add(body, head);

  // ноги и ступни
  for (const s of [-1, 1]) {
    body.add(capsuleBetween([0.15 * s, 0.14, 0], [0.14 * s, 0.56, 0], 0.105, suit));
    body.add(at(fur(SPH_S, [0.15, 0.085, 0.21], { len: 0.035, layers: 10 }), [0.17 * s, 0.075, 0.09], [0, 0.25 * s, 0]));
  }
  // туловище
  body.add(part(SPH, suit, [0, 0.82, 0], [0.31, 0.36, 0.25]));
  body.add(part(SPH_S, suitHi, [0, 0.62, 0.01], [0.3, 0.14, 0.245]));
  // воротник и мех на груди
  body.add(at(fur(SPH_S, [0.13, 0.11, 0.09], { len: 0.04, layers: 10 }), [0, 1.07, 0.15]));
  // плечи и скрещённые лапы
  const arms = new THREE.Group();
  body.add(arms);
  for (const s of [-1, 1]) {
    arms.add(capsuleBetween([0.27 * s, 1.0, 0.02], [0.36 * s, 0.76, 0.13], 0.095, suit));
    const fa = fur(new THREE.CapsuleGeometry(1, 3.4, 8, 20), [0.082, 0.082, 0.082], { len: 0.035, layers: 10 });
    const A = new THREE.Vector3(0.34 * s, 0.74, 0.17), B = new THREE.Vector3(-0.17 * s, 0.84 + (s > 0 ? 0.035 : -0.035), 0.3);
    fa.position.copy(A).lerp(B, 0.5);
    fa.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    arms.add(fa);
    arms.add(at(fur(SPH_S, [0.1, 0.085, 0.085], { len: 0.03, layers: 9 }), [B.x - 0.04 * s, B.y, B.z]));
  }

  // голова
  const HY = 1.62;
  head.position.set(0, 1.12, 0);     // точка шеи
  const H = (y) => y - 1.12;
  head.add(at(fur(SPH, [0.6, 0.53, 0.52], { len: 0.085, layers: 20 }), [0, H(HY), 0]));
  for (const s of [-1, 1]) {
    head.add(at(fur(SPH, [0.3, 0.27, 0.27], { len: 0.1, layers: 16 }), [0.37 * s, H(1.43), 0.14]));           // щёки
    head.add(at(fur(SPH_S, [0.16, 0.135, 0.12], { root: '#cfc7b6', tip: '#ffffff', len: 0.03, layers: 9 }), [0.115 * s, H(1.37), 0.47])); // мордочка
    // уши
    const ear = new THREE.Group();
    ear.add(at(fur(SPH_S, [0.17, 0.17, 0.07], { len: 0.04, layers: 10 }), [0, 0, 0]));
    ear.add(part(SPH_S, pink, [0, -0.01, 0.045], [0.105, 0.105, 0.04]));
    ear.position.set(0.47 * s, H(2.02), 0.02);
    ear.rotation.set(0, -0.35 * s, -0.35 * s);
    ear.userData.s = s;
    head.add(ear);
    head.userData['ear' + s] = ear;
    // брови
    head.add(part(new THREE.CapsuleGeometry(0.03, 0.17, 6, 12), dark, [0.215 * s, H(1.99), 0.5], null, [0.2, 0, (Math.PI / 2) + 0.05 * s]));
  }
  // хохолок
  const tuft = new THREE.Group();
  [[-0.13, 0.5, 0.2], [-0.04, 0.16, 0.27], [0.06, -0.14, 0.25], [0.15, -0.5, 0.19], [0.0, 0.05, 0.2]].forEach(([x, rz, h], i) => {
    const b = fur(SPH_S, [0.075, h, 0.075], { tip: '#a6e2e2', len: 0.05, layers: 10 });
    b.position.set(x, h * 0.7, i > 3 ? -0.1 : 0);
    b.rotation.set(i > 3 ? -0.5 : 0.12, 0, rz);
    tuft.add(b);
  });
  tuft.position.set(0, H(2.06), 0.06);
  head.add(tuft);
  // нос, рот, зубы
  head.add(part(SPH_S, pink, [0, H(1.47), 0.585], [0.075, 0.058, 0.055]));
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 28, Math.PI * 0.9), dark);
  smile.position.set(0, H(1.4), 0.5); smile.rotation.set(0.5, 0, Math.PI * 1.05); smile.scale.set(1.25, 1.1, 1);
  head.add(smile);
  head.add(part(SPH_S, dark, [0, H(1.27), 0.5], [0.12, 0.075, 0.05]));
  for (const s of [-1, 1]) head.add(part(new THREE.BoxGeometry(0.068, 0.12, 0.03, 2, 2, 1), white, [0.037 * s, H(1.27), 0.555], null, [0.12, 0, 0]));
  // глаза
  const eyes = [];
  const irisM = std({ color: '#b5641c', roughness: 0.25, emissive: '#5a2a05', emissiveIntensity: 0.6 });
  const scleraM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.1, clearcoat: 1 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(0.215 * s, H(1.71), 0.445);
    eye.rotation.y = 0.22 * s;
    eye.add(part(SPH_S, scleraM, [0, 0, 0], [0.2, 0.215, 0.12]));
    const look = new THREE.Group();
    look.add(part(SPH_S, irisM, [0, 0, 0.076], [0.135, 0.145, 0.05]));
    look.add(part(SPH_S, std({ color: '#080605', roughness: 0.15 }), [0, 0, 0.106], [0.078, 0.086, 0.03]));
    look.add(part(SPH_S, new THREE.MeshBasicMaterial({ color: '#ffffff' }), [0.045, 0.058, 0.13], 0.03));
    look.add(part(SPH_S, new THREE.MeshBasicMaterial({ color: '#ffffff' }), [-0.04, -0.045, 0.128], 0.014));
    eye.add(look);
    eye.userData.look = look;
    head.add(eye);
    eyes.push(eye);
  }


  let blink = 2.5;
  // t — время сцены, hv — сглаженное направление взгляда (-1…1), wave — затухающее «приветствие»
  function update(t, dt, hv, wave) {
    const br = Math.sin(t * 1.9);
    body.scale.set(1 + br * 0.012, 1 + br * 0.018, 1 + br * 0.02);
    arms.position.y = br * 0.012;
    head.rotation.y = hv.x * 0.42;
    head.rotation.x = hv.y * 0.16 + Math.sin(t * 0.9) * 0.02;
    head.rotation.z = -hv.x * 0.07 + Math.sin(t * 0.7) * 0.025 + wave * Math.sin(t * 14) * 0.08;
    head.position.y = 1.12 + br * 0.014;
    for (const eye of eyes) eye.userData.look.position.set(hv.x * 0.028, -hv.y * 0.02, 0);
    blink -= dt;
    const bl = blink < 0.14 ? Math.abs(blink - 0.07) / 0.07 : 1;
    if (blink < 0) blink = 2.2 + Math.random() * 3.2;
    for (const eye of eyes) eye.scale.y = Math.max(0.08, bl);
    for (const s of [-1, 1]) head.userData['ear' + s].rotation.z = -0.35 * s + Math.max(0, Math.sin(t * 1.3 + s)) ** 8 * 0.22 * s;
    tuft.rotation.z = Math.sin(t * 1.4) * 0.06 + hv.x * -0.1;
    for (const m of furMats) m.uniforms.uTime.value = t;
  }
  return { group, update };
}
