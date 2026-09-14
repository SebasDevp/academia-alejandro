/* =========================================================
   ACADEMIA DEPORTIVA DIGITAL
   MAIN.JS — refinado
========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const preloader = document.getElementById('preloader');
  const siteHeader = document.getElementById('siteHeader');
  const scrollProgress = document.getElementById('scrollProgress');
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const cursorGlow = document.getElementById('cursorGlow');
  const heroPhoto = document.getElementById('heroPhoto');
  const videoModal = document.getElementById('videoModal');
  const videoModalFrame = document.getElementById('videoModalFrame');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* -------------------------------------------------------
     PAGE READY / PRELOADER
  ------------------------------------------------------- */
  let pageShown = false;

  const showPage = () => {
    if (pageShown) return;
    pageShown = true;
    body.classList.add('is-loaded');
    if (!preloader) return;
    preloader.classList.add('is-hidden');
    window.setTimeout(() => preloader.remove(), 700);
  };

  window.addEventListener('load', () => window.setTimeout(showPage, 180), { once: true });
  window.setTimeout(showPage, 1400);

  /* -------------------------------------------------------
     SCROLL STATE — un único listener con requestAnimationFrame
  ------------------------------------------------------- */
  let scrollTicking = false;

  const updateScrollUI = () => {
    const y = window.scrollY;

    if (siteHeader) siteHeader.classList.toggle('is-scrolled', y > 40);

    if (scrollProgress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
    }

    if (heroPhoto && !prefersReducedMotion && y < window.innerHeight * 1.3) {
      const movement = Math.min(y * 0.028, 20);
      heroPhoto.style.setProperty('--hero-y', `${movement}px`);
    }

    if (!prefersReducedMotion) {
      document.querySelectorAll('.audience__image').forEach(image => {
        const wrap = image.closest('.audience__image-wrap');
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
        const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const movement = (progress - .5) * 20;
        image.style.setProperty('--audience-y', `${movement}px`);
      });
    }

    scrollTicking = false;
  };

  const requestScrollUpdate = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollUI);
  };

  updateScrollUI();
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });

  /* -------------------------------------------------------
     MOBILE MENU
  ------------------------------------------------------- */
  const openMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.classList.add('is-active');
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    body.classList.add('menu-open');
  };

  const closeMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.classList.remove('is-active');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    body.classList.remove('menu-open');
  };

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu();
    });
  }

  document.querySelectorAll('.mobile-link').forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 980) closeMenu(); });

  /* -------------------------------------------------------
     SMOOTH INTERNAL LINKS
  ------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      const headerHeight = siteHeader ? siteHeader.offsetHeight : 0;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
      window.scrollTo({ top: targetPosition, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      closeMenu();
    });
  });

  /* -------------------------------------------------------
     REVEALS
  ------------------------------------------------------- */
  const revealElements = document.querySelectorAll('[data-reveal]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach(element => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        const delay = Number(element.dataset.delay) || 0;
        window.setTimeout(() => element.classList.add('is-visible'), delay);
        revealObserver.unobserve(element);
      });
    }, { threshold: .1, rootMargin: '0px 0px -44px 0px' });

    revealElements.forEach(element => revealObserver.observe(element));
  }

  /* -------------------------------------------------------
     COUNTERS
  ------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-count]');

  const setCounterFinalValue = element => {
    const target = Number(element.dataset.count);
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';
    element.textContent = `${prefix}${target}${suffix}`;
  };

  const animateCounter = element => {
    const target = Number(element.dataset.count);
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';
    const duration = 1250;
    const start = performance.now();

    const update = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      element.textContent = `${prefix}${Math.floor(target * eased)}${suffix}`;
      progress < 1 ? requestAnimationFrame(update) : setCounterFinalValue(element);
    };

    requestAnimationFrame(update);
  };

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    counters.forEach(setCounterFinalValue);
  } else {
    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: .55 });
    counters.forEach(counter => counterObserver.observe(counter));
  }

  /* -------------------------------------------------------
     ACTIVE NAV
  ------------------------------------------------------- */
  const navigationLinks = document.querySelectorAll('.nav__link[href^="#"]');
  const sectionIds = [...navigationLinks].map(link => link.getAttribute('href').slice(1));
  const navSections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  const setActiveNav = id => {
    navigationLinks.forEach(link => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
    });
  };

  if (navSections.length && 'IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActiveNav(entry.target.id); });
    }, { rootMargin: '-30% 0px -58% 0px', threshold: 0 });
    navSections.forEach(section => navObserver.observe(section));
  }

  /* -------------------------------------------------------
     CURSOR GLOW — muy sutil
  ------------------------------------------------------- */
  if (cursorGlow && finePointer && !prefersReducedMotion && window.innerWidth > 1100) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    document.addEventListener('mousemove', event => {
      targetX = event.clientX;
      targetY = event.clientY;
    }, { passive: true });

    const animateCursor = () => {
      currentX += (targetX - currentX) * .075;
      currentY += (targetY - currentY) * .075;
      cursorGlow.style.left = `${currentX}px`;
      cursorGlow.style.top = `${currentY}px`;
      requestAnimationFrame(animateCursor);
    };
    animateCursor();
  } else if (cursorGlow) {
    cursorGlow.style.display = 'none';
  }

  /* -------------------------------------------------------
     TILT — deliberadamente moderado
  ------------------------------------------------------- */
  const tiltCards = document.querySelectorAll('[data-tilt-card]');

  if (finePointer && !prefersReducedMotion) {
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', event => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rotateX = (rect.height / 2 - y) / 85;
        const rotateY = (x - rect.width / 2) / 85;
        card.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* -------------------------------------------------------
     MAGNETIC — solo en botones principales y casi imperceptible
  ------------------------------------------------------- */
  if (finePointer && !prefersReducedMotion) {
    document.querySelectorAll('.button--primary, .button--white, .button--purple').forEach(button => {
      button.addEventListener('mousemove', event => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        button.style.transform = `translate(${x * .035}px, ${y * .05}px) translateY(-2px)`;
      });
      button.addEventListener('mouseleave', () => { button.style.transform = ''; });
    });
  }

  /* -------------------------------------------------------
     CONTENT FILTERS
  ------------------------------------------------------- */
  const contentFilters = document.querySelectorAll('.content-filter');
  const mediaCards = document.querySelectorAll('.media-card[data-category]');

  contentFilters.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      contentFilters.forEach(item => item.classList.toggle('is-active', item === button));
      mediaCards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-filtered-out', !show);
      });
    });
  });

  /* -------------------------------------------------------
     VIMEO MODAL — usa el SRC oficial generado por Vimeo

     El HTML debe incluir:
     data-vimeo-src="https://player.vimeo.com/video/..."
  ------------------------------------------------------- */
  let lastVideoTrigger = null;

  const closeVideo = () => {
    if (!videoModal || !videoModalFrame) return;

    videoModal.classList.remove('is-open');
    videoModal.setAttribute('aria-hidden', 'true');

    /*
     * Remover el iframe detiene la reproducción de Vimeo
     * y evita que el video siga sonando detrás de la web.
     */
    videoModalFrame.replaceChildren();
    body.classList.remove('video-open');

    if (lastVideoTrigger instanceof HTMLElement) {
      lastVideoTrigger.focus({ preventScroll: true });
    }
  };

  const openVimeo = (videoSrc, trigger = null) => {
    if (!videoModal || !videoModalFrame) return;

    if (
      !videoSrc ||
      !videoSrc.startsWith('https://player.vimeo.com/')
    ) {
      console.warn('Vimeo: falta una URL válida del reproductor.');
      return;
    }

    lastVideoTrigger = trigger;

    const iframe = document.createElement('iframe');

    iframe.src = videoSrc;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute(
      'allow',
      'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share'
    );
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('title', 'Introducción — Academia Deportiva Digital');

    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';

    videoModalFrame.replaceChildren(iframe);
    videoModal.classList.add('is-open');
    videoModal.setAttribute('aria-hidden', 'false');
    body.classList.add('video-open');

    videoModal.querySelector('.video-modal__close')?.focus();
  };

  document.querySelectorAll('[data-vimeo-src]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      openVimeo(trigger.dataset.vimeoSrc, trigger);
    });
  });

  document.querySelectorAll('[data-close-video]').forEach(control => {
    control.addEventListener('click', closeVideo);
  });

  videoModal
    ?.querySelector('.video-modal__close')
    ?.addEventListener('click', closeVideo);


  /* -------------------------------------------------------
     E-BOOK READER — primer material disponible dentro de la web
  ------------------------------------------------------- */
  const ebookModal = document.getElementById('ebookModal');
  const ebookModalFrame = document.getElementById('ebookModalFrame');
  let lastEbookTrigger = null;

  const closeEbook = () => {
    if (!ebookModal || !ebookModalFrame) return;
    ebookModal.classList.remove('is-open');
    ebookModal.setAttribute('aria-hidden', 'true');
    ebookModalFrame.removeAttribute('src');
    body.classList.remove('ebook-open');
    if (lastEbookTrigger instanceof HTMLElement) {
      lastEbookTrigger.focus({ preventScroll: true });
    }
  };

  const openEbook = (pdfSrc, trigger = null) => {
    if (!ebookModal || !ebookModalFrame || !pdfSrc) return;
    lastEbookTrigger = trigger;
    ebookModalFrame.src = `${pdfSrc}#page=1&view=FitH`;
    ebookModal.classList.add('is-open');
    ebookModal.setAttribute('aria-hidden', 'false');
    body.classList.add('ebook-open');
    ebookModal.querySelector('.ebook-modal__close')?.focus();
  };

  document.querySelectorAll('[data-open-ebook]').forEach(trigger => {
    trigger.addEventListener('click', () => openEbook(trigger.dataset.ebookSrc, trigger));
  });

  document.querySelectorAll('[data-close-ebook]').forEach(control => {
    control.addEventListener('click', closeEbook);
  });

  /* -------------------------------------------------------
     SALES CTA FEEDBACK
  ------------------------------------------------------- */
  document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
    link.addEventListener('click', () => {
      link.classList.add('is-contacting');
      window.setTimeout(() => link.classList.remove('is-contacting'), 700);
    });
  });

  /* -------------------------------------------------------
     KEYBOARD
  ------------------------------------------------------- */
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeMenu();
    closeVideo();
    closeEbook();
  });
});
