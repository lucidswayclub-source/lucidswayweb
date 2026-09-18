// Previous events and optimized photographs supplied by Lucidsway.
const concertA='https://images.unsplash.com/photo-1571266063066-15577f80abdb?auto=format&fit=crop&w=1600&q=85';
const concertB='https://images.unsplash.com/photo-1529787184525-7d3933bec5a0?auto=format&fit=crop&w=1800&q=85';
const concertC='https://images.unsplash.com/photo-1722570014465-9cdf5839778f?auto=format&fit=crop&w=1600&q=85';
const concertD='https://images.unsplash.com/photo-1700381332358-d71af7241748?auto=format&fit=crop&w=1600&q=85';
const albums=[
  {
    "id": "run-pickle-ball-dj",
    "title": "Run x Pickle Ball x DJ",
    "venue": "At The Picklers Hub",
    "credit": "In collaboration with Vizag run Collective",
    "subtitle": "At The Picklers Hub",
    "tone": "red",
    "photos": [
      "/assets/memories/run-pickle-ball-dj/12.jpg",
      "/assets/memories/run-pickle-ball-dj/01.jpg",
      "/assets/memories/run-pickle-ball-dj/02.jpg",
      "/assets/memories/run-pickle-ball-dj/03.jpg",
      "/assets/memories/run-pickle-ball-dj/04.jpg",
      "/assets/memories/run-pickle-ball-dj/05.jpg",
      "/assets/memories/run-pickle-ball-dj/06.jpg",
      "/assets/memories/run-pickle-ball-dj/08.jpg",
      "/assets/memories/run-pickle-ball-dj/09.jpg",
      "/assets/memories/run-pickle-ball-dj/13.jpg",
      "/assets/memories/run-pickle-ball-dj/14.jpg",
      "/assets/memories/run-pickle-ball-dj/15.jpg",
      "/assets/memories/run-pickle-ball-dj/16.jpg",
      "/assets/memories/run-pickle-ball-dj/17.jpg"
    ],
    "captions": [
      "Run x Pickle Ball x DJ · 01",
      "Run x Pickle Ball x DJ · 02",
      "Run x Pickle Ball x DJ · 03",
      "Run x Pickle Ball x DJ · 04",
      "Run x Pickle Ball x DJ · 05",
      "Run x Pickle Ball x DJ · 06",
      "Run x Pickle Ball x DJ · 07",
      "Run x Pickle Ball x DJ · 08",
      "Run x Pickle Ball x DJ · 09",
      "Run x Pickle Ball x DJ · 10",
      "Run x Pickle Ball x DJ · 11",
      "Run x Pickle Ball x DJ · 12",
      "Run x Pickle Ball x DJ · 13",
      "Run x Pickle Ball x DJ · 14"
    ],
    "cover": "/assets/memories/run-pickle-ball-dj/01.jpg"
  },
  {
    "id": "golden-drift",
    "title": "Golden Drift",
    "venue": "At Kafa",
    "credit": "By Lucidsway",
    "subtitle": "At Kafa",
    "tone": "red",
    "photos": [
      "/assets/memories/golden-drift/01.jpg",
      "/assets/memories/golden-drift/02.jpg",
      "/assets/memories/golden-drift/03.jpg",
      "/assets/memories/golden-drift/04.jpg",
      "/assets/memories/golden-drift/05.jpg",
      "/assets/memories/golden-drift/06.jpg",
      "/assets/memories/golden-drift/07.jpg",
      "/assets/memories/golden-drift/08.jpg",
      "/assets/memories/golden-drift/09.jpg",
      "/assets/memories/golden-drift/10.jpg"
    ],
    "captions": [
      "Golden Drift · 01",
      "Golden Drift · 02",
      "Golden Drift · 03",
      "Golden Drift · 04",
      "Golden Drift · 05",
      "Golden Drift · 06",
      "Golden Drift · 07",
      "Golden Drift · 08",
      "Golden Drift · 09",
      "Golden Drift · 10"
    ],
    "cover": "/assets/memories/golden-drift/04.jpg"
  },
  {
    "id": "desi-after-dark",
    "title": "Desi after dark",
    "venue": "At The Creek, Rushikonda",
    "credit": "Lucidsway x nova",
    "subtitle": "At The Creek, Rushikonda",
    "tone": "red",
    "photos": [
      "/assets/memories/desi-after-dark/09.jpg",
      "/assets/memories/desi-after-dark/01.jpg",
      "/assets/memories/desi-after-dark/02.jpg",
      "/assets/memories/desi-after-dark/03.jpg",
      "/assets/memories/desi-after-dark/04.jpg",
      "/assets/memories/desi-after-dark/05.jpg",
      "/assets/memories/desi-after-dark/08.jpg",
      "/assets/memories/desi-after-dark/10.jpg",
      "/assets/memories/desi-after-dark/11.jpg",
      "/assets/memories/desi-after-dark/12.jpg"
    ],
    "captions": [
      "Desi after dark · 01",
      "Desi after dark · 02",
      "Desi after dark · 03",
      "Desi after dark · 04",
      "Desi after dark · 05",
      "Desi after dark · 06",
      "Desi after dark · 07",
      "Desi after dark · 08",
      "Desi after dark · 09",
      "Desi after dark · 10"
    ],
    "cover": "/assets/memories/desi-after-dark/11.jpg"
  }
];
document.querySelector('#memory-folders').innerHTML=albums.map((a,i)=>`<a class="memory-folder ${a.tone}" href="/memories/${a.id}/" aria-label="Open ${a.title} gallery"><div class="folder-stack"><div class="folder-sheet sheet-back"><img loading="lazy" src="${a.photos[1]}" alt=""></div><div class="folder-sheet sheet-middle"><img loading="lazy" src="${a.photos[0]}" alt=""></div><div class="folder-sheet sheet-front"><img loading="lazy" src="${a.cover||a.photos[0]}" alt="${a.title} at ${a.venue.replace("At ","")}"><span>THE LUCID’S WAY <b>↗</b></span></div><span class="folder-tab">VOL. 0${i+1}</span></div><div class="folder-caption"><div><h3>${a.title}</h3><p>${a.venue}</p><p class="event-credit">${a.credit}</p></div><span class="circle-arrow">↗</span></div></a>`).join('');

