(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover:hover) and (pointer:fine)');
  const enabled=()=>!reduced.matches&&!document.body.classList.contains('motion-off');
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const cursor=document.createElement('div');cursor.className='spatial-cursor';cursor.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas');canvas.className='spatial-lines';canvas.setAttribute('aria-hidden','true');
  document.body.append(canvas,cursor);const ctx=canvas.getContext('2d');
  const headings=[...document.querySelectorAll('.section-top h2,.about-section h2,.frames-heading h2')];
  const words=[];
  headings.forEach(heading=>{
    heading.setAttribute('aria-label',heading.textContent);
    const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const fragment=document.createDocumentFragment();node.textContent.split(/(\s+)/).forEach(text=>{if(!text.trim()){fragment.append(text);return}const span=document.createElement('span');span.className='spatial-word';span.setAttribute('aria-hidden','true');span.textContent=text;fragment.append(span);words.push(span)});node.replaceWith(fragment)});
  });
  let items=[],w=innerWidth,h=innerHeight,frame=0,lastTime=0,lastY=scrollY,velocity=0,energy=0;
  let x=w/2,y=h/2,cx=x,cy=y,inside=false,active=null;
  const interactive='a,button,select,input';
  function measure(){
    w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);
    items=headings.map(el=>{const old=el.style.transform;el.style.transform='none';const rect=el.getBoundingClientRect();el.style.transform=old;return{el,top:rect.top+scrollY,height:rect.height,words:[...el.querySelectorAll('.spatial-word')]}});wake();
  }
  function tick(now){
    frame=0;if(document.hidden)return;
    const dt=clamp((now-lastTime)/16.67,.25,3);lastTime=now;
    const current=scrollY,delta=current-lastY;lastY=current;velocity+=(delta-velocity)*.22;energy+=(Math.abs(velocity)-energy)*.12;
    const allowed=enabled(),mobile=w<701;
    if(!allowed){words.forEach(el=>el.style.transform='none');cursor.style.opacity=0;ctx.clearRect(0,0,w,h);document.body.classList.remove('spatial-pointer');return}
    const alpha=1-Math.pow(.79,dt);cx+=(x-cx)*alpha;cy+=(y-cy)*alpha;
    const dx=x-cx,dy=y-cy,stretch=clamp(Math.hypot(dx,dy)/160,0,.42);
    document.body.classList.toggle('spatial-pointer',fine.matches&&inside);
    cursor.style.opacity=fine.matches&&inside?'1':'0';
    cursor.style.transform=`translate3d(${cx}px,${cy}px,0) rotate(${Math.atan2(dy,dx)}rad) scale(${1+stretch},${1-stretch*.35})`;
    for(const item of items){
      if(item.top>current+h*1.3||item.top+item.height<current-h*.2)continue;
      const entrance=clamp((item.top-current-h*.64)/(h*.42),0,1);
      item.words.forEach((el,i)=>{const sign=i%2?1:-1,spread=entrance*entrance;el.style.transform=`translate3d(${sign*spread*(mobile?40:260)}px,${spread*(i%3-1)*(mobile?20:90)}px,0) rotate(${sign*spread*24+clamp(velocity*.045,-2,2)}deg) scale(${1+spread*.2},${1-spread*.18})`});
    }
    ctx.clearRect(0,0,w,h);
    // Three independent filaments bend toward the pointer and respond to scroll momentum.
    for(let i=0;i<(mobile?2:3);i++){
      const base=h*(.22+i*.28)+Math.sin(current*.0014+i*2)*h*.15;
      const pull=fine.matches&&inside?Math.exp(-Math.abs(cy-base)/180):0;
      const bend=(cy-base)*pull*.75+clamp(velocity,-40,40)*(i-1)*2;
      ctx.beginPath();ctx.moveTo(-40,base);ctx.bezierCurveTo(w*.28,base-bend,w*.65,base+bend,w+40,base-40*Math.sin(current*.002+i));ctx.strokeStyle=`rgba(196,43,55,${.10+Math.min(energy/250,.14)+pull*.1})`;ctx.lineWidth=.8;ctx.stroke();
    }
    if(inside||Math.abs(velocity)>.08||Math.abs(delta)>.1)frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame){lastTime=performance.now();frame=requestAnimationFrame(tick)}}
  addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;x=e.clientX;y=e.clientY;inside=true;wake()},{passive:true});
  document.addEventListener('pointerleave',()=>{inside=false;wake()});
  document.addEventListener('pointerover',e=>{const target=e.target.closest(interactive);active=target;cursor.classList.toggle('is-action',!!target);cursor.classList.toggle('is-image',!!e.target.closest('.memory-folder,[data-photo],.hero-photo'));cursor.textContent=e.target.closest('.memory-folder,[data-photo]')?'VIEW':target?'↗':''});
  addEventListener('scroll',wake,{passive:true});addEventListener('resize',measure,{passive:true});
  reduced.addEventListener('change',measure);document.querySelector('#motion-toggle')?.addEventListener('click',()=>requestAnimationFrame(measure));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else wake()});
  new ResizeObserver(measure).observe(document.querySelector('main'));document.fonts?.ready.then(measure);measure();
})();
