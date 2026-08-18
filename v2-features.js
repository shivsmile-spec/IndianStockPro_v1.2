/* Indian Stock Pro v2.0 — research UX, institutional ideas, watchlist, compare, alerts */
(function(){
  "use strict";
  const FUND_URL="./data/fundamentals.json?v="+Date.now();
  const INST_URL="./data/institutional_picks.json?v="+Date.now();
  const WATCH_KEY="isp_watchlist_v2";
  const ALERT_KEY="isp_alerts_v2";
  let fundamentals={};
  let institutional=[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const money=v=>num(v)!==null?`₹${num(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
  const pct=v=>num(v)!==null?`${num(v).toFixed(2)}%`:"—";
  const watch=()=>JSON.parse(localStorage.getItem(WATCH_KEY)||"[]");
  const saveWatch=a=>localStorage.setItem(WATCH_KEY,JSON.stringify(a));
  const alerts=()=>JSON.parse(localStorage.getItem(ALERT_KEY)||"[]");
  const saveAlerts=a=>localStorage.setItem(ALERT_KEY,JSON.stringify(a));

  function css(){
    if(document.getElementById("isp-v2-css"))return;
    const s=document.createElement("style");s.id="isp-v2-css";s.textContent=`
      .isp-v2-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 14px}
      .isp-v2-btn{border:1px solid #ccd3df;background:#fff;color:#172033;border-radius:9px;padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer}
      .isp-v2-btn.primary{background:#10182b;color:#fff;border-color:#10182b}.isp-v2-btn.danger{color:#b42318}.isp-v2-btn:disabled{opacity:.55;cursor:wait}
      .isp-v2-chip{display:inline-block;padding:5px 8px;border-radius:999px;background:#f5f7fa;color:#596273;font-size:10px;font-weight:900}
      .isp-v2-panel{border:1px solid #e1e6ef;border-radius:14px;padding:15px;background:#fff;margin-top:12px}
      .isp-v2-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .isp-v2-head h3{margin:0 0 4px}.isp-v2-note{font-size:11px;color:#667085;line-height:1.45}
      .isp-v2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
      .isp-v2-card{border:1px solid #e1e6ef;border-radius:12px;padding:12px;background:#fff}
      .isp-v2-card h4{margin:5px 0;font-size:14px}.isp-v2-meta{font-size:10px;color:#667085;font-weight:800}
      .isp-v2-reason{font-size:12px;line-height:1.45;color:#475467}.isp-v2-link{display:inline-block;margin-top:7px;color:#2457a6;text-decoration:none;font-size:11px;font-weight:800}
      .isp-v2-filter{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.isp-v2-filter button{border:1px solid #d4dae4;background:#fff;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:800;cursor:pointer}.isp-v2-filter button.active{background:#10182b;color:#fff}
      .isp-v2-watchlist{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.isp-v2-watch-item{border:1px solid #e1e6ef;border-radius:10px;padding:10px;background:#f8fafc;display:flex;justify-content:space-between;gap:8px;align-items:center}
      .isp-v2-compare{position:sticky;bottom:10px;z-index:20;background:#10182b;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 8px 25px rgba(0,0,0,.2);margin:14px 0}.isp-v2-compare-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:9px}.isp-v2-compare-card{background:rgba(255,255,255,.08);border-radius:9px;padding:9px}.isp-v2-compare-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}.isp-v2-compare-table th,.isp-v2-compare-table td{border-bottom:1px solid rgba(255,255,255,.12);padding:6px;text-align:left}.isp-v2-compare-table th{color:#9fb0ca}
      .isp-v2-fresh{font-size:10px;color:#667085;margin-top:8px}.isp-v2-fresh.fresh{color:#16743b}.isp-v2-fresh.old{color:#8a5a00}.isp-v2-fresh.stale{color:#b42318}
      .isp-v2-fund-mini{margin-top:14px;border:1px solid #dfe5ee;border-radius:12px;padding:12px;background:#f8fafc}.isp-v2-fund-mini h4{margin:0 0 8px}.isp-v2-fund-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.isp-v2-fund-cell{background:#fff;border:1px solid #e5e9f0;border-radius:8px;padding:8px}.isp-v2-fund-cell small{display:block;color:#667085;font-size:10px}.isp-v2-fund-cell b{font-size:12px}
      @media(max-width:800px){.isp-v2-grid{grid-template-columns:1fr}.isp-v2-watchlist{grid-template-columns:1fr}.isp-v2-compare-grid{grid-template-columns:1fr 1fr}.isp-v2-fund-grid{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s)
  }

  async function getJSON(url){const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json()}

  function freshness(ts){
    const d=new Date(ts);if(Number.isNaN(d.getTime()))return ["Freshness unavailable",""];
    const mins=Math.max(0,(Date.now()-d.getTime())/60000);
    if(mins<=30)return [`Fresh · ${Math.round(mins)} min ago`,`fresh`];
    if(mins<=180)return [`Aging · ${Math.round(mins/60)} hr ago`,`old`];
    return [`Stale · ${Math.round(mins/60)} hr ago`,`stale`];
  }

  function installIndices(){
    const sections=[...document.querySelectorAll("section.panel")];
    const sec=sections.find(x=>(x.querySelector("h2")?.textContent||"").includes("Indian Market Indices"));
    if(!sec)return;
    sec.id="isp-market-indices";
    sec.innerHTML=`<div class="isp-v2-head"><div><h2>🇮🇳 Indian Market Indices</h2><div class="isp-v2-note">NIFTY 50 and SENSEX · latest published market snapshot</div></div><button class="isp-v2-btn" id="ispIndexRefresh">↻ Refresh</button></div><div class="isp-v2-grid" id="ispIndexGrid"><div class="isp-v2-card"><h4>NIFTY 50</h4><div class="isp-v2-meta">Loading…</div></div><div class="isp-v2-card"><h4>SENSEX</h4><div class="isp-v2-meta">Loading…</div></div></div><div class="isp-v2-note">Published market snapshot. Values may be delayed; this is not a guaranteed real-time exchange feed.</div>`;
    sec.querySelector("#ispIndexRefresh").onclick=loadIndices;
    loadIndices();
  }

  async function loadIndices(){
    const grid=document.getElementById("ispIndexGrid");if(!grid)return;
    try{
      const d=await getJSON("./data/index_quotes.json?v="+Date.now());
      const list=[d?.indices?.NIFTY50,d?.indices?.SENSEX].filter(Boolean);
      const names=["NIFTY 50","SENSEX"];
      grid.innerHTML=(list.length?list:[{},{}]).slice(0,2).map((q,i)=>{
        const p=num(q.value??q.price),ch=num(q.change),pc=num(q.changePct??q.pChange);
        const cls=pc===null?"isp-v2-meta":pc>0?"live-up":"live-down";
        const f=freshness(q.timestamp||d.generatedAt);
        return `<div class="isp-v2-card"><div class="isp-v2-meta">${names[i]}</div><h4 style="font-size:24px">${p===null?"—":p.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</h4><div class="${cls}" style="font-weight:900">${ch===null?"Change unavailable":`${ch>0?"+":""}${ch.toFixed(2)} · ${pc===null?"":`${pc>0?"+":""}${pc.toFixed(2)}%`}`}</div><div class="isp-v2-fresh ${f[1]}">${f[0]} · ${q.source||d.source||"published feed"}</div></div>`;
      }).join("");
    }catch(e){grid.innerHTML=`<div class="error">Index feed unavailable right now. The stock analysis layers remain available.</div><div class="isp-v2-card"><h4>SENSEX</h4><div class="isp-v2-meta">Waiting for index feed</div></div>`}
  }

  function installWatchlistToolbar(){
    const search=document.getElementById("search");if(!search)return;
    const panel=search.closest("section.panel");if(!panel||panel.querySelector("#ispWatchBtn"))return;
    const bar=document.createElement("div");bar.className="isp-v2-toolbar";bar.innerHTML=`<button class="isp-v2-btn" id="ispWatchBtn">⭐ Watchlist</button><button class="isp-v2-btn" id="ispCompareBtn">⚖ Compare</button><span class="isp-v2-chip">V2 research tools</span>`;search.parentNode.after(bar);
    document.getElementById("ispWatchBtn").onclick=()=>openWatchlist();
    document.getElementById("ispCompareBtn").onclick=()=>renderCompare();
  }

  function installInstitutional(){
    const cards=document.getElementById("integratedCards")?.closest("section.panel");if(!cards)return;
    let sec=document.getElementById("isp-institutional");
    if(!sec){sec=document.createElement("section");sec.id="isp-institutional";sec.className="panel";cards.after(sec)}
    let active="ALL";
    const draw=()=>{
      const views=active==="ALL"?institutional:institutional.filter(x=>String(x.view||"").toUpperCase().includes(active));
      sec.innerHTML=`<div class="isp-v2-head"><div><h2>🏦 Institutional & Fund-Research Ideas</h2><div class="isp-v2-note">Published external research views only. Indian Stock Pro does not alter or reinterpret the institution's published view.</div></div></div><div class="reason warning"><b>⚠️ Research disclaimer:</b> Institutional ratings and targets belong to the respective institution and may change. Verify the original source, think independently and consider your own risk before investing.</div><div class="isp-v2-filter"><button data-f="ALL" class="active">All</button><button data-f="BUY">Buy</button><button data-f="HOLD">Hold</button><button data-f="SELL">Sell</button><button data-f="ADDED">Portfolio additions</button></div><div class="isp-v2-grid">${views.map(x=>`<article class="isp-v2-card"><div class="isp-v2-meta">${esc(x.source)} · ${esc(x.sourceType||"External research")} · ${esc(x.date||"")}</div><h4>${esc(x.symbol)} — ${esc(x.company)}</h4><div><span class="badge ${String(x.view).toUpperCase().includes("BUY")?"positive":String(x.view).toUpperCase().includes("SELL")?"caution":"watch"}" style="margin-top:0">${esc(x.view)}</span>${x.target?` <span class="isp-v2-chip">Target ${esc(x.target)}</span>`:""}</div><div class="isp-v2-reason">${esc(x.reason)}</div><a class="isp-v2-link" href="${esc(x.url||"#")}" target="_blank" rel="noopener">Read original source →</a><div class="isp-v2-toolbar"><button class="isp-v2-btn" data-watch="${escAttr(x.symbol)}">⭐ Watch</button><button class="isp-v2-btn" data-analyze="${escAttr(x.symbol)}">Analyze</button></div></article>`).join("")}</div>`;
      sec.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{active=b.dataset.f;draw()});
      sec.querySelectorAll("[data-watch]").forEach(b=>b.onclick=()=>toggleWatch(b.dataset.watch));
      sec.querySelectorAll("[data-analyze]").forEach(b=>b.onclick=()=>analyzeSymbol(b.dataset.analyze));
    };
    draw();
  }

  function analyzeSymbol(sym){
    const s=(window.integrated||[]).find(x=>String(x.symbol).toUpperCase()===String(sym).toUpperCase());
    if(s&&typeof window.showDetails==="function"){window.showDetails(s);return;}
    const input=document.getElementById("search");if(input){input.value=sym;document.getElementById("analyzeBtn")?.click()}
  }

  function toggleWatch(sym){const a=watch();const k=String(sym).toUpperCase();const next=a.includes(k)?a.filter(x=>x!==k):[...a,k].slice(0,50);saveWatch(next);updateWatchButtonState()}
  function updateWatchButtonState(){document.querySelectorAll("[data-watch-state]").forEach(el=>{const k=String(el.dataset.watchState).toUpperCase();el.textContent=watch().includes(k)?"★ Watching":"☆ Watch"})}

  function openWatchlist(){
    const panel=document.createElement("div");panel.className="isp-v2-panel";panel.id="isp-watchlist-panel";
    const a=watch();
    panel.innerHTML=`<div class="isp-v2-head"><div><h3>⭐ My Watchlist</h3><div class="isp-v2-note">Saved locally on this device.</div></div><button class="isp-v2-btn" id="ispCloseWatch">Close</button></div><div class="isp-v2-watchlist">${a.length?a.map(sym=>`<div class="isp-v2-watch-item"><b>${esc(sym)}</b><button class="isp-v2-btn" data-wremove="${escAttr(sym)}">Remove</button></div>`).join(""):"<div class='empty'>No stocks added yet.</div>"}</div>`;
    const search=document.getElementById("search");search?.closest("section.panel")?.appendChild(panel);
    panel.querySelector("#ispCloseWatch").onclick=()=>panel.remove();
    panel.querySelectorAll("[data-wremove]").forEach(b=>b.onclick=()=>{toggleWatch(b.dataset.wremove);panel.remove();openWatchlist()});
  }

  function getQuote(sym){const s=(window.integrated||[]).find(x=>String(x.symbol).toUpperCase()===String(sym).toUpperCase());return s?.liveQuote||null}
  function createAlert(sym){
    const q=getQuote(sym);const price=num(q?.price);if(price===null){alert("Current quote is unavailable for this stock.");return}
    const target=prompt(`Set target price for ${sym}. Current price: ${money(price)}`,price.toFixed(2));if(target===null)return;const t=num(target);if(t===null||t<=0){alert("Enter a valid price.");return}
    const direction=t>price?"above":"below";const a=alerts().filter(x=>!(x.symbol===sym&&x.target===t));a.push({symbol:sym,target:t,direction,createdAt:new Date().toISOString(),triggered:false});saveAlerts(a);alert(`Alert saved: ${sym} when price moves ${direction} ₹${t.toFixed(2)}. Alerts are checked while the webpage/app is open.`)
  }

  function compareAdd(sym){
    const arr=JSON.parse(sessionStorage.getItem("isp_compare")||"[]");const k=String(sym).toUpperCase();if(!arr.includes(k))arr.push(k);sessionStorage.setItem("isp_compare",JSON.stringify(arr.slice(0,4)));renderCompare()}
  function renderCompare(){
    let sec=document.getElementById("isp-compare");if(!sec){sec=document.createElement("section");sec.id="isp-compare";sec.className="isp-v2-compare";document.querySelector(".container")?.appendChild(sec)}
    const syms=JSON.parse(sessionStorage.getItem("isp_compare")||"[]");
    if(!syms.length){sec.innerHTML=`<b>⚖ Compare stocks</b><div class="isp-v2-note" style="color:#b9c6da;margin-top:4px">Use “Compare” inside a stock report to build a comparison of up to 4 stocks.</div>`;return}
    const rows=syms.map(sym=>{const s=(window.integrated||[]).find(x=>String(x.symbol).toUpperCase()===sym);const f=fundamentals[sym]||{};return {sym,s,f}}).filter(x=>x.s||x.f);
    sec.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><b>⚖ Compare stocks</b><div style="color:#b9c6da;font-size:11px">Technical, fundamentals and institutional context remain separate.</div></div><button class="isp-v2-btn" id="ispClearCompare">Clear</button></div><div class="isp-v2-compare-grid">${rows.map(x=>`<div class="isp-v2-compare-card"><b>${esc(x.sym)}</b><div style="margin-top:4px;font-size:12px">Technical ${x.s?fmtSafe(x.s.integratedScore)+"/100":"—"}</div><div style="font-size:12px">Fundamental ${x.f?.score==null?"—":esc(x.f.score)+"/100"}</div><div style="font-size:12px">Health ${esc(x.f?.health||"—")}</div></div>`).join("")}</div>`;
    sec.querySelector("#ispClearCompare").onclick=()=>{sessionStorage.removeItem("isp_compare");renderCompare()}
  }
  function fmtSafe(v){const n=num(v);return n===null?"—":n.toFixed(1)}

  function augmentOpenModal(){
    if(typeof window.openModal!=="function"||window.openModal.__ispV2)return;
    const orig=window.openModal;
    const wrapped=function(title,html){
      let out=html;
      const t=String(title||"");
      const m=t.match(/^([^—]+)\s+—/);
      const sym=m?m[1].trim().toUpperCase():null;
      if(sym&&t.includes("Integrated Analysis")){
        const f=fundamentals[sym];
        if(f){
          const mm=f.metrics||{};
          const fundamentalBlock=`<div class="isp-v2-fund-mini"><h4>📊 Fundamental Health — ${esc(f.health||"Data limited")}</h4><div class="isp-v2-fund-grid"><div class="isp-v2-fund-cell"><small>Score</small><b>${f.score==null?"—":esc(f.score)+"/100"}</b></div><div class="isp-v2-fund-cell"><small>Revenue growth</small><b>${pct(mm.revenueGrowth)}</b></div><div class="isp-v2-fund-cell"><small>Earnings growth</small><b>${pct(mm.earningsGrowth)}</b></div><div class="isp-v2-fund-cell"><small>ROE</small><b>${pct(mm.roe)}</b></div><div class="isp-v2-fund-cell"><small>Debt / equity</small><b>${mm.debtToEquity==null?"—":esc(mm.debtToEquity)}</b></div><div class="isp-v2-fund-cell"><small>P/E</small><b>${mm.pe==null?"—":esc(mm.pe)}</b></div></div><div class="isp-v2-note" style="margin-top:7px">Fundamental snapshot is informational and uses the latest published dataset available to the app.</div></div>`;
          const ix=out.indexOf('<div class="report-section"><h3>📌 Decision Snapshot');
          out=ix>=0?out.slice(0,ix)+fundamentalBlock+out.slice(ix):fundamentalBlock+out;
        }
        const toolbar=`<div class="isp-v2-toolbar"><button class="isp-v2-btn primary" data-v2-watch>☆ Watch</button><button class="isp-v2-btn" data-v2-compare>⚖ Compare</button><button class="isp-v2-btn" data-v2-alert>🔔 Price alert</button></div>`;
        out=toolbar+out;
      }
      orig.call(this,title,out);
      setTimeout(()=>{
        const box=document.getElementById("modalContent");if(!box)return;
        const sym2=(String(title||"").match(/^([^—]+)\s+—/)||[])[1]?.trim().toUpperCase();if(!sym2)return;
        box.querySelector("[data-v2-watch]")?.addEventListener("click",()=>{toggleWatch(sym2);box.querySelector("[data-v2-watch]").textContent=watch().includes(sym2)?"★ Watching":"☆ Watch"});
        box.querySelector("[data-v2-compare]")?.addEventListener("click",()=>compareAdd(sym2));
        box.querySelector("[data-v2-alert]")?.addEventListener("click",()=>createAlert(sym2));
        const wb=box.querySelector("[data-v2-watch]");if(wb)wb.textContent=watch().includes(sym2)?"★ Watching":"☆ Watch";
      },0)
    };
    wrapped.__ispV2=true;window.openModal=wrapped
  }

  function checkAlerts(){
    const a=alerts();let changed=false;
    const notified=[];
    for(const x of a){if(x.triggered)continue;const q=getQuote(x.symbol);const p=num(q?.price);if(p===null)continue;const hit=x.direction==="above"?p>=x.target:p<=x.target;if(hit){x.triggered=true;changed=true;notified.push(`${x.symbol}: price ${money(p)} crossed alert ${money(x.target)}`);}}
    if(changed){saveAlerts(a);if(notified.length&&"Notification" in window&&Notification.permission==="granted")notified.forEach(msg=>new Notification("Indian Stock Pro alert",{body:msg}));if(notified.length)console.log("Indian Stock Pro alerts:",notified)}
  }

  async function load(){
    css();
    try{const f=await getJSON(FUND_URL);fundamentals=f?.stocks||{}}catch(e){console.warn("Fundamental layer unavailable",e)}
    try{const d=await getJSON(INST_URL);institutional=Array.isArray(d?.items)?d.items:[]}catch(e){console.warn("Institutional dataset unavailable",e)}
    installIndices();installWatchlistToolbar();installInstitutional();augmentOpenModal();renderCompare();checkAlerts();setInterval(checkAlerts,60000);
    const pageStatus=document.getElementById("status");if(pageStatus)pageStatus.textContent="✓ V2 research layer ready: fundamentals + institutional research + watchlist + comparison tools.";
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();
