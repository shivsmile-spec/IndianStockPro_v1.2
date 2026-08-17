"""Indian Stock Pro - on-demand search analysis dataset builder.

Builds a broader searchable research universe than the featured 30-stock ranking.
Quantitative factors reuse the same statistical engine; news is merged from the
published news/context feed. Missing company-specific news is explicitly marked
as unavailable rather than inferred.
"""

import json
import os
from datetime import datetime, timezone

from quant_engine import download_stock, calculate_score

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNIVERSE = os.path.join(ROOT, "data", "nse_universe.json")
NEWS_FILE = os.path.join(ROOT, "data", "news_context.json")
OUTPUT = os.path.join(ROOT, "data", "search_analysis.json")


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def logical_view(score, news):
    news_dir = str((news or {}).get("overallDirection", "neutral")).lower()
    news_impact = str((news or {}).get("overallImpact", "low")).lower()

    if score >= 80:
        base = "Strong quantitative setup"
    elif score >= 70:
        base = "Constructive quantitative setup"
    elif score >= 60:
        base = "Watch / mixed quantitative setup"
    else:
        base = "Weak quantitative setup"

    if news_dir == "positive":
        if score >= 70:
            conclusion = "Positive alignment"
        else:
            conclusion = "News supportive, but statistics need confirmation"
    elif news_dir == "negative":
        if score >= 70:
            conclusion = "Quantitatively strong, but news is a headwind"
        else:
            conclusion = "Caution: statistical and news signals are weak"
    else:
        conclusion = "No strong news confirmation"

    if news_impact == "high":
        confidence_note = "News impact is high; reassess when new information arrives."
    elif news_impact == "medium":
        confidence_note = "News is a meaningful contextual factor."
    else:
        confidence_note = "News context is low-impact or limited."

    return {
        "label": conclusion,
        "baseSignal": base,
        "confidenceNote": confidence_note,
        "decision": "Research / Watch" if score < 80 else "Strong Setup / Watch for confirmation"
    }


def main():
    universe = load_json(UNIVERSE, {}).get("stocks", [])
    news = load_json(NEWS_FILE, {})
    news_by_symbol = {
        str(x.get("symbol", "")).upper(): x.get("companyNews", {})
        for x in news.get("stocks", [])
        if x.get("symbol")
    }

    # Keep the full NSE directory for search. Statistical analysis is attempted
    # for every NSE EQ security; securities without sufficient market history
    # remain searchable but are marked analysisUnavailable.
    rows = []
    total = len(universe)

    for i, item in enumerate(universe, 1):
        symbol = str(item.get("symbol", "")).strip().upper()
        series = str(item.get("series", "")).upper()
        if not symbol or series != "EQ":
            continue

        print(f"[{i}/{total}] {symbol}")
        quant = None
        try:
            data = download_stock(symbol)
            if data is not None:
                quant = calculate_score(data)
        except Exception as exc:
            print(f"Analysis failed {symbol}: {exc}")

        company_news = news_by_symbol.get(symbol)
        if company_news:
            news_view = {
                "coverage": "company + market",
                "direction": company_news.get("overallDirection", "neutral"),
                "impact": company_news.get("overallImpact", "low"),
                "articles": company_news.get("articles", [])[:5],
                "summary": company_news.get("summary", "Company news available in the published research feed.")
            }
        else:
            news_view = {
                "coverage": "market context only",
                "direction": "neutral",
                "impact": "low",
                "articles": news.get("marketContext", {}).get("articles", [])[:3],
                "summary": "No company-specific article is currently present in the published news feed; market-level context is shown instead."
            }

        if quant:
            logical = logical_view(quant["score"], {
                "overallDirection": news_view["direction"],
                "overallImpact": news_view["impact"]
            })
            rows.append({
                "symbol": symbol,
                "company": item.get("companyName", symbol),
                "isin": item.get("isin"),
                "series": series,
                "analysisAvailable": True,
                "quantitative": quant,
                "news": news_view,
                "logical": logical
            })
        else:
            rows.append({
                "symbol": symbol,
                "company": item.get("companyName", symbol),
                "isin": item.get("isin"),
                "series": series,
                "analysisAvailable": False,
                "quantitative": None,
                "news": news_view,
                "logical": {
                    "label": "Insufficient statistical history",
                    "baseSignal": "Analysis unavailable",
                    "confidenceNote": "The stock remains searchable, but the statistical engine could not obtain enough usable history.",
                    "decision": "Research only"
                }
            })

    output = {
        "version": "2.0",
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": "NSE directory + Indian Stock Pro quantitative engine + published news/context feed",
        "methodology": {
            "quantitative": "Same momentum, trend, relative strength, volume, RSI quality, breakout, volatility and risk/reward factors used by the main ranking engine.",
            "news": "Company-specific news where available; otherwise market-level published context is shown. Missing company news is never invented.",
            "logical": "Transparent rule-based synthesis of quantitative score and news direction; not an automatic buy/sell recommendation."
        },
        "summary": {
            "nseEquityDirectoryCount": len(universe),
            "searchableCount": len(rows),
            "analysisAvailableCount": sum(1 for r in rows if r["analysisAvailable"]),
            "status": "On-demand search analysis dataset ready"
        },
        "stocks": rows
    }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(rows)} searchable NSE equities to {OUTPUT}")


if __name__ == "__main__":
    main()
