"""flesh-pit 소리 갤러리(/sounds/)를 만든다. 소리가 바뀌면 이걸 다시 돌리고 커밋하면 끝이다.

사용법: python tools/build_sounds.py [flesh-pit 폴더]
결과: static/sounds/index.html, static/sounds/a/*.mp3

flesh-pit의 tools/build_sound_gallery.py를 불러 목록과 화면을 그대로 쓰고, 재생 파일만 mp3로 줄여 바꿔 끼운다.
flesh-pit 쪽은 읽기만 한다. mp3 이름에 내용 해시가 붙어서 바뀐 소리만 새로 만들고, 안 쓰는 파일은 지운다.
"""
import hashlib, importlib.util, json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.dont_write_bytecode = True
SRC = Path(sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\fixme\Desktop\flesh-pit-main')
OUT = Path(__file__).resolve().parent.parent / 'static' / 'sounds'
AUDIO = OUT / 'a'


def load_generator():
    spec = importlib.util.spec_from_file_location('flesh_gallery', SRC / 'tools' / 'build_sound_gallery.py')
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


def encode(wav, mp3):
    if mp3.exists(): return
    tmp = mp3.with_suffix('.tmp.mp3')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '160k', str(tmp)], check=True)
    tmp.replace(mp3)


def main():
    gen = load_generator()
    data = gen.build()
    AUDIO.mkdir(parents=True, exist_ok=True)
    jobs = {}

    def web(src):
        wav = (SRC / 'build' / src).resolve()
        name = f'{wav.stem}-{hashlib.sha1(wav.read_bytes()).hexdigest()[:8]}.mp3'
        jobs[name] = wav
        return 'a/' + name

    for it in data['items']:
        for f in it['files']:
            if f['ok']: f['src'] = web(f['src'])
    for b in data['beds']:
        b['srcs'] = [web(s) for s in b['srcs']]
    for u in data['unreferenced']:
        u['src'] = web(u['src'])

    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda kv: encode(kv[1], AUDIO / kv[0]), jobs.items()))
    for old in AUDIO.iterdir():
        if old.name not in jobs: old.unlink()

    blob = json.dumps(data, ensure_ascii=False, sort_keys=True).replace('</', '<\\/')
    (OUT / 'index.html').write_text(gen.PAGE.replace('__DATA__', blob), encoding='utf-8', newline='\n')
    c = data['counts']
    size = sum(p.stat().st_size for p in AUDIO.iterdir()) / 2**20
    print(f"id {c['ids']}개, mp3 {len(jobs)}개 {size:.0f}MB, 오류 {c['errors']}개")
    for e in data['errors']: print('  오류', e)


if __name__ == '__main__':
    main()
