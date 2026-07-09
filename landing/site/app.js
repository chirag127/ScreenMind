import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060d, 0.05);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 0.2, 8.4);

// ── BIG BRAIN — seen from outside first ──
const group = new THREE.Group();
scene.add(group);
const COUNT = 22000;
const home = new Float32Array(COUNT * 3);
const pos = new Float32Array(COUNT * 3);
const vel = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);
const cbase = new Float32Array(COUNT * 3);
const c = new THREE.Color();
for (let i = 0; i < COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = Math.cbrt(Math.random());
  let x = Math.sin(phi) * Math.cos(theta) * 12.5 * r;
  let y = Math.cos(phi) * 8.75 * r;
  let z = Math.sin(phi) * Math.sin(theta) * 10.25 * r;
  x += x > 0 ? 1.4 : -1.4;
  x += (Math.random() - 0.5) * 1.4; y += (Math.random() - 0.5) * 1.4; z += (Math.random() - 0.5) * 1.4;
  home[i*3] = pos[i*3] = x; home[i*3+1] = pos[i*3+1] = y; home[i*3+2] = pos[i*3+2] = z;
  c.setHSL(0.72 - Math.random() * 0.14, 0.78, 0.52 + Math.random() * 0.18);
  colors[i*3] = cbase[i*3] = c.r; colors[i*3+1] = cbase[i*3+1] = c.g; colors[i*3+2] = cbase[i*3+2] = c.b;
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const cloudMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
const cloud = new THREE.Points(geo, cloudMat); cloud.frustumCulled = false; group.add(cloud);
const seg = [];
for (let i = 0; i < 260; i++) {
  const a = (Math.random() * COUNT) | 0; let best = -1, bd = 1e9;
  for (let k = 0; k < 6; k++) {
    const b = (Math.random() * COUNT) | 0;
    const dx = home[a*3]-home[b*3], dy = home[a*3+1]-home[b*3+1], dz = home[a*3+2]-home[b*3+2];
    const d = dx*dx+dy*dy+dz*dz; if (d < bd && b !== a) { bd = d; best = b; }
  }
  if (best >= 0) seg.push(home[a*3],home[a*3+1],home[a*3+2], home[best*3],home[best*3+1],home[best*3+2]);
}
const lgeo = new THREE.BufferGeometry();
lgeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
const lines = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending }));
group.add(lines);

