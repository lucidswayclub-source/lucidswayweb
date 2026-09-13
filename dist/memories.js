// Replace these illustrative collections with cleared event photos when supplied.
const concertA='https://images.unsplash.com/photo-1571266063066-15577f80abdb?auto=format&fit=crop&w=1600&q=85';
const concertB='https://images.unsplash.com/photo-1529787184525-7d3933bec5a0?auto=format&fit=crop&w=1800&q=85';
const concertC='https://images.unsplash.com/photo-1722570014465-9cdf5839778f?auto=format&fit=crop&w=1600&q=85';
const concertD='https://images.unsplash.com/photo-1700381332358-d71af7241748?auto=format&fit=crop&w=1600&q=85';
const albums=[
 {id:'after-hours',title:'After hours.',subtitle:'The world could wait.',tone:'red',photos:[concertA,concertC,concertB,concertD,concertA],captions:['The first light.','All of us, all at once.','One more song.','Right where we belong.','Until next time.']},
 {id:'in-the-moment',title:'In the moment.',subtitle:'Strangers. Then a chorus.',tone:'blue',photos:[concertB,concertD,concertC,concertA,concertB],captions:['Before the drop.','Find your people.','A sea of hands.','No place else.','Take this feeling home.']},
 {id:'one-more-song',title:'One more song.',subtitle:'We weren’t ready to leave.',tone:'amber',photos:[concertD,concertB,concertA,concertC,concertD],captions:['Meet you at the front.','This is the feeling.','Lost in the lights.','Stay a little longer.','The last song stays.']}
];
document.querySelector('#memory-folders').innerHTML=albums.map((a,i)=>`<a class="memory-folder ${a.tone}" href="/memories/${a.id}/" aria-label="Open ${a.title} gallery"><div class="folder-stack"><div class="folder-sheet sheet-back"><img loading="lazy" src="${a.photos[1]}" alt=""></div><div class="folder-sheet sheet-middle"><img loading="lazy" src="${a.photos[0]}" alt=""></div><div class="folder-sheet sheet-front"><img loading="lazy" src="${a.photos[0]}" alt="Concert lights and crowd, sample collection"><span>THE LUCID’S WAY <b>↗</b></span></div><span class="folder-tab">VOL. 0${i+1}</span></div><div class="folder-caption"><div><h3>${a.title}</h3><p>${a.subtitle}</p></div><span class="circle-arrow">↗</span></div></a>`).join('');

// Each album has a real static URL, allowing direct links and browser Back.
const albumId=location.pathname.match(/^\/memories\/([^/]+)\/?$/)?.[1];
const album=albums.find(a=>a.id===albumId);
if(album){
 const index=albums.indexOf(album),next=albums[(index+1)%albums.length];
 document.title=album.title+' — The Lucid’s Way';
 document.body.classList.add('album-page',album.tone);
 document.querySelector('main').innerHTML=`<div class="album-toolbar"><a class="back-link" href="/#archive">← All memories</a><span>MEMORIES / VOL. 0${index+1}</span><span>5 FRAMES</span></div><section class="scrapbook-hero" aria-labelledby="album-title"><div class="album-heading"><span class="eyebrow">THE LUCID’S WAY / MEMORY ARCHIVE</span><h1 id="album-title">${album.title}</h1><p>${album.subtitle}</p><span class="handwritten">Wish we could rewind.</span><a class="album-scroll" href="#frames">Explore the night ↓</a></div>${[0,1,2,3].map((n)=>`<button class="scattered-photo scatter-${n}" data-photo="${n}" aria-label="Expand photo ${n+1}: ${album.captions[n]}"><img src="${album.photos[n]}" alt="${album.captions[n]} Concert moodboard photograph"><span>${album.captions[n]} <small>0${n+1}</small></span></button>`).join('')}<span class="scrapbook-stamp">GOOD PEOPLE.<br>GREAT NIGHTS.<br><b>✳</b></span></section><section class="album-frames" id="frames"><div class="frames-heading"><span class="eyebrow">THE NIGHT, FRAME BY FRAME</span><h2>Keep the feeling.</h2><p>Sample photography for the UI preview.</p></div>${album.photos.map((url,n)=>`<figure class="memory-print print-${n} reveal"><button data-photo="${n}" aria-label="Expand photo ${n+1}: ${album.captions[n]}"><img loading="lazy" src="${url}" alt="${album.captions[n]} Concert moodboard photograph"><span class="photo-expand">↗</span></button><figcaption><span>${album.captions[n]}</span><small>FRAME / 0${n+1}</small></figcaption></figure>`).join('')}<div class="album-quote"><span>“</span><p>Somewhere between<br>the first beat and<br><em>the last goodbye.</em></p></div></section><a class="next-album" href="/memories/${next.id}/"><span class="eyebrow">ONE MORE MEMORY</span><strong>${next.title}</strong><span class="next-arrow">↗</span></a><footer><a href="/#home" class="brand"><span class="logo-crop"><img src="/assets/lucids-way-logo.png" alt="The Lucid’s Way"></span></a><span>Until the next night.</span><small>Sample collection · UI preview</small></footer>`;
 for(const link of document.querySelectorAll('.menubar a,.dock a')){const href=link.getAttribute('href');if(href?.startsWith('#'))link.setAttribute('href','/'+href)}
 const viewer=document.querySelector('#gallery-dialog');viewer.classList.add('photo-viewer');
 let current=0,opener;
 function displayPhoto(n){current=(n+album.photos.length)%album.photos.length;viewer.innerHTML=`<div class="viewer-top"><span id="gallery-title">${album.title} / ${String(current+1).padStart(2,'0')} OF 05</span><button class="close" aria-label="Close photo">×</button></div><img src="${album.photos[current]}" alt="${album.captions[current]} Concert moodboard photograph"><div class="viewer-bottom"><button class="viewer-prev" aria-label="Previous photo">←</button><span aria-live="polite">${album.captions[current]}</span><button class="viewer-next" aria-label="Next photo">→</button></div>`}
 document.addEventListener('click',e=>{const photo=e.target.closest('[data-photo]');if(photo){opener=photo;displayPhoto(Number(photo.dataset.photo));viewer.showModal();document.body.style.overflow='hidden'}if(e.target.closest('.viewer-prev')){displayPhoto(current-1);viewer.querySelector('.viewer-prev').focus()}if(e.target.closest('.viewer-next')){displayPhoto(current+1);viewer.querySelector('.viewer-next').focus()}});
 viewer.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();displayPhoto(current+(e.key==='ArrowRight'?1:-1));viewer.querySelector('.close').focus()}});
 viewer.addEventListener('close',()=>opener?.focus());
}

// Directional arrow rolls, a travelling sheen and a gentle pointer attraction.
const motionAllowed=()=>!document.body.classList.contains('motion-off')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
for(const el of document.querySelectorAll('.button,.card-bottom button,.back-link,.next-album')){
 el.classList.add('motion-button');
 el.addEventListener('pointermove',e=>{if(!motionAllowed()||e.pointerType==='touch')return;const r=el.getBoundingClientRect();el.style.setProperty('--mx',`${(e.clientX-r.left-r.width/2)*.07}px`);el.style.setProperty('--my',`${(e.clientY-r.top-r.height/2)*.12}px`)});
 el.addEventListener('pointerleave',()=>{el.style.setProperty('--mx','0px');el.style.setProperty('--my','0px')});
}
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
