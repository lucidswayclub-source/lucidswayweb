(() => {
  document.body.insertAdjacentHTML('afterbegin','<i class="ui-cross cross-a" aria-hidden="true"></i><i class="ui-cross cross-b" aria-hidden="true"></i><span class="scroll-meter" aria-hidden="true"><i></i></span>');
  const targets = document.querySelectorAll('.section-top,.event-card,.about-section>*,.memory-folder,footer>*');
  targets.forEach(element => element.classList.add('reveal'));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px' });
  targets.forEach(element => observer.observe(element));
  const sections = [...document.querySelectorAll('main section')];
  const nav = [...document.querySelectorAll('.menubar nav a')];
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    document.querySelector('.scroll-meter').style.setProperty('--progress', `${max ? scrollY / max * 100 : 0}%`);
    const active = [...sections].reverse().find(section => section.offsetTop <= scrollY + innerHeight * .42);
    nav.forEach(link => link.classList.toggle('is-active', active && link.hash === `#${active.id}`));
  };
  addEventListener('scroll', update, { passive:true }); update();
})();
