// Keep the full-width section measurement without scroll listeners or card transforms.
(() => {
  const measure=()=>document.documentElement.style.setProperty('--screen-width',document.documentElement.clientWidth+'px');
  addEventListener('resize',measure,{passive:true});measure();
})();
