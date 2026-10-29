/* 봉봉봉 — 상점 화면 전부. 가격·상품은 ITEMS, TIN 게임 시간은 TIN_HOURS만 고치면 된다. */
(() => {
'use strict';

const RATE = 20000, AI_RATE = 5000, HOUR = RATE + AI_RATE;
/* 주문을 받을 디스코드 포럼 채널의 웹후크 주소. 비어 있으면 "복사 → DM"으로만 받는다. */
const DISCORD = { webhook: 'https://discord.com/api/webhooks/1564973701697507438/F-r_V9ZolGjywsiOHrfTN3xceXLt4WQWqPn-IjKzQMYLayQOe9R3kWP5OcMqx8qYHpbY', guild: '1533421689558270152' }; // 주문 포럼은 이놀아안 개인 서버. 손님은 못 들어가니 링크를 주지 않는다

/* ── 사이트의 글: 전부 dialogue.js에 있다(사용자가 직접 고치는 파일) ──
   T('키', { 이름: … })는 {이름} 자리를 채워 돌려준다. 배열이면 하나를 고른다.
   F('키', { 링크: 요소 })는 자리에 요소를 끼운 조각 목록을 돌려준다(el의 자식으로 쓴다). */
const D = window.DIALOGUE || {};
const pick = key => key.split('.').reduce((o, k) => o?.[k], D);
function T(key, vars = {}) {
  let v = pick(key);
  if (Array.isArray(v)) v = v[Math.floor(Math.random() * v.length)];
  return String(v ?? '').replace(/\{([^}]+)\}/g, (m, k) => vars[k] ?? m);
}
const F = (key, vars = {}) => String(pick(key) ?? '').split(/(\{[^}]+\})/).map(x => { const k = x.match(/^\{([^}]+)\}$/)?.[1]; return k && k in vars ? vars[k] : x; }).filter(x => x !== '');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const won = n => n.toLocaleString('ko-KR') + '원';
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(kids)) if (c != null) n.append(c);
  return n;
};

/* ── TINProject 게임별 들인 시간. 사용자가 알려 주면 채운다: { game_id: 시간 } ── */
// 실제로 들인 시간(사용자가 알려 줌). 여기 있는 게임만 시간 막대의 동그라미가 된다.
const TIN_HOURS = { mage_arcana: 1, stone_story_rpg: 3, stacking_descent: 8, physics_puzzle_platformer: 14, guineastar: 20, platformer: 26, pixel_arena: 28, fleshpit: 70 };

/* ── 그림: art/의 원본을 투명 여백만 잘라 img/*.webp로 둔다 ── */
const IMG = k => `img/${k}.webp`;
const SLOTS = ['ui_slot', 'ui_slot_pink', 'ui_slot_yellow', 'ui_slot_blue'];
// 상품 아이콘. 프레임 그림(<이름>_f1~3)이 있으면 아래 FRAMED에 이름을 더해 움직이게 한다
const FRAMED = new Set(['game', 'web', 'bot', 'read', 'song', 'oracle', 'research', 'xpost', 'key', 'gear', 'partner', 'face', 'gift', 'setup', 'playtest', 'dice', 'theme']);
// 움직이는 아이콘은 멈춘 때에도 f1을 쓴다(정지 그림과 크기가 조금 달라 바꿀 때 튀지 않게)
const icon = (k, cls = '') => { const m = img(FRAMED.has(k) ? `${k}_f1` : k, cls); m.dataset.icon = k; return m; };
if (!REDUCED) {
  const SEQ = [1, 2, 3, 2]; let tick = 0; // 1초에 7장쯤, 칸마다 박자를 어긋나게
  FRAMED.forEach(k => [2, 3].forEach(i => { new Image().src = IMG(`${k}_f${i}`); })); // 미리 받아 두어 깜빡이지 않게
  setInterval(() => {
    if (!FRAMED.size || document.hidden) return; tick++;
    document.querySelectorAll('img[data-icon]').forEach((m, j) => { const k = m.dataset.icon; if (FRAMED.has(k)) m.src = IMG(`${k}_f${SEQ[(tick + j) % 4]}`); });
  }, 143);
}
const sign = (k, text) => el('img', { src: IMG(`sign_${k}`), alt: text, class: 'sign-img' });
const img = (k, cls = '') => el('img', { src: IMG(k), alt: '', class: cls, loading: 'lazy', decoding: 'async' });

/* ── 상품 ── */
const CATS = ['make', 'voice', 'brain', 'ss0'].map(id => ({ id, name: id, sub: '', ...D.cats?.[id] }));
// 이름·설명·값 글은 dialogue.js의 goods에 있다. 여기는 계산에 쓰는 값만
const ITEMS = [
  { id: 'game', cat: 'make', icon: 'game', c: '#7a5cff', badgeStyle: 'hot', kind: 'hours' },
  { id: 'web', cat: 'make', icon: 'web', c: '#4ab8ff', kind: 'web' },
  { id: 'bot', cat: 'make', icon: 'bot', c: '#2fe0b0', kind: 'bot' },
  { id: 'read', cat: 'voice', icon: 'read', c: '#ff7ac0', kind: 'read' },
  { id: 'song', cat: 'voice', icon: 'song', c: '#ffc93c', kind: 'qty', price: 2000 },
  { id: 'oracle', cat: 'brain', icon: 'oracle', c: '#7a5cff', badgeStyle: 'free', kind: 'pwyw' },
  { id: 'research', cat: 'brain', icon: 'research', c: '#4ab8ff', kind: 'text', price: 10000 },
  { id: 'xpost', cat: 'brain', icon: 'xpost', c: '#ffffff', kind: 'qty', price: 1000 },
  { id: 'dm', cat: 'ss0', icon: 'key', c: '#ffc93c', kind: 'dm' },
  { id: 'ss0feat', cat: 'ss0', icon: 'gear', c: '#2fe0b0', kind: 'quote' },
  { id: 'partner', cat: 'make', icon: 'partner', c: '#ff7ac0', kind: 'partner' },
  { id: 'pix', cat: 'soon', icon: 'face', c: '#ff7ac0', soon: true },
  { id: 'giftgame', cat: 'soon', icon: 'gift', c: '#ff2e4d', soon: true },
  { id: 'aisetup', cat: 'soon', icon: 'setup', c: '#4ab8ff', soon: true },
  { id: 'playtest', cat: 'soon', icon: 'playtest', c: '#7a5cff', soon: true },
  { id: 'trpg', cat: 'soon', icon: 'dice', c: '#ffc93c', soon: true },
  { id: 'theme', cat: 'soon', icon: 'theme', c: '#2fe0b0', soon: true },
];
ITEMS.forEach(it => { const g = D.goods?.[it.id] || {};
  Object.assign(it, { name: g.name || it.id, sub: g.sub || '', priceText: g.price || '', desc: g.desc || '', field: g.field || '', hint: g.hint || '', unit: g.unit || '',
    badge: g.badge ? [g.badge, it.badgeStyle || ''] : null }); });
// 상품별 예시 칸("이걸로 뭐 할 건데?")
const USES = Object.fromEntries(ITEMS.filter(it => D.goods?.[it.id]?.ask).map(it => [it.id, { q: D.goods[it.id].ask, ex: D.goods[it.id].examples || [] }]));
const named = (list, key) => list.map(o => ({ ...o, name: o.id, sub: '', ...pick(`detail.${key}.${o.id}`) }));
const WEB_STEPS = [[.5, 10000], [1, 20000], [2, 35000], [3, 50000], [4, 65000], [5, 80000], [6, 100000]]
  .map(([h, p], i) => ({ h, p, title: '', desc: '', ...D.detail?.webSteps?.[i] }));
const READ_TIERS = named([{ id: 'plain', rate: 10 }, { id: 'base', rate: 20 }, { id: 'act', rate: 35 }, { id: 'soul', rate: 50 }], 'readTiers');
const BOT_TIERS = named([{ id: 'mini', build: 30000, month: 3000 }, { id: 'work', build: 80000, month: 7000 }, { id: 'soul', build: 150000, month: 15000 }], 'botTiers');
const FEAT_KINDS = named([{ id: 'cmd' }, { id: 'data' }, { id: 'ui' }, { id: 'ai' }, { id: 'mem' }], 'featKinds');
const CARTS = ['bounce', 'curser2', 'squashy', 'train', 'eatkano'].map(id => ({ id, name: pick(`detail.carts.${id}`) || id }));
let idleTimer;
function poke() { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!$('#checkout').open) say(T('idle')); poke(); }, 25000); }
['pointerdown', 'keydown'].forEach(t => addEventListener(t, poke, { passive: true }));

/* ── 상태 ── */
const state = { cat: 'make', cart: [], item: null, draft: null };
let seq = 0;

/* ── 주인장 ── */
let typeTimer;
// 타자 효과 없이 바로 바꾼다(막대를 움직이는 동안)
function sayNow(text) {
  clearInterval(typeTimer); $('#keeper-line').textContent = text;
  if (detail.getAttribute('aria-hidden') === 'false') $('#detail-say').textContent = text;
}
function say(text) {
  if (detail.getAttribute('aria-hidden') === 'false') $('#detail-say').textContent = text;
  const p = $('#keeper-line');
  clearInterval(typeTimer);
  if (REDUCED) { p.textContent = text; return; }
  p.textContent = ''; let i = 0;
  typeTimer = setInterval(() => {
    p.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(typeTimer);
  }, 28);
}

