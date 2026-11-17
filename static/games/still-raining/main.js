// still raining — a dreamcore walk (web 3d)
import * as THREE from './three.module.min.js';

const D = window.DATA;
const W = 320, H = 240;
const TAU = Math.PI * 2;
const pcos = t => Math.cos(t * TAU), psin = t => -Math.sin(t * TAU);
const mid = (a, b, c) => Math.max(a, Math.min(b, c));
const rnd = n => Math.random() * n;

// ------------------------------------------------------------ palette
const PAL = ['000000','1d2b53','7e2553','008751','ab5236','5f574f','c2c3c7','fff1e8','ff004d','ffa300','ffec27','00e436','29adff','83769c','ff77a8','ffccaa',
  '291814','111d35','422136','125359','742f29','49333b','a28879','f3ef7d','be1250','ff6c24','a8e72e','00b543','065ab5','754665','ff6e59','ff9d81'];
const hex = i => PAL[i >= 128 ? i - 112 : i];

// ------------------------------------------------------------ regions
// floor/ceiling texture, fog distance, rain amount and colour, wind, music, step sound, screen palette, wall height, texture repeat, light
const REGS = [
  { ft: 21, ct: 22, fog: 7, rn: 500, rc: 12, wd: 0, mu: 0, st: 'tile', h: 1.15, vr: 1, amb: [0xffffff, 1.6], pp: { 11: 139, 1: 129, 3: 131 } },
  { ft: 23, ct: 24, fog: 12, rn: 1400, rc: 12, wd: 0, mu: 1, st: 'water', h: 2, vr: 2, amb: [0xffffff, 1.3], pp: { 1: 129, 13: 141 } },
  { ft: 25, ct: 26, fog: 12, rn: 300, rc: 6, wd: 0, mu: 2, st: 'carpet', h: 1.05, vr: 1, amb: [0xffffff, 1.5], pp: { 2: 130, 8: 136, 4: 132 } },
  { ft: 27, ct: 0, fog: 16, rn: 1500, rc: 13, wd: -1, mu: 3, st: 'dirt', h: 1.1, vr: 1, amb: [0xffffff, 0.9], pp: { 1: 129, 3: 131 } },
  { ft: 28, ct: 29, fog: 12, rn: 250, rc: 12, wd: 0, mu: 4, st: 'carpet', h: 1.1, vr: 1, amb: [0xffffff, 1.3], pp: { 4: 132, 2: 130 } },
];
const EYE = 0.5;

// ------------------------------------------------------------ map
let MAP = D.map.map(r => r.slice());
const mget = (x, y) => { x = Math.floor(x); y = Math.floor(y); return (MAP[y] && MAP[y][x]) || 0; };
const dirty = new Set();
const mset = (x, y, v) => { MAP[y][x] = v; dirty.add(Math.floor(x / 24)); };
const wall = t => t > 0 && t < 64;
const solid = (x, y) => { const t = mget(x, y); return wall(t) && t !== 11; };

const PT = {};
for (const p of '51,0,58,6,0|54,3,48,3,0|61,3,51,7,.75|54,10,55,3,0|51,13,58,7,0'.split('|')) {
  const [a, b, c, d, r] = p.split(',').map(Number);
  PT[a + b * 128] = [c, d, r];
  PT[c + d * 128] = [a, b, -r];
}
const GATES = [[35.5, 22.5, .25], [51.5, 4.5, .25], [76.5, 11.5, 0], [101.5, 7.3, .25]];

// region,x,y,model,height,turn(-1 faces you),lit,solid,width,scale,swing pivot
const OBJS = `1,10,3,1,0,-1,1,0,.5,1,0
2,35.5,9.5,2,0,.1,1,0,.5,1,0
3,49.6,1.5,3,0,-1,0,0,.5,1,0
3,53.4,1.5,3,0,-1,0,0,.5,1,0
3,56.5,1.5,3,0,-1,0,0,.5,1,0
3,57.4,1.5,3,0,-1,0,0,.5,1,0
3,59.6,1.5,3,0,-1,0,0,.5,1,0
3,60.5,1.5,3,0,-1,0,0,.5,1,0
3,56.5,5.5,3,0,-1,0,0,.5,1,0
3,49.5,12.5,3,0,-1,0,0,.5,1,0
3,53.5,8.5,3,0,-1,0,0,.5,1,0
3,60.5,12.4,1,0,-1,1,0,.5,1,0
4,84,16,4,0,0,1,1,1,1,0
4,84,16,5,0,0,1,0,.5,1,1.4
4,84,16,1,.11,.5,1,0,.5,.8,1.4
4,84,6,6,0,0,1,1,2.2,1,0
4,78,6,7,0,0,1,1,.25,1,0
4,90,6,7,0,0,1,1,.25,1,0
4,78,18,7,0,0,1,1,.25,1,0
4,92.6,9.6,7,0,0,1,1,.25,1,0
5,104.2,2.75,8,0,0,1,1,1.8,1,0
5,101.5,3.4,9,0,0,1,0,.5,1,0`;

