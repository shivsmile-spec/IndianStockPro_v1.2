/* Indian Stock Pro — NSE-wide search + reliable live price renderer */
(function(){
  "use strict";
  const SEARCH_URL="./data/nse_universe.json?v="+Date.now();
  const QUOTE_URL="./data/live_quotes.json?v="+Date.now();
  let universe=[];
  let ready=false;

  const norm=v=>String(v||"").trim().toUpperCase();
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const money=v=>num(v)!==null?`₹${num(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";

  async function loadUniverse(){
    try{
      const r=await fetch(SEARCH_URL,{cache:"no-store"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const body=await r.json();
      universe=Array.isArray(body)?body:(Array.isArray(body.stocks)?body.stocks:[]);
      ready=true;
      const input=document.getElementById("search");
      if(input)input.placeholder="Search any NSE stock by symbol or company name";
    }catch(e){console.warn("NSE-wide directory unavailable:",e);}
  }

  function currentAnalyzed(symbol){
    const arr=window.integrated||[];
    return arr.find(x=>norm(x.symbol)===norm(symbol));
  }

  function openFullAnalysis(symbol){
    if(typeof window.showSearchAnalysisSymbol==="function"){
      window.showSearchAnalysisSymbol(symbol);
      return true;
    }
    if(!openFullAnalysis._tries)openFullAnalysis._tries=0;
    if(openFullAnalysis._tries<30){
      openFullAnalysis._tries++;
      window.setTimeout(()=>openFullAnalysis(symbol),100);
      return true;
    }
    openFullAnalysis._tries=0;
    return false;
  }

  function renderResults(query){
    const box=document.getElementById("searchResults");
    if(!box)return;
    const q=norm(query);
    if(!q){box.style.display="none";box.innerHTML="";return;}
    if(!ready){box.style.display="block";box.innerHTML='<div class="search-item"><b>Loading NSE stock directory…</b><span>Please try again in a moment.</span></div>';return;}
    const found=universe.filter(x=>{
      const s=norm(x.symbol),n=norm(x.companyName||x.company||x.name);
      return s.includes(q)||n.includes(q);
    }).slice(0,20);
    if(!found.length){box.style.display="block";box.innerHTML='<div class="search-item"><b>No NSE stock found</b><span>Try another company name or symbol.</span></div>';return;}
    box.innerHTML=found.map(x=>{
      const a=currentAnalyzed(x.symbol);
      return `<div class="search-item nse-wide-result" data-nse-symbol="${esc(x.symbol)}"><b>${esc(x.symbol)}</b><span>${esc(x.companyName||x.company||x.name||"")} · ${esc(x.series||"EQ")}${a?" · ✅ Indian Stock Pro analyzed":" · NSE directory"}</span></div>`;
    }).join("");
    box.style.display="block";
  }

  function selectResult(symbol){
    const item=universe.find(x=>norm(x.symbol)===norm(symbol));
    if(!item)return;
    const input=document.getElementById("search");
    if(input)input.value=item.symbol;
    const box=document.getElementById("searchResults");
    if(box)box.style.display="none";
    if(openFullAnalysis(item.symbol))return;
    const analyzed=currentAnalyzed(symbol);
    if(analyzed&&typeof window.showDetails==="function"){window.showDetails(analyzed);return;}
    if(typeof window.openModal==="function"){
      window.openModal(`${esc(item.symbol)} — NSE Stock Directory`,`<div class="hero"><div class="hero-line"><div><div class="hero-symbol">${esc(item.symbol)}</div><div>${esc(item.companyName||item.company||item.name||"NSE equity")}</div></div><div class="hero-price">NSE Equity</div></div></div><div class="detail-grid"><div class="detail"><small>Company</small><br><b>${esc(item.companyName||item.company||item.name||"—")}</b></div><div class="detail"><small>Symbol</small><br><b>${esc(item.symbol||"—")}</b></div><div class="detail"><small>Series</small><br><b>${esc(item.series||"EQ")}</b></div><div class="detail"><small>ISIN</small><br><b>${esc(item.isin||"—")}</b></div></div><div class="reason"><b>Indian Stock Pro analysis</b><br><span>This stock is listed in the NSE-wide directory, but its full searchable analysis dataset is not currently published. Please refresh after the analysis engine finishes.</span></div>`);
    }else alert(`${item.symbol} — ${item.companyName||item.company||item.name||"NSE stock"}\n\nFull stock analysis is not currently published.`);
  }

  function injectLiveCSS(){
    if(document.getElementById("isp-live-direct-css"))return;
    const s=document.createElement("style");
    s.id="isp-live-direct-css";
    s.textContent=`
      .isp-live-direct{text-align:right;line-height:1.22}
      .isp-live-direct .main{font-size:20px;font-weight:900}
      .isp-live-direct .tag{display:inline-block;margin-right:5px;padding:2px 5px;border-radius:999px;background:#eaf7ee;color:#16743b;font-size:9px;font-weight:900;vertical-align:2px}
      .isp-live-direct .chg{font-size:11px;font-weight:900;margin-top:2px}
      .isp-live-direct .up{color:#16743b}.isp-live-direct .down{color:#b42318}.isp-live-direct .flat{color:#667085}
      .isp-live-direct .meta{font-size:10px;color:#667085;margin-top:3px;font-weight:400}
      @media(max-width:700px){.isp-live-direct .main{font-size:18px}.isp-live-direct .meta{font-size:9px}}
    `;
    document.head.appendChild(s);
  }

  function renderLiveCards(feed){
    const quotes=feed&&feed.quotes&&typeof feed.quotes==="object"?feed.quotes:{};
    document.querySelectorAll(".card").forEach(card=>{
      const rank=card.querySelector(".rank"),el=card.querySelector(".price");
      if(!rank||!el)return;
      const m=(rank.textContent||"").trim().match(/^#?\s*\d+\s+([A-Za-z0-9&.-]+)/);
      if(!m)return;
      const q=quotes[norm(m[1])];
      const p=num(q&&q.price);
      if(p===null)return;
      const prev=num(q.previousClose),change=num(q.change),pct=num(q.changePct);
      const cls=pct===null?"flat":pct>0?"up":"down";
      const pctText=pct===null?"Change unavailable":`${pct>0?"+":""}${pct.toFixed(2)}%`;
      const changeText=change===null?"":` (${change>0?"+":""}${money(change)})`;
      let updated="";
      if(q.timestamp){
        const d=new Date(q.timestamp);
        if(!Number.isNaN(d.getTime())){
          try{updated=new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(d)+" IST";}catch(e){updated=d.toLocaleString()+" IST";}
        }
      }
      el.innerHTML=`<div class="isp-live-direct"><div class="main"><span class="tag">LIVE</span>${esc(money(p))}</div><div class="chg ${cls}">${esc(pctText+changeText)}</div><div class="meta">Prev close ${esc(money(prev))}${updated?` · Updated ${esc(updated)}`:""}</div></div>`;
    });
  }

  async function refreshLiveCards(){
    try{
      const r=await fetch(QUOTE_URL,{cache:"no-store"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const feed=await r.json();
      window.indianStockLiveQuotes=feed;
      renderLiveCards(feed);
      return feed;
    }catch(e){console.warn("Live quote card renderer unavailable:",e);return null;}
  }

  function startLiveRenderer(){
    injectLiveCSS();
    refreshLiveCards();
    const observer=new MutationObserver(()=>renderLiveCards(window.indianStockLiveQuotes));
    observer.observe(document.body,{childList:true,subtree:true});
    window.setTimeout(()=>observer.disconnect(),120000);
    window.setInterval(refreshLiveCards,60000);
    window.setInterval(()=>renderLiveCards(window.indianStockLiveQuotes),5000);
  }

  function install(){
    const input=document.getElementById("search"),box=document.getElementById("searchResults");
    if(!input||!box)return;
    input.addEventListener("input",function(e){if(!ready)loadUniverse();renderResults(input.value);e.stopImmediatePropagation();},true);
    box.addEventListener("click",function(e){const row=e.target.closest?.(".nse-wide-result");if(!row)return;e.preventDefault();e.stopPropagation();selectResult(row.getAttribute("data-nse-symbol"));},true);
    const analyze=document.getElementById("analyzeBtn");
    if(analyze)analyze.addEventListener("click",function(e){const symbol=norm(input.value);if(!symbol||!ready)return;const found=universe.find(x=>norm(x.symbol)===symbol);if(found){e.preventDefault();e.stopImmediatePropagation();selectResult(symbol);}},true);
    loadUniverse();
    startLiveRenderer();
    const analysisLoader=document.createElement("script");
    analysisLoader.src="./search-analysis-ui.js?v="+Date.now();
    document.head.appendChild(analysisLoader);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();