/* ── 진열대: 입 안에서 도는 원통 ──
   스크롤을 내리면 원통이 한 칸씩 돌아 상품이 전부 앞으로 지나간다(화면은 그동안 고정).
   끌어도 돌고, 옆 칸을 누르면 그 칸이 앞으로 오고, 앞에 온 칸을 누르면 열린다.
   ScrollTrigger가 없으면 예전처럼 범주별 격자로 보여 준다. */
const SHELF = CATS.flatMap(c => ITEMS.filter(i => i.cat === c.id && !i.soon));
const ring = { pos: 0, target: 0, lap: 0, mix: 0, cards: [], st: null, front: -1, vel: 0 }; // lap: 끝에서 처음으로 넘어간 바퀴 수×n
function selectTab(id) {
  state.cat = id;
  $('#rail').querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.cat === id)));
}
function renderRail() {
  const rail = $('#rail'); rail.replaceChildren();
  rail.setAttribute('role', 'tablist');
  for (const c of CATS) rail.append(el('button', { class: 'tab', role: 'tab', 'data-cat': c.id, 'aria-selected': String(c.id === state.cat),
    onclick: () => { selectTab(c.id); say(T(`cat.${c.id}`));
      if (ring.st) ringGo(nearest(SHELF.findIndex(i => i.cat === c.id)));
      else $(`#cat-${c.id}`)?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); } },
    [c.name, el('small', { text: c.sub })]));
}
function renderShelf() {
  if (window.gsap && window.ScrollTrigger) renderRing(); else renderGrid();
}
function renderGrid() {
  const shelf = $('#shelf'); shelf.replaceChildren();
  for (const cat of CATS) {
    const grid = el('div', { class: 'grid' }, ITEMS.filter(i => i.cat === cat.id).map(it => makeCard(it)));
    shelf.append(el('section', { class: 'cat-sec', id: `cat-${cat.id}` }, [el('div', { class: 'shelf-head' }, [el('h2', { text: cat.name }), el('p', { text: cat.sub })]), grid]));
  }
  const seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) selectTab(e.target.id.slice(4)); }), { rootMargin: '-35% 0px -60% 0px' });
  shelf.querySelectorAll('.cat-sec').forEach(sec => seen.observe(sec));
}
function renderRing() {
  gsap.registerPlugin(ScrollTrigger);
  const shelf = $('#shelf'); shelf.replaceChildren();
  const wrap = el('div', { class: 'ring', role: 'listbox', 'aria-label': T('shelf.ringLabel'), tabindex: '0' });
  ring.cards = SHELF.map((it, i) => {
    const c = makeCard(it, () => { if (ring.moved) return; if (ring.spread) return pickSpread(i); if (i === ring.front) chompThen(() => openDetail(it)); else ringGo(nearest(i)); });
    c.setAttribute('role', 'option'); c.tabIndex = -1; wrap.append(c); return c;
  });
  wrap.prepend(img('stage_tongue', 'tongue')); // 앞에 온 칸이 올라서는 혀
  const cat = el('h2', { class: 'ring-cat' }), catSub = el('p', { class: 'ring-catsub' });
  const fName = el('h3', { class: 'front-name' }), fDesc = el('p', { class: 'front-desc' });
  const fBtn = el('button', { class: 'btn-buy pic front-open', 'aria-label': T('shelf.open'), text: T('shelf.open'), onclick: () => chompThen(() => openDetail(SHELF[Math.max(0, ring.front)])) });
  // 위치는 숫자 대신 상품 그림 줄로 보여 준다. 누르면 그 상품으로 돈다
  const count = el('div', { class: 'ring-dots', role: 'tablist', 'aria-label': T('shelf.dotsLabel') }, SHELF.map((it, i) =>
    el('button', { class: 'ring-dot', 'aria-label': it.name, title: it.name, onclick: () => ringGo(nearest(i)) }, icon(it.icon))));
  const spread = el('button', { class: 'ring-spread', 'aria-expanded': 'false', text: T('shelf.spread'), onclick: () => toggleSpread() });
  const prev = el('button', { class: 'ring-nav', 'aria-label': T('shelf.prev'), text: '◀', onclick: () => ringGo(ring.front - 1) });
  const next = el('button', { class: 'ring-nav', 'aria-label': T('shelf.next'), text: '▶', onclick: () => ringGo(ring.front + 1) });
  const stage = el('section', { class: 'stage', id: 'stage' }, [
    el('div', { class: 'ring-head' }, [$('#rail'), cat, catSub]), // 범주 탭도 고정된 판 안에 둔다
    wrap,
    el('div', { class: 'front' }, [el('div', { class: 'front-text' }, [fName, fDesc]), fBtn]),
    el('div', { class: 'ring-bar' }, [prev, count, next, spread]),
  ]);
  shelf.append(stage);
  ring.ui = { cat, catSub, fName, fDesc, count, wrap, spread, stage, front: stage.querySelector('.front') };

  const n = SHELF.length;
  ring.st = ScrollTrigger.create({ trigger: stage, start: 'top top', end: () => '+=' + Math.round((n - 1) * innerHeight * .42), pin: true, pinSpacing: true,
    onUpdate: self => { ring.target = ring.lap + self.progress * (n - 1); },
    snap: { snapTo: 1 / (n - 1), duration: { min: .2, max: .6 }, delay: .08, ease: 'power2.inOut' } });

  // 끌기: 누른 채 옆으로 밀면 원통만 돌리고(스크롤은 그대로), 놓으면 가장 가까운 칸으로 스크롤을 옮긴다.
  // 끄는 동안 스크롤을 건드리면 멈출 때마다 칸 맞추기(snap)가 손 밑에서 원통을 끌어가서 따로 돈다.
  let sx = 0, t0 = 0, down = false;
  const end = () => {
    if (!down) return; down = false;
    if (ring.moved) ringGo(Math.round(ring.target) - ring.lap, true);
    setTimeout(() => { ring.moved = false; }, 0); // 놓을 때 생기는 click이 칸을 열지 않게
  };
  wrap.addEventListener('dragstart', e => e.preventDefault()); // 그림을 끌어 가 버리면 놓은 걸 못 듣는다
  wrap.addEventListener('pointerdown', e => { if (e.button !== 0 || ring.spread) return; down = true; ring.moved = false; sx = e.clientX; t0 = ring.target; });
  wrap.addEventListener('pointermove', e => {
    if (!down) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) return end(); // 창 밖에서 놓고 들어온 경우
    const dx = e.clientX - sx;
    if (!ring.moved && Math.abs(dx) > 6) { ring.moved = true; wrap.setPointerCapture(e.pointerId); }
    if (ring.moved) ring.target = t0 - dx / 180; // 끝을 넘어가면 처음으로 이어진다
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => wrap.addEventListener(t, end));
  wrap.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); ringGo(ring.front + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ringGo(ring.front - 1); }
    if (e.key === 'Home') { e.preventDefault(); ringGo(0); }
    if (e.key === 'End') { e.preventDefault(); ringGo(SHELF.length - 1); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(SHELF[Math.max(0, ring.front)]); }
  });

  // 처음엔 원통이 한 바퀴 반쯤 돌면서 들어온다
  ring.pos = REDUCED ? 0 : -n * .6;
  gsap.ticker.add(ringTick);
}
// i: 이번 바퀴 안에서의 칸 번호. 11번째 다음(n)이나 1번째 앞(-1)이면 바퀴를 넘기고 스크롤을 반대쪽 끝으로 옮긴다.
// 화면은 고정돼 있어 스크롤이 튀어도 보이지 않고, 원통은 한 칸만 돈다.
// 한눈에 보기: 원통의 칸들이 그대로 날아가 판에 펼쳐지고, 접으면 원통 제자리로 돌아간다.
// ring.mix는 0(원통)~1(펼침). 칸마다 조금씩 늦게 출발해 차례로 날아간다.
function toggleSpread(on = !ring.spread, then) {
  const u = ring.ui;
  ring.spread = on;
  u.stage.classList.toggle('spreading', on); u.spread.setAttribute('aria-expanded', String(on));
  u.spread.textContent = on ? T('shelf.unspread') : T('shelf.spread');
  document.documentElement.classList.toggle('locked', on); // 펼친 동안 스크롤로 원통이 돌지 않게
  if (on) ring.layout = spreadLayout();
  gsap.killTweensOf(ring, 'mix');
  gsap.to(ring, { mix: on ? 1 : 0, duration: REDUCED ? 0 : .75, ease: 'power3.inOut', onComplete: then });
  say(on ? T('spread') : T(`cat.${state.cat}`));
}
// 펼친 판에서 하나 고르면: 그 칸이 앞에 오게 원통을 맞춰 두고 접은 뒤 연다
function pickSpread(i) {
  ringGo(nearest(i), true); ring.pos = ring.target;
  toggleSpread(false, () => chompThen(() => openDetail(SHELF[i])));
}
// 칸 크기에 맞춰 가장 크게 보이는 열 수를 고른다. 아래 설명판 자리까지 쓴다
function spreadLayout() {
  const u = ring.ui, n = ring.cards.length, W = u.wrap.clientWidth;
  const cw = ring.cards[0].offsetWidth, ch = ring.cards[0].offsetHeight * 1.12 + 30; // 펼치면 이름표·가격표가 다 보여서 칸이 조금 길어진다
  const top = 6, H = u.wrap.clientHeight + u.front.offsetHeight - 6, oy = u.wrap.clientHeight * .52;
  let best = { s: 0 };
  for (let cols = 3; cols <= 6; cols++) {
    const rows = Math.ceil(n / cols), s = Math.min(1, W / cols / cw * .94, H / rows / ch * .96);
    if (s > best.s) best = { s, cols, rows };
  }
  const cellW = W / best.cols, cellH = H / best.rows;
  return ring.cards.map((c, i) => {
    const row = Math.floor(i / best.cols), inRow = Math.min(best.cols, n - row * best.cols), col = i % best.cols;
    const x = (col - (inRow - 1) / 2) * cellW, y = top + cellH * (row + .5) - oy;
    return { x, y, z: 0, ry: 0, rz: ((i * 37) % 7 - 3) * .8, sc: best.s, op: 1, br: 1, zi: 60, pe: '' };
  });
}
function ringGo(i, now) {
  const n = SHELF.length;
  if (!ring.st) return;
  while (i > n - 1) { ring.lap += n; i -= n; now = true; }
  while (i < 0) { ring.lap -= n; i += n; now = true; }
  ring.target = ring.lap + i;
  const y = ring.st.start + (ring.st.end - ring.st.start) * i / (n - 1);
  scrollTo({ top: Math.round(y) + 1, behavior: REDUCED || now ? 'auto' : 'smooth' }); // now: 끌기를 놓은 자리에서 바로(원통은 ringTick이 부드럽게 따라간다)
}
// 지금 앞 칸에서 i번 칸으로 가는 가까운 길(돌아가는 쪽이 짧으면 그쪽)
function nearest(i) {
  const n = SHELF.length, cur = Math.round(ring.target) - ring.lap;
  let d = ((i - cur) % n + n) % n; if (d > n / 2) d -= n;
  return cur + d;
}
function ringTick() {
  const n = ring.cards.length; if (!n) return;
  // 멈춰 있으면 다시 그리지 않는다(앞 칸의 둥실거림은 CSS가 한다)
  if (ring.pos === ring.target && Math.abs(ring.vel) < 1e-4 && ring.drawn === ring.pos && ring.mixDrawn === ring.mix && ring.W === ring.ui.wrap.clientWidth) return;
  const before = ring.pos;
  ring.pos += (ring.target - ring.pos) * (REDUCED ? 1 : .12);
  if (Math.abs(ring.target - ring.pos) < .0005) ring.pos = ring.target;
  ring.vel = ring.vel * .8 + (ring.pos - before) * .2;
  // 반쯤 보이는 원통: 앞 칸은 크게, 옆 칸은 비스듬히 물러나고, 너무 뒤로 간 칸은 사라진다
  const W = ring.ui.wrap.clientWidth, Rx = W * .52, Rz = 760, step = .82;
  if (ring.mix > 0 && ring.layoutW !== W) { ring.layout = spreadLayout(); ring.layoutW = W; }
  ring.cards.forEach((c, i) => {
    let d = ((i - ring.pos) % n + n) % n; if (d > n / 2) d -= n; // 원통이라 뒤쪽 칸은 왼편으로 돌아 나온다
    const a = Math.max(-2.4, Math.min(2.4, d * step)), depth = (1 - Math.cos(a)) / 2; // 0 = 맨 앞, 1 = 맨 뒤
    let p = { x: Math.sin(a) * Rx, y: -depth * 70, z: (Math.cos(a) - 1) * Rz, ry: a * .55, rz: -ring.vel * 40,
      sc: 1 + (1 - Math.min(1, Math.abs(d))) * .32, // 앞에 오면 크게 튀어나온다
      op: Math.max(0, Math.min(1 - depth * .7, 3.2 - Math.abs(d))), br: 1 - depth * .55, zi: 100 - Math.round(depth * 100), pe: Math.abs(d) > 2.5 ? 'none' : '' };
    if (ring.mix > 0 && ring.layout) {
      const k = Math.max(0, Math.min(1, ring.mix * 1.5 - i / n * .5)), q = ring.layout[i], L = (u, v) => u + (v - u) * k; // 칸마다 조금씩 늦게
      const lift = Math.sin(k * Math.PI) * -60; // 날아가는 동안 위로 붕 떴다 내려앉는다
      p = { x: L(p.x, q.x), y: L(p.y, q.y) + lift, z: L(p.z, q.z) + Math.sin(k * Math.PI) * 120, ry: L(p.ry, q.ry) + Math.sin(k * Math.PI) * .6, rz: L(p.rz, q.rz), sc: L(p.sc, q.sc),
        op: L(p.op, q.op), br: L(p.br, q.br), zi: k > .5 ? q.zi : p.zi, pe: k > .5 ? q.pe : p.pe };
    }
    c.style.transform = `translate(-50%,-50%) translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,${p.z.toFixed(1)}px) rotateY(${p.ry.toFixed(3)}rad) rotateZ(${p.rz.toFixed(2)}deg) scale(${p.sc.toFixed(3)})`;
    c.style.opacity = p.op.toFixed(3);
    c.style.filter = p.br < .99 ? `brightness(${p.br.toFixed(2)})` : '';
    c.style.zIndex = String(p.zi);
    c.style.pointerEvents = p.pe;
  });
  ring.drawn = ring.pos; ring.mixDrawn = ring.mix; ring.W = W;
  const f = ((Math.round(ring.pos) % n) + n) % n;
  if (f !== ring.front) ringFront(f);
}
function ringFront(f) {
  const prevCat = ring.front >= 0 ? SHELF[ring.front].cat : null;
  ring.front = f;
  const it = SHELF[f], c = CATS.find(x => x.id === it.cat), u = ring.ui;
  ring.cards.forEach((card, i) => { card.classList.toggle('is-front', i === f); card.setAttribute('aria-selected', String(i === f)); });
  u.wrap.setAttribute('aria-activedescendant', '');
  u.cat.replaceChildren(sign(c.id, c.name)); u.catSub.textContent = c.sub;
  u.fName.textContent = it.name; u.fDesc.textContent = `${it.sub}. ${it.desc.split('\n')[0]}`; // 무료 조건 같은 핵심이 sub에 있다
  u.count.querySelectorAll('.ring-dot').forEach((d, i) => { d.classList.toggle('on', i === f); d.setAttribute('aria-selected', String(i === f)); });
  selectTab(it.cat);
  if (window.gsap && !REDUCED) gsap.fromTo([u.fName, u.fDesc], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .3, stagger: .05, ease: 'back.out(2)' });
  if (prevCat && prevCat !== it.cat) { say(T(`cat.${it.cat}`)); if (window.gsap && !REDUCED) gsap.fromTo(u.cat, { scale: 1.4, rotate: -8 }, { scale: 1, rotate: 0, duration: .5, ease: 'elastic.out(1,.4)' }); }
}
function makeCard(it, onPick) {
  const card = el('button', { class: 'card' + (it.soon ? ' soon' : ''), style: `--c:${it.c}`, 'aria-disabled': it.soon ? 'true' : false,
    onclick: () => it.soon ? (say(T('soonItem', { 이름: it.name })), wiggle(card)) : onPick ? onPick() : openDetail(it) }, [
    it.badge ? el('span', { class: 'badge ' + (it.badge[1] || ''), text: it.badge[0] }) : null,
    it.soon ? el('span', { class: 'stamp', text: T('shelf.soonStamp') }) : null,
    el('div', { class: 'card-art' }, [img(SLOTS[ITEMS.indexOf(it) % SLOTS.length], 'slot'), icon(it.icon, 'icon')]),
    el('div', { class: 'card-body' }, [el('div', { class: 'card-name', text: it.name }), el('div', { class: 'card-sub', text: it.sub }),
      it.soon ? null : el('div', { class: 'card-price' }, [el('span', { class: 'tag-text', text: it.priceText })])]),
  ]);
  // 마우스를 올리면 옆에 미리보기 카드가 뜬다(스팀 라이브러리처럼)
  card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') peek(it, card); });
  card.addEventListener('pointerleave', unpeek);
  return card;
}

