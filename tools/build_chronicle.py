"""쇠판(노션)의 새 메모를 메모 연대기에 합친다(배포 때 Actions가 실행, 결과물은 git에 넣지 않는다).

사용법: CHRONICLE_NOTION_TOKEN=... python tools/build_chronicle.py
입력: static/chronicle/data.json (2026-09-27에 굳힌 739편)
결과: 같은 파일에 새 메모를 더해 덮어쓴다. 노션은 읽기만 한다.

노션의 `블로그` 칸이 공개/봉인인 메모만 들어간다. 빈칸은 비공개다.
규칙과 이유는 docs/chronicle-notion.md에 있다.
"""
import hashlib, json, os, re, sys, time, urllib.error, urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA = Path('static/chronicle/data.json')
LEDGER_ID = '71a71dc7-ed3b-4ea0-a8a9-baac564af728'
RECORD_ID = '014d0ac7-ed2c-4aff-8e55-2991b58af391'
API = 'https://api.notion.com/v1'
NOTION_VERSION = '2026-03-11'
PUBLIC, SEALED = '공개', '봉인'
RETRIES = 6
# 스냅샷에 든 마지막 메모의 다음 날. 이 앞의 글은 스냅샷이 맡으므로 다시 넣지 않는다
CUTOFF = '2026-09-27T00:00'
KST = timezone(timedelta(hours=9))
TOPIC = {'공부': '공부·지식', '입시': '공부·지식', '자기이해': '생각', '질문': '생각', '아이디어': '생각', '생활': '일상'}
# 서명이 든 주소는 공개 페이지에 남기지 않는다
IMAGE = re.compile(r'!\[[^\]]*\]\([^)]*\)')
SIGNED = re.compile(r'https?://(?:cdn\.discordapp\.com|media\.discordapp\.net|[\w.-]*amazonaws\.com|file\.notion\.so)/\S*')


def to_kst(value):
    """노션 날짜를 연대기 시각 형식(KST, 분까지)으로"""
    if not value:
        return ''
    if len(value) == 10:
        return value + 'T00:00'
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(KST).strftime('%Y-%m-%dT%H:%M')


def clean(text):
    text = SIGNED.sub('', IMAGE.sub('', text or ''))
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def combine(prop, block):
    """`원문` 칸과 본문을 합친다. 포럼 동기화의 combineRecordBody와 같은 규칙"""
    prop, block = (prop or '').strip(), (block or '').strip()
    if not prop or not block:
        return prop or block
    a, b = (re.sub(r'\s+', '', s) for s in (prop, block))
    if b in a:
        return prop
    if a in b:
        return block
    return prop + '\n\n' + block


def visibility(record, ledgers):
    """기록의 칸이 먼저, 비었으면 판의 칸을 따른다. 어느 쪽도 아니면 비공개"""
    if record['blog'] in (PUBLIC, SEALED):
        return record['blog']
    marks = [ledgers[i]['blog'] for i in record['ledgers'] if i in ledgers]
    if SEALED in marks:
        return SEALED
    return PUBLIC if PUBLIC in marks else None


def entry_for(record, ledgers, text):
    when = to_kst(record['when'])
    item = {
        'id': hashlib.sha1(record['id'].encode()).hexdigest()[:10],
        's': 'dc', 't': when, 'cf': 'x', 'b': '쇠판에 적은 시각', 'c': when, 'n': len(text),
    }
    if visibility(record, ledgers) == SEALED:
        # 예전 봉인과 달리 암호문도 싣지 않는다. 뷰어는 z가 있는지만 본다
        item['z'] = '1'
        return item
    board = next((ledgers[i] for i in record['ledgers'] if i in ledgers), None)
    item.update(ti=record['title'] or text.split('\n')[0][:60], tp=TOPIC.get(record['type'], '기타'), bd=text)
    item['p'] = '쇠판 / ' + board['title'] if board else '쇠판'
    if board:
        item['st'] = board['title']
        if board['tags']:
            item['tg'] = board['tags']
    return item