// ── HERO BRAIN — pretty exterior view ──
const heroGroup = new THREE.Group(); scene.add(heroGroup);
const HCOUNT = 4600;
const hpos = new Float32Array(HCOUNT * 3), hcol = new Float32Array(HCOUNT * 3);
const hhome = new Float32Array(HCOUNT * 3), hvel = new Float32Array(HCOUNT * 3);
for (let i = 0; i < HCOUNT; i++) {
  const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
  const r = 0.82 + Math.random() * 0.18;
  let x = Math.sin(phi) * Math.cos(theta) * 2.5 * r;
  let y = Math.cos(phi) * 1.75 * r;
  let z = Math.sin(phi) * Math.sin(theta) * 2.05 * r;
  x += x > 0 ? 0.28 : -0.28;
  x += (Math.random() - 0.5) * 0.28; y += (Math.random() - 0.5) * 0.28; z += (Math.random() - 0.5) * 0.28;
  hpos[i*3]=hhome[i*3]=x; hpos[i*3+1]=hhome[i*3+1]=y; hpos[i*3+2]=hhome[i*3+2]=z;
  c.setHSL(0.72 - Math.random() * 0.14, 0.78, 0.52 + Math.random() * 0.18);
  hcol[i*3]=c.r; hcol[i*3+1]=c.g; hcol[i*3+2]=c.b;
}
const hgeo = new THREE.BufferGeometry();
hgeo.setAttribute('position', new THREE.BufferAttribute(hpos, 3));
hgeo.setAttribute('color', new THREE.BufferAttribute(hcol, 3));
const heroCloudMat = new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const heroCloud = new THREE.Points(hgeo, heroCloudMat); heroCloud.frustumCulled = false; heroGroup.add(heroCloud);
const hseg = [];
for (let i = 0; i < 260; i++) {
  const a = (Math.random() * HCOUNT) | 0; let best = -1, bd = 1e9;
  for (let k = 0; k < 6; k++) {
    const b = (Math.random() * HCOUNT) | 0;
    const dx = hpos[a*3]-hpos[b*3], dy = hpos[a*3+1]-hpos[b*3+1], dz = hpos[a*3+2]-hpos[b*3+2];
    const d = dx*dx+dy*dy+dz*dz; if (d < bd && b !== a) { bd = d; best = b; }
  }
  if (best >= 0) hseg.push(hpos[a*3],hpos[a*3+1],hpos[a*3+2], hpos[best*3],hpos[best*3+1],hpos[best*3+2]);
}
const hlgeo = new THREE.BufferGeometry();
hlgeo.setAttribute('position', new THREE.Float32BufferAttribute(hseg, 3));
const heroLines = new THREE.LineSegments(hlgeo, new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
heroGroup.add(heroLines);

// ── TRAVEL streaks (light-speed warp) ──
const WN = 1700, DISK = 13, ZBACK = -70, ZFRONT = 8, RANGE = 78;
const sx = new Float32Array(WN), sy = new Float32Array(WN), sz = new Float32Array(WN);
const wp = new Float32Array(WN * 2 * 3);
const wc = new Float32Array(WN * 2 * 3);
for (let i = 0; i < WN; i++) {
  const ang = Math.random() * Math.PI * 2, rad = Math.sqrt(Math.random()) * DISK;
  sx[i] = Math.cos(ang) * rad; sy[i] = Math.sin(ang) * rad;
  sz[i] = ZBACK + Math.random() * (ZFRONT - ZBACK);
  c.setHSL(0.70, 0.85, 0.85); wc[i*6]=c.r; wc[i*6+1]=c.g; wc[i*6+2]=c.b;
  c.setHSL(0.73, 0.85, 0.5);  wc[i*6+3]=c.r; wc[i*6+4]=c.g; wc[i*6+5]=c.b;
}
const wgeo = new THREE.BufferGeometry();
wgeo.setAttribute('position', new THREE.BufferAttribute(wp, 3));
wgeo.setAttribute('color', new THREE.BufferAttribute(wc, 3));
const wmat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const warp = new THREE.LineSegments(wgeo, wmat); warp.frustumCulled = false; scene.add(warp);

// ── Post-processing ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.1, 0.7, 0.1);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ── Pointer ──
const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const mouse = new THREE.Vector2(-10, -10);
const pWorld = new THREE.Vector3(999, 999, 999);
const pLocal = new THREE.Vector3(999, 999, 999);
addEventListener('pointermove', e => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1; });

// ── Docs (rendered from content.js) ──
const article = document.getElementById('article');
const docNavEl = document.getElementById('docnav');
const docSelEl = document.getElementById('docsel');
const docEl = document.getElementById('doc');
const flashEl = document.getElementById('flash');
const strandEl = document.getElementById('strand');

