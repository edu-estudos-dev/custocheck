// Landing: reveal no scroll + contagem dos números do painel.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const reveals = document.querySelectorAll('.lp-reveal');
  if (reduced) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          setTimeout(() => entry.target.classList.add('is-in'), i * 90);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  }

  // data-count="3.2" data-prefix="R$ " data-suffix=" kg" data-decimals="1"
  const fmt = (value, decimals) =>
    value.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const delay = parseInt(el.dataset.delay || '0', 10);

    if (!Number.isFinite(target)) return;

    const paint = (v) => {
      el.textContent = prefix + fmt(v, decimals) + suffix;
    };

    if (reduced) {
      paint(target);
      return;
    }

    paint(0);
    const duration = 1200;
    setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        paint(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
  });
})();
