/* Bridge global lexical dashboard state to V2 research tools. */
(function(){
  function sync(){
    try{
      if(typeof integrated!=="undefined") window.integrated=integrated;
      if(typeof quantitative!=="undefined") window.quantitative=quantitative;
    }catch(e){}
  }
  sync();
  setInterval(sync,1000);
})();
