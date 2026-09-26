/**
 * ==========================================================================
 * [백일몽 주식회사] 뽁뽁이 리모콘 & 클리커 게임 코어 모듈
 * ==========================================================================
 */

(function () {
  'use strict';

  let lastMouseX = null;
  let lastMouseY = null;
  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  // 1. 오디오 컨텍스트 및 사운드 제어
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playPop(isCritical = false) {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = isCritical ? 'sawtooth' : 'sine';
    const startFreq = isCritical ? 1200 : 900;
    const endFreq = isCritical ? 400 : 300;

    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(isCritical ? 1.5 : 1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }

  function playSoftPop() {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  }

  function playUpgradeSound() {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  }

  // 2. 게임 상태 관리 (압축 공기 ml 단위)
  const STORAGE_KEY = 'daydream_bubble_air_clicker';

  let clickerState = {
    clicks: 0,
    air: 0,
    golden: 0,        // 골든 뽁뽁이 누적 파열 횟수
    lifetimeAir: 0,   // 누적 획득 압축 공기(직급 판정용, 소비해도 안 줄어듦)
    lastSeen: 0,      // 마지막 접속 시각(오프라인 수익 계산용)
    achievements: {}, // 달성한 업적 id 모음
    bestCombo: 0,     // 최고 콤보 기록
    startedAt: 0,     // 최초 플레이 시작 시각
    upgrades: {
      1: { count: 0, baseCost: 15, costMult: 1.5, clickBonus: 1, secBonus: 0 },
      2: { count: 0, baseCost: 50, costMult: 1.6, critChance: 0.15 },
      3: { count: 0, baseCost: 200, costMult: 1.6, clickBonus: 0, secBonus: 4 },
      4: { count: 0, baseCost: 1000, costMult: 1.7, clickBonus: 0, secBonus: 0 },
      5: { count: 0, baseCost: 40000, costMult: 1.8, clickBonus: 0, secBonus: 0 },
      6: { count: 0, baseCost: 200000, costMult: 1.9, clickBonus: 0, secBonus: 0 },
      7: { count: 0, baseCost: 5000, costMult: 1.7, clickBonus: 0, secBonus: 0 },     // 황금 압착기: 골든 뽁뽁이 출현 확률↑
      8: { count: 0, baseCost: 800000, costMult: 2.0, clickBonus: 0, secBonus: 0 },   // 심야 컴프레서: 오프라인 자동 충전 효율↑
      9: { count: 0, baseCost: 5000000, costMult: 2.2, clickBonus: 0, secBonus: 0 }   // 공명 증폭기: 모든 획득량 배율↑
    }
  };

  // === 직급(랭크) 테이블: 누적 공기량 기준 백일몽 주식회사 사원증 ===
  const RANKS = [
    { min: 0,           name: '수습 뽁뽁 견습생' },
    { min: 100,         name: '뽁뽁 사원' },
    { min: 1000,        name: '뽁뽁 주임' },
    { min: 10000,       name: '뽁뽁 대리' },
    { min: 100000,      name: '뽁뽁 과장' },
    { min: 1000000,     name: '뽁뽁 차장' },
    { min: 10000000,    name: '뽁뽁 부장' },
    { min: 100000000,   name: '뽁뽁 이사' },
    { min: 1000000000,  name: '뽁뽁 대표이사' },
    { min: 10000000000, name: '전설의 압축 공기 마스터' }
  ];

  function getRank() {
    let r = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
      if (clickerState.lifetimeAir >= RANKS[i].min) r = RANKS[i];
    }
    return r;
  }

  // 다음 직급까지의 진행도(0~100). 최고 직급이면 null 반환.
  function getRankProgress() {
    let idx = 0;
    for (let i = 0; i < RANKS.length; i++) {
      if (clickerState.lifetimeAir >= RANKS[i].min) idx = i;
    }
    if (idx >= RANKS.length - 1) return null; // 최고 직급
    const cur = RANKS[idx].min;
    const next = RANKS[idx + 1].min;
    const pct = Math.max(0, Math.min(100, ((clickerState.lifetimeAir - cur) / (next - cur)) * 100));
    return { pct: Math.floor(pct), next: RANKS[idx + 1].name, remain: Math.max(0, Math.ceil(next - clickerState.lifetimeAir)) };
  }

  // === 업적 정의 ===
  const ACHIEVEMENTS = [
    { id: 'first_pop',   name: '첫 뽁',            check: (s) => s.clicks >= 1 },
    { id: 'pop_100',     name: '뽁 100회',         check: (s) => s.clicks >= 100 },
    { id: 'pop_1000',    name: '뽁 1,000회',       check: (s) => s.clicks >= 1000 },
    { id: 'pop_10000',   name: '뽁 10,000회',      check: (s) => s.clicks >= 10000 },
    { id: 'air_1k',      name: '공기 1,000ml 돌파', check: (s) => s.lifetimeAir >= 1000 },
    { id: 'air_1m',      name: '공기 100만ml 돌파', check: (s) => s.lifetimeAir >= 1000000 },
    { id: 'golden_1',    name: '첫 황금 뽁',        check: (s) => s.golden >= 1 },
    { id: 'golden_50',   name: '황금 뽁 50회',      check: (s) => s.golden >= 50 },
    { id: 'auto_on',     name: '자동화 도입',       check: (s) => s.upgrades[4].count > 0 },
    { id: 'max_upg',     name: '9종 강화 완비',     check: (s) => Object.keys(s.upgrades).every((k) => s.upgrades[k].count > 0) }
  ];

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.clicks === 'number') {
          clickerState.clicks = parsed.clicks;
          clickerState.air = parsed.air || 0;
          clickerState.golden = parsed.golden || 0;
          clickerState.lastSeen = parsed.lastSeen || 0;
          clickerState.achievements = parsed.achievements || {};
          clickerState.bestCombo = parsed.bestCombo || 0;
          clickerState.startedAt = parsed.startedAt || 0;
          // 누적 공기(직급용): 기존 세이브엔 없으니 현재 보유 공기로 최소 보정
          clickerState.lifetimeAir = (typeof parsed.lifetimeAir === 'number')
            ? parsed.lifetimeAir
            : (parsed.air || 0);
          if (parsed.upgrades) {
            for (let k in clickerState.upgrades) {
              if (parsed.upgrades[k]) {
                clickerState.upgrades[k].count = parsed.upgrades[k].count || 0;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('클리커 데이터 불러오기 실패:', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clickerState));
    } catch (e) {
      console.warn('클리커 데이터 저장 실패:', e);
    }
  }

  // 3. 자원 및 가격 연산 로직
  function getGlobalMult() {
    // 공명 증폭기(업그레이드 9): 레벨당 획득량 +25%
    return 1 + (clickerState.upgrades[9] ? clickerState.upgrades[9].count * 0.25 : 0);
  }

  function getAirPerClick() {
    const base = 1 + (clickerState.upgrades[1].count * clickerState.upgrades[1].clickBonus);
    return Math.round(base * getGlobalMult());
  }

  function getAirPerSec() {
    const base = (clickerState.upgrades[3].count * clickerState.upgrades[3].secBonus) +
                 (clickerState.upgrades[4].count * clickerState.upgrades[4].secBonus);
    return Math.round(base * getGlobalMult() * 10) / 10;
  }

  // 골든 뽁뽁이 출현 확률(황금 압착기 업그레이드 7)
  function getGoldenChance() {
    const lv = clickerState.upgrades[7] ? clickerState.upgrades[7].count : 0;
    if (lv <= 0) return 0;
    return Math.min(0.12, 0.01 + lv * 0.012); // 최대 12%
  }

  // 공기 획득 공통 처리(누적 공기 추적 + 업적 체크)
  function gainAir(amount) {
    clickerState.air += amount;
    clickerState.lifetimeAir += amount;
  }

  // === 콤보 시스템 (세션 내 메모리, 저장 안 함) ===
  // 1.2초 안에 연속으로 수동 파열하면 콤보가 쌓이고, 콤보 구간마다 획득 배율이 붙는다.
  let comboCount = 0;
  let comboTimer = null;

  function getComboMult() {
    if (comboCount < 5) return 1;       // 5콤보 미만: 배율 없음
    if (comboCount < 15) return 1.5;    // 5~14콤보: 1.5배
    if (comboCount < 30) return 2;      // 15~29콤보: 2배
    if (comboCount < 50) return 3;      // 30~49콤보: 3배
    return 4;                           // 50콤보 이상: 4배
  }

  function registerCombo() {
    comboCount++;
    if (comboCount > clickerState.bestCombo) clickerState.bestCombo = comboCount;
    if (comboTimer) clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
      comboCount = 0;
      const el = document.getElementById('txt-combo');
      if (el) el.style.display = 'none';
    }, 1200);

    const el = document.getElementById('txt-combo');
    if (el) {
      const mult = getComboMult();
      if (comboCount >= 5) {
        el.style.display = '';
        el.innerHTML = '🔥 ' + comboCount + ' COMBO <span style="color:#ff6600;">×' + mult + '</span>';
      } else {
        el.style.display = 'none';
      }
    }
  }

  function getUpgradeCost(id) {
    const upg = clickerState.upgrades[id];
    return Math.floor(upg.baseCost * Math.pow(upg.costMult, upg.count));
  }

  // 4. UI 렌더링 및 갱신
  function updateUI() {
    const hud = document.getElementById('left-text-clicker');
    const container = document.getElementById('bubble-container');
    const isHidden = localStorage.getItem('hide_clicker') === 'true';

    // 전역 변수로 클리커 활성화 상태 공유 (20회 클릭 시 활성화)
    window.isClickerActivated = (clickerState.clicks >= 20);
    if (typeof window.refreshFloatingClickerBtn === 'function') {
      window.refreshFloatingClickerBtn();
    }

    if (container) {
      container.style.display = isHidden ? 'none' : '';
    }
    if (hud && isHidden) {
      hud.style.display = 'none';
      return;
    }
    if (!hud) return;

    // 20번째 클릭 이후부터 좌측 리모콘 텍스트 노출
    if (clickerState.clicks >= 20) {
      if (hud.style.display === 'none') {
        hud.style.display = 'block';
      }
    } else {
      hud.style.display = 'none';
    }

    const clicksEl = document.getElementById('txt-clicks');
    const airEl = document.getElementById('txt-air');
    const perClickEl = document.getElementById('txt-per-click');
    const perSecEl = document.getElementById('txt-per-sec');

    if (clicksEl) clicksEl.innerText = clickerState.clicks;
    if (airEl) airEl.innerText = Math.floor(clickerState.air);
    if (perClickEl) perClickEl.innerText = getAirPerClick();
    if (perSecEl) perSecEl.innerText = getAirPerSec();

    // 직급(랭크) 표시
    const rankEl = document.getElementById('txt-rank');
    if (rankEl) rankEl.innerText = getRank().name;

    // 다음 직급까지 진행도 바
    const rankBarEl = document.getElementById('txt-rank-progress');
    if (rankBarEl) {
      const prog = getRankProgress();
      if (prog) {
        const filled = Math.round(prog.pct / 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        rankBarEl.style.display = '';
        rankBarEl.innerHTML = '<span style="color:#66ccff;">' + bar + '</span> ' + prog.pct + '% → ' + prog.next;
      } else {
        rankBarEl.style.display = '';
        rankBarEl.innerHTML = '<span style="color:#ffd700;">최고 직급 달성!</span>';
      }
    }

    // 황금 뽁뽁이 누적 표시(1회 이상 잡았을 때만 노출)
    const goldenLine = document.getElementById('line-golden');
    const goldenEl = document.getElementById('txt-golden');
    if (goldenLine) goldenLine.style.display = clickerState.golden > 0 ? '' : 'none';
    if (goldenEl) goldenEl.innerText = clickerState.golden;

    // 업적 목록 렌더링
    renderAchievements();
    renderStats();

    for (let id = 1; id <= 9; id++) {
      const cost = getUpgradeCost(id);
      const el = document.getElementById('upg-' + id);
      const costEl = document.getElementById('cost-' + id);
      const lvlEl = document.getElementById('lvl-' + id);

      if (el && costEl && lvlEl) {
        costEl.innerText = cost;
        lvlEl.innerText = clickerState.upgrades[id].count;

        if (clickerState.air >= cost) {
          el.classList.add('available');
        } else {
          el.classList.remove('available');
        }
      }
    }
  }

  function showFloatingText(text, x, y, color = '#ffcc00') {
    const el = document.createElement('div');
    el.className = 'floating-point';
    el.innerText = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // === 업적 처리 ===
  function checkAchievements() {
    let newlyUnlocked = null;
    ACHIEVEMENTS.forEach((a) => {
      if (!clickerState.achievements[a.id] && a.check(clickerState)) {
        clickerState.achievements[a.id] = true;
        newlyUnlocked = a;
      }
    });
    if (newlyUnlocked) {
      playUpgradeSound();
      const x = (lastMouseX !== null ? lastMouseX : window.innerWidth / 2);
      const y = (lastMouseY !== null ? lastMouseY : window.innerHeight / 2);
      showFloatingText('★ 업적 달성: ' + newlyUnlocked.name, x + window.scrollX, y + window.scrollY, '#ffd700');
    }
  }

  function renderAchievements() {
    const box = document.getElementById('achievement-list');
    if (!box) return;
    const unlocked = ACHIEVEMENTS.filter((a) => clickerState.achievements[a.id]);
    if (unlocked.length === 0) {
      box.style.display = 'none';
      return;
    }
    box.style.display = '';
    box.innerHTML = '<div class="txt-subheader">[ 업적 ' + unlocked.length + '/' + ACHIEVEMENTS.length + ' ]</div>' +
      unlocked.map((a) => '<div class="txt-achievement">✔ ' + a.name + '</div>').join('');
  }

  // === 통계 패널 ===
  function renderStats() {
    const box = document.getElementById('clicker-stats');
    if (!box || box.style.display === 'none') return;
    let daysStr = '오늘 시작';
    if (clickerState.startedAt) {
      const days = Math.floor((Date.now() - clickerState.startedAt) / (1000 * 60 * 60 * 24));
      daysStr = days > 0 ? (days + '일째') : '오늘 시작';
    }
    box.innerHTML =
      '<div class="txt-stat">총 획득 공기: ' + Math.floor(clickerState.lifetimeAir).toLocaleString() + ' ml</div>' +
      '<div class="txt-stat">누적 파열: ' + clickerState.clicks.toLocaleString() + ' 회</div>' +
      '<div class="txt-stat">황금 뽁: ' + clickerState.golden + ' 회</div>' +
      '<div class="txt-stat">최고 콤보: ' + clickerState.bestCombo + '</div>' +
      '<div class="txt-stat">플레이: ' + daysStr + '</div>';
  }

  window.toggleClickerStats = function () {
    const box = document.getElementById('clicker-stats');
    if (!box) return;
    box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'block' : 'none';
    renderStats();
  };

  // === 황금 뽁뽁이 ===
  function trySpawnGolden(el) {
    const chance = getGoldenChance();
    if (chance <= 0) return false;
    if (Math.random() < chance) {
      el.classList.add('golden');
      // 골든은 8초 뒤 자동 소멸(안 터뜨리면 사라짐)
      setTimeout(() => {
        if (el && el.classList.contains('golden')) el.classList.remove('golden');
      }, 8000);
      return true;
    }
    return false;
  }

  function popGolden(el) {
    el.classList.remove('golden');
    clickerState.golden++;
    // 골든 보상: 현재 초당 생산 30초분 또는 최소 대량 지급 중 큰 값
    const perSec = getAirPerSec();
    const reward = Math.max(250, Math.floor(perSec * 30)) * Math.max(1, getGlobalMult());
    const roundedReward = Math.floor(reward);
    gainAir(roundedReward);
    playUpgradeSound();
    const rect = el.getBoundingClientRect();
    showFloatingText('✨ GOLDEN! +' + roundedReward + ' ml', rect.left + window.scrollX + 10, rect.top + window.scrollY - 10, '#ffd700');
  }

  // 5. 상호작용 액션 (전역 노출 필요)
  window.refreshClickerUI = updateUI;

  window.buyUpgrade = function (id) {
    const cost = getUpgradeCost(id);
    if (clickerState.air >= cost) {
      clickerState.air -= cost;
      clickerState.upgrades[id].count++;
      playUpgradeSound();
      saveState();
      updateUI();
    }
  };

  window.resetClickerState = function () {
    localStorage.removeItem(STORAGE_KEY);
    clickerState.clicks = 0;
    clickerState.air = 0;
    clickerState.golden = 0;
    clickerState.lifetimeAir = 0;
    clickerState.lastSeen = 0;
    clickerState.achievements = {};
    clickerState.bestCombo = 0;
    clickerState.startedAt = Date.now();
    for (let k in clickerState.upgrades) {
      clickerState.upgrades[k].count = 0;
    }
    saveState();
    updateUI();
  };

  window.popBubble = function (el, isAuto = false) {
    if (localStorage.getItem('hide_clicker') === 'true') return;
    if (!el || el.classList.contains('popped')) return;

    // === 황금 뽁뽁이를 클릭한 경우: 대량 보상 후 종료 ===
    if (!isAuto && el.classList.contains('golden')) {
      el.classList.add('popped');
      popGolden(el);
      checkAchievements();
      saveState();
      updateUI();
      const regenDelayG = 3000;
      setTimeout(() => { if (el) { el.classList.remove('popped'); } }, regenDelayG);
      return;
    }

    el.classList.add('popped');

    if (!isAuto) {
      clickerState.clicks++;
      registerCombo();
      let gained = getAirPerClick();
      let isCrit = false;

      // 표면 장력 강화(업그레이드 2) 확률 연산
      if (clickerState.upgrades[2].count > 0) {
        const critProb = Math.min(0.8, clickerState.upgrades[2].count * 0.15);
        if (Math.random() < critProb) {
          gained *= 5;
          isCrit = true;
        }
      }

      // 콤보 배율 적용(수동 파열에만)
      const comboMult = getComboMult();
      gained = Math.round(gained * comboMult);

      playPop(isCrit);

      // 20번째 클릭 이후부터만 자원 누적 및 플로팅 텍스트 출력
      if (clickerState.clicks >= 20) {
        gainAir(gained);
        const rect = el.getBoundingClientRect();
        const txt = isCrit ? 'CRITICAL! +' + gained + ' ml' : '+' + gained + ' ml';
        const color = isCrit ? '#ff3333' : '#ffcc00';
        showFloatingText(txt, rect.left + window.scrollX + 10, rect.top + window.scrollY - 10, color);
      }

      checkAchievements();

      // === 압력 전파 충격파(업그레이드 5) 효과 처리 ===
      const lv5 = clickerState.upgrades[5] ? clickerState.upgrades[5].count : 0;
      if (lv5 > 0) {
        const splashRadius = 30 + lv5 * 25;
        const rectClicked = el.getBoundingClientRect();
        const cx = rectClicked.left + rectClicked.width / 2;
        const cy = rectClicked.top + rectClicked.height / 2;

        const unpopped = document.querySelectorAll('#bubble-container .bubble:not(.popped)');
        unpopped.forEach((b) => {
          if (b === el) return;
          const rectB = b.getBoundingClientRect();
          const bx = rectB.left + rectB.width / 2;
          const by = rectB.top + rectB.height / 2;
          const dist = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2);
          if (dist <= splashRadius) {
            window.popBubble(b, true);
          }
        });
      }
    } else {
      playSoftPop();
      if (clickerState.clicks >= 20 || clickerState.upgrades[4].count > 0) {
        const gained = getAirPerClick();
        gainAir(gained);
        const rect = el.getBoundingClientRect();
        showFloatingText('+' + gained + ' ml', rect.left + window.scrollX + 10, rect.top + window.scrollY - 10, '#00ffff');
      }
    }

    saveState();
    updateUI();

    // 뽁뽁이 재생력 강화(업그레이드 6): 재생 대기시간 단축 (최소 300ms까지 단축)
    const lv6 = clickerState.upgrades[6] ? clickerState.upgrades[6].count : 0;
    const regenDelay = Math.max(300, 3000 - (lv6 * 300));
    setTimeout(() => {
      if (el) el.classList.remove('popped');
    }, regenDelay);

    // 기포 컨테이너 내 최대 생성 제한 (업그레이드 6 반영: 기본 30개 + 레벨당 5개)
    const maxBubbles = 30 + (lv6 * 5);
    const container = document.getElementById('bubble-container');
    if (container && container.children.length < maxBubbles) {
      const newBubble = document.createElement('div');
      newBubble.className = 'bubble';
      newBubble.onclick = function () { window.popBubble(this); };
      trySpawnGolden(newBubble);
      container.appendChild(newBubble);
    }
  };

  // 6. 자동 채굴 및 연쇄 파열 공명 루프
  function startLoops() {
    // 0.1초마다 공기압 자동 충전
    setInterval(() => {
      if (localStorage.getItem('hide_clicker') === 'true') return;
      const pps = getAirPerSec();
      if (pps > 0) {
        gainAir(pps / 10);
        checkAchievements();
        updateUI();
      }
    }, 100);

    // 접속 시각 저장(오프라인 수익 계산용) — 5초마다 갱신
    setInterval(() => {
      clickerState.lastSeen = Date.now();
      saveState();
    }, 5000);

    // 뽁뽁이 재생력 강화(업그레이드 6): 1초마다 기포 최대 수량까지 자동 보충
    setInterval(() => {
      if (localStorage.getItem('hide_clicker') === 'true') return;
      const lv6 = clickerState.upgrades[6] ? clickerState.upgrades[6].count : 0;
      if (lv6 <= 0) return; // 업그레이드 6을 구매하지 않았으면 자동 보충 안 함
      const maxBubbles = 30 + (lv6 * 5);
      const container = document.getElementById('bubble-container');
      if (container && container.children.length < maxBubbles) {
        const newBubble = document.createElement('div');
        newBubble.className = 'bubble';
        newBubble.onclick = function () { window.popBubble(this); };
        trySpawnGolden(newBubble);
        container.appendChild(newBubble);
      }
    }, 1000);

    // 연쇄 파열 공명장(업그레이드 4): 2초마다 레벨 수만큼 연쇄 뽁 자동 파열
    setInterval(() => {
      if (localStorage.getItem('hide_clicker') === 'true') return;
      const lv = clickerState.upgrades[4].count;
      if (lv > 0) {
        for (let i = 0; i < lv; i++) {
          setTimeout(() => {
            if (localStorage.getItem('hide_clicker') === 'true') return;
            const unpoppedList = Array.from(document.querySelectorAll('#bubble-container .bubble:not(.popped)'));
            if (unpoppedList.length > 0) {
              let targetBubble = null;
              if (lastMouseX !== null && lastMouseY !== null) {
                // 마우스 클릭 반경 또는 최소 130px 이상 회피
                const lv5 = clickerState.upgrades[5] ? clickerState.upgrades[5].count : 0;
                const safeRadius = Math.max(130, 40 + (lv5 * 25));

                const farBubbles = unpoppedList.filter((b) => {
                  const rect = b.getBoundingClientRect();
                  const bx = rect.left + rect.width / 2;
                  const by = rect.top + rect.height / 2;
                  const dist = Math.sqrt((bx - lastMouseX) ** 2 + (by - lastMouseY) ** 2);
                  return dist >= safeRadius;
                });

                if (farBubbles.length > 0) {
                  const idx = Math.floor(Math.random() * farBubbles.length);
                  targetBubble = farBubbles[idx];
                } else {
                  // 모든 기포가 안전 반경 안에 있다면 마우스에서 가장 먼 기포를 선택
                  unpoppedList.sort((a, b) => {
                    const rectA = a.getBoundingClientRect();
                    const distA = Math.sqrt((rectA.left + rectA.width / 2 - lastMouseX) ** 2 + (rectA.top + rectA.height / 2 - lastMouseY) ** 2);
                    const rectB = b.getBoundingClientRect();
                    const distB = Math.sqrt((rectB.left + rectB.width / 2 - lastMouseX) ** 2 + (rectB.top + rectB.height / 2 - lastMouseY) ** 2);
                    return distB - distA;
                  });
                  targetBubble = unpoppedList[0];
                }
              } else {
                const idx = Math.floor(Math.random() * unpoppedList.length);
                targetBubble = unpoppedList[idx];
              }

              if (targetBubble) {
                window.popBubble(targetBubble, true);
              }
            }
          }, i * 100);
        }
      }
    }, 2000);
  }

  // 오프라인 수익: 마지막 접속 이후 흐른 시간만큼 자동 충전량을 지급
  function grantOfflineEarnings() {
    const lv8 = clickerState.upgrades[8] ? clickerState.upgrades[8].count : 0;
    if (lv8 <= 0) return;             // 심야 컴프레서(업그레이드 8) 없으면 오프라인 수익 없음
    if (!clickerState.lastSeen) return;

    const now = Date.now();
    const elapsedSec = Math.floor((now - clickerState.lastSeen) / 1000);
    if (elapsedSec < 30) return;      // 최소 30초 이상 비웠을 때만

    const cappedSec = Math.min(elapsedSec, 8 * 3600); // 최대 8시간분까지만 인정
    const efficiency = Math.min(0.9, lv8 * 0.15);     // 레벨당 15%, 최대 90% 효율
    const pps = getAirPerSec();
    const earned = Math.floor(pps * cappedSec * efficiency);
    if (earned <= 0) return;

    gainAir(earned);
    saveState();

    const hours = Math.floor(cappedSec / 3600);
    const mins = Math.floor((cappedSec % 3600) / 60);
    const timeStr = hours > 0 ? (hours + '시간 ' + mins + '분') : (mins + '분');
    showFloatingText('🌙 오프라인 수익 (' + timeStr + '): +' + earned + ' ml',
      window.innerWidth / 2 - 80 + window.scrollX, 120 + window.scrollY, '#88ccff');
  }

  // 7. 초기화
  function init() {
    loadState();
    if (!clickerState.startedAt) clickerState.startedAt = Date.now();
    grantOfflineEarnings();
    clickerState.lastSeen = Date.now();
    checkAchievements();
    updateUI();
    startLoops();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