/* ── 미리보기 카드: 이름, 그림(게임은 실제 만든 게임 화면), 가격, 이런 거 해 줘요 ── */
const peekEl = el('div', { class: 'peek', 'aria-hidden': 'true' });
document.body.append(peekEl);
let peekFor = null, peekTimer;
function peek(it, card) {
  if (detail.getAttribute('aria-hidden') === 'false' || $('#checkout').open) return;
  peekFor = card; clearInterval(peekTimer);
  // 게임은 실제로 만든 게임 화면을 돌아가며 보여 준다
  const shots = it.id === 'game' ? tinGames.filter(g => TIN_HOURS[g.id] != null && g.shots?.length).map(g => g.shots[0]) : [];
  const shot = shots[0];
  const ex = USES[it.id]?.ex.slice(0, 3) || [];
  peekEl.replaceChildren(
    el('div', { class: 'peek-head', text: it.name }),
    el('div', { class: 'peek-art' + (shot ? ' shot' : ''), style: shot ? `background-image:url(${shot})` : '' }, shot ? null : icon(it.icon)),
    el('div', { class: 'peek-body' }, [
      el('p', { class: 'peek-cat', text: it.soon ? T('shelf.soonStamp') : CATS.find(c => c.id === it.cat)?.name || '' }),
      el('p', { class: 'peek-sub', text: it.sub }),
      it.soon ? null : el('p', { class: 'peek-price' }, F('shelf.peekPrice', { 가격: el('b', { text: it.priceText }) })),
      ex.length ? el('ul', { class: 'peek-ex' }, ex.map(x => el('li', { text: x[0] }))) : null,
    ]));
  // 칸 오른쪽에 띄우고, 자리가 없으면 왼쪽
  const r = card.getBoundingClientRect(), w = 280, gap = 14;
  const x = r.right + gap + w < innerWidth ? r.right + gap : Math.max(8, r.left - gap - w);
  peekEl.style.left = x + 'px';
  peekEl.style.top = Math.max(8, Math.min(innerHeight - peekEl.offsetHeight - 110, r.top)) + 'px';
  if (window.gsap && !REDUCED) { gsap.killTweensOf(peekEl); gsap.fromTo(peekEl, { opacity: 0, x: x > r.left ? -10 : 10, scale: .96 }, { opacity: 1, x: 0, scale: 1, duration: .18, ease: 'power2.out' }); }
  else peekEl.style.opacity = 1;
  peekEl.classList.add('on');
  if (shots.length > 1) { let k = 0; const art = peekEl.querySelector('.peek-art'); peekTimer = setInterval(() => { art.style.backgroundImage = `url(${shots[++k % shots.length]})`; }, 900); }
}
function unpeek() {
  peekFor = null; clearInterval(peekTimer); peekEl.classList.remove('on');
  if (window.gsap && !REDUCED) { gsap.killTweensOf(peekEl); gsap.to(peekEl, { opacity: 0, duration: .12 }); } else peekEl.style.opacity = 0;
}
addEventListener('scroll', () => { if (peekFor) unpeek(); }, { passive: true }); // 진열대가 돌면 칸이 움직이니 닫는다
function renderExtras() {
  const soon = el('section', { class: 'extra' }, [el('div', { class: 'shelf-head' }, [el('h2', {}, sign('soon', T('extras.soonTitle'))), el('p', { text: T('extras.soonSub') })]),
    el('div', { class: 'grid' }, ITEMS.filter(i => i.soon).map(it => makeCard(it)))]);
  const hall = el('section', { class: 'extra' }, [el('div', { class: 'shelf-head' }, [el('h2', {}, sign('hall', T('extras.hallTitle'))), el('p', { text: T('extras.hallSub') })])]);
  $('#extras').replaceChildren(soon, hall);
  renderHall(hall);
}
function wiggle(n) { if (window.gsap && !REDUCED) gsap.fromTo(n, { x: -6 }, { x: 0, duration: .4, ease: 'elastic.out(1,.3)' }); }

