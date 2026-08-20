/* Indian Stock Pro — single reliable browser-side market feed refresher */
(function(){
  'use strict';
  const LOCAL_INDEX='./data/index_quotes.json';
  const RAW_INDEX='https://raw.githubusercontent.com/shivsmile-spec/IndianStockPro_v1.2/main/data/index_quotes.json';
  const LOCAL_QUOTES='./data/live_quotes.json';
  const RAW_QUOTES='https://raw.githubusercontent.com/shivsmile-spec/IndianStockPro_v1.2/main/data/live_quotes.json';
  let busy=false;
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const money=v=>num(v)!==null?'₹'+num(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  async function get(local,raw){
    const q='?fresh='+Date.now();
    let r=await fetch(local+q,{cache:'no-store'});
    if(r.ok){try{const d=await r.clone().json();if(freshEnough(d))return d;}catch(e){}}
    r=await fetch(raw+q,{cache:'no-store'});
    if(!r.ok)throw new Error('feed HTTP '+r.status);
    return await r.json();
  }
  function freshEnough(d){const t=Date.parse(d?.generatedAt||'');return Number.isFinite(t)&&(Date.now()-t)<10*60*1000;}
  function updateIndex(data){
    const p=document.getElementById('isp-market-indices');if(!p)return;
    [['NIFTY 50','NIFTY50'],['SENSEX','SENSEX']].forEach((x,i)=>{
      const q=data?.indices?.[x[1]],c=p.querySelectorAll('.isp-index-card')[i];if(!q||!c)return;
      const v=num(q.value),ch=num(q.change),pct=num(q.changePct),val=c.querySelector('.isp-index-value'),change=c.querySelector('.isp-index-change'),meta=c.querySelector('.isp-index-meta');
      if(val)val.textContent=v===null?'—':money(v);
      if(change){change.className='isp-index-change '+(pct===null?'isp-index-neutral':pct>=0?'isp-index-up':'isp-index-down');change.textContent=ch===null?'Change unavailable':`${ch>0?'+':''}${ch.toFixed(2)}${pct===null?'':` · ${pct>0?'+':''}${pct.toFixed(2)}%`}`;}
      if(meta)meta.textContent=`Updated ${q.timestamp?new Date(q.timestamp).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})+' IST':'timestamp unavailable'} · ${q.source||'Published market feed'}`;
    });
    const s=p.querySelector('#ispIndexStatus');if(s)s.textContent=`Published market feed · generated ${data.generatedAt?new Date(data.generatedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})+' IST':'unknown'} · browser checked ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} IST`;
  }
  function updateCards(feed){
    const quotes=feed?.quotes||{};
    document.querySelectorAll('.card').forEach(card=>{
      const rank=card.querySelector('.rank');if(!rank)return;const m=(rank.textContent||'').trim().match(/^#?\s*\d+\s+([A-Za-z0-9&.-]+)/);if(!m)return;const q=quotes[m[1].toUpperCase()];if(!q||num(q.price)===null)return;const target=card.querySelector('.top > div:last-child');if(!target)return;
      const p=num(q.price),ch=num(q.change),pct=num(q.changePct),prev=num(q.previousClose),cls=pct===null?'isp-flat':pct>=0?'isp-up':'isp-down',ts=q.timestamp?new Date(q.timestamp):null,when=ts&&!Number.isNaN(ts.getTime())?new Intl.DateTimeFormat('en-IN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(ts)+' IST':'';
      target.innerHTML=`<div class="isp-live-price-box"><div class="isp-live-price-main"><span class="isp-live-tag">LIVE</span>${esc(money(p))}</div><div class="isp-live-change ${cls}">${ch===null?'':esc((ch>0?'+':'')+money(ch))}${ch!==null&&pct!==null?' · ':''}${pct===null?'Change unavailable':esc((pct>0?'+':'')+pct.toFixed(2)+'%')}</div><div class="isp-live-prev">Prev close ${esc(money(prev))}</div>${when?`<div class="isp-live-price-meta">Updated ${esc(when)}</div>`:''}</div>`;
    });
    if(window.integrated&&Array.isArray(window.integrated))window.integrated.forEach(s=>{const q=quotes[String(s.symbol||'').toUpperCase()];if(q&&num(q.price)!==null){s.liveQuote=q;s.price=num(q.price);}});
    const text=document.getElementById('liveQuoteText');if(text)text.textContent=`${Object.keys(quotes).length} published stock quotes · feed generated ${feed.generatedAt?new Date(feed.generatedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})+' IST':'unknown'} · browser checked ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} IST`;
  }
  async function refresh(){if(busy)return;busy=true;try{const [idx,quotes]=await Promise.all([get(LOCAL_INDEX,RAW_INDEX),get(LOCAL_QUOTES,RAW_QUOTES)]);updateIndex(idx);updateCards(quotes);window.indianStockReliableFeed={index:idx,quotes};}catch(e){console.warn('Reliable market feed refresh failed',e);}finally{busy=false;}}
  function start(){refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('focus',refresh);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
