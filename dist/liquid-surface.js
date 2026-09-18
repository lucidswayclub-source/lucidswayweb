(() => {
  // Preserve the story interlude without the previous per-frame PNG displacement map.
  // Replacing an SVG filter texture every frame caused visible GPU repaint flashes.
  const archive=document.querySelector('#archive');
  if(!archive||document.querySelector('.story-interlude'))return;
  const section=document.createElement('section');section.className='story-interlude';section.setAttribute('aria-labelledby','story-title');
  const ribbon=(text,cls)=>`<div class="story-marquee ${cls}" aria-hidden="true"><div>${`<span>${text}</span>`.repeat(4)}</div></div>`;
  section.innerHTML=`${ribbon('STRANGERS <em>BECOME</em> STORIES · ','')}<div class="story-message"><span class="story-star" aria-hidden="true">✧</span><p>Come for the night.</p><h2 id="story-title">LEAVE WITH<br><em>a story.</em></h2><a href="#events">Find your next moment <span aria-hidden="true">↗</span></a></div>${ribbon('MUSIC · MOVEMENT · MOMENTS · ','story-marquee-bottom')}`;
  archive.before(section);
})();
