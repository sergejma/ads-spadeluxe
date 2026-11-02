/* ============================================================
   Ausstellerliste · Formular in zwei Schritten, Zeitpunkt in die Beschreibung
   Läuft vor app.js (app.js prüft Pflichtfelder, sendet an Zoho und zeigt die Bestätigung).
   Schritt 1: Name und E-Mail. Schritt 2: Telefon, Postleitzahl, Zeitpunkt, Einwilligung.
   ============================================================ */
(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const ohne = (params.get('ohne') || '').split(',');
  if (ohne.indexOf('header') !== -1) { const kopf = document.getElementById('site-header'); if (kopf) kopf.remove(); }
  if (ohne.indexOf('cookies') !== -1) { try { if (!localStorage.getItem('cookie-consent')) localStorage.setItem('cookie-consent', 'essential'); } catch (e) { /* privater Modus */ } }

  // Vorschau der Bestätigung: ?vorschau=danke, zurück mit ?vorschau=formular
  const vorschau = params.get('vorschau');
  if (vorschau === 'danke') {
    try { sessionStorage.setItem('spa_lead_ausstellerliste', JSON.stringify({ first: 'Anna', funnel: 'ausstellerliste', ort: 'Senden bei Münster' })); } catch (e) { /* privater Modus */ }
  } else if (vorschau === 'formular') {
    try { sessionStorage.removeItem('spa_lead_ausstellerliste'); } catch (e) { /* privater Modus */ }
  }

  const form = document.getElementById('lead-form');
  if (!form) return;

  // ---------- Zeitpunkt (Einfachauswahl) ----------
  const chips = Array.from(document.querySelectorAll('[data-zeitpunkt] .chip'));
  chips.forEach((chip) => chip.addEventListener('click', () => chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)))));
  const zeitpunkt = () => { const c = chips.find((x) => x.getAttribute('aria-pressed') === 'true'); return c ? (c.dataset.wert || c.textContent.trim()) : ''; };

  // ---------- Zwei Schritte ----------
  const schritt1 = form.querySelector('[data-schritt="1"]');
  const schritt2 = form.querySelector('[data-schritt="2"]');
  const weiter = form.querySelector('[data-weiter]');
  const zurueck = form.querySelector('[data-zurueck]');
  const anzeige = document.querySelectorAll('[data-schritt-anzeige]');
  const first = document.getElementById('lead-first');
  const last = document.getElementById('lead-last');
  const email = document.getElementById('lead-email');

  function fehler(feld, id, text) {
    const box = document.getElementById(id);
    if (box) box.textContent = text || '';
    if (feld) feld.classList.toggle('is-invalid', !!text);
  }
  function schritt1Ok() {
    let ok = true;
    if (!last || last.value.trim().length < 2) { fehler(last, 'err-lead-last', 'Bitte Ihren Nachnamen eintragen.'); ok = false; } else fehler(last, 'err-lead-last', '');
    const mail = email ? email.value.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { fehler(email, 'err-lead-email', 'Bitte eine gültige E-Mail-Adresse eintragen, dorthin schicken wir die Liste.'); ok = false; } else fehler(email, 'err-lead-email', '');
    return ok;
  }
  function zeige(n) {
    if (schritt1) schritt1.hidden = n !== 1;
    if (schritt2) schritt2.hidden = n !== 2;
    anzeige.forEach((el) => { el.textContent = 'Schritt ' + n + ' von 2'; });
    form.setAttribute('data-aktiver-schritt', String(n));
    const ziel = n === 2 ? document.getElementById('lead-phone') : (first || last);
    if (ziel) { try { ziel.focus({ preventScroll: true }); } catch (e) { /* alt */ } }
  }
  if (weiter) weiter.addEventListener('click', () => {
    if (!schritt1Ok()) { (last && last.value.trim().length < 2 ? last : email).focus(); return; }
    zeige(2);
    const vorname = first ? first.value.trim() : '';
    const gruss = document.querySelector('[data-schritt2-gruss]');
    if (gruss) gruss.textContent = vorname ? ('Danke, ' + vorname + '. Noch drei Angaben, damit Ihr Berater die Stücke in Ihrer Nähe nennen kann.') : 'Noch drei Angaben, damit Ihr Berater die Stücke in Ihrer Nähe nennen kann.';
  });
  if (zurueck) zurueck.addEventListener('click', () => zeige(1));
  // Enter im ersten Schritt heißt „Weiter“, nicht absenden
  [first, last, email].forEach((feld) => { if (feld) feld.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && form.getAttribute('data-aktiver-schritt') !== '2') { ev.preventDefault(); if (weiter) weiter.click(); } }); });
  zeige(1);

  // ---------- Beschreibung für Zoho ----------
  const beschreibung = document.getElementById('lead-description');
  form.addEventListener('submit', () => {
    const teile = ['Ausstellerliste LP (ads.spadeluxe.de, Fassung 1 vom 02.11.2026), Liste per E-Mail, Berater ruft an und nennt die Stücke in der Nähe'];
    const z = zeitpunkt(); if (z) teile.push('Zeitpunkt: ' + z);
    if (beschreibung) beschreibung.value = teile.join(' · ');
  }, true);

  // ---------- PDF-Link nur zeigen, wenn eine Datei hinterlegt ist ----------
  const box = document.querySelector('[data-funnel]');
  const pdf = box ? (box.dataset.pdf || '') : '';
  document.querySelectorAll('[data-nur-mit-pdf]').forEach((el) => { el.hidden = !pdf; });
})();