// ------------------------------------------------------------ three
const glc = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
const rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0);
scene.fog = new THREE.Fog(0x000000, 0.5, 8);
const camera = new THREE.PerspectiveCamera(58, W / H, 0.03, 40);
camera.rotation.order = 'YXZ';
const ambient = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(0.4, 1, 0.5);
scene.add(sun);
const tvLight = new THREE.PointLight(0x8fb0ff, 0, 4, 1.2);
scene.add(tvLight);

// palette quantiser with ordered dither: keeps the 16-colour look
const quant = new THREE.ShaderMaterial({
  uniforms: { tex: { value: rt.texture }, pal: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `
    uniform sampler2D tex; uniform vec3 pal[16]; varying vec2 vUv;
    float bayer(vec2 p){
      int x=int(mod(p.x,4.)), y=int(mod(p.y,4.));
      int i=x+y*4; float m[16];
      m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
      m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for(int k=0;k<16;k++){ if(k==i) return (m[k]+.5)/16.; }
      return .5;
    }
    void main(){
      vec3 c=texture2D(tex,vUv).rgb;
      c=mix(c*12.92, 1.055*pow(c,vec3(1./2.4))-.055, step(.0031308,c));
      float d1=1e9,d2=1e9; vec3 c1=vec3(0.),c2=vec3(0.);
      for(int i=0;i<16;i++){
        vec3 d=(c-pal[i])*vec3(.9,1.2,.7);
        float e=dot(d,d);
        if(e<d1){d2=d1;c2=c1;d1=e;c1=pal[i];}
        else if(e<d2){d2=e;c2=pal[i];}
      }
      float t=sqrt(d1)/(sqrt(d1)+sqrt(d2)+1e-5);
      gl_FragColor=vec4(bayer(gl_FragCoord.xy)<t?c2:c1,1.);
    }`,
  depthTest: false, depthWrite: false,
});
const post = new THREE.Scene();
post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quant));
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// ------------------------------------------------------------ textures (same pixels as the cartridge)
const GFX = D.gfx;
const gpx = (x, y) => parseInt(GFX[y * 128 + x], 16);
function texOrigin(n) { return [((n - 1) % 8) * 16, Math.floor((n - 1) / 8) * 16]; }
const texCache = {};
function makeCanvasTex(n, pp, rep) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  const img = g.createImageData(16, 16);
  const [ox, oy] = texOrigin(n);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let v = gpx(ox + x, oy + y);
    v = pp[v] !== undefined ? pp[v] : v;
    const h = hex(v), k = (y * 16 + x) * 4;
    img.data[k] = parseInt(h.slice(0, 2), 16); img.data[k + 1] = parseInt(h.slice(2, 4), 16);
    img.data[k + 2] = parseInt(h.slice(4, 6), 16); img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep[0], rep[1]);
  t.userData = { g, img, n, pp };
  return t;
}
function tex(n, r) {
  const k = n + '_' + r;
  if (!texCache[k]) texCache[k] = makeCanvasTex(n, REGS[r - 1].pp);
  return texCache[k];
}
const matCache = {};
function wallMat(n, r) {
  const k = n + '_' + r;
  if (!matCache[k]) matCache[k] = new THREE.MeshLambertMaterial({ map: tex(n, r), emissive: n === 6 ? 0x404040 : 0 });
  return matCache[k];
}

// ------------------------------------------------------------ world
const regionGroups = [];
for (let r = 1; r <= 5; r++) {
  const g = new THREE.Group();
  g.visible = false;
  scene.add(g);
  const walls = new THREE.Group();
  g.add(walls);
  regionGroups[r] = { g, walls };
  const R = REGS[r - 1];
  const x0 = (r - 1) * 24;
  // floor and ceiling
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(24, 28), new THREE.MeshLambertMaterial({ map: makeCanvasTex(R.ft, R.pp, [24, 28]) }));
  fl.rotation.x = -Math.PI / 2;
  fl.position.set(x0 + 12, 0, 14);
  g.add(fl);
  regionGroups[r].floor = fl;
  if (R.ct) {
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(24, 28), new THREE.MeshLambertMaterial({ map: makeCanvasTex(R.ct, R.pp, [24, 28]) }));
    ce.rotation.x = Math.PI / 2;
    ce.position.set(x0 + 12, R.h, 14);
    g.add(ce);
  }
  buildWalls(r);
}

