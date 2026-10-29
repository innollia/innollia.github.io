/* 봉봉봉 — 상점 화면 전부. 가격·상품은 ITEMS, TIN 게임 시간은 TIN_HOURS만 고치면 된다. */
(() => {
'use strict';

const RATE = 20000, AI_RATE = 5000, HOUR = RATE + AI_RATE;
/* 주문을 받을 디스코드 포럼 채널의 웹후크 주소. 비어 있으면 "복사 → DM"으로만 받는다. */
const DISCORD = { webhook: 'https://discord.com/api/webhooks/1564973701697507438/F-r_V9ZolGjywsiOHrfTN3xceXLt4WQWqPn-IjKzQMYLayQOe9R3kWP5OcMqx8qYHpbY', guild: '1533421689558270152' }; // 주문 포럼은 이놀아안 개인 서버. 손님은 못 들어가니 링크를 주지 않는다

/* ── 상품별 용례: "이걸로 뭐 할 건데?" ── */
const USES = {
  game: { q: '게임으로 뭐 할 건데?', ex: [
    ['생일 친구가 주인공인 한 판', '케이크 지키다가 마지막에 축하 메시지'],
    ['서버 밈 게임', '수육공·절데적진리가 아이템으로 나오는 미니게임'],
    ['TRPG 보스전 직접 해 보기', '세션에서 못 이긴 보스를 게임으로'],
    ['내 자작곡으로 리듬 게임', '변주곡 박자에 맞춰 누르기'],
  ] },
  web: { q: '사이트로 뭐 할 건데?', ex: [
    ['내 TRPG 캐릭터 소개 페이지', '과거사·능력치·그림 한 곳에'],
    ['작곡 모음 감상실', '변주곡 악장별로 듣고 악보 보기'],
    ['기념일 축하 사이트', '사진, 편지, 숨은 버튼 하나'],
    ['서버 연대기', '한글날 축제, Bake or Die 사건 기록'],
  ] },
  bot: { q: '디스코드 봇 만들어서 뭐 할 건데?', ex: [
    ['외래어 단속 봇', '한글날마다 외래어 쓰면 잡아서 순우리말 반성문 받기'],
    ['작곡 릴레이 진행 봇', '다음 차례·마감 알림, 올라온 곡 모아 두기'],
    ['TRPG 주사위 + 시트 봇', '/굴려 2d6+3, 내 캐릭터 능력치 불러오기'],
    ['게임 파티 모집 봇', '로블록스 몇 시에 할 사람? 모이면 다 같이 핑'],
    ['명대사 박제 봇', '말실수를 박제하고 아무 때나 랜덤으로 꺼내기'],
    ['내 캐릭터 상주 봇', '자작 캐릭터가 서버에 살면서 대화에 끼어들기'],
  ] },
  read: { q: '무슨 글을 읽어 줄까?', ex: [
    ['내 자작시', '담백하게, 끝에 여운'],
    ['TRPG 시나리오 도입부', '성우처럼 분위기 잡고'],
    ['잠 안 올 때 들을 소설 한 장', '조용조용'],
  ] },
  song: { q: '무슨 노래?', ex: [
    ['생일 축하 노래', '이름 넣어서'],
    ['음성 채널 입장 테마', '짧게 한 소절'],
    ['서버 노동요', '다 같이 작업할 때'],
  ] },
  oracle: { q: '무엇을 물어볼까?', ex: [
    ['진로 고민', '이 길 계속 가도 될까'],
    ['업무 자동화', '매주 하는 엑셀 정리, AI로 없앨 수 있을까'],
    ['게임 아이디어 검증', '이거 재밌을까, 만들 수 있을까'],
  ] },
  research: { q: '무엇을 파 볼까?', ex: [
    ['옛날 플래시 게임 원작자 찾기', '제목만 기억나는 그 게임'],
    ['밈의 최초 출처', '이 짤 처음 누가 올렸나'],
    ['아주 마이너한 역사', '특정 악기 주법이 언제 생겼나'],
  ] },
  xpost: { q: '무엇을 올려 줄까?', ex: [
    ['내 작품 홍보 한 줄', '링크 + 한 줄 소개'],
    ['공개 생일 축하', '친구 이름 넣어서'],
  ] },
  dm: { q: 'ss0랑 DM으로 뭐 할 건데?', ex: [
    ['1:1 고민 상담', '서버에선 못 하는 얘기'],
    ['개인 메모 비서', '떠오른 걸 던지면 정리해서 보관'],
  ] },
  ss0feat: { q: 'ss0에 뭘 붙일 건데?', ex: [
    ['/칭호', '서버 밈으로 랜덤 칭호 붙여 주기'],
    ['/박제', '명대사 저장하고 랜덤으로 꺼내기'],
    ['내 캐릭터 페르소나', '내 TRPG 캐릭터 말투로 대답하는 ss0'],
    ['음성 채널 입장 알림', '누가 들어오면 그 사람 테마 한 줄'],
  ] },
};
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const won = n => n.toLocaleString('ko-KR') + '원';
// 가게 화폐는 이빨. 1개 = 1,000원. 화면에는 이빨로 보이고, 입금 착오가 없게 원화를 옆에 작게 둔다. 디스코드 주문서는 원화.
const TOOTH = 1000;
const tw = n => `이빨 ${(n / TOOTH).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}개`;
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
const img = (k, cls = '') => el('img', { src: IMG(k), alt: '', class: cls, loading: 'lazy', decoding: 'async' });

/* ── 상품 ── */
const CATS = [
  { id: 'make', name: '제작소', sub: '게임·웹사이트·봇' },
  { id: 'voice', name: '목소리', sub: '낭독·노래' },
  { id: 'brain', name: '머리 빌리기', sub: '신탁·조사·대행' },
  { id: 'ss0', name: 'ss0 봇', sub: '해금·기능 추가' },
];
const ITEMS = [
  { id: 'game', cat: 'make', icon: 'game', c: '#7a5cff', name: '게임 제작', sub: '시간을 끌어서 퀄리티를 골라요', badge: ['간판', 'hot'],
    priceText: '이빨 25개/시간~', wonText: '시간당 25,000원', kind: 'hours',
    desc: '드래그로 작업 시간을 정하면 그만큼의 게임이 나와요.\n단계를 넘을 때마다 실제로 그 시간 들여 만든 게임을 보여 드려요.',
    line: '시간 막대를 오른쪽으로 끌어 봐! 단계 넘을 때마다 잠깐 멈출 거야.' },
  { id: 'web', cat: 'make', icon: 'web', c: '#4ab8ff', name: '웹사이트', sub: '최대 6시간 · 1만~10만', priceText: '이빨 10개~', wonText: '10,000원~', kind: 'web',
    desc: '기념일 페이지, 소개 페이지, 작은 도구 사이트.\n6시간 안에 끝나는 크기만 받아요.',
    line: '웹사이트는 6시간까지만!' },
  { id: 'bot', cat: 'make', icon: 'bot', c: '#2fe0b0', name: '새 디스코드 봇', sub: '제작 + 서버비 포함 월 유지', priceText: '이빨 30개~', wonText: '30,000원~', kind: 'bot',
    desc: '처음부터 우리 서버 전용 봇을 만들어요.\n제작비는 완성 후에 한 번, 서버비를 포함한 월 유지비는 매달 먼저.',
    line: '봇은 만들고 끝이 아니야. 서버비랑 고장 수리까지 월 유지비에 들어 있어.' },
  { id: 'read', cat: 'voice', icon: 'read', c: '#ff7ac0', name: '글 읽어주기', sub: '띄어쓰기 포함 글자당', priceText: '이빨 10~50개', wonText: '글자당 10~50원', kind: 'read', badge: ['시범가'],
    desc: '보내 준 글을 제 목소리로 읽어 녹음해 드려요.\n띄어쓰기 포함 글자 수로 계산해요. 최소 이빨 1개(1,000원).',
    line: '글을 붙여 넣으면 글자 수를 바로 세 줄게. 연기 등급도 골라 봐.' },
  { id: 'song', cat: 'voice', icon: 'song', c: '#ffc93c', name: '노래 1곡', sub: '불러 드려요', priceText: '이빨 2개', wonText: '2,000원', kind: 'qty', price: 2000, unit: '곡',
    desc: '듣고 싶은 노래를 불러서 녹음해 드려요.', field: '곡 제목 / 가수', line: '노래는 한 곡에 이빨 2개. 여러 곡이면 개수를 올려.' },
  { id: 'oracle', cat: 'brain', icon: 'oracle', c: '#7a5cff', name: '신탁', sub: '개인 고민 ~ 업무 자동화', priceText: '주고 싶은 만큼', kind: 'pwyw', badge: ['자율', 'free'],
    desc: '개인 고민부터 회사 특정 업무 자동화까지 물어보세요.\n값은 답을 듣고 주고 싶은 만큼. 0원도 돼요.',
    line: '신탁은 값이 없어. 들어 보고 마음에 들면 그때 내.' },
  { id: 'research', cat: 'brain', icon: 'research', c: '#4ab8ff', name: '개빡센 조사', sub: '무지막지하게 마이너해도 OK', priceText: '이빨 10개', wonText: '10,000원', kind: 'text', price: 10000,
    desc: 'AI한테 물어도 안 나오는 걸 끝까지 파서 정리해 드려요.\n마이너할수록 좋아요.', field: '무엇을 조사할까요?',
    line: 'AI보다 내가 더 잘 파. 진짜 마이너한 거 들고 와 봐.' },
  { id: 'xpost', cat: 'brain', icon: 'xpost', c: '#ffffff', name: 'X 대리 포스트', sub: '제 X에 대신 올려요', priceText: '이빨 1개', wonText: '1,000원', kind: 'qty', price: 1000, unit: '개',
    desc: '하고 싶은 말을 제 X 계정에 대신 올려 드려요.\n(올리기 전에 제가 한 번 읽어요.)', field: '올릴 내용',
    line: '내 X에 네 말을 올려 줄게. 이상한 건 안 올려 줌.' },
  { id: 'dm', cat: 'ss0', icon: 'key', c: '#ffc93c', name: 'ss0 DM 해금', sub: '다른 상품 사면 공짜', priceText: '이빨 5개', wonText: '5,000원', kind: 'dm',
    desc: 'ss0 봇과 1:1 DM으로 대화할 수 있게 열어 드려요.\n장바구니에 다른 상품이 하나라도 있으면 무료.\n주문이 들어오면 이놀아안이 확인하고 직접 열어 줘요(조금 걸릴 수 있어요). 혼자 살 때 이빨 5개(5,000원)도 열린 뒤에 내요.',
    line: '다른 거 하나만 사도 DM은 공짜로 열어 줘.' },
  { id: 'ss0feat', cat: 'ss0', icon: 'gear', c: '#2fe0b0', name: 'ss0 기능 추가', sub: '이놀아안이 검토 후 가격 책정', priceText: '검토 후 가격', kind: 'quote',
    desc: 'ss0에 갖고 싶은 기능을 주문하세요.\n종류를 고르고 설명을 적으면, 제가 검토해서 가격을 정해 답장해요.',
    line: '기능마다 품이 달라서 내가 보고 값을 매겨. 일단 적어서 줘!' },
  { id: 'partner', cat: 'make', icon: 'partner', c: '#ff7ac0', name: '동업자 되기', sub: 'PICO-8로 뭐라도 만들어 와', priceText: '이빨 0개 · 도전', kind: 'partner', badge: ['모집'],
    desc: '내 사업시도의 동료가 되고 싶다면, PICO-8 독학해서 뭐라도 작동하는 거 하나 가져와요. 검토해 줄게요.\n아래는 제가 PICO-8로 만든 것들이에요. 이 정도면 충분해요.',
    field: '만든 게임 링크나 설명', line: 'PICO-8로 하나 만들어 와. 내 것도 해 보고 가.' },
  { id: 'pix', cat: 'soon', icon: 'face', c: '#ff7ac0', name: '픽셀 프로필', sub: '디코 프사·이모티콘', soon: true },
  { id: 'giftgame', cat: 'soon', icon: 'gift', c: '#ff2e4d', name: '선물 게임', sub: '생일·기념일용 한 판짜리', soon: true },
  { id: 'aisetup', cat: 'soon', icon: 'setup', c: '#4ab8ff', name: 'AI 작업환경 세팅', sub: '내 컴퓨터에 클로드코드 깔고 길들이기', soon: true },
  { id: 'playtest', cat: 'soon', icon: 'playtest', c: '#7a5cff', name: '플레이테스트', sub: '버그·재미 리포트', soon: true },
  { id: 'trpg', cat: 'soon', icon: 'dice', c: '#ffc93c', name: 'TRPG 캐릭터 패키지', sub: '과거사·능력·시트', soon: true },
  { id: 'theme', cat: 'soon', icon: 'theme', c: '#2fe0b0', name: '개인 등장 테마', sub: '8비트 BGM 루프', soon: true },
];
const WEB_STEPS = [
  { h: .5, p: 10000, title: '한 장짜리', desc: '사진 몇 장과 글이 들어간 한 페이지.' },
  { h: 1, p: 20000, title: '꾸민 한 장', desc: '움직이는 장식, 음악, 숨은 버튼 하나.' },
  { h: 2, p: 35000, title: '여러 장', desc: '메뉴가 있고 페이지가 3~4개.' },
  { h: 3, p: 50000, title: '놀거리 있는 사이트', desc: '퀴즈·방명록 같은 작은 기능 하나.' },
  { h: 4, p: 65000, title: '작은 도구', desc: '입력하면 계산·변환해 주는 사이트.' },
  { h: 5, p: 80000, title: '이벤트 사이트', desc: '기념일·행사용, 연출 듬뿍.' },
  { h: 6, p: 100000, title: '최대치', desc: '6시간 꽉 채운 사이트.' },
];
const READ_TIERS = [
  { id: 'plain', name: '담백', rate: 10, sub: '또박또박' },
  { id: 'base', name: '기본', rate: 20, sub: '자연스럽게' },
  { id: 'act', name: '연기', rate: 35, sub: '감정 넣어서' },
  { id: 'soul', name: '혼신', rate: 50, sub: '다역·효과음까지' },
];
const BOT_TIERS = [
  { id: 'mini', name: '꼬마 봇', build: 30000, month: 3000, sub: '명령 5개 이하, AI 없음' },
  { id: 'work', name: '일꾼 봇', build: 80000, month: 7000, sub: '버튼·모달·저장' },
  { id: 'soul', name: '영혼 봇', build: 150000, month: 15000, sub: 'AI 캐릭터·기억 (토큰 포함)' },
];
const FEAT_KINDS = [
  { id: 'cmd', name: '간단 명령', sub: '랜덤 별명·명대사 뽑기' },
  { id: 'data', name: '놀이·데이터', sub: '밈 빙고·퀴즈·파티 모집' },
  { id: 'ui', name: '버튼·화면', sub: 'TRPG 시트·작곡 릴레이 진행' },
  { id: 'ai', name: 'AI 연동', sub: '전용 페르소나·요약' },
  { id: 'mem', name: '기억·외부 연동', sub: '장기 기억·자동 알림' },
];
const CARTS = [
  { id: 'bounce', name: '바운스', label: 'carts/bounce.png' },
  { id: 'curser2', name: '커서 2' },
  { id: 'squashy', name: '스퀴시' },
  { id: 'train', name: '트레인' },
  { id: 'eatkano', name: '잇 카노', label: 'carts/eatkano.p8.png' },
];
const LINES = {
  hello: '어서오십쇼! 봉봉봉이야. 시키는 거 다 해 줌. 단, 이빨은 받아.',
  make: '제작소야. 게임은 시간 막대를 끌어서 사는 거야.',
  voice: '목소리 코너. 내 목소리 공짜 아니다.',
  brain: '머리 빌리는 곳. 신탁은 값을 네가 정해.',
  ss0: 'ss0 봇 코너. DM 해금은 뭐든 하나 사면 공짜!',
  soon: '아직 준비 중인 물건들. 먼저 찜하고 싶으면 DM 줘.',
  hall: '여기 이름 올라간 사람들은 평생 단골이야.',
  added: ['담았다! 더 볼래?', '좋은 선택이야.', '장바구니로 슝~', '그거 진짜 잘 골랐다.'],
  order: '확인하고 "디스코드로 주문 보내기" 누르면 끝! 돈은 후불이야.',
};

/* ── 주인 헛소리 (문장생성기/shopkeeper_lines.py → keeper_lines.json) ──
   정보를 알려야 하는 말(오류, 수정 완료, 시간 단계)은 그대로 두고, 분위기 말만 여기서 뽑는다. */
let KEEPER = {};
fetch('keeper_lines.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(j => { KEEPER = j || {}; }).catch(() => {});
function babble(key, fallback) {
  const pool = KEEPER[key]?.length ? KEEPER[key] : KEEPER.lines; // 상황별 줄이 없으면 공통 헛소리
  return pool?.length ? pool[Math.floor(Math.random() * pool.length)] : fallback;
}
let idleTimer;
function poke() { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!$('#checkout').open) say(babble('idle', '…')); poke(); }, 25000); }
['pointerdown', 'keydown'].forEach(t => addEventListener(t, poke, { passive: true }));

