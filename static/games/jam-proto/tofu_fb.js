// 평가·아이디어를 Firestore 에 쌓는다 (로그인 없음). Godot 은 JavaScriptBridge.eval 로 아래 window.* 를 부른다.
// JavaScriptBridge 는 Promise 를 못 기다리므로 결과는 window.tofuLast 에 "wait" -> "ok"|"fail" 로 남긴다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyCu1xkC5vL_crDyBBujk7UpCK_MtEQ8hh0",
  authDomain: "innollia-blog.firebaseapp.com",
  projectId: "innollia-blog",
  appId: "1:435062365847:web:6cf3b416b51d9edc8753d2",
};

let db = null;
try {
  db = getFirestore(initializeApp(cfg));
} catch (e) {
  console.warn("tofu_fb: init failed", e);
}

window.tofuLast = "";

function clip(s, n) {
  return String(s == null ? "" : s).slice(0, n);
}

async function send(col, data) {
  window.tofuLast = "wait";
  try {
    if (!db) throw new Error("no db");
    // 폰 망에 따라 응답이 끝내 안 오는 때가 있어 10초면 실패로 본다
    await Promise.race([
      addDoc(collection(db, col), data),
      new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 10000)),
    ]);
    window.tofuLast = "ok";
    return true;
  } catch (e) {
    console.warn("tofu_fb: " + col + " write failed:", e && e.code ? e.code : e);
    window.tofuLast = "fail";
    return false;
  }
}

window.tofuRate = function (game, ver, stars, text, score) {
  const s = Math.max(1, Math.min(5, Math.round(Number(stars) || 0)));
  return send("megajam_ratings", {
    game: clip(game, 40),
    ver: clip(ver, 40),
    stars: s,
    text: clip(text, 500),
    score: Math.round(Number(score) || 0),
    ua: clip(navigator.userAgent, 300),
    ts: serverTimestamp(),
  });
};

window.tofuIdea = function (text, ver) {
  const t = clip(text, 2000).trim();
  if (!t) { window.tofuLast = "fail"; return Promise.resolve(false); }
  return send("megajam_ideas", {
    text: t,
    ver: clip(ver, 40),
    ua: clip(navigator.userAgent, 300),
    ts: serverTimestamp(),
  });
};

// 별 없이 한마디만: megajam_ideas 에 game 을 붙여 쌓는다 (규칙은 text 만 본다). feedback.py 가 그 게임 한마디에 합친다.
window.tofuNote = function (game, ver, text) {
  const t = clip(text, 2000).trim();
  if (!t) { window.tofuLast = "fail"; return Promise.resolve(false); }
  return send("megajam_ideas", {
    text: t,
    game: clip(game, 40),
    ver: clip(ver, 40),
    ua: clip(navigator.userAgent, 300),
    ts: serverTimestamp(),
  });
};

window.tofuAsk = function (msg) {
  try {
    const r = window.prompt(msg);
    return r == null ? "" : String(r);
  } catch (e) {
    return "";
  }
};

// ---- 아이디어 던지기 (같은 페이지 위에 HTML 창을 띄운다) ----
// Godot 메뉴의 "아이디어 던지기"가 window.mjIdeasOpen() 을 부른다. 주제는 theme.json 의 "theme" 값(빈 값이면 공개 전).
window.mjTheme = "";
window.mjThemeReady = false;
fetch("theme.json", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : {}))
  .catch(() => ({}))
  .then((j) => {
    window.mjTheme = clip((j && j.theme) || "", 200).trim();
    window.mjThemeReady = true;
    const h = document.getElementById("mj-theme");
    if (h) h.textContent = themeLine();
  });

function themeLine() {
  return window.mjTheme ? "주제: " + window.mjTheme : "주제 04:00 공개";
}

function getName() {
  try { return localStorage.getItem("mj_name") || ""; } catch (e) { return ""; }
}
function setName(v) {
  try { localStorage.setItem("mj_name", v); } catch (e) { /* 저장 못 해도 보내기는 된다 */ }
}

let unsub = null;

