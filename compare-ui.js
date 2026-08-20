/* Indian Stock Pro — TRIAL compare UX
 * Trial branch only.
 * Compare selectors now use the same NSE-wide directory as Search & Analyze.
 */
(function(){
  "use strict";

  function esc(v){return String(v==null?"":v).replace(/[&<>\"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]})}
  function num(v){return Number.isFinite(Number(v))?Number(v):null}
  function money(v){var n=num(v);return n===null?"—":"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}
  function score(v){var n=num(v);return n===null?"—":n.toFixed(1)+"/100"}
  function getSymbols(){try{return JSON.parse(sessionStorage.getItem("isp_compare")||"[]")}catch(e){return []}}
  function saveSymbols(a){sessionStorage.setItem("isp_compare",JSON.stringify(a.filter(Boolean).slice(0,4)))}
  function removeOldBottomBar(){var old=document.getElementById("isp-compare");if(old)old.remove()}

  var nseUniverse=[];
  var nseReady=false;

  function norm(v){return String(v||"").trim().toUpperCase()}

  async function loadNseUniverse(){
    try{
      var r=await fetch("./data/nse_universe.json?v="+Date.now(),{cache:"no-store"});
      if(!r.ok)throw Error("HTTP "+r.status);
      var body=await r.json();
      nseUniverse=Array.isArray(body)?body:(Array.isArray(body.stocks)?body.stocks:[]);
      nseReady=true;
      window.__ispTrialNseUniverse=nseUniverse;
    }catch(e){
      console.warn("Trial compare: NSE-wide directory unavailable:",e);
      nseUniverse=[];
      nseReady=false;
    }
  }

  function allStocks(){
    var out=[],seen={};
    /* First use the exact NSE-wide directory used by nse-search.js. */
    nseUniverse.forEach(function(s){
      var sym=norm(s.symbol);
      if(sym&&!seen[sym]){
        seen[sym]=1;
        out.push({symbol:sym,name:s.companyName||s.company||s.name||sym,series:s.series||"EQ",isin:s.isin||"",source:s});
      }
    });
    /* Keep the existing trial data as a fallback/addition. */
    var integrated=Array.isArray(window.integrated)?window.integrated:[];
    integrated.forEach(function(s){
      var sym=norm(s.symbol);
      if(sym&&!seen[sym]){
        seen[sym]=1;
        out.push({symbol:sym,name:s.company||s.companyName||s.name||sym,source:s});
      }
    });
    var fundamentals=window.__ispTrialFundamentals||{};
    Object.keys(fundamentals).forEach(function(sym){
      var u=norm(sym);
      if(!seen[u]){
        seen[u]=1;
        var f=fundamentals[sym]||{};
        out.push({symbol:u,name:f.companyName||u,source:null});
      }
    });
    return out.sort(function(a,b){return a.symbol.localeCompare(b.symbol)})
  }

  function styles(){
    if(document.getElementById("isp-trial-compare-css"))return;
    var s=document.createElement("style");s.id="isp-trial-compare-css";
    s.textContent=`
      #isp-trial-compare-panel{margin-top:14px;border:1px solid #dfe5ee;border-radius:14px;background:#fff;padding:16px;box-shadow:0 4px 18px rgba(0,0,0,.05)}
      .isp-tc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
      .isp-tc-title{font-size:18px;font-weight:900;color:#172033}.isp-tc-sub{font-size:11px;color:#667085;margin-top:4px}
      .isp-tc-actions{display:flex;gap:7px;flex-wrap:wrap}.isp-tc-btn{border:1px solid #ccd3df;background:#fff;color:#172033;border-radius:9px;padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer}.isp-tc-btn.primary{background:#10182b;color:#fff;border-color:#10182b}
      .isp-tc-selectors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
      .isp-tc-selector{border:1px solid #e1e6ef;border-radius:11px;padding:11px;background:#f8fafc}.isp-tc-selector label{display:block;font-size:11px;font-weight:800;color:#667085;margin-bottom:6px}
      .isp-tc-search{position:relative}.isp-tc-search input{width:100%;padding:9px 11px;border:1px solid #ccd3df;border-radius:8px;background:#fff;color:#172033;font-weight:600;outline:none;font-size:13px}.isp-tc-search input:focus{border-color:#526581;box-shadow:0 0 0 2px rgba(82,101,129,.08)}
      .isp-tc-results-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:50;max-height:220px;overflow:auto;background:#fff;border:1px solid #ccd3df;border-radius:9px;box-shadow:0 8px 22px rgba(16,24,43,.14);display:none}
      .isp-tc-results-list.open{display:block}.isp-tc-option{padding:9px 11px;cursor:pointer;border-bottom:1px solid #eef1f5;font-size:12px}.isp-tc-option:last-child{border-bottom:0}.isp-tc-option:hover,.isp-tc-option.active{background:#f5f7fa}.isp-tc-option b{font-weight:900}.isp-tc-option span{color:#667085;margin-left:5px}.isp-tc-no-results{padding:10px 11px;color:#667085;font-size:12px}
      .isp-tc-empty{margin-top:12px;background:#f7f9fc;border-radius:10px;padding:12px;color:#667085;font-size:12px}
      .isp-tc-hint{margin-top:10px;font-size:11px;color:#667085}.isp-tc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}
      .isp-tc-card{border:1px solid #e1e6ef;border-radius:12px;padding:12px;background:#fff}.isp-tc-symbol{font-size:16px;font-weight:900}.isp-tc-name{font-size:11px;color:#667085;margin-top:3px;min-height:28px}.isp-tc-row{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #eef1f5;padding-top:7px;margin-top:7px;font-size:11px}.isp-tc-label{color:#667085}.isp-tc-value{font-weight:900;text-align:right}
      .isp-tc-remove{margin-top:10px;width:100%;border:1px solid #e1e6ef;background:#f8fafc;border-radius:8px;padding:6px;font-size:10px;font-weight:800;cursor:pointer;color:#596273}
      @media(max-width:900px){.isp-tc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.isp-tc-selectors,.isp-tc-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s)
  }

  function ensurePanel(){
    var search=document.getElementById("search"),host=search&&search.closest("section.panel");
    if(!host)return null;
    var p=document.getElementById("isp-trial-compare-panel");
    if(!p){p=document.createElement("div");p.id="isp-trial-compare-panel";host.appendChild(p)}
    return p
  }

  function renderCards(p,syms){
    var integrated=Array.isArray(window.integrated)?window.integrated:[];
    var fundamentals=window.__ispTrialFundamentals||{};
    var rows=syms.map(function(sym){
      var s=integrated.find(function(x){return norm(x.symbol)===norm(sym)})||{};
      var f=fundamentals[norm(sym)]||{};
      return {sym:sym,s:s,f:f}
    });
    if(!syms.length)return '<div class="isp-tc-empty">No stocks selected yet. Search and select 2–4 stocks above, then press <b>Compare selected</b>.</div>';
    return '<div class="isp-tc-grid">'+rows.map(function(x){
      var price=x.s.liveQuote&&x.s.liveQuote.price;
      var fs=x.f.score==null?"—":score(x.f.score);
      var health=x.f.health||"—";
      var quant=x.s.quantitativeScore==null?x.s.quantitative:x.s.quantitativeScore;
      var fallbackName=(nseUniverse.find(function(n){return norm(n.symbol)===norm(x.sym)})||{}).companyName;
      return '<article class="isp-tc-card"><div class="isp-tc-symbol">'+esc(x.sym)+'</div><div class="isp-tc-name">'+esc(x.s.company||x.s.companyName||x.s.name||fallbackName||x.f.companyName||"NSE stock")+'</div><div class="isp-tc-row"><span class="isp-tc-label">Price</span><span class="isp-tc-value">'+money(price)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Integrated</span><span class="isp-tc-value">'+score(x.s.integratedScore)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Quantitative</span><span class="isp-tc-value">'+score(quant)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Confidence</span><span class="isp-tc-value">'+score(x.s.confidence)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Fundamental</span><span class="isp-tc-value">'+esc(fs)+'</span></div><div class="isp-tc-row"><span class="isp-tc-label">Health</span><span class="isp-tc-value">'+esc(health)+'</span></div><button type="button" class="isp-tc-remove" data-tc-remove="'+esc(x.sym)+'">Remove</button></article>'
    }).join("")+'</div>';
  }

  function selectorBox(i,stocks,selected){
    var chosen=selected[i]||"";
    var current=stocks.find(function(x){return x.symbol===chosen});
    return '<div class="isp-tc-selector"><label>Stock '+(i+1)+(i<2?' *':' optional')+'</label><div class="isp-tc-search"><input type="text" autocomplete="off" data-tc-input="'+i+'" placeholder="Search symbol or company name" value="'+esc(current?current.symbol:"")+'"><div class="isp-tc-results-list" data-tc-list="'+i+'"></div></div></div>';
  }

  function renderSelector(p){
    var stocks=allStocks(),selected=getSymbols();
    p.innerHTML='<div class="isp-tc-head"><div><div class="isp-tc-title">⚖ Compare Stocks</div><div class="isp-tc-sub">Search and select 2–4 NSE stocks for a side-by-side comparison.</div></div><div class="isp-tc-actions"><button type="button" class="isp-tc-btn" id="ispTcClear">Clear</button><button type="button" class="isp-tc-btn" id="ispTcClose">Close</button></div></div>'+
      '<div class="isp-tc-selectors">'+[0,1,2,3].map(function(i){return selectorBox(i,stocks,selected)}).join('')+'</div>'+
      '<div class="isp-tc-actions" style="margin-top:12px"><button type="button" class="isp-tc-btn primary" id="ispTcCompare">Compare selected</button></div>'+
      '<div id="isp-tc-results">'+renderCards(p,selected)+'</div>'+
      '<div class="isp-tc-hint">Type a symbol or company name. Matching NSE directory choices appear below the box, just like Search & Analyze.</div>';

    function choose(i,stock){
      var vals=getSymbols();vals[i]=stock.symbol;
      var clean=[];vals.forEach(function(v){if(v&&clean.indexOf(v)<0)clean.push(v)});
      saveSymbols(clean);renderSelector(p);
      var next=p.querySelector('[data-tc-input="'+Math.min(i+1,3)+'"]');if(next&&i<3)next.focus();
    }

    function closeLists(except){p.querySelectorAll('.isp-tc-results-list').forEach(function(list){if(list!==except)list.classList.remove('open')})}

    function updateList(i,query){
      var list=p.querySelector('[data-tc-list="'+i+'"]');if(!list)return;
      var q=norm(query),selectedNow=getSymbols();
      var matches=stocks.filter(function(x){
        if(selectedNow.indexOf(x.symbol)>=0&&selectedNow[i]!==x.symbol)return false;
        if(!q)return true;
        return norm(x.symbol).indexOf(q)>=0||norm(x.name).indexOf(q)>=0;
      }).slice(0,20);
      if(!matches.length)list.innerHTML='<div class="isp-tc-no-results">No NSE stock found. Try another company name or symbol.</div>';
      else list.innerHTML=matches.map(function(x){return '<div class="isp-tc-option" data-tc-option="'+esc(x.symbol)+'"><b>'+esc(x.symbol)+'</b><span>'+esc(x.name)+' · '+esc(x.series||"EQ")+'</span></div>'}).join('');
      list.classList.add('open');
      list.querySelectorAll('[data-tc-option]').forEach(function(opt){opt.onclick=function(){var stock=stocks.find(function(x){return x.symbol===opt.getAttribute('data-tc-option')});if(stock)choose(i,stock)}});
    }

    p.querySelectorAll('[data-tc-input]').forEach(function(input){
      var i=Number(input.getAttribute('data-tc-input'));
      input.addEventListener('focus',function(){closeLists(p.querySelector('[data-tc-list="'+i+'"]'));updateList(i,input.value)});
      input.addEventListener('input',function(){updateList(i,input.value)});
      input.addEventListener('keydown',function(e){
        if(e.key==='Escape'){closeLists();return}
        if(e.key==='Enter'){
          var first=p.querySelector('[data-tc-list="'+i+'"] [data-tc-option]');
          if(first){e.preventDefault();first.click()}
        }
      });
    });
    p.addEventListener('click',function(e){if(!e.target.closest('.isp-tc-search'))closeLists()});

    p.querySelector('#ispTcCompare').onclick=function(){
      var vals=getSymbols();
      if(vals.length<2){p.querySelector('#isp-tc-results').innerHTML='<div class="isp-tc-empty">Please select at least <b>2 stocks</b> to compare.</div>';return}
      renderSelector(p);p.querySelector('#isp-tc-results').scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    p.querySelector('#ispTcClear').onclick=function(){saveSymbols([]);renderSelector(p)};
    p.querySelector('#ispTcClose').onclick=function(){p.remove()};
    p.querySelectorAll('[data-tc-remove]').forEach(function(b){b.onclick=function(){saveSymbols(getSymbols().filter(function(x){return x!==b.getAttribute('data-tc-remove')}));renderSelector(p)}})
  }

  function open(){styles();removeOldBottomBar();var p=ensurePanel();if(!p)return;renderSelector(p);p.scrollIntoView({behavior:'smooth',block:'start'})}

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
    Promise.all([loadNseUniverse(),loadFundamentals()]).then(function(){install()});
    var observer=new MutationObserver(function(){install()});
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(function(){observer.disconnect()},120000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();