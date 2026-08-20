from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "market_news.json"
HEADERS = {"User-Agent": "Mozilla/5.0 IndianStockPro/1.9"}

QUERIES = [
    "Indian stock market Nifty Sensex India shares",
    "India stocks RBI rupee crude oil market",
    "Indian stocks corporate earnings order win upgrade downgrade",
    "SEBI NSE BSE Indian markets regulation",
    "India IPO stocks mutual funds FII DII market",
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def parse_date(value: str) -> str:
    try:
        dt = datetime.strptime(value, "%a, %d %b %Y %H:%M:%S %Z").replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        return value


def fetch_news(query: str, limit: int = 8):
    params = urllib.parse.urlencode({"q": query + " when:3d", "hl": "en-IN", "gl": "IN", "ceid": "IN:en"})
    root = ET.fromstring(fetch("https://news.google.com/rss/search?" + params))
    rows = []
    for item in root.findall("./channel/item")[:limit]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        if not title or not link:
            continue
        source = item.find("source")
        source_name = (source.text if source is not None else "") or "Google News"
        description = re.sub(r"<[^>]+>", " ", item.findtext("description") or "")
        description = re.sub(r"\s+", " ", description).strip()
        rows.append({
            "title": title,
            "link": link,
            "published": parse_date((item.findtext("pubDate") or "").strip()),
            "source": source_name,
            "description": description[:700],
        })
    return rows


def main():
    items = []
    seen = set()
    for query in QUERIES:
        try:
            rows = fetch_news(query)
            for row in rows:
                key = row["title"].lower().strip()
                if key in seen:
                    continue
                seen.add(key)
                items.append(row)
        except Exception as exc:
            print(f"Query failed: {query}: {exc}")

    items.sort(key=lambda x: x.get("published", ""), reverse=True)
    items = items[:30]
    generated = datetime.now(timezone.utc).isoformat()
    payload = {
        "version": "1.0",
        "generatedAt": generated,
        "source": "Google News RSS public market-news aggregation",
        "note": "Fresh market-news context. Headlines are external information, not investment recommendations.",
        "items": items,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Market news items: {len(items)}")
    if not items:
        raise SystemExit("Market news feed is empty")


if __name__ == "__main__":
    main()
