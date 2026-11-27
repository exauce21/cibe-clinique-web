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

  /* Recherche : panneau sous l'en-tête */
  const searchPanel = document.getElementById('search-panel');
  const searchToggles = [...document.querySelectorAll('[data-search-toggle]')];
  const setSearch = (open) => {
    if (!searchPanel) return;
    searchPanel.hidden = !open;
    searchToggles.forEach((b) => b.setAttribute('aria-expanded', String(open)));
    document.body.classList.toggle('has-search', open);
    if (open) {
      setSub(false);
      if (nav?.classList.contains('is-open')) setMenu(false);
      searchPanel.querySelector('input')?.focus();
    }
  };
  searchToggles.forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    setSearch(searchPanel.hidden);
  }));
  subToggle?.addEventListener('click', () => { if (searchPanel && !searchPanel.hidden) setSearch(false); });
  document.addEventListener('click', (e) => {
    if (searchPanel && !searchPanel.hidden && !searchPanel.contains(e.target)) setSearch(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchPanel && !searchPanel.hidden) {
      setSearch(false);
      searchToggles.find((b) => b.offsetParent !== null)?.focus();
    }
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

/* ---------- Page de résultats de recherche ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const list = document.querySelector('[data-search-results]');
  if (!list) return;
  const index = window.SEARCH_INDEX || [];
  const form = document.querySelector('[data-search-form]');
  const input = form.querySelector('input');
  const status = document.querySelector('[data-search-status]');
  const empty = document.querySelector('[data-search-empty]');

  // Minuscules sans accents : « Échographie » trouve « echographie » et inversement
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const prepared = index.map((e) => ({ ...e, nTitle: norm(e.title), nPage: norm(e.page), nText: norm(e.text) }));

  const highlight = (text, terms) => {
    const n = norm(text);
    if (n.length !== text.length) return esc(text);
    const ranges = [];
    terms.forEach((t) => {
      let i = n.indexOf(t);
      while (i !== -1) { ranges.push([i, i + t.length]); i = n.indexOf(t, i + t.length); }
    });
    ranges.sort((a, b) => a[0] - b[0]);
    let out = '', pos = 0;
    ranges.forEach(([a, b]) => {
      if (a < pos) return;
      out += esc(text.slice(pos, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>';
      pos = b;
    });
    return out + esc(text.slice(pos));
  };

  // Extrait d'environ 220 caractères centré sur la première occurrence
  const excerpt = (text, terms) => {
    const n = norm(text);
    const hit = Math.min(...terms.map((t) => n.indexOf(t)).filter((i) => i >= 0));
    if (!isFinite(hit) || text.length <= 220) return text.slice(0, 220) + (text.length > 220 ? '…' : '');
    const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, hit - 70)) + 1);
    const end = Math.min(text.length, start + 220);
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  };

  const run = (q) => {
    const terms = norm(q).split(/[\s,;'’-]+/).filter((t) => t.length > 1);
    list.innerHTML = '';
    empty.hidden = true;
    if (!terms.length) {
      status.textContent = 'Saisissez un mot pour lancer la recherche.';
      return;
    }
    const results = prepared
      .map((e) => {
        // Un bloc remonte s'il contient au moins un mot ; ceux qui les contiennent tous passent devant
        let score = 0, found = 0;
        for (const t of terms) {
          const inTitle = e.nTitle.includes(t), inPage = e.nPage.includes(t), inText = e.nText.includes(t);
          if (!inTitle && !inPage && !inText) continue;
          found++;
          score += (inTitle ? 6 : 0) + (inPage ? 2 : 0) + (inText ? 1 + Math.min(4, e.nText.split(t).length - 2) : 0);
        }
        if (!found) return null;
        return { e, score: score + (found === terms.length ? 20 : 0) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    const label = `« ${q.trim()} »`;
    status.textContent = results.length
      ? `${results.length} résultat${results.length > 1 ? 's' : ''} pour ${label}`
      : `Aucun résultat pour ${label}`;
    empty.hidden = results.length > 0;
    list.innerHTML = results
      .map(({ e }) => `<li class="result"><a href="${esc(e.url)}">
          <span class="result__page">${esc(e.page)}</span>
          <strong class="result__title">${highlight(e.title, terms)}</strong>
          <span class="result__text">${highlight(excerpt(e.text, terms), terms)}</span>
        </a></li>`)
      .join('');
  };

  const q = new URLSearchParams(location.search).get('q') || '';
  input.value = q;
  run(q);

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      run(input.value);
      const url = new URL(location.href);
      if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }, 150);
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
});

/* ---------- Hero : mot écrit à la machine dans « Tous pour la … » ---------- */
(() => {
  const box = document.querySelector('[data-rotate]');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const words = box.dataset.rotate.split(',').map((w) => w.trim()).filter(Boolean);
  const el = box.firstElementChild;
  const TYPE = 110, ERASE = 60, HOLD = 2000, GAP = 350;
  let i = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const loop = async () => {
    for (;;) {
      await wait(HOLD);
      box.classList.add('is-typing');
      for (let n = el.textContent.length; n > 0; n--) { el.textContent = el.textContent.slice(0, -1); await wait(ERASE); }
      await wait(GAP);
      i = (i + 1) % words.length;
      for (const ch of words[i]) { el.textContent += ch; await wait(TYPE); }
      box.classList.remove('is-typing');
    }
  };
  loop();
})();

/* ---------- Hero : étiquettes de services qui changent et se déplacent ---------- */
(() => {
  const list = document.querySelector('[data-chips]');
  if (!list || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Réserve de services : [libellé, ancre sur services.html, icône ou null]
  const POOL = [
    ['Médecine générale', 'medecine-generale', null],
    ['Pharmacie', 'pharmacie', 'i-pill'],
    ['Urgences', 'urgences', 'i-siren'],
    ['Consultations spécialisées', 'specialites', null],
    ["Laboratoire d'analyses", 'laboratoire', 'i-microscope'],
    ['Maternité', 'maternite', 'i-baby'],
    ['Hospitalisation', 'hospitalisation', 'i-bed'],
    ['Échographie', 'explorations', 'i-pulse'],
    ['ECG et MAPA', 'explorations', null],
    ['Soins infirmiers', 'soins', 'i-syringe'],
    ['Petite chirurgie', 'soins', null],
    ['Suivi de grossesse', 'maternite', null],
    ['Analyses de sang', 'laboratoire', 'i-flask'],
  ];
  const TICK = 2600; // ms entre deux changements
  const items = [...list.children];
  const slotOf = (li) => li.className.match(/slot-\d/)[0];
  const shown = () => items.map((li) => li.dataset.label || li.textContent.trim());
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const render = (li, [label, anchor, icon]) => {
    const a = li.querySelector('a');
    a.href = `services.html#${anchor}`;
    a.innerHTML = icon
      ? `<span class="hero__chip-icon" aria-hidden="true"><svg class="icon"><use href="#${icon}"/></svg></span>${label}`
      : label;
    li.dataset.label = label;
  };

  // Remplace une étiquette par un service qui n'est pas déjà affiché
  const replace = async () => {
    const li = pick(items);
    const free = POOL.filter(([label]) => !shown().includes(label));
    li.classList.add('is-out');
    await wait(380);
    render(li, pick(free));
    li.classList.remove('is-out');
  };

  // Deux étiquettes échangent leur emplacement
  const swap = () => {
    const a = pick(items);
    const b = pick(items.filter((li) => li !== a));
    const sa = slotOf(a), sb = slotOf(b);
    a.classList.replace(sa, sb);
    b.classList.replace(sb, sa);
  };

  let paused = false;
  let visible = true;
  list.addEventListener('mouseenter', () => (paused = true));
  list.addEventListener('mouseleave', () => (paused = false));
  list.addEventListener('focusin', () => (paused = true));
  list.addEventListener('focusout', () => (paused = false));
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(list);

  const loop = async () => {
    await wait(2200); // laisser finir l'animation d'entrée
    for (;;) {
      await wait(TICK);
      if (paused || !visible || document.hidden) continue;
      if (Math.random() < 0.6) await replace();
      else swap();
    }
  };
  loop();
})();
