(() => {
  const intro = document.querySelector('.logo-intro');
  if (!intro) return;
  const ambientCanvas = intro.querySelector('.logo-intro__canvas');
  const dustCanvas = intro.querySelector('.logo-intro__dust');
  const ambient = ambientCanvas.getContext('2d');
  const dust = dustCanvas.getContext('2d');
  const core = intro.querySelector('.logo-intro__core');
  let width = 0, height = 0, coreWidth = 0, coreHeight = 0, frame = 0;
  let started = performance.now(), leaving = false, logoDust = [];

  const atmosphere = Array.from({ length: 76 }, (_, i) => ({
    angle: (i / 76) * Math.PI * 2 + Math.random() * .18,
    radius: .08 + Math.random() * .52,
    speed: .12 + Math.random() * .28,
    size: .5 + Math.random() * 2.2,
    depth: Math.random(),
  }));

  const buildLogoDust = () => {
    const image = new Image();
    image.src = '/assets/lucids-way-logo.png';
    image.onload = () => {
      const sampleWidth = 250;
      const sampleHeight = Math.round(sampleWidth * image.naturalHeight / image.naturalWidth);
      const source = document.createElement('canvas');
      source.width = sampleWidth;
      source.height = sampleHeight;
      const sourceContext = source.getContext('2d', { willReadFrequently: true });
      sourceContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
      const pixels = sourceContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
      logoDust = [];
      for (let y = 0; y < sampleHeight; y += 3) {
        for (let x = 0; x < sampleWidth; x += 3) {
          const index = (y * sampleWidth + x) * 4;
          if (pixels[index + 3] < 105 || Math.random() > .72) continue;
          const edge = Math.random() * Math.PI * 2;
          const distance = 160 + Math.random() * 460;
          logoDust.push({
            tx: x / sampleWidth, ty: y / sampleHeight,
            sx: .5 + Math.cos(edge) * distance / Math.max(width, 1),
            sy: .5 + Math.sin(edge) * distance / Math.max(height, 1),
            drift: (Math.random() - .5) * 22,
            size: .55 + Math.random() * 1.5,
            delay: Math.random() * .72,
            red: pixels[index], green: pixels[index + 1], blue: pixels[index + 2],
          });
        }
      }
    };
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth; height = innerHeight;
    ambientCanvas.width = width * dpr; ambientCanvas.height = height * dpr;
    ambientCanvas.style.width = `${width}px`; ambientCanvas.style.height = `${height}px`;
    ambient.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bounds = core.getBoundingClientRect();
    coreWidth = bounds.width; coreHeight = bounds.height;
    dustCanvas.width = coreWidth * dpr; dustCanvas.height = coreHeight * dpr;
    dust.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const ease = value => {
    const x = Math.max(0, Math.min(1, value));
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  const draw = now => {
    const t = (now - started) / 1000;
    ambient.clearRect(0, 0, width, height);
    const unit = Math.min(width, height);
    for (const p of atmosphere) {
      const angle = p.angle + t * p.speed;
      const expansion = (.18 + p.radius * 1.45) * unit;
      const x = width / 2 + Math.cos(angle) * expansion;
      const y = height / 2 + Math.sin(angle) * expansion * (.35 + p.depth * .55);
      const alpha = Math.max(0, Math.min(.5, (t - p.depth * .7) * .45));
      ambient.beginPath();
      ambient.fillStyle = `rgba(255,${46 + p.depth * 62},${54 + p.depth * 48},${alpha})`;
      ambient.arc(x, y, p.size, 0, Math.PI * 2); ambient.fill();
    }
    dust.clearRect(0, 0, coreWidth, coreHeight);
    dust.globalCompositeOperation = 'lighter';
    for (const p of logoDust) {
      const progress = ease((t - .45 - p.delay) / 2.55);
      if (progress <= 0) continue;
      const targetX = p.tx * coreWidth, targetY = p.ty * coreHeight;
      const startX = p.sx * coreWidth, startY = p.sy * coreHeight;
      const curve = Math.sin(progress * Math.PI) * p.drift * (1 - progress * .35);
      const x = startX + (targetX - startX) * progress + curve;
      const y = startY + (targetY - startY) * progress - curve * .35;
      const fade = t > 3.18 ? Math.max(0, 1 - (t - 3.18) / 1.02) : 1;
      const alpha = Math.min(1, progress * 1.35) * fade;
      dust.fillStyle = `rgba(${Math.max(205, p.red)},${p.green},${p.blue},${alpha})`;
      const size = p.size * (.65 + progress * .65);
      dust.fillRect(x - size / 2, y - size / 2, size, size);
    }
    dust.globalCompositeOperation = 'source-over';
    if (!leaving) frame = requestAnimationFrame(draw);
  };

  const finish = () => {
    if (leaving) return;
    leaving = true; cancelAnimationFrame(frame);
    intro.classList.add('is-leaving');
    document.documentElement.classList.remove('intro-active');
    setTimeout(() => intro.remove(), 1050);
  };
  resize(); buildLogoDust(); frame = requestAnimationFrame(draw);
  addEventListener('resize', resize, { passive: true });
  intro.addEventListener('click', finish);
  intro.addEventListener('keydown', event => { if (['Escape', 'Enter', ' '].includes(event.key)) finish(); });
  setTimeout(finish, 5850);
})();
