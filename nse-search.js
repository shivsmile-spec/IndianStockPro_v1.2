/* Indian Stock Pro — NSE-wide search layer
   Uses the daily data/nse_universe.json file generated from NSE's official
   "Securities available for Equity segment" list. Keeps the model's
   Top-10/30 analysis universe separate from the complete NSE directory.
*/
(function(){
  "use strict";
  const SEARCH_URL="./data/nse_universe.json?v="+Date.now();
  let universe=[];
  let ready=false;

  const norm=v=>String(v||"").trim().toUpperCase();
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  async function loadUniverse(){
    try{
      const r=await fetch(SEARCH_URL,{cache:"no-store"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      const body=await r.json();
      universe=Array.isArray(body)?body:(Array.isArray(body.stocks)?body.stocks:[]);
      ready=true;
      const input=document.getElementById("search");
      if(input)input.placeholder="Search any NSE stock by symbol or company name";
    }catch(e){
      console.warn("NSE-wide directory unavailable:",e);
    }
  }

  function currentAnalyzed(symbol){
    const arr=window.integrated||[];
    return arr.find(x=>norm(x.symbol)===norm(symbol));
  }

  function renderResults(query){
    const box=document.getElementById("searchResults");
    if(!box)return;
    const q=norm(query);
    if(!q){box.style.display="none";box.innerHTML="";return;}
    if(!ready){box.style.display="block";box.innerHTML='<div class="search-item"><b>Loading NSE stock directory…</b><span>Please try again in a moment.</span></div>';return;}

    const found=universe.filter(x=>{
      const s=norm(x.symbol), n=norm(x.companyName||x.company||x.name);
      return s.includes(q)||n.includes(q);
    }).slice(0,20);

    if(!found.length){
      box.style.display="block";
      box.innerHTML='<div class="search-item"><b>No NSE stock found</b><span>Try another company name or symbol.</span></div>';
      return;
    }

    box.innerHTML=found.map(x=>{
      const a=currentAnalyzed(x.symbol);
      return `<div class="search-item nse-wide-result" data-nse-symbol="${esc(x.symbol)}">
        <b>${esc(x.symbol)}</b>
        <span>${esc(x.companyName||x.company||x.name||"")} · ${esc(x.series||"EQ")}${a?" · ✅ Indian Stock Pro analyzed":" · NSE directory"}</span>
      </div>`;
    }).join("");
    box.style.display="block";
  }

  function selectResult(symbol){
    const item=universe.find(x=>norm(x.symbol)===norm(symbol));
    if(!item)return;
    const analyzed=currentAnalyzed(symbol);
    const input=document.getElementById("search");
    if(input)input.value=item.symbol;

    if(analyzed && typeof window.showDetails==="function"){
      window.showDetails(analyzed);
      return;
    }

    const box=document.getElementById("searchResults");
    if(box)box.style.display="none";

    if(typeof window.openModal==="function"){
      window.openModal(
        `${esc(item.symbol)} — NSE Stock Directory`,
        `<div class="hero"><div class="hero-line"><div><div class="hero-symbol">${esc(item.symbol)}</div><div>${esc(item.companyName||item.company||item.name||"NSE equity")}</div></div><div class="hero-price">NSE Equity</div></div></div>
         <div class="detail-grid">
           <div class="detail"><small>Company</small><br><b>${esc(item.companyName||item.company||item.name||"—")}</b></div>
           <div class="detail"><small>Symbol</small><br><b>${esc(item.symbol||"—")}</b></div>
           <div class="detail"><small>Series</small><br><b>${esc(item.series||"EQ")}</b></div>
           <div class="detail"><small>ISIN</small><br><b>${esc(item.isin||"—")}</b></div>
         </div>
         <div class="reason"><b>Indian Stock Pro analysis</b><br><span>This stock is listed in the NSE-wide directory, but it is not currently part of the active quantitative analysis universe. It can be added to the model universe in a future individual-analysis feature.</span></div>`
      );
    }else{
      alert(`${item.symbol} — ${item.companyName||item.company||item.name||"NSE stock"}\n\nThis NSE stock is not currently in the Indian Stock Pro analysis universe.`);
    }
  }

  function install(){
    const input=document.getElementById("search");
    const box=document.getElementById("searchResults");
    if(!input||!box)return;

    /* Capture the input before the existing Top-10 search listener can narrow it. */
    input.addEventListener("input",function(e){
      if(!ready){loadUniverse();}
      renderResults(input.value);
      e.stopImmediatePropagation();
    },true);

    box.addEventListener("click",function(e){
      const row=e.target.closest?.(".nse-wide-result");
      if(!row)return;
      e.preventDefault();
      e.stopPropagation();
      selectResult(row.getAttribute("data-nse-symbol"));
    },true);

    /* Make the Analyze button useful for any NSE-directory result. */
    const analyze=document.getElementById("analyzeBtn");
    if(analyze){
      analyze.addEventListener("click",function(e){
        const symbol=norm(input.value);
        if(!symbol||!ready)return;
        const found=universe.find(x=>norm(x.symbol)===symbol);
        if(found){
          e.preventDefault();
          e.stopImmediatePropagation();
          selectResult(symbol);
        }
      },true);
    }

    loadUniverse();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
