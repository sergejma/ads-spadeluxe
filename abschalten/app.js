/* ============================================================
   Bauherr Pilot-Page — Interactions
   - Smooth-Scroll (vom Browser via CSS; hier nur Header-Offset-Korrektur)
   - Messung nach Einwilligung: GA4, Meta-Pixel, Usermaven
   - Lead-Form (Zoho Web-to-Lead) → Erfolgsmeldung mit Knopf zur Leseansicht und Link auf das PDF
   - FAQ-Akkordeon, Sticky-Header, CTA-Klick-Tracking

   Konfiguration je Seite über data-Attribute am Formularbereich
   (data-funnel, data-pdf, data-pdf-name). Dieselbe Datei funktioniert
   auch für Seiten in Unterordnern (Einbindung als ../app.js) und für
   Seiten, denen einzelne Abschnitte fehlen: Jeder Teil prüft vorher,
   ob seine Elemente da sind.
   ============================================================ */

(() => {
  'use strict';

  // ---------- Scroll-Restoration + Force-Top für Ad-User ----------
  // Instagram-WebView (Android + iOS) springt bei manchen Ad-Klicks ohne
  // ersichtlichen Grund in die Mitte der Seite — verifiziert beim Klick aus
  // Insta-Ads. Scroll-Restoration auf 'manual' reicht nicht; wir holen den
  // User aktiv zurück, solange er noch nicht selbst gescrollt/getappt hat.
  //
  // Gated durch: kein Hash in URL + keine User-Interaktion bisher.
  // Smooth-Scroll wird temporär ausgeschaltet, damit der Reset nicht als
  // animierter "Yank-back" sichtbar wird.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  if (!window.location.hash) {
    const htmlEl = document.documentElement;
    htmlEl.style.scrollBehavior = 'auto';
    // overflow-anchor:none verhindert Chromes Scroll-Anchoring, das die
    // Scroll-Position verschiebt, wenn Hero-Content (Bilder, Fonts) nachladet
    // und die Layout-Höhe shiftet.
    htmlEl.style.overflowAnchor = 'none';
    document.body && (document.body.style.overflowAnchor = 'none');

    let userInteracted = false;
    ['touchstart', 'mousedown', 'wheel', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, () => { userInteracted = true; }, { once: true, passive: true });
    });

    const forceTop = () => { if (!userInteracted) window.scrollTo(0, 0); };
    document.addEventListener('DOMContentLoaded', forceTop);
    window.addEventListener('load', forceTop);

    // Kontinuierliches Polling für 3s — fängt späte Scroll-Sprünge ab, die
    // nach +800ms passieren (Insta-WebView Lade-Quirks, late Layout-Shifts).
    const watchEnd = Date.now() + 3000;
    const interval = setInterval(() => {
      if (Date.now() > watchEnd || userInteracted) {
        clearInterval(interval);
        htmlEl.style.scrollBehavior = '';
        return;
      }
      if (window.scrollY > 30) window.scrollTo(0, 0);
    }, 80);
  } else {
    // Aufruf mit Anker, zum Beispiel der Rücksprung aus der Leseansicht auf
    // #final-cta: ohne Animation direkt zum Ziel. Der weiche Bildlauf aus dem
    // CSS würde über die ganze Seitenlänge laufen und startet in einem Tab im
    // Hintergrund gar nicht.
    let hashInteracted = false;
    ['touchstart', 'mousedown', 'wheel', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, () => { hashInteracted = true; }, { once: true, passive: true });
    });
    const jumpToHash = () => {
      if (hashInteracted) return;
      const target = document.getElementById(window.location.hash.slice(1));
      if (!target) return;
      try {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      } catch (e) {
        target.scrollIntoView(true);
      }
    };
    document.addEventListener('DOMContentLoaded', jumpToHash);
    window.addEventListener('load', jumpToHash);
  }

  // ---------- Messdienste (nur nach Einwilligung „Alle akzeptieren") ----------
  // Geladen wird erst in loadConsentedTrackers(). Vorher existieren gtag, fbq
  // und usermaven nicht, die Ereignis-Helfer unten tun dann nichts. Dadurch
  // wird auch nichts nachgeholt, wenn jemand erst nach dem Absenden einwilligt.
  const GA_ID = 'G-1TQQ5LLNJF';
  const META_PIXEL_ID = '268744230610852';
  const USERMAVEN_KEY = 'UMPDUwQa6e';
  let trackersLoaded = false;

  function loadGoogleAnalytics() {
    if (window.gtag) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  function loadMetaPixel() {
    if (window.fbq) return;
    // Meta-Pixel-Basiscode (Standard). Den <noscript>-Teil gibt es hier
    // bewusst nicht: Das Bild würde ohne Einwilligung laden.
    /* eslint-disable */
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function loadUsermaven() {
    if (document.getElementById('um-tracker')) return;
    // Wie auf spadeluxe.de: Warteschlange anlegen, dann lib.js laden.
    window.usermaven = window.usermaven || function () {
      (window.usermavenQ = window.usermavenQ || []).push(arguments);
    };
    const t = document.createElement('script');
    t.defer = true;
    t.id = 'um-tracker';
    t.setAttribute('data-tracking-host', 'https://events.usermaven.com');
    t.setAttribute('data-key', USERMAVEN_KEY);
    t.setAttribute('data-autocapture', 'true');
    t.src = 'https://t.usermaven.com/lib.js';
    document.head.appendChild(t);
  }

  function loadConsentedTrackers() {
    // HubSpot-Tracking entfiel mit dem CRM-Wechsel zu Zoho (Sept. 2026).
    if (trackersLoaded) return;
    trackersLoaded = true;
    [loadGoogleAnalytics, loadMetaPixel, loadUsermaven].forEach((load) => {
      try {
        load();
      } catch (e) {
        if (window.console) console.warn('[Tracking] Dienst konnte nicht geladen werden', e);
      }
    });
  }

  // Ereignis-Helfer: senden nur, wenn der Dienst nach Einwilligung geladen ist.
  function trackGa(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }
  function trackMeta(name, params) {
    if (typeof window.fbq === 'function') window.fbq('track', name, params);
  }
  function trackUsermaven(name, params) {
    if (typeof window.usermaven === 'function') window.usermaven('track', name, params);
  }

  // ---------- DSGVO Cookie-Banner ----------
  const cookieBanner = document.getElementById('cookie-banner');
  if (cookieBanner) {
    let stored = null;
    try {
      stored = localStorage.getItem('cookie-consent');
    } catch (e) { /* Speicher gesperrt: Banner zeigen, nichts laden */ }
    if (!stored) {
      setTimeout(() => {
        cookieBanner.classList.add('visible');
        cookieBanner.setAttribute('aria-hidden', 'false');
      }, 800);
    } else if (stored === 'all') {
      // Returning visitor mit Volleinwilligung → Tracker direkt laden
      loadConsentedTrackers();
    }
    cookieBanner.querySelectorAll('[data-cookie]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.cookie;
        try {
          localStorage.setItem('cookie-consent', choice);
          localStorage.setItem('cookie-consent-date', new Date().toISOString());
        } catch (e) { /* private mode etc. */ }
        cookieBanner.classList.remove('visible');
        cookieBanner.setAttribute('aria-hidden', 'true');
        if (choice === 'all') {
          loadConsentedTrackers();
        }
      });
    });
  }

  // ---------- Attribution-Persistenz (UTM / Click-IDs) ----------
  // Marketing-Params beim ersten Visit in localStorage puffern und beim
  // Absenden in die versteckten Formularfelder schreiben (Key = data-attr).
  const ATTRIBUTION_STORAGE_KEY = 'spa_utm';
  const ATTRIBUTION_KEYS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'fbclid', 'msclkid', 'yclid', 'ttclid', 'li_fat_id',
  ];

  function extractAttribution(searchString) {
    const src = new URLSearchParams(searchString);
    const out = {};
    ATTRIBUTION_KEYS.forEach((k) => {
      const v = src.get(k);
      if (v) out[k] = v;
    });
    return out;
  }

  function loadStoredAttribution() {
    try {
      return JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  const attributionFromUrl = extractAttribution(window.location.search);
  if (Object.keys(attributionFromUrl).length) {
    try {
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attributionFromUrl));
    } catch (e) { /* private mode */ }
  }

  function currentAttribution() {
    // Aktuelle URL schlägt gespeicherte Werte (neuer Ad-Klick gewinnt).
    return Object.assign({}, loadStoredAttribution(), attributionFromUrl);
  }

  // ---------- Lead-Form (Zoho Web-to-Lead) → Planungsmappe ----------
  // Der Kontakt geht per nativem POST in einen versteckten iframe an
  // crm.zoho.eu/crm/WebToLeadForm (kein Backend, kein CORS-Problem,
  // fire-and-forget). Danach zeigt der Formularkasten die Erfolgsmeldung:
  // Phase 1 (kurze Animation), Phase 2 (Knopf zur Leseansicht, Link auf das PDF, Hinweis auf den Anruf).
  // Texte stehen im HTML. Hier wird nur der Vorname eingesetzt und der Link
  // aus data-pdf gesetzt.
  const LEAD_STORAGE_KEY = 'spa_lead';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  const PREP_DURATION_MS = 2400;

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // Je Funnel ein eigener Eintrag (spa_lead_bauherren, spa_lead_pool), damit
  // beide Seiten in derselben Sitzung ihren Stand behalten. Der Eintrag ohne
  // Zusatz stammt aus der früheren Fassung und zählt nur für seinen Funnel.
  function leadKey(funnelName) {
    return funnelName ? LEAD_STORAGE_KEY + '_' + funnelName : LEAD_STORAGE_KEY;
  }

  function readStoredLead(funnelName) {
    try {
      const raw = sessionStorage.getItem(leadKey(funnelName)) || sessionStorage.getItem(LEAD_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function storeLead(lead) {
    // Gespeichert werden nur Vorname und Funnel (für die Anzeige nach dem Neuladen).
    try {
      sessionStorage.setItem(leadKey(lead && lead.funnel), JSON.stringify(lead));
    } catch (e) { /* private mode */ }
  }

  const leadForm = document.getElementById('lead-form');

  if (leadForm) {
    const config = leadForm.closest('[data-funnel]') || document.querySelector('[data-funnel]');
    const funnel = (config && config.dataset.funnel) || '';
    const pdfUrl = (config && config.dataset.pdf) || '';
    const pdfName = (config && config.dataset.pdfName) || '';

    const formBox = leadForm.closest('.form-wrap');
    const formStep = leadForm.closest('.form-step');
    const success = (formBox && formBox.querySelector('.lead-success')) || document.getElementById('lead-success');
    const pdfLink = success ? success.querySelector('[data-pdf-link]') : null;

    const fields = {
      first: leadForm.querySelector('#lead-first'),
      last: leadForm.querySelector('#lead-last'),
      email: leadForm.querySelector('#lead-email'),
      phone: leadForm.querySelector('#lead-phone'),
      plz: leadForm.querySelector('#lead-plz'),
      consent: leadForm.querySelector('#lead-consent'),
    };
    const honeypot = leadForm.querySelector('[name="website_url"]');
    const submitBtn = leadForm.querySelector('[type="submit"]');
    let submitted = false;
    let phaseTimer = null;

    // Link auf die Leseansicht kommt aus data-pdf (relativ zur Seite, die das Formular enthält).
    if (pdfLink && pdfUrl) pdfLink.setAttribute('href', pdfUrl);
    if (pdfLink) {
      pdfLink.addEventListener('click', () => {
        trackGa('mappe_geoeffnet', { funnel: funnel });
        trackUsermaven('mappe_geoeffnet', { funnel: funnel });
      });
    }
    // Zweiter Weg: das PDF selbst (Link unter dem Knopf).
    const pdfFile = success ? success.querySelector('[data-pdf-datei]') : null;
    if (pdfFile) {
      pdfFile.addEventListener('click', () => {
        trackGa('mappe_pdf_geladen', { funnel: funnel });
        trackUsermaven('mappe_pdf_geladen', { funnel: funnel });
      });
    }

    function setPhase(phase, focusTitle) {
      if (!success) return;
      success.setAttribute('data-phase', phase);
      if (phase === 'done' && focusTitle) {
        const title = success.querySelector('.lead-done-title');
        if (title) {
          try {
            title.focus({ preventScroll: true });
          } catch (e) {
            title.focus();
          }
        }
      }
    }

    function showSuccess(firstName, opts) {
      const options = opts || {};
      if (!success) return;

      const name = (firstName || '').trim();
      const nameWrap = success.querySelector('[data-lead-name]');
      const nameSlot = success.querySelector('[data-lead-first]');
      if (nameWrap && nameSlot) {
        nameSlot.textContent = name;
        nameWrap.hidden = !name;
      }
      // Ausstellung aus der PLZ im Hinweis auf den Anruf ("aus der Ausstellung Hamburg")
      const ortWrap = success.querySelector('[data-lead-ort]');
      const ortSlot = success.querySelector('[data-lead-filiale]');
      if (ortWrap && ortSlot) {
        ortSlot.textContent = options.ort || '';
        ortWrap.hidden = !options.ort;
      }

      const instant = Boolean(options.instant) || prefersReducedMotion();
      if (instant) {
        success.setAttribute('data-instant', '');
      } else {
        success.removeAttribute('data-instant');
      }

      if (formStep) formStep.hidden = true;
      success.hidden = false;

      if (options.scroll && formBox) {
        formBox.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
      }

      if (phaseTimer) window.clearTimeout(phaseTimer);
      if (instant) {
        setPhase('done', options.focus);
      } else {
        setPhase('prep', false);
        phaseTimer = window.setTimeout(() => setPhase('done', options.focus), PREP_DURATION_MS);
      }
    }

    function setFieldError(key, message) {
      const input = fields[key];
      if (!input) return;
      const box = document.getElementById('err-lead-' + key);
      if (box) box.textContent = message || '';
      const holder = input.closest('.field');
      if (holder) holder.classList.toggle('has-error', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function clearErrors() {
      Object.keys(fields).forEach((k) => setFieldError(k, ''));
    }

    // ---- Nächste Ausstellung aus der PLZ ----
    // Zuordnung über die ersten zwei Ziffern (Leitregion) zur nächstgelegenen der sechs
    // Ausstellungen. Grobe Luftlinien-Zuordnung, der Vertrieb kann in Zoho umlegen.
    // Werte: Zoho-Territory (Auswahlliste), Filiale-Text in der Zoho-Schreibweise, Anzeige für Besucher.
    const AUSSTELLUNGEN = {
      Hamburg: { filiale: 'Hamburg', anzeige: 'Hamburg' },
      Senden: { filiale: 'Münster (NRW)', anzeige: 'Senden bei Münster' },
      Rüsselsheim: { filiale: 'Rüsselsheim', anzeige: 'Frankfurt (Rüsselsheim)' },
      Esslingen: { filiale: 'Esslingen am Neckar', anzeige: 'Esslingen am Neckar' },
      Nürnberg: { filiale: 'Nürnberg', anzeige: 'Nürnberg (Fürth)' },
      Unterhaching: { filiale: 'München', anzeige: 'München (Unterhaching)' },
    };
    const PLZ_REGION = {
      Nürnberg: ['01', '02', '04', '06', '07', '08', '09', '90', '91', '92', '93', '95', '96', '97', '98', '99'],
      Hamburg: ['03', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '37', '38', '39'],
      Senden: ['32', '33', '34', '40', '41', '42', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '58', '59'],
      Rüsselsheim: ['35', '36', '54', '55', '56', '57', '60', '61', '63', '64', '65', '66', '67', '68', '69'],
      Esslingen: ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '88', '89'],
      Unterhaching: ['80', '81', '82', '83', '84', '85', '86', '87', '94'],
    };
    function ausstellungFuerPlz(plz) {
      const zwei = String(plz || '').slice(0, 2);
      const territory = Object.keys(PLZ_REGION).find((t) => PLZ_REGION[t].indexOf(zwei) !== -1);
      return territory ? Object.assign({ territory: territory }, AUSSTELLUNGEN[territory]) : null;
    }
    const plzHinweis = document.getElementById('hint-lead-plz');
    function zeigePlzHinweis() {
      if (!fields.plz || !plzHinweis) return;
      const wert = fields.plz.value.replace(/\D/g, '').slice(0, 5);
      if (wert !== fields.plz.value) fields.plz.value = wert;
      const ort = wert.length === 5 ? ausstellungFuerPlz(wert) : null;
      plzHinweis.textContent = ort ? 'Ihre Ausstellung: ' + ort.anzeige : '';
    }
    if (fields.plz) fields.plz.addEventListener('input', zeigePlzHinweis);

    function validate() {
      clearErrors();
      const errors = [];

      if (!fields.last || !fields.last.value.trim()) {
        setFieldError('last', 'Bitte geben Sie Ihren Nachnamen an.');
        errors.push('last');
      }
      const email = fields.email ? fields.email.value.trim() : '';
      if (!email) {
        setFieldError('email', 'Bitte geben Sie Ihre E-Mail-Adresse an.');
        errors.push('email');
      } else if (!EMAIL_RE.test(email)) {
        setFieldError('email', 'Diese E-Mail-Adresse sieht nicht vollständig aus.');
        errors.push('email');
      }
      const phone = fields.phone ? fields.phone.value.trim() : '';
      const digits = phone.replace(/\D/g, '');
      if (!phone) {
        setFieldError('phone', 'Bitte geben Sie eine Telefonnummer an.');
        errors.push('phone');
      } else if (digits.length < 6) {
        setFieldError('phone', 'Bitte geben Sie eine vollständige Telefonnummer an.');
        errors.push('phone');
      }
      const plz = fields.plz ? fields.plz.value.trim() : '';
      if (fields.plz && !plz) {
        setFieldError('plz', 'Bitte geben Sie Ihre Postleitzahl an.');
        errors.push('plz');
      } else if (fields.plz && !/^\d{5}$/.test(plz)) {
        setFieldError('plz', 'Die Postleitzahl hat fünf Ziffern.');
        errors.push('plz');
      }
      if (!fields.consent || !fields.consent.checked) {
        setFieldError('consent', 'Bitte bestätigen Sie die Einwilligung.');
        errors.push('consent');
      }

      if (errors.length && fields[errors[0]]) fields[errors[0]].focus();
      return errors.length === 0;
    }

    function fillAttributionFields() {
      // data-max = Feldlänge in Zoho. Längere Werte (fbclid) werden gekürzt,
      // damit Zoho den Lead nicht wegen eines zu langen Feldes ablehnt.
      const attribution = currentAttribution();
      leadForm.querySelectorAll('[data-attr]').forEach((input) => {
        const max = parseInt(input.dataset.max || '', 10);
        const value = String(attribution[input.dataset.attr] || '');
        input.value = max > 0 ? value.slice(0, max) : value;
      });
    }

    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (submitted) return;

      const firstName = fields.first ? fields.first.value.trim() : '';

      // Honeypot gefüllt: Erfolg zeigen, damit Bots aus dem Verhalten nichts
      // lernen. Nichts senden, nichts speichern, keine Messereignisse.
      if (honeypot && honeypot.value.trim()) {
        submitted = true;
        showSuccess(firstName, { scroll: true, focus: true });
        return;
      }

      if (!validate()) return;

      submitted = true;
      if (submitBtn) submitBtn.disabled = true;

      fillAttributionFields();

      // Nächste Ausstellung aus der PLZ in die verdeckten Zoho-Felder (Filiale als Text, Territory als Auswahl)
      const ort = fields.plz ? ausstellungFuerPlz(fields.plz.value.trim()) : null;
      const filialeFeld = leadForm.querySelector('[data-filiale]');
      const territoryFeld = leadForm.querySelector('[data-territory]');
      if (filialeFeld) filialeFeld.value = ort ? ort.filiale : '';
      if (territoryFeld) territoryFeld.value = ort ? ort.territory : '';

      const token = leadForm.querySelector('[name="xnQsjsdp"]');
      const tokensMissing = !token || /^TODO/.test(token.value);

      if (tokensMissing) {
        // Dev-Modus: Ohne echte Webform-Tokens wuerde Zoho den POST verwerfen.
        if (window.console) console.warn('[Lead] Zoho-Webform-Tokens fehlen, Lead nicht gesendet');
      } else {
        const sink = document.querySelector('iframe[name="zoho-lead-sink"]');
        if (sink) {
          sink.addEventListener('load', () => {
            if (window.console) console.info('[Lead] Zoho-Antwort im iframe eingetroffen');
          }, { once: true });
        }
        // Nativer Submit in den iframe — fire-and-forget, wir warten nicht.
        leadForm.submit();
      }

      storeLead({ first: firstName, funnel: funnel, ort: ort ? ort.anzeige : '' });

      // Genau einmal je Absenden, und nur wenn die Dienste schon geladen sind.
      trackGa('lead_submitted', { event_category: 'unterlage', unterlage: pdfName, funnel: funnel, ausstellung: ort ? ort.territory : '' });
      trackMeta('Lead', { content_name: pdfName, content_category: funnel });
      trackUsermaven('lead_submitted', { funnel: funnel, ausstellung: ort ? ort.territory : '' });

      showSuccess(firstName, { scroll: true, focus: true, ort: ort ? ort.anzeige : '' });
    });

    // Schon abgesendet (gleiche Browser-Sitzung, gleicher Funnel): direkt
    // Phase 2 ohne Animation, ohne Scroll-Sprung, ohne erneute Messereignisse.
    // Einträge aus der früheren Termin-Version (ohne funnel, mit E-Mail) zählen
    // ebenfalls und werden dabei auf Vorname und Funnel gekürzt.
    const storedLead = readStoredLead(funnel);
    if (storedLead && typeof storedLead === 'object') {
      const legacy = funnel === 'bauherren' && !storedLead.funnel && Boolean(storedLead.email || storedLead.last);
      if (storedLead.funnel === funnel || legacy) {
        submitted = true;
        if (legacy) {
          storeLead({ first: storedLead.first || '', funnel: funnel });
          // Alten Eintrag mit E-Mail und Telefon entfernen.
          try { sessionStorage.removeItem(LEAD_STORAGE_KEY); } catch (e) { /* private mode */ }
        }
        showSuccess(storedLead.first, { instant: true, ort: storedLead.ort || '' });
      }
    }
  }

  // ---------- FAQ-Akkordeon ----------
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const button = item.querySelector('.faq-q');
    if (!button) return;
    button.addEventListener('click', () => {
      const willOpen = !item.classList.contains('open');
      item.classList.toggle('open', willOpen);
      button.setAttribute('aria-expanded', String(willOpen));
    });
  });

  // ---------- Sticky Site-Header (Top): Reveal nach Hero ----------
  const siteHeader = document.getElementById('site-header');
  const hero = document.querySelector('.hero');

  if (hero && siteHeader) {
    const update = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      const viewportH = window.innerHeight;
      const headerVisible = heroBottom < viewportH * 0.3;
      siteHeader.classList.toggle('visible', headerVisible);
      siteHeader.setAttribute('aria-hidden', String(!headerVisible));
    };
    update();
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
  }

  // ---------- Blätterbares Buch im Hero ----------
  // Markup in index.html (<a class="buch" data-seiten data-pfad>). Zu Beginn liegt das
  // Buch geschlossen, nach kurzer Zeit öffnet es sich und blättert Doppelseite für
  // Doppelseite bis zur letzten, dann schließt es sich wieder. Das Blatt rechts dreht
  // um den Falz, seine Rückseite zeigt die nächste linke Seite. Nach jedem Umschlag
  // werden die Bilder weitergereicht (dieselben Knoten, kein Nachladen) und das Blatt
  // springt ohne Übergang zurück auf die rechte Seite; die Bilder der nächsten
  // Doppelseite hängen dann schon verdeckt im Buch und laden in der Pause. Es blättert
  // nur, solange das Buch im Bild und der Tab sichtbar ist; unter dem Mauszeiger wartet
  // es. Bei reduzierter Bewegung bleibt die Titelseite stehen.
  const buch = document.querySelector('.buch');
  if (buch && !prefersReducedMotion()) {
    const seiten = parseInt(buch.dataset.seiten || '16', 10);
    const pfad = buch.dataset.pfad || '';
    const sizes = buch.dataset.sizes || '(min-width: 900px) 280px, 190px';
    const links = buch.querySelector('[data-rolle="links"]');
    const rechts = buch.querySelector('[data-rolle="rechts"]');
    const blatt = buch.querySelector('[data-rolle="blatt"]');
    const vorn = buch.querySelector('[data-rolle="vorn"]');
    const hinten = buch.querySelector('[data-rolle="hinten"]');
    const DAUER_MS = 1050; // wie die transition in styles.css
    const PAUSE_MS = 2300; // Lesepause je Doppelseite
    const PAUSE_ZU_MS = 1200; // geschlossen liegen bleiben, bevor es wieder aufgeht
    const START_MS = 400; // erstes Öffnen kurz nach dem Laden
    const START_MAX_MS = 1500; // länger warten wir nicht auf die Bilder der ersten Doppelseite
    // Bei gerader Seitenzahl ist die letzte Doppelseite (n-2 | n-1), die Rückseite bleibt zu.
    const LETZTE_RECHTS = seiten % 2 === 0 ? seiten - 1 : seiten;
    let offenRechts = 0; // Seite, die rechts aufgeschlagen liegt; 0 = geschlossen
    let laeuft = false;
    let wartet = false;
    let sichtbar = true;
    let pausiert = false;
    let timer = 0;

    function bild(n) {
      const nn = String(n).padStart(2, '0');
      const picture = document.createElement('picture');
      const source = document.createElement('source');
      source.type = 'image/webp';
      source.srcset = `${pfad}${nn}-380.webp 380w, ${pfad}${nn}-760.webp 760w`;
      source.sizes = sizes;
      const img = document.createElement('img');
      img.src = `${pfad}${nn}-760.jpg`;
      img.srcset = `${pfad}${nn}-380.jpg 380w, ${pfad}${nn}-760.jpg 760w`;
      img.sizes = sizes;
      img.alt = '';
      img.width = 760;
      img.height = 1076;
      img.decoding = 'async';
      picture.append(source, img);
      return picture;
    }
    // Zeigt Seite n in einer Fläche; 0 oder außerhalb = leer. Gleiche Seite bleibt stehen.
    function zeige(ziel, n) {
      if (ziel.dataset.seite === String(n)) return;
      ziel.replaceChildren();
      ziel.dataset.seite = String(n);
      if (n >= 1 && n <= seiten) ziel.appendChild(bild(n));
    }
    // Reicht das fertig geladene Bild von einer Fläche an eine andere weiter.
    function uebernimm(ziel, quelle) {
      ziel.replaceChildren(...quelle.childNodes);
      ziel.dataset.seite = quelle.dataset.seite || '0';
      quelle.dataset.seite = '0';
    }
    function nachUebergang(callback) {
      let erledigt = false;
      const fertig = () => {
        if (erledigt) return;
        erledigt = true;
        blatt.removeEventListener('transitionend', beiEnde);
        callback();
      };
      const beiEnde = (e) => {
        if (e.target === blatt && e.propertyName === 'transform') fertig();
      };
      blatt.addEventListener('transitionend', beiEnde);
      window.setTimeout(fertig, DAUER_MS + 120);
    }
    // Blatt ohne Übergang in eine Lage bringen (Reflow erzwingt den Sprung ohne Animation).
    function springe(umgeschlagen) {
      blatt.classList.add('ohne-uebergang');
      blatt.classList.toggle('ist-umgeschlagen', umgeschlagen);
      void blatt.offsetWidth;
      blatt.classList.remove('ohne-uebergang');
    }
    // Verdeckte Flächen mit den nächsten Seiten füllen: Rückseite des Blatts = nächste
    // linke Seite, feste rechte Seite = übernächste rechte Seite.
    function vorbereiten() {
      if (offenRechts === 0) {
        zeige(vorn, 1);
        zeige(hinten, 2);
        zeige(rechts, 3);
        zeige(links, 0);
      } else {
        zeige(hinten, offenRechts + 1);
        zeige(rechts, offenRechts + 2);
      }
    }
    function blaettern() {
      laeuft = true;
      const neuRechts = offenRechts === 0 ? 3 : offenRechts + 2;
      buch.dataset.zustand = 'offen';
      blatt.classList.add('ist-am-blaettern', 'ist-umgeschlagen');
      nachUebergang(() => {
        offenRechts = neuRechts;
        uebernimm(links, hinten); // gelandete Rückseite wird die feste linke Seite
        springe(false);
        uebernimm(vorn, rechts); // Blatt zeigt rechts wieder die aufgeschlagene Seite
        blatt.classList.remove('ist-am-blaettern');
        vorbereiten();
        laeuft = false;
        plane(PAUSE_MS);
      });
    }
    function schliessen() {
      laeuft = true;
      uebernimm(rechts, vorn); // rechte feste Seite zeigt wieder die aufgeschlagene Seite
      uebernimm(hinten, links); // Blatt liegt links und zeigt die linke Seite
      zeige(vorn, 1); // seine Vorderseite ist die Titelseite
      springe(true);
      buch.dataset.zustand = 'zu';
      blatt.classList.add('ist-am-blaettern');
      blatt.classList.remove('ist-umgeschlagen');
      nachUebergang(() => {
        offenRechts = 0;
        blatt.classList.remove('ist-am-blaettern');
        vorbereiten();
        laeuft = false;
        plane(PAUSE_ZU_MS);
      });
    }
    function schritt() {
      if (laeuft) return;
      if (!sichtbar || pausiert || document.hidden) {
        wartet = true;
        return;
      }
      wartet = false;
      if (offenRechts >= LETZTE_RECHTS) schliessen();
      else blaettern();
    }
    function plane(ms) {
      window.clearTimeout(timer);
      timer = window.setTimeout(schritt, ms);
    }
    function weiter() {
      if (wartet && !laeuft) plane(400);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        sichtbar = entries.some((e) => e.isIntersecting);
        if (sichtbar) weiter();
      }, { threshold: 0.25 }).observe(buch);
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) weiter();
    });
    buch.addEventListener('mouseenter', () => { pausiert = true; });
    buch.addEventListener('mouseleave', () => {
      pausiert = false;
      weiter();
    });

    // Erstes Öffnen kurz nach dem Laden, aber nicht bevor die erste Doppelseite
    // (Rückseite des Blatts und rechte Seite) geladen ist, sonst klappt Weiß auf.
    function bilderGeladen(flaechen) {
      return Promise.all(flaechen.map((flaeche) => new Promise((fertig) => {
        const img = flaeche.querySelector('img');
        if (!img || img.complete) {
          fertig();
          return;
        }
        img.addEventListener('load', fertig, { once: true });
        img.addEventListener('error', fertig, { once: true });
      })));
    }
    vorbereiten();
    const startZeit = performance.now();
    Promise.race([
      bilderGeladen([hinten, rechts]),
      new Promise((weiter) => window.setTimeout(weiter, START_MAX_MS)),
    ]).then(() => {
      plane(Math.max(80, START_MS - (performance.now() - startZeit)));
    });
  }

  // ---------- CTA-Klick-Tracking ----------
  document.querySelectorAll('[data-cta]').forEach((el) => {
    el.addEventListener('click', () => {
      const label = el.getAttribute('data-cta');
      if (window.gtag) {
        window.gtag('event', 'cta_click', {
          event_category: 'engagement',
          event_label: label,
        });
      }
    });
  });

  // ---------- Smooth-Scroll-Korrektur für Anker ----------
  // CSS regelt das primär; hier nur Hash-State-Cleanup nach Klick.
  // Fehlt das Ziel auf einer Seite, bleibt der Link beim normalen Verhalten.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });

  // ---------- Reading-Progress (subtil — nur für Heatmap-Korrelation später) ----------
  // Optional, kann später aktiviert werden
})();
