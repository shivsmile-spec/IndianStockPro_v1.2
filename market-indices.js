/* Indian Stock Pro — reliable published NIFTY 50 + SENSEX market strip */
(function(){
  "use strict";
  const LOCAL="./data/index_quotes.json";
  const RAW="https://raw.githubusercontent.com/shivsmile-spec/IndianStockPro_v1.2/main/data/index_quotes.json";
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const formatValue=v=>num(v)!==null?num(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";
  let timer=null,refreshing=false;

  function injectCSS(){
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
      #isp-market-indices .isp-index-error{background:#fff6f6;color:#b42318;border:1px solid #f0c8c8;border-radius:10px;padding:10px;margin-top:12px;font-size:12px}
      @media(max-width:700px){#isp-market-indices .isp-index-grid{grid-template-columns:1fr}#isp-market-indices .isp-index-head{flex-direction:column}#isp-market-indices .isp-index-refresh{width:100%}}
    `;document.head.appendChild(s);
  }

  function ensurePanel(){
    let panel=document.getElementById("isp-market-indices");
    if(!panel){panel=document.createElement("section");panel.className="panel";(document.querySelector(".container")||document.body).prepend(panel);}
    panel.innerHTML=`<div class="isp-index-head"><div><h2 class="isp-index-title">🇮🇳 Indian Market Indices</h2><div class="isp-index-sub">NIFTY 50 and SENSEX · latest published market snapshot</div></div><button class="isp-index-refresh" type="button" id="ispIndexRefresh">↻ Refresh</button></div><div class="isp-index-grid" id="ispIndexGrid"><div class="isp-index-card"><div class="isp-index-name">NIFTY 50</div><div class="isp-index-value">Loading…</div><div class="isp-index-meta">Fetching latest published quote</div></div><div class="isp-index-card"><div class="isp-index-name">SENSEX</div><div class="isp-index-value">Loading…</div><div class="isp-index-meta">Fetching latest published quote</div></div></div><div class="isp-index-status" id="ispIndexStatus">Fetching latest market data…</div>`;
    panel.querySelector("#ispIndexRefresh").addEventListener("click",()=>load(true));return panel;
  }

  function freshness(ts){const d=new Date(ts);if(Number.isNaN(d.getTime()))return "timestamp unavailable";const mins=Math.max(0,Math.round((Date.now()-d.getTime())/60000));if(mins<1)return "just now";if(mins<60)return `${mins} min ago`;const h=Math.round(mins/60);return h<24?`${h} hr ago`:`${Math.round(h/24)} day(s) ago`;}

  async function fetchFeed(url){
    const r=await fetch(url+"?v="+Date.now(),{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);const data=await r.json();
    if(!data||!data.indices||Object.keys(data.indices).length<1)throw new Error("Invalid index feed");
    return data;
  }

  async function fetchPublished(){
    try{return await fetchFeed(LOCAL)}catch(localError){console.warn("Local index feed unavailable, trying raw GitHub",localError);return await fetchFeed(RAW);}
  }

  function render(data){
    const panel=document.getElementById("isp-market-indices");if(!panel)return;
    const grid=panel.querySelector("#ispIndexGrid"),status=panel.querySelector("#ispIndexStatus");
    const list=[{name:"NIFTY 50",key:"NIFTY50"},{name:"SENSEX",key:"SENSEX"}];
    grid.innerHTML=list.map(x=>{const q=data?.indices?.[x.key]||{},v=num(q.value),c=num(q.change),p=num(q.changePct),cls=p===null?"isp-index-neutral":p>=0?"isp-index-up":"isp-index-down",sign=n=>n>0?"+":"";return `<div class="isp-index-card"><div class="isp-index-name">${esc(x.name)}</div><div class="isp-index-value">${v===null?"—":formatValue(v)}</div><div class="isp-index-change ${cls}">${c===null?"Change unavailable":`${sign(c)}${c.toFixed(2)}${p===null?"":` · ${sign(p)}${p.toFixed(2)}%`}`}</div><div class="isp-index-meta">${q.timestamp?`Updated ${esc(freshness(q.timestamp))}`:"Timestamp unavailable"} · ${esc(q.source||data.source||"Published market feed")}</div></div>`;}).join("");
    const generated=data.generatedAt||null;let stamp="";if(generated){const d=new Date(generated);if(!Number.isNaN(d.getTime()))stamp=new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(d)+" IST";}
    status.textContent=`Published feed checked ${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})} IST${stamp?` · feed generated ${stamp}`:""}. Backend refreshes every 5 minutes while the market feed is active.`;
  }

  async function load(manual){
    if(refreshing)return;refreshing=true;const panel=ensurePanel(),grid=panel.querySelector("#ispIndexGrid"),status=panel.querySelector("#ispIndexStatus"),btn=panel.querySelector("#ispIndexRefresh");
    if(btn){btn.disabled=true;btn.textContent=manual?"↻ Loading…":"↻ Refresh"}
    try{render(await fetchPublished());}
    catch(e){console.error("Index feed unavailable",e);status.textContent="Market feed temporarily unavailable — please press Refresh again.";grid.querySelectorAll(".isp-index-value").forEach(x=>x.textContent="—");}
    finally{if(btn){btn.disabled=false;btn.textContent="↻ Refresh"}refreshing=false;}
  }

  function start(){injectCSS();ensurePanel();load(false);clearInterval(timer);timer=setInterval(()=>load(false),60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)load(false)});window.addEventListener("focus",()=>load(false));}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
