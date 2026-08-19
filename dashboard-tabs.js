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
  let active="indices",observerTimer;
  const panel=el=>el?.closest("section.panel")||el||null;
  function mark(id,el,title,desc){
    const p=panel(el);if(!p)return null;
    if(!p.id||p.id===id)p.id=id;
    p.classList.add("isp-tab-panel");p.dataset.ispTabPanel="1";
    if(title&&!p.querySelector(".isp-tab-title")){const h=document.createElement("div");h.className="isp-tab-title";h.innerHTML=`<strong>${esc(title)}</strong><span>${esc(desc||"")}</span>`;p.insertBefore(h,p.firstChild);}
    return p;
  }
  function discover(){
    mark("isp-market-indices",document.getElementById("isp-market-indices"),"Market Indices","NIFTY 50 and SENSEX published market snapshot.");
    const search=mark("isp-search-analyze",document.getElementById("search"),"Search Share · Health & Analyze","Search an NSE share and open the complete quantitative, fundamental and context report.");
    const health=document.getElementById("ispFeedHealth");if(search&&health&&!search.contains(health))search.insertBefore(health,search.firstChild);
    mark("isp-top10",document.getElementById("integratedCards"),"Top 10 Stocks to Invest","Top integrated opportunities ranked by the current model.");
    mark("isp-quantitative",document.getElementById("quantCards"),"Quantitative Leaders","Technical screening leaders before external context.");
    const newsEl=document.querySelector(".expert-panel");if(newsEl&&!newsEl.id)newsEl.id="isp-news-context";mark("isp-news-context",newsEl,"News & Market Context","External news, industry and broader market intelligence.");
    mark("isp-price-bands",document.getElementById("bands"),"Price-wise Opportunities","Integrated opportunities grouped by current published price range.");
    mark("isp-summary-panel",document.getElementById("summary"),"Integrated Market Summary","One-screen view of the current model state.");
    const method=document.querySelector(".container > section.panel:nth-of-type(7)");
    if(method&&/How the Integrated Engine Works/i.test(method.textContent||""))mark("isp-methodology",method,"Engine Methodology","How quantitative and external context are combined.");
    else{const p=[...document.querySelectorAll(".container > section.panel")].find(x=>/How the Integrated Engine Works/i.test(x.textContent||""));if(p)mark("isp-methodology",p,"Engine Methodology","How quantitative and external context are combined.");}
    ["institutionalResearchPanel","ispIPOCalendar","ispDividendCalendar","ispImportantNotice"].forEach(id=>{const p=document.getElementById(id);if(p){p.classList.add("isp-tab-panel");p.dataset.ispTabPanel="1";}});
  }
  function target(id){const t=TABS.find(x=>x[0]===id);return t?panel(document.getElementById(t[2])):null;}
  function style(){
    if(document.getElementById("isp-tabs-style"))return;
    const s=document.createElement("style");s.id="isp-tabs-style";s.textContent=`
      .isp-dashboard-tabs{position:sticky;top:0;z-index:900;background:#10182b;box-shadow:0 5px 18px rgba(0,0,0,.18)}
      .isp-tabs-inner{max-width:1150px;margin:auto;padding:10px 20px;display:flex;gap:7px;overflow-x:auto}
      .isp-tab{flex:0 0 auto;border:1px solid rgba(255,255,255,.14);background:#17233c;color:#dbe5f5;padding:10px 13px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}
      .isp-tab:hover{background:#223252}.isp-tab.active{background:#fff;color:#10182b}
      .isp-tab-panel{display:none!important}.isp-tab-panel.isp-active{display:block!important}
      .isp-tab-title{margin:0 0 12px;padding:13px 15px;border-radius:13px;background:#f5f7fa;border:1px solid #e1e6ef}.isp-tab-title strong{font-size:16px}.isp-tab-title span{display:block;margin-top:3px;font-size:12px;color:#667085}
      @media(max-width:700px){.isp-tabs-inner{padding:8px 12px}.isp-tab{font-size:11px;padding:9px 11px}}
    `;document.head.appendChild(s);
  }
  function build(){
    if(document.getElementById("ispDashboardTabs"))return;
    const nav=document.createElement("nav");nav.id="ispDashboardTabs";nav.className="isp-dashboard-tabs";
    nav.innerHTML=`<div class="isp-tabs-inner" role="tablist" aria-label="Indian Stock Pro sections">${TABS.map((t,i)=>`<button class="isp-tab${i===0?" active":""}" data-tab="${esc(t[0])}" role="tab" aria-selected="${i===0}">${esc(t[1])}</button>`).join("")}</div>`;
    const header=document.querySelector("header");header?.parentNode.insertBefore(nav,header.nextSibling);nav.addEventListener("click",e=>{const b=e.target.closest(".isp-tab");if(b)activate(b.dataset.tab)});window.ispActivateTab=activate;window.ispDashboardTabsReady=true;
  }
  function activate(id){
    active=TABS.some(x=>x[0]===id)?id:"indices";const selected=target(active);
    document.querySelectorAll(".container > section.panel").forEach(p=>{if(p.dataset.ispTabPanel==="1")p.classList.toggle("isp-active",p===selected);});
    document.querySelectorAll(".isp-tab").forEach(b=>{const on=b.dataset.tab===active;b.classList.toggle("active",on);b.setAttribute("aria-selected",String(on));});
    if(selected)selected.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function reconcile(){discover();if(window.ispDashboardTabsReady)activate(active);}
  function start(){style();discover();build();activate("indices");const root=document.querySelector(".container")||document.body;new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(reconcile,120)}).observe(root,{childList:true,subtree:true});[500,1500,3000].forEach(ms=>setTimeout(reconcile,ms));}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