function buildWalls(r) {
  const { walls } = regionGroups[r];
  for (const m of [...walls.children]) { m.geometry.dispose(); walls.remove(m); }
  const R = REGS[r - 1];
  const byTex = {};
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < 28; y++) for (let x = (r - 1) * 24; x < r * 24; x++) {
    if (wall(mget(x, y))) continue;
    for (const [ex, ey] of dirs) {
      const t = mget(x + ex, y + ey);
      if (!wall(t)) continue;
      const cx = x + .5 + ex / 2, cz = y + .5 + ey / 2, rx = -ey / 2, rz = ex / 2;
      const a = [cx - rx, 0, cz - rz], b = [cx + rx, 0, cz + rz], c = [cx + rx, R.h, cz + rz], d = [cx - rx, R.h, cz - rz];
      const L = byTex[t] || (byTex[t] = { p: [], u: [], n: [] });
      L.p.push(...a, ...b, ...c, ...a, ...c, ...d);
      L.u.push(0, 0, 1, 0, 1, R.vr, 0, 0, 1, R.vr, 0, R.vr);
      for (let i = 0; i < 6; i++) L.n.push(-ex, 0, -ey);
    }
  }
  for (const t in byTex) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(byTex[t].p, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(byTex[t].u, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(byTex[t].n, 3));
    walls.add(new THREE.Mesh(geo, wallMat(+t, r)));
  }
}

// models from tools/meshes.py
function modelGeo(m, pp) {
  const p = [], c = [];
  const col = new THREE.Color();
  for (const f of m.f) {
    let ci = f[0];
    ci = pp[ci] !== undefined ? pp[ci] : ci;
    col.setHex(parseInt(hex(ci), 16));
    const ids = f.slice(2);
    for (let i = 1; i < ids.length - 1; i++) {
      for (const k of [ids[0], ids[i], ids[i + 1]]) {
        p.push(m.v[k * 3], m.v[k * 3 + 1], m.v[k * 3 + 2]);
        c.push(col.r, col.g, col.b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  geo.computeVertexNormals();
  return geo;
}
const geoCache = {};
const modelMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
const litMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, emissive: 0x303030 });
const barMat = new THREE.MeshBasicMaterial({ color: 0xfff1e8, side: THREE.DoubleSide });

let objs, dress, fdress, swdress, body, lampLights = [];
function makeObjects() {
  for (const o of objs || []) if (o.root) o.root.parent.remove(o.root);
  for (const l of lampLights) l.parent.remove(l);
  lampLights = [];
  objs = OBJS.split('\n').map(s => {
    const v = s.split(',').map(Number);
    return { r: v[0], x: v[1], y: v[2], m: v[3], z: v[4], ya: v[5], lit: v[6] === 1, sol: v[7] === 1, w: v[8], s: v[9], pv: v[10], sq: 1 };
  });
  dress = objs[0]; fdress = objs[1]; swdress = objs[14]; body = objs[objs.length - 1];
  dress.ahead = 1;
  for (let i = 1; i <= 22; i += 2) objs.push({ r: 1, x: i + .5, y: 3, m: 10, z: 1.14, ya: 0, lit: true, s: 1, pv: 0, sq: 1, bar: 1 });
  for (const o of objs) {
    const pp = REGS[o.r - 1].pp;
    const k = o.m + '_' + o.r;
    const geo = geoCache[k] || (geoCache[k] = modelGeo(D.meshes[o.m - 1], pp));
    const mesh = new THREE.Mesh(geo, o.bar ? barMat : o.lit ? litMat : modelMat);
    mesh.scale.setScalar(o.s);
    const root = new THREE.Group(), swing = new THREE.Group();
    root.add(swing);
    swing.add(mesh);
    if (o.pv) { swing.position.y = o.pv; mesh.position.y = -o.pv; }
    regionGroups[o.r].g.add(root);
    o.root = root; o.swing = swing; o.mesh = mesh;
    if (o.m === 7) {
      const l = new THREE.PointLight(0xffd080, 2.2, 6, 1.4);
      l.position.set(o.x, 1.8, o.y);
      regionGroups[o.r].g.add(l);
      lampLights.push(l);
    }
  }
}

// ------------------------------------------------------------ rain
const RAIN_N = 1500;
const rainPos = new Float32Array(RAIN_N * 6);
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0x29adff, transparent: true, opacity: 0.8 });
const rainLines = new THREE.LineSegments(rainGeo, rainMat);
rainLines.frustumCulled = false;
scene.add(rainLines);
const splashPos = new Float32Array(300 * 3);
const splashGeo = new THREE.BufferGeometry();
splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
const splashes = new THREE.Points(splashGeo, new THREE.PointsMaterial({ color: 0x29adff, size: 1.5, sizeAttenuation: false }));
splashes.frustumCulled = false;
scene.add(splashes);
let drops = [], spl = 0;