// Each album has a real static URL, allowing direct links and browser Back.
const albumId=location.pathname.match(/^\/memories\/([^/]+)\/?$/)?.[1];
const legacyAlbums={'after-hours':'run-pickle-ball-dj','in-the-moment':'golden-drift','one-more-song':'desi-after-dark'};
const album=albums.find(a=>a.id===(legacyAlbums[albumId]||albumId));
if(album){
 const index=albums.indexOf(album),next=albums[(index+1)%albums.length];
 document.title=album.title+' — The Lucid’s Way';
 document.body.classList.add('album-page',album.tone);
 document.querySelector('main').innerHTML=`<div class="album-toolbar"><a class="back-link" href="/#archive">← All memories</a><span>MEMORIES / VOL. 0${index+1}</span><span>${album.photos.length} PHOTOS</span></div><section class="scrapbook-hero" aria-labelledby="album-title"><div class="album-heading"><span class="eyebrow">THE LUCID’S WAY / MEMORY ARCHIVE</span><h1 id="album-title">${album.title}</h1><p>${album.venue}</p><p class="event-credit">${album.credit}</p><a class="album-scroll" href="#frames">Explore the gallery ↓</a></div>${[0,1,2,3].map((n)=>`<button class="scattered-photo scatter-${n}" data-photo="${n}" aria-label="Expand photo ${n+1}: ${album.captions[n]}"><img src="${album.photos[n]}" alt="${album.captions[n]}"><span>${album.captions[n]} <small>0${n+1}</small></span></button>`).join('')}<span class="scrapbook-stamp">GOOD PEOPLE.<br>GREAT NIGHTS.<br><b>✳</b></span></section><section class="album-frames" id="frames"><div class="frames-heading"><span class="eyebrow">THE NIGHT, FRAME BY FRAME</span><h2>Keep the feeling.</h2><p>${album.venue} · ${album.credit}</p></div>${album.photos.map((url,n)=>`<figure class="memory-print print-${n%5}"><button data-photo="${n}" aria-label="Expand photo ${n+1}: ${album.captions[n]}"><img loading="lazy" src="${url}" alt="${album.captions[n]}"><span class="photo-expand">↗</span></button><figcaption><span>${album.captions[n]}</span><small>PHOTO / ${String(n+1).padStart(2,'0')}</small></figcaption></figure>`).join('')}<div class="album-quote"><span>“</span><p>Somewhere between<br>the first beat and<br><em>the last goodbye.</em></p></div></section><a class="next-album" href="/memories/${next.id}/"><span class="eyebrow">ONE MORE MEMORY</span><strong>${next.title}</strong><span class="next-arrow">↗</span></a><footer><a href="/#home" class="brand"><span class="logo-crop"><img src="/assets/lucids-way-logo.png" alt="The Lucid’s Way"></span></a><span>Until the next night.</span><small>${album.title}</small></footer>`;
 for(const link of document.querySelectorAll('.menubar a,.dock a')){const href=link.getAttribute('href');if(href?.startsWith('#'))link.setAttribute('href','/'+href)}
 const viewer=document.querySelector('#gallery-dialog');viewer.classList.add('photo-viewer');
 let current=0,opener;
 function displayPhoto(n){current=(n+album.photos.length)%album.photos.length;viewer.innerHTML=`<div class="viewer-top"><span id="gallery-title">${album.title} / ${String(current+1).padStart(2,'0')} OF ${String(album.photos.length).padStart(2,'0')}</span><button class="close" aria-label="Close photo">×</button></div><img src="${album.photos[current]}" alt="${album.captions[current]}"><div class="viewer-bottom"><button class="viewer-prev" aria-label="Previous photo">←</button><span aria-live="polite">${album.captions[current]}</span><button class="viewer-next" aria-label="Next photo">→</button></div>`}
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
