# belladonna sherum 의 홈-페-지

레트로 90년대 감성의 개인 홈페이지입니다. [Hugo](https://gohugo.io/) 정적 사이트 생성기로 만들어졌고,
`main` 브랜치에 푸시하면 GitHub Actions가 자동으로 빌드해서 GitHub Pages에 배포합니다.

- **공개 주소**: https://innollia.github.io/
- **테마**: `themes/hugo-trainsh` (레포에 직접 포함되어 있음 — 서브모듈 아님)

## 폴더 구조 한눈에 보기

| 위치 | 무엇이 들어있나 |
|------|-----------------|
| `content/` | 실제 글과 페이지 (마크다운). `posts/`가 메인 글 목록입니다. |
| `content/secret/`, `content/hide/` | 숨겨진/비밀 문서들 |
| `layouts/` | 페이지가 그려지는 방식(HTML 템플릿). `_partials/`는 머리말·꼬리말, `shortcodes/`는 특수 위젯 |
| `assets/css/style.css` | 사이트 전체의 레트로 스타일(90년대 룩). 테마 기본 CSS를 덮어씁니다. |
| `static/` | 그대로 복사되는 파일들 — 이미지, 자바스크립트(뽁뽁이 클리커·앰비언트 오디오), eaglercraft |
| `static/js/bubble-clicker.js` | 화면 오른쪽 위 "뽁뽁이" 클리커 게임 로직 |
| `static/js/ambient-audio.js` | 배경 앰비언트 오디오 |
| `hugo.toml` | 사이트 기본 설정(제목, 주소, 언어 등) |

## 새 글 쓰는 법

1. `content/posts/` 안에 새 폴더나 `.md` 파일을 만듭니다.
2. 파일 맨 위에 이렇게 적습니다:
   ```
   +++
   title = "글 제목"
   date = 2026-01-01
   +++

   여기에 본문을 씁니다.
   ```
3. `main` 브랜치에 커밋 + 푸시하면 몇 분 뒤 사이트에 자동 반영됩니다.

## 로컬에서 미리보기 (선택)

Hugo가 설치돼 있다면, 이 폴더에서:

```
hugo server
```

그 다음 브라우저에서 `http://localhost:1313` 을 열면 바뀐 내용을 바로 볼 수 있습니다.
(설치가 없어도 됩니다 — `main`에 푸시하면 GitHub이 알아서 빌드합니다.)

## 배포는 어떻게 되나

`.github/workflows/hugo.yaml` 이 담당합니다. `main`에 푸시가 들어오면:
1. Hugo가 사이트를 빌드하고 (`--minify`로 압축)
2. 결과물을 GitHub Pages에 올립니다.

따로 손댈 필요 없이, 글을 쓰고 `main`에 올리기만 하면 됩니다.