/* ── 동업자 되기: 내 PICO-8 게임 ── */
async function playCart(c, player) {
  const url = `carts/${c.id}.html`;
  let ok = false;
  try { ok = (await fetch(url, { method: 'HEAD' })).ok; } catch {}
  const frame = el('div', { class: 'player-frame' }, ok
    ? el('iframe', { src: url, title: c.name, allow: 'autoplay; fullscreen; gamepad', loading: 'lazy' })
    : el('div', { class: 'player-empty', text: T('detail.cartBaking', { 이름: c.name }) }));
  player.replaceChildren(frame, el('div', { class: 'player-bar' }, [el('span', { text: `▶ ${c.name}` }), el('span', { text: T('detail.cartBar') })]));
  player.classList.add('on');
  say(T(ok ? 'cartPlay' : 'cartBaking', { 이름: c.name }));
  if (window.gsap && !REDUCED) gsap.fromTo(frame, { scaleY: .02, filter: 'brightness(4)' }, { scaleY: 1, filter: 'brightness(1)', duration: .45, ease: 'expo.out' });
}

/* ── 명예의 전당 (supporters.json: [{ name, amount, note }]. All Tomorrow 콘솔의 입금 확인이 갱신) ── */
async function renderHall(shelf) {
  const hall = el('div', { class: 'hall' }); shelf.append(hall);
  let rows = [];
  try { rows = await (await fetch('supporters.json', { cache: 'no-store' })).json(); } catch {}
  if (!rows.length) { hall.append(el('p', { class: 'hall-empty', text: T('extras.hallEmpty') })); return; }
  rows.sort((a, b) => (b.amount || 0) - (a.amount || 0)).forEach((r, i) => hall.append(el('div', { class: 'hall-row' }, [
    el('span', { class: 'rank', text: String(i + 1).padStart(2, '0') }), el('b', { text: r.name }),
    r.note ? el('span', { text: r.note }) : null, el('span', { class: 'amt', text: !r.amount ? '♥' : (r.currency && r.currency !== 'KRW') ? `${r.amount} ${r.currency}` : won(r.amount) })])));
  hall.append(el('a', { class: 'bmc', href: 'https://buymeacoffee.com/innollia', target: '_blank', rel: 'noopener', text: T('extras.coffee') }));
  if (window.gsap && !REDUCED) gsap.from(hall.children, { x: -40, opacity: 0, stagger: .05, duration: .35 });
}

/* ── 상세 패널 ── */
const detail = $('#detail');
const BACKDROP = ['.marquee', '.counter', '.shop', '.extras', '.cartbar'];
let lastFocus = null;
function openDetail(it, prev) {
  unpeek();
  if (state.closing) { if (window.gsap) gsap.killTweensOf('.detail-panel'); state.closing = false; detail.style.pointerEvents = ''; }
  lastFocus = document.activeElement;
  state.item = it; state.draft = { note: prev?.note || '', prev }; state.editing = prev || null;
  const already = it.id === 'dm' && !prev && state.cart.some(c => c.item.id === 'dm');
  $('#detail-buy').textContent = prev ? T('detail.editDone') : already ? T('detail.already') : T('detail.buy');
  $('#detail-buy').classList.toggle('pic', !prev && !already); // 그림 버튼에 "사기"가 그려져 있다
  $('#detail-buy').disabled = already;
  $('#detail-say').textContent = '';
  $('#detail-cat').textContent = CATS.find(c => c.id === it.cat).name;
  $('#detail-title').textContent = it.name;
  $('#detail-desc').textContent = it.desc;
  detail.style.setProperty('--c', it.c);
  $('#detail-icon').replaceChildren(icon(it.icon));
  const body = $('#detail-body'); body.replaceChildren();
  BUILD[it.kind](body, it);
  const uses = it.kind === 'read' ? null : USES[it.id]; // 낭독은 칸이 '읽을 글'이라 예시를 넣으면 값이 바뀐다
  if (uses) {
    const t = body.querySelector('textarea');
    const box = el('div', { class: 'box' }, [el('h3', { text: uses.q })]);
    const add = x => {
      const line = x[0] + (x[1] ? ` — ${x[1]}` : '');
      if (!t.value.split('\n').includes(line)) { t.value = t.value.trim() ? `${t.value.trim()}\n${line}` : line; t.dispatchEvent(new Event('input')); } // 적어 둔 걸 지우지 않고 더한다
      t.focus(); t.setSelectionRange(t.value.length, t.value.length);
      wiggle(t); say(T('exampleAdded'));
    };
    // 적을 칸이 없는 상품(DM 해금)은 예시 칸 자체를 두지 않는다
    if (t) { box.append(el('div', { class: 'chips' }, uses.ex.map(x => el('button', { class: 'chip', onclick: () => add(x) }, [x[0], el('small', { text: x[1] })])))); body.prepend(box); }
  }
  updatePrice();
  detail.setAttribute('aria-hidden', 'false'); document.documentElement.classList.add('locked');
  BACKDROP.forEach(q => { $(q).inert = true; });
  $('.detail-panel').scrollTop = 0;
  say(prev ? (prev.sum ? T('editingNow', { 지금: prev.sum }) : T('editing')) : it.id === 'oracle' ? T('oracle') : T(`item.${it.id}`)); // 신탁은 열 때마다 점술 답 하나
  if (window.gsap && !REDUCED) {
    gsap.fromTo('.detail-slash', { opacity: 0 }, { opacity: 1, duration: .25 });
    gsap.fromTo('.detail-panel', { xPercent: 100, skewX: -8 }, { xPercent: 0, skewX: 0, duration: .5, ease: 'expo.out' });
    gsap.from(body.children, { y: 24, opacity: 0, stagger: .07, delay: .15, duration: .35 });
  }
  setTimeout(() => $('#detail-close').focus(), 50);
}
function closeDetail() {
  if (detail.getAttribute('aria-hidden') === 'true' || state.closing) return;
  state.closing = true; $('#detail-buy').disabled = true; // 닫히는 동안 두 번 담기지 않게
  BACKDROP.forEach(q => { $(q).inert = false; });
  detail.style.pointerEvents = 'none';
  const done = () => {
    const back = state.backToOrder;
    detail.setAttribute('aria-hidden', 'true'); document.documentElement.classList.remove('locked'); detail.style.pointerEvents = ''; state.item = null; state.draft = null; state.editing = null; state.closing = false; state.backToOrder = false;
    if (back && state.cart.length) { openOrder(); return; }
    if (lastFocus?.isConnected) lastFocus.focus();
    if (!$('#checkout').open) sayNow(T(`cat.${state.cat}`) || T('hello'));
  };
  if (window.gsap && !REDUCED) { gsap.killTweensOf('.detail-panel'); gsap.to('.detail-panel', { xPercent: 100, duration: .3, ease: 'power3.in', onComplete: done }); } else done();
}
$('#detail-close').onclick = closeDetail;
$('.detail-slash').onclick = closeDetail;
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if ($('#checkout').open) $('#checkout').close(); else closeDetail(); });

