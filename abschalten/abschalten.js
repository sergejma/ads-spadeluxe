/* Abschalten · Einblenden beim Scrollen, Zeitwunsch in die Beschreibung, Vorschau der Bestätigung. Läuft vor app.js. */
(() => {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const ohne = (params.get('ohne') || '').split(',');
  if (ohne.indexOf('cookies') !== -1) { try { if (!localStorage.getItem('cookie-consent')) localStorage.setItem('cookie-consent', 'essential'); } catch (e) {} }
  const shot = params.get('shot');
  if (shot) { document.body.classList.add('shot'); document.body.style.setProperty('--shot', parseInt(shot, 10) + 'px'); document.querySelectorAll('.reveal').forEach((el) => el.classList.add('sichtbar')); document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; }); }
  const vorschau = params.get('vorschau');
  if (vorschau === 'danke') { try { sessionStorage.setItem('spa_lead_abschalten', JSON.stringify({ first: 'Anna', funnel: 'abschalten', ort: 'Senden bei Münster' })); } catch (e) {} }
  else if (vorschau === 'formular') { try { sessionStorage.removeItem('spa_lead_abschalten'); } catch (e) {} }

  // Einblenden: sofort, sobald ein Block ins Bild kommt (keine Wartezeit)
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('sichtbar'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  document.querySelectorAll('.reveal').forEach((el) => { if (io) io.observe(el); else el.classList.add('sichtbar'); });

  // Parallax im Hero (nur Transform, per rAF)
  const heroBg = document.querySelector('[data-parallax]');
  const reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroBg && !reduziert) {
    let tick = false;
    const setze = () => { const y = Math.min(window.scrollY, window.innerHeight); heroBg.style.setProperty('--py', (y * 0.22) + 'px'); heroBg.style.transform = 'scale(1.02) translateY(' + (y * 0.22) + 'px)'; tick = false; };
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(setze); } }, { passive: true });
    heroBg.addEventListener('animationend', setze);
  }
  // Bild-Bildschirme als sichtbar markieren (Fallback ohne Scroll-Animationen)
  document.querySelectorAll('.bild').forEach((el) => { if (io) io.observe(el); else el.classList.add('sichtbar'); });
  // Zaehler: hochzaehlen (oder runter), sobald sichtbar
  const zaehler = document.querySelectorAll('[data-zaehler]');
  const zio = ('IntersectionObserver' in window) ? new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return; zio.unobserve(e.target);
      const ziel = Number(e.target.dataset.zaehler), von = Number(e.target.dataset.von || 0), start = performance.now(), dauer = 1400;
      const lauf = (t) => { const p = Math.min(1, (t - start) / dauer), ease = 1 - Math.pow(1 - p, 3); e.target.textContent = Math.round(von + (ziel - von) * ease); if (p < 1) requestAnimationFrame(lauf); };
      if (reduziert || shot) e.target.textContent = ziel; else requestAnimationFrame(lauf);
    });
  }, { threshold: 0.6 }) : null;
  zaehler.forEach((el) => { if (zio) zio.observe(el); else el.textContent = el.dataset.zaehler; });
  // Kopf: beim Runterscrollen weg, beim Hochscrollen da
  const kopf = document.querySelector('.kopf'); let letzte = 0;
  window.addEventListener('scroll', () => { const y = window.scrollY; if (kopf) kopf.classList.toggle('weg', y > 160 && y > letzte); letzte = y; }, { passive: true });

  // Zeitwunsch (Chips, Einfachauswahl)
  const chips = document.querySelectorAll('[data-zeit] .chip');
  chips.forEach((c) => c.addEventListener('click', () => chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)))));
  const form = document.getElementById('lead-form');
  const beschreibung = document.getElementById('lead-description');
  if (form) form.addEventListener('submit', () => {
    const zeit = Array.from(chips).find((c) => c.getAttribute('aria-pressed') === 'true');
    const teile = ['Abschalten-Kampagne, Probebaden nach Feierabend, Termin wird am Telefon abgestimmt'];
    if (zeit) teile.push('Wunschzeit: ' + (zeit.dataset.wert || zeit.textContent.trim()));
    if (beschreibung) beschreibung.value = teile.join(' · ');
  }, true);
})();
