"""
Indian Stock Pro v1.2
Quantitative Stock Selection Engine

Stage 1:
Select and score stocks using statistical/technical factors.

This engine does NOT use news yet.
News and industry context will be added in later stages.
"""

import json
import math
import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import yfinance as yf


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_FILE = os.path.join(ROOT, "data", "rankings.json")


# ---------------------------------------------------------
# PRICE BANDS
# ---------------------------------------------------------

PRICE_BANDS = [
    {"min": 20, "max": 100, "label": "₹20–₹100", "count": 5},
    {"min": 100, "max": 300, "label": "₹100–₹300", "count": 5},
    {"min": 300, "max": 500, "label": "₹300–₹500", "count": 5},
    {"min": 500, "max": 1000, "label": "₹500–₹1,000", "count": 5},
    {"min": 1000, "max": 1500, "label": "₹1,000–₹1,500", "count": 5},
    {"min": 1500, "max": 2000, "label": "₹1,500–₹2,000", "count": 5},
]


# ---------------------------------------------------------
# STOCK UNIVERSE
# ---------------------------------------------------------

SYMBOLS = """
RELIANCE TCS HDFCBANK ICICIBANK BHARTIARTL INFY SBIN LT AXISBANK KOTAKBANK
M&M MARUTI SUNPHARMA TATAMOTORS TATASTEEL NTPC POWERGRID ONGC COALINDIA
ADANIPORTS ADANIENT JSWSTEEL HINDALCO BAJAJFINSV HCLTECH WIPRO TECHM
EICHERMOT HEROMOTOCO TVSMOTOR APOLLOHOSP CIPLA DRREDDY DIVISLAB
GRASIM ULTRACEMCO ASIANPAINT TITAN NESTLEIND BRITANNIA TRENT BEL HAL
BHEL IRCTC RVNL IRFC PFC REC IOC BPCL GAIL PETRONET NHPC SJVN
CANBK BANKBARODA PNB UNIONBANK INDIANB IDFCFIRSTB FEDERALBNK
INDUSINDBK BANDHANBNK RBLBANK AUBANK YESBANK
ZOMATO PAYTM NYKAA DELHIVERY DMART DIXON KPIT PERSISTENT
COFORGE LTIM MINDTREE MPHASIS OFSS
VEDL NMDC NATIONALUM SAIL JINDALSTEL JSWENERGY TATAPOWER
TORNTPOWER CESC TATACHEM PIDILITIND SRF DEEPAKNTR APLAPOLLO
MOTHERSON BOSCH TV18BRDC CONCOR GRINDWELL
BIOCON AUROBINDO LUPIN MAXHEALTH FORTIS
HINDPETRO MGL IGL GUJGASLTD
ASHOKLEY ESCORTS BALKRISIND EXIDEIND AMARAJABAT
CROMPTON DABUR GODREJCP GODREJPROP
SIEMENS ABB INDIA HITACHIENERGY
INDHOTEL IRCTC
"""

SYMBOLS = sorted(set(SYMBOLS.split()))


# ---------------------------------------------------------
# TECHNICAL FUNCTIONS
# ---------------------------------------------------------

def safe_float(value, default=0.0):
    try:
        value = float(value)
        if math.isnan(value) or math.isinf(value):
            return default
        return value
    except Exception:
        return default


def calculate_rsi(close, period=14):
    delta = close.diff()

    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))

    return rsi


def calculate_score(data):
    close = data["Close"]
    volume = data["Volume"]

    price = safe_float(close.iloc[-1])

    if price <= 0:
        return None

    # Returns
    return_5d = safe_float(close.pct_change(5).iloc[-1] * 100)
    return_20d = safe_float(close.pct_change(20).iloc[-1] * 100)
    return_60d = safe_float(close.pct_change(60).iloc[-1] * 100)

    # Moving averages
    sma20 = safe_float(close.rolling(20).mean().iloc[-1])
    sma50 = safe_float(close.rolling(50).mean().iloc[-1])
    sma200 = safe_float(close.rolling(200).mean().iloc[-1])

    # RSI
    rsi = safe_float(calculate_rsi(close).iloc[-1], 50)

    # Volume
    avg_volume = safe_float(volume.rolling(20).mean().iloc[-1])
    current_volume = safe_float(volume.iloc[-1])

    if avg_volume > 0:
        volume_ratio = current_volume / avg_volume
    else:
        volume_ratio = 0

    # -----------------------------------------------------
    # FACTOR SCORES
    # -----------------------------------------------------

    momentum = np.clip(50 + return_20d * 4, 0, 100)

    trend = 50

    if price > sma20:
        trend += 15

    if price > sma50:
        trend += 15

    if price > sma200:
        trend += 20

    trend = np.clip(trend, 0, 100)

    relative_strength = np.clip(
        50 + (return_20d - return_60d / 3) * 3,
        0,
        100
    )

    volume_score = np.clip(50 + (volume_ratio - 1) * 30, 0, 100)

    rsi_quality = 100 - abs(rsi - 55) * 1.5
    rsi_quality = np.clip(rsi_quality, 0, 100)

    recent_high = safe_float(close.tail(60).max())

    if recent_high > 0:
        breakout = np.clip((price / recent_high) * 100, 0, 100)
    else:
        breakout = 50

    volatility = safe_float(
        close.pct_change().rolling(20).std().iloc[-1] * 100,
        3
    )

    volatility_score = np.clip(100 - volatility * 12, 0, 100)

    # Risk/reward approximation
    risk = max(volatility * 4, 1)

    potential = max(return_20d, 0)

    risk_reward = np.clip(
        50 + (potential / risk) * 20,
        0,
        100
    )

    # -----------------------------------------------------
    # FINAL QUANT SCORE
    # -----------------------------------------------------

    score = (
        momentum * 0.22 +
        trend * 0.18 +
        relative_strength * 0.16 +
        volume_score * 0.10 +
        rsi_quality * 0.08 +
        breakout * 0.08 +
        volatility_score * 0.08 +
        risk_reward * 0.10
    )

    score = np.clip(score, 0, 100)

    # Confidence is intentionally separate from score
    confidence = (
        momentum * 0.20 +
        trend * 0.20 +
        relative_strength * 0.15 +
        volume_score * 0.10 +
        rsi_quality * 0.10 +
        breakout * 0.10 +
        volatility_score * 0.05 +
        risk_reward * 0.10
    )

    confidence = np.clip(confidence, 0, 100)

    if score >= 80:
        signal = "Strong Setup"
    elif score >= 70:
        signal = "Watch"
    elif score >= 60:
        signal = "Neutral"
    else:
        signal = "Weak"

    return {
        "price": round(price, 2),
        "score": round(float(score), 2),
        "signal": signal,
        "confidence": round(float(confidence), 2),
        "risk": round(float(100 - volatility_score), 2),

        "factors": {
            "momentum": round(float(momentum), 2),
            "trend": round(float(trend), 2),
            "relativeStrength": round(float(relative_strength), 2),
            "volume": round(float(volume_score), 2),
            "rsiQuality": round(float(rsi_quality), 2),
            "breakout": round(float(breakout), 2),
            "volatility": round(float(volatility_score), 2),
            "riskReward": round(float(risk_reward), 2)
        },

        "raw": {
            "return5d": round(return_5d, 2),
            "return20d": round(return_20d, 2),
            "return60d": round(return_60d, 2),
            "rsi14": round(rsi, 2),
            "volumeRatio": round(volume_ratio, 2),
            "volatility20d": round(volatility, 2)
        }
    }


