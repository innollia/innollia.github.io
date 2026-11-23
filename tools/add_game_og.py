"""블로그에 둔 웹게임 페이지에 X·카톡 공유 카드(og·twitter 메타)를 붙인다.

배포 때 Actions가 실행한다. 게임 세션이 빌드를 다시 복사해 와도 카드가 남게,
파일에 직접 손대지 않고 매 배포마다 data/games.yaml에서 다시 넣는다.
다른 곳에 공개된 게임(url)과 숨긴 게임(hidden)은 건드리지 않는다.
"""
import html, re, sys
from pathlib import Path

import yaml

SITE = 'https://innollia.github.io'
START, END = '<!-- og:start -->', '<!-- og:end -->'
BLOCK = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)


def card(game):
    slug, thumb = game['slug'], game.get('thumb', '')
    page = f'{SITE}/games/{slug}/'
    image = SITE + thumb if thumb.startswith('/') else page + thumb if thumb else ''
    tags = {
        'og:type': 'website', 'og:site_name': 'innollia', 'og:url': page,
        'og:title': game['title'], 'og:description': game.get('desc', ''),
        'og:image': image, 'twitter:card': 'summary_large_image' if image else 'summary',
        'twitter:title': game['title'], 'twitter:description': game.get('desc', ''), 'twitter:image': image,
    }
    lines = [START]
    for key, value in tags.items():
        if value:
            attr = 'name' if key.startswith('twitter:') else 'property'
            lines.append(f'<meta {attr}="{key}" content="{html.escape(value, quote=True)}">')
    lines.append(END)
    return '\n'.join(lines) + '\n'


def apply(text, game):
    text = BLOCK.sub('', text)
    # 문자 인코딩 선언은 앞 1024바이트 안에 있어야 하므로 그 뒤에 넣는다
    head = re.search(r'<meta\s+charset[^>]*>\n?', text, re.I) or re.search(r'<head[^>]*>\n?', text, re.I)
    if not head:
        return None
    return text[:head.end()] + card(game) + text[head.end():]


def main(root='.'):
    root = Path(root)
    games = yaml.safe_load((root / 'data/games.yaml').read_text(encoding='utf-8'))
    for game in games:
        if game.get('url') or game.get('hidden'):
            continue
        path = root / 'static/games' / game['slug'] / 'index.html'
        if not path.exists():
            print(f'::warning::{path} 없음: 공유 카드를 못 붙임')
            continue
        new = apply(path.read_bytes().decode('utf-8'), game)
        if new is None:
            print(f'::warning::{path}에 <head>가 없어 공유 카드를 못 붙임')
            continue
        path.write_bytes(new.encode('utf-8'))
        print(f'공유 카드: /games/{game["slug"]}/')


if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:]))
