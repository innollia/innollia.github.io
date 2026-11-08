"""Buy Me a Coffee 후원 내역 + 직접 입금 기록을 합쳐 static/shop/supporters.json을 만든다.

GitHub Actions(.github/workflows/supporters.yml)가 몇 시간마다 돌린다. BMC_TOKEN이 없으면 직접 입금 기록만 쓴다.
공개 저장소에 올라가므로 이메일·결제 정보는 저장하지 않는다. 비공개 후원은 이름을 "익명"으로 바꾼다.
"""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static/shop/supporters.json"
MANUAL = ROOT / "static/shop/supporters_manual.json"
API = "https://developers.buymeacoffee.com/api/v1/supporters"
# olmuse 크레딧 구매 코드: 예전 SD-XXXXXX(하이픈·공백 빠짐 허용)와 단어 코드(형용사-명사-명사, 예 brave-otter-lamp).
# 단어장은 rainbowloadsilsep/deploy/credits/words_en.txt 의 사본이다(단어장을 바꾸면 이것도 같이 바꾼다).
CREDIT = re.compile(r"(?<![A-Za-z0-9])SD[\s\-_]*[A-Za-z0-9]{3}[\s\-]?[A-Za-z0-9]{3}(?![A-Za-z0-9])", re.IGNORECASE)
WORDS_FILE = Path(__file__).with_name("olmuse_code_words.txt")


def code_words():
    out, part = {}, None
    for line in WORDS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("["):
            part = out.setdefault(line.strip("[]"), set())
        elif line and not line.startswith("#") and part is not None:
            part.update(line.split())
    return out.get("adjectives", set()), out.get("nouns", set())


ADJ, NOUN = code_words()


def has_credit_code(note):
    """메모에 olmuse 결제 코드가 있는가. 단어 코드는 공백·하이픈·대소문자·붙여 쓰기와 상관없이 알아본다."""
    if CREDIT.search(note):
        return True
    tokens = re.findall(r"[a-z]+", note.lower())
    joined, edges, at = "".join(tokens), {0}, 0
    for t in tokens:  # 코드는 낱말 경계에서 시작하고 끝난다(붙여 쓴 것은 허용)
        at += len(t)
        edges.add(at)
    for i in sorted(edges):
        for a in (w for w in ADJ if joined.startswith(w, i)):
            j = i + len(a)
            for n1 in (w for w in NOUN if joined.startswith(w, j)):
                k = j + len(n1)
                if any(joined.startswith(n2, k) and k + len(n2) in edges for n2 in NOUN):
                    return True
    return False


def fetch_bmc(token):
    rows, url = [], API
    while url:
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "User-Agent": "innollia-shop"})
        with urllib.request.urlopen(req, timeout=30) as r:
            page = json.load(r)
        for s in page.get("data", []):
            # olmuse 크레딧 구매(메모에 결제 코드)는 후원이 아니다
            if s.get("is_refunded") or has_credit_code(s.get("support_note") or ""):
                continue
            public = str(s.get("support_visibility", 1)) == "1"
            name = (s.get("supporter_name") or "").strip()
            rows.append({
                "name": name if public and name and name != "Someone" else "익명",
                "amount": round(float(s.get("support_coffees") or 1) * float(s.get("support_coffee_price") or 0), 2),
                "currency": s.get("support_currency") or "USD",
                "note": (s.get("support_note") or "").strip()[:80] if public else "",
                "date": (s.get("support_created_on") or "")[:10],
                "source": "bmc",
            })
        url = page.get("next_page_url")
    return rows


def main():
    manual = json.loads(MANUAL.read_text(encoding="utf-8")) if MANUAL.exists() else []
    token = os.environ.get("BMC_TOKEN", "").strip()
    if not token:
        print("BMC_TOKEN 없음: 직접 입금 기록만 씀")
        bmc = []
    else:
        bmc = fetch_bmc(token)
        print(f"BMC 후원 {len(bmc)}건")
    rows = sorted(manual + bmc, key=lambda r: r.get("date", ""), reverse=True)
    text = json.dumps(rows, ensure_ascii=False, indent=1) + "\n"
    if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
        OUT.write_text(text, encoding="utf-8")
        print("supporters.json 갱신")


if __name__ == "__main__":
    sys.exit(main())
