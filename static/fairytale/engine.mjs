// Pure client-side Fairy Tale Markov Chain engine + phrase provenance index.

const BOS = "\u0002";
const EOS = "\u0003";

const KO_JOSA_LIST = [
  "에서는", "으로는", "에게는", "한테서", "까지는", "부터는",
  "에서", "으로", "에게", "한테", "까지", "부터", "처럼", "보다", "마저", "조차",
  "은", "는", "이", "가", "을", "를", "의", "에", "로", "와", "과", "도", "만",
];
const JOSA_PREFIX = "\u001f";
const EN_NO_SPACE = new Set([".", ",", "!", "?", ";", ":"]);
const WORD_RE = /[가-힣A-Za-z0-9']+/g;

function mulberry32(seed) {
  let a = (seed | 0) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hasBatchim(word) {
  for (let i = word.length - 1; i >= 0; i--) {
    const code = word.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  }
  return false;
}

function hasRieul(word) {
  for (let i = word.length - 1; i >= 0; i--) {
    const code = word.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 8;
  }
  return false;
}

function adjustJosa(stem, josa) {
  const b = hasBatchim(stem);
  if (josa === "은" || josa === "는") return b ? "은" : "는";
  if (josa === "이" || josa === "가") return b ? "이" : "가";
  if (josa === "을" || josa === "를") return b ? "을" : "를";
  if (josa === "와" || josa === "과") return b ? "과" : "와";
  if (josa === "으로" || josa === "로") return b && !hasRieul(stem) ? "으로" : "로";
  return josa;
}

function tokenizeKo(sent, mode) {
  const words = sent.split(/\s+/).filter(Boolean);
  if (mode === "eojeol") return words;
  const out = [];
  for (const w of words) {
    const m = w.match(/^([가-힣]+)([.,!?;:"'”’)]*)$/);
    if (m && m[1].length >= 2) {
      const core = m[1];
      const punct = m[2] || "";
      let split = false;
      for (const j of KO_JOSA_LIST) {
        if (core.length - j.length >= 1 && core.endsWith(j)) {
          out.push(core.slice(0, core.length - j.length));
          out.push(JOSA_PREFIX + j + punct);
          split = true;
          break;
        }
      }
      if (!split) out.push(w);
    } else {
      out.push(w);
    }
  }
  return out;
}

function detokenizeKo(tokens, mode) {
  if (!tokens.length) return "";
  let text;
  if (mode === "eojeol") {
    text = tokens.join(" ");
  } else {
    const parts = [];
    for (const tok of tokens) {
      if (tok.startsWith(JOSA_PREFIX) && parts.length) {
        const raw = tok.slice(1);
        const m = raw.match(/^([가-힣]+)(.*)$/);
        if (m) {
          parts[parts.length - 1] += adjustJosa(parts[parts.length - 1], m[1]) + (m[2] || "");
        } else {
          parts[parts.length - 1] += raw;
        }
      } else {
        parts.push(tok.startsWith(JOSA_PREFIX) ? tok.slice(1) : tok);
      }
    }
    text = parts.join(" ");
  }
  text = text.replace(/\s+([.,!?])/g, "$1").trim();
  if (text && !/[.!?]$/.test(text)) text += ".";
  return text;
}

function splitKoSentences(paragraphs) {
  const out = [];
  for (const p of paragraphs) {
    const clean = p.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    for (let s of clean.split(/(?<=[.!?])\s+/)) {
      s = s.trim();
      if (s.length < 10 || !/[가-힣]/.test(s)) continue;
      if ((s.match(/"/g) || []).length % 2 !== 0) s = s.replace(/"/g, "");
      if ((s.match(/“/g) || []).length !== (s.match(/”/g) || []).length) s = s.replace(/[“”]/g, "");
      out.push(s);
    }
  }
  return out;
}

function splitEnSentences(paragraphs) {
  const out = [];
  for (const p of paragraphs) {
    let clean = p
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/_/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) continue;
    clean = clean.replace(/\b(Mr|Mrs|Ms|Dr|St|Prof|Sr|Jr)\./gi, "$1<DOT>");
    for (let s of clean.split(/(?<=[.!?])\s+/)) {
      s = s.replace(/<DOT>/g, ".").replace(/"/g, "").trim();
      if (s.length >= 20 && s.length <= 280 && /[A-Za-z]/.test(s)) out.push(s);
    }
  }
  return out;
}

function tokenizeEn(sent) {
  return sent.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?|[.,!?;:]/g) || [];
}

function detokenizeEn(tokens) {
  if (!tokens.length) return "";
  let out = "";
  for (const tok of tokens) {
    if (out && !EN_NO_SPACE.has(tok)) out += " ";
    out += tok;
  }
  out = out.trim();
  if (out) {
    out = out[0].toUpperCase() + out.slice(1);
    out = out.replace(/\bi\b/g, "I");
    if (!/[.!?]$/.test(out)) out += ".";
  }
  return out;
}

class MarkovChain {
  constructor(tokenizedSents, order) {
    this.order = order;
    this.tables = Array.from({ length: order + 1 }, () => new Map());
    for (const toks of tokenizedSents) {
      if (toks.length < 3) continue;
      for (let k = 1; k <= order; k++) {
        const tbl = this.tables[k];
        const padded = Array(k).fill(BOS).concat(toks, [EOS]);
        for (let i = 0; i < padded.length - k; i++) {
          const key = padded.slice(i, i + k).join("\u0001");
          let map = tbl.get(key);
          if (!map) {
            map = new Map();
            tbl.set(key, map);
          }
          const nxt = padded[i + k];
          map.set(nxt, (map.get(nxt) || 0) + 1);
        }
      }
    }
  }

  pick(map, rng) {
    let total = 0;
    for (const cnt of map.values()) total += cnt;
    let r = rng() * total;
    for (const [tok, cnt] of map.entries()) {
      r -= cnt;
      if (r <= 0) return tok;
    }
    return map.keys().next().value;
  }

  sampleSentence(rng, maxTokens = 40) {
    let lastOut = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      const history = Array(this.order).fill(BOS);
      const out = [];
      let finished = false;
      for (let step = 0; step < maxTokens; step++) {
        let map = null;
        for (let k = this.order; k >= 1; k--) {
          const key = history.slice(-k).join("\u0001");
          const cand = this.tables[k].get(key);
          if (cand && cand.size) {
            map = cand;
            break;
          }
        }
        if (!map) break;
        const nxt = this.pick(map, rng);
        if (nxt === EOS) {
          finished = true;
          break;
        }
        out.push(nxt);
        history.push(nxt);
      }
      lastOut = out;
      if (finished && out.length >= 4) return out;
    }
    return lastOut;
  }
}

class CorpusStore {
  constructor(lang, tales) {
    this.lang = lang;
    this.tales = tales;
    this.titles = tales.map((x) => x.t);
    this.taleMap = new Map();
    tales.forEach((x) => {
      if (!this.taleMap.has(x.t)) this.taleMap.set(x.t, x);
    });

    this.allSents = [];
    for (const tale of tales) {
      const sents = lang === "ko" ? splitKoSentences(tale.p) : splitEnSentences(tale.p);
      for (const s of sents) this.allSents.push(s);
    }

    this.titleMap = new Map();
    for (const title of this.titles) {
      const words = title.trim().split(/\s+/).filter(Boolean);
      if (words.length < 2) continue;
      const seq = [BOS, ...words, EOS];
      for (let i = 0; i < seq.length - 1; i++) {
        let arr = this.titleMap.get(seq[i]);
        if (!arr) {
          arr = [];
          this.titleMap.set(seq[i], arr);
        }
        arr.push(seq[i + 1]);
      }
    }

    this.bigramTales = new Map();
    this.unigramTales = new Map();
    for (let idx = 0; idx < tales.length; idx++) {
      const text = tales[idx].p.join(" ").toLowerCase();
      const words = text.match(WORD_RE) || [];
      for (let i = 0; i < words.length; i++) {
        let uset = this.unigramTales.get(words[i]);
        if (!uset) {
          uset = new Set();
          this.unigramTales.set(words[i], uset);
        }
        uset.add(idx);
        if (i + 1 < words.length) {
          const bk = words[i] + "\u0001" + words[i + 1];
          let bset = this.bigramTales.get(bk);
          if (!bset) {
            bset = new Set();
            this.bigramTales.set(bk, bset);
          }
          bset.add(idx);
        }
      }
    }

    this.chainCache = new Map();
  }

  getChain(order, mode) {
    const key = `${order}:${mode}`;
    if (!this.chainCache.has(key)) {
      const tokSents = this.lang === "ko"
        ? this.allSents.map((s) => tokenizeKo(s, mode))
        : this.allSents.map(tokenizeEn);
      this.chainCache.set(key, new MarkovChain(tokSents, order));
    }
    return this.chainCache.get(key);
  }

  generateTitle(rng) {
    for (let attempt = 0; attempt < 10; attempt++) {
      let cur = BOS;
      const words = [];
      for (let step = 0; step < 5; step++) {
        const arr = this.titleMap.get(cur);
        if (!arr || !arr.length) break;
        const nxt = arr[Math.floor(rng() * arr.length)];
        if (nxt === EOS) break;
        words.push(nxt);
        cur = nxt;
      }
      if (words.length >= 2) return words.join(" ");
    }
    return this.titles[Math.floor(rng() * this.titles.length)];
  }

  titlesFromIds(idSet, limit = 4) {
    const out = [];
    const seen = new Set();
    for (const idx of idSet) {
      const title = this.titles[idx];
      if (!seen.has(title)) {
        seen.add(title);
        out.push(title);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  annotate(text) {
    const rawParas = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
    const paragraphs = [];
    const weights = new Map();

    for (const para of rawParas) {
      const matches = Array.from(para.matchAll(WORD_RE));
      const words = matches.map((m) => m[0].toLowerCase());
      const n = words.length;
      const spans = [];
      let cursor = 0;
      let i = 0;

      while (i < n) {
        let bestEnd = i;
        let bestIds = null;

        if (i + 1 < n) {
          const cand = this.bigramTales.get(words[i] + "\u0001" + words[i + 1]);
          if (cand && cand.size) {
            let cur = new Set(cand);
            let j = i + 1;
            while (j + 1 < n) {
              const nxt = this.bigramTales.get(words[j] + "\u0001" + words[j + 1]);
              if (!nxt) break;
              const inter = new Set();
              for (const id of cur) {
                if (nxt.has(id)) inter.add(id);
              }
              if (!inter.size) break;
              cur = inter;
              j++;
            }
            bestEnd = j;
            bestIds = cur;
          }
        }

        if (bestEnd > i && bestIds && bestIds.size) {
          const startChar = matches[i].index;
          let endChar = matches[bestEnd].index + matches[bestEnd][0].length;
          while (endChar < para.length && '.,!?;:"\'”’)]'.includes(para[endChar])) endChar++;
          if (startChar > cursor) spans.push({ text: para.slice(cursor, startChar), sources: [], origin: "plain" });
          const titles = this.titlesFromIds(bestIds, 4);
          const uniqueCount = new Set(Array.from(bestIds, (id) => this.titles[id])).size;
          spans.push({
            text: para.slice(startChar, endChar),
            sources: titles,
            total_sources: uniqueCount,
            origin: "corpus",
          });
          const w = (bestEnd - i + 1) / Math.max(1, uniqueCount);
          for (const t of titles.slice(0, 2)) weights.set(t, (weights.get(t) || 0) + w);
          cursor = endChar;
          i = bestEnd + 1;
        } else {
          const startChar = matches[i].index;
          let endChar = startChar + matches[i][0].length;
          while (endChar < para.length && '.,!?;:"\'”’)]'.includes(para[endChar])) endChar++;
          if (startChar > cursor) spans.push({ text: para.slice(cursor, startChar), sources: [], origin: "plain" });

          const uni = this.unigramTales.get(words[i]);
          if (uni && uni.size >= 1 && uni.size <= 3) {
            const titles = this.titlesFromIds(uni, 3);
            spans.push({
              text: para.slice(startChar, endChar),
              sources: titles,
              total_sources: titles.length,
              origin: "corpus",
            });
            for (const t of titles) weights.set(t, (weights.get(t) || 0) + 0.5);
          } else if (uni && uni.size >= 4) {
            spans.push({
              text: para.slice(startChar, endChar),
              sources: [],
              total_sources: uni.size,
              origin: "common",
            });
          } else {
            spans.push({
              text: para.slice(startChar, endChar),
              sources: [],
              total_sources: 0,
              origin: "blend",
            });
          }
          cursor = endChar;
          i++;
        }
      }

      if (cursor < para.length) spans.push({ text: para.slice(cursor), sources: [], origin: "plain" });
      paragraphs.push(spans);
    }

    const used_tales = Array.from(weights.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map((x) => x[0]);

    return { paragraphs, used_tales };
  }
}

const rawCache = new Map();
const storeCache = new Map();

export async function loadStore(lang, dataBaseUrl, scope = "all") {
  const effectiveScope = lang === "ko" && scope === "korean" ? "korean" : "all";
  const key = `${lang}:${effectiveScope}`;
  if (storeCache.has(key)) return storeCache.get(key);
  let tales = rawCache.get(lang);
  if (!tales) {
    const res = await fetch(`${dataBaseUrl}/${lang}.json`);
    if (!res.ok) throw new Error(`Failed to load corpus (${res.status})`);
    tales = await res.json();
    rawCache.set(lang, tales);
  }
  const filtered = effectiveScope === "korean" ? tales.filter((x) => x.o === "korean") : tales;
  const store = new CorpusStore(lang, filtered);
  storeCache.set(key, store);
  return store;
}

export async function generateMarkovStory({ lang, dataBaseUrl, seed, order, sentences, mode = "eojeol", scope = "all" }) {
  const store = await loadStore(lang, dataBaseUrl, scope);
  const rng = mulberry32(seed);
  const chain = store.getChain(order, mode);
  const detok = (toks) => (lang === "ko" ? detokenizeKo(toks, mode) : detokenizeEn(toks));

  const sents = [];
  for (let i = 0; i < sentences; i++) {
    const s = detok(chain.sampleSentence(rng));
    if (s) sents.push(s);
  }
  const perPara = Math.max(2, Math.ceil(sents.length / 3));
  const paras = [];
  for (let i = 0; i < sents.length; i += perPara) {
    paras.push(sents.slice(i, i + perPara).join(" "));
  }
  const text = paras.join("\n\n");
  const title = store.generateTitle(rng);
  const provenance = store.annotate(text);

  return { lang, seed, title, text, provenance };
}
