import os
import re
import json
import argparse
from pathlib import Path

def parse_ourmal_sam(dict_dir: str):
    """
    우리말샘 JSON 사전을 파싱하여 명사, 동사/형용사, 부사 파일을 생성합니다.
    """
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    if not os.path.exists(dict_dir):
        print(f"오류: 사전 폴더를 찾을 수 없습니다: {dict_dir}")
        print("경로가 올바른지 확인하거나, 스크립트 실행 시 --dir 인자를 사용하세요.")
        return
        
    files = [os.path.join(dict_dir, f) for f in os.listdir(dict_dir) if f.endswith(".json")]
    print(f"사전 JSON 파일 개수: {len(files)}개")
    
    nouns_set = set()
    verbs_adj_set = set()
    adverbs_set = set()
    
    # 순수 한글 검사용 정규식
    hangeul_only = re.compile(r'^[가-힣]+$')
    
    for i, filepath in enumerate(files):
        print(f"[{i+1}/{len(files)}] {os.path.basename(filepath)} 분석 중...")
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            items = data.get("channel", {}).get("item", [])
            for item in items:
                word_info = item.get("wordinfo", {})
                sense_info = item.get("senseinfo", {})
                
                # 1. 일반어, 방언, 옛말, 북한어 모두 포함
                if sense_info.get("type") not in ["일반어", "방언", "옛말", "북한어"]:
                    continue
                    
                word = word_info.get("word", "")
                clean_word = word.replace("-", "").replace("^", "").strip()
                
                # 2. 순수 한글 단어이면서 길이가 2~7글자 사이인 것만 필터링
                if not hangeul_only.match(clean_word):
                    continue
                if len(clean_word) < 2 or len(clean_word) > 7:
                    continue
                    
                pos = sense_info.get("pos", "")
                if pos == "명사":
                    nouns_set.add(clean_word)
                elif pos in ["동사", "형용사"]:
                    verbs_adj_set.add(clean_word)
                elif pos == "부사":
                    adverbs_set.add(clean_word)
        except Exception as e:
            print(f"오류 발생 ({filepath}): {e}")
            
    print(f"\n=== 추출 결과 ===")
    print(f"- 명사: {len(nouns_set)}개")
    print(f"- 동사/형용사: {len(verbs_adj_set)}개")
    print(f"- 부사어: {len(adverbs_set)}개")
    
    paths = {
        'common_nouns.json': list(nouns_set),
        'common_modifiers.json': list(verbs_adj_set),
        'common_adverbs.json': list(adverbs_set)
    }
    
    print(f"\n=== 파일 저장 중 ===")
    for filename, word_list in paths.items():
        out_path = os.path.join(project_dir, filename)
        try:
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(word_list, f, ensure_ascii=False, indent=2)
            print(f"-> 저장 완료: {filename} ({len(word_list)}개)")
        except Exception as e:
            print(f"저장 실패 ({filename}): {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="우리말샘 사전 JSON 파서")
    parser.add_argument("--dir", type=str, default=r"c:\Users\Sherum\Downloads\전체 내려받기_우리말샘_json_20260603", help="우리말샘 JSON 파일들이 있는 폴더 경로")
    args = parser.parse_args()
    
    parse_ourmal_sam(args.dir)
