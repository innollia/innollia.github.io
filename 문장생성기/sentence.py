import os
import random
import json
import re
import time
import subprocess
import traceback
import sys
import shutil
from pathlib import Path
from datetime import datetime
try:
    from dotenv import load_dotenv
except ImportError:  # 봉봉봉 대사 만들기(shopkeeper_lines.py)는 API 없이 이 파일의 함수만 빌려 쓴다
    def load_dotenv(*a, **k): return False
try:
    from google import genai
except ImportError:
    genai = None

# ==========================================
# 1. 경로 분석 및 전역 설정
# ==========================================
def get_exe_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(get_exe_dir(), 'data')
if getattr(sys, 'frozen', False):
    os.makedirs(DATA_DIR, exist_ok=True)
    sys.path.insert(0, DATA_DIR)
    # theme_pool.py 대신 theme_pool.json 복사
    for file_name in ['theme_pool.json', 'user_banned_words.json', 'style_pool.json', 'specialized_nouns.json']:
        dst = os.path.join(DATA_DIR, file_name)
        src = os.path.join(sys._MEIPASS, file_name)
        if not os.path.exists(dst) and os.path.exists(src):
            shutil.copy(src, dst)

def get_mutable_path(filename):
    if getattr(sys, 'frozen', False):
        return os.path.join(DATA_DIR, filename)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)

