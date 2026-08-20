/* Indian Stock Pro — TRIAL APP SHELL
 * Branch: trial-tab-ui
 * Goal: short home screen + clickable feature tabs instead of one long dashboard.
 */
(function () {
  "use strict";

  var FEATURES = [
    ["top10", "🏆", "Top 10 Share Suggestions", "integratedCards"],
    ["quant", "📈", "Quantitative Leaders", "quantCards"],
    ["institutional", "🏦", "Institutional Advice & Research", "institutionalResearchPanel"],
    ["news", "📰", "Market News & Context", "isp-news-context"],
    ["ipo", "🧾", "Upcoming IPO", "ispIPOCalendar"],
    ["dividend", "💰", "Upcoming Dividend", "ispDividendCalendar"],
    ["price", "💹", "Price-wise Opportunities", "bands"],
    ["summary", "📊", "Integrated Market Summary", "summary"],
    ["method", "🧠", "How the Engine Thinks", "isp-methodology"]
  ];
  var started = false, container = null, home = null, view = null;

  function esc(value) { return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;"); }
  function nearestPanel(el) { return el ? (el.closest("section.panel, section, .panel") || el.parentElement) : null; }
  function byId(id) { return nearestPanel(document.getElementById(id)); }
  function byText(patterns) {
    var nodes = container ? container.querySelectorAll("section.panel, section, .panel") : [];
    for (var i=0;i<nodes.length;i++) { var text=(nodes[i].textContent||"").replace(/\s+/g," "); for(var j=0;j<patterns.length;j++) if(patterns[j].test(text)) return nodes[i]; }
    return null;
  }
  function locate(key) {
    var map={
      integratedCards:["Top Integrated Opportunities","Top 10"], quantCards:["Quantitative","Quantitative Leaders"],
      institutionalResearchPanel:["Institutional","Institutional Research"], "isp-news-context":["News and Context","News & Market Context","Company News"],
      ispIPOCalendar:["Upcoming IPO","IPO Calendar"], ispDividendCalendar:["Upcoming Dividend","Dividend Calendar"],
      bands:["Price-wise","Price Wise","Opportunities by Price"], summary:["Integrated Market Summary"], "isp-methodology":["How the Integrated Engine Works","Engine Methodology"]
    };
    var p=byId(key); if(p)return p;
    var patterns=(map[key]||[]).map(function(x){return new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i");}); return byText(patterns);
  }
  function findHomeParts() {
    var all=container.querySelectorAll("section.panel, section, .panel");
    var indices=byId("isp-market-indices")||byText([/Indian Market Indices/i,/NIFTY 50.*SENSEX/i]);
    var search=byId("isp-search-analyze")||byText([/Search\s*&\s*Analyze/i]);
    var notice=byId("ispImportantNotice")||byText([/Indian Stock Pro provides quantitative research signals/i,/not investment advice/i]);
    if(!indices)for(var i=0;i<all.length;i++)if(/NIFTY 50/i.test(all[i].textContent||"")&&/SENSEX/i.test(all[i].textContent||"")){indices=all[i];break;}
    return {indices:indices,search:search,notice:notice};
  }
  function addStyles() {
    if(document.getElementById("isp-trial-shell-style"))return;
    var style=document.createElement("style");style.id="isp-trial-shell-style";style.textContent=[
      "body.isp-trial-mode{background:#f3f6fb}",".container.isp-trial-shell{padding-top:12px}",
      ".container.isp-trial-shell > section.panel,.container.isp-trial-shell > section,.container.isp-trial-shell > .panel{display:none!important}",
      ".container.isp-trial-shell #ispAppHome,.container.isp-trial-shell #ispAppView{display:block!important}",
      "#ispAppHome,#ispAppView{margin:0!important;padding:0!important;background:transparent!important;box-shadow:none!important}",
      "#ispAppHome .panel,#ispAppHome section{display:block!important}",
      ".isp-home-card{background:#fff;border-radius:16px;padding:16px;margin:0 0 14px;box-shadow:0 4px 18px rgba(0,0,0,.06)}",
      ".isp-home-title{font-size:20px;font-weight:900;color:#172033;margin-bottom:4px}.isp-home-sub{font-size:12px;color:#667085;margin-bottom:13px}",
      ".isp-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}",
      ".isp-feature-button{appearance:none;border:1px solid #dfe5ee;background:#fff;border-radius:13px;padding:14px 12px;text-align:left;min-height:82px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.03)}",
      ".isp-feature-button:hover{border-color:#9aa9bd;box-shadow:0 5px 15px rgba(0,0,0,.08)}.isp-feature-button:active{transform:scale(.985)}",
      ".isp-feature-icon{display:block;font-size:22px;margin-bottom:7px}.isp-feature-label{display:block;font-size:12px;font-weight:900;color:#172033;line-height:1.25}.isp-feature-open{display:block;margin-top:5px;font-size:10px;color:#667085;font-weight:700}",
      ".isp-app-head{position:sticky;top:0;z-index:900;background:#10182b;color:#fff;border-radius:13px;padding:10px 12px;margin:0 0 12px;box-shadow:0 5px 16px rgba(0,0,0,.18)}",
      ".isp-app-head-row{display:flex;align-items:center;gap:10px}.isp-home-button{border:0;border-radius:9px;background:#fff;color:#10182b;padding:9px 12px;font-weight:900;font-size:12px;cursor:pointer}.isp-app-title{font-size:14px;font-weight:900;line-height:1.25}",
      "#ispAppView .isp-feature-host{display:block}#ispAppView .isp-feature-host > section,#ispAppView .isp-feature-host > .panel{display:block!important;margin-bottom:0!important}",
      "#ispImportantNotice{border:2px solid #e04444!important;background:#fff7f7!important}#ispImportantNotice .disclaimer{color:#b42318!important;font-weight:800}",
      "@media(max-width:800px){.isp-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.isp-feature-button{min-height:76px;padding:12px 10px}.isp-home-card{padding:13px}.isp-app-title{font-size:13px}}",
      "@media(max-width:420px){.isp-feature-grid{grid-template-columns:1fr 1fr}.isp-feature-label{font-size:11px}}"
    ].join("\n");document.head.appendChild(style);
  }
  function ensureIds(){
    var parts=findHomeParts();if(parts.indices)parts.indices.id="isp-market-indices";if(parts.search)parts.search.id="isp-search-analyze";if(parts.notice)parts.notice.id="ispImportantNotice";
    [["integratedCards","isp-top10"],["quantCards","isp-quantitative"],["bands","isp-price-bands"],["summary","isp-summary-panel"],["institutionalResearchPanel","isp-institutional"],["ispIPOCalendar","isp-ipo"],["ispDividendCalendar","isp-dividend"]].forEach(function(x){var p=locate(x[0]);if(p)p.id=x[1];});
    var news=locate("isp-news-context"),method=locate("isp-methodology");if(news)news.id="isp-news-context";if(method)method.id="isp-methodology";
  }
  function buildShell(){
    if(!container)return false;home=document.getElementById("ispAppHome");if(!home){home=document.createElement("div");home.id="ispAppHome";container.insertBefore(home,container.firstChild);}
    view=document.getElementById("ispAppView");if(!view){view=document.createElement("div");view.id="ispAppView";view.style.display="none";container.insertBefore(view,home.nextSibling);}
    ensureIds();var parts=findHomeParts();[parts.indices,parts.search].forEach(function(el){if(el&&el.parentElement!==home)home.appendChild(el);});
    var featureCard=document.getElementById("ispFeatureCard");if(!featureCard){featureCard=document.createElement("div");featureCard.id="ispFeatureCard";featureCard.className="isp-home-card";featureCard.innerHTML='<div class="isp-home-title">Explore Indian Stock Pro</div><div class="isp-home-sub">Open one section at a time — no long scrolling dashboard.</div><div class="isp-feature-grid">'+FEATURES.map(function(f){return '<button type="button" class="isp-feature-button" data-isp-feature="'+esc(f[0])+'"><span class="isp-feature-icon">'+f[1]+'</span><span class="isp-feature-label">'+esc(f[2])+'</span><span class="isp-feature-open">Open →</span></button>';}).join("")+'</div>';home.appendChild(featureCard);featureCard.addEventListener("click",function(e){var b=e.target.closest("[data-isp-feature]");if(b)openFeature(b.getAttribute("data-isp-feature"));});}
    if(parts.notice&&parts.notice.parentElement!==home)home.appendChild(parts.notice);return true;
  }
  function getFeaturePanel(id){var f=FEATURES.find(function(x){return x[0]===id;});return f?locate(f[3]):null;}
  function openFeature(id){
    var f=FEATURES.find(function(x){return x[0]===id;}),panel=getFeaturePanel(id);if(!f||!panel)return;
    view.innerHTML="";var head=document.createElement("div");head.className="isp-app-head";head.innerHTML='<div class="isp-app-head-row"><button type="button" class="isp-home-button">🏠 HOME</button><div class="isp-app-title">'+esc(f[2])+'</div></div>';head.querySelector("button").addEventListener("click",goHome);
    var host=document.createElement("div");host.className="isp-feature-host";host.appendChild(panel);view.appendChild(head);view.appendChild(host);home.style.display="none";view.style.display="block";
    requestAnimationFrame(function(){var target=head.getBoundingClientRect().top+window.pageYOffset-8;window.scrollTo({top:Math.max(0,target),behavior:"smooth"});});
  }
  function goHome(){var activePanel=view&&view.querySelector(".isp-feature-host > section, .isp-feature-host > .panel");if(activePanel)container.appendChild(activePanel);view.innerHTML="";view.style.display="none";home.style.display="block";window.scrollTo({top:0,behavior:"smooth"});}
  function start(){if(started)return;container=document.querySelector(".container");if(!container){setTimeout(start,250);return;}started=true;addStyles();document.body.classList.add("isp-trial-mode");container.classList.add("isp-trial-shell");buildShell();goHome();document.documentElement.setAttribute("data-isp-trial-ui","active");}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
