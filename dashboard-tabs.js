/* Indian Stock Pro — unified one-click dashboard navigation */
(function(){
  "use strict";
  const TABS=[
    {id:"indices",label:"📊 Market Indices",target:"isp-market-indices"},
    {id:"search",label:"🔎 Search Share · Health & Analyze",target:"isp-search-analyze"},
    {id:"top10",label:"🏆 Top 10 Stocks to Invest",target:"isp-top10"},
    {id:"institutional",label:"🏦 Institutional Research",target:"institutionalResearchPanel"},
    {id:"news",label:"📰 News & Market Context",target:"isp-news-context"},
    {id:"ipo",label:"🧾 Upcoming IPO",target:"ispIPOCalendar"},
    {id:"dividend",label:"💰 Upcoming Dividend",target:"ispDividendCalendar"},
    {id:"summary",label:"📈 Integrated Market Summary",target:"summary"},
    {id:"notice",label:"⚠️ Important Notice",target:"ispImportantNotice"}
  ];

  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  function injectStyle(){
    if(document.getElementById("isp-tabs-style"))return;
    const s=document.createElement("style");s.id="isp-tabs-style";
    s.textContent=`
      .isp-dashboard-tabs{position:sticky;top:0;z-index:900;background:#10182b;border-top:1px solid rgba(255,255,255,.08);box-shadow:0 5px 18px rgba(0,0,0,.18)}
      .isp-tabs-inner{max-width:1150px;margin:auto;padding:10px 20px;display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin}
      .isp-tab{flex:0 0 auto;border:1px solid rgba(255,255,255,.14);background:#17233c;color:#dbe5f5;padding:10px 13px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}
      .isp-tab:hover{background:#223252}.isp-tab.active{background:#fff;color:#10182b;border-color:#fff}
      .isp-tab-panel{display:none!important}.isp-tab-panel.isp-active{display:block!important}
      .isp-quick-head{margin:0 0 12px;padding:14px 16px;border-radius:14px;background:#f5f7fa;border:1px solid #e1e6ef}
      .isp-quick-head strong{font-size:16px}.isp-quick-head span{display:block;margin-top:3px;font-size:12px;color:#667085}
      @media(max-width:700px){.isp-tabs-inner{padding:8px 12px}.isp-tab{font-size:11px;padding:9px 11px}}
    `;document.head.appendChild(s);
  }

  function findSearchPanel(){const input=document.getElementById("search");return input?.closest("section.panel")||input?.parentElement?.closest("section")||null;}
  function findTop10(){const el=document.getElementById("integratedCards");return el?.closest("section.panel")||null;}
  function findNews(){const el=document.querySelector(".expert-panel");if(el&&!el.id)el.id="isp-news-context";return el?.closest("section.panel")||el||null;}
  function makePanel(id,source,title,subtitle){
    if(!source)return null;
    if(!source.id||source.id===id)source.id=id;
    source.classList.add("isp-tab-panel");source.dataset.ispTabPanel="1";
    if(title&&!source.querySelector(".isp-quick-head")){const h=document.createElement("div");h.className="isp-quick-head";h.innerHTML=`<strong>${esc(title)}</strong><span>${esc(subtitle||"")}</span>`;source.insertBefore(h,source.firstChild);}
    return source;
  }
  function addMissingPanels(){
    makePanel("isp-market-indices",document.getElementById("isp-market-indices")?.closest("section.panel")||document.getElementById("isp-market-indices"),"Market Indices","NIFTY, SENSEX and published market index data.");
    const search=makePanel("isp-search-analyze",findSearchPanel(),"Search Share · Health & Analyze","Search an NSE share and open its complete quantitative, fundamental and market-context report. Data & Feed Health is included here.");
    const health=document.getElementById("ispFeedHealth");if(search&&health&&!search.contains(health))search.insertBefore(health,search.firstChild);
    const top=findTop10();if(top)makePanel("isp-top10",top,"Top 10 Stocks to Invest","Top integrated opportunities ranked by the current Indian Stock Pro model. Research tool only — not personal investment advice.");
    const news=findNews();if(news)makePanel("isp-news-context",news,"News & Market Context","Latest external news, industry context and market intelligence used alongside the quantitative model.");
  }
  function targetElement(t){const el=document.getElementById(t.target);return el?.closest("section.panel")||el||null;}
  function createShell(){
    if(document.getElementById("ispDashboardTabs"))return;
    const nav=document.createElement("nav");nav.id="ispDashboardTabs";nav.className="isp-dashboard-tabs";
    nav.innerHTML=`<div class="isp-tabs-inner" role="tablist" aria-label="Indian Stock Pro sections">${TABS.map((t,i)=>`<button class="isp-tab${i===0?" active":""}" data-tab="${esc(t.id)}" role="tab" aria-selected="${i===0}">${esc(t.label)}</button>`).join("")}</div>`;
    const header=document.querySelector("header");header?.parentNode.insertBefore(nav,header.nextSibling);
    const activate=id=>{
      const selected=TABS.find(t=>t.id===id)||TABS[0];const selectedPanel=targetElement(selected);
      document.querySelectorAll(".container > section.panel").forEach(p=>{
        const isTabPanel=p.dataset.ispTabPanel==="1"||p.id==="ispImportantNotice"||p.id==="institutionalResearchPanel"||p.id==="ispIPOCalendar"||p.id==="ispDividendCalendar"||p.id==="isp-news-context";
        if(isTabPanel){p.classList.add("isp-tab-panel");p.classList.toggle("isp-active",p===selectedPanel);}
      });
      TABS.forEach(t=>{const b=nav.querySelector(`[data-tab="${t.id}"]`);if(b){b.classList.toggle("active",t.id===selected.id);b.setAttribute("aria-selected",String(t.id===selected.id));}});
      if(selectedPanel)selectedPanel.scrollIntoView({behavior:"smooth",block:"start"});
    };
    nav.addEventListener("click",e=>{const b=e.target.closest(".isp-tab");if(b)activate(b.dataset.tab);});window.ispActivateTab=activate;window.ispDashboardTabsReady=true;activate("indices");
  }
  function ensureReconcile(){
    addMissingPanels();["institutionalResearchPanel","ispIPOCalendar","ispDividendCalendar","ispImportantNotice","isp-news-context"].forEach(id=>{const e=document.getElementById(id);if(e)e.classList.add("isp-tab-panel");});
  }
  function start(){
    injectStyle();addMissingPanels();createShell();ensureReconcile();
    let timer=null;const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(ensureReconcile,100);});observer.observe(document.querySelector(".container")||document.body,{childList:true,subtree:true});
    setTimeout(ensureReconcile,500);setTimeout(ensureReconcile,1500);setTimeout(ensureReconcile,3000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
