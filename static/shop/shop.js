/* 봉봉봉 — 상점 화면 전부. 가격·상품은 ITEMS, TIN 게임 시간은 TIN_HOURS만 고치면 된다. */
(() => {
'use strict';

const RATE = 20000, AI_RATE = 5000, HOUR = RATE + AI_RATE;
/* 주문을 받을 디스코드 포럼 채널의 웹후크 주소. 비어 있으면 "복사 → DM"으로만 받는다. */
const DISCORD = { webhook: 'https://discord.com/api/webhooks/1564973701697507438/F-r_V9ZolGjywsiOHrfTN3xceXLt4WQWqPn-IjKzQMYLayQOe9R3kWP5OcMqx8qYHpbY', guild: '1107558929652777011' };

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
const TIN_HOURS = {};

/* ── 그림 (SVG) ── */
const SVG = (inner, vb = 64) => `<svg viewBox="0 0 ${vb} ${vb}" fill="none" stroke="#1b1534" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${inner}</svg>`;
const gearTeeth = [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="27" y="4" width="10" height="14" rx="3" fill="#bff5e6" transform="rotate(${a} 32 32)"/>`).join('');
const ICON = {
  game: SVG(`<path d="M15 20h34c7 0 11 5 12 12l2 11c1 7-7 10-11 5l-5-7H17l-5 7c-4 5-12 2-11-5l2-11c1-7 5-12 12-12z" fill="#fff6e0"/><path d="M19 28v12M13 34h12" stroke-width="5"/><circle cx="44" cy="29" r="4" fill="#ff2e4d"/><circle cx="52" cy="37" r="4" fill="#ffc93c"/>`),
  web: SVG(`<rect x="6" y="9" width="52" height="46" rx="8" fill="#fff6e0"/><path d="M6 21h52"/><circle cx="14" cy="15" r="2.5" fill="#ff2e4d" stroke="none"/><circle cx="22" cy="15" r="2.5" fill="#ffc93c" stroke="none"/><rect x="13" y="28" width="18" height="18" rx="4" fill="#4ab8ff"/><path d="M38 30h13M38 37h13M38 44h8"/>`),
  read: SVG(`<path d="M32 16c-6-5-16-6-25-4v38c9-2 19-1 25 4 6-5 16-6 25-4V12c-9-2-19-1-25 4z" fill="#fff6e0"/><path d="M32 16v38"/><path d="M14 24h11M14 31h11M14 38h7M39 24h11M39 31h11M39 38h8" stroke-width="3"/>`),
  song: SVG(`<path d="M24 46V16l28-7v31M24 24l28-7"/><ellipse cx="17" cy="47" rx="8" ry="6.5" fill="#ffc93c"/><ellipse cx="45" cy="41" rx="8" ry="6.5" fill="#ffc93c"/>`),
  oracle: SVG(`<path d="M18 54h28l-4-9H22z" fill="#ffc93c"/><circle cx="32" cy="27" r="18" fill="#a995ff"/><path d="M23 20a10 10 0 0 1 8-6" stroke="#fff" stroke-width="4"/><path d="M39 26l2.5 4.5L46 33l-4.5 2.5L39 40l-2.5-4.5L32 33l4.5-2.5z" fill="#fff" stroke-width="2.5"/>`),
  research: SVG(`<path d="M38 38l15 15" stroke-width="10"/><path d="M39 39l13 13" stroke="#ffc93c" stroke-width="4"/><circle cx="27" cy="27" r="16" fill="#bfe6ff"/><path d="M19 22a9 9 0 0 1 7-6" stroke="#fff" stroke-width="3.5"/>`),
  x: SVG(`<rect x="8" y="8" width="48" height="48" rx="12" fill="#1b1534"/><path d="M21 19l22 26M43 19L21 45" stroke="#fff" stroke-width="5"/>`),
  key: SVG(`<path d="M30 32h24M46 32v9M53 32v6" stroke-width="6"/><circle cx="20" cy="32" r="12" fill="#ffc93c"/><circle cx="20" cy="32" r="4" fill="#fff6e0"/>`),
  bot: SVG(`<path d="M32 9v8"/><circle cx="32" cy="8" r="4" fill="#ff2e4d"/><path d="M10 33H5M59 33h-5"/><rect x="10" y="17" width="44" height="34" rx="13" fill="#bff5e6"/><rect x="17" y="25" width="30" height="16" rx="8" fill="#1b1534"/><circle cx="26" cy="33" r="3.5" fill="#2fe0b0" stroke="none"/><circle cx="38" cy="33" r="3.5" fill="#2fe0b0" stroke="none"/>`),
  gear: SVG(`${gearTeeth}<circle cx="32" cy="32" r="17" fill="#bff5e6"/><circle cx="32" cy="32" r="6" fill="#fff6e0"/>`),
  face: SVG(`<rect x="10" y="7" width="44" height="50" rx="9" fill="#ffd1ea"/><path d="M17 55c2-9 8-14 15-14s13 5 15 14" fill="#fff6e0"/><circle cx="32" cy="27" r="10" fill="#fff6e0"/>`),
  gift: SVG(`<rect x="10" y="27" width="44" height="28" rx="4" fill="#ff7a8f"/><rect x="7" y="19" width="50" height="10" rx="3" fill="#ff2e4d"/><rect x="28" y="19" width="8" height="36" fill="#ffc93c" stroke-width="3"/><path d="M32 19c-5-10-16-9-13-2 2 3 8 2 13 2zM32 19c5-10 16-9 13-2-2 3-8 2-13 2z" fill="#ffc93c" stroke-width="3"/>`),
  dice: SVG(`<rect x="9" y="9" width="46" height="46" rx="11" fill="#fff6e0"/>${[[21, 21], [43, 21], [32, 32], [21, 43], [43, 43]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#1b1534" stroke="none"/>`).join('')}`),
};
const KEEPER_SVG = SVG(`
  <path d="M36 44C26 16 30 4 41 6s13 18 11 36" fill="#fff"/><path d="M40 36c-4-14-2-22 2-22s6 10 5 21" fill="#ffb3d1" stroke="none"/>
  <path d="M84 44C94 16 90 4 79 6s-13 18-11 36" fill="#fff"/><path d="M80 36c4-14 2-22-2-22s-6 10-5 21" fill="#ffb3d1" stroke="none"/>
  <ellipse cx="60" cy="74" rx="45" ry="38" fill="#fff"/>
  <path d="M19 57c27-11 55-11 82 0l-2 11c-26-10-52-10-78 0z" fill="#ff2e4d"/>
  <path d="M100 58l12-6-3 12zM100 62l11 8-12 2z" fill="#ff2e4d" stroke-width="3"/>
  <g class="k-eyes"><ellipse cx="45" cy="80" rx="5" ry="7" fill="#1b1534" stroke="none"/><ellipse cx="75" cy="80" rx="5" ry="7" fill="#1b1534" stroke="none"/><circle cx="47" cy="77" r="2" fill="#fff" stroke="none"/><circle cx="77" cy="77" r="2" fill="#fff" stroke="none"/></g>
  <ellipse cx="33" cy="91" rx="7" ry="4" fill="#ffb3d1" stroke="none"/><ellipse cx="87" cy="91" rx="7" ry="4" fill="#ffb3d1" stroke="none"/>
  <path class="k-mouth" d="M53 90q3.5 4 7 0q3.5 4 7 0" stroke-width="3"/>
  <circle cx="60" cy="106" r="7" fill="#ffc93c" stroke-width="3"/>`, 120);

/* ── 상품 ── */
const CATS = [
  { id: 'make', name: '제작소', sub: '게임·웹사이트·봇' },
  { id: 'voice', name: '목소리', sub: '낭독·노래' },
  { id: 'brain', name: '머리 빌리기', sub: '신탁·조사·대행' },
  { id: 'ss0', name: 'ss0 봇', sub: '해금·기능 추가' },
  { id: 'soon', name: '입고 예정', sub: '곧 들어와요' },
  { id: 'hall', name: '명예의 전당', sub: '후원해 주신 분' },
];
const ITEMS = [
  { id: 'game', cat: 'make', icon: 'game', c: '#7a5cff', name: '게임 제작', sub: '시간을 끌어서 퀄리티를 골라요', badge: ['간판', 'hot'],
    priceText: '25,000원/시간~', kind: 'hours',
    desc: '드래그로 작업 시간을 정하면 그만큼의 게임이 나와요.\n단계를 넘을 때마다 실제로 그 시간 들여 만든 게임을 보여 드려요.',
    line: '시간 막대를 오른쪽으로 끌어 봐! 단계 넘을 때마다 잠깐 멈출 거야.' },
  { id: 'web', cat: 'make', icon: 'web', c: '#4ab8ff', name: '웹사이트', sub: '최대 6시간 · 1만~10만', priceText: '10,000원~', kind: 'web',
    desc: '기념일 페이지, 소개 페이지, 작은 도구 사이트.\n6시간 안에 끝나는 크기만 받아요.',
    line: '웹사이트는 6시간까지만! 그 이상은 게임 제작처럼 시간으로 계산해.' },
  { id: 'bot', cat: 'make', icon: 'bot', c: '#2fe0b0', name: '새 디스코드 봇', sub: '제작 + 서버비 포함 월 유지', priceText: '30,000원~', kind: 'bot',
    desc: '처음부터 우리 서버 전용 봇을 만들어요.\n제작비는 완성 후에 한 번, 서버비를 포함한 월 유지비는 매달 먼저.',
    line: '봇은 만들고 끝이 아니야. 서버비랑 고장 수리까지 월 유지비에 들어 있어.' },
  { id: 'read', cat: 'voice', icon: 'read', c: '#ff7ac0', name: '글 읽어주기', sub: '띄어쓰기 포함 글자당', priceText: '글자당 10~50원', kind: 'read', badge: ['시범가'],
    desc: '보내 준 글을 제 목소리로 읽어 녹음해 드려요.\n띄어쓰기 포함 글자 수로 계산해요. 최소 1,000원.',
    line: '글을 붙여 넣으면 글자 수를 바로 세 줄게. 연기 등급도 골라 봐.' },
  { id: 'song', cat: 'voice', icon: 'song', c: '#ffc93c', name: '노래 1곡', sub: '불러 드려요', priceText: '2,000원', kind: 'qty', price: 2000, unit: '곡',
    desc: '듣고 싶은 노래를 불러서 녹음해 드려요.', field: '곡 제목 / 가수', line: '노래는 한 곡에 2,000원. 여러 곡이면 개수를 올려.' },
  { id: 'oracle', cat: 'brain', icon: 'oracle', c: '#7a5cff', name: '신탁', sub: '개인 고민 ~ 업무 자동화', priceText: '주고 싶은 만큼', kind: 'pwyw', badge: ['자율', 'free'],
    desc: '개인 고민부터 회사 특정 업무 자동화까지 물어보세요.\n값은 답을 듣고 주고 싶은 만큼. 0원도 돼요.',
    line: '신탁은 값이 없어. 들어 보고 마음에 들면 그때 내.' },
  { id: 'research', cat: 'brain', icon: 'research', c: '#4ab8ff', name: '개빡센 조사', sub: '무지막지하게 마이너해도 OK', priceText: '10,000원', kind: 'text', price: 10000,
    desc: 'AI한테 물어도 안 나오는 걸 끝까지 파서 정리해 드려요.\n마이너할수록 좋아요.', field: '무엇을 조사할까요?',
    line: 'AI보다 내가 더 잘 파. 진짜 마이너한 거 들고 와 봐.' },
  { id: 'xpost', cat: 'brain', icon: 'x', c: '#ffffff', name: 'X 대리 포스트', sub: '제 X에 대신 올려요', priceText: '1,000원', kind: 'qty', price: 1000, unit: '개',
    desc: '하고 싶은 말을 제 X 계정에 대신 올려 드려요.\n(올리기 전에 제가 한 번 읽어요.)', field: '올릴 내용',
    line: '내 X에 네 말을 올려 줄게. 이상한 건 안 올려 줌.' },
  { id: 'dm', cat: 'ss0', icon: 'key', c: '#ffc93c', name: 'ss0 DM 해금', sub: '다른 상품 사면 공짜', priceText: '5,000원', kind: 'dm',
    desc: 'ss0 봇과 1:1 DM으로 대화할 수 있게 열어 드려요.\n장바구니에 다른 상품이 하나라도 있으면 무료.\n입금이 확인되면 이놀아안이 직접 열어 줘서, 열릴 때까지 시간이 걸릴 수 있어요.',
    line: '다른 거 하나만 사도 DM은 공짜로 열어 줘.' },
  { id: 'ss0feat', cat: 'ss0', icon: 'gear', c: '#2fe0b0', name: 'ss0 기능 추가', sub: '이놀아안이 검토 후 가격 책정', priceText: '견적', kind: 'quote',
    desc: 'ss0에 갖고 싶은 기능을 주문하세요.\n종류를 고르고 설명을 적으면, 제가 검토해서 가격을 정해 답장해요.',
    line: '기능마다 품이 달라서 내가 보고 값을 매겨. 일단 적어서 줘!' },
  { id: 'partner', cat: 'make', icon: 'game', c: '#ff7ac0', name: '동업자 되기', sub: 'PICO-8로 뭐라도 만들어 와', priceText: '0원 · 도전', kind: 'partner', badge: ['모집'],
    desc: '내 사업시도의 동료가 되고 싶다면, PICO-8 독학해서 뭐라도 작동하는 거 하나 가져와요. 검토해 줄게요.\n아래는 제가 PICO-8로 만든 것들이에요. 이 정도면 충분해요.',
    field: '만든 게임 링크나 설명', line: 'PICO-8로 하나 만들어 와. 내 것도 해 보고 가.' },
  { id: 'pix', cat: 'soon', icon: 'face', c: '#ff7ac0', name: '픽셀 프로필', sub: '디코 프사·이모티콘', soon: true },
  { id: 'giftgame', cat: 'soon', icon: 'gift', c: '#ff2e4d', name: '선물 게임', sub: '생일·기념일용 한 판짜리', soon: true },
  { id: 'aisetup', cat: 'soon', icon: 'gear', c: '#4ab8ff', name: 'AI 작업환경 세팅', sub: '내 컴퓨터에 클로드코드 깔고 길들이기', soon: true },
  { id: 'playtest', cat: 'soon', icon: 'game', c: '#7a5cff', name: '플레이테스트', sub: '버그·재미 리포트', soon: true },
  { id: 'trpg', cat: 'soon', icon: 'dice', c: '#ffc93c', name: 'TRPG 캐릭터 패키지', sub: '과거사·능력·시트', soon: true },
  { id: 'theme', cat: 'soon', icon: 'song', c: '#2fe0b0', name: '개인 등장 테마', sub: '8비트 BGM 루프', soon: true },
];
const GAME_TIERS = [
  { h: 1, rank: 'TIER 1', title: '한 화면 장난감', desc: '조작 하나, 반응 하나. "오 움직인다"까지.', stats: [1, 1, 0, 1] },
  { h: 3, rank: 'TIER 2', title: '규칙 하나 도는 미니게임', desc: '이기고 지는 조건이 있고, 점수가 올라가요.', stats: [2, 2, 1, 1] },
  { h: 8, rank: 'TIER 3', title: '시작부터 끝까지 한 판', desc: '타이틀 → 플레이 → 결과 화면. 친구한테 보내 볼 만해요.', stats: [3, 2, 2, 2] },
  { h: 20, rank: 'TIER 4', title: '다듬은 데모', desc: '소리·연출·손맛을 넣어요. 만지면 기분 좋은 단계.', stats: [3, 4, 3, 3] },
  { h: 40, rank: 'TIER 5', title: '여러 스테이지 데모', desc: '콘텐츠가 쌓이고, 저장·설정·튜토리얼이 붙어요.', stats: [4, 4, 4, 4] },
  { h: 80, rank: 'TIER 6', title: '공개 가능한 한 조각', desc: '스토어에 올려 볼 만한 수직 슬라이스.', stats: [5, 5, 5, 5] },
];
const STAT_NAMES = ['조작감', '연출', '분량', '완성도'];
const WEB_STEPS = [
  { h: .5, p: 10000, title: '한 장짜리', desc: '사진 몇 장과 글이 들어간 한 페이지.' },
  { h: 1, p: 20000, title: '꾸민 한 장', desc: '움직이는 장식, 음악, 숨은 버튼 하나.' },
  { h: 2, p: 35000, title: '여러 장', desc: '메뉴가 있고 페이지가 3~4개.' },
  { h: 3, p: 50000, title: '놀거리 있는 사이트', desc: '퀴즈·방명록 같은 작은 기능 하나.' },
  { h: 4, p: 65000, title: '작은 도구', desc: '입력하면 계산·변환해 주는 사이트.' },
  { h: 5, p: 80000, title: '이벤트 사이트', desc: '기념일·행사용, 연출 듬뿍.' },
  { h: 6, p: 100000, title: '최대치', desc: '6시간 꽉 채운 사이트. 그 이상은 견적.' },
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
  hello: '어서오십쇼! 봉봉봉이야. 시키는 거 다 해 줌. 단, 돈은 받아.',
  make: '제작소야. 게임은 시간 막대를 끌어서 사는 거야.',
  voice: '목소리 코너. 내 목소리 공짜 아니다.',
  brain: '머리 빌리는 곳. 신탁은 값을 네가 정해.',
  ss0: 'ss0 봇 코너. DM 해금은 뭐든 하나 사면 공짜!',
  soon: '아직 준비 중인 물건들. 먼저 찜하고 싶으면 DM 줘.',
  hall: '여기 이름 올라간 사람들은 평생 단골이야.',
  added: ['담았다! 더 볼래?', '좋은 선택이야.', '장바구니로 슝~', '그거 진짜 잘 골랐다.'],
  order: '주문서 복사해서 DM으로 보내 줘. 확인하면 바로 답장할게!',
};

/* ── 상태 ── */
const state = { cat: 'make', cart: [], item: null, draft: null };
let seq = 0;

/* ── 주인장 ── */
const keeper = $('#keeper');
keeper.innerHTML = KEEPER_SVG;
if (window.gsap && !REDUCED) {
  gsap.to(keeper, { y: -4, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.timeline({ repeat: -1, repeatDelay: 2.6 }).to('.k-eyes', { scaleY: .1, transformOrigin: '50% 80px', duration: .07 }).to('.k-eyes', { scaleY: 1, duration: .1 });
}
let typeTimer;
function say(text) {
  const p = $('#keeper-line');
  clearInterval(typeTimer);
  if (REDUCED) { p.textContent = text; return; }
  p.textContent = ''; let i = 0;
  typeTimer = setInterval(() => { p.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typeTimer); }, 28);
  if (window.gsap) gsap.fromTo('.k-mouth', { scaleY: 1 }, { scaleY: 2, transformOrigin: '50% 0', duration: .1, yoyo: true, repeat: 5 });
}

/* ── 진열대 ── */
function renderRail() {
  const rail = $('#rail'); rail.replaceChildren();
  rail.setAttribute('role', 'tablist');
  for (const c of CATS) rail.append(el('button', { class: 'tab', role: 'tab', 'aria-selected': String(c.id === state.cat),
    onclick: () => { if (state.cat !== c.id) { state.cat = c.id; renderRail(); renderShelf(); say(LINES[c.id]); } } },
    [c.name, el('small', { text: c.sub })]));
}
function iconEl(key) { return el('div', { class: 'icon', html: ICON[key] }); }
function renderShelf() {
  const shelf = $('#shelf'); const cat = CATS.find(c => c.id === state.cat);
  shelf.replaceChildren(el('div', { class: 'shelf-head' }, [el('h2', { text: cat.name }), el('p', { text: cat.sub })]));
  if (cat.id === 'hall') return renderHall(shelf);
  const grid = el('div', { class: 'grid' });
  for (const it of ITEMS.filter(i => i.cat === cat.id)) {
    const card = el('button', { class: 'card' + (it.soon ? ' soon' : ''), style: `--c:${it.c}`, 'aria-disabled': it.soon ? 'true' : false,
      onclick: () => it.soon ? (say(`${it.name}은(는) 아직 입고 전이야. 곧 들어와!`), wiggle(card)) : openDetail(it) }, [
      it.badge ? el('span', { class: 'badge ' + (it.badge[1] || ''), text: it.badge[0] }) : null,
      it.soon ? el('span', { class: 'stamp', text: '입고 예정' }) : null,
      el('div', { class: 'card-art' }, iconEl(it.icon)),
      el('div', { class: 'card-body' }, [el('div', { class: 'card-name', text: it.name }), el('div', { class: 'card-sub', text: it.sub }),
        it.soon ? null : el('div', { class: 'card-price' }, [el('span', { class: 'coin' }), it.priceText])]),
    ]);
    grid.append(card);
  }
  shelf.append(grid);
  if (window.gsap && !REDUCED) gsap.from(grid.children, { y: 40, opacity: 0, rotate: () => gsap.utils.random(-6, 6), duration: .45, stagger: .06, ease: 'back.out(1.8)' });
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
  player.replaceChildren(frame, el('div', { class: 'player-bar' }, [el('span', { text: `▶ ${c.name}` }), el('span', { text: '방향키 + Z/X' })]));
  player.classList.add('on');
  say(ok ? `${c.name}! 방향키랑 Z, X로 해 봐.` : `${c.name}은(는) 아직 웹용으로 굽는 중이야.`);
  if (window.gsap && !REDUCED) gsap.fromTo(frame, { scaleY: .02, filter: 'brightness(4)' }, { scaleY: 1, filter: 'brightness(1)', duration: .45, ease: 'expo.out' });
}

/* ── 명예의 전당 (supporters.json: [{ name, amount, note }]. All Tomorrow 콘솔의 입금 확인이 갱신) ── */
async function renderHall(shelf) {
  const hall = el('div', { class: 'hall' }); shelf.append(hall);
  let rows = [];
  try { rows = await (await fetch('supporters.json', { cache: 'no-store' })).json(); } catch {}
  if (!rows.length) { hall.append(el('p', { class: 'hall-empty', text: '아직 비어 있어요. 첫 번째 이름이 되어 주세요!' })); return; }
  rows.sort((a, b) => (b.amount || 0) - (a.amount || 0)).forEach((r, i) => hall.append(el('div', { class: 'hall-row' }, [
    el('span', { class: 'rank', text: String(i + 1).padStart(2, '0') }), el('b', { text: r.name }),
    r.note ? el('span', { text: r.note }) : null, el('span', { class: 'amt', text: !r.amount ? '♥' : (r.currency && r.currency !== 'KRW') ? `${r.amount} ${r.currency}` : won(r.amount) })])));
  hall.append(el('a', { class: 'bmc', href: 'https://buymeacoffee.com/innollia', target: '_blank', rel: 'noopener', text: '☕ 커피 한 잔 사 주기' }));
  if (window.gsap && !REDUCED) gsap.from(hall.children, { x: -40, opacity: 0, stagger: .05, duration: .35 });
}

/* ── 상세 패널 ── */
const detail = $('#detail');
function openDetail(it) {
  state.item = it; state.draft = { note: '' };
  $('#detail-cat').textContent = CATS.find(c => c.id === it.cat).name;
  $('#detail-title').textContent = it.name;
  $('#detail-desc').textContent = it.desc;
  detail.style.setProperty('--c', it.c);
  $('#detail-icon').innerHTML = ICON[it.icon];
  const body = $('#detail-body'); body.replaceChildren();
  BUILD[it.kind](body, it);
  const uses = USES[it.id];
  if (uses) {
    const box = el('div', { class: 'box' }, [el('h3', { text: uses.q }),
      body.querySelector('textarea') ? el('p', { class: 'note', style: 'margin:0 0 8px', text: '누르면 아래 칸에 적혀요' }) : null]);
    box.append(chips(uses.ex.map((t, i) => ({ id: i, name: t[0], sub: t[1] })), -1, o => {
      const t = body.querySelector('textarea');
      if (!t) return;
      t.value = uses.ex[o.id][0] + (uses.ex[o.id][1] ? ` — ${uses.ex[o.id][1]}` : ''); t.dispatchEvent(new Event('input'));
    }));
    body.prepend(box);
  }
  updatePrice();
  detail.setAttribute('aria-hidden', 'false');
  say(it.line);
  if (window.gsap && !REDUCED) {
    gsap.fromTo('.detail-slash', { opacity: 0 }, { opacity: 1, duration: .25 });
    gsap.fromTo('.detail-panel', { xPercent: 100, skewX: -8 }, { xPercent: 0, skewX: 0, duration: .5, ease: 'expo.out' });
    gsap.from(body.children, { y: 24, opacity: 0, stagger: .07, delay: .15, duration: .35 });
  }
  setTimeout(() => $('#detail-close').focus(), 50);
}
function closeDetail() {
  if (detail.getAttribute('aria-hidden') === 'true') return;
  const done = () => { detail.setAttribute('aria-hidden', 'true'); state.item = null; };
  if (window.gsap && !REDUCED) gsap.to('.detail-panel', { xPercent: 100, duration: .3, ease: 'power3.in', onComplete: done }); else done();
}
$('#detail-close').onclick = closeDetail;
$('.detail-slash').onclick = closeDetail;
addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

function setPrice(value, label = '가격', text) {
  state.draft.price = value;
  const b = $('#detail-price'); $('#detail-price-label').textContent = label;
  if (text) { b.textContent = text; return; }
  if (window.gsap && !REDUCED) {
    const o = { v: Number(b.dataset.v || 0) };
    gsap.to(o, { v: value, duration: .35, ease: 'power2.out', onUpdate: () => { b.textContent = won(Math.round(o.v)); } });
  } else b.textContent = won(value);
  b.dataset.v = value;
}
function updatePrice() { const it = state.item, d = state.draft; PRICE[it.kind]?.(it, d); }
function noteField(body, label, ph = '') {
  const t = el('textarea', { placeholder: ph, oninput: e => { state.draft.note = e.target.value; } });
  body.append(el('label', { class: 'box' }, [el('h3', { text: label }), t]));
  return t;
}
function chips(options, current, onPick) {
  const wrap = el('div', { class: 'chips' });
  for (const o of options) {
    const b = el('button', { class: 'chip', 'aria-pressed': String(o.id === current), onclick: () => {
      wrap.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); onPick(o);
      if (window.gsap && !REDUCED) gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .3, ease: 'back.out(3)' });
    } }, [o.name, el('small', { text: o.sub })]);
    wrap.append(b);
  }
  return wrap;
}

/* ── 시간 드래그: 단계 경계마다 잠깐 걸렸다가 넘어감 ── */
function timeBar(body, { steps, min, max, scale, fmt, onChange, start }) {
  const toPos = h => scale === 'log' ? Math.log(h / min) / Math.log(max / min) : (h - min) / (max - min);
  const fromPos = p => scale === 'log' ? min * Math.pow(max / min, p) : min + p * (max - min);
  const bar = el('div', { class: 'timebar' });
  const track = el('div', { class: 'tb-track' });
  const fill = el('div', { class: 'tb-fill' });
  const flag = el('div', { class: 'tb-flag' });
  const knob = el('div', { class: 'tb-knob', role: 'slider', tabindex: '0', 'aria-valuemin': min, 'aria-valuemax': max, 'aria-label': '작업 시간' }, flag);
  const marks = steps.map(s => {
    const m = el('div', { class: 'tb-mark', style: `left:${toPos(s) * 100}%` });
    track.append(m, el('span', { class: 'tb-lbl', style: `left:${toPos(s) * 100}%`, text: fmt(s) }));
    return m;
  });
  track.append(fill, knob); bar.append(track);
  body.append(bar, el('p', { class: 'tb-hint', text: '◀ 끌어서 시간 정하기 ▶  (키보드 ←/→)' }));

  let value = start, locked = false, dragging = false;
  const snap = scale === 'log' ? (h => Math.max(min, Math.round(h))) : (h => steps.reduce((a, b) => Math.abs(b - h) < Math.abs(a - h) ? b : a));
  const tierIdx = h => steps.reduce((acc, s, i) => h >= s ? i : acc, 0);
  function place(h, anim) {
    const p = toPos(h) * 100;
    if (anim && window.gsap && !REDUCED) { gsap.to(knob, { left: p + '%', duration: .25, ease: 'back.out(2)' }); gsap.to(fill, { width: p + '%', duration: .25 }); }
    else { knob.style.left = p + '%'; fill.style.width = p + '%'; }
    flag.textContent = fmt(h);
    knob.setAttribute('aria-valuenow', h); knob.setAttribute('aria-valuetext', fmt(h));
    marks.forEach((m, i) => { const on = h >= steps[i]; m.classList.toggle('on', on); m.nextSibling.classList.toggle('on', on); });
  }
  function set(h, anim) {
    h = Math.min(max, Math.max(min, snap(h)));
    const before = tierIdx(value), after = tierIdx(h);
    if (after !== before && !locked) {
      // 단계를 건너면 경계에서 한 번 멈춘다
      const edge = after > before ? steps[before + 1] : steps[before];
      const landing = after > before ? edge : steps[after];
      value = after > before ? landing : h;
      place(value, true);
      onChange(value, true);
      locked = true;
      hitstop(knob, track);
      setTimeout(() => { locked = false; }, REDUCED ? 0 : 420);
      return;
    }
    if (locked) return;
    if (h === value && !anim) return;
    value = h; place(h, anim); onChange(h, false);
  }
  function fromEvent(e) {
    const r = track.getBoundingClientRect();
    return fromPos(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  }
  bar.addEventListener('pointerdown', e => { dragging = true; bar.setPointerCapture(e.pointerId); set(fromEvent(e), true);
    if (window.gsap && !REDUCED) gsap.to(knob, { scale: 1.15, duration: .15 }); });
  bar.addEventListener('pointermove', e => { if (dragging) set(fromEvent(e)); });
  const up = () => { if (!dragging) return; dragging = false; if (window.gsap && !REDUCED) gsap.to(knob, { scale: 1, duration: .25, ease: 'back.out(3)' }); };
  bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
  knob.addEventListener('keydown', e => {
    const i = steps.indexOf(value);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = scale === 'log' ? value + 1 : steps[Math.min(steps.length - 1, i + 1)];
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = scale === 'log' ? value - 1 : steps[Math.max(0, i - 1)];
    if (e.key === 'PageUp') next = steps[Math.min(steps.length - 1, tierIdx(value) + 1)];
    if (e.key === 'PageDown') next = steps[Math.max(0, tierIdx(value) - (value === steps[tierIdx(value)] ? 1 : 0))];
    if (next != null) { e.preventDefault(); locked = false; set(next, true); }
  });
  place(value); onChange(value, false);
}
function hitstop(knob, track) {
  if (!window.gsap || REDUCED) return;
  gsap.timeline()
    .to(knob, { scaleX: 1.35, scaleY: .7, duration: .06 })
    .to(knob, { scaleX: .85, scaleY: 1.2, duration: .08 })
    .to(knob, { scaleX: 1, scaleY: 1, duration: .3, ease: 'elastic.out(1,.35)' });
  gsap.fromTo(track, { x: -5 }, { x: 0, duration: .35, ease: 'elastic.out(1.2,.2)' });
  gsap.fromTo('.detail-panel', { x: 4 }, { x: 0, duration: .25, ease: 'elastic.out(1,.2)' });
}

function tierCard(body) {
  const shot = el('div', { class: 'tier-shot' });
  const rank = el('div', { class: 'tier-rank' }), title = el('div', { class: 'tier-title' }), desc = el('p', { class: 'tier-desc' });
  const games = el('div', { class: 'tier-games' });
  const flash = el('div', { class: 'tier-flash' }), stamp = el('div', { class: 'tier-stamp', text: 'LEVEL UP!' });
  const card = el('div', { class: 'tier' }, [shot, el('div', {}, [rank, title, desc, games]), flash, stamp]);
  body.append(card);
  return { card, shot, rank, title, desc, games, flash, stamp, cur: -1 };
}
function swapTier(tc, idx, data, up) {
  if (tc.cur === idx) return;
  const first = tc.cur === -1; tc.cur = idx;
  const fill = () => {
    tc.rank.textContent = data.rank; tc.title.textContent = data.title; tc.desc.textContent = data.desc;
    tc.games.replaceChildren(...(data.games || []).map(g => el('span', { text: g })));
    if (data.shot) { tc.shot.style.backgroundImage = `url(${data.shot})`; tc.shot.textContent = ''; }
    else { tc.shot.style.backgroundImage = ''; tc.shot.textContent = data.shotText || ''; }
  };
  if (first || !window.gsap || REDUCED) return fill();
  gsap.timeline()
    .to(tc.card, { rotateY: 90, duration: .14, ease: 'power2.in', onComplete: fill })
    .to(tc.card, { rotateY: 0, duration: .32, ease: 'back.out(2)' })
    .fromTo(tc.flash, { opacity: .9 }, { opacity: 0, duration: .35 }, '<');
  if (up) gsap.fromTo(tc.stamp, { opacity: 1, scale: 2.2, rotate: -10 }, { scale: 1, rotate: 8, duration: .3, ease: 'back.out(3)' }).then(() => gsap.to(tc.stamp, { opacity: 0, delay: .6, duration: .3 }));
}

let tinGames = [];
fetch('tin/manifest.json').then(r => r.ok ? r.json() : []).then(j => { tinGames = j; }).catch(() => {});
function tinFor(lo, hi) {
  return tinGames.filter(g => TIN_HOURS[g.id] != null && TIN_HOURS[g.id] >= lo && TIN_HOURS[g.id] < hi);
}

const BUILD = {
  hours(body) {
    const tc = tierCard(body);
    const meter = el('div', { class: 'meter' }, STAT_NAMES.map(n => el('div', {}, [el('small', { text: n }), el('b', { class: 'stars' })])));
    const brk = el('p', { class: 'breakdown' });
    const steps = GAME_TIERS.map(t => t.h);
    let last = 0;
    timeBar(body, { steps, min: 1, max: 80, scale: 'log', start: 1, fmt: h => h + 'h', onChange: (h, crossed) => {
      const i = steps.reduce((a, s, k) => h >= s ? k : a, 0), t = GAME_TIERS[i];
      const hi = GAME_TIERS[i + 1]?.h ?? Infinity;
      const real = tinFor(t.h, hi);
      swapTier(tc, i, { ...t, shot: real[0]?.shots?.[0], shotText: 'TINProject\n캡처 연결 예정', games: real.map(g => `${g.name} · ${TIN_HOURS[g.id]}h`) }, i > last);
      meter.querySelectorAll('.stars').forEach((s, k) => { s.textContent = '★'.repeat(t.stats[k]) + '☆'.repeat(5 - t.stats[k]); });
      if (crossed && i > last) say(`${t.rank}! ${t.title}. ${t.h}시간이면 이 정도야.`);
      last = i;
      state.draft.hours = h;
      brk.innerHTML = `시급 <b>${won(RATE)}</b> + Claude <b>${won(AI_RATE)}</b><br>× <b>${h}시간</b> = <b>${won(h * HOUR)}</b>`;
      updatePrice();
    } });
    body.append(meter, el('div', { class: 'box' }, brk));
    noteField(body, '어떤 게임이었으면 해요?', '장르, 분위기, 참고할 게임, 누구에게 줄 건지…');
  },
  web(body) {
    const tc = tierCard(body);
    let last = 0;
    timeBar(body, { steps: WEB_STEPS.map(s => s.h), min: .5, max: 6, scale: 'lin', start: .5, fmt: h => h < 1 ? '30m' : h + 'h', onChange: (h, crossed) => {
      const i = WEB_STEPS.findIndex(s => s.h === h), s = WEB_STEPS[i];
      swapTier(tc, i, { rank: `STEP ${i + 1}`, title: s.title, desc: s.desc, shotText: won(s.p) }, i > last);
      if (crossed && i > last) say(`${s.title}! ${won(s.p)}.`);
      last = i; state.draft.hours = h; state.draft.webPrice = s.p; updatePrice();
    } });
    noteField(body, '무슨 사이트?', '목적, 들어갈 내용, 참고 사이트…');
  },
  read(body) {
    state.draft.tier = READ_TIERS[1];
    body.append(el('div', { class: 'box' }, [el('h3', { text: '연기 등급' }), chips(READ_TIERS.map(t => ({ ...t, sub: `${t.rate}원/자 · ${t.sub}` })), 'base', t => { state.draft.tier = t; updatePrice(); })]));
    const count = el('b', { text: '0' });
    const t = noteField(body, '읽을 글', '여기에 붙여 넣으면 글자 수를 세요');
    t.addEventListener('input', () => { state.draft.chars = [...t.value].filter(c => c !== '\n' && c !== '\r').length; count.textContent = state.draft.chars.toLocaleString(); updatePrice(); });
    body.append(el('p', { class: 'note' }, ['띄어쓰기 포함 ', count, '자 · 최소 1,000원 · 아직 시범가예요']));
    state.draft.chars = 0;
  },
  qty(body, it) {
    state.draft.qty = 1;
    const n = el('b', { text: '1' });
    const step = d => { state.draft.qty = Math.max(1, Math.min(99, state.draft.qty + d)); n.textContent = state.draft.qty; updatePrice();
      if (window.gsap && !REDUCED) gsap.fromTo(n, { y: d > 0 ? -10 : 10 }, { y: 0, duration: .25, ease: 'back.out(3)' }); };
    body.append(el('div', { class: 'box' }, [el('h3', { text: '개수' }), el('div', { class: 'stepper' }, [
      el('button', { 'aria-label': '하나 빼기', text: '−', onclick: () => step(-1) }), n, el('button', { 'aria-label': '하나 더', text: '+', onclick: () => step(1) }),
      el('span', { class: 'lbl', text: `${won(it.price)} / ${it.unit}` })])]));
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
    state.draft.amount = 0;
    const input = el('input', { type: 'number', min: '0', step: '500', value: '0', 'aria-label': '직접 입력', oninput: e => { state.draft.amount = Math.max(0, Number(e.target.value) || 0); updatePrice(); } });
    body.append(el('div', { class: 'box' }, [el('h3', { text: '얼마 낼래요?' }),
      chips([0, 1000, 5000, 10000, 30000].map(v => ({ id: v, name: v ? won(v) : '0원', sub: v ? (v >= 10000 ? '감동받음' : '고마워요') : '일단 들어 볼게' })), 0,
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
    state.draft.kindSel = FEAT_KINDS[0];
    body.append(el('div', { class: 'box' }, [el('h3', { text: '어떤 종류?' }), chips(FEAT_KINDS, 'cmd', k => { state.draft.kindSel = k; })]));
    noteField(body, '원하는 기능 설명', '예) /별명 치면 서버 밈으로 랜덤 칭호 붙여 주기');
    body.append(el('p', { class: 'note', text: '담으면 0원(견적 대기)으로 들어가고, 이놀아안이 검토해서 가격을 정해 답장해요.' }));
  },
  bot(body) {
    state.draft.tier = BOT_TIERS[0];
    body.append(el('div', { class: 'box' }, [el('h3', { text: '봇 크기' }),
      chips(BOT_TIERS.map(t => ({ ...t, sub: `${won(t.build)} + 월 ${won(t.month)} · ${t.sub}` })), 'mini', t => { state.draft.tier = t; updatePrice(); })]));
    noteField(body, '어떤 봇?', '서버, 하고 싶은 일, 참고할 봇…');
    body.append(el('p', { class: 'note', text: '월 유지비에는 서버비와 고장 수리가 들어 있어요. 끊으면 봇도 쉬어요.' }));
  },
};
const otherInCart = () => state.cart.some(c => c.item.id !== 'dm');
const PRICE = {
  hours: (it, d) => setPrice((d.hours || 1) * HOUR),
  web: (it, d) => setPrice(d.webPrice || 10000),
  read: (it, d) => setPrice(d.chars ? Math.max(1000, d.chars * d.tier.rate) : 0, `${d.tier.name} · ${d.tier.rate}원/자`),
  qty: (it, d) => setPrice(it.price * d.qty),
  text: (it, d) => setPrice(it.price),
  partner: () => setPrice(0, '도전장', '0원'),
  pwyw: (it, d) => setPrice(d.amount, '주고 싶은 만큼'),
  dm: (it, d) => { const free = otherInCart(); const p = $('#dm-free');
    if (p) p.textContent = free ? '장바구니에 다른 상품이 있어서 무료예요!' : '다른 상품을 하나라도 담으면 무료가 돼요.';
    setPrice(free ? 0 : 5000, free ? '무료 해금' : '가격'); },
  quote: () => setPrice(0, '이놀아안 검토 후 가격 책정', '견적 대기'),
  bot: (it, d) => setPrice(d.tier.build, `제작비 (월 ${won(d.tier.month)} 별도)`),
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
  const it = state.item, d = state.draft;
  if (it.kind === 'read' && !d.chars) { say('읽을 글을 먼저 붙여 넣어 줘!'); wiggle($('#detail-body textarea')); return; }
  if ((it.kind === 'quote' || it.kind === 'text' || it.kind === 'partner') && !d.note.trim()) { say('뭘 원하는지 한 줄이라도 적어 줘!'); wiggle($('#detail-body textarea')); return; }
  state.cart.push({ key: ++seq, item: it, price: d.price, sum: summary(it, d), note: d.note.trim(), monthly: it.kind === 'bot' ? d.tier.month : 0 });
  flyCoin(e.currentTarget);
  say(LINES.added[seq % LINES.added.length]);
  renderCart();
  closeDetail();
};
function flyCoin(from) {
  if (!window.gsap || REDUCED) return;
  const a = from.getBoundingClientRect(), b = $('#cart-toggle').getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const c = el('span', { class: 'coin fly' }); // 이빨이 날아간다 document.body.append(c);
    gsap.set(c, { left: a.left + a.width / 2, top: a.top });
    gsap.timeline({ onComplete: () => c.remove() })
      .to(c, { left: b.left + 30 + gsap.utils.random(-20, 20), duration: .7, ease: 'power1.inOut', delay: i * .06 })
      .to(c, { top: a.top - 120 - i * 10, duration: .3, ease: 'power2.out' }, `<`)
      .to(c, { top: b.top, duration: .4, ease: 'power2.in' }, `>-.02`);
  }
  gsap.fromTo('#cart-toggle', { scale: 1 }, { scale: 1.15, duration: .12, yoyo: true, repeat: 1, delay: .9 });
}

/* ── 장바구니 ── */
function priced(c) { return c.item.id === 'dm' ? (state.cart.some(x => x.item.id !== 'dm') ? 0 : 5000) : c.price; }
function renderCart() {
  const list = $('#cart-list'); list.replaceChildren();
  if (!state.cart.length) list.append(el('li', { class: 'cart-empty', style: 'border:0;background:none', text: '비어 있어요. 마음에 드는 걸 골라 봐요!' }));
  for (const c of state.cart) list.append(el('li', {}, [c.item.name, el('small', { text: c.item.kind === 'quote' ? '견적' : won(priced(c)) }),
    el('button', { 'aria-label': `${c.item.name} 빼기`, text: '✕', onclick: () => { state.cart = state.cart.filter(x => x !== c); renderCart(); } })]));
  const total = state.cart.reduce((s, c) => s + priced(c), 0);
  $('#cart-count').textContent = state.cart.length;
  $('#cart-total').textContent = won(total);
  $('#btn-order').disabled = !state.cart.length;
  const w = $('#wallet-total');
  if (window.gsap && !REDUCED) { const o = { v: Number(w.dataset.v || 0) }; gsap.to(o, { v: total, duration: .6, onUpdate: () => { w.textContent = Math.round(o.v).toLocaleString('ko-KR'); } }); }
  else w.textContent = total.toLocaleString('ko-KR');
  w.dataset.v = total;
}
$('#cart-toggle').onclick = () => { $('#cart-list').scrollTo({ left: 0, behavior: 'smooth' }); };

/* ── 주문서 ── */
function orderCode() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `BONG-${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
$('#btn-order').onclick = () => {
  const code = orderCode();
  const total = state.cart.reduce((s, c) => s + priced(c), 0);
  const monthly = state.cart.reduce((s, c) => s + c.monthly, 0);
  const lines = [`[봉봉봉 주문서] ${code}`, ''];
  state.cart.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.item.name}${c.sum ? ` (${c.sum})` : ''} —${c.item.kind === 'quote' ? '견적 요청' : won(priced(c))}`);
    if (c.note) lines.push('   └ ' + c.note.replace(/\n+/g, ' / '));
  });
  lines.push('', `합계: ${won(total)}` + (monthly ? ` (+ 월 ${won(monthly)})` : '') + ' · 결제는 결과물 받은 뒤(후불)');
  if (state.cart.some(c => c.item.kind === 'quote')) lines.push('※ 견적 상품은 검토 후 가격을 알려 주세요.');
  $('#order-code').textContent = code;
  $('#order-text').textContent = lines.join('\n');
  $('#send-result').textContent = '';
  $('#dm-user-box').hidden = !state.cart.some(c => c.item.id === 'dm');
  $('#send-order').disabled = false;
  $('#send-order').hidden = !DISCORD.webhook;
  $('#send-help').textContent = DISCORD.webhook ? '주문을 디스코드로 보내면 이놀아안이 스레드에서 같이 조율해요' : '주문서를 복사해서 이놀아안에게 DM으로 보내면 거기서 같이 조율해요';
  $('#checkout').showModal();
  say(LINES.order);
  if (window.gsap && !REDUCED) gsap.fromTo('.checkout-inner', { yPercent: -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .6, ease: 'bounce.out' });
};
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast('복사가 안 됐어요. 길게 눌러 직접 복사해 주세요.'); }
}
$('#copy-order').onclick = () => copy($('#order-text').textContent, '주문서를 복사했어요!');
// 포럼 채널 웹후크로 주문마다 스레드를 하나 연다. 그 스레드가 구매자와 조율하는 자리다.
$('#send-order').onclick = async () => {
  const buyer = $('#buyer').value.trim();
  const out = $('#send-result');
  if (!buyer) { out.textContent = '디스코드 닉네임을 먼저 적어 주세요.'; $('#buyer').focus(); return; }
  // DM 해금은 Eve가 이 사용자명으로 계정을 찾는다 (소문자, 숫자, _, . 만)
  const dmUser = $('#dm-user-box').hidden ? '' : $('#dm-user').value.trim().replace(/^@/, '').toLowerCase();
  if (!$('#dm-user-box').hidden && !/^[a-z0-9_.]{2,32}$/.test(dmUser)) {
    out.textContent = 'DM 해금용 디스코드 사용자명을 적어 주세요. 영어 소문자·숫자·_·. 만 써요.'; $('#dm-user').focus(); return;
  }
  const code = $('#order-code').textContent;
  const btn = $('#send-order'); btn.disabled = true; out.textContent = '보내는 중…';
  try {
    const r = await fetch(DISCORD.webhook + '?wait=true', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      username: '봉봉봉', thread_name: `${code} · ${buyer}`.slice(0, 100), allowed_mentions: { parse: [] },
      content: `주문자: **${buyer}**\n${dmUser ? `디스코드 사용자명: ${dmUser}\n` : ''}\`\`\`\n${$('#order-text').textContent}\n\`\`\``.slice(0, 2000) }) });
    if (!r.ok) throw new Error(r.status);
    const msg = await r.json();
    out.replaceChildren('보냈어요! 이 스레드에서 이놀아안이 불러요 → ',
      el('a', { href: `https://discord.com/channels/${DISCORD.guild}/${msg.channel_id}`, target: '_blank', rel: 'noopener', text: '스레드 열기' }));
    say('주문 들어왔다! 스레드에서 보자.');
  } catch {
    btn.disabled = false;
    out.textContent = '보내기에 실패했어요. 아래 "주문서 복사"로 DM 보내 주세요.';
  }
};
$('#copy-bank').onclick = () => copy('카카오뱅크 3333-34-4447561 이충호', '계좌번호를 복사했어요!');
function toast(msg) {
  const t = $('#toast'); t.textContent = msg;
  if (window.gsap) gsap.timeline().to(t, { opacity: 1, y: 0, duration: .25, ease: 'back.out(2)' }).to(t, { opacity: 0, y: 40, delay: 1.6, duration: .25 });
  else { t.style.opacity = 1; t.style.transform = 'translate(-50%,0)'; setTimeout(() => { t.style.opacity = 0; }, 1800); }
}

/* ── 시작 ── */
renderRail(); renderShelf(); renderCart();
setTimeout(() => say(LINES.hello), 300);
if (window.gsap && !REDUCED) {
  gsap.from('.sign', { y: -120, rotate: -12, duration: .9, ease: 'bounce.out' });
  gsap.from('.counter', { x: -60, opacity: 0, duration: .5, delay: .3 });
  gsap.from('.tab', { x: -80, opacity: 0, stagger: .05, duration: .4, delay: .2, ease: 'back.out(1.6)' });
  gsap.from('.cartbar', { yPercent: 100, duration: .5, delay: .4, ease: 'expo.out' });
}
})();
