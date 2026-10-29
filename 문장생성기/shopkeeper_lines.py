"""봉봉봉 가게 주인 대사 만들기.

문장생성기(sentence.py)가 하는 일을 그대로 한다. 같은 프롬프트 파일, 같은 단어 뽑기, 같은 금지어,
같은 결과 저장. 다른 점은 모델 호출만 직접 하지 않고 요청문을 밖으로 내보낸다는 것뿐이다
(Antigravity에 그 요청문 하나만 보내고 답을 받아 온다). 받은 문단을 문장 조각으로 잘라
말풍선 한 줄 길이인 것만 후보로 남긴다. 후보는 사람이 보고 고른 것만 상점에 들어간다.

  python shopkeeper_lines.py words              # 1단계 요청문(테마별 단어 60개)
  python shopkeeper_lines.py text  답1.json     # 2단계 요청문(초현실 문단)
  python shopkeeper_lines.py split 답2.txt      # 결과 저장 + 말풍선 후보 목록
  python shopkeeper_lines.py accept 1 4 7       # 고른 후보를 ../static/shop/keeper_lines.json 에 더함
"""
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sentence as S  # noqa: E402

RUN = os.path.join(HERE, 'output', 'shopkeeper_run.json')
SHOP = os.path.join(HERE, '..', 'static', 'shop', 'keeper_lines.json')
MIN_LEN, MAX_LEN = 8, 42  # 말풍선 한 줄(공백 포함)


def save_run(d):
    os.makedirs(os.path.dirname(RUN), exist_ok=True)
    json.dump(d, open(RUN, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def load_run():
    return json.load(open(RUN, encoding='utf-8'))


def step_words():
    themes = random.sample(S.load_theme_pool(), 3)
    styles = S.load_style_pool()
    name, desc = styles[random.choice(list(styles))]
    save_run({'themes': themes, 'style': [name, desc]})
    return S.WORD_GEN_PROMPT_TEMPLATE.format(theme1=themes[0], theme2=themes[1], theme3=themes[2])


def step_text(answer_path):
    run = load_run()
    new_words = S.robust_json_parse(open(answer_path, encoding='utf-8').read()) or []
    if isinstance(new_words, dict):
        new_words = [w for v in new_words.values() if isinstance(v, list) for w in v]
    # sentence.generate_words_for_themes 와 같이 새 단어를 전문어 풀에 더한다
    pool = S.load_json_file(S.SPECIALIZED_NOUNS_FILE)
    have = set(pool)
    pool += [w for w in new_words if w not in have]
    S.save_json_file(S.SPECIALIZED_NOUNS_FILE, pool)
    # 아래는 sentence.generate_surreal_text 와 같은 순서·같은 문구다
    words = S.get_random_words(new_words, count_new=S.COUNT_NEW_SPECIALIZED, count_old=S.COUNT_OLD_COMMON,
                               count_modifier=S.COUNT_MODIFIER, count_adverb=S.COUNT_ADVERB)
    t = run['themes']; name, desc = run['style']
    prompt = S.BASE_PROMPT + S.DYNAMIC_PROMPT_TEMPLATE.format(selected_words=", ".join(words), theme1=t[0], theme2=t[1], theme3=t[2])
    prompt += f"\n\n스타일 조건:\n이번 생성은 **{name}**로 진행한다. ({desc})\n"
    bans = [w for w in set(S.load_json_file(S.USER_BANNED_WORDS_FILE) + S.get_dynamic_bans()) if w not in words and w not in t]
    if bans:
        prompt += f"\n\n금지어 조건 (절대 사용 금지):\n다음 단어들은 텍스트에 절대로 포함하지 말 것: {', '.join(bans)}\n"
    run['words'] = words
    save_run(run)
    return prompt


def step_split(text_path):
    run = load_run()
    text = open(text_path, encoding='utf-8').read().strip()
    S.save_result_to_file(run['themes'], run['style'][0], run['words'], text)
    parts = [p.strip(' ,') for p in re.split(r'(?<=[.!?])\s*|\n+', text) if p.strip()]
    cands = [p for p in parts if MIN_LEN <= len(p) <= MAX_LEN]
    run['candidates'] = cands
    save_run(run)
    return '\n'.join(f'{i + 1}. {c}' for i, c in enumerate(cands))


def step_accept(nums):
    cands = load_run().get('candidates', [])
    try:
        data = json.load(open(SHOP, encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        data = {'lines': []}
    for n in nums:
        line = cands[int(n) - 1]
        if line not in data['lines']:
            data['lines'].append(line)
    json.dump(data, open(SHOP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return f"keeper_lines.json: {len(data['lines'])}줄"


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else ''), sys.argv[2:]
    if cmd == 'words':
        print(step_words())
    elif cmd == 'text' and args:
        print(step_text(args[0]))
    elif cmd == 'split' and args:
        print(step_split(args[0]))
    elif cmd == 'accept' and args:
        print(step_accept(args))
    else:
        print(__doc__)
