"""
Indian Stock Pro v1.2
Logical Context Engine - Stage 3

Purpose:
Combine quantitative results with news/context information
and reason about how external events may affect each stock.

This is a rule-based reasoning layer.
It does NOT make automatic investment decisions.
"""

import json
import os
from datetime import datetime, timezone


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RANKINGS_FILE = os.path.join(ROOT, "data", "rankings.json")
NEWS_FILE = os.path.join(ROOT, "data", "news_context.json")
OUTPUT_FILE = os.path.join(ROOT, "data", "context_analysis.json")


# ---------------------------------------------------------
# Basic helpers
# ---------------------------------------------------------

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def clamp(value, low=-100, high=100):
    return max(low, min(high, value))


def safe_number(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------
# Context impact conversion
# ---------------------------------------------------------

IMPACT_VALUES = {
    "very_high": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}


def impact_value(impact):
    return IMPACT_VALUES.get(str(impact).lower(), 0)


def direction_value(direction):
    direction = str(direction).lower()

    if direction == "positive":
        return 1

    if direction == "negative":
        return -1

    return 0


# ---------------------------------------------------------
# Extract context score
# ---------------------------------------------------------

def calculate_context_score(stock):
    """
    Calculate an initial context score.

    Company news is given greater importance than
    broad market context because company-specific
    information normally has a more direct relationship
    with the stock.
    """

    company = stock.get("companyNews", {})
    industry = stock.get("industryContext", {})

    company_direction = direction_value(
        company.get("overallDirection", "neutral")
    )

    industry_direction = direction_value(
        industry.get("overallDirection", "neutral")
    )

    company_impact = impact_value(
        company.get("overallImpact", "low")
    )

    industry_impact = impact_value(
        industry.get("overallImpact", "low")
    )

    company_score = company_direction * company_impact * 10
    industry_score = industry_direction * industry_impact * 6

    score = company_score + industry_score

    return clamp(score)


# ---------------------------------------------------------
# Detect conflicting signals
# ---------------------------------------------------------

def detect_conflict(quant_score, context_score):
    """
    Detect situations where quantitative momentum
    and real-world context disagree.
    """

    quant_score = safe_number(quant_score)

    if quant_score >= 65 and context_score <= -20:
        return True, "Strong quantitative setup but negative context."

    if quant_score <= 40 and context_score >= 20:
        return True, "Weak quantitative setup but positive context."

    return False, ""


# ---------------------------------------------------------
# Human-readable reasoning
# ---------------------------------------------------------

def build_reasoning(stock, context_score, conflict, conflict_reason):

    symbol = stock.get("symbol", "UNKNOWN")

    company = stock.get("companyNews", {})
    industry = stock.get("industryContext", {})

    company_name = company.get("company", symbol)
    sector = company.get("sector", "Unknown")
    industry_name = company.get("industry", "Unknown")

    company_direction = company.get(
        "overallDirection", "neutral"
    )

    industry_direction = industry.get(
        "overallDirection", "neutral"
    )

    reasoning = []

    reasoning.append(
        f"{company_name} belongs to the {industry_name} industry "
        f"within the {sector} sector."
    )

    reasoning.append(
        f"Company-level news is currently {company_direction}."
    )

    reasoning.append(
        f"Industry-level context is currently {industry_direction}."
    )

    if context_score > 20:
        reasoning.append(
            "The combined context currently provides a positive external backdrop."
        )

    elif context_score < -20:
        reasoning.append(
            "The combined context currently creates a negative external backdrop."
        )

    else:
        reasoning.append(
            "The available external context is relatively balanced or limited."
        )

    if conflict:
        reasoning.append(
            f"Conflict detected: {conflict_reason}"
        )

    return reasoning


# ---------------------------------------------------------
# Analyze one stock
# ---------------------------------------------------------

def analyze_stock(stock):

    symbol = stock.get("symbol", "UNKNOWN")

    quant_score = safe_number(
        stock.get("quantitativeScore", stock.get("score", 0))
    )

    context_score = calculate_context_score(stock)

    conflict, conflict_reason = detect_conflict(
        quant_score,
        context_score
    )

    if context_score >= 35:
        context_signal = "Positive"

    elif context_score <= -35:
        context_signal = "Negative"

    else:
        context_signal = "Neutral"

    reasoning = build_reasoning(
        stock,
        context_score,
        conflict,
        conflict_reason
    )

    return {
        "symbol": symbol,
        "quantitativeScore": round(quant_score, 2),
        "contextScore": round(context_score, 2),
        "contextSignal": context_signal,
        "conflictDetected": conflict,
        "conflictReason": conflict_reason,
        "reasoning": reasoning,
        "status": "Context analysis only"
    }


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def main():

    rankings = load_json(RANKINGS_FILE)
    news_data = load_json(NEWS_FILE)

    stocks = news_data.get("stocks", [])

    if not stocks:
        raise RuntimeError(
            "No stocks found in news_context.json"
        )

    results = []

    for stock in stocks:
        results.append(
            analyze_stock(stock)
        )

    output = {
        "version": "1.2",
        "stage": "logical_context",
        "generated": datetime.now(timezone.utc).isoformat(),
        "methodology": {
            "description":
                "Rule-based logical context analysis combining "
                "quantitative screening with company and industry context.",
            "purpose":
                "Identify contextual support, contextual risk and conflicts "
                "between statistical and external signals."
        },
        "summary": {
            "inputStocks": len(stocks),
            "analyzedStocks": len(results),
            "status": "Logical context analysis complete"
        },
        "stocks": results
    }

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
        f"Context analysis completed for {len(results)} stocks."
    )


if __name__ == "__main__":
    main()