# ---------------------------------------------------------
# DOWNLOAD MARKET DATA
# ---------------------------------------------------------

def download_stock(symbol):
    ticker = symbol + ".NS"

    try:
        data = yf.download(
            ticker,
            period="1y",
            interval="1d",
            auto_adjust=True,
            progress=False
        )

        if data is None or data.empty:
            return None

        if len(data) < 220:
            return None

        # Handle yfinance MultiIndex columns
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)

        required = ["Close", "Volume"]

        for column in required:
            if column not in data.columns:
                return None

        data = data.dropna(subset=required)

        return data

    except Exception as error:
        print(f"Failed: {symbol}: {error}")
        return None


# ---------------------------------------------------------
# MAIN QUANT SCREEN
# ---------------------------------------------------------

def run_quant_engine():

    print("Indian Stock Pro v1.2")
    print("Starting quantitative screening...")

    candidates = []

    for index, symbol in enumerate(SYMBOLS, start=1):

        print(f"[{index}/{len(SYMBOLS)}] {symbol}")

        data = download_stock(symbol)

        if data is None:
            continue

        result = calculate_score(data)

        if result is None:
            continue

        price = result["price"]

        # Ignore stocks outside our six target bands
        if price < 20 or price > 2000:
            continue

        result["symbol"] = symbol

        candidates.append(result)

    print(f"Candidates found: {len(candidates)}")

    # -----------------------------------------------------
    # SORT BY QUANT SCORE
    # -----------------------------------------------------

    candidates.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    # -----------------------------------------------------
    # SELECT 5 STOCKS FROM EACH PRICE BAND
    # -----------------------------------------------------

    bands_output = []

    selected = []

    for band in PRICE_BANDS:

        minimum = band["min"]
        maximum = band["max"]
        count = band["count"]

        band_stocks = [
            stock for stock in candidates
            if minimum <= stock["price"] < maximum
        ]

        band_stocks.sort(
            key=lambda x: x["score"],
            reverse=True
        )

        chosen = band_stocks[:count]

        for rank, stock in enumerate(chosen, start=1):
            stock["bandRank"] = rank
            stock["priceBand"] = band["label"]
            selected.append(stock)

        bands_output.append({
            "label": band["label"],
            "min": minimum,
            "max": maximum,
            "count": len(chosen),
            "stocks": chosen
        })

    # -----------------------------------------------------
    # FINAL OUTPUT
    # -----------------------------------------------------

    output = {
        "version": "1.2",

        "generated": datetime.now(
            timezone.utc
        ).strftime("%Y-%m-%d %H:%M UTC"),

        "stage": "quantitative",

        "market": {
            "market": "NSE",
            "benchmark": "NIFTY"
        },

        "methodology": {
            "description":
                "Statistical and technical screening before news/context analysis.",

            "weights": {
                "momentum": 22,
                "trend": 18,
                "relativeStrength": 16,
                "volume": 10,
                "rsiQuality": 8,
                "breakout": 8,
                "volatility": 8,
                "riskReward": 10
            },

            "priceBands": PRICE_BANDS
        },

        "summary": {
            "candidateCount": len(candidates),
            "selectedCount": len(selected),
            "status": "Quantitative screening complete"
        },

        "bands": bands_output,

        "rankings": selected,

        "nextStage": {
            "status": "Waiting for news and industry context engine",
            "planned": [
                "Company news",
                "Industry news",
                "Commodity impact",
                "Geopolitical events",
                "Government policy",
                "Market-wide events",
                "Logical context adjustment"
            ]
        }
    }

    os.makedirs(
        os.path.dirname(OUTPUT_FILE),
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            output,
            file,
            indent=2,
            ensure_ascii=False
        )

    print()
    print("Quantitative screening complete.")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    run_quant_engine()
