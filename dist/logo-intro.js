(() => {
  const intro = document.querySelector('.logo-intro');
  if (!intro) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  let seen = !isReload && root.classList.contains('intro-seen');
  try {
    seen = !isReload && (seen || sessionStorage.getItem('lucids-intro-seen') === '1');
    sessionStorage.setItem('lucids-intro-seen', '1');
  } catch {}
  if (seen || reduced.matches) { intro.remove(); root.classList.remove('intro-active'); return; }
  const canvas = intro.querySelector('.logo-intro__dust');
  const ctx = canvas.getContext('2d');
  const logo = intro.querySelector('.logo-intro__logo');
  let frame, started, particles = [], width, height, neon, finished = false;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  // Bake the glow once instead of running a shadow/filter for every particle.
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 24;
  const s = sprite.getContext('2d');
  const glow = s.createRadialGradient(12, 12, 0, 12, 12, 12);
  glow.addColorStop(0, '#ff9296'); glow.addColorStop(.14, '#ff5960');
  glow.addColorStop(.32, '#ff252dbb'); glow.addColorStop(1, '#ff252d00');
  s.fillStyle = glow; s.fillRect(0, 0, 24, 24);
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function finish() {
    if (finished) return;
    finished = true; cancelAnimationFrame(frame);
    clearTimeout(fallback); removeEventListener('resize', resize);
    root.classList.remove('intro-active', 'intro-reveal'); intro.remove();
  }
  function draw(now) {
    if (finished) return;
    started ??= now;
    const t = now - started;
    if (t >= 3200) { finish(); return; }
    ctx.clearRect(0, 0, width, height);
    const w = Math.min(560, width * .84), h = w * logo.naturalHeight / logo.naturalWidth;
    const left = (width - w) / 2, top = (height - h) / 2;
    const solid = ease((t - 1250) / 300);
    if (t < 2100) {
      ctx.globalAlpha = 1 - solid;
      for (const p of particles) {
        const progress = ease((t - p.delay) / 1300);
        const x = left + p.x * w + Math.cos(p.angle) * p.distance * (1 - progress);
        const y = top + p.y * h + Math.sin(p.angle) * p.distance * (1 - progress);
        const size = p.size * (1.4 - progress * .4);
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = solid;
      ctx.drawImage(neon, left - w * .08, top - h * .08, w * 1.16, h * 1.16);
    } else {
      // Hold the formed logo still, then dissolve into the homepage.
      ctx.globalAlpha = 1 - ease((t - 2730) / 470);
      ctx.drawImage(neon, left - w * .08, top - h * .08, w * 1.16, h * 1.16);
    }
    ctx.globalAlpha = 1;
    if (t >= 2730) {
      root.classList.add('intro-reveal');
      intro.style.opacity = 1 - ease((t - 2730) / 470);
    }
    frame = requestAnimationFrame(draw);
  }
  function start() {
    if (finished || started !== undefined || frame) return;
    // Cache the neon halo once; the animation only moves this bitmap.
    neon = document.createElement('canvas');
    const nw = 640, nh = Math.round(nw * logo.naturalHeight / logo.naturalWidth);
    neon.width = Math.ceil(nw * 1.16); neon.height = Math.ceil(nh * 1.16);
    const nc = neon.getContext('2d');
    nc.shadowColor = '#ff252d80'; nc.shadowBlur = 14;
    nc.drawImage(logo, nw * .08, nh * .08, nw, nh);
    nc.shadowBlur = 4; nc.filter = 'brightness(1.08)';
    nc.drawImage(logo, nw * .08, nh * .08, nw, nh);
    const sample = document.createElement('canvas');
    sample.width = 160; sample.height = Math.round(160 * logo.naturalHeight / logo.naturalWidth);
    const c = sample.getContext('2d', { willReadFrequently: true });
    c.drawImage(logo, 0, 0, sample.width, sample.height);
    const pixels = c.getImageData(0, 0, sample.width, sample.height).data;
    for (let y = 0; y < sample.height; y += 3) for (let x = 0; x < sample.width; x += 3) {
      if (pixels[(y * sample.width + x) * 4 + 3] < 100) continue;
      particles.push({ x: x / sample.width, y: y / sample.height,
        angle: Math.random() * Math.PI * 2, distance: 90 + Math.random() * Math.min(width, height) * .55,
        delay: Math.random() * 100, size: 6 + Math.random() * 5 });
    }
    frame = requestAnimationFrame(draw);
  }
  resize(); addEventListener('resize', resize, { passive: true });
  intro.addEventListener('click', finish);
  intro.addEventListener('keydown', e => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); finish(); } });
  const fallback = setTimeout(finish, 5500);
  logo.addEventListener('error', finish, { once: true });
  if (logo.complete && logo.naturalWidth) start(); else logo.addEventListener('load', start, { once: true });
})();
