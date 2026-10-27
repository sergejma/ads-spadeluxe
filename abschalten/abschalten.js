/* Abschalten · Einblenden beim Scrollen, Zeitwunsch in die Beschreibung, Vorschau der Bestätigung. Läuft vor app.js. */
(() => {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const ohne = (params.get('ohne') || '').split(',');
  if (ohne.indexOf('cookies') !== -1) { try { if (!localStorage.getItem('cookie-consent')) localStorage.setItem('cookie-consent', 'essential'); } catch (e) {} }
  const shot = params.get('shot');
  if (shot) { document.body.classList.add('shot'); document.body.style.setProperty('--shot', parseInt(shot, 10) + 'px'); document.querySelectorAll('.reveal').forEach((el) => el.classList.add('sichtbar')); }
  const vorschau = params.get('vorschau');
  if (vorschau === 'danke') { try { sessionStorage.setItem('spa_lead_abschalten', JSON.stringify({ first: 'Anna', funnel: 'abschalten', ort: 'Senden bei Münster' })); } catch (e) {} }
  else if (vorschau === 'formular') { try { sessionStorage.removeItem('spa_lead_abschalten'); } catch (e) {} }

  // Einblenden: sofort, sobald ein Block ins Bild kommt (keine Wartezeit)
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('sichtbar'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  document.querySelectorAll('.reveal').forEach((el) => { if (io) io.observe(el); else el.classList.add('sichtbar'); });

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
