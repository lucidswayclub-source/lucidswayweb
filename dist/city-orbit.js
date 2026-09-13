const collective=document.querySelector('.about-section');
if(collective){
 const icons={coast:'<path d="M3 16c3-4 5 4 9 0s6 4 9 0M3 21c3-4 5 4 9 0s6 4 9 0M12 3v9m-4-6 4-3 4 3"/>',arches:'<path d="M5 21V8h14v13M3 21h18M9 21v-5a3 3 0 0 1 6 0v5M5 8V3m14 5V3M3 8h18M9 8V5h6v3"/>',garden:'<path d="M12 21v-9m0 4C4 16 3 10 4 5c6 0 8 4 8 7 0-3 2-7 8-7 1 5 0 11-8 11ZM8 21h8"/>'};
 const cities=[['Visakhapatnam','coast'],['Hyderabad','arches'],['Bengaluru','garden']];
 const orbit=document.createElement('div');orbit.className='city-orbit';orbit.setAttribute('role','img');orbit.setAttribute('aria-label','Visakhapatnam, Hyderabad and Bengaluru revolving around a shared orbit');
 orbit.innerHTML='<div class="city-orbit-ring" aria-hidden="true"></div><div class="city-orbit-ring ring-inner" aria-hidden="true"></div><div class="city-orbit-center" aria-hidden="true">✳<small>ONE FREQUENCY</small></div>'+cities.map(([name,icon],i)=>`<div class="orbit-city" aria-hidden="true" style="--phase:${i}"><span class="city-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${icons[icon]}</svg></span><span>${name}</span></div>`).join('');collective.append(orbit);
 const chips=[...orbit.querySelectorAll('.orbit-city')];const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame,last=0,angle=0,visible=false;
 function paint(){const radius=Math.min(orbit.clientWidth,orbit.clientHeight)*.39;chips.forEach((chip,i)=>{const theta=angle+i*Math.PI*2/3;chip.style.transform=`translate(-50%,-50%) translate(${Math.sin(theta)*radius}px,${Math.cos(theta)*radius}px)`;chip.style.opacity='1';chip.style.zIndex='3'})}
 function permitted(){return visible&&!document.hidden&&!reduced.matches&&!document.body.classList.contains('motion-off')}
 function tick(time){if(!permitted()){frame=undefined;last=0;return}if(last)angle+=(Math.min(time-last,50)/1000)*Math.PI/12;last=time;paint();frame=requestAnimationFrame(tick)}
 function sync(){if(frame)cancelAnimationFrame(frame);frame=undefined;last=0;paint();if(permitted())frame=requestAnimationFrame(tick)}
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()}).observe(collective);new ResizeObserver(paint).observe(orbit);reduced.addEventListener('change',sync);document.querySelector('#motion-toggle')?.addEventListener('click',sync);document.addEventListener('visibilitychange',sync);paint();
}
