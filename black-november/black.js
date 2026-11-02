/* Black November · Einblenden beim Scrollen, Wertstapel, Zähler, Resttage, Produkt im Hero, Wunschzeit in die Beschreibung, Vorschau. Läuft vor app.js. */
(() => {
  'use strict';
  const params = new URLSearchParams(window.location.search);
  const ohne = (params.get('ohne') || '').split(',');
  if (ohne.indexOf('cookies') !== -1) { try { if (!localStorage.getItem('cookie-consent')) localStorage.setItem('cookie-consent', 'essential'); } catch (e) {} }
  const shot = params.get('shot');
  const reduziert = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = reduziert || Boolean(shot);
  if (shot) {
    document.body.classList.add('shot');
    document.documentElement.classList.remove('js');
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('sichtbar'));
    document.querySelectorAll('[data-summe]').forEach((el) => el.classList.add('fertig'));
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
  }
  const vorschau = params.get('vorschau');
  if (vorschau === 'danke') { try { sessionStorage.setItem('spa_lead_black-november', JSON.stringify({ first: 'Anna', funnel: 'black-november', ort: 'Senden bei Münster' })); } catch (e) {} }
  else if (vorschau === 'formular') { try { sessionStorage.removeItem('spa_lead_black-november'); } catch (e) {} }

  // Fristen: Tage bis zum Aktionsende, Bestelltag für Weihnachten (jeweils Ende des Tages, Ortszeit)
  const endeDesTages = (iso) => { const [j, m, t] = iso.split('-').map(Number); return new Date(j, m - 1, t, 23, 59, 59); };
  const tageBis = (iso) => Math.ceil((endeDesTages(iso) - Date.now()) / 86400000);
  document.querySelectorAll('[data-tage-bis]').forEach((el) => {
    const n = tageBis(el.dataset.tageBis);
    if (n <= 0) el.textContent = el.dataset.vorbei || 'beendet';
    else if (n === 1) el.textContent = el.dataset.einzahl || 'noch 1 Tag';
    else el.textContent = (el.dataset.mehrzahl || 'noch {n} Tage').replace('{n}', String(n));
  });

  // Einblenden: sofort, sobald ein Block ins Bild kommt
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('sichtbar'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }) : null;
  document.querySelectorAll('.reveal').forEach((el) => { if (io) io.observe(el); else el.classList.add('sichtbar'); });

  // Zähler: zählen hoch, sobald sichtbar (Zielwert steht schon im HTML, falls kein Skript läuft)
  const format = (el, wert) => (el.dataset.format === 'de' ? Math.round(wert).toLocaleString('de-DE') : String(Math.round(wert)));
  const fertigMelden = (el) => { const summe = el.closest('[data-summe]'); if (summe) summe.classList.add('fertig'); };
  const zio = ('IntersectionObserver' in window) ? new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      zio.unobserve(e.target);
      const el = e.target, ziel = Number(el.dataset.zaehler), von = Number(el.dataset.von || 0);
      if (still) { el.textContent = format(el, ziel); fertigMelden(el); return; }
      const start = performance.now(), dauer = Number(el.dataset.dauer || 1500);
      const lauf = (t) => {
        const p = Math.min(1, (t - start) / dauer), ease = 1 - Math.pow(1 - p, 3);
        el.textContent = format(el, von + (ziel - von) * ease);
        if (p < 1) requestAnimationFrame(lauf); else fertigMelden(el);
      };
      el.textContent = format(el, von);
      requestAnimationFrame(lauf);
    });
  }, { threshold: 0.6 }) : null;
  document.querySelectorAll('[data-zaehler]').forEach((el) => { if (zio && !shot) zio.observe(el); else { el.textContent = format(el, Number(el.dataset.zaehler)); fertigMelden(el); } });

  // Kopf: nach dem ersten Scrollen als dunkle Leiste; mobile Leiste unten ab dem zweiten Bildschirm, nicht über dem Formular
  const kopf = document.querySelector('.kopf');
  const leiste = document.getElementById('leiste-mobil');
  const formular = document.getElementById('sichern');
  let formularSichtbar = false;
  if (formular && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => { es.forEach((e) => { formularSichtbar = e.isIntersecting; leisteSetzen(); }); }, { threshold: 0.05 }).observe(formular);
  }
  const leisteSetzen = () => { const da = window.scrollY > window.innerHeight * 0.9 && !formularSichtbar; if (leiste) leiste.classList.toggle('da', da); document.body.classList.toggle('leiste-da', da); };

  // Produkt im Hero: beim Scrollen flacher, nach oben, ausblenden; Bildbänder: leichte Parallaxe ohne CSS-Scroll-Animationen
  const produkt = document.querySelector('[data-produkt]');
  const scrollAnimationen = (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  const baender = scrollAnimationen ? [] : Array.from(document.querySelectorAll('.band .bg[data-parallax]'));
  let tick = false;
  const setze = () => {
    tick = false;
    const y = window.scrollY, vh = window.innerHeight;
    if (kopf) kopf.classList.toggle('fest', y > 40);
    leisteSetzen();
    if (produkt && !still) {
      const r = produkt.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.18 - r.top) / (vh * 0.6)));
      produkt.style.transform = 'translateY(' + (p * vh * 0.1) + 'px) scale(' + (1 - p * 0.05) + ')';
      produkt.style.opacity = String(1 - p * 0.9);
    }
    if (!still) baender.forEach((bg) => {
      const r = bg.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const versatz = (r.top + r.height / 2 - vh / 2) * -0.10;
      bg.style.transform = 'scale(1.14) translateY(' + versatz + 'px)';
    });
  };
  window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(setze); } }, { passive: true });
  window.addEventListener('resize', setze);
  setze();

  // Wunschzeit (Chips, Einfachauswahl) und Beschreibung für Zoho
  const chips = document.querySelectorAll('[data-zeit] .chip');
  chips.forEach((c) => c.addEventListener('click', () => chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)))));
  const form = document.getElementById('lead-form');
  const beschreibung = document.getElementById('lead-description');
  if (form) form.addEventListener('submit', () => {
    const zeit = Array.from(chips).find((c) => c.getAttribute('aria-pressed') === 'true');
    const teile = ['Black November LP (ads.spadeluxe.de, Fassung 1 vom 02.11.2026), Rückruf zum Black Bundle und den Aktionsmodellen'];
    if (zeit) teile.push('Wunschzeit: ' + (zeit.dataset.wert || zeit.textContent.trim()));
    teile.push('Zeitpunkt: ' + new Date().toLocaleString('de-DE'));
    if (beschreibung) beschreibung.value = teile.join(' · ');
  }, true);
})();
