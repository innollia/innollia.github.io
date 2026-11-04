"""hwapongstuy 저장소 이미지로 갤러리 재료를 만든다(배포 때 Actions가 실행, 결과물은 git에 넣지 않는다).

사용법: python tools/build_gallery.py <hwapongstuy 폴더>
결과: static/gallery-img/ (썸네일·보기용 webp), data/gallery.json (묶음 목록)
"""
import hashlib, json, re, sys
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
IMG = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
ROOTS = ('styles', 'texture3d', 'gallery')
# 남의 그림(참고 자료)은 공개 페이지에 올리지 않는다
SKIP_DIRS = {'.git', 'refs', 'references', 'in'}
THUMB, FULL = 360, 1600
OUT_IMG, OUT_JSON = Path('static/gallery-img'), Path('data/gallery.json')
ROOT_LABEL = {'styles': '화풍', 'texture3d': '3D 텍스처', 'gallery': '작업물'}


def blurb(path):
    """README 첫 문단(제목·표·코드 뺀 줄글)"""
    para, fence = [], False
    for line in path.read_text(encoding='utf-8', errors='replace').splitlines():
        s = line.strip()
        if s.startswith('```'):
            fence = not fence
        elif fence or s.startswith(('#', '|', '>', '<', '- ', '* ', '!')):
            if para: break
        elif s:
            para.append(s)
        elif para:
            break
    return re.sub(r'[`*]|\[([^\]]*)\]\([^)]*\)', lambda m: m.group(1) or '', ' '.join(para))[:300]


def save(src, dest, size):
    with Image.open(src) as im:
        im = im.convert('RGBA' if 'A' in im.getbands() or 'transparency' in im.info else 'RGB')
        im.thumbnail((size, size))
        im.save(dest, 'WEBP', quality=82, method=4)
        return im.size


def main(src):
    src = Path(src)
    groups = {}
    for p in sorted(src.rglob('*')):
        rel = p.relative_to(src)
        if p.suffix.lower() not in IMG or len(rel.parts) < 3 or rel.parts[0] not in ROOTS: continue
        if SKIP_DIRS & set(rel.parts[:-1]): continue
        groups.setdefault(rel.parts[:2], []).append(p)

    OUT_IMG.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(exist_ok=True)
    out = []
    for key, files in sorted(groups.items()):
        base = src.joinpath(*key)
        readmes = sorted(base.rglob('README.md'), key=lambda r: (len(r.parts), str(r)))
        desc = next((t for t in map(blurb, readmes) if t and not t.startswith('저장소 밖에서')), '') # 출처 목록 README는 설명이 아니다
        items = []
        for p in files:
            rel = p.relative_to(base)
            name = hashlib.sha1(p.read_bytes()).hexdigest()[:16]
            full, thumb = OUT_IMG / f'{name}.webp', OUT_IMG / f'{name}_t.webp'
            try:
                if not full.exists(): save(p, full, FULL)
                if not thumb.exists(): save(p, thumb, THUMB)
                with Image.open(thumb) as t: w, h = t.size
            except OSError as e:
                print('건너뜀', p, e); continue
            items.append({'name': p.stem, 'path': rel.parent.as_posix(), 'full': full.name, 'thumb': thumb.name, 'w': w, 'h': h})
        if items:
            out.append({'root': ROOT_LABEL[key[0]], 'name': key[1], 'id': '-'.join(key), 'desc': desc, 'items': items})
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    print(len(out), '묶음', sum(len(g['items']) for g in out), '장')


if __name__ == '__main__':
    main(sys.argv[1])
