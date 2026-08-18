/* Indian Stock Pro — NIFTY 50 + SENSEX market strip */
(function(){
  "use strict";
  const FEED="./data/live_quotes.json?indices="+Date.now();
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const fmt=v=>num(v)!==null?num(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}):"—";

  function inject(){
    if(document.getElementById("isp-market-index-css"))return;
    const s=document.createElement("style");s.id="