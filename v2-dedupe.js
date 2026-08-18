/* V2 compatibility cleanup: v1.9 already has a dynamic institutional panel. */
(function(){
  function clean(){
    const canonical=document.getElementById("institutionalResearchPanel");
    const extra=document.getElementById("isp-institutional");
    if(canonical&&extra)extra.remove();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{clean();setTimeout(clean,1000);setTimeout(clean,3000)});else{clean();setTimeout(clean,1000);setTimeout(clean,3000)}
})();
