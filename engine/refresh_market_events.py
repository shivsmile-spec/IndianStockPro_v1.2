from __future__ import annotations
import json, re
from datetime import datetime
from pathlib import Path
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
HEADERS={"User-Agent":"Mozilla/5.0 IndianStockPro/1.9"}
NOW=datetime.now().astimezone()
TODAY=NOW.strftime("%Y-%m-%d")


def get(url):
    r=requests.get(url,headers=HEADERS,timeout=20)
    r.raise_for_status()
    return r.text


def date_iso(text):
    text=text.strip()
    for fmt in ("%d %b %Y","%d %B %Y","%d-%m-%Y","%d/%m/%Y"):
        try:return datetime.strptime(text,fmt).strftime("%Y-%m-%d")
        except ValueError:pass
    return None


def refresh_ipo():
    url="https://www.sharekhan.com/ipo"
    soup=BeautifulSoup(get(url),"html.parser")
    rows=[]
    for tr in soup.find_all("tr"):
        cells=[c.get_text(" ",strip=True) for c in tr.find_all(["th","td"])]
        if len(cells)<4 or "IPO Name" in cells[0]: continue
        name=cells[0]
        dates=re.findall(r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})",cells[1])
        if not dates: continue
        start=date_iso(" ".join(dates[0]))
        end=date_iso(" ".join(dates[-1]))
        band=cells[2]
        issue=cells[4] if len(cells)>4 else "—"
        if not start or not end: continue
        status="UPCOMING" if TODAY<start else ("OPEN" if TODAY<=end else "CLOSED")
        if TODAY==end: status="CLOSING_TODAY"
        segment="SME" if "SME" in name.upper() else "Mainboard"
        symbol=re.sub(r"[^A-Z0-9]","",name.split("Ltd")[0].upper())[:15]
        rows.append({"company":name,"symbol":symbol,"segment":segment,"status":status,"openDate":start,"closeDate":end,"listingDate":None,"priceBand":band,"issueSize":issue,"source":"Mirae Asset Sharekhan IPO calendar","sourceUrl":url})
    if rows:
        Path(ROOT/"data/ipo_calendar.json").write_text(json.dumps({"updatedAt":NOW.isoformat(),"source":"Mirae Asset Sharekhan IPO calendar","note":"Automatically refreshed. Verify the latest exchange/issuer filing before applying.","items":rows},ensure_ascii=False,indent=2),encoding="utf-8")


def refresh_dividends():
    url="https://m.moneycontrol.com/more_corporate_action.php?id=dividends"
    soup=BeautifulSoup(get(url),"html.parser")
    rows=[]
    for tr in soup.find_all("tr"):
        cells=[c.get_text(" ",strip=True) for c in tr.find_all(["th","td"])]
        if len(cells)<3: continue
        joined=" | ".join(cells)
        m=re.search(r"(\d{2}-\d{2}-\d{4})$",joined)
        if not m: continue
        ex=date_iso(m.group(1))
        if not ex or ex<TODAY: continue
        company=cells[0]
        pct=cells[1]
        rows.append({"symbol":re.sub(r"[^A-Z0-9]","",company.upper())[:15],"company":company,"dividend":pct+"%","type":"Dividend","exDate":ex,"recordDate":None,"status":"UPCOMING","source":"Moneycontrol corporate actions","sourceUrl":url})
    if rows:
        Path(ROOT/"data/dividend_calendar.json").write_text(json.dumps({"updatedAt":NOW.isoformat(),"source":"Moneycontrol corporate actions","note":"Automatically refreshed. Verify the latest exchange/issuer filing before relying on dividend dates or amounts.","items":rows[:40]},ensure_ascii=False,indent=2),encoding="utf-8")


if __name__=="__main__":
    try: refresh_ipo()
    except Exception as e: print("IPO refresh skipped:",e)
    try: refresh_dividends()
    except Exception as e: print("Dividend refresh skipped:",e)
