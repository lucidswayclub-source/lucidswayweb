const themeButton=document.querySelector('.theme-toggle');
function syncTheme(){const dark=document.documentElement.dataset.theme==='dark';themeButton.setAttribute('aria-pressed',String(dark));themeButton.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');themeButton.querySelector('.theme-icon').textContent=dark?'☀':'☾';themeButton.querySelector('.theme-label').textContent=dark?'Light':'Dark';document.querySelector('meta[name="theme-color"]').content=dark?'#140c0e':'#e7ece6'}
syncTheme();themeButton.addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('lucids-theme',document.documentElement.dataset.theme)}catch{}syncTheme()});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{let saved;try{saved=localStorage.getItem('lucids-theme')}catch{}if(!saved){document.documentElement.dataset.theme=e.matches?'dark':'light';syncTheme()}});
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const hero=document.querySelector('.desktop-heading');
if(hero){
 const heading=hero.querySelector('h1');heading.setAttribute('aria-label','Less ordinary. More alive.');heading.innerHTML='<span class="headline-line" aria-hidden="true"><span>Less ordinary.</span></span><span class="headline-line second-line" aria-hidden="true"><span>More <em class="living-word">alive.</em><span class="spark">✳</span></span></span>';
 const scene=hero.querySelector('.hero-scene');
 scene.insertAdjacentHTML('afterbegin','<div class="spatial-orbit" aria-hidden="true"><div class="orbit-core"><i></i><i></i><i></i><i></i><i></i></div></div><div class="depth-sheet depth-one" aria-hidden="true"></div><div class="depth-sheet depth-two" aria-hidden="true"></div>');
 const windowCard=scene.querySelector('.photo-window');const floatLayer=document.createElement('div');floatLayer.className='window-float';windowCard.before(floatLayer);floatLayer.append(windowCard);
 const word=heading.querySelector('.living-word');const words=['alive.','lucid.','human.'];let currentWord=0,visible=true,wordTimer;
 const allowed=()=>!reducedMotion.matches&&!document.body.classList.contains('motion-off')&&!document.hidden&&visible;
 function animateWord(){clearTimeout(wordTimer);if(!allowed()){word.classList.remove('word-out');return}word.classList.add('word-out');wordTimer=setTimeout(()=>{if(!allowed()){word.classList.remove('word-out');return}currentWord=(currentWord+1)%words.length;word.textContent=words[currentWord];word.classList.remove('word-out');word.classList.add('word-in');wordTimer=setTimeout(()=>word.classList.remove('word-in'),750)},350)}
 const interval=setInterval(animateWord,4200);
 const visibilityObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;hero.classList.toggle('hero-paused',!visible)});visibilityObserver.observe(hero);
 let frame;
 hero.addEventListener('pointermove',e=>{if(!allowed()||e.pointerType==='touch')return;const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{scene.style.setProperty('--rx',`${-y*13}deg`);scene.style.setProperty('--ry',`${x*16}deg`);scene.style.setProperty('--px',`${x*14}px`);scene.style.setProperty('--py',`${y*12}px`)})});
 function resetMotion(){cancelAnimationFrame(frame);for(const key of ['--rx','--ry','--px','--py'])scene.style.removeProperty(key);if(!allowed()){clearTimeout(wordTimer);word.classList.remove('word-out','word-in')}}
 hero.addEventListener('pointerleave',resetMotion);document.querySelector('#motion-toggle').addEventListener('click',resetMotion);reducedMotion.addEventListener('change',resetMotion);document.addEventListener('visibilitychange',()=>{hero.classList.toggle('hero-paused',document.hidden||!visible);resetMotion()});window.addEventListener('pagehide',()=>{clearInterval(interval);clearTimeout(wordTimer);cancelAnimationFrame(frame)},{once:true});
}
