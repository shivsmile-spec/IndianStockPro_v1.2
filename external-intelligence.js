/* Indian Stock Pro — dynamic External Market Intelligence layer */
(function(){
  "use strict";
  const FEED="./data/news_context.json?external="+Date.now();
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  function formatDate(value){
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return "Unknown";
    try{return new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(d)+" IST";}
    catch(e){return d.toLocaleString()+" IST";}
  }

  function ageLabel(value){
    const d=new Date(value), now=Date.now();
    if(Number.isNaN(d.getTime()))return "age unavailable";
    const mins=Math.max(0,Math.round((now-d.getTime())/60000));
    if(mins<60)return `${mins} min ago`;
    const hours=Math.round(mins/60);
    if(hours<24)return `${hours} hr ago`;
    const days=Math.round(hours/24);
    return `${days} day${days===1?"":"s"} ago`;
  }

  function sourceName(url){
    try{
      const host=new URL(url).hostname.replace(/^www\./,"");
      if(host.includes("news.google.com"))return "Google News source";
      return host;
    }catch(e){return "Public source";}
  }

  function css(){
    if(document.getElementById("isp-external-refresh-css"))return;
    const s=document.createElement("style");
    s.id="isp-external-refresh-css";
    s.textContent=`
      .isp-research-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .isp-refresh-research{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;cursor:pointer}
      .isp-refresh-research:disabled{opacity:.55;cursor:wait}
      .isp-external-status{font-size:11px;color:#aebbd0;margin-top:7px}
      .isp-latest-section{margin-top:16px}
      .isp-latest-title{font-size:14px;font-weight:900;margin-bottom:9px;color:#fff}
      .isp-latest-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .isp-latest-card{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);border-radius:12px;padding:12px}
      .isp-latest-meta{font-size:10px;color:#9fb0ca;font-weight:800}
      .isp-latest-card h4{font-size:13px;margin:5px 0 0;line-height:1.35;color:#fff}
      .isp-latest-card p{font-size:12px;line-height:1.4;color:#d5deed;margin:6px 0 0}
      .isp-latest-link{display:inline-block;margin-top:7px;color:#9ee66e;text-decoration:none;font-size:11px;font-weight:800}
      @media(max-width:800px){.isp-latest-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureControls(panel){
    const head=panel.querySelector(".expert-head");
    if(!head)return null;
    let controls=head.querySelector(".isp-research-controls");
    if(!controls){
      controls=document.createElement("div");
      controls.className="isp-research-controls";
      const pill=head.querySelector(".live-pill");
      if(pill)pill.parentNode.insertBefore(controls,pill);
      else head.appendChild(controls);
      if(pill)controls.appendChild(pill);
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="isp-refresh-research";
      btn.textContent="↻ Refresh research";
      controls.appendChild(btn);
      btn.addEventListener("click",()=>load(true));
    }
    return controls;
  }

  function render(panel,body,manual){
    const pill=panel.querySelector(".live-pill");
    const generated=body?.generated||body?.generatedAt||null;
    if(pill){
      pill.innerHTML=`<span class="live-dot"></span>Research snapshot · ${generated?`verified ${formatDate(generated)} · ${ageLabel(generated)}`:"published time unavailable"}`;
    }

    let status=panel.querySelector(".isp-external-status");
    if(!status){
      status=document.createElement("div");
      status.className="isp-external-status";
      const head=panel.querySelector(".expert-head");
      if(head)head.after(status); else panel.prepend(status);
    }
    status.textContent=generated
      ? `Published research feed: ${formatDate(generated)}. Page refresh reloads the latest published snapshot; the scheduled news engine produces the next snapshot.`
      : "Latest published research timestamp is unavailable.";

    let latest=panel.querySelector(".isp-latest-section");
    if(!latest){
      latest=document.createElement("div");
      latest.className="isp-latest-section";
      const firstGrid=panel.querySelector(".expert-grid");
      if(firstGrid)firstGrid.before(latest); else panel.appendChild(latest);
    }

    const articles=Array.isArray(body?.marketContext?.articles)?body.marketContext.articles.slice():[];
    articles.sort((a,b)=>new Date(b?.published||0)-new Date(a?.published||0));
    const top=articles.filter(a=>a&&a.title).slice(0,6);
    latest.innerHTML=`<div class="isp-latest-title">📰 Latest published market context</div><div class="isp-latest-grid">${top.map(a=>{
      const date=a.published?formatDate(a.published):"Date unavailable";
      const direction=a?.classification?.direction||"neutral";
      return `<article class="isp-latest-card"><div class="isp-latest-meta">${esc(sourceName(a.link||""))} · ${esc(date)} · ${esc(direction)}</div><h4>${esc(a.title)}</h4><p>${esc((a.description||"").slice(0,190))}</p>${a.link?`<a class="isp-latest-link" href="${esc(a.link)}" target="_blank" rel="noopener">Read source →</a>`:""}</article>`;
    }).join("")}</div>`;

    if(manual){
      status.textContent=generated
        ? `Research reloaded successfully · ${formatDate(generated)}.`
        : "Research reloaded, but the published feed has no timestamp.";
    }
  }

  async function load(manual=false){
    const panel=document.querySelector(".expert-panel");
    if(!panel)return;
    css();
    const controls=ensureControls(panel);
    const btn=controls?.querySelector(".isp-refresh-research");
    if(btn&&manual){btn.disabled=true;btn.textContent="↻ Loading…";}
    try{
      const r=await fetch(FEED+(manual?"&manual=1":""),{cache:"no-store"});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const body=await r.json();
      window.indianStockExternalResearch=body;
      render(panel,body,manual);
    }catch(e){
      console.warn("External Market Intelligence feed unavailable:",e);
      let status=panel.querySelector(".isp-external-status");
      if(!status){status=document.createElement("div");status.className="isp-external-status";panel.prepend(status);}
      status.textContent="Latest published research feed could not be loaded. Showing the last page snapshot.";
    }finally{
      if(btn&&manual){btn.disabled=false;btn.textContent="↻ Refresh research";}
    }
  }

  function start(){
    const panel=document.querySelector(".expert-panel");
    if(!panel)return;
    load(false);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
