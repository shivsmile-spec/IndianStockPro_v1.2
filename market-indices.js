/* Indian Stock Pro — robust NIFTY 50 + SENSEX market strip */
(function(){
  "use strict";

  const FEED="./data/index_quotes.json?v="+Date.now();
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const formatValue=v=>num(v)!==null?num(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";
  let timer=null;
  let refreshing=false;

  function injectCSS(){
    if(document.getElementById("isp-market-index-css"))return;
    const s=document.createElement("style");
    s.id="isp-market-index-css";
    s.textContent=`
      #isp-market-indices{background:#fff;border-radius:18px;padding:20px;margin:0 0 18px;box-shadow:0 4px 18px rgba(0,0,0,.06)}
      #isp-market-indices .isp-index-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      #isp-market-indices .isp-index-title{margin:0 0 5px;font-size:23px;font-weight:800;color:#172033}
      #isp-market-indices .isp-index-sub{font-size:13px;color:#667085}
      #isp-market-indices .isp-index-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
      #isp-market-indices .isp-index-card{border:1px solid #e1e6ef;border-radius:14px;padding:15px;background:#f8fafc}
      #isp-market-indices .isp-index-name{font-size:12px;color:#667085;font-weight:800;letter-spacing:.2px}
      #isp-market-indices .isp-index-value{font-size:27px;font-weight:900;color:#172033;margin-top:4px}
      #isp-market-indices .isp-index-change{font-size:14px;font-weight:800;margin-top:3px}
      #isp-market-indices .isp-index-up{color:#16743b}
      #isp-market-indices .isp-index-down{color:#b42318}
      #isp-market-indices .isp-index-neutral{color:#667085}
      #isp-market-indices .isp-index-meta{font-size:10px;color:#667085;margin-top:8px;line-height:1.4}
      #isp-market-indices .isp-index-refresh{border:1px solid #ccd3df;background:#fff;color:#172033;padding:8px 12px;border-radius:9px;font-weight:800;cursor:pointer}
      #isp-market-indices .isp-index-refresh:disabled{opacity:.55;cursor:wait}
      #isp-market-indices .isp-index-status{margin-top:10px;font-size:11px;color:#667085}
      #isp-market-indices .isp-index-error{background:#fff6f6;color:#b42318;border:1px solid #f0c8c8;border-radius:10px;padding:10px;margin-top:12px;font-size:12px}
      @media(max-width:700px){#isp-market-indices .isp-index-grid{grid-template-columns:1fr}#isp-market-indices .isp-index-head{flex-direction:column}#isp-market-indices .isp-index-refresh{width:100%}}
    `;
    document.head.appendChild(s);
  }

  function findExistingPanel(){
    const panels=[...document.querySelectorAll("section.panel, .panel")];
    return panels.find(p=>/Indian Market Indices/i.test(p.querySelector("h2")?.textContent||""))||document.getElementById("isp-market-indices");
  }

  function ensurePanel(){
    let panel=findExistingPanel();
    if(!panel){
      panel=document.createElement("section");
      panel.className="panel";
      const container=document.querySelector(".container")||document.body;
      container.insertBefore(panel,container.firstElementChild||null);
    }
    panel.id="isp-market-indices";
    panel.innerHTML=`
      <div class="isp-index-head">
        <div>
          <h2 class="isp-index-title">🇮🇳 Indian Market Indices</h2>
          <div class="isp-index-sub">NIFTY 50 and SENSEX · latest published market snapshot</div>
        </div>
        <button class="isp-index-refresh" type="button" id="ispIndexRefresh">↻ Refresh</button>
      </div>
      <div class="isp-index-grid" id="ispIndexGrid">
        <div class="isp-index-card"><div class="isp-index-name">NIFTY 50</div><div class="isp-index-value">Loading…</div><div class="isp-index-meta">Waiting for published index feed</div></div>
        <div class="isp-index-card"><div class="isp-index-name">SENSEX</div><div class="isp-index-value">Loading…</div><div class="isp-index-meta">Waiting for published index feed</div></div>
      </div>
      <div class="isp-index-status" id="ispIndexStatus">Loading latest published index snapshot…</div>
    `;
    panel.querySelector("#ispIndexRefresh").addEventListener("click",()=>load(true));
    return panel;
  }

  function freshness(ts){
    const d=new Date(ts);
    if(Number.isNaN(d.getTime()))return "timestamp unavailable";
    const mins=Math.max(0,Math.round((Date.now()-d.getTime())/60000));
    if(mins<60)return `${mins} min ago`;
    const hours=Math.round(mins/60);
    if(hours<24)return `${hours} hr ago`;
    return `${Math.round(hours/24)} day${Math.round(hours/24)===1?"":"s"} ago`;
  }

  async function load(manual=false){
    if(refreshing)return;
    refreshing=true;
    const panel=ensurePanel();
    const grid=panel.querySelector("#ispIndexGrid");
    const status=panel.querySelector("#ispIndexStatus");
    const btn=panel.querySelector("#ispIndexRefresh");
    if(btn){btn.disabled=true;btn.textContent=manual?"↻ Loading…":"↻ Refresh"}
    try{
      const r=await fetch("./data/index_quotes.json?v="+Date.now()+(manual?"&manual=1":""),{cache:"no-store"});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      const indexList=[{name:"NIFTY 50",key:"NIFTY50"},{name:"SENSEX",key:"SENSEX"}];
      grid.innerHTML=indexList.map(x=>{
        const q=data?.indices?.[x.key]||{};
        const value=num(q.value);
        const change=num(q.change);
        const pct=num(q.changePct);
        const cls=pct===null?"isp-index-neutral":pct>0?"isp-index-up":"isp-index-down";
        const sign=v=>v>0?"+":"";
        return `<div class="isp-index-card">
          <div class="isp-index-name">${esc(x.name)}</div>
          <div class="isp-index-value">${value===null?"—":formatValue(value)}</div>
          <div class="isp-index-change ${cls}">${change===null?"Change unavailable":`${sign(change)}${change.toFixed(2)} ${pct===null?"":`· ${sign(pct)}${pct.toFixed(2)}%`}`}</div>
          <div class="isp-index-meta">${q.timestamp?`Updated ${esc(freshness(q.timestamp))}`:"Timestamp unavailable"} · ${esc(q.source||data.source||"Published market feed")}</div>
        </div>`;
      }).join("");
      const generated=data.generatedAt||data.generated||null;
      status.textContent=(generated?`Published index snapshot: ${new Date(generated).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"})} IST. `:"")+"Auto-refreshes every 5 minutes while the page is open. Values may be delayed; this is not a guaranteed real-time exchange feed.";
    }catch(err){
      console.error("Index feed error",err);
      grid.innerHTML=`<div class="isp-index-error">NIFTY 50 index feed is temporarily unavailable.</div><div class="isp-index-error">SENSEX index feed is temporarily unavailable.</div>`;
      status.textContent="Could not load the published index feed. Stock analysis and other research layers remain available.";
    }finally{
      if(btn){btn.disabled=false;btn.textContent="↻ Refresh"}
      refreshing=false;
    }
  }

  function start(){
    injectCSS();
    ensurePanel();
    load(false);
    setTimeout(()=>load(false),1200);
    setTimeout(()=>load(false),3000);
    clearInterval(timer);
    timer=setInterval(()=>load(false),300000);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)load(false)});
    window.addEventListener("focus",()=>load(false));
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