// ------------------------------------------------------------ sound (made in the browser)
const A = { ctx: null };
function audioStart() {
  if (A.ctx) { A.ctx.resume(); return; }
  const ctx = A.ctx = new (window.AudioContext || window.webkitAudioContext)();
  A.master = ctx.createGain(); A.master.gain.value = 0.9; A.master.connect(ctx.destination);
  A.mus = ctx.createGain(); A.mus.gain.value = 0; A.mus.connect(A.master);
  A.fx = ctx.createGain(); A.fx.gain.value = 1; A.fx.connect(A.master);
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  A.noise = buf;
  // rain: two filtered noise beds
  const mk = (type, f, q) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(A.mus); s.start(); return g; };
  A.rainHi = mk('highpass', 2500, 0.5);
  A.rainLo = mk('bandpass', 500, 0.6);
  // drone voices
  A.droneG = ctx.createGain(); A.droneG.gain.value = 0; A.droneG.connect(A.mus);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(A.droneG);
  A.osc = [0, 1].map(i => { const o = ctx.createOscillator(); o.type = i ? 'sawtooth' : 'triangle'; const g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(lp); o.start(); return { o, g }; });
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5; const lg = ctx.createGain(); lg.gain.value = 2; lfo.connect(lg); lfo.start();
  A.osc.forEach(v => lg.connect(v.o.detune));
  A.box = ctx.createGain(); A.box.gain.value = 0; A.box.connect(A.mus);
  A.song = -1; A.step = 0; A.next = 0;
  setInterval(audioTick, 50);
}
const pf = p => 440 * Math.pow(2, (p - 33) / 12);
// music patterns, like the cartridge: 0 corridor 1 pool 2 dressing rooms 3 playground 4 living room 5 music box
const SONGS = [
  { hi: .10, lo: .03, wave: 0, vol: .10, notes: [12, 12, 7, 10], dur: 2.1 },
  { hi: .14, lo: .16, wave: 1, vol: .05, notes: [24, 24, 24, 27, 22, 22, 22, 22], dur: 1.07 },
  { hi: .08, lo: .02, wave: 1, vol: .05, notes: [24, 24, 24, 27, 22, 22, 22, 22], dur: 1.07 },
  { hi: .15, lo: .14, wave: 0, vol: .10, notes: [12, 12, 7, 10], dur: 2.1 },
  { hi: .06, lo: .02, wave: 1, vol: .045, notes: [17, 15], dur: 4.3 },
  { hi: 0, lo: 0, wave: 0, vol: 0, box: [48, 0, 45, 0, 43, 0, 45, 48, 50, 0, 48, 0, 45, 0, 0, 0, 43, 0, 45, 0, 48, 0, 43, 0, 40, 0, 0, 0, 0, 0, 0, 0], dur: .117 },
];
function music(i, fade) {
  if (!A.ctx) { A.want = [i, fade]; return; }
  const t = A.ctx.currentTime, f = (fade || 1500) / 1000;
  A.mus.gain.cancelScheduledValues(t);
  A.mus.gain.setValueAtTime(A.mus.gain.value, t);
  if (i < 0) { A.mus.gain.linearRampToValueAtTime(0, t + f); A.song = -1; return; }
  A.song = i; A.step = 0; A.next = t;
  const S = SONGS[i];
  A.mus.gain.linearRampToValueAtTime(1, t + f);
  A.rainHi.gain.setTargetAtTime(S.hi, t, .4);
  A.rainLo.gain.setTargetAtTime(S.lo, t, .4);
  A.droneG.gain.setTargetAtTime(S.vol, t, .4);
  A.osc[0].g.gain.setTargetAtTime(S.wave ? 0 : 1, t, .3);
  A.osc[1].g.gain.setTargetAtTime(S.wave ? 1 : 0, t, .3);
}
function audioTick() {
  const ctx = A.ctx;
  if (!ctx || A.song < 0) return;
  const S = SONGS[A.song];
  while (A.next < ctx.currentTime + 0.2) {
    if (S.box) {
      const p = S.box[A.step % S.box.length];
      if (p) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = pf(p);
        g.gain.setValueAtTime(0.18, A.next); g.gain.exponentialRampToValueAtTime(0.001, A.next + 0.9);
        o.connect(g); g.connect(A.mus); o.start(A.next); o.stop(A.next + 1);
      }
    } else {
      const p = S.notes[A.step % S.notes.length];
      A.osc.forEach(v => v.o.frequency.setTargetAtTime(pf(p), A.next, 0.15));
    }
    A.step++; A.next += S.dur;
  }
}
function tone(type, p0, p1, t0, dur, vol, out) {
  const ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(pf(p0), t0); o.frequency.exponentialRampToValueAtTime(pf(p1), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(out || A.fx); o.start(t0); o.stop(t0 + dur + .05);
}
function noiseBurst(type, f, q, t0, dur, vol) {
  const ctx = A.ctx, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = A.noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(fl); fl.connect(g); g.connect(A.fx); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
}
function sfx(name) {
  const ctx = A.ctx;
  if (!ctx) return;
  const t = ctx.currentTime;
  if (name === 'tile') { noiseBurst('bandpass', 1800, 3, t, .06, .35); noiseBurst('bandpass', 900, 3, t + .05, .05, .15); }
  else if (name === 'water') { noiseBurst('bandpass', 1100, 1.5, t, .16, .35); noiseBurst('bandpass', 600, 2, t + .06, .12, .2); }
  else if (name === 'carpet') noiseBurst('lowpass', 380, 1, t, .09, .45);
  else if (name === 'dirt') noiseBurst('bandpass', 320, 1.2, t, .1, .45);
  else if (name === 'chime') [43, 41, 38, 34, 31].forEach((p, i) => tone('square', p, p - .3, t + i * .085, .3, .05));
  else if (name === 'thud') { tone('sine', 20, 8, t, .5, .6); noiseBurst('lowpass', 200, 1, t, .4, .5); }
  else if (name === 'thunder') { noiseBurst('lowpass', 260, .7, t, 2.8, 1.1); noiseBurst('lowpass', 90, .7, t + .15, 3.2, 1.2); }
  else if (name === 'sink') [40, 36, 38, 33, 35, 30, 32, 28, 29, 25, 26, 22].forEach((p, i) => tone('sine', p, p - 2, t + i * .05, .12, .12));
  else if (name === 'hum') tone('sawtooth', 17, 15, t, 1.2, .06);
}

// ------------------------------------------------------------ input
const K = {};
const look = { yaw: 0, pitch: 0 };
let forced = null; // test hook
addEventListener('keydown', e => { K[e.code] = 1; if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); start(); });
addEventListener('keyup', e => { K[e.code] = 0; });
const screenEl = document.getElementById('screen');
screenEl.addEventListener('mousedown', () => { start(); if (!touchUsed && screenEl.requestPointerLock) screenEl.requestPointerLock(); });
addEventListener('mousemove', e => {
  if (document.pointerLockElement === screenEl) { look.yaw += e.movementX * 0.00045; look.pitch -= e.movementY * 0.0025; }
});
// touch: left half walks and turns, right half looks around
let touchUsed = false;
const touches = {};
const stick = { x: 0, y: 0 };
screenEl.addEventListener('touchstart', e => {
  touchUsed = true; start();
  for (const t of e.changedTouches) touches[t.identifier] = { x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, left: t.clientX < innerWidth / 2 };
  e.preventDefault();
}, { passive: false });
screenEl.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    const s = touches[t.identifier];
    if (!s) continue;
    if (s.left) { stick.x = mid(-1, (t.clientX - s.sx) / 50, 1); stick.y = mid(-1, (t.clientY - s.sy) / 50, 1); }
    else { look.yaw += (t.clientX - s.x) * 0.0012; look.pitch -= (t.clientY - s.y) * 0.006; }
    s.x = t.clientX; s.y = t.clientY;
  }
  e.preventDefault();
}, { passive: false });
const touchEnd = e => { for (const t of e.changedTouches) { if (touches[t.identifier] && touches[t.identifier].left) { stick.x = stick.y = 0; } delete touches[t.identifier]; } };
screenEl.addEventListener('touchend', touchEnd);
screenEl.addEventListener('touchcancel', touchEnd);

