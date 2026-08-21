/* Indian Stock Pro — live price presentation + on-demand stock analysis */
(function(){
  "use strict";
  const FEED="./data/live_quotes.json?ui="+Date.now();
  const ANALYSIS="./data/search_analysis.json?analysis="+Date.now();
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[m]));
  const money=v=>Number.isFinite(Number(v))?`₹${Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  let feed=null;
  let lastRenderSignature="";
  let analysisCache=null;
  let refreshPromise=null;

  function injectStyle(){
    if(document.getElementById("isp-live-price-style"))return;
    const style=document.createElement("style");
    style.id="isp-live-price-style";
    style.textContent=`
      .isp-live-price-box{margin-top:0;text-align:right;line-height:1.2;min-width:150px}
      .isp-live-price-main{font-size:20px;font-weight:900;white-space:nowrap}
      .isp-live-price-meta{font-size:10px;color:#667085;margin-top:4px;white-space:nowrap}
      .isp-live-change{font-size:12px;font-weight:900;margin-top:4px;white-space:nowrap}
      .isp-up{color:#16743b}.isp-down{color:#b42318}.isp-flat{color:#667085}
      .isp-live-tag{display:inline-block;margin-right:5px;padding:2px 5px;border-radius:999px;background:#eaf7ee;color:#16743b;font-size:9px;font-weight:900;vertical-align:2px}
      .isp-live-prev{font-size:10px;color:#667085;margin-top:3px;white-space:nowrap}
      .isp-analysis-backdrop{position:fixed;inset:0;background:rgba(5,12,25,.62);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px}
      .isp-analysis-modal{width:100%;max-width:900px;max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 18px 60px rgba(0,0,0,.25)}
      .isp-analysis-head{background:#10182b;color:#fff;padding:20px;border-radius:18px 18px 0 0}.isp-analysis-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
      .isp-analysis-symbol{font-size:27px;font-weight:900}.isp-analysis-company{margin-top:4px;color:#cbd3e3}.isp-analysis-price{font-size:25px;font-weight:900;text-align:right}.isp-analysis-close{border:0;background:#fff;color:#172033;border-radius:9px;padding:7px 10px;font-weight:900;cursor:pointer}
      .isp-analysis-body{padding:20px}.isp-analysis-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.isp-analysis-box{border:1px solid #e1e6ef;border-radius:12px;padding:13px;background:#fff}.isp-analysis-label{font-size:12px;color:#667085}.isp-analysis-value{font-size:20px;font-weight:900;margin-top:4px}.isp-analysis-small{font-size:12px;color:#667085;margin-top:5px;line-height:1.45}
      .isp-analysis-section{margin-top:20px}.isp-analysis-section h3{margin:0 0 10px}.isp-factor-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.isp-factor{background:#f5f7fa;border-radius:10px;padding:10px}.isp-factor b{display:block;font-size:13px}.isp-factor span{display:block;font-size:12px;color:#667085;margin-top:4px}
      .isp-news{border:1px solid #e1e6ef;border-radius:12px;padding:13px;margin-top:8px}.isp-news-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.isp-news-badge{padding:5px 9px;border-radius:999px;font-size:11px;font-weight:900}.isp-news-positive{background:#eaf7ee;color:#16743b}.isp-news-negative{background:#fdecec;color:#b42318}.isp-news-neutral{background:#fff4d8;color:#8a5a00}.isp-news-article{border-top:1px solid #eef1f5;padding-top:9px;margin-top:9px}.isp-news-article a{color:#2457a6;text-decoration:none;font-weight:800;font-size:13px}.isp-news-article p{font-size:12px;color:#667085;margin:5px 0 0;line-height:1.4}
      .isp-conclusion{margin-top:18px;background:#10182b;color:#fff;border-radius:13px;padding:16px}.isp-conclusion-title{font-size:18px;font-weight:900}.isp-conclusion-text{color:#dce5f4;line-height:1.5;margin-top:6px}.isp-disclaimer{font-size:11px;color:#667085;line-height:1.45;margin-top:14px}
      @media(max-width:700px){.isp-live-price-box{min-width:120px}.isp-live-price-main{font-size:18px}.isp-live-price-meta,.isp-live-prev{font-size:9px;white-space:normal}.isp-live-change{font-size:11px;white-space:normal}.isp-analysis-top{flex-direction:column}.isp-analysis-price{text-align:left}.isp-analysis-grid{grid-template-columns:1fr 1fr}.isp-factor-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function symbolFromCard(card){
    const rank=card.querySelector(".rank");
    if(!rank)return null;
    const text=(rank.textContent||"").trim();
    const m=text.match(/^#?\s*\d+\s+([A-Za-z0-9&.-]+)/);
    return m?m[1].toUpperCase():null;
  }

  function renderCard(card,q){
    if(!q)return;
    const el=card.querySelector(".top > div:last-child");
    if(!el)return;
    const price=num(q.price),prev=num(q.previousClose),change=num(q.change),pct=num(q.changePct);
    if(price===null)return;
    const cls=pct===null?"isp-flat":pct>0?"isp-up":pct<0?"isp-down":"isp-flat";
    const pctText=pct===null?"Change unavailable":`${pct>0?"+":""}${pct.toFixed(2)}%`;
    const changeText=change===null?"":`${change>0?"+":""}${money(change)}`;
    const d=q.timestamp?new Date(q.timestamp):null;
    let updated="";
    if(d&&!Number.isNaN(d.getTime()))updated=new Intl.DateTimeFormat("en-IN",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(d)+" IST";
    const html=`<div class="isp-live-price-box" aria-label="Live market quote"><div class="isp-live-price-main"><span class="isp-live-tag">LIVE</span>${esc(money(price))}</div><div class="isp-live-change ${cls}">${esc(changeText)}${changeText&&pctText?" · ":""}${esc(pctText)}</div><div class="isp-live-prev">Prev close ${esc(money(prev))}</div>${updated?`<div class="isp-live-price-meta">Updated ${esc(updated)}</div>`:""}</div>`;
    if(el.innerHTML!==html)el.innerHTML=html;
  }

  function renderAll(){
    if(!feed)return;
    const quotes=feed.quotes||{};
    const cards=[...document.querySelectorAll(".card")];
    const signature=cards.map(card=>{const symbol=symbolFromCard(card);const q=symbol?quotes[symbol]:null;return `${symbol||""}:${q?.price??""}:${q?.previousClose??""}:${q?.change??""}:${q?.changePct??""}:${q?.timestamp??""}`}).join("|");
    if(signature===lastRenderSignature)return;
    lastRenderSignature=signature;
    cards.forEach(card=>{const symbol=symbolFromCard(card);if(symbol&&quotes[symbol])renderCard(card,quotes[symbol]);});
  }

  async function refreshLiveQuotes(){
    if(refreshPromise)return refreshPromise;
    refreshPromise=(async()=>{
      injectStyle();
      const response=await fetch("./data/live_quotes.json?refresh="+Date.now(),{cache:"no-store"});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      feed=await response.json();
      window.indianStockLiveQuotes=feed;
      lastRenderSignature="";
      renderAll();
      window.dispatchEvent(new CustomEvent("isp-live-quotes-refreshed",{detail:feed}));
      return feed;
    })().finally(()=>{refreshPromise=null;});
    return refreshPromise;
  }
  window.indianStockRefreshQuotes=refreshLiveQuotes;

  async function load(){
    injectStyle();
    try{await refreshLiveQuotes();setInterval(renderAll,5000);}catch(error){console.warn("Indian Stock Pro live quote layer failed:",error);}
  }

  async function loadAnalysis(){
    if(analysisCache)return analysisCache;
    const response=await fetch(ANALYSIS,{cache:"no-store"});
    if(!response.ok)throw new Error(`Analysis feed HTTP ${response.status}`);
    analysisCache=await response.json();
    return analysisCache;
  }

  function analysisHtml(stock){
    const q=stock.quantitative;
    const n=stock.news||{};
    const l=stock.logical||{};
    const live=feed?.quotes?.[stock.symbol];
    const displayPrice=live?.price??q?.price;
    const priceLabel=live?"LIVE price":"Latest analysis price";
    const direction=String(n.direction||"neutral").toLowerCase();
    const badgeClass=direction==="positive"?"isp-news-positive":direction==="negative"?"isp-news-negative":"isp-news-neutral";
    const factors=q?.factors||{};
    const raw=q?.raw||{};
    const articleHtml=(n.articles||[]).slice(0,5).map(a=>`<div class="isp-news-article"><a href="${esc(a.link||"#")}" target="_blank" rel="noopener">${esc(a.title||"News article")}</a><p>${esc(a.description||a.summary||"")}</p></div>`).join("");
    return `<div class="isp-analysis-backdrop" id="ispAnalysisBackdrop"><div class="isp-analysis-modal" role="dialog" aria-modal="true" aria-label="Stock analysis"><div class="isp-analysis-head"><div class="isp-analysis-top"><div><div class="isp-analysis-symbol">${esc(stock.symbol)}</div><div class="isp-analysis-company">${esc(stock.company||"")} · NSE ${esc(stock.series||"EQ")}</div></div><div><div class="isp-analysis-price">${money(displayPrice)}</div><div style="font-size:11px;color:#cbd3e3;text-align:right">${priceLabel}</div></div><button class="isp-analysis-close" id="ispAnalysisClose">✕</button></div></div><div class="isp-analysis-body"><div class="isp-analysis-grid"><div class="isp-analysis-box"><div class="isp-analysis-label">Quantitative score</div><div class="isp-analysis-value">${q?Number(q.score).toFixed(1):"—"}/100</div><div class="isp-analysis-small">${esc(q?.signal||"Analysis unavailable")}</div></div><div class="isp-analysis-box"><div class="isp-analysis-label">Confidence</div><div class="isp-analysis-value">${q?Number(q.confidence).toFixed(1):"—"}/100</div><div class="isp-analysis-small">Separate from the signal score</div></div><div class="isp-analysis-box"><div class="isp-analysis-label">Logical view</div><div class="isp-analysis-value" style="font-size:16px">${esc(l.label||"—")}</div><div class="isp-analysis-small">${esc(l.decision||"")}</div></div></div><div class="isp-analysis-section"><h3>📊 Statistical / quantitative evidence</h3><div class="isp-factor-grid">${[["Momentum",factors.momentum],["Trend",factors.trend],["Relative strength",factors.relativeStrength],["Volume",factors.volume],["RSI quality",factors.rsiQuality],["Breakout",factors.breakout],["Volatility",factors.volatility],["Risk / reward",factors.riskReward]].map(x=>`<div class="isp-factor"><b>${esc(x[0])}</b><span>${q?Number(x[1]).toFixed(1):"—"}/100</span></div>`).join("")}</div><div class="isp-analysis-small" style="margin-top:10px">5D ${raw.return5d??"—"}% · 20D ${raw.return20d??"—"}% · 60D ${raw.return60d??"—"}% · RSI ${raw.rsi14??"—"} · Volume ratio ${raw.volumeRatio??"—"} · 20D volatility ${raw.volatility20d??"—"}%</div></div><div class="isp-analysis-section"><h3>📰 News & market context</h3><div class="isp-news"><div class="isp-news-head"><b>${esc(n.coverage||"News context")}</b><span class="isp-news-badge ${badgeClass}">${esc(direction.toUpperCase())} · ${esc(n.impact||"low").toUpperCase()} IMPACT</span></div><div class="isp-analysis-small">${esc(n.summary||"No news context available.")}</div>${articleHtml||"<div class=\"isp-analysis-small\">No articles available.</div>"}</div></div><div class="isp-conclusion"><div class="isp-conclusion-title">🧠 Indian Stock Pro synthesis</div><div class="isp-conclusion-text"><b>${esc(l.label||"Research view")}</b><br>${esc(l.baseSignal||"")} · ${esc(l.confidenceNote||"")}</div></div><div class="isp-disclaimer">This is a research/screening view, not a guaranteed prediction or personal investment advice. Quantitative data can be stale between dataset refreshes; live price is displayed separately where the published live feed contains the symbol.</div></div></div></div>`;
  }

  async function runSearchAnalysis(){
    const input=document.getElementById("search");
    const q=String(input?.value||"").trim().toUpperCase();
    if(!q){alert("Enter an NSE symbol or company name.");return;}
    const old=document.getElementById("ispAnalysisBackdrop");if(old)old.remove();
    const button=document.getElementById("analyzeBtn");
    const original=button?.textContent;
    if(button){button.disabled=true;button.textContent="Analyzing…";}
    try{
      const data=await loadAnalysis();
      const needle=q;
      const matches=(data.stocks||[]).filter(s=>String(s.symbol||"").toUpperCase()===needle||String(s.company||"").toUpperCase().includes(needle)||String(s.symbol||"").toUpperCase().includes(needle));
      if(!matches.length){alert("No NSE equity match found in the analysis directory.");return;}
      const stock=matches[0];
      const wrapper=document.createElement("div");wrapper.innerHTML=analysisHtml(stock);document.body.appendChild(wrapper.firstElementChild);
      document.getElementById("ispAnalysisClose")?.addEventListener("click",()=>document.getElementById("ispAnalysisBackdrop")?.remove());
      document.getElementById("ispAnalysisBackdrop")?.addEventListener("click",e=>{if(e.target.id==="ispAnalysisBackdrop")e.currentTarget.remove();});
    }catch(error){
      console.warn("Indian Stock Pro search analysis failed:",error);
      alert("The full stock-analysis feed is still being prepared. Please try again after the Search Analysis workflow finishes.");
    }finally{if(button){button.disabled=false;button.textContent=original||"Analyze";}}
  }

  function installSearchCapture(){
    document.addEventListener("click",e=>{
      const target=e.target?.closest?.("#analyzeBtn");
      if(!target)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      runSearchAnalysis();
    },true);
    document.addEventListener("keydown",e=>{
      if(e.key!=="Enter")return;
      if(document.activeElement?.id!=="search")return;
      e.preventDefault();
      e.stopImmediatePropagation();
      document.getElementById("searchResults")?.style.setProperty("display","none");
      runSearchAnalysis();
    },true);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{installSearchCapture();load();});else{installSearchCapture();load();}
})();
