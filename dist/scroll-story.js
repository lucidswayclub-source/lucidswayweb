(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width:1001px) and (min-height:701px)');
  const clamp = v => Math.max(0,Math.min(1,v));
  const smooth = v => {v=clamp(v);return v*v*(3-2*v)};
  const scenes=[];
  const hero=document.querySelector('.desktop-heading');
  const eventsSection=document.querySelector('.events-section');
  const grid=eventsSection?.querySelector('.event-grid');
  const mark=element=>{if(element){element.classList.add('story-controlled');scenes.push(element)}return element};
  const heroText=mark(hero?.firstElementChild);
  const photo=mark(hero?.querySelector('.window-float'));
  const sheet=mark(hero?.querySelector('.depth-one'));
  const orbit=mark(hero?.querySelector('.spatial-orbit'));
  let frame=0, heroStart=0;
  if(!hero)return;
  const enabled=()=>!reduced.matches&&!document.body.classList.contains('motion-off');
  const measure=()=>{
    heroStart=hero?hero.getBoundingClientRect().top+scrollY:0;
    schedule();
  };
  const transform=(el,value)=>{if(el)el.style.transform=value};
  function render(){
    frame=0;
    if(!enabled()){scenes.forEach(el=>{el.style.removeProperty('transform');el.style.removeProperty('clip-path');el.style.removeProperty('opacity')});grid?.style.removeProperty('--travel');return}
    const y=scrollY,h=innerHeight,wide=desktop.matches;
    if(hero){
      const p=smooth((y-heroStart)/(wide?h*.58:h));
      transform(heroText,`translate3d(${-p*(wide?65:0)}px,${-p*40}px,0) rotate(${-p*2}deg)`);
      transform(photo,`translate3d(${p*(wide?50:0)}px,${-p*30}px,0) rotate(${p*7}deg) scale(${1+p*.075})`);
      transform(sheet,`translate3d(${-p*55}px,${p*40}px,0) rotate(${-4-p*12}deg)`);
      transform(orbit,`translate3d(${-p*85}px,${p*105}px,0) rotate(${p*100}deg)`);
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render)}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure,{passive:true});
  reduced.addEventListener('change',measure);desktop.addEventListener('change',measure);
  document.querySelector('#motion-toggle')?.addEventListener('click',()=>requestAnimationFrame(measure));
  new ResizeObserver(measure).observe(hero);
  addEventListener('load',measure,{once:true});document.fonts?.ready.then(measure);measure();
})();