// PICO-style buttons: 0 left 1 right 2 up 3 down 4/5 hold
function btn(i) {
  if (forced) return !!forced[i];
  const k = c => K[c] === 1;
  if (i === 0) return k('ArrowLeft') || stick.x < -0.35;
  if (i === 1) return k('ArrowRight') || stick.x > 0.35;
  if (i === 2) return k('ArrowUp') || k('KeyW') || stick.y < -0.3;
  if (i === 3) return k('ArrowDown') || k('KeyS') || stick.y > 0.3;
  if (i === 4) return k('KeyZ') || k('KeyC');
  if (i === 5) return k('KeyX') || k('KeyV');
}

// ------------------------------------------------------------ game state (same rules as the cartridge)
let S;
function init() {
  MAP = D.map.map(r => r.slice());
  for (let r = 1; r <= 5; r++) buildWalls(r);
  S = { px: 4.5, py: 3, pa: 0, pt: 0, vf: 0, vs: 0, va: 0, bob: 0, wph: 0, loops: 0, ev: {}, t0: 0, tr: 0, fl: 0, hold: 0, endt: 0, lc: -1, reg: 0 };
  makeObjects();
  drops = [];
  for (let i = 0; i < RAIN_N; i++) drops.push([0, -1, 0]);
  look.yaw = look.pitch = 0;
  enter();
  S.prev = snap();
}
function snap() { return { px: S.px, py: S.py, pa: S.pa, bob: S.bob }; }
const dist = o => Math.hypot(o.x - S.px, o.y - S.py);