def wanted(record, ledgers):
    return (visibility(record, ledgers) and not record['archived'] and record['status'] != 'deleted_on_discord'
            and to_kst(record['when']) >= CUTOFF)


def merge(base, records, ledgers, read_body):
    """스냅샷에 새 메모를 더한 새 data.json. read_body(record)는 공개할 메모의 본문만 불린다"""
    fresh = []
    for record in records:
        if wanted(record, ledgers):
            text = clean(combine(record['text'], read_body(record)))
            if text:
                fresh.append(entry_for(record, ledgers, text))
    entries = sorted(base['entries'] + fresh, key=lambda e: e['t'])
    stats = dict(base['stats'], n=len(entries), sealed=sum('z' in e for e in entries),
                 src=dict(Counter(e['s'] for e in entries)), chars=sum(e['n'] for e in entries),
                 first=entries[0]['t'], last=entries[-1]['t'])
    return dict(base, gen=datetime.now(KST).strftime('%Y-%m-%dT%H:%M'), stats=stats, entries=entries,
                heat=dict(sorted(Counter(e['t'][:10] for e in entries).items())))


def plain(prop):
    return ''.join(part.get('plain_text', '') for part in (prop or {}).get('title') or (prop or {}).get('rich_text') or [])


def select(prop):
    return ((prop or {}).get('select') or {}).get('name', '')


def read_ledger(page):
    p = page['properties']
    return {'title': plain(p.get('판명')), 'blog': select(p.get('블로그')),
            'tags': [t['name'] for t in (p.get('discord_tags') or {}).get('multi_select', [])]}


def read_record(page):
    p = page['properties']
    return {
        'id': page['id'], 'title': plain(p.get('제목')), 'text': plain(p.get('원문')), 'blog': select(p.get('블로그')),
        'type': select(p.get('유형')), 'status': select(p.get('sync_status')),
        'when': ((p.get('기록일') or {}).get('date') or {}).get('start') or page.get('created_time', ''),
        'ledgers': [r['id'] for r in (p.get('쇠판') or {}).get('relation', [])],
        'archived': bool(page.get('archived') or page.get('in_trash')),
    }


def request(token, method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={
        'Authorization': 'Bearer ' + token, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json'})
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.load(res)
        except urllib.error.HTTPError as err:
            if err.code != 429 or attempt == RETRIES - 1:
                raise
            time.sleep(float(err.headers.get('Retry-After') or 2 ** attempt))


def query_all(token, source):
    pages, cursor = [], None
    while True:
        body = {'page_size': 100, **({'start_cursor': cursor} if cursor else {})}
        got = request(token, 'POST', f'/data_sources/{source}/query', body)
        pages += got['results']
        cursor = got.get('next_cursor')
        if not got.get('has_more'):
            return pages


def main():
    token = os.environ.get('CHRONICLE_NOTION_TOKEN')
    if not token:
        print('CHRONICLE_NOTION_TOKEN 없음: 연대기는 스냅샷 그대로 둔다')
        return
    base = json.loads(DATA.read_text(encoding='utf-8'))
    try:
        ledgers = {p['id']: read_ledger(p) for p in query_all(token, LEDGER_ID)}
        records = [read_record(p) for p in query_all(token, RECORD_ID)]
        body = lambda r: request(token, 'GET', f"/pages/{r['id']}/markdown").get('markdown', '')
        merged = merge(base, records, ledgers, body)
    except (urllib.error.URLError, KeyError, ValueError) as err:
        # 노션이 안 돼도 사이트 배포는 막지 않는다. 연대기만 스냅샷으로 나간다
        print(f'::warning::연대기 갱신 실패, 스냅샷 그대로 배포: {err}')
        return
    DATA.write_text(json.dumps(merged, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f"연대기: 스냅샷 {len(base['entries'])}편 + 새 메모 {len(merged['entries']) - len(base['entries'])}편")


if __name__ == '__main__':
    sys.exit(main())
