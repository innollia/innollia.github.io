/**
 * 뽁뽁이 클리커 로직 검증 테스트 (독립 실행, 사이트 빌드와 무관)
 * 실행: node tests/clicker-logic.test.js
 * 목적: 확장한 게임 수식(직급/골든/오프라인/콤보 배율/업그레이드 비용)이 회귀 없이 유지되는지 자동 확인.
 */
'use strict';

let passed = 0;
let failed = 0;

function assert(name, cond) {
  if (cond) { passed++; console.log('  ✔ ' + name); }
  else { failed++; console.error('  [X] 실패: ' + name); }
}

// --- 검증 대상 수식 (bubble-clicker.js와 동일한 규칙을 복제) ---

const RANKS = [
  { min: 0 }, { min: 100 }, { min: 1000 }, { min: 10000 }, { min: 100000 },
  { min: 1000000 }, { min: 10000000 }, { min: 100000000 }, { min: 1000000000 }, { min: 10000000000 }
];

function rankIndex(lifetimeAir) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (lifetimeAir >= RANKS[i].min) idx = i;
  return idx;
}

function globalMult(lv9) { return 1 + lv9 * 0.25; }

function goldenChance(lv7) {
  if (lv7 <= 0) return 0;
  return Math.min(0.12, 0.01 + lv7 * 0.012);
}

function comboMult(combo) {
  if (combo < 5) return 1;
  if (combo < 15) return 1.5;
  if (combo < 30) return 2;
  if (combo < 50) return 3;
  return 4;
}

function upgradeCost(baseCost, costMult, count) {
  return Math.floor(baseCost * Math.pow(costMult, count));
}

function offlineEarned(pps, elapsedSec, lv8) {
  if (lv8 <= 0) return 0;
  if (elapsedSec < 30) return 0;
  const cappedSec = Math.min(elapsedSec, 8 * 3600);
  const efficiency = Math.min(0.9, lv8 * 0.15);
  return Math.floor(pps * cappedSec * efficiency);
}

// --- 테스트 ---

console.log('[직급 판정]');
assert('0ml → 최하위(0)', rankIndex(0) === 0);
assert('99ml → 여전히 0', rankIndex(99) === 0);
assert('100ml → 1단계', rankIndex(100) === 1);
assert('1,000,000ml → 5단계', rankIndex(1000000) === 5);
assert('100억ml → 최고(9)', rankIndex(10000000000) === 9);
assert('경계값 단조 증가', (() => {
  let last = -1;
  for (const v of [0, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 10000000000]) {
    const idx = rankIndex(v);
    if (idx <= last) return false;
    last = idx;
  }
  return true;
})());

console.log('[공명 증폭기 배율]');
assert('Lv0 → 1배', globalMult(0) === 1);
assert('Lv1 → 1.25배', globalMult(1) === 1.25);
assert('Lv4 → 2배', globalMult(4) === 2);

console.log('[황금 뽁뽁이 확률]');
assert('Lv0 → 0%', goldenChance(0) === 0);
assert('Lv1 → 2.2%', Math.abs(goldenChance(1) - 0.022) < 1e-9);
assert('상한 12% 고정', goldenChance(100) === 0.12);
assert('확률은 항상 0~0.12 범위', (() => {
  for (let lv = 0; lv <= 200; lv++) {
    const c = goldenChance(lv);
    if (c < 0 || c > 0.12) return false;
  }
  return true;
})());

console.log('[콤보 배율]');
assert('4콤보 → 배율 없음', comboMult(4) === 1);
assert('5콤보 → 1.5배', comboMult(5) === 1.5);
assert('15콤보 → 2배', comboMult(15) === 2);
assert('30콤보 → 3배', comboMult(30) === 3);
assert('50콤보 → 4배(상한)', comboMult(50) === 4);
assert('999콤보도 4배 상한', comboMult(999) === 4);
assert('콤보 배율 단조 비감소', (() => {
  let last = 0;
  for (let c = 0; c <= 100; c++) {
    const m = comboMult(c);
    if (m < last) return false;
    last = m;
  }
  return true;
})());