function enter() {
  S.reg = Math.floor(S.px / 24) + 1;
  S.fl = 0;
  const R = REGS[S.reg - 1];
  for (let r = 1; r <= 5; r++) regionGroups[r].g.visible = r === S.reg;
  scene.fog.far = R.fog;
  scene.fog.near = R.fog * 0.05;
  ambient.color.setHex(R.amb[0]);
  ambient.intensity = R.amb[1];
  rainMat.color.setHex(parseInt(hex(R.pp[R.rc] !== undefined ? R.pp[R.rc] : R.rc), 16));
  splashes.material.color.copy(rainMat.color);
  for (let i = 0; i < 16; i++) {
    const v = R.pp[i] !== undefined ? R.pp[i] : i, h = hex(v);
    quant.uniforms.pal.value[i].set(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
  }
  tvLight.intensity = S.reg === 5 ? 1.2 : 0;
  tvLight.position.set(96.7, .6, 4.5);
  music(R.mu, 1500);
}

function tryhit(x, y) { if (mget(x, y) === 6 && S.tr === 0) { S.tr = 1; sfx('chime'); } }
function blocked(x, y) {
  const r = .25;
  if (solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r)) return true;
  for (const o of objs) if (o.sol && o.r === S.reg && Math.abs(o.x - x) < o.w / 2 + .15 && Math.abs(o.y - y) < o.w / 2 + .15) return true;
}
function move(mx, my) {
  if (mx) { if (blocked(S.px + mx, S.py)) tryhit(S.px + mx + Math.sign(mx) * .3, S.py); else S.px += mx; }
  if (my) { if (blocked(S.px, S.py + my)) tryhit(S.px, S.py + my + Math.sign(my) * .3); else S.py += my; }
}

function tick() {
  S.prev = snap();
  S.t0++;
  // mouse / touch look goes straight to the view
  S.pa += look.yaw; look.yaw = 0;
  S.pt = mid(-1.0, S.pt + look.pitch, 1.1); look.pitch = 0;
  if (S.tr > 0) {
    S.tr++;
    if (S.tr === 20) {
      const g = GATES[S.reg - 1];
      S.px = g[0]; S.py = g[1]; S.pa = g[2]; S.vf = S.vs = 0; S.pt = 0;
      enter();
      S.prev = snap();
    }
    if (S.tr > 40) S.tr = 0;
    return;
  }
  if (S.endt > 0) { ending(); return; }
  let f = 0, s = 0, t = 0;
  if (btn(4) || btn(5)) {
    if (btn(0)) s--; if (btn(1)) s++;
    if (btn(2)) S.pt = Math.min(S.pt + .03, 1.1);
    if (btn(3)) S.pt = Math.max(S.pt - .03, -1);
  } else {
    if (btn(2)) f++; if (btn(3)) f--;
    if (btn(0)) t--; if (btn(1)) t++;
  }
  if (!forced) { if (K.KeyA) s--; if (K.KeyD) s++; }
  let k = 1;
  if (S.reg === 5) k = mid(.35, dist(body) / 2.5, 1);
  S.vf += (f * .07 * k - S.vf) * .2;
  S.vs += (s * .05 * k - S.vs) * .2;
  S.va += (t * .012 - S.va) * .3;
  S.pa += S.va;
  const dx = pcos(S.pa), dy = psin(S.pa);
  move(dx * S.vf - dy * S.vs, dy * S.vf + dx * S.vs);
  const sp = Math.abs(S.vf) + Math.abs(S.vs);
  if (sp > .01) {
    const o = S.wph;
    S.wph += sp * .16;
    if (Math.floor(o * 2) !== Math.floor(S.wph * 2)) sfx(REGS[S.reg - 1].st);
  }
  S.bob = psin(S.wph) * sp * 0.25;
  // curtain portals, on entering a new cell
  const cx = Math.floor(S.px), cy = Math.floor(S.py), c = cx + cy * 128;
  if (c !== S.lc) {
    S.lc = c;
    const p = PT[c];
    if (p) {
      const ox = (S.px - cx - .5) * .4, oy = (S.py - cy - .5) * .4;
      const co = pcos(p[2]), si = psin(p[2]);
      S.px = p[0] + .5 + ox * co - oy * si;
      S.py = p[1] + .5 + ox * si + oy * co;
      S.pa += p[2];
      S.lc = Math.floor(S.px) + Math.floor(S.py) * 128;
      S.prev = snap();
      sfx('hum');
    }
  }
  spaces();
}

