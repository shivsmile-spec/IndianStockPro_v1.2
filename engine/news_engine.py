"""
Indian Stock Pro v1.2
News & Context Engine - Stage 2

Purpose:
1. Read the 30 stocks selected by the quantitative engine.
2. Collect recent news related to each company.
3. Collect industry/sector and market-wide context.
4. Classify news as positive, negative, or neutral.
5. Estimate the possible impact on the stock.
6. Save the result separately as news_context.json.

This engine does NOT make the final investment decision.
The reasoning engine will combine quantitative + context analysis later.
"""

import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import yfinance as yf


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RANKINGS_FILE = os.path.join(ROOT, "data", "rankings.json")
OUTPUT_FILE = os.path.join(ROOT, "data", "news_context.json")


# ---------------------------------------------------------------------
# News keywords
# ---------------------------------------------------------------------

POSITIVE_WORDS = [
    "profit",
    "profits",
    "growth",
    "strong growth",
    "record",
    "revenue growth",
    "order win",
    "order wins",
    "contract",
    "new contract",
    "approval",
    "approved",
    "expansion",
    "acquisition",
    "partnership",
    "upgrade",
    "buy rating",
    "bullish",
    "positive",
    "outperform",
    "dividend",
    "capacity expansion",
    "investment",
]

NEGATIVE_WORDS = [
    "loss",
    "losses",
    "decline",
    "fall",
    "falls",
    "drop",
    "drops",
    "downgrade",
    "bearish",
    "negative",
    "fraud",
    "scandal",
    "investigation",
    "penalty",
    "fine",
    "lawsuit",
    "debt",
    "default",
    "strike",
    "shutdown",
    "weak demand",
    "misses estimates",
    "missed estimates",
    "warning",
    "regulatory action",
]

GEOPOLITICAL_WORDS = [
    "war",
    "iran",
    "israel",
    "russia",
    "ukraine",
    "conflict",
    "sanctions",
    "tariff",
    "trade war",
    "attack",
    "missile",
    "ceasefire",
]

MACRO_WORDS = [
    "interest rate",
    "rbi",
    "inflation",
    "recession",
    "gdp",
    "rupee",
    "inr",
    "crude oil",
    "oil price",
    "natural gas",
    "gold",
    "commodity",
]


# ---------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------

def load_rankings():
    """Load the quantitative engine output."""
    with open(RANKINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def safe_text(value):
    """Convert a value into clean text."""
    if value is None:
        return ""
    return str(value).strip()


def clean_text(text):
    """Normalize text for keyword analysis."""
    text = safe_text(text).lower()
    text = re.sub(r"\s+", " ", text)
    return text


def contains_any(text, words):
    """Return matching keywords."""
    text = clean_text(text)
    return [word for word in words if word in text]


# ---------------------------------------------------------------------
# Company information
# ---------------------------------------------------------------------

def get_company_info(symbol):
    """
    Try to obtain company name and sector using Yahoo Finance.

    Failure is allowed because the news engine should continue working
    even if one symbol cannot be resolved.
    """

    ticker_symbol = symbol.upper() + ".NS"

    try:
        ticker = yf.Ticker(ticker_symbol)

        info = ticker.info or {}

        company = (
            info.get("longName")
            or info.get("shortName")
            or symbol
        )

        sector = info.get("sector") or "Unknown"
        industry = info.get("industry") or "Unknown"

        return {
            "company": company,
            "sector": sector,
            "industry": industry,
        }

    except Exception:
        return {
            "company": symbol,
            "sector": "Unknown",
            "industry": "Unknown",
        }


# ---------------------------------------------------------------------
# Google News RSS
# ---------------------------------------------------------------------

def fetch_google_news(query, limit=8):
    """
    Fetch recent Google News RSS results.

    RSS is used instead of requiring a paid news API key.
    """

    encoded_query = urllib.parse.quote(query)

    url = (
        "https://news.google.com/rss/search?"
        f"q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
    )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 "
                "IndianStockPro/1.2"
            )
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)

        results = []

        for item in root.findall(".//item")[:limit]:
            title = item.findtext("title") or ""
            link = item.findtext("link") or ""
            pub_date = item.findtext("pubDate") or ""
            description = item.findtext("description") or ""

            results.append(
                {
                    "title": title.strip(),
                    "link": link.strip(),
                    "published": pub_date.strip(),
                    "description": re.sub(
                        r"<[^>]+>",
                        " ",
                        description
                    ).strip(),
                }
            )

        return results

    except Exception as exc:
        return [
            {
                "title": "",
                "link": "",
                "published": "",
                "description": "",
                "error": str(exc),
            }
        ]


