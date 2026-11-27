/* CiBé Clinique — interactions (vanilla JS, aucune dépendance) */
(() => {
  'use strict';

  const header = document.querySelector('[data-header]');
  const burger = document.querySelector('[data-burger]');
  const nav = document.querySelector('[data-nav-panel]');
  const mqMobile = window.matchMedia('(max-width: 980px)');

  /* En-tête : ombre au défilement */
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Menu mobile */
  const setMenu = (open) => {
    if (!burger || !nav) return;
    if (open) {
      const top = header.getBoundingClientRect().bottom;
      nav.style.setProperty('--nav-top', `${Math.max(0, top)}px`);
    }
    burger.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
  };
  burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav?.addEventListener('click', (e) => {
    if (e.target.closest('a') && mqMobile.matches) setMenu(false);
  });
  mqMobile.addEventListener('change', (e) => { if (!e.matches) setMenu(false); });

  /* Sous-menu « Nos services » (bouton de divulgation) */
  const subToggle = document.querySelector('[data-submenu-toggle]');
  const submenu = subToggle && document.getElementById(subToggle.getAttribute('aria-controls'));
  const setSub = (open) => {
    if (!subToggle || !submenu) return;
    subToggle.setAttribute('aria-expanded', String(open));
    submenu.hidden = !open;
    document.body.classList.toggle('has-mega', open);
  };
  subToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    setSub(subToggle.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('click', (e) => {
    if (!mqMobile.matches && submenu && !submenu.hidden && !e.target.closest('.nav__item--has-menu')) setSub(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (submenu && !submenu.hidden) { setSub(false); subToggle.focus(); }
    if (nav?.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  submenu?.addEventListener('focusout', (e) => {
    if (!mqMobile.matches && !e.currentTarget.closest('li').contains(e.relatedTarget)) setSub(false);
  });

  /* Onglets accessibles (motif ARIA « tabs », activation automatique) */
  document.querySelectorAll('[data-tabs]').forEach((root) => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const select = (tab, focus = true) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !on;
        if (on) {
          panel.classList.remove('is-entering');
          void panel.offsetWidth;
          panel.classList.add('is-entering');
        }
      });
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        select(tabs[(keys[e.key] + tabs.length) % tabs.length]);
      });
    });
  });

  /* Sommaire de la page services : section en cours */
  const tocLinks = [...document.querySelectorAll('[data-toc] a[href^="#"]')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(tocLinks.map((a) => [a.hash.slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tocLinks.forEach((a) => a.removeAttribute('aria-current'));
        const link = map.get(entry.target.id);
        if (link) {
          link.setAttribute('aria-current', 'true');
          if (mqMobile.matches) link.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* Carte : chargée seulement à l'approche (économie de données) */
  document.querySelectorAll('iframe[data-src]').forEach((frame) => {
    const load = () => { frame.src = frame.dataset.src; frame.removeAttribute('data-src'); };
    if (!('IntersectionObserver' in window)) return load();
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { load(); io.disconnect(); } }, { rootMargin: '300px' });
    io.observe(frame);
  });

  /* Formulaire de demande de rendez-vous */
  const form = document.querySelector('[data-rdv-form]');
  if (form) {
    const status = form.querySelector('[data-form-status]');
    const fields = ['nom', 'telephone'];
    const showError = (input, msg) => {
      const err = document.getElementById(`${input.id}-error`);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    };
    const validate = () => {
      let first = null;
      fields.forEach((name) => {
        const input = form.elements[name];
        let msg = '';
        if (!input.value.trim()) msg = name === 'nom' ? 'Indiquez votre nom et prénom.' : 'Indiquez un numéro pour vous rappeler.';
        else if (name === 'telephone' && input.value.replace(/\D/g, '').length < 8) msg = 'Ce numéro semble incomplet : 8 chiffres au minimum.';
        showError(input, msg);
        if (msg && !first) first = input;
      });
      const consent = form.elements.consentement;
      if (consent && !consent.checked) { showError(consent, 'Cochez cette case pour que nous puissions vous rappeler.'); first = first || consent; }
      else if (consent) showError(consent, '');
      const email = form.elements.email;
      if (email.value && !email.checkValidity()) { showError(email, 'Cette adresse e-mail n\'est pas valide.'); first = first || email; }
      else showError(email, '');
      return first;
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form-status';
      status.textContent = '';
      const invalid = validate();
      if (invalid) { invalid.focus(); return; }

      const data = Object.fromEntries(new FormData(form));
      const endpoint = form.dataset.endpoint;
      const btn = form.querySelector('[type="submit"]');

      if (endpoint) {
        btn.disabled = true;
        try {
          const res = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
          if (!res.ok) throw new Error(res.statusText);
          form.reset();
          status.classList.add('is-success');
          status.textContent = 'Demande envoyée. Le secrétariat vous rappelle pour confirmer le rendez-vous.';
        } catch {
          status.classList.add('is-error');
          status.textContent = `Envoi impossible pour le moment. Appelez-nous au ${form.dataset.phone} ou réessayez dans quelques minutes.`;
        } finally {
          btn.disabled = false;
        }
        return;
      }

      /* Sans service d'envoi configuré : ouverture de la messagerie avec la demande pré-remplie */
      const lines = [
        `Nom : ${data.nom}`,
        `Téléphone : ${data.telephone}`,
        data.email && `E-mail : ${data.email}`,
        `Service souhaité : ${data.service || 'Non précisé'}`,
        data.date && `Date souhaitée : ${new Date(data.date).toLocaleDateString('fr-FR')}`,
        data.message && `\nMessage :\n${data.message}`,
      ].filter(Boolean);
      const subject = `Demande de rendez-vous – ${data.service || 'Consultation'}`;
      window.location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      status.classList.add('is-success');
      status.textContent = 'Votre messagerie s\'ouvre avec la demande pré-remplie : il ne reste qu\'à l\'envoyer.';
    });
    form.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.checked) showError(e.target, '');
    });
    form.addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') showError(e.target, '');
    });
  }
})();