function spaces() {
  const reg = S.reg;
  if (reg === 1) {
    // endless corridor
    if (S.px >= 16) {
      S.px -= 8; S.prev.px -= 8;
      for (const o of objs) if (o.ahead) o.x -= 8;
      S.loops++;
      if (S.loops === 2) {
        // the way ahead closes, the way back opens
        for (const y of [2, 3]) { mset(14, y, 2); mset(1, y, 0); mset(2, y, 0); }
        sfx('thud');
        dress.ahead = 0; dress.x = 1.6;
      }
    }
    if (dress.ahead && dress.x - S.px < 3.5) dress.x = S.px + 6;
  } else if (reg === 2) {
    // the floating dress sinks, a door appears
    if (!S.ev[2] && dist(fdress) < 1.3) { S.ev[2] = 1; sfx('sink'); mset(35, 2, 6); }
    if (S.ev[2] && fdress.z > -.6) fdress.z -= .004;
  } else if (reg === 4) {
    if (S.fl > 0) S.fl--;
    if (Math.random() < .004) { S.fl = 4; sfx('thunder'); }
    if (!S.ev[4] && dist(swdress) < 1.7) { S.ev[4] = 1; S.fl = 6; sfx('thunder'); swdress.r = 0; swdress.root.visible = false; mset(94, 11, 6); }
  } else if (reg === 5) {
    const d = dist(body);
    if (d < 2.4 && !S.ev[5]) { S.ev[5] = 1; music(-1, 4000); }
    if (d < 1.4) S.hold++; else S.hold = 0;
    if (S.hold > 75) S.endt = 1;
  }
}

// white out, the sheet is empty, the rain stops
function ending() {
  S.endt++;
  S.bob *= .9;
  if (S.endt >= 60) body.sq += (.08 - body.sq) * .04;
  if (S.endt === 60) { REGS[4].rn = 0; mset(101, 1, 20); mset(102, 1, 20); tvLight.intensity = 0; }
  if (S.endt === 100) music(5);
  if (S.endt > 300 && (btn(4) || btn(5) || btn(2) || clicked)) { music(-1, 300); REGS[4].rn = 250; init(); }
  clicked = false;
}
let clicked = false;
screenEl.addEventListener('click', () => { clicked = true; });

// ------------------------------------------------------------ draw
function updateWorld(alpha) {
  const p = S.prev, R = REGS[S.reg - 1];
  const px = p.px + (S.px - p.px) * alpha, py = p.py + (S.py - p.py) * alpha;
  let pa = S.pa;
  if (Math.abs(S.pa - p.pa) < .1) pa = p.pa + (S.pa - p.pa) * alpha;
  camera.position.set(px, EYE + (p.bob + (S.bob - p.bob) * alpha) * 0.06, py);
  const dx = pcos(pa), dz = psin(pa);
  camera.rotation.y = Math.atan2(-dx, -dz);
  camera.rotation.x = S.pt;
  for (const r of dirty) { buildWalls(r + 1); }
  dirty.clear();
  // models
  const t0 = S.t0 + alpha;
  for (const o of objs) {
    if (o.r !== S.reg) continue;
    o.root.position.set(o.x, o.z + ((o === dress || o === swdress) ? Math.sin(t0 / 90 * TAU) * .02 : 0), o.y);
    o.root.rotation.y = o.ya < 0 ? Math.atan2(px - o.x, py - o.y) : o.ya * TAU;
    if (o.pv) o.swing.rotation.x = Math.sin(t0 / 75 * TAU) * .07 * TAU;
    o.mesh.scale.y = o.s * o.sq;
  }
  // lightning, water, tv
  const lit = S.reg === 4 && S.fl > 0;
  ambient.intensity = R.amb[1] * (lit ? 2.6 : 1);
  scene.background.setHex(lit ? 0x2a3050 : 0);
  if (S.reg === 2) regionGroups[2].floor.material.map.offset.x = t0 / 300;
  if (S.reg === 5 && S.endt < 60) {
    const tv = tex(18, 5), { g, img } = tv.userData;
    const pal = [0x83, 0x76, 0x9c, 0xc2, 0xc3, 0xc7, 0x5f, 0x57, 0x4f];
    for (let y = 4; y <= 11; y++) for (let x = 3; x <= 12; x++) {
      const k = (y * 16 + x) * 4, j = Math.floor(Math.random() * 3) * 3;
      img.data[k] = pal[j]; img.data[k + 1] = pal[j + 1]; img.data[k + 2] = pal[j + 2];
    }
    g.putImageData(img, 0, 0);
    tv.needsUpdate = true;
  }
  // rain
  const top = R.ct ? R.h : 4, n = R.rn, sp = (S.endt > 60 ? 0 : 1);
  let si = 0;
  for (let i = 0; i < RAIN_N; i++) {
    const d = drops[i];
    const k = i * 6;
    if (i >= n || !sp) { rainPos.fill(0, k, k + 6); rainPos[k + 1] = rainPos[k + 4] = -50; continue; }
    d[1] -= .12; d[0] += R.wd * .025;
    if (d[1] < 0 || Math.abs(d[0] - px) > 5 || Math.abs(d[2] - py) > 5) {
      if (d[1] < 0 && d[1] > -.13 && si < 300 && !solid(d[0], d[2])) { splashPos[si * 3] = d[0]; splashPos[si * 3 + 1] = .01; splashPos[si * 3 + 2] = d[2]; si++; }
      d[0] = px + rnd(10) - 5; d[2] = py + rnd(10) - 5;
      d[1] = d[1] < -.5 ? rnd(top) : top;
    }
    if (solid(d[0], d[2])) { rainPos[k + 1] = rainPos[k + 4] = -50; continue; }
    rainPos[k] = d[0]; rainPos[k + 1] = d[1] + .22; rainPos[k + 2] = d[2];
    rainPos[k + 3] = d[0] + R.wd * .04; rainPos[k + 4] = d[1]; rainPos[k + 5] = d[2];
  }
  for (let i = si; i < 300; i++) splashPos[i * 3 + 1] = -50;
  rainGeo.attributes.position.needsUpdate = true;
  splashGeo.attributes.position.needsUpdate = true;
}