# 환경 변수 로드
env_path = os.path.join(get_exe_dir(), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# 상수 및 설정
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

COUNT_NEW_SPECIALIZED = 5
COUNT_OLD_COMMON = 5
COUNT_MODIFIER = 3
COUNT_ADVERB = 3

PROMPTS_DIR = os.path.join(get_base_dir(), 'prompts')
COMMON_NOUNS_FILE = os.path.join(get_base_dir(), 'common_nouns.json')
COMMON_MODIFIERS_FILE = os.path.join(get_base_dir(), 'common_modifiers.json')
COMMON_ADVERBS_FILE = os.path.join(get_base_dir(), 'common_adverbs.json')

SPECIALIZED_NOUNS_FILE = get_mutable_path('specialized_nouns.json')
WORD_POOL_BUFFER_FILE = get_mutable_path('word_pool_buffer.json')
USER_BANNED_WORDS_FILE = get_mutable_path('user_banned_words.json')
EXCLUSION_LIST_FILE = get_mutable_path('exclusion_list.json')
STYLE_POOL_FILE = get_mutable_path('style_pool.json')
THEME_POOL_FILE = get_mutable_path('theme_pool.json')

# ==========================================
# 2. 유틸리티 및 파일 I/O
# ==========================================
def load_json_file(filepath, default_value=None):
    if default_value is None:
        default_value = []
    if not os.path.exists(filepath):
        return default_value
    try:
        with open(Path(filepath), 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"\n[자가 복구] {filepath} 파일 형식이 손상된 것을 감지했습니다. 즉시 자동 복구를 시작합니다...")
        try:
            with open(Path(filepath), 'r', encoding='utf-8') as f:
                content = f.read()
            repaired_words = re.findall(r'"([^"]+)"', content)
            if repaired_words:
                save_json_file(filepath, repaired_words)
                print(f"[복구 성공] {len(repaired_words)}개의 단어를 성공적으로 복구하여 파일을 정상화했습니다!")
                return repaired_words
        except Exception as re_err:
            print(f"[복구 실패] 파일 자가 복구 시도 중 오류가 발생했습니다: {re_err}")
        return default_value

def save_json_file(filepath, data):
    try:
        with open(Path(filepath), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"파일 저장 실패 ({filepath}): {e}")
        return False

def load_prompt_text(filename):
    try:
        with open(os.path.join(PROMPTS_DIR, filename), 'r', encoding='utf-8') as f:
            return f.read().strip()
    except Exception as e:
        print(f"프롬프트 파일 로드 실패 ({filename}): {e}")
        return ""

def save_result_to_file(themes, style_name, words, text):
    try:
        output_dir = os.path.join(get_exe_dir(), 'output')
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = os.path.join(output_dir, f"result_{timestamp}.txt")
        
        content = (
            f"생성 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"선택된 테마: {', '.join(themes)}\n"
            f"선택된 스타일: {style_name}\n"
            f"최종 선택된 단어 (10개): {', '.join(words)}\n"
            f"========================================\n"
            f"생성된 문장:\n\n{text}\n"
            f"========================================\n"
        )
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        abs_path = os.path.abspath(filepath).replace(os.sep, '/')
        print(f"\n--- 결과가 파일에 저장되었습니다: [result_{timestamp}.txt](file:///{abs_path}) ---")
    except Exception as e:
        print(f"결과 파일 저장 실패: {e}")

def copy_to_clipboard(text):
    try:
        subprocess.run("clip", input=text, text=True, encoding='utf-8', check=True)
        print("\n[클립보드] 프롬프트가 클립보드에 자동으로 복사되었습니다! (제미니 웹에 바로 Ctrl+V 하시면 됩니다)")
    except Exception:
        try:
            subprocess.run("clip", input=text, text=True, encoding='cp949', check=True)
            print("\n[클립보드] 프롬프트가 클립보드에 자동으로 복사되었습니다! (제미니 웹에 바로 Ctrl+V 하시면 됩니다)")
        except Exception as e2:
            print(f"\n[클립보드] 클립보드 자동 복 복사 실패: {e2}")
            print("(아래 프롬프트를 수동으로 드래그해서 복사해 주세요.)")

# ==========================================
# 3. 데이터 파싱 로직
# ==========================================
def robust_json_parse(text):
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
    if match:
        clean_text = match.group(1).strip()
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            pass
    else:
        clean_text = re.sub(r"```(?:json)?", "", text).strip()
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            pass
            
    start_idx = text.find('[')
    start_idx_dict = text.find('{')
    
    if start_idx != -1 or start_idx_dict != -1:
        if start_idx != -1 and start_idx_dict != -1:
            start_pos = min(start_idx, start_idx_dict)
            first_char = '[' if start_pos == start_idx else '{'
        elif start_idx != -1:
            first_char = '['
            start_pos = start_idx
        else:
            first_char = '{'
            start_pos = start_idx_dict
            
        last_char = ']' if first_char == '[' else '}'
        end_pos = text.rfind(last_char)
        
        if end_pos != -1 and end_pos > start_pos:
            extracted_text = text[start_pos:end_pos+1]
            try:
                return json.loads(extracted_text)
            except json.JSONDecodeError:
                pass
                
    try:
        import ast
        return ast.literal_eval(text)
    except:
        pass
        
    return None

# ==========================================
# 4. 프롬프트 및 풀(Pool) 관리 로직
# ==========================================
BASE_PROMPT = load_prompt_text('base_prompt.txt')
DYNAMIC_PROMPT_TEMPLATE = load_prompt_text('dynamic_prompt_template.txt')
WORD_GEN_PROMPT_TEMPLATE = load_prompt_text('word_gen_prompt.txt')

def load_theme_pool():
    themes = load_json_file(THEME_POOL_FILE, default_value=[])
    if not themes:
        # 파일이 없거나 비어있는 경우 기본 테마 제공 (복구용)
        default_themes = ["스페이스 오페라", "포탈마법이론", "양자역학", "사이버펑크"]
        save_json_file(THEME_POOL_FILE, default_themes)
        return default_themes
    return themes

def add_new_themes_to_pool(new_themes):
    if not new_themes:
        return
        
    themes = load_theme_pool()
    added = []
    
    for t in new_themes:
        if t not in themes:
            themes.append(t)
            added.append(t)
            
    if added:
        save_json_file(THEME_POOL_FILE, themes)
        print(f"\n[테마 추가] 테마 목록에 새로운 테마가 저장되었습니다: {', '.join(added)}")

def load_style_pool():
    default_styles = {
        "1": ["시적이고 몽환적인 스타일", "시적이고 몽환적인 톤을 사용하며, 마치 깨지 않는 꿈을 꾸는 듯한 모호하고 신비로운 이미지의 단어들을 활용할 것."],
        "2": ["SF/사이버펑크 소설 스타일", "SF 및 사이버펑크 소설의 기계적, 기술적 파편이 뒤섞인 분위기를 연출할 것 (네트워크, 디스토피아, 전자 회로 등)."],
        "3": ["유머러스하고 황당한 스타일", "황당무계하고 엉뚱하며 블랙 코미디 요소가 가미된 실소나 의아함을 유발하는 유머러스한 스타일로 작성할 것."],
        "4": ["기괴하고 어두운 스타일", "그로테스크하고 기괴하며, 고딕 호러나 심해의 공포, 어둡고 축축한 초현실적 세계를 연상시키는 음산한 분위기를 풍길 것."]
    }
    if not os.path.exists(STYLE_POOL_FILE):
        save_json_file(STYLE_POOL_FILE, default_styles)
        return default_styles
    
    styles = load_json_file(STYLE_POOL_FILE, default_value=default_styles)
    if not isinstance(styles, dict) or not styles:
        styles = default_styles
    return styles

def add_new_style(name, desc):
    styles = load_style_pool()
    existing_keys = [int(k) for k in styles.keys() if k.isdigit()]
    next_key = str(max(existing_keys) + 1) if existing_keys else "1"
    styles[next_key] = [name, desc]
    save_json_file(STYLE_POOL_FILE, styles)
    print(f"\n[스타일 추가] 스타일 목록에 새로운 스타일이 추가되었습니다: {name} (번호: {next_key})")
    return name, desc

def get_dynamic_bans():
    try:
        output_dir = os.path.join(get_exe_dir(), 'output')
        if not os.path.exists(output_dir):
            return []
            
        files = [os.path.join(output_dir, f) for f in os.listdir(output_dir) if f.startswith("result_") and f.endswith(".txt")]
        if not files:
            return []
            
        files = sorted(files, key=os.path.getmtime, reverse=True)[:10]
        
        word_counts = {}
        josa_pattern = re.compile(r'(은|는|이|가|을|를|의|에|와|과|로|으로|도|에서|만|뿐|조차|마저|나|이나|이라|라|고|라고|며|하며|고는|서)$')
        
        for filepath in files:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            parts = content.split("========================================")
            if len(parts) >= 3:
                text_part = parts[1].replace("생성된 문장:", "").strip()
                words = re.findall(r'[가-힣]+', text_part)
                
                for w in words:
                    if len(w) <= 1:
                        continue
                    clean_w = josa_pattern.sub('', w)
                    if len(clean_w) <= 1:
                        continue
                    word_counts[clean_w] = word_counts.get(clean_w, 0) + 1
                    
        banned_words = [word for word, count in word_counts.items() if count >= 5]
        return banned_words
    except Exception as e:
        print(f"[금지어 분석 중 오류] {e}")
        return []

def get_random_words(new_words, count_new=4, count_old=4, count_modifier=1, count_adverb=1):
    selected_words = []
    
    exclusion_list = load_json_file(EXCLUSION_LIST_FILE)
    exclusion_set = set(exclusion_list)
    
    available_new_words = [w for w in new_words if w not in exclusion_set]
    if len(available_new_words) >= count_new:
        selected_new = random.sample(available_new_words, count_new)
    else:
        selected_new = available_new_words
    selected_words.extend(selected_new)
    
    buffer_data = load_json_file(WORD_POOL_BUFFER_FILE, default_value={})
    if not isinstance(buffer_data, dict):
        buffer_data = {}
        
    buf_nouns = buffer_data.get("nouns", [])
    buf_modifiers = buffer_data.get("modifiers", [])
    buf_adverbs = buffer_data.get("adverbs", [])
    
    buf_nouns = [w for w in buf_nouns if w not in exclusion_set]
    buf_modifiers = [w for w in buf_modifiers if w not in exclusion_set]
    buf_adverbs = [w for w in buf_adverbs if w not in exclusion_set]
    
    needs_refill = (
        len(buf_nouns) < count_old or 
        len(buf_modifiers) < count_modifier or 
        len(buf_adverbs) < count_adverb
    )
    
    if needs_refill:
        print("\n[성능 최적화] 임시 단어 버퍼가 부족하여 대용량 사전을 로딩 중입니다. 잠시만 기다려 주세요...")
        start_time = time.time()
        
        user_bans = load_json_file(USER_BANNED_WORDS_FILE)
        ban_set = set(user_bans)
        
        common_pool = load_json_file(COMMON_NOUNS_FILE)
        modifier_pool = load_json_file(COMMON_MODIFIERS_FILE)
        adverb_pool = load_json_file(COMMON_ADVERBS_FILE)
        
        avail_nouns = [w for w in common_pool if w not in exclusion_set and w not in ban_set]
        avail_modifiers = [w for w in modifier_pool if w not in exclusion_set and w not in ban_set]
        avail_adverbs = [w for w in adverb_pool if w not in exclusion_set and w not in ban_set]
        
        refill_nouns_count = min(len(avail_nouns), 1000)
        refill_mods_count = min(len(avail_modifiers), 500)
        refill_advs_count = min(len(avail_adverbs), 500)
        
        new_nouns = random.sample(avail_nouns, refill_nouns_count) if refill_nouns_count > 0 else []
        new_mods = random.sample(avail_modifiers, refill_mods_count) if refill_mods_count > 0 else []
        new_advs = random.sample(avail_adverbs, refill_advs_count) if refill_advs_count > 0 else []
        
        buf_nouns = list(dict.fromkeys(buf_nouns + new_nouns))
        buf_modifiers = list(dict.fromkeys(buf_modifiers + new_mods))
        buf_adverbs = list(dict.fromkeys(buf_adverbs + new_advs))
        
        print(f"[성능 최적화] 리필 완료! (소요 시간: {time.time() - start_time:.2f}초)")
        
    selected_old = buf_nouns[:count_old]
    buf_nouns = buf_nouns[count_old:]
    selected_words.extend(selected_old)
    
    selected_mod = buf_modifiers[:count_modifier]
    buf_modifiers = buf_modifiers[count_modifier:]
    selected_words.extend(selected_mod)
    
    selected_adv = buf_adverbs[:count_adverb]
    buf_adverbs = buf_adverbs[count_adverb:]
    selected_words.extend(selected_adv)
    
    buffer_data["nouns"] = buf_nouns
    buffer_data["modifiers"] = buf_modifiers
    buffer_data["adverbs"] = buf_adverbs
    save_json_file(WORD_POOL_BUFFER_FILE, buffer_data)
    
    if selected_words:
        exclusion_list.extend(selected_words)
        save_json_file(EXCLUSION_LIST_FILE, exclusion_list)
        print(f"--- 선택된 {len(selected_words)}개의 단어를 제외 목록에 등록했습니다. ---")
        
    return selected_words

# ==========================================
# 5. API 통신 로직
# ==========================================
class MockResponse:
    def __init__(self, text):
        self.text = text

def call_gemini_with_retry(client, model, contents, config=None, max_retries=5, delay=5):
    for attempt in range(max_retries):
        try:
            if config:
                return client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config
                )
            else:
                return client.models.generate_content(
                    model=model,
                    contents=contents
                )
        except Exception as e:
            err_str = str(e)
            print(f"\n[API 오류 발생] {err_str[:100]}...")
            
            while True:
                print("\n" + "="*60)
                print("1. [r] 일정 시간 대기 후 API 자동 재시도")
                print("2. [m] 프롬프트를 복사하여 제미니 웹에서 직접 답변 받아오기 (수동 모드)")
                print("3. [q] 프로그램 종료")
                choice = input("원하는 작업을 선택하세요 (r/m/q): ").strip().lower()
                
                if choice in ['r', 'm', 'q']:
                    break
                print("잘못된 입력입니다. r, m, q 중 하나를 입력해주세요.")
            
            if choice == 'q':
                raise KeyboardInterrupt("사용자가 작업을 취소했습니다.")
                
            elif choice == 'm':
                copy_to_clipboard(contents)
                print("\n\n" + "#"*60)
                print(">>> 아래의 프롬프트 내용을 복사하여 제미니(https://gemini.google.com/)에 붙여넣으세요 <<<\n")
                print(contents)
                print("\n" + "#"*60 + "\n")
                
                print(">>> 제미니가 생성한 답변을 아래에 붙여넣어 주세요 <<<")
                print("(다중 줄 입력 가능. 붙여넣기를 모두 마친 후, 새로운 빈 줄에 'DONE'이라고 입력하고 엔터를 누르세요)\n")
                
                lines = []
                while True:
                    try:
                        line = input()
                        if line.strip().upper() == "DONE":
                            break
                        lines.append(line)
                    except EOFError:
                        break
                        
                manual_response = "\n".join(lines)
                print("\n[수동 입력 완료] 다음 단계로 넘어갑니다...")
                return MockResponse(manual_response)
                
            else:
                current_delay = delay * (2 ** attempt) if ("429" in err_str or "exhausted" in err_str.lower() or "limit" in err_str.lower()) else delay
                current_delay = min(current_delay, 120)
                print(f"\n{current_delay}초 후 재시도합니다... (시도 {attempt + 1}/{max_retries})")
                time.sleep(current_delay)

    raise Exception(f"최대 재시도 횟수({max_retries})를 초과하여 Gemini API 호출에 실패했습니다.")

