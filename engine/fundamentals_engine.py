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
    return v * 100 if abs(v) <= 5 else v


def classify(score):
    if score >= 75: return "Strong"
    if score >= 60: return "Good"
    if score >= 45: return "Neutral"
    return "Weak"


def main():
    data = json.loads(RANKINGS.read_text(encoding="utf-8"))
    stocks = data.get("rankings") or data.get("stocks") or []
    if not stocks and isinstance(data.get("bands"), list):
        stocks = [s for b in data["bands"] for s in (b.get("stocks") or [])]
    results = {}
    for stock in stocks:
        symbol = str(stock.get("symbol") or "").strip().upper()
        if not symbol or symbol in results: continue
        try:
            info = yf.Ticker(symbol + ".NS").get_info()
            m={"revenueGrowth":pct(info.get("revenueGrowth")),"earningsGrowth":pct(info.get("earningsGrowth")),"eps":safe_num(info.get("trailingEps")),"roe":pct(info.get("returnOnEquity")),"roa":pct(info.get("returnOnAssets")),"debtToEquity":safe_num(info.get("debtToEquity")),"operatingMargin":pct(info.get("operatingMargins")),"profitMargin":pct(info.get("profitMargins")),"pe":safe_num(info.get("trailingPE")),"pb":safe_num(info.get("priceToBook")),"dividendYield":pct(info.get("dividendYield")),"promoterHolding":pct(info.get("heldPercentInsiders"))}
            pts=[]
            for k,g,b in [("revenueGrowth",10,0),("earningsGrowth",10,0),("roe",15,8),("operatingMargin",12,5),("profitMargin",8,2)]:
                if m[k] is not None: pts.append(1 if m[k]>g else -1 if m[k]<b else 0)
            if m["debtToEquity"] is not None: pts.append(1 if m["debtToEquity"]<80 else -1 if m["debtToEquity"]>180 else 0)
            score=round(50+(sum(pts)/max(1,len(pts)))*25,1); available=sum(v is not None for v in m.values())
            results[symbol]={"symbol":symbol,"companyName":stock.get("companyName") or stock.get("name") or symbol,"snapshotAt":datetime.now(timezone.utc).isoformat(),"health":classify(score) if len(pts)>=3 else "Data limited","score":score if len(pts)>=3 else None,"dataPoints":available,"metrics":m,"methodology":"Public company metrics snapshot; informational only and not a valuation or investment recommendation."}
        except Exception as exc:
            results[symbol]={"symbol":symbol,"companyName":stock.get("companyName") or stock.get("name") or symbol,"snapshotAt":datetime.now(timezone.utc).isoformat(),"health":"Data unavailable","score":None,"dataPoints":0,"metrics":{},"error":str(exc),"methodology":"Fundamental data unavailable at snapshot time."}
    OUT.write_text(json.dumps({"generatedAt":datetime.now(timezone.utc).isoformat(),"source":"Yahoo Finance public company metrics via yfinance","count":len(results),"stocks":results},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Wrote {len(results)} fundamental snapshots")

if __name__ == "__main__": main()
