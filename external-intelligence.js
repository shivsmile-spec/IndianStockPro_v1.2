/* Indian Stock Pro — dynamic External Market Intelligence layer */
(function(){
  "use strict";
  const FEED="./data/news_context.json?external="+Date.now();
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  function formatDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return "Unknown";try{return new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(d)+" IST"}catch(e){return d.toLocaleString()+" IST"}}
  function ageLabel(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return "age unavailable";const mins=Math.max(0,Math.round((Date.now()-d.getTime())/60000));if(mins<60)return `${mins} min ago`;const hours=Math.round(mins/60);if(hours<24)return `${hours} hr ago`;const days=Math.round(hours/24);return `${days} day${days===1?"":"s"} ago`}
  function sourceName(url){try{const host=new URL(url).hostname.replace(/^www\./,"");return host.includes("news.google.com")?"Google News source":host}catch(e){return "Public source"}}
  function css(){if(document.getElementById("isp-external-refresh-css"))return;const s=document.createElement("style");s.id="isp-external-refresh-css";s.textContent=`.isp-research-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.isp-refresh-research{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;cursor:pointer}.isp-refresh-research:disabled{opacity:.55;cursor:wait}.isp-external-status{font-size:11px;color:#aebbd0;margin-top:7px}.isp-latest-section{margin-top:16px}.isp-latest-title{font-size:14px;font-weight:900;margin-bottom:9px;color:#fff}.isp-latest-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.isp-latest-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);border-radius:12px;padding:12px}.isp-latest-meta{font-size:10px;color:#9fb0ca;font-weight:800}.isp-latest-card h4{font-size:13px;margin:5px 0 0;line-height:1.35;color:#fff}.isp-latest-card p{font-size:12px;line-height:1.4;color:#d5deed;margin:6px 0 0}.isp-latest-link{display:inline-block;margin-top:7px;color:#9ee66e;text-decoration:none;font-size:11px;font-weight:800}@media(max-width:800px){.isp-latest-grid{grid-template-columns:1fr}}.institutional-panel{order:0}.institutional-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.institutional-date{font-size:11px;font-weight:800;color:#2457a6;background:#eaf2ff;border-radius:999px;padding:7px 10px;white-space:nowrap}.institutional-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px}.institutional-card{border:1px solid #e1e6ef;border-radius:13px;padding:14px;background:#fff}.institutional-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.institutional-symbol{font-size:17px;font-weight:900}.institutional-company{font-size:12px;color:#667085;margin-top:3px}.institutional-view{font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eaf7ee;color:#16743b}.institutional-meta{font-size:11px;color:#667085;margin-top:9px}.institutional-reason{font-size:13px;line-height:1.45;margin-top:8px;color:#33415c}.institutional-bottom{display:flex;justify-content:space-between;gap:10px;margin-top:10px;font-size:11px;color:#667085}.institutional-bottom a{color:#2457a6;font-weight:800;text-decoration:none}@media(max-width:700px){.institutional-head{flex-direction:column}.institutional-cards{grid-template-columns:1fr}}`;document.head.appendChild(s)}
  function ensureControls(panel){const head=panel.querySelector(".expert-head");if(!head)return null;let controls=head.querySelector(".isp-research-controls");if(!controls){controls=document.createElement("div");controls.className="isp-research-controls";const pill=head.querySelector(".live-pill");if(pill)pill.parentNode.insertBefore(controls,pill);else head.appendChild(controls);if(pill)controls.appendChild(pill);const btn=document.createElement("button");btn.type="button";btn.className="isp-refresh-research";btn.textContent="↻ Refresh research";controls.appendChild(btn);btn.addEventListener("click",()=>load(true))}return controls}
  function render(panel,body,manual){const pill=panel.querySelector(".live-pill");const generated=body?.generated||body?.generatedAt||null;if(pill)pill.innerHTML=`<span class="live-dot"></span>Research snapshot · ${generated?`verified ${formatDate(generated)} · ${ageLabel(generated)}`:"published time unavailable"}`;
    let status=panel.querySelector(".isp-external-status");if(!status){status=document.createElement("div");status.className="isp-external-status";const head=panel.querySelector(".expert-head");if(head)head.after(status);else panel.prepend(status)}
    status.textContent=generated?`Published research feed: ${formatDate(generated)}. Page refresh reloads the latest published snapshot; the scheduled news engine produces the next snapshot.`:"Latest published research timestamp is unavailable.";
    panel.querySelectorAll(".expert-grid").forEach(g=>{g.style.display="none"});
    let latest=panel.querySelector(".isp-latest-section");if(!latest){latest=document.createElement("div");latest.className="isp-latest-section";const firstGrid=panel.querySelector(".expert-grid");if(firstGrid)firstGrid.before(latest);else panel.appendChild(latest)}
    const articles=Array.isArray(body?.marketContext?.articles)?body.marketContext.articles.slice():[];articles.sort((a,b)=>new Date(b?.published||0)-new Date(a?.published||0));const top=articles.filter(a=>a&&a.title).slice(0,6);
    latest.innerHTML=`<div class="isp-latest-title">📰 Latest published market context</div><div class="isp-latest-grid">${top.map(a=>{const date=a.published?formatDate(a.published):"Date unavailable";const direction=a?.classification?.direction||"neutral";return `<article class="isp-latest-card"><div class="isp-latest-meta">${esc(sourceName(a.link||""))} · ${esc(date)} · ${esc(direction)}</div><h4>${esc(a.title)}</h4><p>${esc((a.description||"").slice(0,190))}</p>${a.link?`<a class="isp-latest-link" href="${esc(a.link)}" target="_blank" rel="noopener">Read source →</a>`:""}</article>`}).join("")}</div>`;
    if(manual)status.textContent=generated?`Research reloaded successfully · ${formatDate(generated)}.`:"Research reloaded, but the published feed has no timestamp.";
  }
  async function load(manual=false){const panel=document.querySelector(".expert-panel");if(!panel)return;css();const controls=ensureControls(panel);const btn=controls?.querySelector(".isp-refresh-research");if(btn&&manual){btn.disabled=true;btn.textContent="↻ Loading…"}try{const r=await fetch(FEED+(manual?"&manual=1":""),{cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);const body=await r.json();window.indianStockExternalResearch=body;render(panel,body,manual)}catch(e){console.warn("External Market Intelligence feed unavailable:",e);let status=panel.querySelector(".isp-external-status");if(!status){status=document.createElement("div");status.className="isp-external-status";panel.prepend(status)}status.textContent="Latest published research feed could not be loaded. Showing the last page snapshot."}finally{if(btn&&manual){btn.disabled=false;btn.textContent="↻ Refresh research"}}}
  function start(){const panel=document.querySelector(".expert-panel");if(!panel)return;load(false)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();

/* Institutional research loader + safe dashboard ordering. */
(function(){
  "use strict";
  const DATA_URL="./data/institutional_picks.json?v="+Date.now();
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  function render(d){
    const top=document.getElementById("integratedCards");
    if(!top)return;
    const topPanel=top.closest("section.panel");
    if(!topPanel)return;
    let panel=document.getElementById("institutionalResearchPanel");
    if(panel)panel.remove();
    panel=document.createElement("section");panel.className="panel institutional-panel";panel.id="institutionalResearchPanel";
    const cards=(d.items||[]).map(x=>`<article class="institutional-card"><div class="institutional-top"><div><div class="institutional-symbol">${esc(x.symbol)}</div><div class="institutional-company">${esc(x.company)}</div></div><span class="institutional-view">${esc(x.view)}</span></div><div class="institutional-meta"><b>${esc(x.source)}</b> · ${esc(x.sourceType)} · ${esc(x.date)}</div><div class="institutional-reason">${esc(x.reason)}</div><div class="institutional-bottom"><span>Target: <b>${esc(x.target||"No target published")}</b></span>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">Read source →</a>`:""}</div></article>`).join("");
    panel.innerHTML=`<div class="institutional-head"><div><h2>🏦 Institutional & Fund-Research Ideas</h2><p class="disclaimer">Published stock views, portfolio additions and research calls from institutions, brokerages and fund-management sources. These are external research context — not recommendations by Indian Stock Pro.</p></div><span class="institutional-date">Snapshot · ${esc(d.snapshotDate||"")}</span></div><div class="institutional-cards">${cards||`<div class="empty">No institutional research is available in the current snapshot.</div>`}</div>`;
    topPanel.parentNode.insertBefore(panel,topPanel.nextSibling);
    const summary=document.querySelector("#summary")?.closest("section.panel");
    if(summary)summary.parentNode.appendChild(summary);
  }
  function install(){fetch(DATA_URL,{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject(Error("HTTP "+r.status))).then(d=>{window.institutionalPicksSnapshot=d.snapshotDate||"";render(d)}).catch(e=>console.warn("Institutional research unavailable",e))}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();

/* Dashboard order: do not use a MutationObserver. Moving the expert panel itself creates DOM mutations,
   so an observer here can recursively fire and freeze Chrome. Use a few one-shot retries instead. */
(function(){
  "use strict";
  function place(){
    const panel=document.querySelector(".expert-panel");
    if(!panel)return;
    const container=panel.parentNode;
    if(!container)return;
    const fund=document.getElementById("isp-fundamentals");
    const institutional=document.getElementById("institutionalResearchPanel");
    const quant=document.getElementById("quantCards")?.closest("section.panel");
    const bands=document.getElementById("bands")?.closest("section.panel");
    const integrated=document.getElementById("integratedCards")?.closest("section.panel");
    /* Keep external intelligence after stock analysis sections and before the final summary. */
    const summary=document.getElementById("summary")?.closest("section.panel");
    const target=summary||null;
    if(target && target.parentNode===container){
      container.insertBefore(panel,target);
      return;
    }
    const candidates=[fund,institutional,bands,quant,integrated].filter(Boolean).filter(x=>x.parentNode===container);
    if(candidates.length){
      const last=candidates[candidates.length-1];
      if(panel!==last.nextElementSibling)last.parentNode.insertBefore(panel,last.nextElementSibling);
    }
  }
  function start(){place();setTimeout(place,250);setTimeout(place,1000);setTimeout(place,2500);setTimeout(place,5000)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
