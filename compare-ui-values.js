/* Trial-only Compare value bridge.
 * Populates Compare UI from the same published datasets already used by the app.
 */
(function(){
  "use strict";
  function getSymbols(){try{return JSON.parse(sessionStorage.getItem("isp_compare")||"[]")}catch(e){return []}}
  function findStock(sym){
    var s=(Array.isArray(window.integrated)?window.integrated:[]).find(function(x){return String(x.symbol||"").toUpperCase()===String(sym).toUpperCase()})||null;
    return s;
  }
  function fundamental(sym){var d=window.__ispTrialFundamentals||{};return d[String(sym).toUpperCase()]||null}
  function money(v){var n=Number(v);return Number.isFinite(n)?"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2}):"—"}
  function score(v){var n=Number(v);return Number.isFinite(n)?n.toFixed(1)+"/100":"—"}
  function price(s){
    if(!s)return null;
    if(s.liveQuote&&Number.isFinite(Number(s.liveQuote.price)))return s.liveQuote.price;
    if(Number.isFinite(Number(s.price)))return s.price;
    if(Number.isFinite(Number(s.livePrice)))return s.livePrice;
    return null;
  }
  function renderValues(){
    var panel=document.getElementById("isp-trial-compare-panel");if(!panel)return;
    var cards=panel.querySelectorAll(".isp-tc-card");
    cards.forEach(function(card){
      var sym=card.querySelector(".isp-tc-symbol");if(!sym)return;
      var stock=findStock(sym.textContent.trim()), f=fundamental(sym.textContent.trim());
      var vals={
        "Price":money(price(stock)),
        "Integrated":score(stock&&stock.integratedScore),
        "Quantitative":score(stock&&(stock.quantitativeScore!=null?stock.quantitativeScore:stock.quantitative)),
        "Confidence":score(stock&&stock.confidence),
        "Fundamental":score(f&&f.score),
        "Health":f&&f.health?f.health:"—"
      };
      card.querySelectorAll(".isp-tc-row").forEach(function(row){
        var label=row.querySelector(".isp-tc-label"),value=row.querySelector(".isp-tc-value");
        if(label&&value&&Object.prototype.hasOwnProperty.call(vals,label.textContent.trim()))value.textContent=vals[label.textContent.trim()];
      });
    });
  }
  function start(){
    renderValues();
    var observer=new MutationObserver(renderValues);observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(function(){observer.disconnect()},120000);
    setInterval(renderValues,2000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
