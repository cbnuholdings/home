#!/usr/bin/env python3
"""자회사 공개 DB → data/subsidiaries.json 동기화.

원천: www.cbnuholdings.com/portfolio (oopy가 노션 「자회사 공개 DB」를 SSR로 발행한 페이지).
      __NEXT_DATA__ 안의 recordMap(collection schema + 레코드)을 읽는다. 토큰·비밀 불필요.
안전: 파싱 실패·건수 급감(직전 대비 50% 미만)이면 기존 JSON을 덮지 않고 종료코드 1.
실행: python scripts/sync_subsidiaries.py            (기본: 변경 시에만 저장)
      python scripts/sync_subsidiaries.py --check    (저장 없이 결과만 출력)
"""
import json, re, sys, urllib.request, urllib.parse, os, datetime

SRC = "https://www.cbnuholdings.com/portfolio"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "subsidiaries.json")
OOPY_IMG = "https://oopy.lazyrockets.com/api/v2/notion/image?src="

CAT_RULES = [  # (분야 값, 카테고리 키) — 앞선 규칙이 우선
    ("ICT/AI", "ict"), ("바이오", "bio"), ("의료", "bio"),
    ("소재/부품", "mat"), ("모빌리티/자동차", "mat"), ("에너지/환경", "env"),
]

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "cbnu-home-sync/1.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "ignore")

def plain(rich):
    """노션 rich text [[text, [decorations]]...] → 문자열"""
    if not rich: return ""
    out = []
    for seg in rich:
        if isinstance(seg, list) and seg:
            out.append(str(seg[0]))
    return "".join(out).strip()

def rich_url(rich):
    """url 속성: 텍스트 또는 링크 데코레이션에서 URL 추출"""
    if not rich: return ""
    for seg in rich:
        if isinstance(seg, list) and len(seg) > 1:
            for d in seg[1] or []:
                if isinstance(d, list) and d and d[0] == "a" and len(d) > 1:
                    return d[1]
    return plain(rich)

def logo_url(rich, block_id):
    """files 속성 → oopy 이미지 프록시 URL (attachment:… 또는 외부 URL 모두 지원)"""
    if not rich: return ""
    src = ""
    for seg in rich:
        if isinstance(seg, list) and len(seg) > 1:
            for d in seg[1] or []:
                if isinstance(d, list) and d and d[0] == "a" and len(d) > 1:
                    src = d[1]; break
        if src: break
    if not src: return ""
    return OOPY_IMG + urllib.parse.quote(src, safe="") + "&blockId=" + block_id + "&width=1024"

def category(tags):
    for tag, key in CAT_RULES:
        if tag in tags: return key
    return "etc"

def parse(html):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if not m: raise RuntimeError("__NEXT_DATA__ 없음 — oopy 렌더 구조가 바뀌었을 수 있음")
    data = json.loads(m.group(1))
    pp = data["props"]["pageProps"]
    # 컬렉션 스키마
    coll = pp["recordMap"]["collection"]
    coll_id, coll_val = next(iter(coll.items()))
    schema = coll_val["value"]["schema"] if "value" in coll_val else coll_val["schema"]
    name_of = {k: v["name"] for k, v in schema.items()}
    def prop_key(name):
        for k, v in schema.items():
            if v["name"] == name: return k
        return None
    K = {n: prop_key(n) for n in ["대표자", "한줄소개", "홈페이지", "분야", "로고/이미지", "공개", "정렬순서"]}
    # 레코드: queryCollectionResult 아래 block들 중 parent가 이 컬렉션인 page
    blocks = {}
    for qid, q in pp.get("queryCollectionResult", {}).items():
        blocks.update(q.get("recordMap", {}).get("block", {}))
    blocks.update(pp["recordMap"].get("block", {}))
    rows = []
    for bid, b in blocks.items():
        v = b.get("value", b)
        if isinstance(v, dict) and "value" in v: v = v["value"]  # 일부 형식은 이중 래핑
        if v.get("type") != "page" or v.get("parent_id") != coll_id: continue
        if v.get("alive") is False: continue
        p = v.get("properties", {})
        title = plain(p.get("title"))
        if not title: continue
        # 공개 필터: 공개 체크박스가 있으면 Yes만
        if K["공개"] and p.get(K["공개"]) is not None and plain(p.get(K["공개"])) != "Yes":
            continue
        tags = [t.strip() for t in plain(p.get(K["분야"])).split(",") if t.strip()] if K["분야"] else []
        rows.append({
            "id": bid,
            "name": title,
            "ceo": plain(p.get(K["대표자"])) if K["대표자"] else "",
            "desc": plain(p.get(K["한줄소개"])) if K["한줄소개"] else "",
            "site": rich_url(p.get(K["홈페이지"])) if K["홈페이지"] else "",
            "tags": tags,
            "cat": category(tags),
            "logo": logo_url(p.get(K["로고/이미지"]), bid) if K["로고/이미지"] else "",
            "order": float(plain(p.get(K["정렬순서"])) or 0) if K["정렬순서"] and plain(p.get(K["정렬순서"])) else None,
        })
    rows.sort(key=lambda r: (r["order"] is None, r["order"] if r["order"] is not None else 0, r["name"]))
    return rows

def main():
    check = "--check" in sys.argv
    html = fetch(SRC)
    rows = parse(html)
    if len(rows) < 5:
        print(f"[ABORT] 파싱 건수 {len(rows)} — 비정상, 기존 파일 유지"); return 1
    prev = None
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f: prev = json.load(f)
        if len(rows) < len(prev.get("items", [])) * 0.5:
            print(f"[ABORT] 건수 급감 {len(prev['items'])}→{len(rows)} — 기존 파일 유지"); return 1
    payload = {"source": SRC, "count": len(rows), "items": rows}
    if prev and prev.get("items") == rows:
        print(f"[OK] 변경 없음 ({len(rows)}건)"); return 0
    payload["synced_at"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if check:
        print(json.dumps(payload, ensure_ascii=False, indent=1)[:3000]); return 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    print(f"[UPDATED] {len(rows)}건 → {os.path.relpath(OUT)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
