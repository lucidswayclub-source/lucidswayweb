(() => {
 const scene=document.querySelector('.hero-scene');if(!scene)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const slides=albums.slice(0,3);let current=0,timer,visible=true;
 scene.classList.add('memory-deck');
 scene.innerHTML=`<div class="deck-label">SOMEWHERE BETWEEN MUSIC & MAGIC</div><div class="deck-stage">${slides.map((a,i)=>`<button class="deck-card" data-index="${i}" aria-label="Show next memory: ${a.title}"><span class="deck-chrome"><span class="deck-lights">● ● ●</span><span>lucids / memories_0${i+1}</span><span>↗</span></span><span class="deck-image"><img src="${a.photos[0]}" alt="${a.title} Concert lights and crowd" draggable="false"><span class="deck-caption"><small>VOLUME UP. WORLD OFF.</small><strong>${a.title}</strong></span></span><span class="deck-foot"><span>THE LUCID’S WAY</span><span>FRAME 0${i+1}</span></span></button>`).join('')}</div><div class="deck-controls"><a class="deck-open" href="/memories/${slides[0].id}/">Open the memory folder ↗</a><div><button class="deck-prev" aria-label="Previous memory">←</button><span class="deck-count" aria-live="polite">01 / 03</span><button class="deck-next" aria-label="Next memory">→</button></div></div>`;
 const cards=[...scene.querySelectorAll('.deck-card')];
 function paint(){cards.forEach((card,i)=>{const pos=(i-current+3)%3;card.dataset.position=pos;card.tabIndex=pos===0?0:-1;card.setAttribute('aria-hidden',String(pos!==0));});scene.querySelector('.deck-count').textContent=`0${current+1} / 03`;scene.querySelector('.deck-open').href=`/memories/${slides[current].id}/`}
 const allowed=()=>!reduced.matches&&!document.body.classList.contains('motion-off')&&!document.hidden&&visible&&!scene.matches(':hover,:focus-within');
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(allowed())advance(1);else schedule()},6000)}
 function advance(direction){const focused=cards.includes(document.activeElement);current=(current+direction+3)%3;paint();if(focused)cards[current].focus({preventScroll:true});schedule()}
 cards.forEach(card=>card.addEventListener('click',()=>advance(1)));
 scene.querySelector('.deck-prev').addEventListener('click',()=>advance(-1));scene.querySelector('.deck-next').addEventListener('click',()=>advance(1));
 scene.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();advance(e.key==='ArrowRight'?1:-1)}});
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;scene.classList.toggle('deck-paused',!visible)}).observe(scene);
 // A localized displacement lens disturbs the image under the pointer.
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('liquid-defs');svg.setAttribute('aria-hidden','true');svg.innerHTML='<filter id="deck-liquid" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".018 .035" numOctaves="2" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G"/></filter>';scene.append(svg);
 const lenses=cards.map(card=>{const img=card.querySelector('.deck-image img');const lens=img.cloneNode();lens.alt='';lens.setAttribute('aria-hidden','true');lens.className='liquid-lens';img.after(lens);return lens});
 let pending=0;
 scene.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||reduced.matches||document.body.classList.contains('motion-off'))return;if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const card=cards[current],photo=card.querySelector('.deck-image'),r=photo.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;scene.style.setProperty('--deck-x',`${(x-.5)*8}deg`);scene.style.setProperty('--deck-y',`${-(y-.5)*6}deg`);lenses.forEach((lens,i)=>{lens.style.setProperty('--liquid-x',`${x*100}%`);lens.style.setProperty('--liquid-y',`${y*100}%`);lens.classList.toggle('visible',i===current&&x>0&&y>0&&x<1&&y<1)});});});
 scene.addEventListener('pointerleave',()=>{lenses.forEach(lens=>lens.classList.remove('visible'));scene.style.setProperty('--deck-x','0deg');scene.style.setProperty('--deck-y','0deg')});
 paint();schedule();addEventListener('pagehide',()=>{clearTimeout(timer);cancelAnimationFrame(pending)},{once:true});
})();