function setPrice(value, label = T('detail.price'), text) {
  state.draft.price = value;
  const b = $('#detail-price'); $('#detail-price-label').textContent = label;
  b._tw?.kill(); // 앞선 숫자 애니메이션이 늦게 끝나며 옛 가격을 덮어쓰지 않게
  if (text) { b.textContent = text; return; }
  if (window.gsap && !REDUCED) {
    const o = { v: Number(b.dataset.v || 0) };
    b._tw = gsap.to(o, { v: value, duration: .35, ease: 'power2.out', onUpdate: () => { b.textContent = won(Math.round(o.v / 100) * 100); }, onComplete: () => { b.textContent = won(value); } });
  } else b.textContent = won(value);
  b.dataset.v = value;
}
function updatePrice() { const it = state.item, d = state.draft; PRICE[it.kind]?.(it, d); }
function noteField(body, label, ph = '') {
  const t = el('textarea', { placeholder: ph, oninput: e => { state.draft.note = e.target.value; } });
  t.value = state.draft.note;
  body.append(el('label', { class: 'box' }, [el('h3', { text: label }), t]));
  return t;
}
function chips(options, current, onPick) {
  const wrap = el('div', { class: 'chips' });
  for (const o of options) {
    const b = el('button', { class: 'chip', 'data-v': o.id, 'aria-pressed': String(o.id === current), onclick: () => {
      wrap.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); onPick(o);
      if (window.gsap && !REDUCED) gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .3, ease: 'back.out(3)' });
    } }, [o.name, el('small', { text: o.sub })]);
    wrap.append(b);
  }
  return wrap;
}

/* ── 시간 드래그: 끄는 중에는 올라가는 단계 경계마다 잠깐 걸렸다가 손 간 곳까지 이어 간다 ──
   누르기·키보드는 바로 간다. value는 지금 보이는 값, target은 손이 가 있는 값.
   담기 직전에는 flush()로 target을 바로 확정한다. */
