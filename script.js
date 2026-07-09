/* ================================================================
   EuroPath Consultancy — script.js
   All interactions: navbar, mobile menu, animations,
   testimonial slider, counter, form, back-to-top, search tabs
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------------------
  // 1. NAVBAR — Sticky shadow on scroll
  // ----------------------------------------------------------------
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // ----------------------------------------------------------------
  // 2. MOBILE NAVIGATION TOGGLE
  // ----------------------------------------------------------------
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');

  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close menu when any nav link is clicked (mobile)
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', false);
      document.body.style.overflow = '';
    });
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('open') &&
        !navMenu.contains(e.target) &&
        !navToggle.contains(e.target)) {
      navMenu.classList.remove('open');
      navToggle.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // ----------------------------------------------------------------
  // 3. SCROLL ANIMATION — Reveal elements when they enter viewport
  // ----------------------------------------------------------------
  const animatedEls = document.querySelectorAll('.animate-on-scroll');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger effect: each card slightly delayed
        setTimeout(() => {
          entry.target.classList.add('in-view');
        }, i * 70);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  animatedEls.forEach(el => revealObserver.observe(el));

  // ----------------------------------------------------------------
  // 4. COUNTER ANIMATION — Counts up from 0 to target value
  // ----------------------------------------------------------------
  const counters = document.querySelectorAll('.counter');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.getAttribute('data-target'), 10);
      const suffix = el.getAttribute('data-suffix') || '+';
      const dur    = 1600; // ms
      const step   = 16;   // ~60fps
      const inc    = target / (dur / step);
      let   cur    = 0;

      const tick = () => {
        cur = Math.min(cur + inc, target);
        el.textContent = Math.floor(cur) + suffix;
        if (cur < target) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      };
      tick();
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => counterObserver.observe(el));

  // ----------------------------------------------------------------
  // 5. SEARCH TABS
  // ----------------------------------------------------------------
  const tabs = document.querySelectorAll('.search-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // ----------------------------------------------------------------
  // 6. TESTIMONIALS SLIDER
  // ----------------------------------------------------------------
  const track     = document.getElementById('testiTrack');
  const dotsWrap  = document.getElementById('testiDots');
  const btnPrev   = document.getElementById('testiBtnPrev');
  const btnNext   = document.getElementById('testiBtnNext');

  if (track && dotsWrap && btnPrev && btnNext) {
    const cards       = Array.from(track.children);
    const total       = cards.length;
    let   current     = 0;
    let   autoTimer   = null;

    // How many visible cards depends on screen width
    const visibleCount = () => window.innerWidth <= 600 ? 1
                             : window.innerWidth <= 900 ? 2
                             : 3;

    // Build dots
    const buildDots = () => {
      dotsWrap.innerHTML = '';
      const pages = Math.ceil(total / visibleCount());
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement('button');
        dot.className = 'testi-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
      }
    };

    const goTo = (idx) => {
      const vc   = visibleCount();
      const pages = Math.ceil(total / vc);
      current    = ((idx % pages) + pages) % pages;
      const pct  = current * (100 / vc);
      track.style.transform = `translateX(-${pct}%)`;

      // Update dots
      dotsWrap.querySelectorAll('.testi-dot').forEach((d, i) => {
        d.classList.toggle('active', i === current);
      });
    };

    const next = () => goTo(current + 1);
    const prev = () => goTo(current - 1);

    btnNext.addEventListener('click', () => { next(); resetAuto(); });
    btnPrev.addEventListener('click', () => { prev(); resetAuto(); });

    const startAuto = () => { autoTimer = setInterval(next, 4500); };
    const resetAuto = () => { clearInterval(autoTimer); startAuto(); };

    // Rebuild on resize
    window.addEventListener('resize', () => {
      buildDots();
      goTo(0);
    });

    // Touch / swipe support
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); resetAuto(); }
    });

    buildDots();
    startAuto();
  }

  // ----------------------------------------------------------------
  // 7. CONTACT FORM — Basic client-side submit (no backend)
  //    To connect a real backend, replace this handler with
  //    a fetch() POST to your API / Formspree / EmailJS.
  // ----------------------------------------------------------------
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');

  if (form && success) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Simple validation
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#ef4444';
          field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
        }
      });

      if (!valid) return;

      // Show success (demo)
      const btn = form.querySelector('button[type="submit"]');
      btn.textContent = 'Sending…';
      btn.disabled = true;

      setTimeout(() => {
        form.reset();
        btn.textContent = 'Book Free Counselling Session';
        btn.disabled = false;
        success.classList.add('visible');
        setTimeout(() => success.classList.remove('visible'), 6000);
      }, 1200);

      /* -------- REAL BACKEND INTEGRATION (Formspree example) --------
      const data = new FormData(form);
      fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      }).then(res => {
        if (res.ok) {
          form.reset();
          success.classList.add('visible');
          setTimeout(() => success.classList.remove('visible'), 6000);
        }
        btn.textContent = 'Book Free Counselling Session';
        btn.disabled = false;
      });
      ---------------------------------------------------------------- */
    });
  }

  // ----------------------------------------------------------------
  // 8. BACK TO TOP BUTTON
  // ----------------------------------------------------------------
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ----------------------------------------------------------------
  // 9. SMOOTH ANCHOR SCROLLING (accounts for sticky nav height)
  // ----------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = navbar ? navbar.offsetHeight + 16 : 80;
      const top    = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ----------------------------------------------------------------
  // 10. ACTIVE NAV LINK based on scroll position
  // ----------------------------------------------------------------
  const sections  = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-link');

  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle(
            'active-nav',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => activeObserver.observe(s));

});