/* ── 상태 ── */
const state = { cat: 'make', cart: [], item: null, draft: null };
let seq = 0;

/* ── 주인장 ── */
const keeper = $('#keeper');
const FACES = ['idle', 'talk', 'happy'];
keeper.replaceChildren(...FACES.map(f => { const i = el('img', { src: IMG(`keeper_${f}`), alt: '', 'data-face': f }); i.hidden = f !== 'idle'; return i; }));
let faceTimer;
function face(f, ms) {
  keeper.querySelectorAll('img').forEach(i => { i.hidden = i.dataset.face !== f; });
  clearTimeout(faceTimer); if (ms) faceTimer = setTimeout(() => face('idle'), ms);
}
if (window.gsap && !REDUCED) gsap.to(keeper, { scaleY: .97, transformOrigin: '50% 100%', duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
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
  // 글자가 찍히는 동안 입을 여닫는다
  typeTimer = setInterval(() => {
    p.textContent = text.slice(0, ++i);
    const happy = !keeper.querySelector('[data-face=happy]').hidden; // 웃는 중에는 입을 여닫지 않는다
    if (!happy) face(i >= text.length || i % 4 >= 2 ? 'idle' : 'talk');
    if (i >= text.length) clearInterval(typeTimer);
  }, 28);
}

/* ── 진열대: 입 안에서 도는 원통 ──
   스크롤을 내리면 원통이 한 칸씩 돌아 상품이 전부 앞으로 지나간다(화면은 그동안 고정).
   끌어도 돌고, 옆 칸을 누르면 그 칸이 앞으로 오고, 앞에 온 칸을 누르면 열린다.
   ScrollTrigger가 없으면 예전처럼 범주별 격자로 보여 준다. */
const SHELF = CATS.flatMap(c => ITEMS.filter(i => i.cat === c.id && !i.soon));
const ring = { pos: 0, target: 0, cards: [], st: null, front: -1, vel: 0 };
function selectTab(id) {
  state.cat = id;
  $('#rail').querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.cat === id)));
}
function renderRail() {
  const rail = $('#rail'); rail.replaceChildren();
  rail.setAttribute('role', 'tablist');
  for (const c of CATS) rail.append(el('button', { class: 'tab', role: 'tab', 'data-cat': c.id, 'aria-selected': String(c.id === state.cat),
    onclick: () => { selectTab(c.id); say(babble(`cat_${c.id}`, LINES[c.id]));
      if (ring.st) ringGo(SHELF.findIndex(i => i.cat === c.id));
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
  const wrap = el('div', { class: 'ring', role: 'listbox', 'aria-label': '상품 (←/→로 돌리기)', tabindex: '0' });
  ring.cards = SHELF.map((it, i) => {
    const c = makeCard(it, () => { if (ring.moved) return; if (i === ring.front) chompThen(() => openDetail(it)); else ringGo(i); });
    c.setAttribute('role', 'option'); c.tabIndex = -1; wrap.append(c); return c;
  });
  const cat = el('h2', { class: 'ring-cat' }), catSub = el('p', { class: 'ring-catsub' });
  const fName = el('h3', { class: 'front-name' }), fDesc = el('p', { class: 'front-desc' });
  const fBtn = el('button', { class: 'btn-buy pic front-open', 'aria-label': '열어 보기', text: '열어 보기', onclick: () => chompThen(() => openDetail(SHELF[ring.front])) });
  const count = el('span', { class: 'ring-count' });
  const prev = el('button', { class: 'ring-nav', 'aria-label': '이전 상품', text: '◀', onclick: () => ringGo(ring.front - 1) });
  const next = el('button', { class: 'ring-nav', 'aria-label': '다음 상품', text: '▶', onclick: () => ringGo(ring.front + 1) });
  const stage = el('section', { class: 'stage', id: 'stage' }, [
    el('div', { class: 'ring-head' }, [$('#rail'), cat, catSub]), // 범주 탭도 고정된 판 안에 둔다
    wrap,
    el('div', { class: 'front' }, [el('div', { class: 'front-text' }, [fName, fDesc]), fBtn]),
    el('div', { class: 'ring-bar' }, [prev, count, next, el('span', { class: 'ring-hint', text: '스크롤하거나 끌어서 돌리기' })]),
  ]);
  shelf.append(stage);
  ring.ui = { cat, catSub, fName, fDesc, count, wrap };

  const n = SHELF.length;
  ring.st = ScrollTrigger.create({ trigger: stage, start: 'top top', end: () => '+=' + Math.round((n - 1) * innerHeight * .42), pin: true, pinSpacing: true,
    onUpdate: self => { ring.target = self.progress * (n - 1); },
    snap: { snapTo: 1 / (n - 1), duration: { min: .2, max: .6 }, delay: .08, ease: 'power2.inOut' } });

  // 끌기: 손가락이 간 만큼 스크롤을 옮겨서 돌린다(스크롤과 같은 길을 쓰니 어긋나지 않는다)
  let sx = 0, sy = 0, down = false;
  wrap.addEventListener('pointerdown', e => { down = true; ring.moved = false; sx = e.clientX; sy = scrollY; });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 6) ring.moved = true;
    if (ring.moved) { const per = (ring.st.end - ring.st.start) / (n - 1); scrollTo(0, sy - dx / 180 * per); }
  });
  addEventListener('pointerup', () => { down = false; setTimeout(() => { ring.moved = false; }, 0); });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); ringGo(ring.front + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ringGo(ring.front - 1); }
    if (e.key === 'Home') { e.preventDefault(); ringGo(0); }
    if (e.key === 'End') { e.preventDefault(); ringGo(SHELF.length - 1); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(SHELF[ring.front]); }
  });

  // 처음엔 원통이 한 바퀴 반쯤 돌면서 들어온다
  ring.pos = REDUCED ? 0 : -n * .6;
  gsap.ticker.add(ringTick);
}
function ringGo(i) {
  const n = SHELF.length; i = Math.max(0, Math.min(n - 1, i));
  if (!ring.st) return;
  const y = ring.st.start + (ring.st.end - ring.st.start) * i / (n - 1);
  scrollTo({ top: Math.round(y) + 1, behavior: REDUCED ? 'auto' : 'smooth' });
}
function ringTick() {
  const n = ring.cards.length; if (!n) return;
  // 멈춰 있으면 다시 그리지 않는다(앞 칸의 둥실거림은 CSS가 한다)
  if (ring.pos === ring.target && Math.abs(ring.vel) < 1e-4 && ring.drawn === ring.pos && ring.W === ring.ui.wrap.clientWidth) return;
  const before = ring.pos;
  ring.pos += (ring.target - ring.pos) * (REDUCED ? 1 : .12);
  if (Math.abs(ring.target - ring.pos) < .0005) ring.pos = ring.target;
  ring.vel = ring.vel * .8 + (ring.pos - before) * .2;
  // 반쯤 보이는 원통: 앞 칸은 크게, 옆 칸은 비스듬히 물러나고, 너무 뒤로 간 칸은 사라진다
  const W = ring.ui.wrap.clientWidth, Rx = W * .52, Rz = 760, step = .82;
  ring.cards.forEach((c, i) => {
    let d = ((i - ring.pos) % n + n) % n; if (d > n / 2) d -= n; // 원통이라 뒤쪽 칸은 왼편으로 돌아 나온다
    const a = Math.max(-2.4, Math.min(2.4, d * step)), depth = (1 - Math.cos(a)) / 2; // 0 = 맨 앞, 1 = 맨 뒤
    const x = Math.sin(a) * Rx, z = (Math.cos(a) - 1) * Rz + 0, pop = 1 + (1 - Math.min(1, Math.abs(d))) * .32; // 앞에 오면 크게 튀어나온다
    c.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(1)}px,${(-depth * 70).toFixed(1)}px,${z.toFixed(1)}px) rotateY(${(a * .55).toFixed(3)}rad) rotateZ(${(-ring.vel * 40).toFixed(2)}deg) scale(${pop.toFixed(3)})`;
    c.style.opacity = Math.max(0, Math.min(1 - depth * .7, 3.2 - Math.abs(d))).toFixed(3);
    c.style.filter = depth > .02 ? `brightness(${(1 - depth * .55).toFixed(2)})` : '';
    c.style.zIndex = String(100 - Math.round(depth * 100));
    c.style.pointerEvents = Math.abs(d) > 2.5 ? 'none' : '';
  });
  ring.drawn = ring.pos; ring.W = W;
  const f = Math.max(0, Math.min(n - 1, Math.round(ring.pos)));
  if (f !== ring.front) ringFront(f);
}
function ringFront(f) {
  const prevCat = ring.front >= 0 ? SHELF[ring.front].cat : null;
  ring.front = f;
  const it = SHELF[f], c = CATS.find(x => x.id === it.cat), u = ring.ui;
  ring.cards.forEach((card, i) => { card.classList.toggle('is-front', i === f); card.setAttribute('aria-selected', String(i === f)); });
  u.wrap.setAttribute('aria-activedescendant', '');
  u.cat.textContent = c.name; u.catSub.textContent = c.sub;
  u.fName.textContent = it.name; u.fDesc.textContent = `${it.sub}. ${it.desc.split('\n')[0]}`; // 무료 조건 같은 핵심이 sub에 있다
  u.count.textContent = `${f + 1} / ${SHELF.length}`;
  selectTab(it.cat);
  if (window.gsap && !REDUCED) gsap.fromTo([u.fName, u.fDesc], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .3, stagger: .05, ease: 'back.out(2)' });
  if (prevCat && prevCat !== it.cat) { say(babble(`cat_${it.cat}`, LINES[it.cat])); if (window.gsap && !REDUCED) gsap.fromTo(u.cat, { scale: 1.4, rotate: -8 }, { scale: 1, rotate: 0, duration: .5, ease: 'elastic.out(1,.4)' }); }
}
function makeCard(it, onPick) {
  const card = el('button', { class: 'card' + (it.soon ? ' soon' : ''), style: `--c:${it.c}`, 'aria-disabled': it.soon ? 'true' : false,
    onclick: () => it.soon ? (say(`${it.name}은(는) 아직 입고 전이야. 곧 들어와!`), wiggle(card)) : onPick ? onPick() : openDetail(it) }, [
    it.badge ? el('span', { class: 'badge ' + (it.badge[1] || ''), text: it.badge[0] }) : null,
    it.soon ? el('span', { class: 'stamp', text: '입고 예정' }) : null,
    el('div', { class: 'card-art' }, [img('ui_slot', 'slot'), img(it.icon, 'icon')]),
    el('div', { class: 'card-body' }, [el('div', { class: 'card-name', text: it.name }), el('div', { class: 'card-sub', text: it.sub }),
      it.soon ? null : el('div', { class: 'card-price' }, [el('span', { class: 'tag-text', text: it.priceText }), it.wonText ? el('small', { text: it.wonText }) : null])]),
  ]);
  return card;
}
function renderExtras() {
  const soon = el('section', { class: 'extra' }, [el('div', { class: 'shelf-head' }, [el('h2', { text: '입고 예정' }), el('p', { text: '곧 들어와요' })]),
    el('div', { class: 'grid' }, ITEMS.filter(i => i.soon).map(it => makeCard(it)))]);
  const hall = el('section', { class: 'extra' }, [el('div', { class: 'shelf-head' }, [el('h2', { text: '똘라따무' }), el('p', { text: '봉 신주해 를비소' })])]);
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
    : el('div', { class: 'player-empty', text: `${c.name}\n카트리지 굽는 중...\n곧 여기서 바로 할 수 있어요` }));
  player.replaceChildren(frame, el('div', { class: 'player-bar' }, [el('span', { text: `▶ ${c.name}` }), el('span', { text: '화면을 한 번 누르면 시작 · 방향키 + Z/X' })]));
  player.classList.add('on');
  say(ok ? `${c.name}! 방향키랑 Z, X로 해 봐.` : `${c.name}은(는) 아직 웹용으로 굽는 중이야.`);
  if (window.gsap && !REDUCED) gsap.fromTo(frame, { scaleY: .02, filter: 'brightness(4)' }, { scaleY: 1, filter: 'brightness(1)', duration: .45, ease: 'expo.out' });
}

/* ── 명예의 전당 (supporters.json: [{ name, amount, note }]. All Tomorrow 콘솔의 입금 확인이 갱신) ── */
async function renderHall(shelf) {
  const hall = el('div', { class: 'hall' }); shelf.append(hall);
  let rows = [];
  try { rows = await (await fetch('supporters.json', { cache: 'no-store' })).json(); } catch {}
  if (!rows.length) { hall.append(el('p', { class: 'hall-empty', text: '아직이 술 마신다요. 티-원이 되어 주세요!' })); return; }
  rows.sort((a, b) => (b.amount || 0) - (a.amount || 0)).forEach((r, i) => hall.append(el('div', { class: 'hall-row' }, [
    el('span', { class: 'rank', text: String(i + 1).padStart(2, '0') }), el('b', { text: r.name }),
    r.note ? el('span', { text: r.note }) : null, el('span', { class: 'amt', text: !r.amount ? '♥' : (r.currency && r.currency !== 'KRW') ? `${r.amount} ${r.currency}` : won(r.amount) })])));
  hall.append(el('a', { class: 'bmc', href: 'https://buymeacoffee.com/innollia', target: '_blank', rel: 'noopener', text: '☕ 커피 한 잔 사 주기' }));
  if (window.gsap && !REDUCED) gsap.from(hall.children, { x: -40, opacity: 0, stagger: .05, duration: .35 });
}

/* ── 상세 패널 ── */
const detail = $('#detail');
const BACKDROP = ['.marquee', '.counter', '.shop', '.extras', '.cartbar'];
let lastFocus = null;
function openDetail(it, prev) {
  if (state.closing) { if (window.gsap) gsap.killTweensOf('.detail-panel'); state.closing = false; detail.style.pointerEvents = ''; }
  lastFocus = document.activeElement;
  state.item = it; state.draft = { note: prev?.note || '', prev }; state.editing = prev || null;
  const already = it.id === 'dm' && !prev && state.cart.some(c => c.item.id === 'dm');
  $('#detail-buy').textContent = prev ? '수정 완료' : already ? '이미 담겨 있어요' : '담기';
  $('#detail-buy').classList.toggle('pic', !prev && !already); // 그림 버튼에 "사기"가 그려져 있다
  $('#detail-buy').disabled = already;
  $('#detail-say').textContent = '';
  $('#detail-cat').textContent = CATS.find(c => c.id === it.cat).name;
  $('#detail-title').textContent = it.name;
  $('#detail-desc').textContent = it.desc;
  detail.style.setProperty('--c', it.c);
  $('#detail-icon').replaceChildren(img(it.icon));
  const body = $('#detail-body'); body.replaceChildren();
  BUILD[it.kind](body, it);
  const uses = it.kind === 'read' ? null : USES[it.id]; // 낭독은 칸이 '읽을 글'이라 예시를 넣으면 값이 바뀐다
  if (uses) {
    const t = body.querySelector('textarea');
    const box = el('div', { class: 'box' }, [el('h3', { text: uses.q }),
      t ? el('p', { class: 'note', style: 'margin:0 0 8px', text: '누르면 아래 칸에 더해져요' }) : null]);
    const add = x => {
      const line = x[0] + (x[1] ? ` — ${x[1]}` : '');
      if (!t.value.split('\n').includes(line)) { t.value = t.value.trim() ? `${t.value.trim()}\n${line}` : line; t.dispatchEvent(new Event('input')); } // 적어 둔 걸 지우지 않고 더한다
      t.focus(); t.setSelectionRange(t.value.length, t.value.length);
      wiggle(t); say('아래 칸에 적어 뒀어. 수정해도 돼.');
    };
    // 적을 칸이 없는 상품(DM 해금)은 예시 칸 자체를 두지 않는다
    if (t) { box.append(el('div', { class: 'chips' }, uses.ex.map(x => el('button', { class: 'chip', onclick: () => add(x) }, [x[0], el('small', { text: x[1] })])))); body.prepend(box); }
  }
  updatePrice();
  detail.setAttribute('aria-hidden', 'false'); document.documentElement.classList.add('locked');
  BACKDROP.forEach(q => { $(q).inert = true; });
  $('.detail-panel').scrollTop = 0;
  say(prev ? `담아 둔 걸 수정하는 중이야${prev.sum ? ` (지금 ${prev.sum})` : ''}. 바꾸고 "수정 완료" 눌러.` : babble(`item_${it.id}`, it.line));
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
    if (!$('#checkout').open) sayNow(LINES[state.cat] || LINES.hello);
  };
  if (window.gsap && !REDUCED) { gsap.killTweensOf('.detail-panel'); gsap.to('.detail-panel', { xPercent: 100, duration: .3, ease: 'power3.in', onComplete: done }); } else done();
}
$('#detail-close').onclick = closeDetail;
$('.detail-slash').onclick = closeDetail;
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if ($('#checkout').open) $('#checkout').close(); else closeDetail(); });

function setPrice(value, label = '가격 (후불)', text) {
  state.draft.price = value;
  const b = $('#detail-price'); $('#detail-price-label').textContent = label;
  $('#detail-won').textContent = text ? '' : won(value);
  b._tw?.kill(); // 앞선 숫자 애니메이션이 늦게 끝나며 옛 가격을 덮어쓰지 않게
  if (text) { b.textContent = text; return; }
  if (window.gsap && !REDUCED) {
    const o = { v: Number(b.dataset.v || 0) };
    b._tw = gsap.to(o, { v: value, duration: .35, ease: 'power2.out', onUpdate: () => { b.textContent = tw(Math.round(o.v / TOOTH) * TOOTH); }, onComplete: () => { b.textContent = tw(value); } });
  } else b.textContent = tw(value);
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
  const knob = el('div', { class: 'tb-knob', role: 'slider', tabindex: '0', 'aria-valuemin': min, 'aria-valuemax': max, 'aria-label': '작업 시간' });
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
  body.append(bar, el('p', { class: 'tb-hint', text: matchMedia('(pointer: coarse)').matches ? '끌어서 시간 정하기' : '끌어서 시간 정하기 · 손잡이를 누른 뒤 키보드 ←/→도 돼요' }));

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
  hours(body) {
    const brk = el('p', { class: 'breakdown' });
    const steps = [...new Set(Object.values(TIN_HOURS))].sort((x, y) => x - y);
    if (steps[steps.length - 1] < 80) steps.push(80);
    timeBar(body, { steps, min: 1, max: 80, scale: 'log', start: state.draft.prev?.hours || 1, fmt: h => h + 'h',
      card: h => { const g = gameAt(h), n = g && TIN_HOURS[g.id];
        return { head: `${h}시간 주문`, title: !g ? '' : n === h ? `딱 이 시간에 만든 게임: 「${g.name}」` : `참고: 「${g.name}」은 ${n}시간 걸렸어요`, desc: g?.blurb, shot: g?.shots?.[0] }; },
      onChange: (h, crossed) => {
        const g = gameAt(h), n = g && TIN_HOURS[g.id];
        const line = !g ? `${h}시간.` : n === h ? `${h}시간이면 「${g.name}」 정도 나와.` : `${h}시간. 「${g.name}」(${n}시간)보다 조금 더 들어가.`;
        if (crossed) say(line); else sayNow(line); // 말풍선이 옛 시간을 붙들고 있지 않게
        state.draft.hours = h;
        brk.innerHTML = `시급 <b>${tw(RATE)}</b> + Claude <b>${tw(AI_RATE)}</b><br>× <b>${h}시간</b> = <b>${tw(h * HOUR)}</b> (${won(h * HOUR)})`;
        updatePrice();
      } });
    body.append(el('div', { class: 'box' }, brk));
    noteField(body, '어떤 게임이었으면 해요?', '장르, 분위기, 참고할 게임, 누구에게 줄 건지…');
  },
  web(body) {
    const at = h => WEB_STEPS.find(s => s.h === h) || WEB_STEPS[0];
    timeBar(body, { steps: WEB_STEPS.map(s => s.h), min: .5, max: 6, scale: 'lin', start: state.draft.prev?.hours || .5, fmt: h => h < 1 ? '30m' : h + 'h',
      card: h => { const s = at(h); return { head: h < 1 ? '30분' : `${h}시간`, title: s.title, desc: s.desc }; },
      onChange: (h, crossed) => {
        const s = at(h);
        if (crossed) say(`${s.title}! ${tw(s.p)}.`);
        state.draft.hours = h; state.draft.webPrice = s.p; updatePrice();
      } });
    noteField(body, '무슨 사이트?', '목적, 들어갈 내용, 참고 사이트…');
  },
  read(body) {
    state.draft.tier = was(READ_TIERS) || READ_TIERS[1];
    body.append(el('div', { class: 'box' }, [el('h3', { text: '연기 등급' }), chips(READ_TIERS.map(t => ({ ...t, sub: `천 자에 이빨 ${t.rate}개 · ${t.sub}` })), state.draft.tier.id, t => { state.draft.tier = t; updatePrice(); })]));
    const count = el('b', { text: '0' });
    const t = noteField(body, '읽을 글', '여기에 붙여 넣으면 글자 수를 세요');
    const recount = () => { state.draft.chars = [...t.value].filter(c => c !== '\n' && c !== '\r').length; count.textContent = state.draft.chars.toLocaleString(); updatePrice(); };
    t.addEventListener('input', recount);
    body.append(el('p', { class: 'note' }, ['띄어쓰기 포함 ', count, '자 · 최소 이빨 1개 · 아직 시범가예요']));
    state.draft.chars = 0; if (t.value) recount();
  },
  qty(body, it) {
    state.draft.qty = state.draft.prev ? Math.max(1, Math.round(state.draft.prev.price / it.price)) : 1;
    const n = el('b', { text: String(state.draft.qty) });
    const step = d => { state.draft.qty = Math.max(1, Math.min(99, state.draft.qty + d)); n.textContent = state.draft.qty; updatePrice();
      if (window.gsap && !REDUCED) gsap.fromTo(n, { y: d > 0 ? -10 : 10 }, { y: 0, duration: .25, ease: 'back.out(3)' }); };
    body.append(el('div', { class: 'box' }, [el('h3', { text: '개수' }), el('div', { class: 'stepper' }, [
      el('button', { 'aria-label': '하나 빼기', text: '−', onclick: () => step(-1) }), n, el('button', { 'aria-label': '하나 더', text: '+', onclick: () => step(1) }),
      el('span', { class: 'lbl', text: `${tw(it.price)} / ${it.unit}` })])]));
    noteField(body, it.field);
  },
  text(body, it) { noteField(body, it.field); },
  partner(body, it) {
    const player = el('div', { class: 'player' });
    body.append(el('div', { class: 'box' }, [el('h3', { text: '내가 만든 것들' }),
      chips(CARTS.map(c => ({ id: c.id, name: c.name, sub: '눌러서 해 보기' })), null, o => playCart(CARTS.find(c => c.id === o.id), player)), player]));
    noteField(body, it.field, 'itch.io 링크, .p8 파일 위치, 무슨 게임인지');
  },
  pwyw(body) {
    state.draft.amount = state.draft.prev?.price || 0;
    const input = el('input', { type: 'number', min: '0', step: '500', value: String(state.draft.amount), 'aria-label': '직접 입력', oninput: e => { state.draft.amount = Math.max(0, Number(e.target.value) || 0); e.target.closest('.box').querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(Number(c.dataset.v) === state.draft.amount))); updatePrice(); } });
    body.append(el('div', { class: 'box' }, [el('h3', { text: '얼마 낼래요?' }),
      chips([0, 1000, 5000, 10000, 30000].map(v => ({ id: v, name: tw(v), sub: v ? (v >= 10000 ? '감동받음' : '고마워요') : '일단 들어 볼게' })), state.draft.amount,
        o => { state.draft.amount = o.id; input.value = o.id; updatePrice(); }),
      el('p', { class: 'note', style: 'margin:10px 0 6px', text: '직접 입력' }), input]));
    noteField(body, '물어볼 것', '고민, 자동화하고 싶은 업무, 무엇이든');
  },
  dm(body) {
    body.append(el('div', { class: 'box' }, [el('h3', { text: '무료 조건' }), el('p', { style: 'margin:0', id: 'dm-free' })]),
      el('div', { class: 'box' }, [el('h3', { text: '열리면 이렇게 돼요' }), el('p', { style: 'margin:0;white-space:pre-line', text:
        'ss0에게 DM으로 그냥 말 걸면 대화가 돼요. 횟수 제한은 없어요.\n명령어·버튼·제어판은 못 써요. 대화만 돼요.\n열리기 전에 DM을 보내면 "해금된 분만 이용할 수 있어요"라고 답해요.' })]));
  },
  quote(body) {
    state.draft.kindSel = was(FEAT_KINDS) || FEAT_KINDS[0];
    body.append(el('div', { class: 'box' }, [el('h3', { text: '어떤 종류?' }), chips(FEAT_KINDS, state.draft.kindSel.id, k => { state.draft.kindSel = k; })]));
    noteField(body, '원하는 기능 설명', '예) /별명 치면 서버 밈으로 랜덤 칭호 붙여 주기');
    body.append(el('p', { class: 'note', text: '담으면 0원(견적 대기)으로 들어가고, 이놀아안이 검토해서 가격을 정해 답장해요.' }));
  },
  bot(body) {
    state.draft.tier = was(BOT_TIERS) || BOT_TIERS[0];
    body.append(el('div', { class: 'box' }, [el('h3', { text: '봇 크기' }),
      chips(BOT_TIERS.map(t => ({ ...t, sub: `${tw(t.build)} + 월 ${tw(t.month)} · ${t.sub}` })), state.draft.tier.id, t => { state.draft.tier = t; updatePrice(); })]));
    noteField(body, '어떤 봇?', '서버, 하고 싶은 일, 참고할 봇…');
    body.append(el('p', { class: 'note', text: '월 유지비에는 서버비와 고장 수리가 들어 있어요. 끊으면 봇도 쉬어요.' }));
  },
};
const otherInCart = () => state.cart.some(c => c.item.id !== 'dm');
const PRICE = {
  hours: (it, d) => setPrice((d.hours || 1) * HOUR),
  web: (it, d) => setPrice(d.webPrice || 10000),
  read: (it, d) => setPrice(d.chars ? Math.max(1000, d.chars * d.tier.rate) : 0, `${d.tier.name} · 천 자에 이빨 ${d.tier.rate}개`),
  qty: (it, d) => setPrice(it.price * d.qty),
  text: (it, d) => setPrice(it.price),
  partner: () => setPrice(0, '도전장', '이빨 0개'),
  pwyw: (it, d) => setPrice(d.amount, '주고 싶은 만큼'),
  dm: (it, d) => { const free = otherInCart(); const p = $('#dm-free');
    if (p) p.textContent = free ? '장바구니에 다른 상품이 있어서 무료예요!' : '다른 상품을 하나라도 담으면 무료가 돼요.';
    setPrice(free ? 0 : 5000, free ? '무료 해금' : '가격 (후불)'); },
  quote: () => setPrice(0, '이놀아안 검토 후 가격 책정', '견적 대기'),
  bot: (it, d) => setPrice(d.tier.build, `제작비 (월 ${tw(d.tier.month)} 별도)`),
};
function summary(it, d) {
  switch (it.kind) {
    case 'hours': return `${d.hours}시간`;
    case 'web': return d.hours < 1 ? '30분' : `${d.hours}시간`;
    case 'read': return `${d.tier.name} · ${(d.chars || 0).toLocaleString()}자`;
    case 'qty': return `${d.qty}${it.unit}`;
    case 'pwyw': return '자율';
    case 'partner': return '도전장';
    case 'quote': return d.kindSel.name;
    case 'bot': return `${d.tier.name} · 월 ${won(d.tier.month)}`;
    default: return '';
  }
}

$('#detail-buy').onclick = e => {
  if (!state.item || state.closing) return;
  state.draft.flush?.();
  const it = state.item, d = state.draft;
  if (it.id === 'dm' && !state.editing && state.cart.some(c => c.item.id === 'dm')) { say('DM 해금은 이미 담겨 있어!'); closeDetail(); return; }
  if (it.kind === 'read' && !d.chars) { say('읽을 글을 먼저 붙여 넣어 줘!'); wiggle($('#detail-body textarea')); return; }
  if ((it.kind === 'quote' || it.kind === 'text' || it.kind === 'partner') && !d.note.trim()) { say('뭘 원하는지 한 줄이라도 적어 줘!'); wiggle($('#detail-body textarea')); return; }
  const entry = { item: it, price: d.price, sum: summary(it, d), note: d.note.trim(), hours: d.hours, monthly: it.kind === 'bot' ? d.tier.month : 0 };
  if (state.editing && state.cart.includes(state.editing)) {
    Object.assign(state.editing, entry); say('수정했어. 주문서에 반영했어.');
  }
  else { state.cart.push({ key: ++seq, ...entry }); say(babble('added', LINES.added[seq % LINES.added.length])); face('happy', 2200); }
  flyCoin(e.currentTarget);
  renderCart();
  closeDetail();
};
function flyCoin(from) {
  if (!window.gsap || REDUCED) return;
  const a = from.getBoundingClientRect(), b = $('#btn-order').getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const c = img('tooth', 'fly'); c.loading = 'eager'; document.body.append(c); // 이빨이 날아간다
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
  if ($('#checkout').open) { if (state.cart.length) renderOrder(); else { $('#checkout').close(); say('장바구니를 비웠어. 다시 골라 봐!'); } }
  toast(`${c.item.name}${c.sum ? ` ${c.sum}` : ''} 뺐어요`, '되돌리기', () => { state.cart.splice(Math.min(at, state.cart.length), 0, c); renderCart(); if ($('#checkout').open) renderOrder(); say('되돌렸어.'); });
}
function renderCart() {
  const list = $('#cart-list'); list.replaceChildren();
  if (!state.cart.length) list.append(el('li', { class: 'cart-empty', style: 'border:0;background:none', text: '비어 있어요. 마음에 드는 걸 골라 봐요!' }));
  for (const c of state.cart) list.append(el('li', {}, [
    el('button', { class: 'cart-open', title: c.item.kind === 'dm' ? '주문서 보기' : '수정', onclick: () => c.item.kind === 'dm' ? openOrder() : openDetail(c.item, c) }, [c.item.name, c.sum ? el('small', { text: ` ${c.sum}` }) : null,
      el('small', { text: ` ${c.item.kind === 'quote' ? '견적' : tw(priced(c))}` })]),
    el('button', { 'aria-label': `${c.item.name} 빼기`, text: '✕', onclick: () => removeFromCart(c) })]));
  const total = state.cart.reduce((s, c) => s + priced(c), 0);
  $('#cart-total').textContent = tw(total); $('#cart-won').textContent = won(total);
  $('#btn-order').disabled = !state.cart.length;
  $('#btn-order').textContent = state.cart.length ? `주문하기 (${state.cart.length})` : '주문하기';
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
  const lines = [`[봉봉봉 주문서] ${code}`, ''];
  state.cart.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.item.name}${c.sum ? ` (${c.sum})` : ''}: ${c.item.kind === 'quote' ? '견적 요청' : won(priced(c))}`);
    if (c.note) lines.push('   └ ' + c.note.replace(/\n+/g, ' / '));
  });
  lines.push('', `합계: ${won(total)}` + (monthly ? ` (+ 월 ${won(monthly)})` : '') + ' · 결제는 결과물 받은 뒤(후불)');
  if (state.cart.some(c => c.item.kind === 'quote')) lines.push('※ 견적 상품은 검토 후 가격을 알려 주세요.');
  return lines.join('\n');
}
function orderReady() {
  if (!dmUserValue()) return '디스코드 이름을 적으면 보낼 수 있어요.';
  return '';
}
function refreshOrder() {
  const why = orderReady(), btn = $('#send-order');
  if (!btn.dataset.sent) { btn.disabled = !!why; $('#send-result').textContent = why; }
}
function renderOrder() {
  const ul = $('#order-items'); ul.replaceChildren();
  for (const c of state.cart) {
    const note = c.item.kind === 'dm' ? null : el('textarea', { rows: 2, placeholder: '요청 사항 (수정할 수 있어요)', oninput: e => { c.note = e.target.value; saveCart(); } });
    if (note) note.value = c.note;
    ul.append(el('li', {}, [
      el('div', { class: 'oi-head' }, [el('b', { text: c.item.name }), c.sum ? el('span', { text: c.sum }) : null,
        el('span', { class: 'oi-price', text: c.item.kind === 'quote' ? '견적' : tw(priced(c)) }),
        c.item.kind === 'dm' ? null : el('button', { type: 'button', class: 'oi-del', text: '수정', onclick: () => { $('#checkout').close(); openDetail(c.item, c); state.backToOrder = true; } }),
        el('button', { type: 'button', class: 'oi-del', 'aria-label': `${c.item.name} 빼기`, text: '빼기', onclick: () => removeFromCart(c) })]),
      note]));
  }
  const total = state.cart.reduce((s, c) => s + priced(c), 0), monthly = state.cart.reduce((s, c) => s + c.monthly, 0);
  $('#order-total').textContent = `합계 ${tw(total)} = ${won(total)}` + (monthly ? ` + 월 ${tw(monthly)}(${won(monthly)})` : '') + ' (후불)';
  refreshOrder();
}
function openOrder() {
  if (!state.cart.length) { say('장바구니가 비어 있어. 먼저 하나 골라 봐!'); wiggle($('#btn-order')); return; }
  const dlg = $('#checkout');
  if (!dlg.open) {
    $('#order-code').textContent = orderCode();
    if (!$('#dm-user').value) try { $('#dm-user').value = localStorage.getItem(DMUSER_KEY) || ''; } catch {}
    $('#order-edit').inert = false; $('#dm-user').disabled = false;
    const btn = $('#send-order'); delete btn.dataset.sent; btn.textContent = '디스코드로 주문 보내기';
    $('#send-fail').hidden = true;
    dlg.showModal();
    dlg.scrollTop = 0;
    say(babble('order', LINES.order));
    if (window.gsap && !REDUCED) gsap.fromTo('.checkout-inner', { yPercent: -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .6, ease: 'bounce.out' });
  }
  renderOrder();
}
$('#btn-order').onclick = openOrder;
$('#checkout-close').onclick = () => $('#checkout').close();
// 주문서 바깥(어두운 곳)을 누르면 닫힌다
$('#checkout').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
$('#order-more').onclick = () => { $('#checkout').close(); say('더 골라 봐. 담은 건 장바구니에 그대로 있어.'); };
$('#dm-user').oninput = () => { try { localStorage.setItem(DMUSER_KEY, $('#dm-user').value.trim()); } catch {} refreshOrder(); };
// 포럼 채널 웹후크로 주문마다 스레드를 하나 연다. 그 스레드가 손님과 조율하는 자리다.
$('#send-order').onclick = async () => {
  const out = $('#send-result'), why = orderReady();
  if (why) { out.textContent = why; return; }
  const dmUser = dmUserValue();
  const code = $('#order-code').textContent;
  const first = state.cart[0], title = `${code} · ${first.item.name}${state.cart.length > 1 ? ` 외 ${state.cart.length - 1}` : ''}`;
  const btn = $('#send-order'); btn.disabled = true; out.textContent = '보내는 중…';
  try {
    const r = await fetch(DISCORD.webhook + '?wait=true', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      username: '봉봉봉', thread_name: title.slice(0, 100), allowed_mentions: { parse: [] },
      content: `디스코드 사용자명: ${dmUser}\n\`\`\`\n${orderBody(code)}\n\`\`\``.slice(0, 2000) }) });
    if (!r.ok) throw new Error(r.status);
    btn.dataset.sent = '1'; btn.textContent = '보냈어요 ✓';
    $('#order-edit').inert = true; $('#dm-user').disabled = true;
    out.textContent = `주문이 들어갔어요! 이놀아안이 "${dmUser}"님을 찾아 DM 줄게요. 거기서 같이 조율해요.`;
    say('주문 들어왔다! DM으로 연락할게.');
    state.cart = []; renderCart(); newOrderCode();
  } catch {
    btn.disabled = false;
    out.textContent = '보내기에 실패했어요.';
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
const FX_FILES = new Set([]);
const has = k => Promise.resolve(FX_FILES.has(k));
const FX = {};
// 상품을 열 때 입이 쾅 다물렸다 열린다
function chompThen(go) {
  if (!FX.jaw || REDUCED || !window.gsap) return go();
  const top = img('jaw_top', 'jaw jaw-top'), bot = img('jaw_bottom', 'jaw jaw-bot');
  top.loading = bot.loading = 'eager'; document.body.append(top, bot);
  gsap.timeline({ onComplete: () => { top.remove(); bot.remove(); } })
    .fromTo(top, { yPercent: -100 }, { yPercent: 0, duration: .22, ease: 'power3.in' })
    .fromTo(bot, { yPercent: 100 }, { yPercent: 0, duration: .22, ease: 'power3.in' }, '<')
    .to('body', { x: 6, duration: .04, yoyo: true, repeat: 3 })
    .add(go)
    .to(top, { yPercent: -100, duration: .45, ease: 'expo.out' }, '+=.05')
    .to(bot, { yPercent: 100, duration: .45, ease: 'expo.out' }, '<')
    .set('body', { x: 0 });
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
// 두꺼비가 가끔 눈을 깜빡이고, 오래 가만있으면 존다
function blink() {
  const idle = keeper.querySelector('[data-face=idle]');
  if (idle && !idle.hidden) { face('blink', 140); }
  setTimeout(blink, 2200 + Math.random() * 3500);
}
(async () => {
  if (REDUCED || !window.gsap) return;
  const [jaw, dr, mo, bl, sl] = await Promise.all(['jaw_top', 'drool_1', 'mote_1', 'keeper_blink', 'keeper_sleep'].map(has));
  FX.jaw = jaw && await has('jaw_bottom');
  if (dr) setTimeout(drool, 1500);
  if (mo) motes();
  for (const [ok, f] of [[bl, 'blink'], [sl, 'sleep']]) if (ok) { const i = el('img', { src: IMG(`keeper_${f}`), alt: '', 'data-face': f }); i.hidden = true; keeper.append(i); }
  if (bl) setTimeout(blink, 2000);
  if (sl) { let t; const nap = () => { clearTimeout(t); t = setTimeout(() => { if (!$('#checkout').open) face('sleep'); }, 40000); }; ['pointermove', 'keydown', 'scroll'].forEach(e => addEventListener(e, () => { if (!keeper.querySelector('[data-face=sleep]').hidden) face('idle'); nap(); }, { passive: true })); nap(); }
})();

/* ── 시작 ── */
loadCart(); renderRail(); renderShelf(); renderExtras(); renderCart();
setTimeout(() => say(babble('hello', LINES.hello)), 600); poke();
if (window.gsap && !REDUCED) {
  gsap.from('.sign', { y: -120, rotate: -12, duration: .9, ease: 'bounce.out' });
  gsap.from('.counter', { x: -60, opacity: 0, duration: .5, delay: .3 });
  gsap.from('.cartbar', { yPercent: 100, duration: .5, delay: .4, ease: 'expo.out' });
}
// 마우스를 따라 입 속이 살짝 출렁인다. 벽은 멀리, 주인은 가까이 있어서 반대로 움직인다
if (window.gsap && !REDUCED && matchMedia('(pointer: fine)').matches) {
  const q = (t, p) => gsap.quickTo(t, p, { duration: .9, ease: 'power3.out' });
  const bx = q('.scene', 'x'), by = q('.scene', 'y'), kx = q('#keeper', 'x'), gx = q('.sign', 'x');
  addEventListener('pointermove', e => { const mx = e.clientX / innerWidth - .5, my = e.clientY / innerHeight - .5; bx(-mx * 22); by(-my * 14); kx(mx * 10); gx(mx * 6); }, { passive: true });
}
})();
