/* MUFI.DEV — vanilla JS. No dependencies. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const body = document.body;
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Motion preference ---------- */
  const storedMotion = localStorage.getItem('mufi-motion');
  let motionOff = storedMotion ? storedMotion === 'off' : reduceQuery.matches;

  function applyMotion() {
    body.classList.toggle('motion-off', motionOff);
    const btn = $('#motion-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(!motionOff));
      btn.title = motionOff ? 'Включить анимации' : 'Выключить анимации';
    }
    if (motionOff) $$('.reveal').forEach(el => el.classList.add('is-visible'));
    labSyncMotion();
  }

  $('#motion-toggle')?.addEventListener('click', () => {
    motionOff = !motionOff;
    localStorage.setItem('mufi-motion', motionOff ? 'off' : 'on');
    applyMotion();
    toast(motionOff ? 'Анимации выключены' : 'Анимации включены');
  });

  reduceQuery.addEventListener?.('change', e => {
    if (!localStorage.getItem('mufi-motion')) {
      motionOff = e.matches;
      applyMotion();
    }
  });

  /* ---------- Loader ---------- */
  const loader = $('#loader');
  let loadFinished = false;
  function finishLoad() {
    if (loadFinished) return;
    loadFinished = true;
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    loader?.classList.add('is-done');
    setTimeout(() => loader?.remove(), 600);
  }
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const minShow = motionOff ? 0 : 900;
  const start = performance.now();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 1800))]).then(() => {
    const wait = Math.max(0, minShow - (performance.now() - start));
    setTimeout(finishLoad, wait);
  });
  setTimeout(finishLoad, 3500); // fail-safe

  /* ---------- Header / nav / scroll ---------- */
  const header = $('#site-header');
  const progress = $('#scroll-progress');
  const nav = $('#site-nav');
  const navToggle = $('#nav-toggle');
  const heroStage = $('.hero-stage');

  function closeNav() {
    nav?.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }
  navToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  $$('.site-nav a').forEach(a => a.addEventListener('click', closeNav));
  document.addEventListener('click', e => {
    if (nav?.classList.contains('is-open') && !nav.contains(e.target) && !navToggle.contains(e.target)) closeNav();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      header?.classList.toggle('is-scrolled', y > 8);
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      if (heroStage && !motionOff && y < innerHeight * 1.2) {
        heroStage.style.setProperty('--py', clamp(y * 0.12, 0, 90) + 'px');
      }
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const sections = $$('[data-section]');
  const navLinks = $$('.site-nav a');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => sectionObserver.observe(s));

  /* ---------- Reveal ---------- */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        revealObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach(el => revealObserver.observe(el));

  /* ---------- Toast / clipboard ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    const openDialog = $('dialog[open]');
    (openDialog || body).append(toastEl);
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2400);
  }
  async function copyText(text, ok = 'Скопировано') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.append(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast(ok);
    } catch {
      toast('Не удалось скопировать');
    }
  }
  function download(filename, text, type = 'text/plain') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------- Works filter ---------- */
  const cards = $$('.work-card');
  const emptyMsg = $('#works-empty');
  $$('.filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      $$('.filter').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      let visible = 0;
      cards.forEach(c => {
        const show = f === 'all' || c.dataset.category === f;
        c.classList.toggle('is-hidden', !show);
        if (show) visible++;
      });
      if (emptyMsg) emptyMsg.hidden = visible > 0;
    });
  });

  /* Pause offscreen card animations to save CPU */
  const cardObserver = new IntersectionObserver(entries => {
    entries.forEach(en => en.target.classList.toggle('is-paused', !en.isIntersecting));
  }, { rootMargin: '120px' });
  cards.forEach(c => cardObserver.observe(c));

  /* ---------- Project dialog ---------- */
  const projects = {
    orbit: {
      cat: 'Айдентика', title: 'ORBIT — знак с орбитой',
      desc: 'Спираль MUFI превращается в гравитационную систему: кольца задают ритм, частицы движутся по орбитам, а сам знак вращается с инерцией. Луп предназначен для аватаров, заставок и шапок соцсетей.',
      role: 'Motion direction, SVG-анимация', tools: 'SVG, CSS keyframes, easing-кривые', format: 'Бесшовный луп · 4 с'
    },
    pulse: {
      cat: 'Айдентика', title: 'PULSE — градиентный ритм',
      desc: 'Градиентная «M» живёт в такт условному биту: масштаб знака, эквалайзер и свечение синхронизированы по амплитуде. Концепт для музыкального бренда или стримингового сервиса.',
      role: 'Brand motion, art direction', tools: 'SVG gradient, CSS rhythm, glow', format: 'Ident · 6 с'
    },
    shift: {
      cat: 'Типографика', title: 'SHIFT — кинетический набор',
      desc: 'Буквы меняют вес, наклон и позицию, но слово остаётся читаемым в любой фазе. Призрачный слой подчёркивает направление движения, линия снизу задаёт такт.',
      role: 'Kinetic type, timing', tools: 'Variable rhythm, CSS transforms', format: 'Type loop · 5 с'
    },
    signal: {
      cat: 'UI / Web', title: 'SIGNAL — микроинтеракции',
      desc: 'Небольшая продуктовая сцена: переключатели, график и кнопка отвечают на движение курсора. Анимация подтверждает действие и помогает понять состояние интерфейса.',
      role: 'Product motion, micro UX', tools: 'CSS states, cursor choreography', format: 'UI loop · 7 с'
    },
    prism: {
      cat: '3D / Loops', title: 'PRISM — свет и геометрия',
      desc: 'Треугольник MUFI проходит через лучи света: псевдо-объём, мягкая тень и каустика создают ощущение материала без тяжёлого 3D-рендера.',
      role: 'Look development, loop design', tools: 'SVG, CSS perspective, light study', format: 'Seamless loop · 8 с'
    },
    flow: {
      cat: '3D / Loops', title: 'FLOW — поле частиц',
      desc: 'Генеративный поток частиц следует невидимому полю и собирается в волну. Цвет и размер варьируются, чтобы поток читался как живая система, а не набор точек.',
      role: 'Procedural motion, particles', tools: 'CSS particles, stagger, field path', format: 'Generative loop · 9 с'
    }
  };

  const dialog = $('#project-dialog');
  const previewBox = $('#project-preview');
  const playBtn = $('#project-play');
  const rateSel = $('#project-rate');
  let currentId = null;
  let lastFocus = null;

  function visibleCards() { return cards.filter(c => !c.classList.contains('is-hidden')); }
  function previewAnimations() { return previewBox?.getAnimations?.({ subtree: true }) ?? []; }
  function setProjectPaused(paused) {
    previewBox?.classList.toggle('is-paused', paused);
    previewAnimations().forEach(a => paused ? a.pause() : a.play());
    if (playBtn) {
      playBtn.textContent = paused ? 'Играть' : 'Пауза';
      playBtn.setAttribute('aria-pressed', String(paused));
    }
  }
  function applyRate() {
    const rate = Number(rateSel?.value || 1);
    previewAnimations().forEach(a => { a.playbackRate = rate; });
  }
  function openProject(id) {
    const data = projects[id];
    const card = cards.find(c => c.dataset.project === id);
    if (!data || !card || !dialog) return;
    currentId = id;
    $('#project-cat').textContent = data.cat;
    $('#project-title').textContent = data.title;
    $('#project-desc').textContent = data.desc;
    $('#project-role').textContent = data.role;
    $('#project-tools').textContent = data.tools;
    $('#project-format').textContent = data.format;
    previewBox.innerHTML = '';
    const clone = card.querySelector('.work-preview').cloneNode(true);
    clone.classList.remove('is-paused');
    previewBox.append(clone);
    if (!dialog.open) {
      lastFocus = document.activeElement;
      dialog.showModal();
      body.classList.add('dialog-open');
    }
    requestAnimationFrame(() => {
      setProjectPaused(motionOff);
      applyRate();
      if (playBtn) playBtn.disabled = motionOff;
      if (rateSel) rateSel.disabled = motionOff;
      $('#project-replay').disabled = motionOff;
    });
  }
  function closeProject() {
    if (!dialog?.open) return;
    dialog.close();
  }
  cards.forEach(c => {
    c.addEventListener('click', () => openProject(c.dataset.project));
    c.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(c.dataset.project); }
    });
  });
  $('#project-close')?.addEventListener('click', closeProject);
  dialog?.addEventListener('click', e => { if (e.target === dialog) closeProject(); });
  dialog?.addEventListener('close', () => {
    body.classList.remove('dialog-open');
    previewBox.innerHTML = '';
    currentId = null;
    lastFocus?.focus?.();
  });
  playBtn?.addEventListener('click', () => {
    if (motionOff) return;
    setProjectPaused(!previewBox.classList.contains('is-paused'));
  });
  $('#project-replay')?.addEventListener('click', () => {
    if (motionOff) return;
    previewAnimations().forEach(a => { a.cancel(); a.play(); });
    setProjectPaused(false);
    applyRate();
  });
  rateSel?.addEventListener('change', applyRate);
  function stepProject(dir) {
    const list = visibleCards();
    if (!list.length || !currentId) return;
    const i = list.findIndex(c => c.dataset.project === currentId);
    const next = list[(i + dir + list.length) % list.length];
    openProject(next.dataset.project);
  }
  $('#project-prev')?.addEventListener('click', () => stepProject(-1));
  $('#project-next')?.addEventListener('click', () => stepProject(1));

  /* ---------- Brief ---------- */
  const briefDialog = $('#brief-dialog');
  const briefForm = $('#brief-form');
  $('#open-brief')?.addEventListener('click', () => {
    briefDialog.showModal();
    body.classList.add('dialog-open');
    updateBriefMail();
  });
  $('#brief-close')?.addEventListener('click', () => briefDialog.close());
  briefDialog?.addEventListener('click', e => { if (e.target === briefDialog) briefDialog.close(); });
  briefDialog?.addEventListener('close', () => body.classList.remove('dialog-open'));

  function briefText() {
    const fd = new FormData(briefForm);
    return [
      'Бриф для MUFI.DEV',
      '─────────────────',
      `Имя / компания: ${fd.get('name') || '—'}`,
      `Тип проекта: ${fd.get('type')}`,
      `Бюджет: ${fd.get('budget')}`,
      `Сроки: ${fd.get('timeline') || '—'}`,
      '',
      'Задача:',
      fd.get('task') || '—'
    ].join('\n');
  }
  function updateBriefMail() {
    const link = $('#brief-mail');
    if (!link) return;
    const subject = 'Бриф: ' + (new FormData(briefForm).get('type') || 'проект');
    link.href = `mailto:hello@mufi.dev?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(briefText())}`;
  }
  briefForm?.addEventListener('input', updateBriefMail);
  briefForm?.addEventListener('submit', e => {
    e.preventDefault();
    if (!briefForm.reportValidity()) return;
    download('mufi-brief.txt', briefText());
    updateBriefMail();
    toast('Бриф сохранён в .txt');
  });
  $('#brief-copy')?.addEventListener('click', () => {
    if (!briefForm.reportValidity()) return;
    copyText(briefText(), 'Текст брифа скопирован');
    updateBriefMail();
  });
  $('#copy-email')?.addEventListener('click', () => copyText('hello@mufi.dev', 'Почта скопирована'));

  /* ---------- Motion Lab ---------- */
  const labSvg = $('#lab-svg');
  const labStage = $('#lab-stage');
  const labLogo = $('#lab-logo');
  const labMark = $('#lab-mark');
  const ghost1 = $('#lab-ghost-1');
  const ghost2 = $('#lab-ghost-2');
  const particlesG = $('#lab-particles');
  const gridG = $('#lab-grid');
  const glowBlur = $('#lab-glow-blur');
  const softBlur = $('#lab-soft-blur');
  const hudFps = $('#hud-fps');
  const hudSpeed = $('#hud-speed');
  const hudCount = $('#hud-count');

  const defaults = {
    mark: 'logo-swirl', speed: 1, scale: 1, glow: 45, trail: 30,
    particles: 16, blur: 0, theme: '#c8ff3d', easing: 'sine',
    grid: true, wire: false, paused: false
  };
  const state = { ...defaults };
  let labTime = 0;
  let dragOffset = 0;
  let rafId = 0;
  let lastTs = 0;
  let fpsAcc = 0;
  let fpsFrames = 0;
  let labVisible = false;
  const particleEls = [];

  if (particlesG) {
    for (let i = 0; i < 48; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', String(2 + (i % 3)));
      c.setAttribute('fill', state.theme);
      c.setAttribute('opacity', '0');
      particlesG.append(c);
      particleEls.push(c);
    }
  }

  function labEffectivePaused() { return state.paused || motionOff; }
  function labTransform(angle, scale) {
    return `translate(200 200) rotate(${angle.toFixed(2)}) scale(${scale.toFixed(3)}) translate(-200 -200)`;
  }
  function labRender() {
    if (!labSvg) return;
    const t = labTime;
    let angle = t * 40 + dragOffset;
    let pulse = 1;
    if (state.easing === 'sine') { angle += Math.sin(t * 2) * 10; pulse = 1 + Math.sin(t * 2) * 0.06; }
    if (state.easing === 'elastic') { angle += Math.sin(t * 6) * 14; pulse = 1 + Math.sin(t * 5) * 0.1; }
    const scale = state.scale * pulse;
    const color = state.theme;

    labSvg.style.setProperty('--lab-color', color);
    labSvg.classList.toggle('is-wire', state.wire);
    labMark?.setAttribute('href', '#' + state.mark);
    labLogo?.setAttribute('transform', labTransform(angle, scale));
    if (glowBlur) glowBlur.setAttribute('stdDeviation', String((state.glow / 100) * 10));
    if (softBlur) softBlur.setAttribute('stdDeviation', String(state.blur));
    if (gridG) gridG.style.display = state.grid ? '' : 'none';

    const trailOpacity = (state.trail / 100) * 0.35;
    const lag = 10 + state.trail * 0.25;
    if (ghost1 && ghost2) {
      ghost1.setAttribute('href', '#' + state.mark);
      ghost2.setAttribute('href', '#' + state.mark);
      ghost1.setAttribute('transform', labTransform(angle - lag, scale * 0.985));
      ghost2.setAttribute('transform', labTransform(angle - lag * 2, scale * 0.97));
      ghost1.setAttribute('opacity', String(trailOpacity));
      ghost2.setAttribute('opacity', String(trailOpacity * 0.55));
      $('#lab-ghosts').style.display = state.wire || state.trail === 0 ? 'none' : '';
    }

    const n = state.particles;
    for (let i = 0; i < particleEls.length; i++) {
      const el = particleEls[i];
      if (i >= n) { el.setAttribute('opacity', '0'); continue; }
      const a = t * (0.5 + (i % 5) * 0.12) + i * 2.39996;
      const r = 120 + Math.sin(t * 1.3 + i) * 34 + (i % 4) * 8;
      el.setAttribute('cx', (200 + Math.cos(a) * r).toFixed(1));
      el.setAttribute('cy', (200 + Math.sin(a) * r).toFixed(1));
      el.setAttribute('opacity', String(0.25 + 0.6 * Math.abs(Math.sin(t + i))));
      el.setAttribute('fill', i % 3 === 0 ? color : i % 3 === 1 ? '#38d9ff' : '#f4f6fb');
    }
    if (hudSpeed) hudSpeed.textContent = state.speed.toFixed(1) + '×';
    if (hudCount) hudCount.textContent = n + ' частиц';
    if (hudFps && labEffectivePaused()) hudFps.textContent = 'пауза';
  }

  function labLoop(ts) {
    rafId = 0;
    if (!labVisible || labEffectivePaused() || document.hidden) return;
    const dt = lastTs ? clamp((ts - lastTs) / 1000, 0, 0.05) : 0;
    lastTs = ts;
    labTime += dt * state.speed;
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc >= 0.5) {
      if (hudFps) hudFps.textContent = Math.round(fpsFrames / fpsAcc) + ' fps';
      fpsAcc = 0; fpsFrames = 0;
    }
    labRender();
    rafId = requestAnimationFrame(labLoop);
  }
  function labStart() {
    if (rafId || !labVisible || labEffectivePaused() || document.hidden) return;
    lastTs = 0;
    rafId = requestAnimationFrame(labLoop);
  }
  function labStop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    labRender();
  }
  function labSyncMotion() {
    const pauseCtl = $('#ctl-pause');
    if (pauseCtl) pauseCtl.disabled = motionOff;
    if (labEffectivePaused()) labStop(); else labStart();
    labRender();
  }

  new IntersectionObserver(entries => {
    labVisible = entries[0].isIntersecting;
    if (labVisible) labStart(); else labStop();
  }, { threshold: 0.1 }).observe(labStage);
  document.addEventListener('visibilitychange', () => document.hidden ? labStop() : labStart());

  /* Drag to rotate */
  let dragging = false;
  let lastX = 0;
  labStage?.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX;
    labStage.setPointerCapture(e.pointerId);
  });
  labStage?.addEventListener('pointermove', e => {
    if (!dragging) return;
    dragOffset += (e.clientX - lastX) * 0.6;
    lastX = e.clientX;
    if (labEffectivePaused()) labRender();
  });
  const endDrag = () => { dragging = false; };
  labStage?.addEventListener('pointerup', endDrag);
  labStage?.addEventListener('pointercancel', endDrag);
  labStage?.addEventListener('dblclick', () => { dragOffset = 0; labRender(); });

  /* Controls */
  const controls = {
    speed: $('#ctl-speed'), scale: $('#ctl-scale'), glow: $('#ctl-glow'),
    trail: $('#ctl-trail'), particles: $('#ctl-particles'), blur: $('#ctl-blur'),
    theme: $('#ctl-theme'), easing: $('#ctl-easing'),
    grid: $('#ctl-grid'), wire: $('#ctl-wire'), paused: $('#ctl-pause')
  };
  const outputs = {
    speed: $('#out-speed'), scale: $('#out-scale'), glow: $('#out-glow'),
    trail: $('#out-trail'), particles: $('#out-particles'), blur: $('#out-blur')
  };
  function syncOutputs() {
    if (outputs.speed) outputs.speed.textContent = state.speed.toFixed(1) + '×';
    if (outputs.scale) outputs.scale.textContent = state.scale.toFixed(2);
    if (outputs.glow) outputs.glow.textContent = String(state.glow);
    if (outputs.trail) outputs.trail.textContent = String(state.trail);
    if (outputs.particles) outputs.particles.textContent = String(state.particles);
    if (outputs.blur) outputs.blur.textContent = state.blur.toFixed(1);
  }
  function syncInputs() {
    controls.speed.value = state.speed;
    controls.scale.value = state.scale;
    controls.glow.value = state.glow;
    controls.trail.value = state.trail;
    controls.particles.value = state.particles;
    controls.blur.value = state.blur;
    controls.theme.value = state.theme;
    controls.easing.value = state.easing;
    controls.grid.checked = state.grid;
    controls.wire.checked = state.wire;
    controls.paused.checked = state.paused;
    $$('.lab-tab').forEach(b => {
      const on = b.dataset.mark === state.mark;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    syncOutputs();
  }
  function bindRange(key, parse = Number) {
    controls[key]?.addEventListener('input', () => {
      state[key] = parse(controls[key].value);
      syncOutputs();
      labRender();
    });
  }
  bindRange('speed'); bindRange('scale'); bindRange('glow');
  bindRange('trail'); bindRange('particles', v => parseInt(v, 10)); bindRange('blur');
  controls.theme?.addEventListener('change', () => { state.theme = controls.theme.value; labRender(); });
  controls.easing?.addEventListener('change', () => { state.easing = controls.easing.value; labRender(); });
  controls.grid?.addEventListener('change', () => { state.grid = controls.grid.checked; labRender(); });
  controls.wire?.addEventListener('change', () => { state.wire = controls.wire.checked; labRender(); });
  controls.paused?.addEventListener('change', () => {
    state.paused = controls.paused.checked;
    if (state.paused) labStop(); else labStart();
    labRender();
  });
  $$('.lab-tab').forEach(b => b.addEventListener('click', () => {
    state.mark = b.dataset.mark;
    syncInputs();
    labRender();
  }));

  $('#lab-reset')?.addEventListener('click', () => {
    Object.assign(state, defaults);
    dragOffset = 0; labTime = 0;
    syncInputs(); labRender(); labStart();
    toast('Параметры сброшены');
  });
  $('#lab-random')?.addEventListener('click', () => {
    const marks = ['logo-swirl', 'logo-triangle', 'lab-m'];
    const themes = ['#c8ff3d', '#7c5cff', '#38d9ff', '#ff4fa3', '#ffb84d'];
    const easings = ['linear', 'sine', 'elastic'];
    const rnd = (a, b) => a + Math.random() * (b - a);
    Object.assign(state, {
      mark: marks[Math.floor(Math.random() * marks.length)],
      speed: Math.round(rnd(0.4, 2.4) * 10) / 10,
      scale: Math.round(rnd(0.65, 1.35) * 20) / 20,
      glow: Math.round(rnd(10, 90)),
      trail: Math.round(rnd(0, 85)),
      particles: Math.round(rnd(6, 40)),
      blur: Math.round(rnd(0, 2.5) * 10) / 10,
      theme: themes[Math.floor(Math.random() * themes.length)],
      easing: easings[Math.floor(Math.random() * easings.length)],
      wire: Math.random() < 0.25,
      paused: false
    });
    syncInputs(); labRender(); labStart();
    toast('Случайный пресет');
  });

  /* Export current state as standalone SVG */
  const BLADE = 'M100 16 C146 16 184 54 184 100 C184 141 156 175 118 183 C146 165 164 135 164 100 C164 58 136 24 100 16 Z';
  const TRIANGLE = 'M100 18 L188 178 H12 Z M100 66 L52 154 H148 Z';
  const MPATH = 'M38 158 V72 C38 48 58 42 70 62 L96 112 C100 120 104 120 108 112 L134 62 C146 42 166 48 166 72 V158';
  function markMarkup(color, wire) {
    const fill = wire ? 'none' : color;
    const stroke = wire ? color : 'none';
    const sw = wire ? 2 : 0;
    if (state.mark === 'logo-triangle') {
      return `<path d="${TRIANGLE}" fill="${fill}" fill-rule="evenodd" stroke="${stroke}" stroke-width="${sw}"/><path d="M12 178 H70 L58 154 H25 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity=".9"/>`;
    }
    if (state.mark === 'lab-m' || state.mark === 'logo-m') {
      return `<path d="${MPATH}" fill="none" stroke="${color}" stroke-width="${wire ? 3 : 30}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    let uses = '';
    for (let i = 0; i < 9; i++) {
      const s = 1 - i * 0.08;
      uses += `<use href="#b" transform="rotate(${i * 38} 100 100) translate(100 100) scale(${s}) translate(-100 -100)"/>`;
    }
    return `<g fill="${fill}" stroke="${stroke}" stroke-width="${sw}">${uses}</g>`;
  }
  function currentLabAngleScale() {
    const t = labTime;
    let angle = t * 40 + dragOffset;
    let pulse = 1;
    if (state.easing === 'sine') { angle += Math.sin(t * 2) * 10; pulse = 1 + Math.sin(t * 2) * 0.06; }
    if (state.easing === 'elastic') { angle += Math.sin(t * 6) * 14; pulse = 1 + Math.sin(t * 5) * 0.1; }
    return { angle, scale: state.scale * pulse };
  }
  function exportSVG() {
    const { angle, scale } = currentLabAngleScale();
    const color = state.theme;
    const glow = (state.glow / 100) * 10;
    const trailOpacity = (state.trail / 100) * 0.35;
    const lag = 10 + state.trail * 0.25;
    let particles = '';
    for (let i = 0; i < state.particles; i++) {
      const a = labTime * (0.5 + (i % 5) * 0.12) + i * 2.39996;
      const r = 120 + Math.sin(labTime * 1.3 + i) * 34 + (i % 4) * 8;
      const cx = (200 + Math.cos(a) * r).toFixed(1);
      const cy = (200 + Math.sin(a) * r).toFixed(1);
      const op = (0.25 + 0.6 * Math.abs(Math.sin(labTime + i))).toFixed(2);
      const fill = i % 3 === 0 ? color : i % 3 === 1 ? '#38d9ff' : '#f4f6fb';
      particles += `<circle cx="${cx}" cy="${cy}" r="${2 + (i % 3)}" fill="${fill}" opacity="${op}"/>`;
    }
    const grid = state.grid ? `<g opacity=".35" stroke="#2a3140" fill="none"><path d="M0 100H400M0 200H400M0 300H400M100 0V400M200 0V400M300 0V400"/><circle cx="200" cy="200" r="150"/></g>` : '';
    const bladeDef = state.mark === 'logo-swirl' ? `<path id="b" d="${BLADE}"/>` : '';
    const filter = (glow > 0 || state.blur > 0)
      ? `<filter id="g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="${state.blur}" result="soft"/><feGaussianBlur in="soft" stdDeviation="${glow}" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="soft"/></feMerge></filter>`
      : '';
    const filterAttr = filter ? ' filter="url(#g)"' : '';
    const ghosts = (!state.wire && state.trail > 0)
      ? `<g opacity="${trailOpacity * 0.55}" transform="${labTransform(angle - lag * 2, scale * 0.97)}"><g transform="translate(100 100)">${markMarkup(color, false)}</g></g>
         <g opacity="${trailOpacity}" transform="${labTransform(angle - lag, scale * 0.985)}"><g transform="translate(100 100)">${markMarkup(color, false)}</g></g>`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 400 400">
  <defs>${bladeDef}${filter}</defs>
  <rect width="400" height="400" fill="#0b0e14"/>
  ${grid}
  <g>${particles}</g>
  ${ghosts}
  <g transform="${labTransform(angle, scale)}"${filterAttr}><g transform="translate(100 100)">${markMarkup(color, state.wire)}</g></g>
</svg>`;
  }
  $('#lab-copy')?.addEventListener('click', () => copyText(exportSVG(), 'SVG скопирован'));
  $('#lab-download')?.addEventListener('click', () => {
    download('mufi-mark.svg', exportSVG(), 'image/svg+xml');
    toast('SVG скачан');
  });

  /* ---------- Init ---------- */
  $('#year').textContent = String(new Date().getFullYear());
  syncInputs();
  applyMotion();
  labRender();
})();
