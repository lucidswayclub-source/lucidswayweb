(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const selector='.story-message h2,.story-message p,.story-message a,.city-select,.card-bottom,.about-section>a,.deck-controls,.album-heading p,.booking-form,.frames-heading p,.event-card,.memory-folder,.scattered-photo,.memory-print,.about-section>p,.desktop-heading>div>p';
 let items=[],frame=0;const clamp=x=>Math.max(0,Math.min(1,x));
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('scroll-tethers');svg.setAttribute('aria-hidden','true');document.body.append(svg);
 function measure(){
   document.documentElement.style.setProperty('--screen-width',document.documentElement.clientWidth+'px');
   svg.innerHTML='';
   items=[...document.querySelectorAll(selector)].map((el,i)=>{el.classList.add('motion-reveal');const previous=[el.style.translate,el.style.rotate,el.style.scale];el.style.translate='none';el.style.rotate='none';el.style.scale='none';const top=el.getBoundingClientRect().top+scrollY;[el.style.translate,el.style.rotate,el.style.scale]=previous;
    const card=el.matches('.event-card,.memory-folder,.scattered-photo,.memory-print');const tether=el.matches('.city-select,.about-section>a,.story-message a');let path;
    if(tether){path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('pathLength','1');svg.append(path)}return{el,top,height:el.offsetHeight,card,path,i};});schedule();
 }
 function render(){frame=0;const off=reduced.matches||document.body.classList.contains('motion-off');const h=innerHeight,w=innerWidth;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.opacity=off?'0':'1';
   items.forEach(({el,top,height,card,path,i})=>{
    const focus=el.contains(document.activeElement);const enter=off||focus?0:clamp((top-scrollY-h*.72)/(h*.35));const exit=off||focus?0:clamp((scrollY-top-height*.2)/(h*.65));const sign=i%2?1:-1;
    const rise=enter*enter;el.style.translate=`${rise*(card?sign*Math.min(100,w*.08):path?-110:0)}px ${rise*(card?115:65)-exit*exit*(card?100:15)}px`;
    el.style.rotate=`${card?'1 0.2 0':'1 0 0'} ${card?rise*38-exit*62:rise*16}deg`;el.style.scale=String(card?1-rise*.13-exit*.12:1);el.style.opacity=String(1-rise*.92);
    if(path){const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;const progress=1-enter;path.setAttribute('d',`M -60 ${y+170} C ${w*.2} ${y+220}, ${x-210} ${y-135}, ${x} ${y}`);path.style.strokeDasharray='1';path.style.strokeDashoffset=String(1-progress);path.style.opacity=String(!off&&y>-100&&y<h+100?Math.sin(progress*Math.PI)*.8:0)}
   });
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render)}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure,{passive:true});
 reduced.addEventListener('change',schedule);document.querySelector('#motion-toggle')?.addEventListener('click',schedule);
 new ResizeObserver(measure).observe(document.querySelector('main'));document.fonts?.ready.then(measure);
 document.querySelector('#event-grid')&&new MutationObserver(measure).observe(document.querySelector('#event-grid'),{childList:true});
 document.addEventListener('focusin',schedule);measure();
})();