function timeBar(body, { steps, min, max, scale, fmt, onChange, start, card }) {
  const toPos = h => scale === 'log' ? Math.log(h / min) / Math.log(max / min) : (h - min) / (max - min);
  const fromPos = p => scale === 'log' ? min * Math.pow(max / min, p) : min + p * (max - min);
  const bar = el('div', { class: 'timebar' });
  const track = el('div', { class: 'tb-track' });
  const fill = el('div', { class: 'tb-fill' });
  const knob = el('div', { class: 'tb-knob', role: 'slider', tabindex: '0', 'aria-valuemin': min, 'aria-valuemax': max, 'aria-label': T('detail.barLabel') });
  const cHead = el('b', { class: 'tc-head' }), cTitle = el('div', { class: 'tc-title' }), cDesc = el('p', { class: 'tc-desc' }), cShot = el('div', { class: 'tc-shot' });
  const cardEl = el('div', { class: 'tb-card', 'aria-live': 'polite' }, [cShot, el('div', {}, [cHead, cTitle, cDesc])]);
  let lastLbl = -1;
  const marks = steps.map(s => {
    const m = el('div', { class: 'tb-mark', style: `left:${toPos(s) * 100}%` });
    // 눈금이 너무 붙어 있으면 글자는 앞의 것만 남긴다(동그라미는 그대로)
    const low = toPos(s) - lastLbl < .07; if (!low) lastLbl = toPos(s);
    track.append(m, el('span', { class: 'tb-lbl' + (low ? ' low' : ''), style: `left:${toPos(s) * 100}%`, text: fmt(s) }));
    return m;
  });
  track.append(fill, knob); bar.append(cardEl, track);
  body.append(bar, el('p', { class: 'tb-hint', text: T(matchMedia('(pointer: coarse)').matches ? 'detail.barHintTouch' : 'detail.barHintMouse') }));

  const draft = state.draft; // 패널을 닫고 다른 상품을 연 뒤에 늦게 온 호출은 버린다
  const snap = scale === 'log' ? (h => Math.max(min, Math.round(h))) : (h => steps.reduce((a, b) => Math.abs(b - h) < Math.abs(a - h) ? b : a));
  const tierIdx = h => steps.reduce((acc, s, i) => h >= s ? i : acc, 0);
  let value = start, target = start, timer = null, dragging = false, moved = false;

  function place(h, anim) {
    const p = toPos(h) * 100;
    if (window.gsap) gsap.killTweensOf([knob, fill], 'left,width'); // 앞선 이동이 새 위치를 덮어쓰지 않게
    if (anim && window.gsap && !REDUCED) { gsap.to(knob, { left: p + '%', duration: .25, ease: 'back.out(2)' }); gsap.to(fill, { width: p + '%', duration: .25 }); }
    else { knob.style.left = p + '%'; fill.style.width = p + '%'; }
    const c = card ? card(h) : { head: fmt(h) };
    cHead.textContent = c.head || fmt(h); cTitle.textContent = c.title || ''; cDesc.textContent = c.desc || '';
    cShot.hidden = !c.shot; if (c.shot && cShot.dataset.src !== c.shot) { cShot.dataset.src = c.shot; cShot.style.backgroundImage = `url(${c.shot})`; }
    // 카드는 손잡이 바로 위. 막대 밖으로 나가지 않게 양 끝에서 멈춘다.
    const bw = bar.clientWidth || 1, cw = cardEl.offsetWidth, x = track.offsetLeft + track.clientWidth * p / 100;
    cardEl.style.left = Math.min(bw - cw, Math.max(0, x - cw / 2)) + 'px';
    knob.setAttribute('aria-valuenow', h); knob.setAttribute('aria-valuetext', fmt(h));
    marks.forEach((m, i) => { const on = h >= steps[i]; m.classList.toggle('on', on); m.nextSibling.classList.toggle('on', on); });
  }
  function commit(h, anim) {
    if (state.draft !== draft) return;
    const crossed = tierIdx(h) !== tierIdx(value);
    value = h; place(h, anim); onChange(h, crossed);
  }
  function step() {
    timer = null;
    if (state.draft !== draft || target === value) return;
    const before = tierIdx(value), after = tierIdx(target);
    if (after > before) {
      const edge = steps[before + 1];
      commit(edge, true); hitstop(knob);
      if (edge !== target) timer = setTimeout(step, REDUCED ? 0 : 420);
      return;
    }
    commit(target, true);
  }
  function set(h, drag, exact) {
    const near = exact ? null : steps.filter(s => Math.abs(toPos(s) - toPos(h)) < .012).sort((x, y) => Math.abs(toPos(x) - toPos(h)) - Math.abs(toPos(y) - toPos(h)))[0];
    target = near ?? Math.min(max, Math.max(min, snap(h)));
    if (!drag) { clearTimeout(timer); timer = null; if (target !== value) commit(target, true); return; }
    if (!timer) step();
  }
  function flush() { clearTimeout(timer); timer = null; if (target !== value) commit(target, false); }
  function fromEvent(e) {
    const r = track.getBoundingClientRect();
    return fromPos(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  }
  bar.addEventListener('pointerdown', e => { dragging = true; moved = false; bar.setPointerCapture(e.pointerId); knob.focus({ preventScroll: true }); if (!knob.contains(e.target)) set(fromEvent(e), false);
    if (window.gsap && !REDUCED) gsap.to(knob, { scale: 1.15, duration: .15 }); });
  bar.addEventListener('pointermove', e => { if (dragging) { moved = true; set(fromEvent(e), true); } });
  const up = e => { if (!dragging) return; dragging = false; if (e.type === 'pointerup' && moved) set(fromEvent(e), true);
    if (window.gsap && !REDUCED) gsap.to(knob, { scale: 1, duration: .25, ease: 'back.out(3)' }); };
  bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
  knob.addEventListener('keydown', e => {
    const i = steps.indexOf(value);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = scale === 'log' ? value + 1 : steps[Math.min(steps.length - 1, i + 1)];
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = scale === 'log' ? value - 1 : steps[Math.max(0, i - 1)];
    if (e.key === 'PageUp') next = steps[Math.min(steps.length - 1, tierIdx(value) + 1)];
    if (e.key === 'PageDown') next = steps[Math.max(0, tierIdx(value) - (value === steps[tierIdx(value)] ? 1 : 0))];
    if (next != null) { e.preventDefault(); set(next, false, true); }
  });
  draft.flush = flush;
  place(value); onChange(value, false);
}
function hitstop(knob) {
  if (!window.gsap || REDUCED) return;
  // 손잡이만 찌그러진다. 막대나 패널을 흔들면 손가락 위치를 잘못 읽는다.
  gsap.timeline()
    .to(knob, { scaleX: 1.35, scaleY: .7, duration: .06 })
    .to(knob, { scaleX: .85, scaleY: 1.2, duration: .08 })
    .to(knob, { scaleX: 1, scaleY: 1, duration: .3, ease: 'elastic.out(1,.35)' });
}

let tinGames = [];
fetch('tin/manifest.json').then(r => r.ok ? r.json() : []).then(j => { tinGames = j; }).catch(() => {});
// h시간 이하로 만든 게임 가운데 가장 오래 걸린 것
function gameAt(h) {
  return tinGames.filter(g => TIN_HOURS[g.id] != null && TIN_HOURS[g.id] <= h).sort((x, y) => TIN_HOURS[y.id] - TIN_HOURS[x.id])[0];
}

// 담아 둔 것을 수정할 때 고른 등급·개수·금액을 되살린다(summary()가 남긴 이름으로 찾는다)
const was = list => list.find(t => state.draft.prev?.sum?.startsWith(t.name));
const BUILD = {
  hours(body, it) {
    const brk = el('p', { class: 'breakdown' });
    const steps = [...new Set(Object.values(TIN_HOURS))].sort((x, y) => x - y);
    if (steps[steps.length - 1] < 80) steps.push(80);
    timeBar(body, { steps, min: 1, max: 80, scale: 'log', start: state.draft.prev?.hours || 1, fmt: h => h + 'h',
      card: h => { const g = gameAt(h), n = g && TIN_HOURS[g.id];
        return { head: T('detail.gameHead', { 시간: h }), title: !g ? '' : T(n === h ? 'detail.gameExact' : 'detail.gameMore', { 게임: g.name, 걸린: n }), desc: g?.blurb, shot: g?.shots?.[0] }; },
      onChange: (h, crossed) => {
        const g = gameAt(h), n = g && TIN_HOURS[g.id];
        const line = T(!g ? 'hours' : n === h ? 'hoursExact' : 'hoursMore', { 시간: h, 게임: g?.name, 걸린: n });
        if (crossed) say(line); else sayNow(line); // 말풍선이 옛 시간을 붙들고 있지 않게
        state.draft.hours = h;
        brk.innerHTML = T('detail.gameBreakdown', { 시급: won(RATE), AI: won(AI_RATE), 시간: h, 합계: won(h * HOUR) });
        updatePrice();
      } });
    body.append(el('div', { class: 'box' }, brk));
    noteField(body, it.field, it.hint);
  },
  web(body, it) {
    const at = h => WEB_STEPS.find(s => s.h === h) || WEB_STEPS[0];
    timeBar(body, { steps: WEB_STEPS.map(s => s.h), min: .5, max: 6, scale: 'lin', start: state.draft.prev?.hours || .5, fmt: h => h < 1 ? '30m' : h + 'h',
      card: h => { const s = at(h); return { head: h < 1 ? T('detail.halfHour') : T('detail.hoursN', { 시간: h }), title: s.title, desc: s.desc }; },
      onChange: (h, crossed) => {
        const s = at(h);
        if (crossed) say(T('webStep', { 단계: s.title, 가격: won(s.p) }));
        state.draft.hours = h; state.draft.webPrice = s.p; updatePrice();
      } });
    noteField(body, it.field, it.hint);
  },
  read(body, it) {
    state.draft.tier = was(READ_TIERS) || READ_TIERS[1];
    body.append(el('div', { class: 'box' }, [el('h3', { text: T('detail.readTierTitle') }), chips(READ_TIERS.map(t => ({ ...t, sub: T('detail.readTierSub', { 값: t.rate, 설명: t.sub }) })), state.draft.tier.id, t => { state.draft.tier = t; updatePrice(); })]));
    const count = el('b', { text: '0' });
    const t = noteField(body, it.field, it.hint);
    const recount = () => { state.draft.chars = [...t.value].filter(c => c !== '\n' && c !== '\r').length; count.textContent = state.draft.chars.toLocaleString(); updatePrice(); };
    t.addEventListener('input', recount);
    body.append(el('p', { class: 'note' }, F('detail.readCount', { 글자: count })));
    state.draft.chars = 0; if (t.value) recount();
  },
  qty(body, it) {
    state.draft.qty = state.draft.prev ? Math.max(1, Math.round(state.draft.prev.price / it.price)) : 1;
    const n = el('b', { text: String(state.draft.qty) });
    const step = d => { state.draft.qty = Math.max(1, Math.min(99, state.draft.qty + d)); n.textContent = state.draft.qty; updatePrice();
      if (window.gsap && !REDUCED) gsap.fromTo(n, { y: d > 0 ? -10 : 10 }, { y: 0, duration: .25, ease: 'back.out(3)' }); };
    body.append(el('div', { class: 'box' }, [el('h3', { text: T('detail.qtyTitle') }), el('div', { class: 'stepper' }, [
      el('button', { 'aria-label': T('detail.qtyLess'), text: '−', onclick: () => step(-1) }), n, el('button', { 'aria-label': T('detail.qtyMore'), text: '+', onclick: () => step(1) }),
      el('span', { class: 'lbl', text: T('detail.qtyEach', { 가격: won(it.price), 단위: it.unit }) })])]));
    noteField(body, it.field, it.hint);
  },
  text(body, it) { noteField(body, it.field, it.hint); },
  partner(body, it) {
    const player = el('div', { class: 'player' });
    body.append(el('div', { class: 'box' }, [el('h3', { text: T('detail.cartsTitle') }),
      chips(CARTS.map(c => ({ id: c.id, name: c.name, sub: T('detail.cartTry') })), null, o => playCart(CARTS.find(c => c.id === o.id), player)), player]));
    noteField(body, it.field, it.hint);
  },
  pwyw(body, it) {
    state.draft.amount = state.draft.prev?.price || 0;
    const input = el('input', { type: 'number', min: '0', step: '500', value: String(state.draft.amount), 'aria-label': T('detail.payInput'), oninput: e => { state.draft.amount = Math.max(0, Number(e.target.value) || 0); e.target.closest('.box').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(Number(c.dataset.v) === state.draft.amount))); updatePrice(); } });
    body.append(el('div', { class: 'box' }, [el('h3', { text: T('detail.payTitle') }),
      chips([0, 1000, 5000, 10000, 30000].map(v => ({ id: v, name: won(v), sub: T(v ? (v >= 10000 ? 'detail.payBig' : 'detail.paySmall') : 'detail.payZero') })), state.draft.amount,
        o => { state.draft.amount = o.id; input.value = o.id; updatePrice(); }),
      el('p', { class: 'note', style: 'margin:10px 0 6px', text: T('detail.payInput') }), input]));
    noteField(body, it.field, it.hint);
    // 말풍선 점술 답의 출처(CC BY 4.0은 출처를 보이는 곳에 밝혀야 한다)
    body.append(el('p', { class: 'note' }, F('detail.oracleCredit', { 링크: el('a', { href: 'https://github.com/bmc/fortunes', target: '_blank', rel: 'noopener', text: 'bmc/fortunes' }) })));
  },
  dm(body) {
    body.append(el('div', { class: 'box' }, [el('h3', { text: T('detail.dmFreeTitle') }), el('p', { style: 'margin:0', id: 'dm-free' })]),
      el('div', { class: 'box' }, [el('h3', { text: T('detail.dmHowTitle') }), el('p', { style: 'margin:0;white-space:pre-line', text: T('detail.dmHow') })]));
  },
  quote(body, it) {
    state.draft.kindSel = was(FEAT_KINDS) || FEAT_KINDS[0];
    body.append(el('div', { class: 'box' }, [el('h3', { text: T('detail.featTitle') }), chips(FEAT_KINDS, state.draft.kindSel.id, k => { state.draft.kindSel = k; })]));
    noteField(body, it.field, it.hint);
    body.append(el('p', { class: 'note', text: T('detail.featNote') }));
  },
  bot(body, it) {
    state.draft.tier = was(BOT_TIERS) || BOT_TIERS[0];
    body.append(el('div', { class: 'box' }, [el('h3', { text: T('detail.botTierTitle') }),
      chips(BOT_TIERS.map(t => ({ ...t, sub: T('detail.botTierSub', { 제작비: won(t.build), 월: won(t.month), 설명: t.sub }) })), state.draft.tier.id, t => { state.draft.tier = t; updatePrice(); })]));
    noteField(body, it.field, it.hint);
    body.append(el('p', { class: 'note', text: T('detail.botNote') }));
  },
};
const otherInCart = () => state.cart.some(c => c.item.id !== 'dm');
const PRICE = {
  hours: (it, d) => setPrice((d.hours || 1) * HOUR),
  web: (it, d) => setPrice(d.webPrice || 10000),
  read: (it, d) => setPrice(d.chars ? Math.max(1000, d.chars * d.tier.rate) : 0, T('detail.readPrice', { 등급: d.tier.name, 값: d.tier.rate })),
  qty: (it, d) => setPrice(it.price * d.qty),
  text: (it, d) => setPrice(it.price),
  partner: () => setPrice(0, T('detail.partnerPrice'), T('detail.partnerZero')),
  pwyw: (it, d) => setPrice(d.amount, T('detail.payPrice')),
  dm: (it, d) => { const free = otherInCart(); const p = $('#dm-free');
    if (p) p.textContent = T(free ? 'detail.dmFreeYes' : 'detail.dmFreeNo');
    setPrice(free ? 0 : 5000, T(free ? 'detail.dmFreePrice' : 'detail.price')); },
  quote: () => setPrice(0, T('detail.featPrice'), T('detail.featWait')),
  bot: (it, d) => setPrice(d.tier.build, T('detail.botPrice', { 월: won(d.tier.month) })),
};
function summary(it, d) {
  switch (it.kind) {
    case 'hours': return T('detail.hoursN', { 시간: d.hours });
    case 'web': return d.hours < 1 ? T('detail.halfHour') : T('detail.hoursN', { 시간: d.hours });
    case 'read': return T('detail.readSum', { 등급: d.tier.name, 글자: (d.chars || 0).toLocaleString() });
    case 'qty': return `${d.qty}${it.unit}`;
    case 'pwyw': return T('detail.paySum');
    case 'partner': return T('detail.partnerPrice');
    case 'quote': return d.kindSel.name;
    case 'bot': return T('detail.botSum', { 등급: d.tier.name, 월: won(d.tier.month) });
    default: return '';
  }
}

