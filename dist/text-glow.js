(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const excluded = '.cursor-letter,script,style,noscript,svg,canvas,input,textarea,select,option,[contenteditable],.spatial-cursor,.logo-intro,button,.button,.dock,.menubar,.deck-controls,.city-select,[role="button"]';
  const enabled = () => fine.matches && !reduced.matches && !document.hidden && !document.body.classList.contains('motion-off');
  let active = null, frame = 0;
  const pending = new Set();
  function clear() {
    if (!active) return;
    active.classList.remove('letter-hit');
    active.style.removeProperty('--letter-x'); active.style.removeProperty('--letter-y');
    active = null;
  }
  // Keep semantic text and existing word/scroll wrappers. Whitespace remains native
  // so normal line wrapping, text selection and link targets are preserved.
  function split(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement.closest(excluded)) continue;
      // Splitting direct flex/grid text would create a separate layout item per letter.
      const display = getComputedStyle(node.parentElement).display;
      if (display.includes('flex') || display.includes('grid')) continue;
      nodes.push(node);
    }
    // Existing heading animation wrappers are aria-hidden but still visible text.
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      const chars = typeof Intl.Segmenter === 'function'
        ? [...new Intl.Segmenter(undefined, { granularity:'grapheme' }).segment(node.textContent)].map(s => s.segment)
        : Array.from(node.textContent);
      chars.forEach(char => {
        if (/\s/u.test(char)) { fragment.append(document.createTextNode(char)); return; }
        const span = document.createElement('span'); span.className = 'cursor-letter'; span.textContent = char; fragment.append(span);
      });
      node.replaceWith(fragment);
    });
  }
  function flush() {
    frame = 0;
    observer.disconnect();
    pending.forEach(el => { if (el.isConnected) split(el); }); pending.clear();
    observer.observe(document.body, { childList:true, characterData:true, subtree:true });
  }
  const observer = new MutationObserver(records => {
    if (!fine.matches) return;
    for (const record of records) {
      const parent = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (record.type==='characterData') { if(parent&&!parent.closest(excluded)) pending.add(parent); } else record.addedNodes.forEach(node=>{if(node.nodeType===1&&!node.closest(excluded)) pending.add(node);else if(node.nodeType===3&&parent&&!parent.closest(excluded)) pending.add(parent);});

    }
    if (pending.size && !frame) frame = requestAnimationFrame(flush);
  });
  function prepare() { if (fine.matches) { pending.add(document.body); flush(); } }
  document.addEventListener('pointermove', e => {
    if (!enabled() || e.pointerType === 'touch') { clear(); return; }
    const letter = e.target.closest('.cursor-letter');
    if(letter===active)return;
    clear();active=letter;
    active?.classList.add('letter-hit');
  }, { passive:true });
  document.addEventListener('pointerleave', clear);
  addEventListener('scroll', clear, { passive:true });
  document.addEventListener('visibilitychange', clear);
  reduced.addEventListener('change', clear);
  fine.addEventListener('change', () => { clear(); prepare(); });
  document.querySelector('#motion-toggle')?.addEventListener('click', clear);
  prepare();
})();
