/* V2 external-intelligence freshness guard */
(function(){
  "use strict";
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  function fmt(v){const d=new Date(v);if(Number.isNaN(d.getTime()))return "Unknown";return new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(d)+" IST"}
  function age(v){const d=new Date(v);if(Number.isNaN(d.getTime()))return "age unavailable";const m=Math.max(0,Math.round((Date.now()-d.getTime())/60000));if(m<60)return `${m} min ago`;if(m<1440)return `${Math.round(m/60)} hr ago`;return `${Math.round(m/1440)} day${Math.round(m/1440)===1?"":"s"} ago`}
  async function load(){
    const panel=document.querySelector(".expert-panel");if(!panel)return;
    try{
      const r=await fetch("./data/news_context.json?v="+Date.now(),{cache:"no-store"});
      if(!r.ok)throw Error(r.status);
      const d=await r.json();const generated=d.generated||d.generatedAt;
      const pill=panel.querySelector(".live-pill");
      if(pill)pill.innerHTML=`<span class="live-dot"></span>Research snapshot · ${generated?`verified ${fmt(generated)} · ${age(generated)}`:"timestamp unavailable"}`;
      let status=panel.querySelector(".v2-external-freshness");
      if(!status){status=document.createElement("div");status.className="v2-external-freshness";status.style.cssText="font-size:11px;color:#aebbd0;margin-top:7px";panel.querySelector(".expert-head")?.after(status)}
      status.textContent=generated?`Latest published research feed: ${fmt(generated)} · ${age(generated)}. Refresh the page or use the research refresh button to reload it.`:"Latest published research timestamp unavailable.";
    }catch(e){console.warn("V2 external freshness check failed",e)}
  }
  function start(){load();setTimeout(load,1500)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
