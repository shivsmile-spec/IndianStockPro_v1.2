/* Indian Stock Pro — live price presentation
   Displays current price, previous close, absolute change and day change %
   from data/live_quotes.json without changing the ranking score.
*/
(function(){
  "use strict";
  const FEED="./data/live_quotes.json?ui="+Date.now();

  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const money=v=>Number.isFinite(Number(v))?`₹${Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
  const num=v=>Number.isFinite(Number(v))?Number(v):null;

  function injectStyle(){
    if(document.getElementById("isp-live-price-style"))return;
    const style=document.createElement("style");
    style.id="isp-live-price-style";
    style.textContent=`
      .isp-live-price-box{margin-top:5px;text-align:right;line-height:1.25}
      .isp-live-price-main{font-size:20px;font-weight:900}
      .isp-live-price-meta{font-size:11px;color:#667085;margin-top:3px}
      .isp-live-change{font-size:11px;font-weight:800;margin-top:2px}
      .isp-up{color:#16743b}.isp-down{color:#b42318}.isp-flat{color:#667085}
      .isp-live-tag{display:inline-block;margin-right:5px;padding:2px 5px;border-radius:999px;background:#eaf7ee;color:#16743b;font-size:9px;font-weight:900;vertical-align:2px}
      @media(max-width:700px){.isp-live-price-main{font-size:18px}.isp-live-price-meta{font-size:10px}}
    `;
    document.head.appendChild(style);
  }

  function symbolFromCard(card){
    const rank=card.querySelector(".rank");
    if(!rank)return null;
    const text=(rank.textContent||"").trim();
    return text.replace(/^#\s*\d+\s*/i,"").split(/\s+/)[0].toUpperCase()||null;
  }

  function formatUpdated(value){
    if(!value)return "Update time unavailable";
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return String(value);
    try{return new Intl.DateTimeFormat("en-IN",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(d)+" IST";}
    catch(e){return d.toLocaleString()+" IST";}
  }

  function renderCard(card, q){
    if(!q)return;
    const priceEl=card.querySelector(".price");
    if(!priceEl)return;
    const price=num(q.price), prev=num(q.previousClose), change=num(q.change), pct=num(q.changePct);
    if(price===null)return;
    const cls=pct===null?"isp-flat":pct>0?"isp-up":pct<0?"isp-down":"isp-flat";
    const pctText=pct===null?"Change unavailable":`${pct>0?"+":""}${pct.toFixed(2)}%`;
    const changeText=change===null?"":` (${change>0?"+":""}${money(change)})`;
    priceEl.innerHTML=`<div class="isp-live-price-box"><div class="isp-live-price-main"><span class="isp-live-tag">LIVE</span>${esc(money(price))}</div><div class="isp-live-change ${cls}">${esc(pctText+changeText)}</div><div class="isp-live-price-meta">Prev close ${esc(money(prev))} · Updated ${esc(formatUpdated(q.timestamp))}</div></div>`;
  }

  function renderAll(feed){
    const quotes=feed?.quotes||{};
    document.querySelectorAll(".card").forEach(card=>{
      const symbol=symbolFromCard(card);
      if(symbol&&quotes[symbol])renderCard(card,quotes[symbol]);
    });
  }

  async function load(){
    injectStyle();
    try{
      const response=await fetch(FEED,{cache:"no-store"});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const feed=await response.json();
      window.indianStockLiveQuotes=feed;
      renderAll(feed);
      /* Reapply after ranking cards are rendered/updated. */
      const observer=new MutationObserver(()=>renderAll(feed));
      observer.observe(document.body,{childList:true,subtree:true});
      window.setTimeout(()=>observer.disconnect(),15000);
    }catch(error){
      console.warn("Indian Stock Pro live price UI could not load quote feed:",error);
    }
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();