# ---------------------------------------------------------------------
# News classification
# ---------------------------------------------------------------------

def classify_news(article):
    """
    Basic transparent keyword-based classification.

    Later the reasoning engine can make a much deeper contextual
    assessment.
    """

    combined = " ".join(
        [
            safe_text(article.get("title")),
            safe_text(article.get("description")),
        ]
    )

    positive = contains_any(combined, POSITIVE_WORDS)
    negative = contains_any(combined, NEGATIVE_WORDS)
    geopolitical = contains_any(combined, GEOPOLITICAL_WORDS)
    macro = contains_any(combined, MACRO_WORDS)

    score = 0

    score += len(positive) * 2
    score -= len(negative) * 2

    # Geopolitical and macro news are deliberately not automatically
    # treated as positive or negative.
    # Their direction depends on the company and industry.

    if positive and not negative:
        direction = "positive"
    elif negative and not positive:
        direction = "negative"
    elif positive and negative:
        direction = "mixed"
    else:
        direction = "neutral"

    if abs(score) >= 4:
        impact = "high"
    elif abs(score) >= 2:
        impact = "medium"
    else:
        impact = "low"

    return {
        "direction": direction,
        "impact": impact,
        "rawScore": score,
        "positiveKeywords": positive,
        "negativeKeywords": negative,
        "geopoliticalKeywords": geopolitical,
        "macroKeywords": macro,
    }


# ---------------------------------------------------------------------
# Company news
# ---------------------------------------------------------------------

def analyze_company(symbol):
    """Collect and analyze company-specific news."""

    info = get_company_info(symbol)

    company = info["company"]
    sector = info["sector"]
    industry = info["industry"]

    query = f'"{company}" OR "{symbol}" NSE India'

    articles = fetch_google_news(query, limit=8)

    analyzed_articles = []

    total_score = 0
    high_impact_count = 0

    for article in articles:
        classification = classify_news(article)

        article_result = {
            **article,
            "classification": classification,
        }

        analyzed_articles.append(article_result)

        total_score += classification["rawScore"]

        if classification["impact"] == "high":
            high_impact_count += 1

        time.sleep(0.2)

    if total_score > 0:
        overall_direction = "positive"
    elif total_score < 0:
        overall_direction = "negative"
    else:
        overall_direction = "neutral"

    if abs(total_score) >= 8 or high_impact_count >= 2:
        overall_impact = "high"
    elif abs(total_score) >= 3:
        overall_impact = "medium"
    else:
        overall_impact = "low"

    return {
        "symbol": symbol,
        "company": company,
        "sector": sector,
        "industry": industry,
        "overallDirection": overall_direction,
        "overallImpact": overall_impact,
        "newsScore": total_score,
        "highImpactNewsCount": high_impact_count,
        "articles": analyzed_articles,
    }


# ---------------------------------------------------------------------
# Sector / industry context
# ---------------------------------------------------------------------

