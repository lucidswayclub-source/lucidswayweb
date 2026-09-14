/* A same-document journey: source photo → event identity → orbital archive. */
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const quiet=()=>reduced.matches||document.body.classList.contains('motion-off');
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 let root=null,active=null,phase='closed',angle=0,velocity=0,raf=0,last=0,introStart=0,previewIndex=-1,opener=null,origin=null,paused=false,hover=-1,generation=0;
 let cards=[],background=[],touchY=null,animations=[];
 const initialTitle=document.title,initialOverflow=document.body.style.overflow;
 const albumAtPath=()=>albums.find(a=>location.pathname===`/memories/${a.id}/`||location.pathname===`/memories/${a.id}`);
 const animate=(el,frames,options)=>{const a=el.animate(frames,options);animations.push(a);return a.finished.catch(()=>{})};
 function lock(){background=[...document.body.children].filter(el=>el!==root&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.inert]);background.forEach(([el])=>el.inert=true);document.body.style.overflow='hidden';document.body.classList.add('portal-open')}
 function unlock(){background.forEach(([el,inert])=>el.inert=inert);background=[];document.body.style.overflow=initialOverflow;document.body.classList.remove('portal-open')}
 function build(a){
  root=document.createElement('section');root.className=`memory-portal identity-${a.id}`;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','portal-title');root.tabIndex=-1;
  root.innerHTML=`<div class="portal-atmosphere" aria-hidden="true"></div><div class="portal-ring" aria-hidden="true"></div><header class="portal-header"><button class="portal-return" aria-label="Return to previous events">← Previous events</button><span>MEMORY ARCHIVE</span><button class="portal-pause" aria-pressed="false">Pause motion</button></header><div class="portal-identity"><span>THE LUCID’S WAY</span><h1 id="portal-title">${a.title.replace('.','')}</h1><p>${a.subtitle}</p></div><div class="portal-stage" aria-label="Event photographs">${a.photos.map((src,i)=>`<button class="portal-photo" data-orbit="${i}" aria-label="Open photo ${i+1}: ${a.captions[i]}"><img src="${src}" alt="${a.captions[i]}" draggable="false"><span>${String(i+1).padStart(2,'0')} / ${a.captions[i]}</span></button>`).join('')}</div><footer class="portal-footer"><div class="portal-steering"><button class="orbit-back" aria-label="Move backward through memories">←</button><span>Scroll or swipe to explore</span><button class="orbit-forward" aria-label="Move forward through memories">→</button></div><nav aria-label="Previous event collections">${albums.map(item=>`<button data-album="${item.id}" aria-current="${item.id===a.id?'page':'false'}">${item.title}</button>`).join('')}</nav><small>Sample photography</small></footer><button class="portal-skip">Skip intro ↗</button><div class="portal-preview" hidden role="dialog" aria-modal="true" aria-label="Full-screen photograph"><header><span class="preview-label" aria-live="polite"></span><button class="preview-close" aria-label="Close photo">×</button></header><img class="preview-image" alt=""><footer><button class="preview-prev" aria-label="Previous photo">←</button><span class="preview-caption"></span><button class="preview-next" aria-label="Next photo">→</button></footer></div>`;
  document.body.append(root);cards=[...root.querySelectorAll('.portal-photo')];bind();
 }
 function dispose(){generation++;cancelAnimationFrame(raf);raf=0;animations.forEach(a=>a.cancel());animations=[];if(root){unlock();root.remove();root=null}phase='closed';previewIndex=-1;cards=[]}
 async function enter(a,source,push=true){
  if(phase==='dive')return;
  const sourceImage=source?.querySelector('.sheet-front img,.deck-image img,img');const rect=sourceImage?.getBoundingClientRect();const src=sourceImage?.currentSrc||a.photos[0];
  if(root)dispose();opener=source||opener;active=a;angle=0;velocity=0;paused=quiet();hover=-1;build(a);lock();const token=++generation;phase='dive';root.classList.add('is-diving');root.focus({preventScroll:true});
  if(push){history.pushState({memoryPortal:a.id},'',`/memories/${a.id}/`)}document.title=`${a.title} — Memory portal`;
  root.querySelector('.portal-pause').textContent=paused?'Resume motion':'Pause motion';root.querySelector('.portal-pause').setAttribute('aria-pressed',String(paused));
  if(!quiet()){
   animate(root,[{backgroundColor:'rgba(5,5,5,0)'},{backgroundColor:'rgba(5,5,5,.8)',offset:.35},{backgroundColor:'#050505'}],{duration:1550,fill:'forwards'});
   const dive=document.createElement('img');dive.className='portal-dive-photo';dive.src=src;dive.alt='';root.append(dive);
   const r=rect&&rect.width>0?rect:{left:innerWidth*.2,top:innerHeight*.2,width:innerWidth*.6,height:innerHeight*.6};
   dive.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
   await animate(dive,[{transform:'perspective(1000px) scale(1) rotateY(0deg)',filter:'blur(0px)',opacity:1},{offset:.48,transform:`perspective(1000px) translate(${innerWidth/2-r.left-r.width/2}px,${innerHeight/2-r.top-r.height/2}px) scale(1.6) rotateY(-7deg)`,filter:'blur(1px)',opacity:1},{transform:`perspective(1000px) translate(${innerWidth/2-r.left-r.width/2}px,${innerHeight/2-r.top-r.height/2}px) scale(${Math.max(innerWidth/r.width,innerHeight/r.height)*3.5}) rotateY(4deg)`,filter:'blur(12px)',opacity:0}],{duration:1550,easing:'cubic-bezier(.55,.02,.2,1)',fill:'forwards'});
   if(token!==generation)return;dive.remove();
  }
  root.classList.remove('is-diving');phase=quiet()?'orbit':'intro';introStart=performance.now();root.classList.add(quiet()?'is-orbit':'is-intro');root.querySelector('.portal-skip').hidden=quiet();last=performance.now();raf=requestAnimationFrame(tick);
 }
 function finishIntro(){if(phase!=='intro')return;phase='orbit';root.classList.remove('is-intro');root.classList.add('is-orbit');root.querySelector('.portal-skip').hidden=true;}
 function tick(now){raf=0;if(!root)return;const dt=clamp(now-last,0,32);last=now;
  if(!document.hidden&&previewIndex<0){
   if(phase==='intro'&&now-introStart>3100)finishIntro();
   if(phase==='orbit'&&!quiet()&&!paused&&hover<0){angle+=velocity*dt/16.67+dt*.000045;velocity*=Math.pow(.935,dt/16.67)}
   const p=phase==='intro'?clamp((now-introStart-900)/2200,0,1):phase==='dive'?0:1;const spread=p*p*(3-2*p);
   cards.forEach((card,i)=>{
    const theta=angle+i/cards.length*Math.PI*2,depth=(Math.cos(theta)+1)/2;const w=innerWidth,h=innerHeight;
    const x=Math.sin(theta)*Math.min(w*.37,600),y=Math.cos(theta*1.3+albums.indexOf(active))*(h<600?h*.11:h*.17),z=Math.cos(theta)*260;
    const variant=active.id==='in-the-moment'? (i-2)*140:active.id==='one-more-song'?Math.sin(i*2)*300:0;
    const startX=variant,startY=active.id==='after-hours'?(i-2)*75:0;
    card.style.transform=`translate3d(calc(-50% + ${startX*(1-spread)+x*spread}px),calc(-50% + ${startY*(1-spread)+y*spread}px),${-900*(1-spread)+z*spread}px) rotateY(${-Math.sin(theta)*22*spread}deg) rotateZ(${(1-spread)*(active.id==='one-more-song'?i*35:0)}deg) scale(${.72+depth*.28})`;
    card.style.zIndex=String(Math.round(depth*100));card.style.opacity=String((.38+depth*.62)*(phase==='dive'?.2:1));card.style.filter=`brightness(${.5+depth*.5}) blur(${quiet()?0:Math.min(Math.abs(velocity)*11,2)*(1-depth*.6)}px)`;
   });
  }raf=requestAnimationFrame(tick);
 }
 function impulse(value){if(phase==='intro'){finishIntro()}if(phase!=='orbit'||previewIndex>=0)return;if(quiet()||paused){angle+=value;velocity=0}else{velocity=clamp(velocity+value,-.16,.16)}}
 async function showPhoto(n){if(previewIndex>=0||phase!=='orbit')return;previewIndex=n;hover=-1;origin=cards[n];const box=origin.getBoundingClientRect();const preview=root.querySelector('.portal-preview');const img=preview.querySelector('img');updatePhoto(n);preview.hidden=false;
  root.querySelector('.portal-stage').inert=true;root.querySelector('.portal-header').inert=true;root.querySelector('.portal-footer').inert=true;img.style.opacity='0';origin.style.visibility='hidden';
  if(!quiet())await fly(active.photos[n],box,{left:innerWidth*.06,top:innerHeight*.12,width:innerWidth*.88,height:innerHeight*.76},false);
  if(!root||previewIndex<0)return;img.style.opacity='1';preview.querySelector('.preview-close').focus();
 }
 function updatePhoto(n){previewIndex=(n+active.photos.length)%active.photos.length;const preview=root.querySelector('.portal-preview');preview.querySelector('img').src=active.photos[previewIndex];preview.querySelector('img').alt=active.captions[previewIndex];preview.querySelector('.preview-label').textContent=`${active.title} / ${previewIndex+1} of ${active.photos.length}`;preview.querySelector('.preview-caption').textContent=active.captions[previewIndex];}
 async function fly(src,from,to,closing){const el=document.createElement('img');el.className='portal-photo-flight';el.src=src;el.alt='';root.append(el);el.style.cssText=`left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;
  await animate(el,[{transform:'translate(0,0) scale(1)',opacity:1,borderRadius:'12px'},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`,opacity:1,borderRadius:closing?'12px':'0'}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});el.remove();}
 async function closePhoto(){if(previewIndex<0||phase==='closing-photo')return;phase='closing-photo';const n=previewIndex,target=cards[n],preview=root.querySelector('.portal-preview'),img=preview.querySelector('img');const box=img.getBoundingClientRect();img.style.opacity='0';preview.classList.add('is-closing');
  if(!quiet())await fly(active.photos[n],box,target.getBoundingClientRect(),true);if(!root)return;
  preview.hidden=true;preview.classList.remove('is-closing');origin.style.visibility='';cards.forEach(c=>c.style.visibility='');previewIndex=-1;phase='orbit';root.querySelector('.portal-stage').inert=false;root.querySelector('.portal-header').inert=false;root.querySelector('.portal-footer').inert=false;target.focus({preventScroll:true});
 }
 function leave(){if(history.state?.memoryPortal){history.back()}else location.assign('/#archive')}
 function bind(){
  root.addEventListener('wheel',e=>{if(e.ctrlKey||previewIndex>=0)return;e.preventDefault();impulse(clamp(e.deltaY*(e.deltaMode===1?16:1),-150,150)*.00065)},{passive:false});
  root.addEventListener('touchstart',e=>{touchY=e.touches[0].clientY},{passive:true});root.addEventListener('touchmove',e=>{if(previewIndex>=0)return;const y=e.touches[0].clientY;if(touchY!==null){e.preventDefault();impulse((touchY-y)*.002)}touchY=y},{passive:false});
  root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||phase==='closing-photo')return;if(b.matches('.portal-return'))leave();else if(b.matches('.portal-skip'))finishIntro();else if(b.matches('.portal-pause')){paused=!paused;b.textContent=paused?'Resume motion':'Pause motion';b.setAttribute('aria-pressed',String(paused))}else if(b.dataset.album){if(b.dataset.album!==active.id)enter(albums.find(a=>a.id===b.dataset.album),cards[0])}else if(b.dataset.orbit!==undefined)showPhoto(Number(b.dataset.orbit));else if(b.matches('.preview-close'))closePhoto();else if(b.matches('.preview-prev'))updatePhoto(previewIndex-1);else if(b.matches('.preview-next'))updatePhoto(previewIndex+1);else if(b.matches('.orbit-back'))impulse(-.12);else if(b.matches('.orbit-forward'))impulse(.12)});
  cards.forEach((card,i)=>{card.addEventListener('pointerenter',()=>{hover=i;card.classList.add('is-hovered')});card.addEventListener('pointerleave',()=>{hover=-1;card.classList.remove('is-hovered');card.style.setProperty('--tilt','0deg')});card.addEventListener('pointermove',e=>{if(quiet())return;const r=card.getBoundingClientRect();card.style.setProperty('--tilt',`${(e.clientX-r.left-r.width/2)/r.width*12}deg`)});});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(previewIndex>=0)closePhoto();else if(phase==='intro')finishIntro();else leave()}if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const d=e.key==='ArrowRight'?1:-1;if(previewIndex>=0)updatePhoto(previewIndex+d);else impulse(d*.12)}if(e.key==='Tab'){const scope=previewIndex>=0?root.querySelector('.portal-preview'):root;const list=[...scope.querySelectorAll('button')].filter(el=>!el.closest('[hidden],[inert]')&&el.getClientRects().length);const first=list[0],end=list[list.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===root)){e.preventDefault();end.focus()}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus()}}});
 }
 document.addEventListener('click',e=>{const link=e.target.closest('a[href]');if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const url=new URL(link.href,location.href);const a=albums.find(a=>url.origin===location.origin&&url.pathname===`/memories/${a.id}/`);if(!a)return;e.preventDefault();e.stopImmediatePropagation();enter(a,link)},true);
 addEventListener('popstate',()=>{const a=albumAtPath();if(a)enter(a,null,false);else{dispose();document.title=initialTitle;opener?.focus({preventScroll:true})}});
 document.addEventListener('visibilitychange',()=>{last=performance.now()});
 reduced.addEventListener('change',()=>{if(root&&quiet()){paused=true;finishIntro();velocity=0}});
 addEventListener('pagehide',dispose);
 const direct=albumAtPath();if(direct)enter(direct,null,false);
})();
