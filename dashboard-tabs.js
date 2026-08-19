/* Indian Stock Pro — MOBILE APP TRIAL SHELL
 * Branch: trial-tab-ui
 *
 * Home screen contains ONLY:
 *   1) NIFTY 50 / SENSEX indices
 *   2) Share search / Health & Analyze
 *   3) Clean clickable feature buttons
 *   4) Important Notice
 *
 * Tapping a feature opens ONLY that feature's content.
 * Every feature screen has a HOME button — never a Back button.
 * The underlying data/analysis DOM is preserved; feature sections are
 * moved into an app view so existing scripts and event handlers continue
 * to work.
 */
(function(){
  "use strict";

  const FEATURES=[
    ["top10","🏆","Top 10 Stocks to Invest","integratedCards"],
    ["quant","📈","Quantitative Leaders","quantCards"],
    ["institutional","🏦","Institutional Research","institutionalResearchPanel"],
    ["news","📰","News & Market Context","isp-news-context"],
    ["ipo","🧾","Upcoming IPO","ispIPOCalendar"],
    ["dividend","💰","Upcoming Dividend","ispDividendCalendar"],
    ["price","💹","Price-wise Opportunities","bands"],
    ["summary","📊","Integrated Market Summary","summary"],
    ["method","🧠","Engine Methodology","isp-methodology"]
  ];

  let active="home";
  let ready=false;
  let reconcileTimer=null;
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
    if(!container)return {container:null,indices:null,search:null,notice:null,all:[]};
    const sections=[...container.querySelectorAll(":scope > section")];
    const indices=sectionFor("isp-market-indices") || sections.find(s=>/Indian Market Indices/i.test(s.textContent||""));
    const search=sectionFor("search") || sections.find(s=>/Search\s*&\s*Analyze/i.test(s.textContent||""));
    const notice=sections.find(s=>/Indian Stock Pro provides quantitative research signals/i.test(s.textContent||"")) || sections[sections.length-1];
    const all=sections.filter(s=>s!==indices&&s!==search&&s!==notice);
    return {container,indices,search,notice,all};
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
    if($("#isp-mobile-app-style"))return;
    const s=document.createElement("style");
    s.id="isp-mobile-app-style";
    s.textContent=`
      /* ================= MOBILE APP TRIAL ================= */
      body.isp-app-mode{background:#f3f6fb}
      .isp-app-home-only{display:block!important}
      .isp-app-feature{display:none!important}

      #ispAppNav{display:none}
      #ispAppHome{display:none}
      #ispAppView{display:none}

      .container.isp-app-shell > #ispAppHome{display:block!important}
      .container.isp-app-shell > #ispAppView{display:block!important}
      .container.isp-app-shell > #isp-market-indices,
      .container.isp-app-shell > #isp-search-analyze,
      .container.isp-app-shell > #ispImportantNotice{display:none!important}
      .container.isp-app-shell > section:not(#ispAppHome):not(#ispAppView):not(#isp-market-indices):not(#isp-search-analyze):not(#ispImportantNotice){display:none!important}

      #ispAppHome{padding:0;margin:0;background:transparent;box-shadow:none}
      .isp-home-block{margin-bottom:14px}
      .isp-home-card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 3px 14px rgba(0,0,0,.055)}
      .isp-home-title{font-size:20px;font-weight:900;margin:0 0 5px;color:#172033}
      .isp-home-sub{font-size:12px;color:#667085;line-height:1.45;margin-bottom:13px}

      .isp-feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .isp-feature-button{border:1px solid #dfe5ee;background:#fff;border-radius:14px;padding:14px 12px;text-align:left;cursor:pointer;min-height:78px;box-shadow:0 2px 8px rgba(0,0,0,.035);transition:.15s}
      .isp-feature-button:active{transform:scale(.98)}
      .isp-feature-button:hover{border-color:#9bb8ff;box-shadow:0 5px 16px rgba(0,0,0,.08)}
      .isp-feature-icon{font-size:22px;display:block;margin-bottom:7px}
      .isp-feature-label{font-size:13px;font-weight:900;color:#172033;line-height:1.25}
      .isp-feature-open{font-size:10px;color:#667085;margin-top:5px}

      .isp-home-search{background:#fff;border-radius:16px;padding:16px;box-shadow:0 3px 14px rgba(0,0,0,.055)}
      .isp-home-search .search{display:flex}
      .isp-home-search .search input{min-width:0}
      .isp-home-search .search button{min-height:48px}

      .isp-app-view-shell{background:transparent}
      .isp-app-view-head{position:sticky;top:0;z-index:900;background:#10182b;color:#fff;border-radius:14px;padding:10px 12px;margin-bottom:12px;box-shadow:0 5px 16px rgba(0,0,0,.18)}
      .isp-app-view-head-row{display:flex;align-items:center;gap:10px}
      .isp-home-button{border:0;background:#fff;color:#10182b;border-radius:9px;padding:10px 13px;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap}
      .isp-app-view-title{font-size:15px;font-weight:900;line-height:1.25}
      .isp-app-view-content > section{display:block!important}
      .isp-app-view-content > section.panel{margin-bottom:0}

      #ispImportantNotice{margin-top:14px}
      #ispImportantNotice .disclaimer{color:#b42318!important;background:#fff1f1!important;border:2px solid #e04444!important;font-weight:800}
      #ispImportantNotice{border:2px solid #e04444!important;background:#fff7f7!important}

      /* Hide desktop trial navigation completely. */
      .isp-trial-tabs{display:none!important}

      @media(max-width:700px){
        header{padding:18px 14px!important}
        .header-title{font-size:23px!important}
        .header-sub{font-size:12px}
        .container{padding:10px!important}
        .isp-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .isp-feature-button{padding:12px 10px;min-height:72px}
        .isp-feature-label{font-size:12px}
        .isp-home-card,.isp-home-search{padding:13px}
        .isp-app-view-head{border-radius:12px}
      }
      @media(min-width:701px){
        .isp-feature-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      }
    `;
    document.head.appendChild(s);
  }

  function createHomeShell(){
    const {container,indices,search,notice}=findPanels();
    if(!container)return null;

    let home=$("#ispAppHome");
    if(!home){
      home=document.createElement("div");
      home.id="ispAppHome";
      container.insertBefore(home,container.firstElementChild);
    }

    let view=$("#ispAppView");
    if(!view){
      view=document.createElement("div");
      view.id="ispAppView";
      container.insertBefore(view,home.nextSibling);
    }

    /* Home owns visual copies of indices/search; the original sections remain
       hidden in the shell so their existing scripts can keep updating them. */
    if(indices && !home.contains(indices)) home.appendChild(indices);
    if(search && !home.contains(search)) home.appendChild(search);

    if(!home.querySelector(".isp-home-features")){
      const features=document.createElement("div");
      features.className="isp-home-block isp-home-card isp-home-features";
      features.innerHTML=`
        <div class="isp-home-title">Explore Indian Stock Pro</div>
        <div class="isp-home-sub">Tap any section to open only that data. Use HOME anytime to return here.</div>
        <div class="isp-feature-grid">
          ${FEATURES.map(f=>`<button class="isp-feature-button" data-feature="${esc(f[0])}"><span class="isp-feature-icon">${f[1]}</span><span class="isp-feature-label">${esc(f[2])}</span><span class="isp-feature-open">Open section →</span></button>`).join("")}
        </div>`;
      home.appendChild(features);
      features.addEventListener("click",e=>{
        const b=e.target.closest(".isp-feature-button");
        if(b)openFeature(b.dataset.feature);
      });
    }

    if(notice && !home.contains(notice))home.appendChild(notice);

    return {home,view};
  }

  function moveFeatureIntoView(feature){
    const view=$("#ispAppView");
    if(!view)return null;
    const target=FEATURES.find(f=>f[0]===feature);
    if(!target)return null;
    const panel=sectionFor(target[3]);
    if(!panel)return null;

    let content=view.querySelector(".isp-app-view-content");
    if(!content){
      content=document.createElement("div");
      content.className="isp-app-view-content";
      view.appendChild(content);
    }

    content.innerHTML="";
    content.appendChild(panel);
    return {panel,target};
  }

  function openFeature(feature){
    const result=moveFeatureIntoView(feature);
    if(!result)return;
    active=feature;

    const view=$("#ispAppView");
    view.style.display="block";
    view.innerHTML=`
      <div class="isp-app-view-shell">
        <div class="isp-app-view-head">
          <div class="isp-app-view-head-row">
            <button class="isp-home-button" id="ispHomeButton" type="button">🏠 HOME</button>
            <div class="isp-app-view-title">${esc(result.target[2])}</div>
          </div>
        </div>
        <div class="isp-app-view-content"></div>
      </div>`;

    const content=view.querySelector(".isp-app-view-content");
    const panel=result.panel;
    content.appendChild(panel);
    view.querySelector("#ispHomeButton").addEventListener("click",goHome);

    const home=$("#ispAppHome");
    home.style.display="none";
    document.body.classList.add("isp-feature-open");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function goHome(){
    const {home}=createHomeShell();
    const view=$("#ispAppView");
    if(view)view.style.display="none";
    if(home)home.style.display="block";
    active="home";
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function shellOnly(){
    const {container}=findPanels();
    if(!container)return;
    container.classList.add("isp-app-shell");
    document.body.classList.add("isp-app-mode");
  }

  function reconcile(){
    clearTimeout(reconcileTimer);
    reconcileTimer=setTimeout(()=>{
      if(!ready)return;
      ensureIds();
      createHomeShell();
      shellOnly();
      if(active!=="home")openFeature(active);
    },120);
  }

  function start(){
    if(ready)return;
    addStyles();
    ensureIds();
    const built=createHomeShell();
    if(!built)return setTimeout(start,250);
    shellOnly();
    goHome();

    const container=$(".container");
    observer=new MutationObserver(()=>reconcile());
    observer.observe(container,{childList:true,subtree:true});
    [500,1500,3000,6000].forEach(ms=>setTimeout(reconcile,ms));
    ready=true;
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
