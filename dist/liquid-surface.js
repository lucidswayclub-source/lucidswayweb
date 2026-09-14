(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const archive = document.querySelector('#archive');
  if (archive) {
    const section = document.createElement('section');
    section.className = 'story-interlude';
    section.setAttribute('aria-labelledby', 'story-title');
    const ribbon = (text, cls) => `<div class="story-marquee ${cls}" aria-hidden="true"><div>${`<span>${text}</span>`.repeat(4)}</div></div>`;
    section.innerHTML = `${ribbon('STRANGERS <em>BECOME</em> STORIES · ', '')}<div class="story-message"><span class="story-star" aria-hidden="true">✧</span><p>Come for the night.</p><h2 id="story-title">LEAVE WITH<br><em>a story.</em></h2><a href="#events">Find your next moment <span aria-hidden="true">↗</span></a></div>${ribbon('MUSIC · MOVEMENT · MOMENTS · ', 'story-marquee-bottom')}`;
    archive.before(section);
  }
  // A damped height field produces connected wakes instead of separate cursor rings.
  const field = document.querySelector('.ambient-field');
  if (!field) return;
  const padding = 100, W = 128, H = 96;
  field.style.inset = `-${padding}px`;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true'); svg.style.position = 'absolute';
  svg.innerHTML = '<filter id="water-refraction" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage result="map" width="100%" height="100%" preserveAspectRatio="none"/><feDisplacementMap in="SourceGraphic" in2="map" scale="150" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.append(svg);
  const map = svg.querySelector('feImage');
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(W, H);
  let current = new Float32Array(W * H), previous = new Float32Array(W * H);
  let frame = 0, last = 0, activeUntil = 0, pointer = null;
  const disabled = () => reduced.matches || document.hidden || document.body.classList.contains('motion-off');
  function stop() {
    cancelAnimationFrame(frame); frame = 0; last = 0; pointer = null;
    current.fill(0); previous.fill(0); field.style.filter = '';
  }
  function impulse(x, y, strength) {
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {
      const xx = Math.round(x) + i, yy = Math.round(y) + j;
      if (xx > 0 && xx < W - 1 && yy > 0 && yy < H - 1)
        current[yy * W + xx] += Math.exp(-(i*i+j*j)/7) * strength;
    }
  }
  function draw(now) {
    frame = 0;
    if (disabled() || now > activeUntil) { stop(); return; }
    if (!last || now - last >= 15) {
      last = now;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        previous[i] = ((current[i-1]+current[i+1]+current[i-W]+current[i+W]) * .5 - previous[i]) * .975;
      }
      [previous, current] = [current, previous];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, k = i * 4;
        const dx = x > 0 && x < W-1 ? current[i+1]-current[i-1] : 0;
        const dy = y > 0 && y < H-1 ? current[i+W]-current[i-W] : 0;
        pixels.data[k] = 128 + Math.tanh(dx * .035) * 110;
        pixels.data[k+1] = 128 + Math.tanh(dy * .035) * 110;
        pixels.data[k+2] = 128; pixels.data[k+3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
      map.setAttribute('href', canvas.toDataURL());
      field.style.filter = 'url(#water-refraction)';
    }
    frame = requestAnimationFrame(draw);
  }
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || disabled()) return;
    const x = (e.clientX + padding) / (innerWidth + padding * 2) * W;
    const y = (e.clientY + padding) / (innerHeight + padding * 2) * H;
    const now = performance.now();
    if (pointer && now-pointer.t < 120) {
      const distance = Math.hypot(x-pointer.x, y-pointer.y);
      const steps = Math.min(12, Math.max(1, Math.ceil(distance)));
      for (let n = 1; n <= steps; n++) impulse(pointer.x+(x-pointer.x)*n/steps, pointer.y+(y-pointer.y)*n/steps, Math.min(18, 3+distance*2)/steps);
    } else impulse(x, y, 5);
    pointer = { x, y, t: now }; activeUntil = now + 2800;
    if (!frame) frame = requestAnimationFrame(draw);
  }, { passive: true });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) pointer = null; });
  document.addEventListener('visibilitychange', stop);
  reduced.addEventListener('change', stop);
  new MutationObserver(() => { if (disabled()) stop(); }).observe(document.body, { attributes:true, attributeFilter:['class'] });
  addEventListener('resize', stop, { passive:true });
  addEventListener('pagehide', stop, { once:true });
})();
