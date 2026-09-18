(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover:hover) and (pointer:fine)');
  const enabled=()=>!reduced.matches&&!document.body.classList.contains('motion-off');
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const cursor=document.createElement('div');cursor.className='spatial-cursor';cursor.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas');canvas.className='spatial-lines';canvas.setAttribute('aria-hidden','true');
  document.body.append(canvas,cursor);const ctx=canvas.getContext('2d');
  const headings=[],words=[];
  let items=[],w=innerWidth,h=innerHeight,frame=0,lastTime=0,lastLines=0,lastY=scrollY,velocity=0,energy=0;
  let x=w/2,y=h/2,cx=x,cy=y,inside=false,active=null;
  const interactive='a,button,select,input';
  function measure(){
    w=innerWidth;h=innerHeight;const d=1;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);
    items=headings.map(el=>{const old=el.style.transform;el.style.transform='none';const rect=el.getBoundingClientRect();el.style.transform=old;return{el,top:rect.top+scrollY,height:rect.height,words:[...el.querySelectorAll('.spatial-word')]}});wake();
  }
  function tick(now){
    frame=0;if(document.hidden)return;
    const dt=clamp((now-lastTime)/16.67,.25,3);lastTime=now;
    const current=scrollY,delta=current-lastY;lastY=current;velocity+=(delta-velocity)*.22;energy+=(Math.abs(velocity)-energy)*.12;
    const allowed=enabled(),mobile=w<701;
    if(!allowed){words.forEach(el=>{el.style.transform='none';el.style.opacity='1';el.style.clipPath='none'});cursor.style.opacity=0;ctx.clearRect(0,0,w,h);document.body.classList.remove('spatial-pointer');return}
    const alpha=1-Math.pow(.4,dt);cx+=(x-cx)*alpha;cy+=(y-cy)*alpha;
    const dx=x-cx,dy=y-cy,stretch=clamp(Math.hypot(dx,dy)/160,0,.42);
    const dialogOpen=!!document.querySelector('dialog[open]');
    document.body.classList.toggle('spatial-pointer',fine.matches&&inside&&!dialogOpen);
    cursor.style.opacity=fine.matches&&inside&&!dialogOpen?'1':'0';
    cursor.style.transform=`translate3d(${cx}px,${cy}px,0) rotate(${Math.atan2(dy,dx)}rad) scale(${1+stretch},${1-stretch*.35})`;
    for(const item of items){
      if(item.top>current+h*1.3||item.top+item.height<current-h*.2)continue;
      const entrance=clamp((item.top-current-h*.72)/(h*.3),0,1);
      item.words.forEach((el,i)=>{const phase=clamp(entrance*(1+Math.min(i,8)*.035),0,1);el.style.transform=`translate3d(${phase*35}px,${phase*22}px,0)`;el.style.opacity=String(1-phase);el.style.clipPath=`inset(0 ${phase*100}% 0 0)`});
    }
    if(now-lastLines>=33){
    lastLines=now;
    ctx.clearRect(0,0,w,h);
    // Three independent filaments bend toward the pointer and respond to scroll momentum.
    for(let i=0;i<(mobile?2:3);i++){
      const base=h*(.22+i*.28)+Math.sin(current*.0014+i*2)*h*.15;
      const pull=fine.matches&&inside?Math.exp(-Math.abs(cy-base)/180):0;
      const bend=(cy-base)*pull*.75+clamp(velocity,-40,40)*(i-1)*2;
      ctx.beginPath();ctx.moveTo(-40,base);ctx.bezierCurveTo(w*.28,base-bend,w*.65,base+bend,w+40,base-40*Math.sin(current*.002+i));ctx.strokeStyle=`rgba(196,43,55,${.10+Math.min(energy/250,.14)+pull*.1})`;ctx.lineWidth=.8;ctx.stroke();
    }
    }
    if((inside&&Math.hypot(x-cx,y-cy)>.1)||Math.abs(velocity)>.08||Math.abs(delta)>.1||energy>.1)frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame){lastTime=performance.now();frame=requestAnimationFrame(tick)}}
  addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;x=e.clientX;y=e.clientY;if(!inside){cx=x;cy=y;}inside=true;wake()},{passive:true});
  document.addEventListener('pointerleave',()=>{inside=false;wake()});
  document.addEventListener('pointerover',e=>{const target=e.target.closest(interactive);active=target;cursor.classList.toggle('is-action',!!target);cursor.classList.toggle('is-image',!!e.target.closest('.memory-folder,[data-photo],.hero-photo'));cursor.textContent=''});
  addEventListener('scroll',wake,{passive:true});addEventListener('resize',measure,{passive:true});
  reduced.addEventListener('change',measure);document.querySelector('#motion-toggle')?.addEventListener('click',()=>requestAnimationFrame(measure));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0}else wake()});
  measure();
})();