// tiny pixel font for the two lines of text
const FONT = {
  s: '111100111001111', t: '111010010010010', i: '111010010010111', l: '100100100100111', r: '110101110101101', a: '111101111101101',
  n: '110101101101101', g: '111100101101111', h: '101101111101101', e: '111100110100111', o: '111101101101111', p: '111101111100100',
  d: '110101101101110', c: '111100100100111', k: '101101110101101', '.': '000000000000010', ' ': '000000000000000', u: '101101101101111',
};
const ui = document.getElementById('ui'), ug = ui.getContext('2d');
const uimg = ug.createImageData(W, H);
function say(text, cx, y, col) {
  const w = text.length * 8 - 2;
  const x = Math.round(cx - w / 2);
  ug.fillStyle = '#000';
  ug.fillRect(x - 6, y - 5, w + 12, 20);
  ug.fillStyle = '#' + col;
  [...text].forEach((ch, i) => {
    const f = FONT[ch] || FONT[' '];
    for (let b = 0; b < 15; b++) if (f[b] === '1') ug.fillRect(x + i * 8 + (b % 3) * 2, y + Math.floor(b / 3) * 2, 2, 2);
  });
}
function speckle(f) {
  // the white dissolve between spaces
  const d = uimg.data;
  d.fill(0);
  if (f > .8) { ug.fillStyle = '#fff1e8'; ug.fillRect(0, 0, W, H); return; }
  const n = f * f * 0.085 * W * H;
  for (let i = 0; i < n; i++) { const k = Math.floor(Math.random() * W * H) * 4; d[k] = 255; d[k + 1] = 241; d[k + 2] = 232; d[k + 3] = 255; }
  ug.putImageData(uimg, 0, 0);
}
function drawUI() {
  ug.clearRect(0, 0, W, H);
  if (!started) { say('still raining', W / 2, 96, 'fff1e8'); say(isTouch ? 'tap to start' : 'click to start', W / 2, 150, '83769c'); return; }
  if (S.tr > 0) speckle(1 - Math.abs(S.tr - 20) / 20);
  if (S.endt > 0) {
    const w = S.endt < 60 ? S.endt / 60 : Math.max(0, 1 - (S.endt - 60) / 60);
    speckle(w);
    if (S.endt > 160) say('the rain stopped.', W / 2, 200, S.endt < 190 ? '5f574f' : 'c2c3c7');
  }
  if (S.t0 < 150 && S.tr === 0) say('still raining', W / 2, 60, S.t0 < 120 ? 'fff1e8' : 'c2c3c7');
}

function render(alpha) {
  updateWorld(alpha);
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(post, postCam);
  drawUI();
}

// ------------------------------------------------------------ loop
let started = false, last = 0, acc = 0, manual = false;
function start() {
  if (started) return;
  started = true;
  audioStart();
  music(REGS[S.reg - 1].mu, 1500);
  document.getElementById('hint').textContent = '';
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min((t - last) / 1000, 0.1);
  last = t;
  if (!manual && started) {
    acc += dt;
    while (acc >= 1 / 30) { tick(); acc -= 1 / 30; }
  }
  render(manual || !started ? 1 : acc * 30);
}

init();
const isTouch = 'ontouchstart' in window;
document.getElementById('hint').textContent = isTouch ? 'left thumb: walk · right thumb: look' : 'arrows / WASD: walk · mouse: look · Z + arrows: look up, step aside';
requestAnimationFrame(frame);

// hooks for the automatic test (tools/webtest.py)
window.G = {
  get S() { return S; }, get objs() { return objs; }, mget,
  manual(on) { manual = on; },
  tick(n, keys) { forced = {}; for (const k of keys || []) forced[k] = 1; for (let i = 0; i < n; i++) tick(); forced = null; },
  setKeys(keys) { forced = {}; for (const k of keys || []) forced[k] = 1; },
  step() { tick(); }, release() { forced = null; },
  render() { render(1); },
  start, audio: () => A.ctx && A.ctx.state,
};
