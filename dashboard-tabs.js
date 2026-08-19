/* Indian Stock Pro — TRIAL TAB SHELL
 * Trial branch: trial-tab-ui
 * Design requested:
 *   Header
 *   Market Indices
 *   Search / Health & Analyze
 *   TAB BAR
 *   ONE selected tab's content
 *   Important Notice / Disclaimer at the bottom
 *
 * The original analysis/data DOM is preserved. We only move the existing
 * section elements into a single tab-content host; moving DOM nodes does not
 * remove their event listeners or data.
 */
(function(){
  "use strict";

  const TABS=[
    ["top10","🏆 Top 10 Stocks to Invest","integratedCards"],
    ["quant","📈 Quantitative Leaders","quantCards"],
    ["institutional","🏦 Institutional Research","institutionalResearchPanel"],
    ["news","📰 News & Market Context","isp-news-context"],
    ["ipo","🧾 Upcoming IPO","ispIPOCalendar"],
    ["dividend","💰 Upcoming Dividend","ispDividendCalendar"],
    ["price","💰 Price-wise Opportunities","bands"],
    ["summary","📊 Integrated Market Summary","summary"],
    ["method","🧠 Engine Methodology","isp-methodology"]
  ];

  let active="top10";
  let shellReady=false;
  let observerTimer=null;
  let observer=null;

  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  function sectionFor(id){
    const el=document.getElementById(id);
    if(!el)return null;
    return el.closest("section.panel") || el.closest("section") || el.parentElement;
  }

  function findPanels(){
    const container=$(".container");
    if(!container)return {container,indices:null,search:null,notice:null,all:[]};

    const sections=[...container.querySelectorAll(":scope > section")];
    const indices=sectionFor("isp-market-indices") || sections.find(s=>/Indian Market Indices/i.test(s.textContent||""));
    const search=sectionFor("search") || sections.find(s=>/Search\s*&\s*Analyze/i.test(s.textContent||""));
    const notice=sections.find(s=>/Indian Stock Pro provides quantitative research signals/i.test(s.textContent||""))
      || sections[sections.length-1];

    const all=sections.filter(s=>s!==indices&&s!==search&&s!==notice);
    return {container,indices,search,notice,all};
  }

  function panelFromTarget(id){
    const p=sectionFor(id);
    if(!p)return null;
    return p;
  }

  function ensureIds(){
    const {indices,search,notice}=findPanels();
    if(indices)indices.id="isp-market-indices";
    if(search)search.id="isp-search-analyze";
    if(notice)notice.id="ispImportantNotice";

    const mappings=[
      ["integratedCards","isp-top10"],
      ["quantCards","isp-quantitative"],
      ["bands","isp-price-bands"],
      ["summary","isp-summary-panel"]
    ];
    mappings.forEach(([child,id])=>{const p=sectionFor(child);if(p)p.id=id;});

    const expert=$(".expert-panel");
    if(expert)expert.id="isp-news-context";

    const method=[...document.querySelectorAll(".container > section")]
      .find(x=>/How the Integrated Engine Works/i.test(x.textContent||""));
    if(method)method.id="isp-methodology";

    ["institutionalResearchPanel","ispIPOCalendar","ispDividendCalendar"].forEach(id=>{
      const p=sectionFor(id);
      if(p)p.id=id;
    });
  }

  function addStyles(){
    if($("#isp-trial-shell-style"))return;
    const s=document.createElement("style");
    s.id="isp-trial-shell-style";
    s.textContent=`
      /* TRIAL: the page is a shell, not a long scrolling dashboard. */
      .isp-trial-tabs{
        position:sticky;top:0;z-index:950;background:#10182b;
        box-shadow:0 5px 18px rgba(0,0,0,.20)
      }
      .isp-trial-tabs-inner{
        max-width:1150px;margin:0 auto;padding:10px 20px;
        display:flex;gap:7px;overflow-x:auto;scrollbar-width:thin
      }
      .isp-trial-tab{
        flex:0 0 auto;border:1px solid rgba(255,255,255,.16);
        background:#17233c;color:#dbe5f5;padding:10px 13px;
        border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;
        white-space:nowrap
      }
      .isp-trial-tab:hover{background:#253653}
      .isp-trial-tab.active{background:#fff;color:#10182b}

      /* Only these four shell areas are outside the tab content. */
      .container.isp-shell-mode > #isp-market-indices,
      .container.isp-shell-mode > #isp-search-analyze,
      .container.isp-shell-mode > #isp-trial-content,
      .container.isp-shell-mode > #ispImportantNotice{display:block!important}

      .container.isp-shell-mode > section:not(#isp-market-indices):not(#isp-search-analyze):not(#isp-trial-content):not(#ispImportantNotice){display:none!important}

      #isp-trial-content{display:block!important;background:transparent;box-shadow:none;padding:0;margin:0}
      #isp-trial-content > section{display:none!important}
      #isp-trial-content > section.isp-selected-content{display:block!important;animation:ispTrialFade .16s ease-out}
      @keyframes ispTrialFade{from{opacity:.15;transform:translateY(4px)}to{opacity:1;transform:none}}

      #ispImportantNotice{margin-top:18px}
      #ispImportantNotice .disclaimer,
      #ispImportantNotice{border:1px solid #f0b4b4}
      #ispImportantNotice .disclaimer{color:#b42318;background:#fff5f5;font-weight:700}

      @media(max-width:700px){
        .isp-trial-tabs-inner{padding:8px 12px}
        .isp-trial-tab{font-size:11px;padding:9px 11px}
      }
    `;
    document.head.appendChild(s);
  }

  function buildTabs(){
    if($("#ispTrialTabs"))return;
    const nav=document.createElement("nav");
    nav.id="ispTrialTabs";
    nav.className="isp-trial-tabs";
    nav.innerHTML=`<div class="isp-trial-tabs-inner" role="tablist" aria-label="Indian Stock Pro sections">${TABS.map((t,i)=>`<button class="isp-trial-tab${i===0?" active":""}" data-tab="${esc(t[0])}" role="tab" aria-selected="${i===0}">${esc(t[1])}</button>`).join("")}</div>`;
    const header=$("header");
    if(header)header.parentNode.insertBefore(nav,header.nextSibling);
    nav.addEventListener("click",e=>{
      const b=e.target.closest(".isp-trial-tab");
      if(b)activate(b.dataset.tab,true);
    });
  }

  function buildContentHost(){
    const {container}=findPanels();
    if(!container)return null;
    let host=$("#isp-trial-content");
    if(!host){
      host=document.createElement("div");
      host.id="isp-trial-content";
      container.appendChild(host);
    }

    ensureIds();

    /* Move every feature section into ONE content host. */
    const {all}=findPanels();
    all.forEach(p=>{
      if(p && p!==host && !host.contains(p))host.appendChild(p);
    });

    return host;
  }

  function keepDynamicPanelsInsideHost(){
    const host=$("#isp-trial-content");
    const container=$(".container");
    if(!host||!container)return;

    ensureIds();

    [...container.children].forEach(p=>{
      if(p===host||p.id==="isp-market-indices"||p.id==="isp-search-analyze"||p.id==="ispImportantNotice")return;
      if(p.tagName==="SECTION")host.appendChild(p);
    });
  }

  function activate(id,writeHash){
    if(!TABS.some(t=>t[0]===id))id="top10";
    active=id;
    const target=TABS.find(t=>t[0]===id);
    const host=$("#isp-trial-content");
    if(!host)return;

    ensureIds();
    keepDynamicPanelsInsideHost();

    const panel=panelFromTarget(target[2]);
    host.querySelectorAll(":scope > section").forEach(p=>p.classList.toggle("isp-selected-content",p===panel));

    document.querySelectorAll(".isp-trial-tab").forEach(b=>{
      const on=b.dataset.tab===active;
      b.classList.toggle("active",on);
      b.setAttribute("aria-selected",String(on));
    });

    if(writeHash){
      const u=new URL(location.href);
      u.hash="tab="+active;
      history.replaceState(null,"",u);
    }
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function reconcile(){
    clearTimeout(observerTimer);
    observerTimer=setTimeout(()=>{
      ensureIds();
      buildContentHost();
      activate(active,false);
    },80);
  }

  function start(){
    if(shellReady)return;
    addStyles();
    ensureIds();
    buildTabs();
    const host=buildContentHost();
    if(!host)return setTimeout(start,250);

    const initial=(location.hash.match(/^#tab=([^&]+)/)||[])[1];
    activate(initial||"top10",false);
    const container=$(".container");
    container.classList.add("isp-shell-mode");

    observer=new MutationObserver(()=>reconcile());
    observer.observe(container,{childList:true,subtree:true});

    [300,1000,2500,5000].forEach(ms=>setTimeout(reconcile,ms));
    shellReady=true;
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
