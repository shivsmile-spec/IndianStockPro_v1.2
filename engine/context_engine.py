"""
Indian Stock Pro v1.2
Logical Context Engine - Stage 3

Combines:
1. Quantitative score from rankings.json
2. Company-specific news
3. Industry/sector context
4. Market-wide macro/geopolitical context

This is a deterministic, rule-based evidence-fusion layer.
It does not make automatic investment decisions.
"""

import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RANKINGS_FILE = os.path.join(ROOT, "data", "rankings.json")
NEWS_FILE = os.path.join(ROOT, "data", "news_context.json")
OUTPUT_FILE = os.path.join(ROOT, "data", "context_analysis.json")

# Final score weights. Quantitative evidence remains dominant.
WEIGHTS = {
    "quantitative": 0.60,
    "company": 0.20,
    "industry": 0.10,
    "market": 0.10,
}

IMPACT_VALUES = {
    "very_high": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}

SIGNAL_THRESHOLDS = {
    "strong": 80,
    "positive": 70,
    "watch": 60,
    "neutral": 50,
    "caution": 40,
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def safe_number(value, default=0.0):
    try:
        number = float(value)
        if number != number:  # NaN
            return default
        return number
    except (TypeError, ValueError):
        return default


def clamp(value, low=-100.0, high=100.0):
    return max(low, min(high, safe_number(value)))


def direction_value(direction):
    direction = str(direction or "neutral").strip().lower()

    if direction == "positive":
        return 1
    if direction == "negative":
        return -1
    return 0


def impact_value(impact):
    return IMPACT_VALUES.get(str(impact or "low").strip().lower(), 0)


def signed_to_0_100(value):
    """Convert -100..100 evidence score into a 0..100 score."""
    return clamp((clamp(value) + 100.0) / 2.0, 0.0, 100.0)


def calculate_company_score(company):
    """
    Convert company direction + impact into a normalized -100..100 score.

    A very-high impact positive event = +100.
    A very-high impact negative event = -100.
    """
    direction = direction_value(company.get("overallDirection"))
    impact = impact_value(company.get("overallImpact"))

    if direction == 0 or impact == 0:
        return 0.0

    return clamp(direction * (impact / 4.0) * 100.0)


def calculate_industry_score(industry):
    """
    Industry context comes from the Stage 2 raw contextScore.

    Stage 2 can produce different raw totals depending on article count,
    so we cap the raw score at +/-20 before converting it to -100..100.
    """
    raw = safe_number(industry.get("contextScore", 0))
    return clamp((max(-20.0, min(20.0, raw)) / 20.0) * 100.0)


def calculate_market_score(market_context):
    """
    Aggregate Stage 2 market-context article raw scores.

    The market context is shared across stocks, so it has only a 10% weight.
    """
    articles = market_context.get("articles", [])
    total = 0.0

    for article in articles:
        classification = article.get("classification", {})
        total += safe_number(classification.get("rawScore", 0))

    # Avoid a large number of headlines overpowering the company signal.
    return clamp((max(-20.0, min(20.0, total)) / 20.0) * 100.0)


def detect_conflict(quant_score, company_score, industry_score, market_score):
    """
    Detect meaningful disagreement rather than treating every difference
    as a conflict.
    """
    quant = safe_number(quant_score)

    context_components = [
        company_score,
        industry_score,
        market_score,
    ]

    context_average = (
        context_components[0] * 0.50
        + context_components[1] * 0.25
        + context_components[2] * 0.25
    )

    if quant >= 65 and context_average <= -25:
        return True, "Strong quantitative setup is facing materially negative external context."

    if quant <= 40 and context_average >= 25:
        return True, "Weak quantitative setup is being supported by materially positive external context."

    return False, ""


def determine_alignment(quant_score, context_score):
    quant = safe_number(quant_score)

    if quant >= 65 and context_score >= 20:
        return "confirmed"

    if quant <= 40 and context_score <= -20:
        return "confirmed_negative"

    if (quant >= 65 and context_score <= -20) or (
        quant <= 40 and context_score >= 20
    ):
        return "conflicting"

    return "mixed"


def calculate_final_score(quant_score, company_score, industry_score, market_score):
    """
    Evidence fusion:

    Quantitative 60%
    Company       20%
    Industry      10%
    Market        10%

    Each context component is converted from -100..100 to 0..100
    before weighting.
    """
    quant = max(0.0, min(100.0, safe_number(quant_score)))

    final_score = (
        quant * WEIGHTS["quantitative"]
        + signed_to_0_100(company_score) * WEIGHTS["company"]
        + signed_to_0_100(industry_score) * WEIGHTS["industry"]
        + signed_to_0_100(market_score) * WEIGHTS["market"]
    )

    return max(0.0, min(100.0, final_score))


def apply_conflict_penalty(final_score, conflict, company_score):
    """
    Reduce confidence in a conflicting setup without allowing context
    to completely erase a strong quantitative result.

    Company-specific negative context receives a slightly larger penalty
    because it is more directly connected to the individual stock.
    """
    if not conflict:
        return final_score, 0.0

    penalty = 5.0

    if company_score <= -75:
        penalty = 8.0
    elif company_score <= -50:
        penalty = 7.0

    return max(0.0, final_score - penalty), penalty


def determine_signal(final_score, conflict, company_score):
    """
    Human-readable assessment, not a buy/sell instruction.
    """
    score = safe_number(final_score)

    if company_score <= -75 and score >= 70:
        return "Caution"

    if score >= SIGNAL_THRESHOLDS["strong"]:
        return "Strong Setup"
    if score >= SIGNAL_THRESHOLDS["positive"]:
        return "Positive"
    if score >= SIGNAL_THRESHOLDS["watch"]:
        return "Watch"
    if score >= SIGNAL_THRESHOLDS["neutral"]:
        return "Neutral"
    if score >= SIGNAL_THRESHOLDS["caution"]:
        return "Caution"
    return "Weak"


def determine_risk(stock, company_score, conflict, final_score):
    """
    Contextual risk label. This is separate from the quantitative risk
    value already calculated by Stage 1.
    """
    quant_risk = safe_number(stock.get("risk", 50))

    if company_score <= -75 or quant_risk >= 70:
        risk = "High"
    elif company_score <= -50 or conflict or quant_risk >= 50:
        risk = "Elevated"
    elif company_score >= 50 and quant_risk < 40:
        risk = "Moderate"
    else:
        risk = "Normal"

    if final_score < 40:
        risk = "High" if risk != "High" else risk

    return risk


def calculate_confidence(stock, alignment, conflict, company_score, market_score):
    """
    Confidence is not the same as score.

    Start with Stage 1 confidence, then adjust for agreement/conflict.
    """
    base = max(0.0, min(100.0, safe_number(stock.get("confidence", 50))))
    confidence = base

    if alignment == "confirmed":
        confidence += 6
    elif alignment == "confirmed_negative":
        confidence += 3
    elif alignment == "conflicting":
        confidence -= 12

    if company_score <= -75:
        confidence -= 6

    if abs(market_score) >= 75:
        confidence -= 2

    return round(max(0.0, min(100.0, confidence)), 2)


def build_reasoning(
    stock,
    company_score,
    industry_score,
    market_score,
    final_score,
    signal,
    risk,
    conflict,
    conflict_reason,
):
    symbol = stock.get("symbol", "UNKNOWN")
    company = stock.get("companyNews", {})
    industry = stock.get("industryContext", {})

    company_name = company.get("company", symbol)
    sector = company.get("sector", "Unknown")
    industry_name = company.get("industry", "Unknown")

    company_direction = company.get("overallDirection", "neutral")
    company_impact = company.get("overallImpact", "low")
    industry_direction = industry.get("direction", "neutral")

    reasoning = [
        f"{company_name} belongs to the {industry_name} industry within the {sector} sector.",
        (
            f"Company-specific news is {company_direction} with "
            f"{company_impact} overall impact."
        ),
        f"Industry context is currently {industry_direction}.",
        (
            f"Evidence fusion produced a final score of {final_score:.2f}/100 "
            f"with a {signal} assessment."
        ),
    ]

    if company_score >= 50:
        reasoning.append(
            "Company-specific context provides meaningful support to the quantitative setup."
        )
    elif company_score <= -50:
        reasoning.append(
            "Company-specific context creates meaningful downside risk to the quantitative setup."
        )

    if industry_score >= 50:
        reasoning.append("Industry conditions provide a supportive backdrop.")
    elif industry_score <= -50:
        reasoning.append("Industry conditions create a negative backdrop.")

    if market_score >= 50:
        reasoning.append("Broader market context is supportive.")
    elif market_score <= -50:
        reasoning.append("Broader market context is currently unfavorable.")

    if conflict:
        reasoning.append(f"Conflict detected: {conflict_reason}")
        reasoning.append(
            "The conflict reduces confidence; the system does not automatically treat "
            "the technical signal as invalid."
        )

    reasoning.append(f"Contextual risk level is {risk}.")

    return reasoning


def analyze_stock(stock, market_context):
    symbol = stock.get("symbol", "UNKNOWN")

    quant_score = safe_number(
        stock.get("quantitativeScore", stock.get("score", 0))
    )

    company = stock.get("companyNews", {})
    industry = stock.get("industryContext", {})

    company_score = calculate_company_score(company)
    industry_score = calculate_industry_score(industry)
    market_score = calculate_market_score(market_context)

    weighted_context_score = (
        company_score * 0.50
        + industry_score * 0.25
        + market_score * 0.25
    )

    conflict, conflict_reason = detect_conflict(
        quant_score,
        company_score,
        industry_score,
        market_score,
    )

    alignment = determine_alignment(
        quant_score,
        weighted_context_score,
    )

    base_final_score = calculate_final_score(
        quant_score,
        company_score,
        industry_score,
        market_score,
    )

    final_score, conflict_penalty = apply_conflict_penalty(
        base_final_score,
        conflict,
        company_score,
    )

    signal = determine_signal(
        final_score,
        conflict,
        company_score,
    )

    risk = determine_risk(
        stock,
        company_score,
        conflict,
        final_score,
    )

    confidence = calculate_confidence(
        stock,
        alignment,
        conflict,
        company_score,
        market_score,
    )

    reasoning = build_reasoning(
        stock,
        company_score,
        industry_score,
        market_score,
        final_score,
        signal,
        risk,
        conflict,
        conflict_reason,
    )

    return {
        "symbol": symbol,
        "price": round(safe_number(stock.get("price")), 2),
        "priceBand": stock.get("priceBand"),
        "quantitativeScore": round(quant_score, 2),
        "companyContextScore": round(company_score, 2),
        "industryContextScore": round(industry_score, 2),
        "marketContextScore": round(market_score, 2),
        "weightedContextScore": round(weighted_context_score, 2),
        "baseFinalScore": round(base_final_score, 2),
        "conflictPenalty": round(conflict_penalty, 2),
        "finalScore": round(final_score, 2),
        "signal": signal,
        "confidence": confidence,
        "risk": risk,
        "contextSignal": (
            "Positive"
            if weighted_context_score >= 20
            else "Negative"
            if weighted_context_score <= -20
            else "Neutral"
        ),
        "alignment": alignment,
        "conflictDetected": conflict,
        "conflictReason": conflict_reason,
        "reasoning": reasoning,
        "status": "Integrated context analysis",
    }


def main():
    rankings = load_json(RANKINGS_FILE)
    news_data = load_json(NEWS_FILE)

    stocks = news_data.get("stocks", [])
    market_context = news_data.get("marketContext", {})

    if not stocks:
        raise RuntimeError("No stocks found in news_context.json")

    results = []

    for stock in stocks:
        results.append(
            analyze_stock(
                stock,
                market_context,
            )
        )

    # Final integrated ranking across all 30 stocks.
    results.sort(
        key=lambda item: (
            item.get("finalScore", 0),
            item.get("confidence", 0),
        ),
        reverse=True,
    )

    for rank, result in enumerate(results, start=1):
        result["finalRank"] = rank

    conflict_count = sum(
        1 for item in results if item.get("conflictDetected")
    )

    output = {
        "version": "1.2",
        "stage": "integrated_context",
        "generated": datetime.now(timezone.utc).isoformat(),
        "methodology": {
            "description": (
                "Rule-based evidence fusion combining quantitative, "
                "company, industry and market context."
            ),
            "weights": {
                "quantitative": 60,
                "companyContext": 20,
                "industryContext": 10,
                "marketContext": 10,
            },
            "purpose": (
                "Produce an integrated contextual assessment while "
                "preserving the quantitative engine as the dominant signal."
            ),
            "rules": [
                "Company-specific context receives greater weight than broad market context.",
                "Negative high-impact company context can trigger a caution assessment.",
                "Conflicting signals reduce confidence rather than automatically cancelling the quantitative setup.",
                "Final ranking is based on finalScore, not quantitativeScore alone.",
                "The engine does not issue automatic buy or sell decisions.",
            ],
        },
        "summary": {
            "inputStocks": len(stocks),
            "analyzedStocks": len(results),
            "conflictCount": conflict_count,
            "status": "Integrated context analysis complete",
        },
        "stocks": results,
    }

    os.makedirs(
        os.path.dirname(OUTPUT_FILE),
        exist_ok=True,
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            output,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print(
        f"Integrated context analysis completed for {len(results)} stocks."
    )
    print(f"Conflicting setups detected: {conflict_count}")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
