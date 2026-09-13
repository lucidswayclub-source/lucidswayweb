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
  const about=document.querySelector('.about-section');
  const aboutHeading=mark(about?.querySelector('h2'));
  const city=mark(about?.querySelector('.city-orbit'));
  const archive=document.querySelector('#archive');
  const folders=[...document.querySelectorAll('.memory-folder')].map(mark);
  const prints=[...document.querySelectorAll('.scattered-photo,.memory-print')].map(mark);
  let frame=0, measures=[], heroStart=0;
  const enabled=()=>!reduced.matches&&!document.body.classList.contains('motion-off');
  const measure=()=>{
    heroStart=hero?hero.getBoundingClientRect().top+scrollY:0;
    measures=[about,archive,...prints].filter(Boolean).map(el=>{ const previous=el.style.transform; el.style.transform='none'; const top=el.getBoundingClientRect().top+scrollY; el.style.transform=previous; return {el,top,height:el.offsetHeight}; });
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
    for(const item of measures){
      const p=clamp((y+h-item.top)/(h+item.height));
      if(item.el===about){transform(aboutHeading,`translate3d(${(1-smooth(p*2))* (wide?60:15)}px,0,0)`);transform(city,`rotate(${(p-.5)*32}deg) scale(${.86+p*.22})`)}
      else if(item.el===archive){folders.forEach((el,i)=>{const settle=smooth((p-.04-i*.025)*2.5);const direction=i%2?1:-1;transform(el,`translate3d(${direction*(1-settle)*(wide?65:12)}px,${(1-settle)*(70+i*22)}px,0) rotate(${direction*(1-settle)*9}deg)`);})}
      else {const i=prints.indexOf(item.el),signed=i%2?1:-1;transform(item.el,`translate3d(${signed*(.5-p)*(wide?45:12)}px,${(.5-p)*42}px,0) rotate(${signed*(.5-p)*9}deg)`)}
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render)}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure,{passive:true});
  reduced.addEventListener('change',measure);desktop.addEventListener('change',measure);
  document.querySelector('#motion-toggle')?.addEventListener('click',()=>requestAnimationFrame(measure));
  new ResizeObserver(measure).observe(document.querySelector('main'));
  grid&&new MutationObserver(measure).observe(grid,{childList:true});
  addEventListener('load',measure,{once:true});document.fonts?.ready.then(measure);measure();
})();
