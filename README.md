# CBNU Tech Holdings — 인터랙티브 홈 (www.cbnuholdings.com)

노션(oopy 발행) 홈페이지 위에 얹는 **인터랙티브 레이어**와 그 데이터·배포 파이프라인. 노션·GitHub·oopy 세 축을 한 저장소에서 통제한다.

| 축 | 역할 | 정본 위치 |
|---|---|---|
| **노션** | 콘텐츠(인사말·공지·자회사 공개 DB·하위 페이지) | 노션 「CBNU Tech Holdings」 페이지 + 「자회사 공개 DB」 |
| **oopy** | www.cbnuholdings.com 발행·도메인·상단 메뉴 | oopy 대시보드 (노션 코드블록이 이 저장소의 로더를 가리킴) |
| **GitHub (이 저장소)** | 히어로·서비스 카드·자회사 필터·문의 CTA·주입 CSS/JS·자회사 JSON 동기화 | `assets/` `data/` `scripts/` `.github/` |

## 구조
```
index.html                 단독 미리보기 (cbnuholdings.github.io/home/) — 같은 레이어를 헤더·푸터 포함해 그린다
assets/home.css            레이어 스타일 + oopy(노션 DOM) 보정 §9
assets/home.js             레이어 렌더 (순수 JS). oopy 모드/단독 모드 자동 판별
assets/*.png               CI·엠블럼·캐릭터
data/subsidiaries.json     자회사 공개 DB 사본 (GitHub Actions가 매시 동기화)
scripts/sync_subsidiaries.py  동기화 스크립트 (토큰 불요 — oopy가 발행한 /portfolio SSR을 읽는다)
oopy/loader.html           노션 홈 최상단 html 코드블록에 붙여넣는 로더 (홈용, data-paths="/")
oopy/loader_staging.html   리뉴얼안(스테이징) 페이지용 로더
.github/workflows/sync.yml 매시 17분 동기화 → 변경 시 커밋 → Pages 자동 재배포
```

## 동작 원리 (oopy 모드)
1. 노션 홈 페이지 최상단 `html` 코드블록에 `oopy/loader.html` 내용이 들어 있다. oopy는 이 블록의 `<head>`를 문서 head에, `<body>`를 페이지 끝에 주입한다.
2. `home.js`가 `.notion-scroller`를 찾아 **커버 이미지 앞에 `#cbnu-home`(히어로·마퀴)**, **`.notion-page-content` 뒤에 `#cbnu-home-mid`(성장지원 서비스·자회사) → `#cbnu-home-tail`(문의 CTA·푸터)** 순으로 삽입한다. 화면 순서 = 히어로 → 노션 본문(인사말 탭·NOTICE) → 성장지원 서비스 → 자회사 → 문의 → 푸터. 노션 커버·아이콘·페이지 제목은 CSS로만 숨긴다(블록은 그대로). 노션 본문에는 회사 정보 푸터를 두지 않는다(레이어 푸터가 담당).
3. 노션 본문(인사말·오시는 길·연락처 탭, NOTICE, 푸터)은 그대로 렌더되고 §9 CSS로 톤만 맞춘다. **공지는 노션에서 고치면 즉시 반영**된다.
4. `data-paths`에 없는 경로로 SPA 이동하면 삽입물을 제거한다(다른 페이지 오염 방지).

## 운영
- **자회사 정보 수정** → 노션 「자회사 공개 DB」에서 수정 → 최대 1시간 안에 자동 반영. 즉시 반영하려면 Actions → `sync-subsidiaries` → Run workflow.
- **서비스 링크·문구·디자인 수정** → `assets/home.js`(HUBS·LINKS) / `assets/home.css` 수정 → `git push` → Pages 재배포(1~2분). oopy 쪽 변경 없음.
- **되돌리기** → 노션 코드블록을 이전 CTA 블록으로 되돌리면 그 즉시 원래 홈. 저장소는 그대로 둔다.
- **주의**: oopy 상단 메뉴(Home/Portfolio/Growth Hub/Project/Admin)는 oopy 대시보드 설정이다. 저장소에서 바꿀 수 없다.

## 로컬 미리보기
```
python -m http.server 8766   # 이 폴더에서
# http://localhost:8766/index.html
python scripts/sync_subsidiaries.py --check   # 동기화 결과 미리보기(저장 안 함)
```
