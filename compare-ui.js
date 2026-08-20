/* Indian Stock Pro — TRIAL compare UX
 * Trial branch only. Main branch is intentionally untouched.
 * Uses the NSE-wide directory for search, then loads the published
 * search-analysis + live-quote + fundamentals datasets for selected stocks.
 */
(function(){
  "use strict";
  var universe=[], researchBy={}, quotes={}, fundamentalsBy={};
  var loaded=false, loading=null;

  function norm(v){return String(v||"").trim().toUpperCase()}
  function esc(v){return String(v==null?"":v).replace(/[&<>\"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]})}
  function n(v){var x=Number(v);return Number.isFinite(x)?x:null}
  function money(v){var x=n(v);return x==null?"—":"₹"+x.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}
  function score(v){var x=n(v);return x==null?"—":x.toFixed(1)+"/100"}
  function getSelected(){try{return JSON.parse(sessionStorage.getItem("isp_compare")||"[]")}catch(e){return []}}
  function saveSelected(a){var out=[];a.forEach(function(x){x=norm(x);if(x&&out.indexOf(x)<0)out.push(x)});sessionStorage.setItem("isp_compare",JSON.stringify(out.slice(0,4)))}

  async function getJson(path){
    var r=await fetch(path+"?v="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw Error(path+" HTTP "+r.status);
    return r.json();
  }

  async function loadData(){
    if(loaded)return;
    if(loading)return loading;
    loading=Promise.all([
      getJson("./data/nse_universe.json"),
      getJson("./data/search_analysis.json"),
      getJson("./data/live_quotes.json"),
      getJson("./data/fundamentals.json")
    ]).then(function(a){
      var u=a[0],r=a[1],q=a[2],f=a[3];
      universe=Array.isArray(u)?u:(u&&Array.isArray(u.stocks)?u.stocks:[]);
      var rows=Array.isArray(r)?r:(r&&Array.isArray(r.stocks)?r.stocks:[]);
      researchBy={};rows.forEach(function(x){if(x&&x.symbol)researchBy[norm(x.symbol)]=x});
      quotes=(q&&q.quotes)||{};
      var fs=Array.isArray(f)?f:(f&&Array.isArray(f.stocks)?f.stocks:[]);
      if(Array.isArray(f))fs.forEach(function(x){if(x&&x.symbol)fundamentalsBy[norm(x.symbol)]=x});
      else if(f&&f.stocks&&!Array.isArray(f.stocks))fundamentalsBy=f.stocks;
      loaded=true;
    }).catch(function(e){console.error("Trial compare data load failed",e);throw e}).finally(function(){loading=null});
    return loading;
  }

  function stocks(){
    var out=[],seen={};
    universe.forEach(function(x){
      var s=norm(x.symbol);if(!s||seen[s])return;seen[s]=1;
      out.push({symbol:s,name:x.companyName||x.company||s,series:x.series||"EQ"});
    });
    Object.keys(researchBy).forEach(function(s){if(!seen[s]){seen[s]=1;out.push({symbol:s,name:researchBy[s].company||s,series:researchBy[s].series||"EQ"})}});
    return out.sort(function(a,b){return a.symbol.localeCompare(b.symbol)})
  }

  function findResearch(sym){return researchBy[norm(sym)]||null}
  function findQuote(sym){return quotes[norm(sym)]||null}
  function findFund(sym){return fundamentalsBy[norm(sym)]||null}
  function companyName(sym){
    var r=findResearch(sym),u=universe.find(function(x){return norm(x.symbol)===norm(sym)}),f=findFund(sym);
    return (r&&r.company)||(u&&(u.companyName||u.company))||(f&&(f.companyName||f.company))||sym;
  }

  function css(){
    if(document.getElementById("isp-trial-compare-css"))return;
    var s=document.createElement("style");s.id="isp-trial-compare-css";s.textContent=`
      #isp-trial-compare-panel{margin-top:14px;border:1px solid #dfe5ee;border-radius:14px;background:#fff;padding:16px;box-shadow:0 4px 18px rgba(0,0,0,.05)}
      .isp-tc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.isp-tc-title{font-size:18px;font-weight:900;color:#172033}.isp-tc-sub{font-size:11px;color:#667085;margin-top:4px}
      .isp-tc-actions{display:flex;gap:7px;flex-wrap:wrap}.isp-tc-btn{border:1px solid #ccd3df;background:#fff;color:#172033;border-radius:9px;padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer}.isp-tc-btn.primary{background:#10182b;color:#fff;border-color:#10182b}
      .isp-tc-selectors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.isp-tc-selector{border:1px solid #e1e6ef;border-radius:11px;padding:11px;background:#f8fafc}.isp-tc-selector label{display:block;font-size:11px;font-weight:800;color:#667085;margin-bottom:6px}
      .isp-tc-search{position:relative}.isp-tc-search input{width:100%;padding:9px 11px;border:1px solid #ccd3df;border-radius:8px;background:#fff;color:#172033;font-weight:600;outline:none;font-size:13px}.isp-tc-search input:focus{border-color:#526581;box-shadow:0 0 0 2px rgba(82,101,129,.08)}
      .isp-tc-results-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:60;max-height:220px;overflow:auto;background:#fff;border:1px solid #ccd3df;border-radius:9px;box-shadow:0 8px 22px rgba(16,24,43,.14);display:none}.isp-tc-results-list.open{display:block}.isp-tc-option{padding:9px 11px;cursor:pointer;border-bottom:1px solid #eef1f5;font-size:12px}.isp-tc-option:hover{background:#f5f7fa}.isp-tc-option b{font-weight:900}.isp-tc-option span{color:#667085;margin-left:5px}.isp-tc-no-results{padding:10px 11px;color:#667085;font-size:12px}
      .isp-tc-empty{margin-top:12px;background:#f7f9fc;border-radius:10px;padding:12px;color:#667085;font-size:12px}.isp-tc-loading{margin-top:12px;background:#f7f9fc;border-radius:10px;padding:12px;color:#667085;font-size:12px}
      .isp-tc-hint{margin-top:10px;font-size:11px;color:#667085}.isp-tc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.isp-tc-card{border:1px solid #e1e6ef;border-radius:12px;padding:12px;background:#fff}.isp-tc-symbol{font-size:16px;font-weight:900}.isp-tc-name{font-size:11px;color:#667085;margin-top:3px;min-height:28px}.isp-tc-row{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #eef1f5;padding-top:7px;margin-top:7px;font-size:11px}.isp-tc-label{color:#667085}.isp-tc-value{font-weight:900;text-align:right}.isp-tc-note{margin-top:9px;padding:8px;border-radius:8px;background:#f7f9fc;color:#667085;font-size:10px;line-height:1.4}.isp-tc-remove{margin-top:10px;width:100%;border:1px solid #e1e6ef;background:#f8fafc;border-radius:8px;padding:6px;font-size:10px;font-weight:800;cursor:pointer;color:#596273}
      @media(max-width:900px){.isp-tc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.isp-tc-selectors,.isp-tc-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s)
  }

  function panel(){
    var search=document.getElementById("search"),host=search&&search.closest("section.panel");if(!host)return null;
    var p=document.getElementById("isp-trial-compare-panel");if(!p){p=document.createElement("div");p.id="isp-trial-compare-panel";host.appendChild(p)}return p;
  }

  function card(sym){
    var r=findResearch(sym),q=findQuote(sym),f=findFund(sym),quant=r&&r.quantitative;
    var price=q&&q.price!=null?q.price:(quant&&quant.price!=null?quant.price:null);
    var available=!!(r&&r.analysisAvailable&&quant);
    var quantScore=quant&&quant.score, confidence=quant&&quant.confidence, signal=quant&&quant.signal, risk=quant&&quant.risk;
    var fundScore=f&&(f.score!=null?f.score:f.healthScore), health=f&&(f.health||f.status);
    var note=[];
    if(!available)note.push("Quantitative research is not currently available for this stock.");
    if(!q)note.push("No published live quote is currently available in the live-quote feed.");
    if(!f)note.push("Fundamental health data is not currently published for this stock.");
    if(r&&r.news&&r.news.summary)note.push(r.news.summary);
    return '<article class="isp-tc-card">'+
      '<div class="isp-tc-symbol">'+esc(sym)+'</div><div class="isp-tc-name">'+esc(companyName(sym))+'</div>'+ 
      '<div class="isp-tc-row"><span class="isp-tc-label">Price</span><span class="isp-tc-value">'+money(price)+'</span></div>'+ 
      '<div class="isp-tc-row"><span class="isp-tc-label">Quantitative</span><span class="isp-tc-value">'+score(quantScore)+'</span></div>'+ 
      '<div class="isp-tc-row"><span class="isp-tc-label">Confidence</span><span class="isp-tc-value">'+score(confidence)+'</span></div>'+ 
      '<div class="isp-tc-row"><span class="isp-tc-label">Signal</span><span class="isp-tc-value">'+esc(signal||"—")+'</span></div>'+ 
      '<div class="isp-tc-row"><span class="isp-tc-label">Risk</span><span class="isp-tc-value">'+(risk==null?"—":score(risk))+'</span></div>'+ 
      '<div class="isp-tc-row"><span class="isp-tc-label">Fundamental</span><span class="isp-tc-value">'+score(fundScore)+'</span></div>'+ 
      '<div class="isp-tc-row"><span class="isp-tc-label">Health</span><span class="isp-tc-value">'+esc(health||"—")+'</span></div>'+ 
      (note.length?'<div class="isp-tc-note">'+esc(note.join(" "))+'</div>':'<div class="isp-tc-note">Published quantitative, price and research data available.</div>')+
      '<button type="button" class="isp-tc-remove" data-tc-remove="'+esc(sym)+'">Remove</button></article>';
  }

  function renderCards(p,selected){
    if(!selected.length)return '<div class="isp-tc-empty">No stocks selected yet. Search and select 2–4 stocks above, then press <b>Compare selected</b>.</div>';
    return '<div class="isp-tc-grid">'+selected.map(card).join("")+'</div>';
  }

  function selector(i,list,selected){
    var sym=selected[i]||"";
    return '<div class="isp-tc-selector"><label>Stock '+(i+1)+(i<2?' *':' optional')+'</label><div class="isp-tc-search"><input type="text" autocomplete="off" data-tc-input="'+i+'" placeholder="Search symbol or company name" value="'+esc(sym)+'"><div class="isp-tc-results-list" data-tc-list="'+i+'"></div></div></div>';
  }

  function render(p){
    var list=stocks(),selected=getSelected();
    p.innerHTML='<div class="isp-tc-head"><div><div class="isp-tc-title">⚖ Compare Stocks</div><div class="isp-tc-sub">Search and select 2–4 NSE stocks for a side-by-side comparison.</div></div><div class="isp-tc-actions"><button type="button" class="isp-tc-btn" id="ispTcClear">Clear</button><button type="button" class="isp-tc-btn" id="ispTcClose">Close</button></div></div>'+ 
      '<div class="isp-tc-selectors">'+[0,1,2,3].map(function(i){return selector(i,list,selected)}).join("")+'</div>'+ 
      '<div class="isp-tc-actions" style="margin-top:12px"><button type="button" class="isp-tc-btn primary" id="ispTcCompare">Compare selected</button></div>'+ 
      '<div id="isp-tc-results">'+renderCards(p,selected)+'</div>'+ 
      '<div class="isp-tc-hint">Type a symbol or company name. Matching NSE directory choices appear below the box, just like Search & Analyze.</div>';

    function closeLists(except){p.querySelectorAll('.isp-tc-results-list').forEach(function(x){if(x!==except)x.classList.remove('open')})}
    function choose(i,sym){var a=getSelected();a[i]=sym;saveSelected(a);render(p);var next=p.querySelector('[data-tc-input="'+Math.min(i+1,3)+'"]');if(next&&i<3)next.focus()}
    function updateList(i,q){
      var box=p.querySelector('[data-tc-list="'+i+'"]'),needle=norm(q),chosen=getSelected();if(!box)return;
      var matches=list.filter(function(x){if(chosen.indexOf(x.symbol)>=0&&chosen[i]!==x.symbol)return false;return !needle||norm(x.symbol).indexOf(needle)>=0||norm(x.name).indexOf(needle)>=0}).slice(0,25);
      box.innerHTML=matches.length?matches.map(function(x){return '<div class="isp-tc-option" data-tc-option="'+esc(x.symbol)+'"><b>'+esc(x.symbol)+'</b><span>'+esc(x.name)+' · '+esc(x.series||"EQ")+'</span></div>'}).join(""):'<div class="isp-tc-no-results">No NSE stock found. Try another symbol or company name.</div>';
      box.classList.add('open');box.querySelectorAll('[data-tc-option]').forEach(function(el){el.onclick=function(){choose(i,el.getAttribute('data-tc-option'))}});
    }
    p.querySelectorAll('[data-tc-input]').forEach(function(input){var i=Number(input.dataset.tcInput);input.onfocus=function(){closeLists(p.querySelector('[data-tc-list="'+i+'"]));updateList(i,input.value)};input.oninput=function(){updateList(i,input.value)};input.onkeydown=function(e){if(e.key==='Escape'){closeLists()}if(e.key==='Enter'){var x=p.querySelector('[data-tc-list="'+i+'"] [data-tc-option]');if(x){e.preventDefault();x.click()}}}});
    p.onclick=function(e){if(!e.target.closest('.isp-tc-search'))closeLists()};
    p.querySelector('#ispTcClear').onclick=function(){saveSelected([]);render(p)};
    p.querySelector('#ispTcClose').onclick=function(){p.remove()};
    p.querySelectorAll('[data-tc-remove]').forEach(function(b){b.onclick=function(){saveSelected(getSelected().filter(function(x){return x!==b.dataset.tcRemove}));render(p)}});
    p.querySelector('#ispTcCompare').onclick=function(){var a=getSelected();if(a.length<2){p.querySelector('#isp-tc-results').innerHTML='<div class="isp-tc-empty">Please select at least <b>2 stocks</b> to compare.</div>';return}p.querySelector('#isp-tc-results').scrollIntoView({behavior:'smooth',block:'nearest'})};
  }

  async function open(){
    css();var p=panel();if(!p)return;p.innerHTML='<div class="isp-tc-loading">Loading published NSE research, live prices and fundamental data…</div>';p.scrollIntoView({behavior:'smooth',block:'start'});
    try{await loadData();render(p)}catch(e){p.innerHTML='<div class="isp-tc-empty"><b>Compare data could not be loaded.</b><br>Please refresh the page and try again.</div>';console.error(e)}
  }

  function install(){
    var btn=document.getElementById("ispCompareBtn");if(!btn)return;
    if(btn.dataset.trialCompareBound!=="1"){
      btn.dataset.trialCompareBound="1";
      btn.addEventListener("click",function(e){e.preventDefault();e.stopImmediatePropagation();open()},true);
    }
    var old=document.getElementById("isp-compare");if(old)old.remove();
  }
  function start(){css();install();var ob=new MutationObserver(install);ob.observe(document.body,{childList:true,subtree:true});setTimeout(function(){ob.disconnect()},120000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();