$('#detail-buy').onclick = e => {
  if (!state.item || state.closing) return;
  state.draft.flush?.();
  const it = state.item, d = state.draft;
  if (it.id === 'dm' && !state.editing && state.cart.some(c => c.item.id === 'dm')) { say(T('dmAlready')); closeDetail(); return; }
  if (it.kind === 'read' && !d.chars) { say(T('needText')); wiggle($('#detail-body textarea')); return; }
  if ((it.kind === 'quote' || it.kind === 'text' || it.kind === 'partner') && !d.note.trim()) { say(T('needNote')); wiggle($('#detail-body textarea')); return; }
  const entry = { item: it, price: d.price, sum: summary(it, d), note: d.note.trim(), hours: d.hours, monthly: it.kind === 'bot' ? d.tier.month : 0 };
  if (state.editing && state.cart.includes(state.editing)) {
    Object.assign(state.editing, entry); say(T('edited'));
  }
  else { state.cart.push({ key: ++seq, ...entry }); say(T('added')); }
  flyCoin(e.currentTarget);
  renderCart();
  closeDetail();
};
function flyCoin(from) {
  if (!window.gsap || REDUCED) return;
  const a = from.getBoundingClientRect(), b = $('#btn-order').getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const c = img(`mote_${1 + (i % 4)}`, 'fly'); c.loading = 'eager'; document.body.append(c); // 담은 것이 장바구니로 날아간다
    gsap.set(c, { left: a.left + a.width / 2, top: a.top });
    gsap.timeline({ onComplete: () => c.remove() })
      .to(c, { left: b.left + 30 + gsap.utils.random(-20, 20), duration: .7, ease: 'power1.inOut', delay: i * .06 })
      .to(c, { top: a.top - 120 - i * 10, duration: .3, ease: 'power2.out' }, `<`)
      .to(c, { top: b.top, duration: .4, ease: 'power2.in' }, `>-.02`);
  }
  gsap.fromTo('#btn-order', { scale: 1 }, { scale: 1.15, duration: .12, yoyo: true, repeat: 1, delay: .9 });
}

/* ── 장바구니 (새로고침해도 남게 localStorage에 둔다) ── */
function priced(c) { return c.item.id === 'dm' ? (state.cart.some(x => x.item.id !== 'dm') ? 0 : 5000) : c.price; }
const CART_KEY = 'bongbongbong-cart';
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart.map(c => ({ id: c.item.id, price: c.price, sum: c.sum, note: c.note, hours: c.hours, monthly: c.monthly })))); } catch {}
}
function loadCart() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch {}
  for (const s of Array.isArray(saved) ? saved : []) {
    const item = ITEMS.find(i => i.id === s.id && !i.soon);
    if (item) state.cart.push({ key: ++seq, item, price: s.price || 0, sum: s.sum || '', note: s.note || '', hours: s.hours, monthly: s.monthly || 0 });
  }
}
function removeFromCart(c) {
  const at = state.cart.indexOf(c);
  state.cart = state.cart.filter(x => x !== c); renderCart();
  if ($('#checkout').open) { if (state.cart.length) renderOrder(); else { $('#checkout').close(); say(T('cartEmptied')); } }
  toast(T('cart.removed', { 이름: c.item.name + (c.sum ? ` ${c.sum}` : '') }), T('cart.undo'), () => { state.cart.splice(Math.min(at, state.cart.length), 0, c); renderCart(); if ($('#checkout').open) renderOrder(); say(T('undone')); });
}
function renderCart() {
  const list = $('#cart-list'); list.replaceChildren();
  if (!state.cart.length) list.append(el('li', { class: 'cart-empty', style: 'border:0;background:none', text: T('cart.empty') }));
  for (const c of state.cart) list.append(el('li', {}, [
    el('button', { class: 'cart-open', title: T(c.item.kind === 'dm' ? 'cart.seeOrder' : 'cart.edit'), onclick: () => c.item.kind === 'dm' ? openOrder() : openDetail(c.item, c) }, [c.item.name, c.sum ? el('small', { text: ` ${c.sum}` }) : null,
      el('small', { text: ` ${c.item.kind === 'quote' ? T('cart.quote') : won(priced(c))}` })]),
    el('button', { 'aria-label': T('cart.remove', { 이름: c.item.name }), text: '✕', onclick: () => removeFromCart(c) })]));
  const total = state.cart.reduce((s, c) => s + priced(c), 0);
  $('#cart-total').textContent = won(total);
  $('#btn-order').disabled = !state.cart.length;
  $('#btn-order').textContent = state.cart.length ? T('cart.orderN', { 개수: state.cart.length }) : T('cart.order');
  saveCart();
}

/* ── 주문서: 담은 것을 확인·수정하고 그대로 디스코드로 보낸다. 결제는 결과물 받은 뒤라 여기엔 없다 ── */
// 주문번호는 ordername.js가 만든 한글 10글자. 장바구니 하나에 하나, 보낼 때까지 그대로 둔다.
const CODE_KEY = 'bongbongbong-code', DMUSER_KEY = 'bongbongbong-dmuser';
function orderCode() {
  let code = '';
  try { code = localStorage.getItem(CODE_KEY) || ''; } catch {}
  if (!code) { code = window.orderName(); try { localStorage.setItem(CODE_KEY, code); } catch {} }
  return code;
}
function newOrderCode() { try { localStorage.removeItem(CODE_KEY); } catch {} }
// 연락받을 디스코드 이름(서버 닉네임·표시 이름·사용자명 아무거나). 틀려도 Eve가 가장 가까운 사람을 찾는다.
// 여기서는 보이지 않는 글자(제로폭·제어문자)와 앞뒤 공백만 걷어 내고 적은 그대로 보낸다.
const dmUserValue = () => $('#dm-user').value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '').trim().slice(0, 64);
function orderBody(code) {
  const total = state.cart.reduce((s, c) => s + priced(c), 0);
  const monthly = state.cart.reduce((s, c) => s + c.monthly, 0);
  const lines = [T('discord.head', { 번호: code }), ''];
  state.cart.forEach((c, i) => {
    lines.push(T('discord.line', { 순번: i + 1, 이름: c.item.name, 요약: c.sum ? ` (${c.sum})` : '', 가격: c.item.kind === 'quote' ? T('discord.quote') : won(priced(c)) }));
    if (c.note) lines.push('   └ ' + c.note.replace(/\n+/g, ' / '));
  });
  lines.push('', T('discord.total', { 합계: won(total) }) + (monthly ? T('discord.totalMonthly', { 월: won(monthly) }) : '') + T('discord.totalTail'));
  if (state.cart.some(c => c.item.kind === 'quote')) lines.push(T('discord.quoteNote'));
  return lines.join('\n');
}
function orderReady() {
  if (!dmUserValue()) return T('orderForm.needName');
  return '';
}
function refreshOrder() {
  const why = orderReady(), btn = $('#send-order');
  if (!btn.dataset.sent) { btn.disabled = !!why; $('#send-result').textContent = why; }
}
function renderOrder() {
  const ul = $('#order-items'); ul.replaceChildren();
  for (const c of state.cart) {
    const note = c.item.kind === 'dm' ? null : el('textarea', { rows: 2, placeholder: T('orderForm.note'), oninput: e => { c.note = e.target.value; saveCart(); } });
    if (note) note.value = c.note;
    ul.append(el('li', {}, [
      el('div', { class: 'oi-head' }, [el('b', { text: c.item.name }), c.sum ? el('span', { text: c.sum }) : null,
        el('span', { class: 'oi-price', text: c.item.kind === 'quote' ? T('cart.quote') : won(priced(c)) }),
        c.item.kind === 'dm' ? null : el('button', { type: 'button', class: 'oi-del', text: T('orderForm.edit'), onclick: () => { $('#checkout').close(); openDetail(c.item, c); state.backToOrder = true; } }),
        el('button', { type: 'button', class: 'oi-del', 'aria-label': T('cart.remove', { 이름: c.item.name }), text: T('orderForm.remove'), onclick: () => removeFromCart(c) })]),
      note]));
  }
  const total = state.cart.reduce((s, c) => s + priced(c), 0), monthly = state.cart.reduce((s, c) => s + c.monthly, 0);
  $('#order-total').textContent = T('orderForm.total', { 합계: won(total) }) + (monthly ? T('orderForm.totalMonthly', { 월: won(monthly) }) : '') + T('orderForm.totalTail');
  refreshOrder();
}
function openOrder() {
  if (!state.cart.length) { say(T('cartEmpty')); wiggle($('#btn-order')); return; }
  const dlg = $('#checkout');
  if (!dlg.open) {
    $('#order-code').textContent = orderCode();
    if (!$('#dm-user').value) try { $('#dm-user').value = localStorage.getItem(DMUSER_KEY) || ''; } catch {}
    $('#order-edit').inert = false; $('#dm-user').disabled = false;
    const btn = $('#send-order'); delete btn.dataset.sent; btn.textContent = T('orderForm.send');
    $('#send-fail').hidden = true;
    dlg.showModal();
    dlg.scrollTop = 0;
    say(T('order'));
    if (window.gsap && !REDUCED) gsap.fromTo('.checkout-inner', { yPercent: -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .6, ease: 'bounce.out' });
  }
  renderOrder();
}
$('#btn-order').onclick = openOrder;
$('#checkout-close').onclick = () => $('#checkout').close();
// 주문서 바깥(어두운 곳)을 누르면 닫힌다
$('#checkout').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
$('#order-more').onclick = () => { $('#checkout').close(); say(T('more')); };
$('#dm-user').oninput = () => { try { localStorage.setItem(DMUSER_KEY, $('#dm-user').value.trim()); } catch {} refreshOrder(); };
// 포럼 채널 웹후크로 주문마다 스레드를 하나 연다. 그 스레드가 손님과 조율하는 자리다.
$('#send-order').onclick = async () => {
  const out = $('#send-result'), why = orderReady();
  if (why) { out.textContent = why; return; }
  const dmUser = dmUserValue();
  const code = $('#order-code').textContent;
  const first = state.cart[0], title = T('discord.thread', { 번호: code, 이름: first.item.name }) + (state.cart.length > 1 ? T('discord.threadMore', { 개수: state.cart.length - 1 }) : '');
  const btn = $('#send-order'); btn.disabled = true; out.textContent = T('orderForm.sending');
  try {
    const r = await fetch(DISCORD.webhook + '?wait=true', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      username: '봉봉봉', thread_name: title.slice(0, 100), allowed_mentions: { parse: [] },
      content: `${T('discord.user', { 이름: dmUser })}\n\`\`\`\n${orderBody(code)}\n\`\`\``.slice(0, 2000) }) });
    if (!r.ok) throw new Error(r.status);
    btn.dataset.sent = '1'; btn.textContent = T('orderForm.sentBtn');
    $('#order-edit').inert = true; $('#dm-user').disabled = true;
    out.textContent = T('orderForm.sentMsg', { 이름: dmUser });
    say(T('sent'));
    state.cart = []; renderCart(); newOrderCode();
  } catch {
    btn.disabled = false;
    out.textContent = T('orderForm.fail');
    $('#send-fail').hidden = false;
  }
};
// 알림. action을 주면 버튼(되돌리기 등)이 붙고 조금 더 오래 떠 있는다.
function toast(msg, action, onAction) {
  const t = $('#toast'); t.replaceChildren(msg);
  ($('#checkout').open ? $('#checkout') : document.body).append(t); // 주문서가 열려 있으면 그 위에 뜬다
  if (action) t.append(' ', el('button', { type: 'button', text: action, onclick: () => { if (window.gsap) gsap.killTweensOf(t); onAction(); t.style.opacity = 0; t.classList.remove('on'); } }));
  t.classList.toggle('on', !!action);
  const hold = action ? 8 : 1.6;
  if (action) { // 누를 버튼이 있으면 움직이지 않는다
    if (window.gsap) { gsap.killTweensOf(t); gsap.set(t, { opacity: 1, y: 0 }); gsap.to(t, { opacity: 0, delay: hold, duration: .2, onComplete: () => t.classList.remove('on') }); }
    else { t.style.opacity = 1; t.style.transform = 'translate(-50%,0)'; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = 0; t.classList.remove('on'); }, hold * 1000); }
    return;
  }
  if (window.gsap) { gsap.killTweensOf(t); gsap.timeline().to(t, { opacity: 1, y: 0, duration: .25, ease: 'back.out(2)' }).to(t, { opacity: 0, y: 40, delay: hold, duration: .25, onComplete: () => t.classList.remove('on') }); }
  else { t.style.opacity = 1; t.style.transform = 'translate(-50%,0)'; clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = 0; t.classList.remove('on'); }, hold * 1000); }
}

