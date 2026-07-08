/**
 * ==========================================================================
 * [메일러 의식망] 아날로그 작동음 및 배경 앰비언트 사운드 제어 모듈
 * ==========================================================================
 */

(function () {
  'use strict';

  let audioCtx = null;
  let humOsc1 = null;
  let humOsc2 = null;
  let humGain = null;
  // 기본값을 ON(true)으로 설정하며, 로컬스토리지에 명시적으로 꺼둔 기록이 있는 경우에만 OFF
  let isSoundOn = localStorage.getItem('ambient_sound_enabled') !== 'false';

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window.globalAudioCtx = audioCtx; // 다른 스크립트와 공유 가능하도록 등록
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // 1. 일반 키보드 타건음
  window.playKeyClick = function () {
    initAudio();
    if (!audioCtx || !isSoundOn) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    // 입력 빈도에 따른 약간의 피치 변화로 리얼함 부여
    const pitch = 350 + Math.random() * 100;
    osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  };

  // 2. 무거운 시스템 엔터 / 링크 클릭 작동음
  window.playClack = function () {
    initAudio();
    if (!audioCtx || !isSoundOn) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  };

  // 3. 서버 룸 배경 앰비언트 노이즈 (60Hz + 120Hz 저주파 웅웅 소리)
  function startHum() {
    initAudio();
    if (!audioCtx) return;

    if (humOsc1 || humOsc2) return; // 이미 재생 중이면 무시

    humOsc1 = audioCtx.createOscillator();
    humOsc2 = audioCtx.createOscillator();
    humGain = audioCtx.createGain();

    humOsc1.type = 'sine';
    humOsc1.frequency.setValueAtTime(55, audioCtx.currentTime); // 55Hz 저역대
    
    humOsc2.type = 'sine';
    humOsc2.frequency.setValueAtTime(110, audioCtx.currentTime); // 배음 110Hz

    // 아주 은은하게 기계적 배경음으로만 깔리도록 작게 설정
    humGain.gain.setValueAtTime(0.025, audioCtx.currentTime);

    humOsc1.connect(humGain);
    humOsc2.connect(humGain);
    humGain.connect(audioCtx.destination);

    humOsc1.start();
    humOsc2.start();
  }

  function stopHum() {
    if (humOsc1) {
      try { humOsc1.stop(); } catch(e) {}
      humOsc1 = null;
    }
    if (humOsc2) {
      try { humOsc2.stop(); } catch(e) {}
      humOsc2 = null;
    }
    humGain = null;
  }

  // 4. 소리 토글 제어 인터페이스 생성
  function createAudioToggle() {
    const container = document.createElement('div');
    container.id = 'ambient-audio-toggle';
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.zIndex = '9999';
    container.style.fontFamily = "'Courier New', Courier, monospace";
    container.style.fontSize = '0.8rem';
    container.style.color = isSoundOn ? '#00ff66' : '#ff00ff';
    container.style.cursor = 'pointer';
    container.style.userSelect = 'none';
    container.style.textShadow = '0 0 3px #000000';
    container.innerText = isSoundOn ? '[ 소리: ON ]' : '[ 소리: OFF ]';

    container.addEventListener('click', () => {
      isSoundOn = !isSoundOn;
      localStorage.setItem('ambient_sound_enabled', isSoundOn);
      initAudio();
      
      if (isSoundOn) {
        container.innerText = '[ 소리: ON ]';
        container.style.color = '#00ff66';
        startHum();
        window.playClack();
      } else {
        container.innerText = '[ 소리: OFF ]';
        container.style.color = '#ff00ff';
        stopHum();
      }
    });

    document.body.appendChild(container);
  }

  // 5. 전역 클릭 리스너 연결 (링크 및 버튼 터치 시 클릭 사운드 재생)
  function setupGlobalClickListeners() {
    document.addEventListener('click', (e) => {
      initAudio();
      if (isSoundOn) {
        startHum();
      }

      const target = e.target;
      if (!target) return;

      // 링크, 버튼, 혹은 특정 클릭 가능한 인터랙션 요소인 경우 작동음 출력
      if (
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') || 
        target.closest('button') ||
        target.classList.contains('bubble') ||
        target.classList.contains('txt-upgrade')
      ) {
        // 뽁뽁이나 업그레이드는 개별 사운드를 가지고 있으므로 키보드음이 겹치지 않게 처리할 수도 있으나,
        // 일반 링크나 메뉴 클릭은 playClack으로 고유 작동음 제공
        if (!target.classList.contains('bubble') && !target.classList.contains('txt-upgrade')) {
          window.playClack();
        }
      } else {
        // 일반 빈 화면 클릭 시에는 아주 가벼운 터치 클릭음
        window.playKeyClick();
      }
    });
  }

  function createClickerToggle() {
    const container = document.createElement('div');
    container.id = 'floating-clicker-toggle';
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '45px'; // 소리 버튼 바로 위
    container.style.zIndex = '9999';
    container.style.fontFamily = "'Courier New', Courier, monospace";
    container.style.fontSize = '0.8rem';
    container.style.color = '#00ffff';
    container.style.cursor = 'pointer';
    container.style.userSelect = 'none';
    container.style.textShadow = '0 0 3px #000000';
    
    const updateText = () => {
      // 20회 클릭 미만이라 미활성화 상태이면 우하단 토글 버튼 숨김
      const isActivated = window.isClickerActivated || false;
      if (!isActivated) {
        container.style.display = 'none';
        return;
      }
      container.style.display = 'block';

      const isHidden = localStorage.getItem('hide_clicker') === 'true';
      container.innerText = isHidden ? '[ 클리커: OFF ]' : '[ 클리커: ON ]';
      container.style.color = isHidden ? '#ff3333' : '#00ffff';
    };

    updateText();

    container.addEventListener('click', () => {
      const isHidden = localStorage.getItem('hide_clicker') === 'true';
      localStorage.setItem('hide_clicker', !isHidden);
      updateText();
      
      // 클리커 UI 즉시 업데이트
      if (typeof window.refreshClickerUI === 'function') {
        window.refreshClickerUI();
      }
      
      // single.html의 버튼 상태도 있으면 동기화
      const btn = document.getElementById('btn-toggle-clicker');
      if (btn) {
        btn.innerText = !isHidden ? '🫧 클리커 보이기' : '🫧 클리커 숨기기';
        btn.style.background = !isHidden ? '#444' : '#fff';
        btn.style.color = !isHidden ? '#fff' : '#111';
      }
    });

    document.body.appendChild(container);
    window.refreshFloatingClickerBtn = updateText;
  }

  function init() {
    createAudioToggle();
    createClickerToggle();
    setupGlobalClickListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
