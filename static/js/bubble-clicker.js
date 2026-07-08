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
    upgrades: {
      1: { count: 0, baseCost: 15, costMult: 1.5, clickBonus: 1, secBonus: 0 },
      2: { count: 0, baseCost: 50, costMult: 1.6, critChance: 0.15 },
      3: { count: 0, baseCost: 200, costMult: 1.6, clickBonus: 0, secBonus: 4 },
      4: { count: 0, baseCost: 1000, costMult: 1.7, clickBonus: 0, secBonus: 0 },
      5: { count: 0, baseCost: 40000, costMult: 1.8, clickBonus: 0, secBonus: 0 },
      6: { count: 0, baseCost: 200000, costMult: 1.9, clickBonus: 0, secBonus: 0 }
    }
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.clicks === 'number') {
          clickerState.clicks = parsed.clicks;
          clickerState.air = parsed.air || 0;
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
  function getAirPerClick() {
    return 1 + (clickerState.upgrades[1].count * clickerState.upgrades[1].clickBonus);
  }

  function getAirPerSec() {
    return (clickerState.upgrades[3].count * clickerState.upgrades[3].secBonus) +
           (clickerState.upgrades[4].count * clickerState.upgrades[4].secBonus);
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

    for (let id = 1; id <= 6; id++) {
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
    for (let k in clickerState.upgrades) {
      clickerState.upgrades[k].count = 0;
    }
    saveState();
    updateUI();
  };

  window.popBubble = function (el, isAuto = false) {
    if (localStorage.getItem('hide_clicker') === 'true') return;
    if (!el || el.classList.contains('popped')) return;
    el.classList.add('popped');

    if (!isAuto) {
      clickerState.clicks++;
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

      playPop(isCrit);

      // 20번째 클릭 이후부터만 자원 누적 및 플로팅 텍스트 출력
      if (clickerState.clicks >= 20) {
        clickerState.air += gained;
        const rect = el.getBoundingClientRect();
        const txt = isCrit ? 'CRITICAL! +' + gained + ' ml' : '+' + gained + ' ml';
        const color = isCrit ? '#ff3333' : '#ffcc00';
        showFloatingText(txt, rect.left + window.scrollX + 10, rect.top + window.scrollY - 10, color);
      }

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
        clickerState.air += gained;
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
        clickerState.air += pps / 10;
        updateUI();
      }
    }, 100);

    // 뽁뽁이 재생력 강화(업그레이드 6): 1초마다 기포 최대 수량까지 자동 보충
    setInterval(() => {
      if (localStorage.getItem('hide_clicker') === 'true') return;
      const container = document.getElementById('bubble-container');
      const lv6 = clickerState.upgrades[6] ? clickerState.upgrades[6].count : 0;
      const maxBubbles = 30 + (lv6 * 5);
      if (container && container.children.length < maxBubbles) {
        const newBubble = document.createElement('div');
        newBubble.className = 'bubble';
        newBubble.onclick = function () { window.popBubble(this); };
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

  // 7. 초기화
  function init() {
    loadState();
    updateUI();
    startLoops();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
