"""쇠판(노션)의 새 메모를 메모 연대기에 합친다(배포 때 Actions가 실행, 결과물은 git에 넣지 않는다).

사용법: CHRONICLE_NOTION_TOKEN=... python tools/build_chronicle.py
입력: static/chronicle/data.json (2026-09-27에 굳힌 739편)
결과: 같은 파일에 새 메모를 더해 덮어쓴다. 노션은 읽기만 한다.
공개 메모 본문의 그림 블록은 static/chronicle/img/dc/에 webp로 받아 붙인다(노션 주소는 곧 만료된다).

기본은 공개다. 노션의 `블로그` 칸이 봉인/비공개면 그대로 따른다.
DEFAULT_FROM 앞의 글은 칸에 표시한 것만 들어간다.
규칙과 이유는 docs/chronicle-notion.md에 있다.
"""
import hashlib, io, json, os, re, sys, time, urllib.error, urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA = Path('static/chronicle/data.json')
IMG_DIR = Path('static/chronicle/img/dc')
IMG_SIDE = 1000
LEDGER_ID = '71a71dc7-ed3b-4ea0-a8a9-baac564af728'
RECORD_ID = '014d0ac7-ed2c-4aff-8e55-2991b58af391'
API = 'https://api.notion.com/v1'
NOTION_VERSION = '2026-03-11'
PUBLIC, SEALED, PRIVATE = '공개', '봉인', '비공개'
RETRIES = 6
# 스냅샷에 든 마지막 메모의 다음 날. 이 앞의 글은 스냅샷이 맡으므로 다시 넣지 않는다
CUTOFF = '2026-09-27T00:00'
# 기본 공개로 바꾼 날. 이 앞의 글은 공개를 전제로 쓰지 않았으므로 표시가 있어야 나간다
DEFAULT_FROM = '2026-11-05T00:00'
KST = timezone(timedelta(hours=9))
TOPIC = {'공부': '공부·지식', '입시': '공부·지식', '자기이해': '생각', '질문': '생각', '아이디어': '생각', '생활': '일상'}
# 서명이 든 주소는 공개 페이지에 남기지 않는다
IMAGE = re.compile(r'!\[[^\]]*\]\([^)]*(?:\)|$)', re.M)
# 그림만 올린 메시지의 자리표시. 그림이 따로 붙으므로 글에서는 뺀다
PLACEHOLDER = re.compile(r'^\((?:그림|파일)\)$', re.M)
SIGNED = re.compile(r'https?://(?:cdn\.discordapp\.com|media\.discordapp\.net|[\w.-]*amazonaws\.com|file\.notion\.so)/\S*')


def to_kst(value):
    """노션 날짜를 연대기 시각 형식(KST, 분까지)으로"""
    if not value:
        return ''
    if len(value) == 10:
        return value + 'T00:00'
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(KST).strftime('%Y-%m-%dT%H:%M')


def clean(text):
    text = PLACEHOLDER.sub('', SIGNED.sub('', IMAGE.sub('', text or '')))
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
    """기록의 칸이 먼저, 비었으면 판의 칸을 따른다. 둘 다 비면 DEFAULT_FROM부터 공개"""
    if record['blog'] in (PUBLIC, SEALED, PRIVATE):
        return record['blog']
    marks = [ledgers[i]['blog'] for i in record['ledgers'] if i in ledgers]
    for mark in (PRIVATE, SEALED, PUBLIC):
        if mark in marks:
            return mark
    return PUBLIC if to_kst(record['when']) >= DEFAULT_FROM else PRIVATE


def entry_for(record, ledgers, text, images=()):
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
    item.update(ti=clean(record['title']) or text.split('\n')[0][:60] or '(그림)', tp=TOPIC.get(record['type'], '기타'), bd=text)
    if images:
        item['im'] = list(images)
    item['p'] = '쇠판 / ' + board['title'] if board else '쇠판'
    if board:
        item['st'] = board['title']
        if board['tags']:
            item['tg'] = board['tags']
    return item


def wanted(record, ledgers):
    return (visibility(record, ledgers) != PRIVATE and not record['archived'] and record['status'] != 'deleted_on_discord'
            and to_kst(record['when']) >= CUTOFF)


def merge(base, records, ledgers, read_body, read_images=lambda r: []):
    """스냅샷에 새 메모를 더한 새 data.json. read_body·read_images(record)는 공개할 메모에만 불린다"""
    fresh = []
    for record in records:
        if not wanted(record, ledgers):
            continue
        text = clean(combine(record['text'], read_body(record)))
        # 봉인은 크기만 실으니 그림을 받지 않는다
        images = [] if visibility(record, ledgers) == SEALED else read_images(record)
        if text or images:
            fresh.append(entry_for(record, ledgers, text, images))
    entries = sorted(base['entries'] + fresh, key=lambda e: e['t'])
    stats = dict(base['stats'], n=len(entries), imgs=base['stats'].get('imgs', 0) + sum(len(e.get('im', [])) for e in fresh), sealed=sum('z' in e for e in entries),
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


def children(token, block):
    blocks, cursor = [], None
    while True:
        got = request(token, 'GET', f'/blocks/{block}/children?page_size=100' + (f'&start_cursor={cursor}' if cursor else ''))
        blocks += got['results']
        cursor = got.get('next_cursor')
        if not got.get('has_more'):
            return blocks


def image_urls(blocks):
    """노션에 올린 그림 블록의 (블록 id, 받을 주소). 외부 링크 그림은 만료되는 서명 주소라 쓰지 않는다"""
    out = []
    for block in blocks:
        image = block.get('image') if block.get('type') == 'image' else None
        url = ((image or {}).get('file') or {}).get('url')
        if url:
            out.append((block['id'], url))
    return out


def save_image(block_id, data):
    """그림을 긴 변 IMG_SIDE 이하 webp로 저장하고 [경로, 폭, 높이]를 돌려준다"""
    from PIL import Image
    name = hashlib.sha1(block_id.encode()).hexdigest()[:10] + '.webp'
    image = Image.open(io.BytesIO(data))
    image.load()
    if image.mode not in ('RGB', 'RGBA'):
        image = image.convert('RGBA' if 'A' in image.getbands() or 'transparency' in image.info else 'RGB')
    image.thumbnail((IMG_SIDE, IMG_SIDE))
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    image.save(IMG_DIR / name, 'WEBP', quality=80)
    return [f'img/dc/{name}', image.width, image.height]


def read_images(token, record):
    saved = []
    for block_id, url in image_urls(children(token, record['id'])):
        try:
            # 노션 파일 주소는 한 시간 남짓이면 만료되므로 읽은 즉시 받는다
            with urllib.request.urlopen(url, timeout=60) as res:
                saved.append(save_image(block_id, res.read()))
        except (OSError, ValueError) as err:
            # 그림 하나가 안 돼도 글은 싣는다
            print(f'::warning::그림 못 받음({block_id[:8]}): {type(err).__name__}')
    return saved


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
        merged = merge(base, records, ledgers, body, lambda r: read_images(token, r))
    except (urllib.error.URLError, KeyError, ValueError) as err:
        # 노션이 안 돼도 사이트 배포는 막지 않는다. 연대기만 스냅샷으로 나간다
        print(f'::warning::연대기 갱신 실패, 스냅샷 그대로 배포: {err}')
        return
    DATA.write_text(json.dumps(merged, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f"연대기: 스냅샷 {len(base['entries'])}편 + 새 메모 {len(merged['entries']) - len(base['entries'])}편")


if __name__ == '__main__':
    sys.exit(main())
