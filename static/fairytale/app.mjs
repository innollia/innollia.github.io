import { generateMarkovStory, loadStore } from "./engine.mjs";

const ICO = {
  copy: '<svg class="ico" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check: '<svg class="ico" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
};

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function initMarkovApp({ lang, dataBaseUrl, strings }) {
  const $ = (s) => document.querySelector(s);

  const seedInput = $("#seed-input");
  const orderRange = $("#order-range");
  const orderVal = $("#order-val");
  const sentRange = $("#sent-range");
  const sentVal = $("#sent-val");
  const modeSelect = $("#mode-select");
  const scopeSelect = $("#scope-select");
  const genBtn = $("#generate-btn");
  const shuffleBtn = $("#random-seed-btn");
  const copyBtn = $("#copy-btn");
  const browseBtn = $("#browse-btn");

  const titleEl = $("#story-title");
  const bodyEl = $("#story-body");
  const usedListEl = $("#used-list");

  const floatTip = $("#float-tip");
  const modal = $("#reader-modal");
  const modalTitle = $("#modal-title");
  const modalTabs = $("#modal-tabs");
  const modalSearch = $("#modal-search");
  const modalSearchInput = $("#modal-search-input");
  const modalBody = $("#modal-body");

  let currentStory = null;

  function showTip(text, x, y) {
    if (!text) return;
    floatTip.textContent = text;
    floatTip.classList.add("show");
    const pad = 12;
    const rect = floatTip.getBoundingClientRect();
    let left = x + 12;
    let top = y - rect.height - 12;
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
    if (left < pad) left = pad;
    if (top < pad) top = y + 18;
    floatTip.style.left = `${left}px`;
    floatTip.style.top = `${top}px`;
  }

  function hideTip() {
    floatTip.classList.remove("show");
  }

  // Global floating tooltip for .term elements (never clips offscreen)
  document.addEventListener("mousemove", (e) => {
    const termEl = e.target.closest(".term");
    if (termEl && termEl.dataset.tip) {
      showTip(termEl.dataset.tip, e.clientX, e.clientY);
      return;
    }
    const sp = e.target.closest(".src-span");
    if (sp && sp.dataset.tip) {
      showTip(sp.dataset.tip, e.clientX, e.clientY);
      return;
    }
    hideTip();
  });

  function formatSourceTip(span) {
    if (span.origin === "common") return strings.tipCommon(span.total_sources);
    if (span.origin === "blend") return strings.tipBlend;
    if (!span.sources || !span.sources.length) return "";
    const extra = (span.total_sources || span.sources.length) - span.sources.length;
    const names = span.sources.join(", ");
    return extra > 0 ? strings.tipSourceMore(names, extra) : strings.tipSource(names);
  }

  function renderProvenance(prov) {
    return prov.paragraphs.map((spans) => {
      const inner = spans.map((sp) => {
        if (sp.origin === "plain") return esc(sp.text);
        const tip = formatSourceTip(sp);
        const srcs = (sp.sources || []).join("||");
        return `<span class="src-span origin-${esc(sp.origin)}" data-tip="${esc(tip)}" data-sources="${esc(srcs)}">${esc(sp.text)}</span>`;
      }).join("");
      return `<p>${inner}</p>`;
    }).join("");
  }

  function highlightNeedle(text, needle) {
    const clean = (needle || "").replace(/^[.,!?;:"'“”‘’]+|[.,!?;:"'“”‘’]+$/g, "").trim();
    if (!clean || clean.length < 2) return esc(text);
    const idx = text.toLowerCase().indexOf(clean.toLowerCase());
    if (idx === -1) return esc(text);
    return (
      esc(text.slice(0, idx)) +
      `<mark>${esc(text.slice(idx, idx + clean.length))}</mark>` +
      esc(text.slice(idx + clean.length))
    );
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  $("#modal-close-btn").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });

  async function renderTaleInModal(title, needle) {
    modalTitle.textContent = title;
    modalSearch.classList.add("hidden");
    modalBody.innerHTML = `<p style="color:var(--muted)">${esc(strings.loading)}</p>`;
    const scope = scopeSelect ? scopeSelect.value : "all";
    const store = await loadStore(lang, dataBaseUrl, scope);
    let tale = store.taleMap.get(title);
    if (!tale && scope !== "all") {
      const fullStore = await loadStore(lang, dataBaseUrl, "all");
      tale = fullStore.taleMap.get(title);
    }
    if (!tale) {
      modalBody.innerHTML = `<p style="color:var(--danger)">${esc(strings.notFound)}</p>`;
      return;
    }
    modalTitle.textContent = tale.t;
    modalBody.innerHTML = tale.p.map((p) => `<p>${highlightNeedle(p, needle)}</p>`).join("");
    const mark = modalBody.querySelector("mark");
    if (mark) mark.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function openTaleReader(titles, needle) {
    modal.classList.remove("hidden");
    modalSearch.classList.add("hidden");
    if (titles.length > 1) {
      modalTabs.classList.remove("hidden");
      modalTabs.innerHTML = titles.map((t, i) =>
        `<button class="modal-tab${i === 0 ? " active" : ""}" data-title="${esc(t)}">${esc(t)}</button>`
      ).join("");
      modalTabs.querySelectorAll(".modal-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
          modalTabs.querySelectorAll(".modal-tab").forEach((b) => b.classList.toggle("active", b === btn));
          renderTaleInModal(btn.dataset.title, needle);
        });
      });
    } else {
      modalTabs.classList.add("hidden");
      modalTabs.innerHTML = "";
    }
    renderTaleInModal(titles[0], needle);
  }

  async function openCatalogModal() {
    modal.classList.remove("hidden");
    modalTabs.classList.add("hidden");
    modalSearch.classList.remove("hidden");
    modalSearchInput.value = "";
    const scope = scopeSelect ? scopeSelect.value : "all";
    const store = await loadStore(lang, dataBaseUrl, scope);
    modalTitle.textContent = strings.catalogTitle(store.titles.length);

    function draw(q = "") {
      const kw = q.trim().toLowerCase();
      const list = kw ? store.titles.filter((t) => t.toLowerCase().includes(kw)) : store.titles;
      modalBody.innerHTML = `<div class="catalog-grid">${
        list.map((t) => `<span class="used-chip" data-title="${esc(t)}">${esc(t)}</span>`).join("") ||
        `<span style="color:var(--muted)">${esc(strings.noMatch)}</span>`
      }</div>`;
      modalBody.querySelectorAll(".used-chip").forEach((el) => {
        el.addEventListener("click", () => openTaleReader([el.dataset.title], ""));
      });
    }
    draw();
    modalSearchInput.oninput = () => draw(modalSearchInput.value);
    modalSearchInput.focus();
  }

  bodyEl.addEventListener("click", (e) => {
    const sp = e.target.closest(".src-span.origin-corpus");
    if (!sp) return;
    const srcs = (sp.dataset.sources || "").split("||").filter(Boolean);
    if (srcs.length) {
      hideTip();
      openTaleReader(srcs, sp.textContent.trim());
    }
  });

  function renderUsedList(usedTales) {
    if (!usedTales.length) {
      usedListEl.innerHTML = `<span class="side-note">-</span>`;
      return;
    }
    usedListEl.innerHTML = usedTales
      .map((t) => `<span class="used-chip" data-title="${esc(t)}">${esc(t)}</span>`)
      .join("");

    usedListEl.querySelectorAll(".used-chip").forEach((chip) => {
      const title = chip.dataset.title;
      chip.addEventListener("mouseenter", () => {
        bodyEl.querySelectorAll(".src-span.origin-corpus").forEach((sp) => {
          if ((sp.dataset.sources || "").split("||").includes(title)) sp.classList.add("highlighted");
        });
      });
      chip.addEventListener("mouseleave", () => {
        bodyEl.querySelectorAll(".src-span.highlighted").forEach((sp) => sp.classList.remove("highlighted"));
      });
      chip.addEventListener("click", () => openTaleReader([title], ""));
    });
  }

  async function generate() {
    genBtn.disabled = true;
    titleEl.textContent = strings.generating;
    bodyEl.innerHTML = `<div class="status">${esc(strings.generating)}</div>`;

    try {
      const story = await generateMarkovStory({
        lang,
        dataBaseUrl,
        seed: parseInt(seedInput.value, 10) || 42,
        order: parseInt(orderRange.value, 10) || 2,
        sentences: parseInt(sentRange.value, 10) || 8,
        mode: modeSelect ? modeSelect.value : "eojeol",
        scope: scopeSelect ? scopeSelect.value : "all",
      });
      currentStory = story;
      titleEl.textContent = story.title;
      bodyEl.innerHTML = renderProvenance(story.provenance);
      renderUsedList(story.provenance.used_tales);
    } catch (e) {
      titleEl.textContent = strings.errorTitle;
      bodyEl.innerHTML = `<div class="status" style="color:var(--danger)">${esc(e.message)}</div>`;
    } finally {
      genBtn.disabled = false;
    }
  }

  orderRange.addEventListener("input", () => { orderVal.textContent = orderRange.value; });
  orderRange.addEventListener("change", generate);
  sentRange.addEventListener("input", () => { sentVal.textContent = sentRange.value; });
  sentRange.addEventListener("change", generate);
  if (modeSelect) modeSelect.addEventListener("change", generate);
  if (scopeSelect) scopeSelect.addEventListener("change", generate);

  shuffleBtn.addEventListener("click", () => {
    seedInput.value = Math.floor(Math.random() * 100000);
    generate();
  });
  genBtn.addEventListener("click", () => {
    seedInput.value = Math.floor(Math.random() * 100000);
    generate();
  });
  seedInput.addEventListener("keydown", (e) => { if (e.key === "Enter") generate(); });

  copyBtn.addEventListener("click", async () => {
    if (!currentStory) return;
    try {
      await navigator.clipboard.writeText(`${currentStory.title}\n\n${currentStory.text}`);
      copyBtn.innerHTML = ICO.check;
      setTimeout(() => { copyBtn.innerHTML = ICO.copy; }, 1200);
    } catch {}
  });

  browseBtn.addEventListener("click", openCatalogModal);

  generate();
}