console.log('[업그레이드 비용 증가]');
assert('구매할수록 비싸진다', (() => {
  let last = 0;
  for (let n = 0; n < 20; n++) {
    const cost = upgradeCost(15, 1.5, n);
    if (cost <= last) return false;
    last = cost;
  }
  return true;
})());
assert('Lv0 비용 = baseCost', upgradeCost(200, 1.6, 0) === 200);

console.log('[오프라인 수익]');
assert('업그레이드8 없으면 0', offlineEarned(10, 3600, 0) === 0);
assert('30초 미만이면 0', offlineEarned(10, 29, 1) === 0);
assert('1시간 비움(pps10, Lv1)', offlineEarned(10, 3600, 1) === Math.floor(10 * 3600 * 0.15));
assert('8시간 초과분은 잘림(Lv5 효율75%)', offlineEarned(10, 100000, 5) === Math.floor(10 * 8 * 3600 * 0.75));
assert('효율 90% 상한(Lv6+ 동일)', (() => {
  const a = offlineEarned(10, 3600, 6);   // 90% cap
  const b = offlineEarned(10, 3600, 100); // still 90%
  return Math.abs(a - b) <= 1;            // 부동소수 반올림 허용(±1)
})());

// 최고 콤보 갱신 규칙(현재 콤보가 기존 기록보다 클 때만 갱신)
function updateBestCombo(best, current) {
  return current > best ? current : best;
}

// 플레이 일수 계산(시작 시각 → 경과 일수, 미시작이면 0)
function playDays(startedAt, now) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - startedAt) / (1000 * 60 * 60 * 24)));
}

console.log('[최고 콤보 기록]');
assert('더 큰 콤보면 갱신', updateBestCombo(10, 25) === 25);
assert('작은 콤보면 유지', updateBestCombo(30, 12) === 30);
assert('동일하면 유지', updateBestCombo(15, 15) === 15);

console.log('[플레이 일수]');
assert('미시작(0)이면 0일', playDays(0, Date.now()) === 0);
assert('방금 시작 → 0일', playDays(Date.now(), Date.now()) === 0);
assert('3일 경과 → 3일', (() => {
  const now = 1000000000000;
  const start = now - 3 * 24 * 60 * 60 * 1000;
  return playDays(start, now) === 3;
})());
assert('미래 시작(음수)도 0으로 클램프', playDays(Date.now() + 100000, Date.now()) === 0);

// === 방명록 로직 (guestbook.html과 동일 규칙 복제) ===
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function addEntry(list, name, msg) {
  const n = (name || '').trim();
  const m = (msg || '').trim();
  if (!n || !m) return list;               // 이름·내용 필수
  const next = list.concat([{ name: n.slice(0, 20), msg: m.slice(0, 300), ts: 1 }]);
  return next.length > 200 ? next.slice(-200) : next;  // 최대 200개
}

console.log('[방명록]');
assert('HTML 태그 이스케이프', esc('<script>x</script>') === '&lt;script&gt;x&lt;/script&gt;');
assert('따옴표 이스케이프', esc('"a\'b"') === '&quot;a&#39;b&quot;');
assert('앰퍼샌드 먼저 처리', esc('a & <b>') === 'a &amp; &lt;b&gt;');
assert('이름 없으면 미추가', addEntry([], '', '안녕').length === 0);
assert('내용 없으면 미추가', addEntry([], '누구', '   ').length === 0);
assert('정상 입력은 추가', addEntry([], '방문자', '반가워요').length === 1);
assert('이름 20자 초과 절삭', addEntry([], 'x'.repeat(50), 'hi')[0].name.length === 20);
assert('내용 300자 초과 절삭', addEntry([], 'n', 'y'.repeat(500))[0].msg.length === 300);
assert('201번째부터 오래된 것 제거', (() => {
  let list = [];
  for (let i = 0; i < 205; i++) list = addEntry(list, 'u' + i, 'm' + i);
  return list.length === 200 && list[0].name === 'u5'; // 앞 5개 밀림
})());

console.log('\n결과: ' + passed + ' 통과, ' + failed + ' 실패');
if (failed > 0) process.exit(1);