const PAGES = (window.SITE_CONTENT || {}).pages || {};
const NAV = (window.SITE_CONTENT || {}).nav || [];

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function renderBlocks(blocks) {
  return (blocks || []).map(b => {
    if (b.h)    return `<h2>${b.h}</h2>`;
    if (b.h3)   return `<h3>${b.h3}</h3>`;
    if (b.p)    return `<p>${b.p}</p>`;
    if (b.code) return `<div class="code">${esc(b.code).replace(/\n/g, '<br>')}</div>`;
    if (b.list) return `<ul>${b.list.map(i => `<li>${i}</li>`).join('')}</ul>`;
    if (b.callout) return `<div class="callout">${b.callout}</div>`;
    if (b.cards) return `<div class="cards">${b.cards.map(c => `<div class="card"><div class="ci">${c.i}</div><div class="ct">${c.t}</div><div class="cd">${c.d}</div></div>`).join('')}</div>`;
    if (b.steps) return `<div class="steps">${b.steps.map((s, idx) => `<div class="step"><div class="sn">${idx + 1}</div><div class="st">${s.t}</div><div class="sd">${s.d}</div></div>`).join('')}</div>`;
    if (b.youtube) return `<div class="ytembed"><iframe src="https://www.youtube.com/embed/${b.youtube}" title="ScreenMind demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    if (b.img) return `<img class="media" src="${b.img}" alt="${b.alt || 'ScreenMind'}" loading="lazy">`;
    if (b.loopvideo) return `<video class="media" src="${b.loopvideo}" autoplay muted loop playsinline preload="metadata"></video>`;
    if (b.video) return `<video class="media" src="${b.video}" controls playsinline preload="metadata">Your browser can't play this video.</video>`;
    if (b.table) return `<div class="tablewrap"><table class="ctable"><thead><tr>${b.table.head.map((h,i)=>`<th${i===1?' class="sm"':''}>${h}</th>`).join('')}</tr></thead><tbody>${b.table.rows.map(r=>`<tr>${r.map((cell,ci)=>`<td${ci===1?' class="sm"':''}>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    if (b.stats) return `<div class="statrow">${b.stats.map(s => `<div class="statbox"><div class="statn">${s.n}</div><div class="statl">${s.l}</div></div>`).join('')}</div>`;
    if (b.diagram) return `<pre class="diagram">${esc(b.diagram)}</pre>`;
    return '';
  }).join('');
}
function docMore(active) {
  const links = NAV.map(g => g.items.filter(([k]) => k !== active).map(([k, label]) => `<a href="/${k}/" data-nav="${k}">${label}</a>`).join('')).join('');
  return `<div class="docmore"><div class="grp">Explore more</div>${links}</div>` +
    `<div class="docfoot"><a href="https://github.com/ayushh0110/ScreenMind" target="_blank" rel="noopener">GitHub</a><a href="https://pypi.org/project/screenmind/" target="_blank" rel="noopener">PyPI</a><a href="https://youtu.be/CxkkBT_EvPw?si=I3McH0k1vIhVxyMz" target="_blank" rel="noopener">Walkthrough</a><a href="https://github.com/ayushh0110/ScreenMind/issues/new" target="_blank" rel="noopener">Raise an issue</a><a href="https://x.com/ayushh_ss" target="_blank" rel="noopener">X</a><a href="https://www.linkedin.com/in/ayushhss/" target="_blank" rel="noopener">LinkedIn</a><a href="mailto:shekharayush5678@gmail.com">Email</a><div class="copy">ScreenMind — 100% local, MIT-licensed.</div></div>`;
}
function buildDocNav(active) {
  if (docNavEl) docNavEl.innerHTML = NAV.map(g =>
    `<div class="grp">${g.group}</div>` +
    g.items.map(([k, label]) => `<a href="/${k}/" data-nav="${k}" class="${k === active ? 'active' : ''}">${label}</a>`).join('')
  ).join('');
  if (docSelEl) {
    docSelEl.innerHTML = NAV.map(g => `<optgroup label="${g.group}">` + g.items.map(([k, label]) => `<option value="${k}" ${k === active ? 'selected' : ''}>${label}</option>`).join('') + `</optgroup>`).join('');
  }
}
let currentDocKey = 'features';
function setDoc(key) {
  const P = PAGES[key] || PAGES.features;
  currentDocKey = PAGES[key] ? key : 'features';
  article.innerHTML =
    `<div class="tag">${P.tag || ''}</div><h1 class="lumin">${P.title}</h1>` +
    renderBlocks(P.blocks) +
    docMore(currentDocKey) +
    `<a class="jump" href="/" data-jump="__home">↯ back to the brain</a>`;
  buildDocNav(currentDocKey);
  article.scrollTop = 0;
}
let swapT = 0;
function swapDoc(key) {
  if (key === currentDocKey || !PAGES[key]) return;
  swapT = performance.now();          // light warp plays in the BACKGROUND
  curCorner = CORNER[key] || CORNER.features;   // drift to a new corner — feels like we travelled
  setDoc(key);                        // content appears instantly
}

// ── State + transition ──
let pageState = 'home';
let transitioning = false, tStart = 0, toPage = 'home', pendingKey = 'features', swapped = false, micro = false;
const DUR = 900, PEAK = 165, LENF = 0.2;
const CORNER = {
  features:         { start: [-1, -1], end: [-1,   0.7] },
  install:          { start: [ 1, -1], end: [ 1,  -0.7] },
  'chat-search':    { start: [-1,  1], end: [-1,  -0.7] },
  'voice-meetings': { start: [ 1,  1], end: [ 1,   0.7] },
  agents:           { start: [-1, -1], end: [-0.7, 1] },
  mcp:              { start: [ 1,  1], end: [ 0.7,-1] },
  privacy:          { start: [ 1, -1], end: [ 0.7, 1] },
  'how-it-works':   { start: [-1,  1], end: [-0.7,-1] },
  home:             { start: [ 0,  0], end: [ 0,   0] },
};
let curCorner = CORNER.home;
function go(target, docKey) {
  if (transitioning) return;
  if (target === 'home' && pageState === 'home') return;
  transitioning = true; tStart = performance.now(); toPage = target; pendingKey = docKey; swapped = false;
  curCorner = target === 'home' ? CORNER.home : (CORNER[docKey] || CORNER.install);
}

// ── Client router (preserves warp; each doc has a real URL) ──
function keyFromPath() {
  const seg = location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  return PAGES[seg] ? seg : null;
}
function navTo(key, push = true) {
  if (key === '__home' || key === null) {
    if (pageState !== 'home') go('home');
    if (push) history.pushState({}, '', '/');
    return;
  }
  if (!PAGES[key]) return;
  if (pageState === 'doc') { if (key !== currentDocKey) swapDoc(key); }
  else go('doc', key);
  if (push) history.pushState({}, '', `/${key}/`);
}
document.addEventListener('click', e => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;   // let new-tab / modified clicks pass
  const a = e.target.closest('[data-doc],[data-nav],[data-jump],[data-home]');
  if (!a) return;
  e.preventDefault();
  if (a.hasAttribute('data-home') || a.dataset.jump === '__home') { navTo('__home'); return; }
  navTo(a.dataset.doc || a.dataset.nav || a.dataset.jump);
});
if (docSelEl) docSelEl.addEventListener('change', () => navTo(docSelEl.value));

// ── click-to-copy (hero install pill) ──
document.addEventListener('click', e => {
  const cp = e.target.closest('[data-copy]');
  if (!cp) return;
  if (navigator.clipboard) navigator.clipboard.writeText(cp.dataset.copy).catch(() => {});
  const t = cp.querySelector('.pilltext'); if (!t) return;
  if (cp._t) clearTimeout(cp._t); else cp._orig = t.textContent;
  t.textContent = '✓ Copied!';
  cp._t = setTimeout(() => { t.textContent = cp._orig; cp._t = null; }, 1300);
});
addEventListener('popstate', () => {
  const key = keyFromPath();
  if (key) { if (pageState === 'home') go('doc', key); else if (key !== currentDocKey) swapDoc(key); }
  else if (pageState === 'doc') go('home');
});

// ── Initial state from URL (direct load of a doc page) ──
const camLean = { x: 0, y: 0 };
const initKey = keyFromPath();
if (initKey) {
  pageState = 'doc'; setDoc(initKey);
  document.body.classList.add('is-doc'); document.body.classList.remove('is-home');
  document.body.style.overflow = 'hidden';
  docEl.style.opacity = 1; docEl.style.pointerEvents = 'auto';
  if (docNavEl) { docNavEl.style.opacity = 1; docNavEl.style.pointerEvents = 'auto'; }
  curCorner = CORNER[initKey] || CORNER.features;
  camLean.x = curCorner.end[0]; camLean.y = curCorner.end[1];
} else {
  document.body.classList.add('is-home');
}

// ── Scroll ──
const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
let last = performance.now();
const tmpV = new THREE.Vector3();
const lookAtV = new THREE.Vector3();
const camLocalV = new THREE.Vector3();
let progress = 0;
const panels = [...document.querySelectorAll('.panel')];
function refresh() {
  const max = document.body.scrollHeight - innerHeight;
  progress = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0;
  if (pageState === 'home' && !transitioning)
    for (const pl of panels) pl.classList.toggle('on', progress >= +pl.dataset.a && progress <= +pl.dataset.b);
}
addEventListener('scroll', refresh, { passive: true });
refresh();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  const time = now * 0.001;
  let swapMW = 0;
  if (swapT) { const e = (now - swapT) / 480; if (e >= 1) swapT = 0; else swapMW = Math.sin(e * Math.PI) * 0.35; }

  let w = 0, ov = 0;
  const total = micro ? DUR * 0.5 : DUR;
  const A = total * 0.45, D = total * 0.55;
  if (transitioning) {
    const el = now - tStart; ov = Math.min(el / total, 1);
    if (el < A) w = smooth(el / A);
    else if (el < A + D) {
      if (!swapped) {
        pageState = toPage; swapped = true;
        if (pageState === 'doc') {
          setDoc(pendingKey); document.body.style.overflow = 'hidden';
          document.body.classList.add('is-doc'); document.body.classList.remove('is-home');
        } else {
          document.body.style.overflow = ''; scrollTo(0, 0);
          document.body.classList.remove('is-doc'); document.body.classList.add('is-home');
        }
      }
      w = smooth(1 - (el - A) / D);
    } else { w = 0; transitioning = false; if (pageState === 'home') refresh(); }
  }

  docEl.style.opacity = pageState === 'doc' ? (1 - w) : 0;
  docEl.style.pointerEvents = (!transitioning && pageState === 'doc') ? 'auto' : 'none';
  if (docNavEl) { docNavEl.style.opacity = pageState === 'doc' ? 1 : 0; docNavEl.style.pointerEvents = (!transitioning && pageState === 'doc') ? 'auto' : 'none'; }
  strandEl.style.opacity = pageState === 'doc' ? 0.5 * (1 - w) : 0;

  flashEl.style.opacity = Math.pow(Math.max(0, (w - 0.55) / 0.45), 2) * 0.9;
  if (transitioning && pageState === 'home') for (const pl of panels) pl.classList.remove('on');

  const homeVis = (pageState === 'home') ? (1 - w) : 0;
  const enterFade = Math.min(Math.max((progress - 0.06) / 0.14, 0), 1);

  heroCloudMat.opacity = 0.92 * homeVis * (1 - enterFade);
  heroCloud.visible = heroCloudMat.opacity > 0.01;
  heroLines.material.opacity = heroCloud.visible ? (0.12 + Math.sin(time * 1.6) * 0.06) * homeVis * (1 - enterFade) : 0;
  heroGroup.visible = heroCloud.visible;
  heroGroup.rotation.y = time * 0.05;

  const docVis = (pageState === 'doc') ? (1 - w) : 0;
  cloudMat.opacity = 0.85 * homeVis * enterFade + 0.42 * docVis;
  cloud.visible = cloudMat.opacity > 0.01;
  lines.material.opacity = cloud.visible ? (0.10 + Math.sin(time * 1.6) * 0.05) * homeVis * enterFade : 0;
  group.visible = cloud.visible;

  const spd = lerp(0, PEAK, w) + swapMW * 80;
  wmat.opacity = Math.max(w, swapMW);
  const streak = Math.min(0.2 + spd * LENF, 42);
  for (let i = 0; i < WN; i++) {
    sz[i] += spd * dt;
    if (sz[i] > ZFRONT) sz[i] -= RANGE;
    const o = i * 6;
    wp[o]   = sx[i]; wp[o+1] = sy[i]; wp[o+2] = sz[i];
    wp[o+3] = sx[i]; wp[o+4] = sy[i]; wp[o+5] = sz[i] - streak;
  }
  wgeo.attributes.position.needsUpdate = true;

  ray.setFromCamera(mouse, camera);
  if (heroCloud.visible) {
    if (ray.ray.intersectPlane(plane, pWorld)) { pLocal.copy(pWorld); heroGroup.worldToLocal(pLocal); }
    else pLocal.set(999, 999, 999);
    for (let i = 0; i < HCOUNT; i++) {
      const ix = i*3, iy = ix+1, iz = ix+2;
      const dx = hpos[ix]-pLocal.x, dy = hpos[iy]-pLocal.y, dz = hpos[iz]-pLocal.z;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < 1.7 && d > 1e-4) { const f = (1.7-d)*0.075/d; hvel[ix]+=dx*f; hvel[iy]+=dy*f; hvel[iz]+=dz*f; }
      hvel[ix]+=(hhome[ix]-hpos[ix])*0.035; hvel[iy]+=(hhome[iy]-hpos[iy])*0.035; hvel[iz]+=(hhome[iz]-hpos[iz])*0.035;
      hvel[ix]*=0.85; hvel[iy]*=0.85; hvel[iz]*=0.85;
      hpos[ix]+=hvel[ix]; hpos[iy]+=hvel[iy]; hpos[iz]+=hvel[iz];
    }
    hgeo.attributes.position.needsUpdate = true;
  }
  if (cloud.visible) {
    pLocal.copy(ray.ray.origin).addScaledVector(ray.ray.direction, 6);
    group.worldToLocal(pLocal);
    camLocalV.copy(camera.position); group.worldToLocal(camLocalV);
    for (let i = 0; i < COUNT; i++) {
      const ix = i*3, iy = ix+1, iz = ix+2;
      const dx = pos[ix]-pLocal.x, dy = pos[iy]-pLocal.y, dz = pos[iz]-pLocal.z;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < 1.8 && d > 1e-4) { const f = (1.8-d)*0.05/d; vel[ix]+=dx*f; vel[iy]+=dy*f; vel[iz]+=dz*f; }
      vel[ix]+=(home[ix]-pos[ix])*0.035; vel[iy]+=(home[iy]-pos[iy])*0.035; vel[iz]+=(home[iz]-pos[iz])*0.035;
      vel[ix]*=0.85; vel[iy]*=0.85; vel[iz]*=0.85;
      pos[ix]+=vel[ix]; pos[iy]+=vel[iy]; pos[iz]+=vel[iz];
      const cdx = pos[ix]-camLocalV.x, cdy = pos[iy]-camLocalV.y, cdz = pos[iz]-camLocalV.z;
      const cd = Math.sqrt(cdx*cdx + cdy*cdy + cdz*cdz);
      const a = Math.min(Math.max((cd - 1.5) / 2.5, 0), 1);
      colors[ix]=cbase[ix]*a; colors[ix+1]=cbase[ix+1]*a; colors[ix+2]=cbase[ix+2]*a;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  if (!transitioning && pageState === 'home') {
    const p = progress;
    const cz = p < 0.2 ? lerp(8.4, -2, smooth(p / 0.2)) : lerp(-2, -8, (p - 0.2) / 0.8);
    const wIn = smooth(Math.min(Math.max((p - 0.2) / 0.18, 0), 1));
    const wx = (Math.sin(p * 6.0 + 0.6) * 4.0 + Math.sin(time * 0.15) * 0.4) * wIn;
    const wy = (Math.cos(p * 5.0) * 3.0 + Math.cos(time * 0.13) * 0.3) * wIn;
    camera.position.lerp(tmpV.set(wx, wy, cz), 0.12);
    camera.up.set(0, 1, 0);
    const lx = Math.sin((p + 0.06) * 6.0 + 0.6) * 4.0 * wIn;
    const ly = Math.cos((p + 0.06) * 5.0) * 3.0 * wIn;
    camera.lookAt(lx, ly, cz - 8);
    camera.rotateZ(Math.sin(time * 0.08) * 0.05 * wIn);
  } else {
    const targetLean = transitioning ? (ov < 0.5 ? curCorner.start : curCorner.end) : curCorner.end;
    const es = transitioning ? 0.14 : (swapMW > 0.01 ? 0.11 : 0.05);
    camLean.x += (targetLean[0] - camLean.x) * es;
    camLean.y += (targetLean[1] - camLean.y) * es;
    const cxo = camLean.x * 5.0, cyo = camLean.y * 3.5;
    const wz = transitioning ? (-1 - 5 * Math.sin(Math.min(ov, 1) * Math.PI)) : -1;
    camera.position.lerp(tmpV.set(cxo + Math.sin(time * 0.13) * 0.3, cyo + 0.2 + Math.cos(time * 0.11) * 0.2, wz), 0.15);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookAtV.set(cxo * 0.6, cyo * 0.6, wz - 8));
    camera.rotateZ(-camLean.x * 0.08);
  }
  group.rotation.y = time * 0.05 + progress * 1.4;
  camera.fov = 60 + w * 18 + swapMW * 8; camera.updateProjectionMatrix();
  bloom.strength = (pageState === 'doc' && !transitioning ? 0.7 : 1.1) + w * 1.3 + swapMW * 0.5;

  composer.render();
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
