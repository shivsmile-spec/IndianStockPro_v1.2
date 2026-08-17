/* Indian Stock Pro — institutional research + dashboard ordering */
(function(){
  "use strict";
  const DATA_URL="./data/institutional_picks.json?v="+Date.now();
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const money=v=>v?esc(v):"No target published";
  function render(items){
    const top=document.getElementById("integratedCards");
    if(!top)return;
    const topPanel=top.closest("section.panel");
    if(!topPanel)return;
    let panel=document.getElementById("institutionalResearchPanel");
    if(panel)panel.remove();
    panel=document.createElement("section");
    panel.className="panel institutional-panel";
    panel.id="institutionalResearchPanel";
    const cards=(items||[]).map(x=>`<article class="institutional-card"><div class="institutional-top"><div><div class="institutional-symbol">${esc(x.symbol)}</div><div class="institutional-company">${esc(x.company)}</div></div><span class="institutional-view">${esc(x.view)}</span></div><div class="institutional-meta"><b>${esc(x.source)}</b> · ${esc(x.sourceType)} · ${esc(x.date)}</div><div class="institutional-reason">${esc(x.reason)}</div><div class="institutional-bottom"><span>Target: <b>${money(x.target)}</b></span>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">Read source →</a>`:""}</div></article>`).join("");
    panel.innerHTML=`<div class="institutional-head"><div><h2>🏦 Institutional & Fund-Research Ideas</h2><p class="disclaimer">Published stock views, portfolio additions and research calls from institutions, brokerages and fund-management sources. These views are external research context — not recommendations by Indian Stock Pro.</p></div><span class="institutional-date">Snapshot · ${esc(window.institutionalPicksSnapshot||"17 Aug 2026")}</span></div><div class="institutional-cards">${cards||`<div class="empty">No institutional research is available in the current snapshot.</div>`}</div>`;
    topPanel.parentNode.insertBefore(panel,topPanel.nextSibling);
    const summary=document.querySelector("#summary")?.closest("section.panel");
    if(summary){
      summary.parentNode.appendChild(summary);
    }
  }
  function install(){
    fetch(DATA_URL,{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject(Error("HTTP "+r.status))).then(d=>{
      window.institutionalPicksSnapshot=d.snapshotDate||"";
      render(d.items||[]);
    }).catch(e=>console.warn("Institutional research unavailable",e));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
