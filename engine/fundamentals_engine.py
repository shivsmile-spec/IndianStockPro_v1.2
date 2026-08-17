import json
from datetime import datetime, timezone
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
RANKINGS = ROOT / "data" / "rankings.json"
OUT = ROOT / "data" / "fundamentals.json"


def safe_num(value):
    try:
        v = float(value)
        return v if v == v else None
    except Exception:
        return None


def pct(value):
    v = safe_num(value)
    if v is None:
        return None
    # Yahoo commonly returns ratios for margins/ROE and decimal ratios for growth.
    return v * 100 if abs(v) <= 5 else v


def classify(score):
    if score >= 75:
        return "Strong"
    if score >= 60:
        return "Good"
    if score >= 45:
        return "Neutral"
    return "Weak"


def main():
    data = json.loads(RANKINGS.read_text(encoding="utf-8"))
    stocks = []
    if isinstance(data.get("bands"), list):
        for band in data["bands"]:
            stocks.extend(band.get("stocks") or [])
    elif isinstance(data.get("stocks"), list):
        stocks = data["stocks"]

    seen = set()
    results = {}
    for stock in stocks:
        symbol = str(stock.get("symbol") or "").strip().upper()
        if not symbol or symbol in seen:
            continue
        seen.add(symbol)
        try:
            info = yf.Ticker(symbol + ".NS").get_info()
            metrics = {
                "revenueGrowth": pct(info.get("revenueGrowth")),
                "earningsGrowth": pct(info.get("earningsGrowth")),
                "eps": safe_num(info.get("trailingEps")),
                "roe": pct(info.get("returnOnEquity")),
                "roa": pct(info.get("returnOnAssets")),
                "debtToEquity": safe_num(info.get("debtToEquity")),
                "operatingMargin": pct(info.get("operatingMargins")),
                "profitMargin": pct(info.get("profitMargins")),
                "pe": safe_num(info.get("trailingPE")),
                "pb": safe_num(info.get("priceToBook")),
                "dividendYield": pct(info.get("dividendYield")),
                "promoterHolding": pct(info.get("heldPercentInsiders")),
                "marketCap": safe_num(info.get("marketCap")),
            }

            points = []
            if metrics["revenueGrowth"] is not None:
                points.append(1 if metrics["revenueGrowth"] > 10 else -1 if metrics["revenueGrowth"] < 0 else 0)
            if metrics["earningsGrowth"] is not None:
                points.append(1 if metrics["earningsGrowth"] > 10 else -1 if metrics["earningsGrowth"] < 0 else 0)
            if metrics["roe"] is not None:
                points.append(1 if metrics["roe"] > 15 else -1 if metrics["roe"] < 8 else 0)
            if metrics["debtToEquity"] is not None:
                points.append(1 if metrics["debtToEquity"] < 80 else -1 if metrics["debtToEquity"] > 180 else 0)
            if metrics["operatingMargin"] is not None:
                points.append(1 if metrics["operatingMargin"] > 12 else -1 if metrics["operatingMargin"] < 5 else 0)
            if metrics["profitMargin"] is not None:
                points.append(1 if metrics["profitMargin"] > 8 else -1 if metrics["profitMargin"] < 2 else 0)

            score = round(50 + (sum(points) / max(1, len(points))) * 25, 1)
            available = sum(v is not None for v in metrics.values())
            health = classify(score) if available >= 3 else "Data limited"

            results[symbol] = {
                "symbol": symbol,
                "companyName": stock.get("companyName") or stock.get("name") or symbol,
                "snapshotAt": datetime.now(timezone.utc).isoformat(),
                "health": health,
                "score": score if available >= 3 else None,
                "dataPoints": available,
                "metrics": metrics,
                "methodology": "Heuristic fundamental snapshot from publicly surfaced Yahoo Finance company metrics; not a valuation model or investment recommendation.",
            }
            print(f"{symbol}: {health} ({score})")
        except Exception as exc:
            results[symbol] = {
                "symbol": symbol,
                "companyName": stock.get("companyName") or stock.get("name") or symbol,
                "snapshotAt": datetime.now(timezone.utc).isoformat(),
                "health": "Data unavailable",
                "score": None,
                "dataPoints": 0,
                "metrics": {},
                "error": str(exc),
                "methodology": "Fundamental data was not available at snapshot time.",
            }
            print(f"{symbol}: unavailable: {exc}")

    OUT.write_text(json.dumps({
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Yahoo Finance public company metrics via yfinance",
        "count": len(results),
        "stocks": results,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(results)} fundamental snapshots")


if __name__ == "__main__":
    main()
