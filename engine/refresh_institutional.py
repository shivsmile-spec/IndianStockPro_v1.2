from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "institutional_research.json"
HEADERS = {"User-Agent": "Mozilla/5.0 IndianStockPro/1.9"}

QUERIES = [
    "India brokerage stock picks target price Buy OR Hold OR Add",
    "India institutional equities stock research target price",
    "India mutual fund portfolio bought stocks HDFC ICICI SBI Nippon",
    "India Jefferies Morgan Stanley Goldman Sachs HSBC stock rating",
    "India Motilal Oswal Kotak ICICI Securities Axis Securities stock picks",
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()


def google_news(query: str):
    params = urllib.parse.urlencode({"q": query + " when:7d", "hl": "en-IN", "gl": "IN", "ceid": "IN:en"})
    root = ET.fromstring(fetch("https://news.google.com/rss/search?" + params))
    items = []
    for item in root.findall("./channel/item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        published = (item.findtext("pubDate") or "").strip()
        source = item.find("source")
        source_name = (source.text if source is not None else "") or "Google News source"
        description = re.sub(r"<[^>]+>", " ", item.findtext("description") or "")
        description = re.sub(r"\s+", " ", description).strip()
        if not title or not link:
            continue
        try:
            dt = datetime.strptime(published, "%a, %d %b %Y %H:%M:%S %Z").replace(tzinfo=timezone.utc)
            iso = dt.isoformat()
        except Exception:
            iso = published
        items.append({
            "title": title,
            "link": link,
            "published": iso,
            "source": source_name,
            "description": description[:500],
        })
    return items


def main():
    all_items = []
    seen = set()
    for query in QUERIES:
        try:
            for item in google_news(query):
                key = item["title"].lower().strip()
                if key in seen:
                    continue
                seen.add(key)
                all_items.append(item)
        except Exception as exc:
            print(f"Research query failed: {query}: {exc}")

    all_items.sort(key=lambda x: x.get("published", ""), reverse=True)
    all_items = all_items[:30]
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "version": "1.0",
        "generated": now,
        "snapshotDate": now[:10],
        "source": "Google News RSS aggregation of public institutional/brokerage/fund research coverage",
        "note": "Fresh public research coverage is shown as external context. Ratings and targets belong to the cited institution/source and are not recommendations by Indian Stock Pro.",
        "items": all_items,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Institutional research articles published: {len(all_items)}")
    if not all_items:
        raise SystemExit("No institutional research articles were collected")


if __name__ == "__main__":
    main()
