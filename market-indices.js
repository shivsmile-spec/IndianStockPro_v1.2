/* Indian Stock Pro — fresher NIFTY 50 + SENSEX market strip */
(function(){
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const fmt=v=>num(v)!==null?Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";
  let timer=null, refreshing=false;

  function css(){
    if(document.getElementById("isp-market-index-css"))return;
    const s=document.createElement("style");s.id="isp-market-index-css";s.textContent=`
      #isp-market-indices{background:#fff;border-radius:18px;padding:20px;margin:0 0 18px;box-shadow:0 4px 18px rgba(0,0,0,.06)}
      #isp-market-indices .isp-index-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      #isp-market-indices .isp-index-title{margin:0 0 5px;font-size:23px;font-weight:800;color:#172033}
      #isp-market-indices .isp-index-sub{font-size:13px;color:#667085}
      #isp-market-indices .isp-index-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
      #isp-market-indices .isp-index-card{border:1px solid #e1e6ef;border-radius:14px;padding:15px;background:#f8fafc}
      #isp-market-indices .isp-index-name{font-size:12px;color:#667085;font-weight:800;letter-spacing:.2px}
      #isp-market-indices .isp-index-value{font-size:27px;font-weight:900;color:#172033;margin-top:4px}
      #isp-market-indices .isp-index-change{font-size:14px;font-weight:800;margin-top:3px}
      #isp-market-indices .isp-index-up{color:#16743b}.isp-index-down{color:#b42318}.isp-index-neutral{color:#667085}
      #isp-market-indices .isp-index-meta{font-size:10px;color:#667085;margin-top:8px;line-height:1.4}
      #isp-market-indices .isp-index-refresh{border:1px solid #ccd3df;background:#fff;color:#172033;padding:8px 12px;border-radius:9px;font-weight:800;cursor:pointer}
      #isp-market-indices .isp-index-refresh:disabled{opacity:.55;cursor:wait}.isp-index-status{margin-top:10px;font-size:11px;color:#667085}
      @media(max-width:700px){#isp-market-indices .isp-index-grid{grid-template-columns:1fr}#isp-market-indices .isp-index-head{flex-direction:column}#isp-market-indices .isp-index-refresh{width:100%}}
    `;document.head.appendChild(s);
  }
  function panel(){
    let p=document.getElementById("isp-market-indices");
    if(!p){p=document.createElement("section");p.className="panel";(document.querySelector(".container")||document.body).prepend(p);}
    p.id="isp-market-indices";p.innerHTML=`
      <div class="isp-index-head"><div><h2 class="isp-index-title">🇮🇳 Indian Market Indices</h2><div class="isp-index-sub">NIFTY 50 and SENSEX · fresher market quote</div></div><button class="isp-index-refresh" id="ispIndexRefresh" type="button">↻ Refresh</button></div>
      <div class="isp-index-grid" id="ispIndexGrid"><div class="isp-index-card">Loading NIFTY 50…</div><div class="isp-index-card">Loading SENSEX…</div></div>
      <div class="isp-index-status" id="ispIndexStatus">Getting the freshest available quote…</div>`;
    p.querySelector("#ispIndexRefresh").onclick=()=>load(true);return p;
  }
  function age(ts){const d=new Date(ts);if(Number.isNaN(d.getTime()))return "time unavailable";const m=Math.max(0,Math.round((Date.now()-d.getTime())/60000));return m<60?`${m} min ago`:`${Math.round(m/60)} hr ago`;}
  async function yahoo(symbol){
    const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=false`;
    const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error("Yahoo HTTP "+r.status);
    const body=await r.json();const result=body?.chart?.result?.[0];if(!result)throw new Error("No Yahoo quote");
    const meta=result.meta||{};const q=result.indicators?.quote?.[0]||{};const ts=result.timestamp||[];const closes=q.close||[];
    let i=closes.length-1;while(i>=0&&(closes[i]==null||!Number.isFinite(Number(closes[i]))))i--;
    if(i<0)throw new Error("No intraday close");
    const value=Number(closes[i]);const prev=num(meta.previousClose??meta.chartPreviousClose);const change=prev===null?null:value-prev;const pct=prev&&change!==null?change/prev*100:null;
    const stamp=ts[i]?new Date(ts[i]*1000).toISOString():(meta.regularMarketTime?new Date(meta.regularMarketTime*1000).toISOString():new Date().toISOString());
    return {value,previousClose:prev,change,changePct:pct,timestamp:stamp,source:"Yahoo Finance intraday quote"};
  }
  async function local(){const r=await fetch("./data/index_quotes.json?v="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error("Local feed HTTP "+r.status);return r.json();}
  function card(name,q){
    const v=num(q.value),c=num(q.change),pct=num(q.changePct),cls=pct===null?"isp-index-neutral":pct>=0?"isp-index-up":"isp-index-down",sign=x=>x>0?"+":"";
    return `<div class="isp-index-card"><div class="isp-index-name">${esc(name)}</div><div class="isp-index-value">${v===null?"—":fmt(v)}</div><div class="isp-index-change ${cls}">${c===null?"Change unavailable":`${sign(c)}${c.toFixed(2)} · ${pct===null?"":`${sign(pct)}${pct.toFixed(2)}%`}`}</div><div class="isp-index-meta">Updated ${esc(age(q.timestamp))} · ${esc(q.source||"Market feed")}</div></div>`;
  }
  async function load(manual){
    if(refreshing)return;refreshing=true;const p=panel(),grid=p.querySelector("#ispIndexGrid"),status=p.querySelector("#ispIndexStatus"),btn=p.querySelector("#ispIndexRefresh");
    btn.disabled=true;btn.textContent=manual?"↻ Loading…":"↻ Refresh";
    try{
      const [n,s]=await Promise.allSettled([yahoo("^NSEI"),yahoo("^BSESN")]);let data=null;
      if(n.status!=="fulfilled"||s.status!=="fulfilled")try{data=await local();}catch(_){data=null;}
      const nq=n.status==="fulfilled"?n.value:data?.indices?.NIFTY50;const sq=s.status==="fulfilled"?s.value:data?.indices?.SENSEX;
      if(!nq&&!sq)throw new Error("No index feed available");
      grid.innerHTML=card("NIFTY 50",nq||{})+card("SENSEX",sq||{});
      const liveCount=(n.status==="fulfilled"?1:0)+(s.status==="fulfilled"?1:0);
      status.textContent=liveCount===2?"Freshest available intraday quotes loaded. Quotes can still be exchange-delayed; verify before trading.":"Live web quote unavailable for one or more indices; showing the latest published fallback. Verify before trading.";
    }catch(e){console.error(e);grid.innerHTML=`<div class="isp-index-card">NIFTY 50 unavailable</div><div class="isp-index-card">SENSEX unavailable</div>`;status.textContent="Index feed unavailable right now.";}
    finally{btn.disabled=false;btn.textContent="↻ Refresh";refreshing=false;}
  }
  function start(){css();panel();load(false);clearInterval(timer);timer=setInterval(()=>load(false),60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)load(false)});window.addEventListener("focus",()=>load(false));}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
