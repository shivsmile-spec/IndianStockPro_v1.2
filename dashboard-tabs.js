/* Indian Stock Pro — MOBILE APP TRIAL SHELL
 * Trial branch: trial-tab-ui
 * Home = indices + search + feature buttons + notice.
 * Feature = one feature only + HOME button.
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
  let active="home", ready=false, timer=null, muting=false;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  function sectionFor(id){
    const el=document.getElementById(id);
    return el ? (el.closest("section.panel")||el.closest("section")||el.parentElement) : null;
  }
  function findContainer(){return $(".container");}
  function findSections(){
    const c=findContainer();
    return c?[...c.querySelectorAll(":scope > section")]:[];
  }
  function ensureIds(){
    const c=findContainer(); if(!c)return;
    const ss=findSections();
    let indices=sectionFor("isp-market-indices")||ss.find(s=>/Indian Market Indices/i.test(s.textContent||""));
    let search=sectionFor("search")||ss.find(s=>/Search\s*&\s*Analyze/i.test(s.textContent||""));
    let notice=ss.find(s=>/Indian Stock Pro provides quantitative research signals/i.test(s.textContent||""))||ss[ss.length-1];
    if(indices)indices.id="isp-market-indices";
    if(search)search.id="isp-search-analyze";
    if(notice)notice.id="ispImportantNotice";
    [["integratedCards","isp-top10"],["quantCards","isp-quantitative"],["bands","isp-price-bands"],["summary","isp-summary-panel"]].forEach(([child,id])=>{const p=sectionFor(child);if(p)p.id=id;});
    const expert=$(".expert-panel");if(expert)expert.id="isp-news-context";
    const method=findSections().find(x=>/How the Integrated Engine Works/i.test(x.textContent||""));if(method)method.id="isp-methodology";
    ["institutionalResearchPanel","ispIPOCalendar","ispDividendCalendar"].forEach(id=>{const p=sectionFor(id);if(p)p.id=id;});
  }
  function styles(){
    if($("#isp-mobile-app-style"))return;
    const s=document.createElement("style");s.id="isp-mobile-app-style";s.textContent=`
      body.isp-app-mode{background:#f3f6fb}
      .container.isp-app-shell > #ispAppHome,.container.isp-app-shell > #ispAppView{display:block!important}
      .container.isp-app-shell > section{display:none!important}
      .container.isp-app-shell > #ispAppHome,.container.isp-app-shell > #ispAppView{display:block!important}
      #ispAppHome{background:transparent!important;box-shadow:none!important;padding:0!important;margin:0!important}
      #ispAppView{background:transparent!important;box-shadow:none!important;padding:0!important;margin:0!important}
      .isp-home-card{background:#fff;border-radius:16px;padding:15px;margin-bottom:12px;box-shadow:0 3px 14px rgba(0,0,0,.06)}
      .isp-home-title{font-size:19px;font-weight:900;margin-bottom:5px}.isp-home-sub{font-size:12px;color:#667085;margin-bottom:12px}
      .isp-feature-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
      .isp-feature-button{border:1px solid #dfe5ee;background:#fff;border-radius:13px;padding:13px 11px;text-align:left;min-height:74px;cursor:pointer}
      .isp-feature-button:active{transform:scale(.98)}.isp-feature-icon{font-size:21px;display:block;margin-bottom:6px}.isp-feature-label{font-size:12px;font-weight:900;color:#172033}.isp-feature-open{display:block;font-size:10px;color:#667085;margin-top:4px}
      .isp-app-head{background:#10182b;color:#fff;border-radius:13px;padding:9px 10px;margin-bottom:12px;position:sticky;top:0;z-index:900;box-shadow:0 5px 16px rgba(0,0,0,.18)}
      .isp-app-head-row{display:flex;align-items:center;gap:9px}.isp-home-button{border:0;border-radius:9px;background:#fff;color:#10182b;padding:9px 12px;font-weight:900;font-size:12px}.isp-app-title{font-size:14px;font-weight:900}
      .isp-feature-host > section{display:block!important;margin-bottom:0!important}
      #ispImportantNotice{border:2px solid #e04444!important;background:#fff7f7!important}#ispImportantNotice .disclaimer{color:#b42318!important;background:#fff1f1!important;font-weight:800}
      .isp-trial-tabs{display:none!important}
      @media(max-width:700px){header{padding:18px 14px!important}.container{padding:10px!important}.header-title{font-size:23px!important}.isp-feature-grid{gap:8px}.isp-feature-button{min-height:70px;padding:11px 9px}.isp-home-card{padding:13px}}
    `;document.head.appendChild(s);
  }
  function shell(){
    const c=findContainer();if(!c)return null;
    let home=$("#ispAppHome");if(!home){home=document.createElement("div");home.id="ispAppHome";c.insertBefore(home,c.firstChild)}
    let view=$("#ispAppView");if(!view){view=document.createElement("div");view.id="ispAppView";c.insertBefore(view,home.nextSibling)}
    ensureIds();
    const indices=document.getElementById("isp-market-indices"),search=document.getElementById("isp-search-analyze"),notice=document.getElementById("ispImportantNotice");
    if(indices && indices.parentElement!==home)home.appendChild(indices);
    if(search && search.parentElement!==home)home.appendChild(search);
    if(notice && notice.parentElement!==home)home.appendChild(notice);
    if(!home.querySelector(".isp-feature-grid")){
      const card=document.createElement("div");card.className="isp-home-card";card.innerHTML=`<div class="isp-home-title">Explore Indian Stock Pro</div><div class="isp-home-sub">Tap a section to open only that information.</div><div class="isp-feature-grid">${FEATURES.map(f=>`<button type="button" class="isp-feature-button" data-feature="${f[0]}"><span class="isp-feature-icon">${f[1]}</span><span class="isp-feature-label">${esc(f[2])}</span><span class="isp-feature-open">Open →</span></button>`).join("")}</div>`;home.appendChild(card);
      card.addEventListener("click",e=>{const b=e.target.closest("[data-feature]");if(b)openFeature(b.dataset.feature)});
    }
    return {c,home,view};
  }
  function featurePanel(id){
    const f=FEATURES.find(x=>x[0]===id);return f?sectionFor(f[3]):null;
  }
  function openFeature(id){
    const f=FEATURES.find(x=>x[0]===id),p=featurePanel(id),view=$("#ispAppView"),home=$("#ispAppHome");
    if(!f||!p||!view||!home)return;
    active=id;
    muting=true;
    view.innerHTML="";
    const head=document.createElement("div");head.className="isp-app-head";head.innerHTML=`<div class="isp-app-head-row"><button type="button" class="isp-home-button">🏠 HOME</button><div class="isp-app-title">${esc(f[2])}</div></div>`;
    const host=document.createElement("div");host.className="isp-feature-host";host.appendChild(p);view.appendChild(head);view.appendChild(host);
    head.querySelector("button").onclick=goHome;
    home.style.display="none";view.style.display="block";muting=false;
    window.scrollTo(0,0);
  }
  function goHome(){
    const {home,view}=shell();if(!home||!view)return;
    active="home";muting=true;
    view.style.display="none";home.style.display="block";
    /* Return the active feature section to the hidden pool so the next click can find it. */
    const p=view.querySelector(".isp-feature-host > section");
    if(p){findContainer().appendChild(p);}
    muting=false;window.scrollTo(0,0);
  }
  function hidePool(){
    const c=findContainer();if(!c)return;
    c.classList.add("isp-app-shell");document.body.classList.add("isp-app-mode");
  }
  function reconcile(){
    if(!ready||muting)return;clearTimeout(timer);timer=setTimeout(()=>{ensureIds();shell();hidePool();},150);
  }
  function start(){
    if(ready)return;styles();ensureIds();const x=shell();if(!x)return setTimeout(start,300);hidePool();goHome();ready=true;
    const c=findContainer();new MutationObserver(()=>reconcile()).observe(c,{childList:true,subtree:true});
    [700,1800,3500].forEach(ms=>setTimeout(reconcile,ms));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
