/* Indian Stock Pro — Compare Stocks UI (main data aligned) */
(function(){
  "use strict";
  if(window.__ispCompareInstalled)return;
  window.__ispCompareInstalled=true;

  var selected=[], db={stocks:[], bySymbol:{}, quotes:{}, funds:{}}, loaded=false, loading=null;
  var DATA=["./data/rankings.json","./data/context_analysis.json","./data/fundamentals.json","./data/live_quotes.json"];
  var norm=function(v){return String(v||"").trim().toUpperCase()};
  var num=function(v){var n=Number(v);return Number.isFinite(n)?n:null};
  var esc=function(v){return String(v==null?"":v).replace(/[&<>\"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[m]})};
  var money=function(v){var n=num(v);return n==null?"—":"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})};
  var score=function(v){var n=num(v);return n==null?"—":n.toFixed(1)+"/100"};
  var rows=function(x){if(Array.isArray(x))return x;if(x&&Array.isArray(x.stocks))return x.stocks;if(x&&Array.isArray(x.rankings))return x.rankings;if(x&&Array.isArray(x.bands))return x.bands.flatMap(function(b){return Array.isArray(b.stocks)?b.stocks:[]});return []};
  var companyFromReasoning=function(r){if(!Array.isArray(r)||!r.length)return "";var m=String(r[0]).match(/^(.+?) belongs to the /);return m?m[1]:""};
  function load(){
    if(loaded)return Promise.resolve();
    if(loading)return loading;
    loading=Promise.all(DATA.map(function(u){return fetch(u+"?v="+Date.now(),{cache:"no-store"}).then(function(r){if(!r.ok)throw Error(u+" HTTP "+r.status);return r.json()})})).then(function(a){
      var rankings=a[0], context=a[1], fundamentals=a[2], quotes=a[3];
      var qrows=rows(rankings), cmap={};
      qrows.forEach(function(x){if(x&&x.symbol)cmap[norm(x.symbol)]=x});
      var crows=Array.isArray(context&&context.stocks)?context.stocks:rows(context), fobj=(fundamentals&&fundamentals.stocks)||{};
      db.quotes=(quotes&&quotes.quotes)||{};
      db.funds=Array.isArray(fundamentals)?fundamentals.reduce(function(o,x){if(x&&x.symbol)o[norm(x.symbol)]=x;return o},{}):fobj;
      db.stocks=crows.filter(function(x){return x&&x.symbol}).map(function(x){
        var s=norm(x.symbol),q=cmap[s]||{},f=db.funds[s]||{};
        return {
          symbol:s,
          company:x.companyName||x.company||f.companyName||companyFromReasoning(x.reasoning)||q.companyName||q.company||s,
          price:num(x.price)!=null?num(x.price):num(q.price),
          integratedScore:num(x.finalScore),
          quantitativeScore:num(x.quantitativeScore)!=null?num(x.quantitativeScore):num(q.score),
          confidence:num(x.confidence),
          signal:x.signal||"—",
          risk:x.risk||"—",
          contextSignal:x.contextSignal||"—",
          alignment:x.alignment||"—",
          companyContextScore:num(x.companyContextScore),
          industryContextScore:num(x.industryContextScore),
          marketContextScore:num(x.marketContextScore),
          contextContribution:num(x.weightedContextScore),
          fundamentalScore:num(f.score)!=null?num(f.score):num(f.healthScore),
          health:f.health||f.status||"—",
          finalRank:num(x.finalRank),
          factors:q.factors||{},
          raw:q.raw||{},
          quote:db.quotes[s]||null
        };
      });
      db.stocks.sort(function(a,b){return (a.finalRank||999)-(b.finalRank||999)});
      db.stocks.forEach(function(x){db.bySymbol[x.symbol]=x});
      loaded=true;
    }).finally(function(){loading=null});
    return loading;
  }
  function save(){try{sessionStorage.setItem("isp_compare_main",JSON.stringify(selected.slice(0,4)))}catch(e){}}
  function restore(){try{var a=JSON.parse(sessionStorage.getItem("isp_compare_main")||"[]");selected=Array.isArray(a)?a.map(norm).filter(function(s){return db.bySymbol[s]}).slice(0,4):[]}catch(e){selected=[]}}
  function css(){
    if(document.getElementById("isp-main-compare-css"))return;
    var s=document.createElement("style");s.id="isp-main-compare-css";s.textContent=".isp-compare-panel{margin-top:14px;border:1px solid #dfe5ee;border-radius:14px;background:#fff;padding:16px;box-shadow:0 4px 18px rgba(0,0,0,.06)}.isp-c-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.isp-c-title{font-size:18px;font-weight:900}.isp-c-sub{font-size:11px;color:#667085;margin-top:4px;line-height:1.4}.isp-c-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.isp-c-input{position:relative}.isp-c-input input{width:100%;padding:10px;border:1px solid #ccd3df;border-radius:9px;font-size:13px;box-sizing:border-box}.isp-c-results{position:absolute;left:0;right:0;top:43px;z-index:999;background:#fff;border:1px solid #ccd3df;border-radius:9px;box-shadow:0 8px 22px rgba(0,0,0,.14);max-height:220px;overflow:auto;display:none}.isp-c-results.open{display:block}.isp-c-option{padding:9px 10px;border-bottom:1px solid #eef1f5;cursor:pointer;font-size:12px}.isp-c-option:hover{background:#f5f7fa}.isp-c-option span{color:#667085}.isp-c-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.isp-c-btn{border:1px solid #ccd3df;background:#fff;color:#172033;border-radius:9px;padding:8px 11px;font-weight:800;font-size:12px;cursor:pointer}.isp-c-btn.primary{background:#10182b;color:#fff}.isp-c-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.isp-c-card{border:1px solid #e1e6ef;border-radius:12px;padding:12px;background:#fff}.isp-c-symbol{font-size:16px;font-weight:900}.isp-c-name{font-size:11px;color:#667085;min-height:28px;margin-top:3px}.isp-c-live{font-size:18px;font-weight:900;margin:8px 0 2px}.isp-up{color:#16743b}.isp-down{color:#b42318}.isp-c-live-meta{font-size:10px;color:#667085;line-height:1.35}.isp-c-row{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #eef1f5;margin-top:7px;padding-top:7px;font-size:11px}.isp-c-label{color:#667085}.isp-c-value{font-weight:900;text-align:right}.isp-c-msg{margin-top:12px;padding:10px;border-radius:9px;background:#f7f9fc;color:#667085;font-size:12px}.isp-c-status{margin-top:10px;font-size:11px;color:#667085;line-height:1.4}.isp-c-note{margin-top:12px;padding:10px;border-radius:9px;background:#fff9e8;border:1px solid #f0c36d;color:#765200;font-size:11px;line-height:1.4}@media(max-width:850px){.isp-c-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.isp-c-grid,.isp-c-cards{grid-template-columns:1fr}}";document.head.appendChild(s);
  }
  function host(){var input=document.getElementById("search");return input&&input.closest("section.panel")}
  function panel(){var h=host();if(!h)return null;var p=document.getElementById("isp-standalone-compare");if(!p){p=document.createElement("div");p.id="isp-standalone-compare";p.className="isp-compare-panel";h.appendChild(p)}return p}
  function list(){return db.stocks.map(function(x){return {symbol:x.symbol,name:x.company}})}
  function liveHtml(x){
    var q=x.quote,p=num(q&&q.price),pct=num(q&&q.changePct),prev=num(q&&q.previousClose);
    if(p==null)return '<div class="isp-c-live-meta">Published live quote unavailable</div><div class="isp-c-live-meta">Research price: '+money(x.price)+'</div>';
    var cls=pct==null?"":pct>0?"isp-up":pct<0?"isp-down":"";
    var stamp=q&&q.timestamp?new Date(q.timestamp):null,ts=stamp&&!isNaN(stamp)?new Intl.DateTimeFormat("en-IN",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(stamp)+" IST":"";
    return '<div class="isp-c-live '+cls+'">'+money(p)+'</div><div class="isp-c-live-meta">LIVE · '+(pct==null?"change unavailable":(pct>0?"+":"")+pct.toFixed(2)+"%")+(prev!=null?' · Prev '+money(prev):"")+'</div>'+(ts?'<div class="isp-c-live-meta">Updated '+esc(ts)+'</div>':'');
  }
  function card(x){
    return '<article class="isp-c-card"><div class="isp-c-symbol">'+esc(x.symbol)+'</div><div class="isp-c-name">'+esc(x.company)+'</div>'+liveHtml(x)+'<div class="isp-c-row"><span class="isp-c-label">Integrated</span><span class="isp-c-value">'+score(x.integratedScore)+'</span></div><div class="isp-c-row"><span class="isp-c-label">Quantitative</span><span class="isp-c-value">'+score(x.quantitativeScore)+'</span></div><div class="isp-c-row"><span class="isp-c-label">Confidence</span><span class="isp-c-value">'+score(x.confidence)+'</span></div><div class="isp-c-row"><span class="isp-c-label">Signal</span><span class="isp-c-value">'+esc(x.signal)+'</span></div><div class="isp-c-row"><span class="isp-c-label">Risk</span><span class="isp-c-value">'+esc(x.risk)+'</span></div><div class="isp-c-row"><span class="isp-c-label">Fundamental</span><span class="isp-c-value">'+score(x.fundamentalScore)+'</span></div><div class="isp-c-row"><span class="isp-c-label">Health</span><span class="isp-c-value">'+esc(x.health)+'</span></div><div class="isp-c-row"><span class="isp-c-label">Context contribution</span><span class="isp-c-value">'+score(x.contextContribution)+'</span></div><div class="isp-c-row"><span class="isp-c-label">Company / Industry / Market</span><span class="isp-c-value">'+score(x.companyContextScore)+' / '+score(x.industryContextScore)+' / '+score(x.marketContextScore)+'</span></div></article>';
  }
  function render(p){
    var all=list();
    p.innerHTML='<div class="isp-c-head"><div><div class="isp-c-title">⚖ Compare Stocks</div><div class="isp-c-sub">Compare 2–4 stocks from the current integrated research dataset. Every comparison metric is sourced from the same main data used by Indian Stock Pro.</div></div><button type="button" class="isp-c-btn" id="ispCclose">Close</button></div><div class="isp-c-grid">'+[0,1,2,3].map(function(i){return '<div class="isp-c-input"><input autocomplete="off" data-ci="'+i+'" placeholder="Stock '+(i+1)+(i<2?' — required':' — optional')+'" value="'+esc(selected[i]||'')+'"><div class="isp-c-results" data-cr="'+i+'"></div></div>'}).join('')+'</div><div class="isp-c-actions"><button type="button" class="isp-c-btn primary" id="ispCcompare">Compare selected</button><button type="button" class="isp-c-btn" id="ispCclear">Clear</button></div><div id="ispCstatus" class="isp-c-status">'+all.length+' researched stocks available for comparison.</div><div class="isp-c-note">Live price availability depends on the published market feed. If a live quote is unavailable, the research price is shown separately so it is never mistaken for a live price.</div><div id="ispCoutput"></div>';
    function closeLists(){p.querySelectorAll('.isp-c-results').forEach(function(x){x.classList.remove('open')})}
    function choose(i,s){selected[i]=norm(s);save();render(p)}
    p.querySelectorAll('[data-ci]').forEach(function(inp){var i=Number(inp.dataset.ci);function update(){var box=p.querySelector('[data-cr="'+i+'"]'),q=norm(inp.value),matches=all.filter(function(x){return(!q||norm(x.symbol).indexOf(q)>=0||norm(x.name).indexOf(q)>=0)&&(!selected.includes(x.symbol)||selected[i]===x.symbol)}).slice(0,25);box.innerHTML=matches.map(function(x){return '<div class="isp-c-option" data-s="'+esc(x.symbol)+'"><b>'+esc(x.symbol)+'</b> <span>'+esc(x.name)+'</span></div>'}).join('')||'<div class="isp-c-option">No researched stock found.</div>';box.classList.add('open');box.querySelectorAll('[data-s]').forEach(function(el){el.onclick=function(){choose(i,el.dataset.s)}})}inp.onfocus=update;inp.oninput=update;inp.onkeydown=function(e){if(e.key==='Enter'){var x=p.querySelector('[data-cr="'+i+'"] .isp-c-option[data-s]');if(x){e.preventDefault();x.click()}}if(e.key==='Escape')closeLists()}});
    p.querySelector('#ispCclose').onclick=function(){p.remove()};p.querySelector('#ispCclear').onclick=function(){selected=[];save();render(p)};p.querySelector('#ispCcompare').onclick=function(){var a=selected.filter(Boolean).map(function(s){return db.bySymbol[s]}).filter(Boolean),out=p.querySelector('#ispCoutput');if(a.length<2){out.innerHTML='<div class="isp-c-msg">Please select at least 2 researched stocks.</div>';return}out.innerHTML='<div class="isp-c-cards">'+a.map(card).join('')+'</div>';p.querySelector('#ispCstatus').textContent=a.length+' stocks compared using the main integrated, quantitative, fundamental and published quote datasets.'};
  }
  function open(){css();var p=panel();if(!p)return;p.innerHTML='<div class="isp-c-msg">Loading comparison data…</div>';p.scrollIntoView({behavior:'smooth',block:'start'});load().then(function(){restore();render(p)}).catch(function(e){p.innerHTML='<div class="isp-c-msg"><b>Compare could not load.</b><br>'+esc(e.message||e)+'</div>'})}
  window.__ispMainCompareOpen=open;
  function ensureButton(){var h=host();if(!h||document.getElementById('ispCompareBtn'))return;var bar=document.createElement('div');bar.style.cssText='display:flex;gap:8px;margin-top:10px;flex-wrap:wrap';bar.innerHTML='<button type="button" id="ispCompareBtn" class="isp-c-btn">⚖ Compare</button>';h.appendChild(bar)}
  function start(){css();ensureButton();var ob=new MutationObserver(ensureButton);ob.observe(document.body,{childList:true,subtree:true});setTimeout(function(){ob.disconnect()},120000)}
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#ispCompareBtn');if(b){e.preventDefault();e.stopPropagation();open()}},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
