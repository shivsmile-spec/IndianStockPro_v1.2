/* Indian Stock Pro — TRIAL compare UX
 * Opens Compare as a dedicated panel instead of the old bottom sticky bar.
 * Trial branch only; existing stock-report Compare remains supported.
 */
(function(){
  "use strict";

  function esc(v){return String(v==null?"":v).replace(/[&<>\"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]})}
  function num(v){return Number.isFinite(Number(v))?Number(v):null}
  function money(v){var n=num(v);return n===null?"—":"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}
  function score(v){var n=num(v);return n===null?"—":n.toFixed(1)+"/100"}
  function getSymbols(){try{return JSON.parse(sessionStorage.getItem("isp_compare")||"[]")}catch(e){return []}}
  function saveSymbols(a){sessionStorage.setItem("isp_compare",JSON.stringify(a.slice(0,4)))}
  function removeOldBottomBar(){var old=document.getElementById("isp-compare");if(old)old.remove()}

  function styles(){
    if(document.getElementById("isp-trial-compare-css"))return;
    var s=document.createElement("style");s.id="isp-trial-compare-css";
    s.textContent=`
      #isp-trial-compare-panel{margin-top:14px;border:1px solid #dfe5ee;border-radius:14px;background:#fff;padding:16px;box-shadow:0 4px 18px rgba(0,0,0,.05)}
      .isp-tc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      .isp-tc-title{font-size:18px;font-weight:900;color:#172033}.isp-tc-sub{font-size:11px;color:#667085;margin-top:4px}
      .isp-tc-actions{display:flex;gap:7px;flex-wrap:wrap}.isp-tc-btn{border:1px solid #ccd3df;background:#fff;color:#172033;border-radius:9px;padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer}.isp-tc-btn.primary{background:#10182b;color:#fff;border-color:#10182b}
      .isp-tc-empty{margin-top:12px;background:#f7f9fc;border-radius:10px;padding:12px;color:#667085;font-size:12px}
      .isp-tc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
      .isp-tc-card{border:1px solid #e1e6ef;border-radius:12px;padding:12px;background:#fff}.isp-tc-symbol{font-size:16px;font-weight:900}.isp-tc-name{font-size:11px;color:#667085;margin-top:3px;min-height:28px}.isp-tc-row{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #eef1f5;padding-top:7px;margin-top:7px;font-size:11px}.isp-tc-label{color:#667085}.isp-tc-value{font-weight:900;text-align:right}
      .isp-tc-remove{margin-top:10px;width:100%;border:1px solid #e1e6ef;background:#f8fafc;border-radius:8px;padding:6px;font-size:10px;font-weight:800;cursor:pointer;color:#596273}
      @media(max-width:900px){.isp-tc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.isp-tc-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s)
  }

  function ensurePanel(){
    var search=document.getElementById("search"),host=search&&search.closest("section.panel");
    if(!host)return null;
    var p=document.getElementById("isp-trial-compare-panel");
    if(!p){p=document.createElement("div");p.id="isp-trial-compare-panel";host.appendChild(p)}
    return p
  }

  function render(){
    styles();removeOldBottomBar();
    var p=ensurePanel();if(!p)return;
    var syms=getSymbols(),integrated=Array.isArray(window.integrated)?window.integrated:[],fundamentals=window.__ispTrialFundamentals||{};
    var rows=syms.map(function(sym){var s=integrated.find(function(x){return String(x.symbol||"").toUpperCase()===String(sym).toUpperCase()})||{};var f=fundamentals[String(sym).toUpperCase()]||{};return {sym:sym,s:s,f:f}});
    if(!syms.length){p.innerHTML='<div class="isp-tc-head"><div><div class="isp-tc-title">⚖ Compare Stocks</div><div class="isp-tc-sub">Select stocks from their analysis reports to compare up to 4 stocks.</div></div></div><div class="isp-tc-empty">No stocks selected yet. Open a stock analysis and press <b>⚖ Compare</b>.</div>';return}
    p.innerHTML='<div class="isp-tc-head"><div><div class="isp-tc-title">⚖ Compare Stocks</div><div class="isp-tc-sub">Side-by-side quantitative and fundamental snapshot · maximum 4 stocks.</div></div><div class="isp-tc-actions"><button type="button" class="isp-tc-btn" id="ispTcClear">Clear all</button><button type="button" class="isp-tc-btn primary" id="ispTcClose">Close</button></div></div><div class="isp-tc-grid">'+rows.map(function(x){
      var price=x.s.liveQuote&&x.s.liveQuote.price,health=x.f.health||"—",fs=x.f.score==null?"—":score(x.f.score);
      return '<article class="isp-tc-card"><div class="isp-tc-symbol">'+esc(x.sym)+'</div><div class="isp-tc-name">'+esc(x.s.company||x.s.name||"NSE stock")+'</div><div class="isp-tc-row"><span class="isp-tc-label">Price</span><span class="isp-tc-value">'+money(price)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Integrated</span><span class="isp-tc-value">'+score(x.s.integratedScore)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Quantitative</span><span class="isp-tc-value">'+score(x.s.quantitativeScore||x.s.quantitative)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Confidence</span><span class="isp-tc-value">'+score(x.s.confidence)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Fundamental</span><span class="isp-tc-value">'+esc(fs)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Health</span><span class="isp-tc-value">'+esc(health)+'</span></div><button type="button" class="isp-tc-remove" data-tc-remove="'+esc(x.sym)+'">Remove</button></article>'
    }).join("")+'</div>';
    p.querySelector("#ispTcClear").onclick=function(){saveSymbols([]);render()};
    p.querySelector("#ispTcClose").onclick=function(){p.remove()};
    p.querySelectorAll("[data-tc-remove]").forEach(function(b){b.onclick=function(){saveSymbols(getSymbols().filter(function(x){return x!==b.getAttribute("data-tc-remove")}));render()}})
  }

  function open(){render();var p=document.getElementById("isp-trial-compare-panel");if(p)p.scrollIntoView({behavior:"smooth",block:"start"})}
  function install(){
    var btn=document.getElementById("ispCompareBtn");
    if(!btn)return;
    if(btn.dataset.trialCompareBound!=="1"){
      btn.dataset.trialCompareBound="1";
      btn.addEventListener("click",function(e){e.preventDefault();e.stopImmediatePropagation();open()},true);
    }
    removeOldBottomBar();
  }

  async function loadFundamentals(){
    try{var r=await fetch("./data/fundamentals.json?v="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);var d=await r.json();window.__ispTrialFundamentals=d&&d.stocks?d.stocks:{};}catch(e){window.__ispTrialFundamentals={}}
  }

  function start(){
    if(window.__ispTrialCompareStarted)return;
    window.__ispTrialCompareStarted=true;
    styles();
    loadFundamentals().then(function(){install();render()});
    var last="";
    var observer=new MutationObserver(function(){
      install();
      var now=JSON.stringify(getSymbols());
      if(now!==last){last=now;render()}
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(function(){observer.disconnect()},120000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