function buildPanel() {
  const css = document.createElement("style");
  css.textContent = `
#mj-ideas{position:fixed;inset:0;z-index:1000;display:none;flex-direction:column;background:#fff4d6;color:#3a2a1a;
  font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;}
#mj-ideas *{box-sizing:border-box;}
#mj-ideas .sq{border-radius:18px;corner-shape:squircle;}
#mj-head{padding:14px 16px 8px;font-size:22px;font-weight:800;text-align:center;}
#mj-sub{padding:0 16px 8px;font-size:14px;opacity:.6;text-align:center;}
#mj-list{flex:1;overflow-y:auto;padding:4px 12px 12px;-webkit-overflow-scrolling:touch;}
.mj-item{background:#fff;margin:8px 0;padding:10px 12px;font-size:17px;line-height:1.4;white-space:pre-wrap;word-break:break-word;}
.mj-meta{font-size:13px;opacity:.55;margin-bottom:4px;}
#mj-form{padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#efe1c4;display:flex;flex-direction:column;gap:8px;}
#mj-name{font-size:16px;padding:10px 12px;border:none;background:#fff;}
#mj-text{font-size:18px;padding:12px;border:none;background:#fff;min-height:96px;resize:none;}
#mj-row{display:flex;gap:8px;}
#mj-row button{font-size:18px;font-weight:800;border:none;padding:16px 0;}
#mj-close{flex:1;background:#fff;color:#3a2a1a;}
#mj-send{flex:2;background:#3b5bdb;color:#fff;}
#mj-send:disabled{opacity:.5;}
#mj-status{font-size:14px;text-align:center;min-height:18px;}
`;
  document.head.appendChild(css);
  const p = document.createElement("div");
  p.id = "mj-ideas";
  p.innerHTML = `
<div id="mj-head"></div>
<div id="mj-sub">팀원 모두 볼 수 있어요 · 최신순</div>
<div id="mj-list"></div>
<div id="mj-form">
  <input id="mj-name" class="sq" maxlength="20" placeholder="이름 (선택, 이 기기에 기억)" autocomplete="nickname">
  <textarea id="mj-text" class="sq" maxlength="2000" placeholder="아이디어 한 줄~몇 줄"></textarea>
  <div id="mj-status"></div>
  <div id="mj-row"><button id="mj-close" class="sq">메뉴로</button><button id="mj-send" class="sq">던지기</button></div>
</div>`;
  document.body.appendChild(p);
  // Godot 캔버스가 키·터치를 가져가지 않게 창 안 이벤트는 여기서 멈춘다
  for (const ev of ["keydown", "keyup", "keypress", "pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "wheel"]) {
    p.addEventListener(ev, (e) => e.stopPropagation());
  }
  const name = p.querySelector("#mj-name");
  name.value = getName();
  name.addEventListener("change", () => setName(name.value.trim()));
  p.querySelector("#mj-close").addEventListener("click", () => window.mjIdeasClose());
  p.querySelector("#mj-send").addEventListener("click", sendIdea);
  return p;
}

async function sendIdea() {
  const p = document.getElementById("mj-ideas");
  const btn = p.querySelector("#mj-send");
  const st = p.querySelector("#mj-status");
  const t = clip(p.querySelector("#mj-text").value, 2000).trim();
  if (!t) { st.textContent = "아이디어를 적어 주세요"; return; }
  const n = clip(p.querySelector("#mj-name").value, 20).trim();
  setName(n);
  btn.disabled = true;
  st.textContent = "보내는 중";
  const ok = await send("megajam_ideas", {
    name: n,
    text: t,
    game: window.mjTheme ? "theme" : null,
    ua: clip(navigator.userAgent, 300),
    ts: serverTimestamp(),
  });
  btn.disabled = false;
  if (ok) { p.querySelector("#mj-text").value = ""; st.textContent = "던졌어요!"; }
  else { st.textContent = "저장 안 됨 · 다시 눌러 주세요"; }
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function when(ts) {
  try {
    const d = ts.toDate();
    return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) { return "방금"; }
}

function listen() {
  const list = document.getElementById("mj-list");
  if (!db) { list.textContent = "목록을 못 불러옴"; return; }
  const q = query(collection(db, "megajam_ideas"), orderBy("ts", "desc"), limit(100));
  unsub = onSnapshot(q, (snap) => {
    const rows = [];
    snap.forEach((doc) => {
      const d = doc.data();
      if (d.game && d.game !== "theme") return; // 게임별 한마디는 여기 안 보인다
      if (String(d.name || "").startsWith("회의")) return; // 폐기된 AI 회의 아이디어
      rows.push(`<div class="mj-item sq"><div class="mj-meta">${esc(d.name || "이름 없음")} · ${when(d.ts)}</div>${esc(d.text || "")}</div>`);
    });
    list.innerHTML = rows.length ? rows.join("") : '<div class="mj-item sq">아직 아이디어가 없어요. 첫 아이디어를 던져 주세요.</div>';
  }, () => { list.textContent = "목록을 못 불러옴"; });
}

window.mjIdeasOpen = function () {
  const p = document.getElementById("mj-ideas") || buildPanel();
  p.querySelector("#mj-head").textContent = themeLine();
  p.querySelector("#mj-status").textContent = "";
  p.style.display = "flex";
  window.mjIdeasShown = true;
  if (!unsub) listen();
};

window.mjIdeasClose = function () {
  const p = document.getElementById("mj-ideas");
  if (p) p.style.display = "none";
  window.mjIdeasShown = false;
  if (unsub) { unsub(); unsub = null; }
  const c = document.querySelector("canvas");
  if (c) c.focus();
};