def generate_words_for_themes(client, themes):
    print(f"--- 테마별 단어 생성 요청 중: {themes} ---")
    
    prompt = WORD_GEN_PROMPT_TEMPLATE.format(
        theme1=themes[0],
        theme2=themes[1],
        theme3=themes[2]
    )
    
    try:
        print("--- Gemini API에 요청을 보냈습니다. 응답을 기다리는 중... ---")
        response = call_gemini_with_retry(
            client=client,
            model=MODEL_NAME, 
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        
        print("--- 응답을 수신했습니다. 파싱 중... ---")
        if response and response.text:
            text = response.text.strip()
            words = robust_json_parse(text)
            
            if words is not None:
                new_words = []
                if isinstance(words, list):
                    new_words = words
                elif isinstance(words, dict):
                    for key, val in words.items():
                        if isinstance(val, list):
                            new_words.extend(val)
                
                if new_words:
                    print(f"--- {len(new_words)}개의 단어가 생성되었습니다. ---")
                    
                    specialized_pool = load_json_file(SPECIALIZED_NOUNS_FILE)
                    existing_set = set(specialized_pool)
                    added_words = []
                    for w in new_words:
                        if w not in existing_set:
                            specialized_pool.append(w)
                            existing_set.add(w)
                            added_words.append(w)
                    
                    if added_words:
                        save_json_file(SPECIALIZED_NOUNS_FILE, specialized_pool)
                        print(f"--- 전문어 풀에 {len(added_words)}개의 새 단어를 추가했습니다. ---")
                        print(f"--- 추가된 단어 목록: {', '.join(added_words)}")
                    
                    return new_words
                else:
                    print(f"오류: JSON 파싱 결과에서 단어를 찾을 수 없습니다. 타입: {type(words)}")
                    return []
            else:
                print("JSON 파싱 실패 (복구 시도 모두 실패)")
                print(f"수신된 텍스트(앞부분): {text[:100]}...")
                return []
        else:
            print("API로부터 유효한 응답을 받지 못했습니다.")
            return []
            
    except Exception as e:
        print(f"단어 생성 중 오류 발생: {e}")
        return []

def generate_surreal_text(client, selected_themes, style_name, style_desc):
    new_words = generate_words_for_themes(client, selected_themes)
    if not new_words:
        print("단어 생성 실패로 프로세스를 중단합니다.")
        return None, []

    final_words = get_random_words(
        new_words, 
        count_new=COUNT_NEW_SPECIALIZED, 
        count_old=COUNT_OLD_COMMON, 
        count_modifier=COUNT_MODIFIER, 
        count_adverb=COUNT_ADVERB
    )
    print(f"--- 최종 선택된 단어 {len(final_words)}개: {final_words} ---")

    dynamic_part = DYNAMIC_PROMPT_TEMPLATE.format(
        selected_words=", ".join(final_words),
        theme1=selected_themes[0],
        theme2=selected_themes[1],
        theme3=selected_themes[2]
    )
    
    style_instruction = f"\n\n스타일 조건:\n이번 생성은 **{style_name}**로 진행한다. ({style_desc})\n"
    
    user_bans = load_json_file(USER_BANNED_WORDS_FILE)
    dynamic_bans = get_dynamic_bans()
    all_bans = list(set(user_bans + dynamic_bans))
    
    ban_instruction = ""
    if all_bans:
        safe_bans = [w for w in all_bans if w not in final_words and w not in selected_themes]
        if safe_bans:
            ban_instruction = f"\n\n금지어 조건 (절대 사용 금지):\n다음 단어들은 텍스트에 절대로 포함하지 말 것: {', '.join(safe_bans)}\n"
            print(f"--- [금지어 작동] 다음 단어들의 사용이 금지됩니다: {safe_bans} ---")
            
    final_prompt = BASE_PROMPT + dynamic_part + style_instruction + ban_instruction

    print("--- 최종 텍스트 생성을 요청합니다... ---")
    try:
        response = call_gemini_with_retry(
            client=client,
            model=MODEL_NAME, 
            contents=final_prompt
        )
        
        if response and response.text:
            return response.text, final_words
        else:
            return None, []

    except Exception as e:
        print(f"최종 생성 중 오류 발생: {e}")
        return None, []


# ==========================================
# 6. 사용자 인터페이스 (CLI) 및 Main
# ==========================================
def select_themes():
    theme_pool = load_theme_pool()
    print("\n" + "="*40)
    print(" [1] 테마 선택 설정")
    print("="*40)
    print("1. 무작위 자동 선택 (기본값)")
    print("2. 테마 직접 입력 (쉼표로 3개 구분)")
    print("3. 테마 검색 후 선택")
    print("q. 프로그램 종료")
    choice = input("선택하세요 (1/2/3/q): ").strip().lower()
    
    if choice == 'q':
        raise KeyboardInterrupt("사용자가 프로그램을 종료했습니다.")
    
    if choice == "2":
        user_input = input("\n원하는 테마 3개를 쉼표(,)로 구분하여 입력하세요: ").strip()
        themes = [t.strip() for t in user_input.split(",") if t.strip()]
        
        if themes:
            add_new_themes_to_pool(themes)
            
        if len(themes) < 3:
            print(f"테마가 {len(themes)}개만 입력되었습니다. 부족한 테마는 무작위로 채웁니다.")
            needed = 3 - len(themes)
            themes.extend(random.sample(theme_pool, needed))
        return themes[:3]
        
    elif choice == "3":
        print("\n테마 풀에서 키워드를 검색합니다. (검색을 완료하거나 스킵하려면 그냥 엔터 입력)")
        selected = []
        while len(selected) < 3:
            keyword = input(f"[{len(selected)+1}/3] 검색 키워드 입력 (남은 항목 무작위 채우기는 엔터): ").strip()
            if not keyword:
                needed = 3 - len(selected)
                selected.extend(random.sample(theme_pool, needed))
                break
            
            matches = [t for t in theme_pool if keyword in t]
            if not matches:
                print(f"'{keyword}'를 포함하는 테마가 없습니다.")
                add_yn = input(f"'{keyword}'를 새로운 테마로 추가하고 즉시 선택할까요? (y/n): ").strip().lower()
                if add_yn == 'y':
                    add_new_themes_to_pool([keyword])
                    if keyword not in selected:
                        selected.append(keyword)
                        print(f"-> 추가 및 선택됨: {keyword}")
                    else:
                        print("이미 선택된 테마입니다.")
                continue
            
            print("\n검색 결과:")
            for idx, m in enumerate(matches[:15]):
                print(f"  {idx + 1}. {m}")
            if len(matches) > 15:
                print(f"  ... 외 {len(matches) - 15}개 테마가 더 있습니다.")
                
            sel_idx = input(f"번호 선택 (1~{min(len(matches), 15)}) 또는 다시 검색하려면 엔터: ").strip()
            if sel_idx.isdigit():
                idx_val = int(sel_idx) - 1
                if 0 <= idx_val < min(len(matches), 15):
                    chosen_theme = matches[idx_val]
                    if chosen_theme not in selected:
                        selected.append(chosen_theme)
                        print(f"-> 선택됨: {chosen_theme}")
                    else:
                        print("이미 선택된 테마입니다.")
        return selected
    
    else:
        return random.sample(theme_pool, 3)

def select_style():
    styles = load_style_pool()
    print("\n" + "="*40)
    print(" [2] 문장 스타일 선택 설정")
    print("="*40)
    print("1. 무작위 자동 선택 (기본값)")
    print("2. 목록에서 직접 선택")
    print("3. 신규 스타일 직접 입력 및 추가")
    print("q. 프로그램 종료")
    choice = input("선택하세요 (1/2/3/q): ").strip().lower()
    
    if choice == 'q':
        raise KeyboardInterrupt("사용자가 프로그램을 종료했습니다.")
    
    if choice == "2":
        print("\n스타일 목록:")
        for key, val in styles.items():
            print(f"  {key}. {val[0]} - {val[1]}")
        
        sel = input(f"원하는 스타일 번호를 입력하세요 (1~{len(styles)} 또는 q로 종료): ").strip().lower()
        if sel == 'q':
            raise KeyboardInterrupt("사용자가 프로그램을 종료했습니다.")
        if sel in styles:
            return styles[sel][0], styles[sel][1]
        print("잘못된 입력입니다. 무작위 스타일로 진행합니다.")
        
    elif choice == "3":
        print("\n새로운 스타일을 직접 추가합니다.")
        name = input("새 스타일 이름 입력 (예: 스페이스 오페라 스타일): ").strip()
        if not name:
            print("이름이 입력되지 않아 무작위 스타일로 진행합니다.")
            rand_key = random.choice(list(styles.keys()))
            return styles[rand_key][0], styles[rand_key][1]
            
        desc = input("새 스타일 설명 입력 (예: 거대한 우주 전쟁과 행성 간의 모험을 장엄한 톤으로 묘사할 것): ").strip()
        if not desc:
            desc = f"{name}에 어울리는 분위기를 연출할 것."
            
        return add_new_style(name, desc)
        
    rand_key = random.choice(list(styles.keys()))
    chosen = styles[rand_key]
    print(f"-> 무작위 스타일 선정됨: {chosen[0]}")
    return chosen[0], chosen[1]

def main():
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("오류: GEMINI_API_KEY 없음 (환경 변수 또는 .env 파일 확인 필요)")
            input("\n작업을 종료하려면 엔터 키를 누르세요...")
            return

        try:
            client = genai.Client(
                api_key=api_key,
                http_options={"timeout": 300000}
            )
        except Exception as e:
            print(f"Client 초기화 실패: {e}")
            input("\n작업을 종료하려면 엔터 키를 누르세요...")
            return

        selected_themes = select_themes()
        print(f"\n>>> 선택된 테마: {selected_themes}")
        
        style_name, style_desc = select_style()
        print(f">>> 선택된 스타일: {style_name}\n")

        generated_text, final_words = generate_surreal_text(client, selected_themes, style_name, style_desc)

        if generated_text:
            print("\n--- 생성된 텍스트 ---")
            print(generated_text)
            print("--------------------")
            
            save_result_to_file(selected_themes, style_name, final_words, generated_text)
        else:
            print("\n문장 생성에 실패하였습니다.")
        
        input("\n작업이 완료되었습니다. 엔터 키를 누르면 종료합니다...")
        
    except KeyboardInterrupt as ki:
        print(f"\n{ki}")
    except Exception as e:
        print("\n" + "!"*60)
        print("[프로그램 실행 오류] 치명적인 예외가 발생했습니다.")
        print(f"오류 메시지: {e}")
        print("!"*60)
        traceback.print_exc()
        input("\n[안내] 에러 정보를 확인하신 후, 엔터 키를 누르면 창을 닫습니다...")

if __name__ == "__main__":
    main()
