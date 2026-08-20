/* Indian Stock Pro — unified one-click dashboard */
(function(){
  "use strict";
  const TABS=[
    ["indices","📊 Market Indices","isp-market-indices"],
    ["search","🔎 Search Share · Health & Analyze","isp-search-analyze"],
    ["top10","🏆 Top 10 Stocks to Invest","isp-top10"],
    ["quant","📈 Quantitative Leaders","isp-quantitative"],
    ["institutional","🏦 Institutional Research","institutionalResearchPanel"],
    ["news","📰 News & Market Context","isp-news-context"],
    ["ipo","🧾 Upcoming IPO","ispIPOCalendar"],
    ["dividend","💰 Upcoming Dividend","ispDividendCalendar"],
    ["price","💰 Price-wise Opportunities","isp-price-bands"],
    ["summary","📊 Integrated Market Summary","isp-summary-panel"],
    ["method","🧠 Engine Methodology","isp-methodology"],
    ["notice","⚠️ Important Notice","ispImportantNotice"]
  ];
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  let active="indices",observerTimer,newsLoading=false;
  const panel=el=>el?.closest("section.panel")||el||null;
  function mark(id,el,title,desc){
    const p=panel(el);if(!p)return null;
    if(!p.id||p.id===id)p.id=id;
    p.classList.add("isp-tab-panel");p.dataset.ispTabPanel="1";
    if(title&&!p.querySelector(".isp-tab-title")){const h=document.createElement("div");h.className="isp-tab-title";h.innerHTML=`<strong>${esc(title)}</strong><span>${esc(desc||"")}</span>`;p.insertBefore(h,p.firstChild);}
    return p;
  }
  function ensureNewsPanel(){
    let p=document.getElementById("isp-news-context");
    if(p)return p;
    const anchor=document.getElementById("integratedCards")?.closest("section.panel")||document.querySelector(".container > section.panel");
    if(!anchor||!anchor.parentNode)return null;
    p=document.createElement("section");p.className="panel isp-tab-panel";p.id="isp-news-context";p.dataset.ispTabPanel="1";
    p.innerHTML=`<div class="isp-tab-title"><strong>📰 News &amp; Market Context</strong><span>Recent company, industry, macroeconomic, commodity and geopolitical context used by the research engine.</span></div><div class="isp-news-status">Loading latest published news context…</div>`;
    anchor.parentNode.insertBefore(p,anchor.nextSibling);return p;
  }
  function renderNews(data){
    const p=ensureNewsPanel();if(!p)return;
    const articles=Array.isArray(data?.marketContext?.articles)?data.marketContext.articles:[];
    const generated=data?.generated?new Date(data.generated).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"—";
    const rows=articles.slice(0,12).map(a=>{const c=a.classification||{};return `<article class="isp-news-item"><div class="isp-news-item-top"><span class="isp-news-badge">${esc(String(c.direction||"neutral").toUpperCase())} · ${esc(String(c.impact||"low").toUpperCase())}</span><span>${esc(a.published||"")}</span></div><a href="${esc(a.link||"#")}" target="_blank" rel="noopener noreferrer">${esc(a.title||"Untitled article")}</a><div>${esc(a.description||"")}</div></article>`;}).join("");
    p.innerHTML=`<div class="isp-tab-title"><strong>📰 News &amp; Market Context</strong><span>Recent company, industry, macroeconomic, commodity and geopolitical screening after quantitative selection.</span></div><div class="isp-news-meta"><b>${esc(data?.summary?.status||"News context loaded")}</b><span>Generated: ${esc(generated)}</span><span>Stocks screened: ${Number(data?.summary?.inputStocks)||"—"}</span></div><div class="isp-news-grid">${rows||`<div class="isp-news-status">No market-context articles are available in the current published dataset.</div>`}</div>`;
    if(!document.getElementById("isp-news-style")){const s=document.createElement("style");s.id="isp-news-style";s.textContent=`
      .isp-news-meta{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 14px;padding:11px 13px;border-radius:11px;background:#f5f7fa;color:#475467;font-size:12px}
      .isp-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .isp-news-item{border:1px solid #e1e6ef;border-radius:12px;padding:13px;background:#fff}
      .isp-news-item-top{display:flex;justify-content:space-between;gap:10px;color:#667085;font-size:11px;margin-bottom:7px}
      .isp-news-badge{font-weight:800}.isp-news-item a{display:block;color:#123c7a;font-weight:800;text-decoration:none;line-height:1.35;margin-bottom:6px}.isp-news-item div:last-child{font-size:12px;color:#667085;line-height:1.4}.isp-news-status{padding:16px;border:1px dashed #cbd5e1;border-radius:12px;color:#667085}
      @media(max-width:700px){.isp-news-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);}
  }
  function loadNews(){if(newsLoading)return;newsLoading=true;fetch("./data/news_context.json?v="+Date.now(),{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject(Error("HTTP "+r.status))).then(renderNews).catch(e=>{const p=ensureNewsPanel();if(p)p.innerHTML=`<div class="isp-tab-title"><strong>📰 News &amp; Market Context</strong><span>Recent company, industry, macroeconomic, commodity and geopolitical context.</span></div><div class="isp-news-status">News context could not be loaded from the published dataset. Refresh after the next feed update.</div>`;console.warn("News context unavailable",e)}).finally(()=>{newsLoading=false;});}
  function discover(){
    mark("isp-market-indices",document.getElementById("isp-market-indices"),"Market Indices","NIFTY 50 and SENSEX published market snapshot.");
    const search=mark("isp-search-analyze",document.getElementById("search"),"Search Share · Health & Analyze","Search an NSE share and open the complete quantitative, fundamental and context report.");
    const health=document.getElementById("ispFeedHealth");if(search&&health&&!search.contains(health))search.insertBefore(health,search.firstChild);
    mark("isp-top10",document.getElementById("integratedCards"),"Top 10 Stocks to Invest","Top integrated opportunities ranked by the current model.");
    mark("isp-quantitative",document.getElementById("quantCards"),"Quantitative Leaders","Technical screening leaders before external context.");
    ensureNewsPanel();loadNews();
    mark("isp-price-bands",document.getElementById("bands"),"Price-wise Opportunities","Integrated opportunities grouped by current published price range.");
    mark("isp-summary-panel",document.getElementById("summary"),"Integrated Market Summary","One-screen view of the current model state.");
    const method=document.querySelector(".container > section.panel:nth-of-type(7)");
    if(method&&/How the Integrated Engine Works/i.test(method.textContent||""))mark("isp-methodology",method,"Engine Methodology","How quantitative and external context are combined.");
    else{const p=[...document.querySelectorAll(".container > section.panel")].find(x=>/How the Integrated Engine Works/i.test(x.textContent||""));if(p)mark("isp-methodology",p,"Engine Methodology","How quantitative and external context are combined.");}
    ["institutionalResearchPanel","ispIPOCalendar","ispDividendCalendar","ispImportantNotice"].forEach(id=>{const p=document.getElementById(id);if(p){p.classList.add("isp-tab-panel");p.dataset.ispTabPanel="1";}});
  }
  function target(id){const t=TABS.find(x=>x[0]===id);return t?panel(document.getElementById(t[2])):null;}
  function style(){if(document.getElementById("isp-tabs-style"))return;const s=document.createElement("style");s.id="isp-tabs-style";s.textContent=`
      .isp-dashboard-tabs{position:sticky;top:0;z-index:900;background:#10182b;box-shadow:0 5px 18px rgba(0,0,0,.18)}.isp-tabs-inner{max-width:1150px;margin:auto;padding:10px 20px;display:flex;gap:7px;overflow-x:auto}.isp-tab{flex:0 0 auto;border:1px solid rgba(255,255,255,.14);background:#17233c;color:#dbe5f5;padding:10px 13px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}.isp-tab:hover{background:#223252}.isp-tab.active{background:#fff;color:#10182b}.isp-tab-panel{display:none!important}.isp-tab-panel.isp-active{display:block!important}.isp-tab-title{margin:0 0 12px;padding:13px 15px;border-radius:13px;background:#f5f7fa;border:1px solid #e1e6ef}.isp-tab-title strong{font-size:16px}.isp-tab-title span{display:block;margin-top:3px;font-size:12px;color:#667085}@media(max-width:700px){.isp-tabs-inner{padding:8px 12px}.isp-tab{font-size:11px;padding:9px 11px}}
    `;document.head.appendChild(s);}
  function build(){if(document.getElementById("ispDashboardTabs"))return;const nav=document.createElement("nav");nav.id="ispDashboardTabs";nav.className="isp-dashboard-tabs";nav.innerHTML=`<div class="isp-tabs-inner" role="tablist" aria-label="Indian Stock Pro sections">${TABS.map((t,i)=>`<button class="isp-tab${i===0?" active":""}" data-tab="${esc(t[0])}" role="tab" aria-selected="${i===0}">${esc(t[1])}</button>`).join("")}</div>`;const header=document.querySelector("header");header?.parentNode.insertBefore(nav,header.nextSibling);nav.addEventListener("click",e=>{const b=e.target.closest(".isp-tab");if(b)activate(b.dataset.tab)});window.ispActivateTab=activate;window.ispDashboardTabsReady=true;}
  function activate(id){active=TABS.some(x=>x[0]===id)?id:"indices";const selected=target(active);document.querySelectorAll(".container > section.panel").forEach(p=>{if(p.dataset.ispTabPanel==="1")p.classList.toggle("isp-active",p===selected);});document.querySelectorAll(".isp-tab").forEach(b=>{const on=b.dataset.tab===active;b.classList.toggle("active",on);b.setAttribute("aria-selected",String(on));});if(selected)selected.scrollIntoView({behavior:"smooth",block:"start"});}
  function reconcile(){discover();if(window.ispDashboardTabsReady)activate(active);}
  function start(){style();discover();build();activate("indices");const root=document.querySelector(".container")||document.body;new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(reconcile,120)}).observe(root,{childList:true,subtree:true});[500,1500,3000].forEach(ms=>setTimeout(reconcile,ms));}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
