/* Indian Stock Pro — V2 bridge + pro dashboard reliability layer */
(function(){
  "use strict";

  function sync(){
    try{
      if(typeof integrated!=="undefined") window.integrated=integrated;
      if(typeof quantitative!=="undefined") window.quantitative=quantitative;
    }catch(e){}
  }

  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  let refreshBusy=false;
  let refreshTimer=null;

  function injectStyle(){
    if(document.getElementById("isp-pro-style"))return;
    const s=document.createElement("style");
    s.id="isp-pro-style";
    s.textContent=`
      .isp-feed-health{margin:0 0 18px;border:1px solid #dfe5ee;border-radius:14px;background:#fff;padding:13px 15px;box-shadow:0 4px 18px rgba(0,0,0,.04)}
      .isp-feed-health-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
      .isp-feed-health-title{font-weight:900;color:#172033}.isp-feed-health-time{font-size:11px;color:#667085}
      .isp-health-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
      .isp-health-item{border:1px solid #e6eaf0;border-radius:10px;padding:9px;background:#f8fafc}
      .isp-health-label{font-size:10px;color:#667085;font-weight:800;text-transform:uppercase}.isp-health-value{font-size:12px;font-weight:900;margin-top:3px}
      .isp-health-ok{color:#16743b}.isp-health-warn{color:#8a5a00}.isp-health-bad{color:#b42318}
      .isp-important{margin:0 0 18px;border:2px solid #d92d20;border-radius:14px;background:#fff1f0;color:#b42318;padding:14px 16px;line-height:1.5}
      .isp-important strong{color:#a20f0a}.isp-important-title{font-weight:900;font-size:14px;margin-bottom:4px}
      .isp-session{font-weight:800}.isp-refresh-note{font-size:11px;color:#667085;margin-top:8px}
      @media(max-width:800px){.isp-health-grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:500px){.isp-health-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function marketSession(){
    const now=new Date();
    const parts=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:false,weekday:"short"}).formatToParts(now);
    const get=t=>parts.find(x=>x.type===t)?.value||"";
    const day=get("weekday"), hh=Number(get("hour")), mm=Number(get("minute"));
    const mins=hh*60+mm;
    if(day==="Sun"||day==="Sat")return "Market closed · weekend";
    if(mins<555)return "Pre-market";
    if(mins<930)return "Market open";
    return "Market closed · last session ended";
  }

  function ensureHealth(){
    let el=document.getElementById("ispFeedHealth");
    if(el)return el;
    el=document.createElement("section");
    el.id="ispFeedHealth";
    el.className="isp-feed-health";
    const index=document.getElementById("isp-market-indices");
    if(index&&index.parentNode)index.parentNode.insertBefore(el,index.nextSibling);
    else document.body.prepend(el);
    return el;
  }

  function ensureImportantNotice(){
    if(document.getElementById("ispImportantNotice"))return;
    const el=document.createElement("section");
    el.id="ispImportantNotice";
    el.className="isp-important";
    el.innerHTML=`<div class="isp-important-title">⚠️ IMPORTANT NOTICE</div><strong>Indian Stock Pro is a research and screening tool, not a guaranteed prediction or personal investment adviser.</strong> Market prices and index values may be delayed or unavailable. Institutional research is displayed as the respective institution's published view and does not become an Indian Stock Pro recommendation. Verify current prices, company disclosures and market conditions before investing. Past performance does not guarantee future returns. <div class="isp-refresh-note">Feed policy: the app requests the newest published data when opened or refreshed and automatically checks again while the page remains open.</div>`;
    const footer=document.querySelector(".container .panel:last-child");
    if(footer&&footer.parentNode)footer.parentNode.insertBefore(el,footer);else document.querySelector(".container")?.appendChild(el);
  }

  function setHealth(indexText,stockText,newsText,researchText){
    const el=ensureHealth();
    el.innerHTML=`<div class="isp-feed-health-head"><div class="isp-feed-health-title">🩺 Data & Feed Health</div><div class="isp-feed-health-time">${esc(marketSession())} · checked ${esc(new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}))}</div></div><div class="isp-health-grid"><div class="isp-health-item"><div class="isp-health-label">NIFTY / SENSEX</div><div class="isp-health-value ${indexText.ok?"isp-health-ok":"isp-health-warn"}">${esc(indexText.text)}</div></div><div class="isp-health-item"><div class="isp-health-label">Stock quotes</div><div class="isp-health-value ${stockText.ok?"isp-health-ok":"isp-health-warn"}">${esc(stockText.text)}</div></div><div class="isp-health-item"><div class="isp-health-label">News layer</div><div class="isp-health-value ${newsText.ok?"isp-health-ok":"isp-health-warn"}">${esc(newsText.text)}</div></div><div class="isp-health-item"><div class="isp-health-label">Research context</div><div class="isp-health-value ${researchText.ok?"isp-health-ok":"isp-health-warn"}">${esc(researchText.text)}</div></div></div>`;
  }

  function updateHealthFromPage(){
    const index=document.getElementById("isp-market-indices");
    const indexOk=!!index&&!/Loading|unavailable/i.test(index.textContent||"")&&!!index.querySelector(".isp-index-value")&&!Array.from(index.querySelectorAll(".isp-index-value")).some(x=>x.textContent.trim()==="—");
    const quoteText=document.getElementById("liveQuoteText")?.textContent||"";
    const quoteOk=/prices loaded/i.test(quoteText);
    const newsOk=/news/i.test(document.getElementById("status")?.textContent||"")&&!/temporarily unavailable/i.test(document.getElementById("status")?.textContent||"");
    setHealth(
      {ok:indexOk,text:indexOk?"Published feed available":"Waiting / delayed"},
      {ok:quoteOk,text:quoteOk?quoteText.replace(/\.\s*$/,"."):"Checking published quote feed"},
      {ok:newsOk,text:newsOk?"Context loaded":"Optional layer / updating"},
      {ok:true,text:"Quantitative + context loaded"}
    );
  }

  function updateCardQuotes(feed){
    if(!feed||typeof feed.quotes!=="object")return 0;
    let count=0;
    document.querySelectorAll(".card").forEach(card=>{
      const rank=card.querySelector(".rank");
      if(!rank)return;
      const m=(rank.textContent||"").trim().match(/^#?\s*\d+\s+([A-Za-z0-9&.-]+)/);
      if(!m)return;
      const symbol=m[1].toUpperCase();
      const q=feed.quotes[symbol];
      if(!q||num(q.price)===null)return;
      const target=card.querySelector(".top > div:last-child");
      if(!target)return;
      const p=num(q.price), prev=num(q.previousClose), ch=num(q.change), pct=num(q.changePct);
      const cls=pct===null?"isp-flat":pct>0?"isp-up":pct<0?"isp-down":"isp-flat";
      const money=v=>num(v)!==null?`₹${num(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
      const updated=q.timestamp?new Date(q.timestamp):null;
      const updatedText=updated&&!Number.isNaN(updated.getTime())?new Intl.DateTimeFormat("en-IN",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(updated)+" IST":"";
      target.innerHTML=`<div class="isp-live-price-box" aria-label="Published market quote"><div class="isp-live-price-main"><span class="isp-live-tag">LIVE</span>${esc(money(p))}</div><div class="isp-live-change ${cls}">${ch===null?"":esc((ch>0?"+":"")+money(ch))}${ch!==null&&pct!==null?" · ":""}${pct===null?"Change unavailable":esc((pct>0?"+":"")+pct.toFixed(2)+"%")}</div><div class="isp-live-prev">Prev close ${esc(money(prev))}</div>${updatedText?`<div class="isp-live-price-meta">Updated ${esc(updatedText)}</div>`:""}</div>`;
      count++;
    });
    return count;
  }

  async function refreshStockQuotes(){
    if(refreshBusy)return;
    refreshBusy=true;
    try{
      const r=await fetch("./data/live_quotes.json?auto="+Date.now(),{cache:"no-store"});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const feed=await r.json();
      window.indianStockLiveQuotes=feed;
      const count=updateCardQuotes(feed);
      const text=document.getElementById("liveQuoteText");
      if(text&&feed.generatedAt){
        const dt=new Date(feed.generatedAt);
        const stamp=!Number.isNaN(dt.getTime())?new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(dt)+" IST":"";
        const total=Object.keys(feed.quotes||{}).length;
        text.textContent=`${count||total} published stock quotes available · feed generated ${stamp}. Auto-refresh checks every 5 minutes.`;
      }
    }catch(e){console.warn("Automatic stock quote refresh failed",e)}
    finally{refreshBusy=false;updateHealthFromPage()}
  }

  function start(){
    injectStyle();
    sync();
    ensureImportantNotice();
    ensureHealth();
    updateHealthFromPage();
    refreshStockQuotes();
    clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>{refreshStockQuotes();updateHealthFromPage()},300000);
    document.addEventListener("visibilitychange",()=>{if(!document.hidden){refreshStockQuotes();updateHealthFromPage()}});
    window.addEventListener("focus",()=>{refreshStockQuotes();updateHealthFromPage()});
    setInterval(updateHealthFromPage,30000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
