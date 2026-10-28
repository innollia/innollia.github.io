// 글 이어쓰기(댓글): Google 로그인 + 닉네임 + Firestore
// 댓글은 본문 바로 아래에 "본문의 일부"처럼 이어지되, 왼쪽 점선과 닉네임으로 구분된다.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDoc,
  writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const root = document.getElementById("cm-root");
if (root) init(root);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function init(root) {
  const cfg = {
    apiKey: root.dataset.apiKey,
    authDomain: root.dataset.authDomain,
    projectId: root.dataset.projectId,
    appId: root.dataset.appId,
  };
  const postId = root.dataset.post;
  const list = root.querySelector(".cm-list");
  const bar = root.querySelector(".cm-bar");
  const countEl = document.querySelector(".cm-count") || document.createElement("span");

  if (!cfg.apiKey || !cfg.projectId) {
    bar.textContent = "댓글 기능 준비 중입니다. (Firebase 설정 필요)";
    return;
  }

  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let user = null;
  let nick = null;
  let docs = [];

  function render() {
    list.replaceChildren();
    const sorted = docs.slice().sort((a, b) => (a.t || 0) - (b.t || 0));
    countEl.textContent = sorted.length ? "(" + sorted.length + ")" : "";
    sorted.forEach((c) => {
      const row = el("div", "cm-item");
      const head = el("span", "cm-nick", c.nick);
      const date = el("span", "cm-date", c.t ? new Date(c.t).toLocaleString("ko-KR") : "방금");
      row.append(head, date);
      if (user && c.uid === user.uid) {
        const del = el("button", "cm-del", "삭제");
        del.type = "button";
        del.addEventListener("click", async () => {
          if (confirm("이 덧붙임을 지울까요?")) await deleteDoc(doc(db, "comments", c.id));
        });
        row.append(del);
      }
      row.append(el("div", "cm-text", c.text));
      list.append(row);
    });
  }

  onSnapshot(query(collection(db, "comments"), where("postId", "==", postId)), (snap) => {
    docs = snap.docs.map((d) => {
      const v = d.data();
      return { id: d.id, uid: v.uid, nick: v.nick, text: v.text, t: v.createdAt ? v.createdAt.toMillis() : 0 };
    });
    render();
  }, () => { bar.textContent = "댓글을 불러오지 못했습니다."; });

  function drawBar() {
    bar.replaceChildren();
    if (!user) {
      const b = el("button", "cm-btn", "Google 로그인");
      b.type = "button";
      b.addEventListener("click", () => signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {}));
      bar.append(el("span", "cm-hint", "이어 쓰려면 로그인하세요. "), b);
      return;
    }
    if (!nick) {
      const input = el("input", "cm-input");
      input.placeholder = "닉네임 (2~16자, 한글/영문/숫자/_/-)";
      input.maxLength = 16;
      const ok = el("button", "cm-btn", "닉네임 정하기");
      ok.type = "button";
      const msg = el("span", "cm-hint");
      ok.addEventListener("click", async () => {
        const n = input.value.trim();
        if (!/^[0-9A-Za-z가-힣_-]{2,16}$/.test(n)) { msg.textContent = " 형식이 맞지 않습니다."; return; }
        const key = n.toLowerCase();
        try {
          const batch = writeBatch(db);
          batch.set(doc(db, "nicks", key), { uid: user.uid });
          batch.set(doc(db, "users", user.uid), { nick: n });
          await batch.commit();
          nick = n;
          drawBar();
        } catch (e) {
          msg.textContent = " 이미 쓰는 닉네임이거나 저장에 실패했습니다.";
        }
      });
      bar.append(el("span", "cm-hint", "닉네임을 정해야 쓸 수 있습니다. (한 번 정하면 못 바꿉니다) "), input, ok, msg);
      return;
    }
    const ta = el("textarea", "cm-textarea");
    ta.placeholder = "이어서 쓰기…";
    ta.maxLength = 1000;
    ta.rows = 3;
    const send = el("button", "cm-btn", "덧붙이기");
    send.type = "button";
    send.addEventListener("click", async () => {
      const text = ta.value.trim();
      if (!text) return;
      send.disabled = true;
      try {
        await addDoc(collection(db, "comments"), {
          postId, uid: user.uid, nick, text, createdAt: serverTimestamp(),
        });
        ta.value = "";
      } catch (e) {
        alert("등록에 실패했습니다.");
      }
      send.disabled = false;
    });
    const out = el("button", "cm-link", "로그아웃");
    out.type = "button";
    out.addEventListener("click", () => signOut(auth));
    const who = el("div", "cm-who");
    who.append(el("span", null, "[" + nick + "] 으로 쓰는 중 "), out);
    bar.append(who, ta, send);
  }

  onAuthStateChanged(auth, async (u) => {
    user = u;
    nick = null;
    if (u) {
      try {
        const s = await getDoc(doc(db, "users", u.uid));
        if (s.exists()) nick = s.data().nick;
      } catch (e) {}
    }
    drawBar();
    render();
  });
}