def analyze_industry(sector, industry):
    """
    Search for industry-level events.

    Industry news is kept separate from company news because an event
    can affect many companies differently.
    """

    if sector == "Unknown" and industry == "Unknown":
        return {
            "sector": sector,
            "industry": industry,
            "articles": [],
            "contextScore": 0,
        }

    queries = []

    if industry != "Unknown":
        queries.append(f'"{industry}" India stocks')

    if sector != "Unknown":
        queries.append(f'"{sector}" India stocks')

    articles = []

    for query in queries:
        articles.extend(fetch_google_news(query, limit=5))
        time.sleep(0.3)

    analyzed = []

    score = 0

    for article in articles:
        classification = classify_news(article)

        analyzed.append(
            {
                **article,
                "classification": classification,
            }
        )

        score += classification["rawScore"]

    if score > 0:
        direction = "positive"
    elif score < 0:
        direction = "negative"
    else:
        direction = "neutral"

    return {
        "sector": sector,
        "industry": industry,
        "direction": direction,
        "contextScore": score,
        "articles": analyzed,
    }


# ---------------------------------------------------------------------
# Macro / geopolitical context
# ---------------------------------------------------------------------

def analyze_macro_context():
    """
    Search for major events that can affect multiple industries.
    """

    queries = [
        "India economy RBI inflation interest rates",
        "India crude oil prices energy market",
        "India geopolitical news trade sanctions war",
        "India government policy business markets",
    ]

    articles = []

    for query in queries:
        articles.extend(fetch_google_news(query, limit=6))
        time.sleep(0.3)

    analyzed = []

    for article in articles:
        classification = classify_news(article)

        analyzed.append(
            {
                **article,
                "classification": classification,
            }
        )

    return {
        "articles": analyzed,
        "description": (
            "Macro, commodity, government and geopolitical "
            "context for the Indian market."
        ),
    }


# ---------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------

def main():

    rankings = load_rankings()

    selected_stocks = []

    for band in rankings.get("bands", []):
        for stock in band.get("stocks", []):
            symbol = stock.get("symbol")

            if symbol:
                selected_stocks.append(
                    {
                        "symbol": symbol,
                        "quantitativeScore": stock.get("score"),
                        "confidence": stock.get("confidence"),
                        "risk": stock.get("risk"),
                        "price": stock.get("price"),
                        "priceBand": stock.get("priceBand"),
                    }
                )

    # Safety limit: Stage 1 should provide 30 stocks.
    selected_stocks = selected_stocks[:30]

    print(
        f"News engine processing {len(selected_stocks)} stocks..."
    )

    macro_context = analyze_macro_context()

    results = []

    for index, stock in enumerate(selected_stocks, start=1):

        symbol = stock["symbol"]

        print(
            f"[{index}/{len(selected_stocks)}] "
            f"Analyzing {symbol}"
        )

        company_result = analyze_company(symbol)

        industry_result = analyze_industry(
            company_result["sector"],
            company_result["industry"],
        )

        results.append(
            {
                **stock,
                "companyNews": company_result,
                "industryContext": industry_result,
            }
        )

        # Small delay to reduce unnecessary request bursts.
        time.sleep(0.5)

    output = {
        "version": "1.2",
        "stage": "news_context",
        "generated": datetime.now(
            timezone.utc
        ).isoformat(),

        "methodology": {
            "description": (
                "Company news, industry context, macroeconomic, "
                "commodity and geopolitical screening after "
                "quantitative stock selection."
            ),
            "note": (
                "News signals are contextual inputs, not automatic "
                "buy or sell decisions."
            ),
        },

        "summary": {
            "inputStocks": len(selected_stocks),
            "status": "News and context collection complete",
        },

        "marketContext": macro_context,

        "stocks": results,

        "nextStage": {
            "status": "Waiting for logical reasoning engine",
            "planned": [
                "Combine quantitative score with news score",
                "Identify company-specific catalysts",
                "Identify industry-wide risks",
                "Evaluate geopolitical impact",
                "Evaluate commodity impact",
                "Evaluate government and regulatory impact",
                "Avoid treating headlines as automatic signals",
                "Produce final contextual assessment",
            ],
        },
    }

    os.makedirs(
        os.path.dirname(OUTPUT_FILE),
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            output,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        f"News context written to: {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()