/* ── 덧붙는 효과: 그림 파일이 img/에 있을 때만 켠다(그림 세션이 만드는 중) ── */
// 그림이 img/에 들어오면 이름을 여기에 더한다(없는 파일을 찾느라 404를 내지 않게)
const FX_FILES = new Set(['jaw_top', 'jaw_bottom', 'drool_1', 'drool_2', 'drool_3', 'mote_1', 'mote_2', 'mote_3', 'mote_4']);
const has = k => Promise.resolve(FX_FILES.has(k));
const FX = {};
// 상품을 열 때 입이 쾅 다물렸다 열린다
function chompThen(go) {
  if (!FX.jaw || REDUCED || !window.gsap) return go();
  const top = img('jaw_top', 'jaw jaw-top'), bot = img('jaw_bottom', 'jaw jaw-bot');
  top.loading = bot.loading = 'eager'; document.body.append(top, bot);
  // body를 흔들면 transform이 남아 fixed 요소(아래 막대·배경)의 기준이 body로 바뀌고 화면이 무너진다. 턱만 흔든다
  gsap.timeline({ onComplete: () => { top.remove(); bot.remove(); } })
    .fromTo(top, { yPercent: -100 }, { yPercent: 0, duration: .16, ease: 'power3.in' })
    .fromTo(bot, { yPercent: 100 }, { yPercent: 0, duration: .16, ease: 'power3.in' }, '<')
    .to([top, bot], { x: 8, duration: .035, yoyo: true, repeat: 3 })
    .add(go)
    .to(top, { yPercent: -100, duration: .35, ease: 'expo.out' })
    .to(bot, { yPercent: 100, duration: .35, ease: 'expo.out' }, '<');
}
// 윗입술에서 침이 떨어진다
function drool() {
  if (document.hidden || $('#checkout').open) return setTimeout(drool, 3000);
  const d = img(`drool_${1 + Math.floor(Math.random() * 3)}`, 'drool'); d.loading = 'eager';
  const x = 4 + Math.random() * 40; // 입술은 화면 왼쪽 절반
  d.style.left = x + 'vw'; document.body.append(d);
  gsap.timeline({ onComplete: () => d.remove() })
    .fromTo(d, { y: innerHeight * .12, scaleY: .2, transformOrigin: '50% 0' }, { scaleY: 1, duration: 1.4, ease: 'sine.in' })
    .to(d, { y: innerHeight, duration: 1.1, ease: 'power2.in' });
  setTimeout(drool, 2500 + Math.random() * 5000);
}
// 입 안에 먼지·포자가 떠다닌다
function motes() {
  for (let i = 0; i < 9; i++) {
    const m = img(`mote_${1 + (i % 4)}`, 'mote'); m.loading = 'eager'; document.body.append(m);
    gsap.set(m, { left: gsap.utils.random(25, 95) + 'vw', top: gsap.utils.random(10, 85) + 'vh', scale: gsap.utils.random(.5, 1.1), opacity: gsap.utils.random(.35, .8) });
    gsap.to(m, { x: () => gsap.utils.random(-80, 80), y: () => gsap.utils.random(-60, 60), rotation: () => gsap.utils.random(-90, 90), duration: () => gsap.utils.random(5, 9), ease: 'sine.inOut', repeat: -1, repeatRefresh: true, yoyo: true });
  }
}
(async () => {
  if (REDUCED || !window.gsap) return;
  const [jaw, dr, mo] = await Promise.all(['jaw_top', 'drool_1', 'mote_1'].map(has));
  FX.jaw = jaw && await has('jaw_bottom');
  if (dr) setTimeout(drool, 1500);
  if (mo) motes();
})();

const DOODLES = [[1, 52, 14, -8], [2, 78, 10, 12], [3, 64, 40, -4], [4, 90, 46, 6], [5, 46, 30, 10], [6, 70, 64, -12], [7, 56, 58, 4], [8, 84, 28, -6]];
$('.doodles').replaceChildren(...DOODLES.map(([n, x, y, r]) => { const d = img(`doodle_${n}`, 'doodle'); d.style.cssText = `left:${x}%;top:${y}%;transform:rotate(${r}deg)`; return d; }));
// 로딩: 입이 열리는 세 장. 스크립트가 없어도 CSS가 알아서 걷어 낸다
{ const L = $('#loader img'); if (L && !REDUCED) [2, 3].forEach((n, i) => setTimeout(() => { L.src = IMG(`load_${n}`); }, 220 * (i + 1))); }

/* ── 시작 ── */
// index.html에 적힌 글도 여기서 바꿔 끼운다(data-t: 글, data-t-alt: 그림 설명, data-t-label: 읽어 주는 이름, data-t-ph: 흐린 글)
{ const put = (sel, f) => document.querySelectorAll(sel).forEach(n => { const k = n.getAttribute(sel.slice(1, -1)), v = T(k); if (v) f(n, v); });
  put('[data-t]', (n, v) => { n.textContent = v; }); put('[data-t-alt]', (n, v) => { n.alt = v; });
  put('[data-t-label]', (n, v) => n.setAttribute('aria-label', v)); put('[data-t-ph]', (n, v) => { n.placeholder = v; });
  if (D.page?.title) document.title = D.page.title;
  if (D.page?.description) document.querySelector('meta[name=description]')?.setAttribute('content', D.page.description);
  document.getElementById('send-fail').replaceChildren(...F('orderForm.failHelp', { DM: el('a', { href: 'https://discord.com/users/823053384633417738', target: '_blank', rel: 'noopener', text: T('orderForm.failDm') }) })); }
loadCart(); renderRail(); renderShelf(); renderExtras(); renderCart();
setTimeout(() => say(T('hello')), 600); poke();
if (window.gsap && !REDUCED) {
  gsap.from('.sign', { y: -120, rotate: -12, duration: .9, ease: 'bounce.out' });
  gsap.from('.counter', { x: -60, opacity: 0, duration: .5, delay: .3 });
  gsap.from('.cartbar', { yPercent: 100, duration: .5, delay: .4, ease: 'expo.out' });
}
// 마우스를 따라 입 속이 살짝 출렁인다. 벽은 멀리, 주인은 가까이 있어서 반대로 움직인다
if (window.gsap && !REDUCED && matchMedia('(pointer: fine)').matches) {
  const q = (t, p) => gsap.quickTo(t, p, { duration: .9, ease: 'power3.out' });
  const LAYERS = [['.l-wall', 4], ['.doodles', 8], ['.l-green', 12], ['.l-yellow', 16], ['.l-lower', 18], ['.l-upper', 24]].map(([sel, d]) => [q(sel, 'x'), q(sel, 'y'), d]);
  const gx = q('.sign', 'x');
  addEventListener('pointermove', e => { const mx = e.clientX / innerWidth - .5, my = e.clientY / innerHeight - .5; LAYERS.forEach(([x, y, d]) => { x(-mx * d); y(-my * d * .6); }); gx(mx * 6); }, { passive: true });
}
})();
