(() => {
  'use strict';

  // Scroll to top on fresh page load when there's no hash anchor target
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }

  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

  /* ----- Mobile menu toggle ----- */
  const setMenu = (open) => {
    hamburger.classList.toggle('is-open', open);
    mobileNav.classList.toggle('is-open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    mobileNav.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  };

  hamburger.addEventListener('click', () => {
    setMenu(!mobileNav.classList.contains('is-open'));
  });

  // Close mobile menu when any link inside it is clicked
  document.querySelectorAll('.mobile-nav-link, .mobile-nav-cta').forEach((el) => {
    el.addEventListener('click', () => setMenu(false));
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
      setMenu(false);
    }
  });

  // Close on resize above breakpoint
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768 && mobileNav.classList.contains('is-open')) {
        setMenu(false);
      }
    }, 120);
  });

  /* ----- Active nav link on scroll -----
     Section is considered "active" when >50% visible in the viewport.
     We compute visible ratio against the viewport with a symmetric root
     margin and pick the section with the highest ratio above 0.5. */
  const sections = ['services', 'about', 'process']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach((l) => {
      const match = l.getAttribute('href') === `#${id}`;
      l.classList.toggle('active', match);
    });
  };

  if (sections.length && 'IntersectionObserver' in window) {
    const sectionRatios = new Map();
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => sectionRatios.set(e.target.id, e.intersectionRatio));
        let best = { id: null, ratio: 0.5 }; // threshold for "active"
        sectionRatios.forEach((ratio, id) => {
          if (ratio > best.ratio) best = { id, ratio };
        });
        if (best.id) {
          setActive(best.id);
        } else {
          navLinks.forEach((l) => l.classList.remove('active'));
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => navObserver.observe(s));
  }

  /* ----- Scroll reveal ----- */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    // Fallback: no IO support — just show everything
    reveals.forEach((el) => el.classList.add('visible'));
  }

  /* ----- Replay bar-chart animation when hero scrolls back into view ----- */
  const chartBars = document.getElementById('chartBars');
  if (chartBars && 'IntersectionObserver' in window) {
    const barObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            chartBars.querySelectorAll('.bar').forEach((bar) => {
              bar.style.animation = 'none';
              // force reflow so the animation restarts cleanly
              void bar.offsetHeight;
              bar.style.animation = '';
            });
          }
        });
      },
      { threshold: 0.3 }
    );
    barObserver.observe(chartBars);
  }

  /* ----- Nav shadow on scroll ----- */
  const nav = document.getElementById('nav');
  if (nav) {
    const updateNavShadow = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    updateNavShadow();
    window.addEventListener('scroll', updateNavShadow, { passive: true });
  }

  /* ----- Contact modal ----- */
  const modal = document.getElementById('contactModal');
  const modalForm = document.getElementById('contactForm');
  const modalSuccess = document.getElementById('modalSuccess');
  let lastFocused = null;

  const openModal = (trigger) => {
    if (!modal) return;
    lastFocused = trigger || document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    // reset state whenever opened
    if (modalForm && modalSuccess) {
      modalForm.hidden = false;
      modalSuccess.hidden = true;
      modalForm.reset();
      modalForm.querySelectorAll('.field').forEach((f) => f.classList.remove('is-invalid'));
    }
    // focus first field after paint
    requestAnimationFrame(() => {
      const first = modal.querySelector('.field-input');
      if (first) first.focus();
    });
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  };

  document.querySelectorAll('.cta-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // if triggered from mobile-nav, close it first so the modal is visible
      if (mobileNav && mobileNav.classList.contains('is-open')) {
        setMenu(false);
      }
      openModal(btn);
    });
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-modal-close]')) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  /* ----- Form validation ----- */
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  if (modalForm) {
    // Clear invalid state as user edits
    modalForm.addEventListener('input', (e) => {
      const field = e.target.closest('.field');
      if (field) field.classList.remove('is-invalid');
    });

    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let firstInvalid = null;
      modalForm.querySelectorAll('.field').forEach((field) => {
        const input = field.querySelector('.field-input');
        if (!input) return;
        const value = (input.value || '').trim();
        let invalid = false;
        if (!value) invalid = true;
        else if (input.type === 'email' && !isEmail(value)) invalid = true;

        field.classList.toggle('is-invalid', invalid);
        if (invalid && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      modalForm.hidden = true;
      if (modalSuccess) modalSuccess.hidden = false;
    });
  }
})();
