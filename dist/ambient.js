(() => {
  const field=document.createElement('div');field.className='ambient-field';field.setAttribute('aria-hidden','true');field.innerHTML='<i></i><i></i><i></i>';document.body.prepend(field);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
  addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||reduced.matches||document.body.classList.contains('motion-off')||frame)return;
    const x=(event.clientX/innerWidth-.5)*100,y=(event.clientY/innerHeight-.5)*70;
    frame=requestAnimationFrame(()=>{field.style.setProperty('--ambient-x',`${x}px`);field.style.setProperty('--ambient-y',`${y}px`);frame=0});
  },{passive:true});
  document.addEventListener('visibilitychange',()=>field.classList.toggle('ambient-paused',document.hidden));
})();
