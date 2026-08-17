/* Indian Stock Pro — live price presentation */
(function(){
  "use strict";
  const FEED="./data/live_quotes.json?ui="+Date.now();
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const money=v=>Number.isFinite(Number(v))?`₹${Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—";
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  let feed=null;
  let lastRenderSignature="";

  function injectStyle(){
    if(document.getElementById("isp-live-price-style"))return;
    const style=document.createElement("style");
    style.id="isp-live-price-style";
    style.textContent=`
      .isp-live-price-box{margin-top:0;text-align:right;line-height:1.2;min-width:150px}
      .isp-live-price-main{font-size:20px;font-weight:900;white-space:nowrap}
      .isp-live-price-meta{font-size:10px;color:#667085;margin-top:4px;white-space:nowrap}
      .isp-live-change{font-size:12px;font-weight:900;margin-top:4px;white-space:nowrap}
      .isp-up{color:#16743b}.isp-down{color:#b42318}.isp-flat{color:#667085}
      .isp-live-tag{display:inline-block;margin-right:5px;padding:2px 5px;border-radius:999px;background:#eaf7ee;color:#16743b;font-size:9px;font-weight:900;vertical-align:2px}
      .isp-live-prev{font-size:10px;color:#667085;margin-top:3px;white-space:nowrap}
      @media(max-width:700px){
        .isp-live-price-box{min-width:120px}
        .isp-live-price-main{font-size:18px}
        .isp-live-price-meta,.isp-live-prev{font-size:9px;white-space:normal}
        .isp-live-change{font-size:11px;white-space:normal}
      }
    `;
    document.head.appendChild(style);
  }

  function symbolFromCard(card){
    const rank=card.querySelector(".rank");
    if(!rank)return null;
    const text=(rank.textContent||"").trim();
    const m=text.match(/^#?\s*\d+\s+([A-Za-z0-9&.-]+)/);
    return m?m[1].toUpperCase():null;
  }

  function renderCard(card,q){
    if(!q)return;
    const el=card.querySelector(".top > div:last-child");
    if(!el)return;

    const price=num(q.price),prev=num(q.previousClose),change=num(q.change),pct=num(q.changePct);
    if(price===null)return;

    const cls=pct===null?"isp-flat":pct>0?"isp-up":pct<0?"isp-down":"isp-flat";
    const pctText=pct===null?"Change unavailable":`${pct>0?"+":""}${pct.toFixed(2)}%`;
    const changeText=change===null?"":`${change>0?"+":""}${money(change)}`;
    const d=q.timestamp?new Date(q.timestamp):null;
    let updated="";
    if(d&&!Number.isNaN(d.getTime()))updated=new Intl.DateTimeFormat("en-IN",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(d)+" IST";

    const html=`
      <div class="isp-live-price-box" aria-label="Live market quote">
        <div class="isp-live-price-main"><span class="isp-live-tag">LIVE</span>${esc(money(price))}</div>
        <div class="isp-live-change ${cls}">${esc(changeText)}${changeText&&pctText?" · ":""}${esc(pctText)}</div>
        <div class="isp-live-prev">Prev close ${esc(money(prev))}</div>
        ${updated?`<div class="isp-live-price-meta">Updated ${esc(updated)}</div>`:""}
      </div>`;

    if(el.innerHTML!==html)el.innerHTML=html;
  }

  function renderAll(){
    if(!feed)return;
    const quotes=feed.quotes||{};
    const cards=[...document.querySelectorAll(".card")];
    const signature=cards.map(card=>{
      const symbol=symbolFromCard(card);
      const q=symbol?quotes[symbol]:null;
      return `${symbol||""}:${q?.price??""}:${q?.previousClose??""}:${q?.change??""}:${q?.changePct??""}:${q?.timestamp??""}`;
    }).join("|");
    if(signature===lastRenderSignature)return;
    lastRenderSignature=signature;
    cards.forEach(card=>{
      const symbol=symbolFromCard(card);
      if(symbol&&quotes[symbol])renderCard(card,quotes[symbol]);
    });
  }

  async function load(){
    injectStyle();
    try{
      const response=await fetch(FEED,{cache:"no-store"});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      feed=await response.json();
      window.indianStockLiveQuotes=feed;
      lastRenderSignature="";
      renderAll();

      /* Do NOT observe body mutations here: renderCard changes the DOM and an
         unguarded MutationObserver would recursively trigger itself and freeze Chrome. */
      window.setInterval(()=>{
        renderAll();
      },5000);
    }catch(error){
      console.warn("Indian Stock Pro live quote layer failed:",error);
    }
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();
