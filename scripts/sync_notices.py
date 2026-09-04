#!/usr/bin/env python3
"""노션 홈의 NOTICE 목록 → data/notices.json (단독 미리보기·비상 대체용).

원천: oopy가 발행한 홈 페이지의 __NEXT_DATA__ recordMap (토큰 불요).
      기본 URL은 NOTICE_SRC 환경변수, 없으면 스테이징 페이지. 홈 적용 후에는 워크플로의 NOTICE_SRC를 홈(/)으로 바꾼다.
규칙(노션 본문 작성 규칙과 동일 = home.js parseNotionNotice):
  # 📃 NOTICE  → 이후 블록을 읽는다
  ### 그룹명    → 공지사항 / 사업공지 / 자료실 / 🔗 Quick links / 회사소개
  - <페이지 멘션 또는 링크> (YYYY-MM-DD)
안전: 파싱 0건이면 기존 파일을 덮지 않는다.
"""
import json, os, re, sys, urllib.request, datetime

# 기본 원천 = 홈(/). 스테이징 페이지를 읽으려면 NOTICE_SRC 를 명시한다(예전 기본값이 스테이징이라 로컬 실행이 notices.json 을 스테이징 데이터로 덮던 함정).
SRC = os.environ.get("NOTICE_SRC", "https://www.cbnuholdings.com/")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "notices.json")
SITE = "https://www.cbnuholdings.com"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "cbnu-home-sync/1.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "ignore")

def rich_text_and_link(rich, blocks):
    """rich text → (평문, 첫 링크 URL, 멘션 페이지 제목)"""
    text, link, mtitle = [], "", ""
    for seg in rich or []:
        if not isinstance(seg, list) or not seg: continue
        t = str(seg[0]); decos = seg[1] if len(seg) > 1 else []
        if t == "‣":
            for d in decos or []:
                if isinstance(d, list) and d and d[0] == "p" and len(d) > 1:
                    pid = d[1]
                    pb = blocks.get(pid, {}); pv = pb.get("value", pb); pv = pv.get("value", pv)
                    title = "".join(str(x[0]) for x in (pv.get("properties", {}) or {}).get("title", []) if isinstance(x, list) and x)
                    mtitle = mtitle or title
                    link = link or (SITE + "/" + pid)
            text.append(mtitle)
            continue
        for d in decos or []:
            if isinstance(d, list) and d and d[0] == "a" and len(d) > 1 and not link:
                link = d[1]
        text.append(t)
    return "".join(text).strip(), link, mtitle

def parse(html):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if not m: raise RuntimeError("__NEXT_DATA__ 없음")
    pp = json.loads(m.group(1))["props"]["pageProps"]
    blocks = dict(pp["recordMap"].get("block", {}))
    for q in pp.get("queryCollectionResult", {}).values():
        blocks.update(q.get("recordMap", {}).get("block", {}))
    page_id = pp.get("pageID") or ""
    root = None
    for bid, b in blocks.items():
        v = b.get("value", b); v = v.get("value", v)
        if v.get("type") == "page" and (bid.replace("-", "") == page_id.replace("-", "") or v.get("parent_table") == "space"):
            root = v; break
    if not root: raise RuntimeError("루트 페이지 블록 없음")
    out = {"items": [], "quick": [], "about": []}
    mode, group = "", ""
    for cid in root.get("content", []):
        b = blocks.get(cid);
        if not b: continue
        v = b.get("value", b); v = v.get("value", v)
        t = v.get("type"); props = v.get("properties", {}) or {}
        text, link, mtitle = rich_text_and_link(props.get("title"), blocks)
        if t == "header":
            mode = "notice" if re.search(r"NOTICE|공지", text, re.I) else ""; group = ""; continue
        if mode != "notice": continue
        if t in ("sub_header", "sub_sub_header"):
            group = re.sub(r"^[^\w가-힣]+", "", text); continue
        if t == "divider":
            group = ""; continue  # 구분선에서 절을 닫는다 (home.js 와 동일) — 뒤에 붙는 하위 페이지 블록이 회사소개로 새지 않게
        if t == "page":
            # 하위 페이지 블록은 「회사소개」 절 안의 것만 (home.js parseNotionNotice 와 동일 규칙)
            if "회사소개" in group:
                out["about"].append({"title": text or mtitle, "href": SITE + "/" + cid})
            continue
        if t not in ("bulleted_list", "numbered_list", "text") or not link: continue
        if link.startswith("/"): link = SITE + link
        if re.search(r"quick\s*links|바로가기", group, re.I):
            label = text.split(":")[0].strip() or text
            out["quick"].append({"label": label, "href": link}); continue
        if "회사소개" in group:
            out["about"].append({"title": text, "href": link}); continue
        dm = re.search(r"\((\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\)\s*$", text)
        date = f"{dm.group(1)}-{int(dm.group(2)):02d}-{int(dm.group(3)):02d}" if dm else ""
        title = mtitle or (text[:dm.start()].strip() if dm else text) or group  # 멘션 페이지가 SSR에 없으면 그룹명(예: 자료실)으로
        if title:
            out["items"].append({"group": group or "공지", "title": title, "href": link, "date": date})
    return out

def main():
    check = "--check" in sys.argv
    data = parse(fetch(SRC))
    if not data["items"]:
        print("[ABORT] 공지 0건 — 기존 파일 유지"); return 1
    prev = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else None
    payload = {"source": SRC, "count": len(data["items"]), **data}
    if prev and all(prev.get(k) == payload[k] for k in ("items", "quick", "about", "source")):
        print(f"[OK] 변경 없음 ({len(data['items'])}건)"); return 0
    payload["synced_at"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if check:
        print(json.dumps(payload, ensure_ascii=False, indent=1)); return 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f: json.dump(payload, f, ensure_ascii=False, indent=1)
    print(f"[UPDATED] 공지 {len(data['items'])}건 · 바로가기 {len(data['quick'])} · 회사소개 {len(data['about'])} → {os.path.relpath(OUT)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
