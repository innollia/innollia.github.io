import json
import os
import re
import argparse

def convert_js_to_json(js_path: str, json_path: str):
    """
    JS 파일 내의 작은따옴표로 감싸진 문자열 배열을 추출하여 순수 JSON 파일로 변환합니다.
    """
    if not os.path.exists(js_path):
        print(f"오류: '{js_path}' 파일을 찾을 수 없습니다.")
        return

    try:
        with open(js_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # JS 코드 내에서 작은따옴표로 묶인 단어 추출
        matches = re.findall(r"'([^']+)'", content)
        
        # 'use strict' 와 같은 예약어나 불필요한 구문 필터링
        cleaned_matches = [w for w in matches if w not in ['use strict']]
        
        print(f"총 {len(cleaned_matches)}개의 단어를 추출했습니다.")
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_matches, f, ensure_ascii=False, indent=2)
            
        print(f"성공적으로 '{json_path}' 파일에 저장되었습니다.")
        
    except Exception as e:
        print(f"변환 실패: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JS 배열을 JSON으로 변환하는 유틸리티")
    parser.add_argument("--input", type=str, default="AllNouns.js", help="입력 JS 파일 경로")
    parser.add_argument("--output", type=str, default="common_nouns.json", help="출력 JSON 파일 경로")
    args = parser.parse_args()
    
    convert_js_to_json(args.input, args.output)
