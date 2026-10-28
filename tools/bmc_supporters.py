"""Buy Me a Coffee 후원 내역 + 직접 입금 기록을 합쳐 static/shop/supporters.json을 만든다.

GitHub Actions(.github/workflows/supporters.yml)가 몇 시간마다 돌린다. BMC_TOKEN이 없으면 직접 입금 기록만 쓴다.
공개 저장소에 올라가므로 이메일·결제 정보는 저장하지 않는다. 비공개 후원은 이름을 "익명"으로 바꾼다.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static/shop/supporters.json"
MANUAL = ROOT / "static/shop/supporters_manual.json"
API = "https://developers.buymeacoffee.com/api/v1/supporters"


def fetch_bmc(token):
    rows, url = [], API
    while url:
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "User-Agent": "innollia-shop"})
        with urllib.request.urlopen(req, timeout=30) as r:
            page = json.load(r)
        for s in page.get("data", []):
            if s.get("is_refunded"):
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
