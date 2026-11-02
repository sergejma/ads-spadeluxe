/* Black November · Wasser im Becken. WebGL zeichnet die Draufsicht neu und legt eine bewegte Wasseroberfläche ins Becken
   (Brechung, Kaustiken, Glanz, Wellen bei Berührung); eine zweite Leinwand malt Sprudel an den Düsen und Dampf.
   Ohne WebGL bleibt das Foto stehen. Bei „weniger Bewegung“ und im Bildschirmfoto-Modus ein ruhiges Standbild. */
(() => {
  'use strict';
  const wurzel = document.querySelector('[data-wasser]');
  if (!wurzel) return;
  const glc = wurzel.querySelector('.wasser-gl');
  const c2 = wurzel.querySelector('.wasser-2d');
  if (!glc || !c2) return;
  const params = new URLSearchParams(window.location.search);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('shot');
  let jets = [];
  try { jets = JSON.parse(wurzel.dataset.jets || '[]'); } catch (e) { jets = []; }
  const gl = glc.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return;

  const VS = 'attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';
  const FS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uPool; uniform sampler2D uMask;',
    'uniform float uTime; uniform float uFill; uniform vec2 uAspect;',
    'uniform vec4 uRipple[5];',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float hgt(vec2 uv, float t){',
    '  vec2 p = uv * uAspect; float h = 0.0;',
    '  h += sin(dot(p, vec2(21.0, 9.0)) + t * 1.4) * 0.45;',
    '  h += sin(dot(p, vec2(-13.0, 24.0)) + t * 1.9) * 0.3;',
    '  h += (noise(p * 12.0 + vec2(t * 0.3, -t * 0.22)) - 0.5) * 1.2;',
    '  h += (noise(p * 26.0 - vec2(t * 0.5, t * 0.35)) - 0.5) * 0.5;',
    '  for (int i = 0; i < 5; i++) {',
    '    vec4 r = uRipple[i]; float age = t - r.z;',
    '    if (r.w > 0.0 && age > 0.0 && age < 3.0) {',
    '      float d = length((uv - r.xy) * uAspect); float front = age * 0.26;',
    '      float ring = exp(-pow((d - front) * 16.0, 2.0));',
    '      h += sin(d * 70.0 - age * 11.0) * ring * (1.0 - age / 3.0) * 1.6 * r.w;',
    '    }',
    '  }',
    '  return h; }',
    'float caustic(vec2 uv, float time){',
    '  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0; vec2 i = p; float c = 1.0; float inten = 0.005;',
    '  for (int n = 0; n < 4; n++) {',
    '    float t = time * (1.0 - (3.5 / float(n + 1)));',
    '    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));',
    '    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));',
    '  }',
    '  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0); }',
    'void main(){',
    '  float m = texture2D(uMask, vUv).r * uFill; float t = uTime; float e = 0.004;',
    '  float h = hgt(vUv, t);',
    '  vec2 g = vec2(hgt(vUv + vec2(e, 0.0), t) - hgt(vUv - vec2(e, 0.0), t), hgt(vUv + vec2(0.0, e), t) - hgt(vUv - vec2(0.0, e), t)) / (2.0 * e);',
    '  vec2 offset = g * 0.00012 * m;',
    '  vec4 base = texture2D(uPool, vUv + offset);',
    '  vec3 water = vec3(0.10, 0.52, 0.60);',
    '  vec3 col = mix(base.rgb, mix(base.rgb, water, 0.36), m);',
    '  float c = clamp(caustic(vUv * uAspect * 4.2 + 0.3, t * 0.5), 0.0, 1.0);',
    '  col += c * 0.11 * m * vec3(0.8, 1.0, 1.0);',
    '  col += smoothstep(0.6, 1.4, h) * 0.14 * m;',
    '  gl_FragColor = vec4(col, base.a);',
    '}',
  ].join('\n');

  function shader(typ, quelle) {
    const s = gl.createShader(typ); gl.shaderSource(s, quelle); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('Wasser-Shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('Wasser-Programm:', gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uTime = U('uTime'), uFill = U('uFill'), uAspect = U('uAspect'), uRipple = U('uRipple');
  gl.uniform1i(U('uPool'), 0); gl.uniform1i(U('uMask'), 1);
  gl.uniform2f(uAspect, 1.0, 750 / 900);
  const ripples = new Float32Array(20); let rippleIndex = 0;
  gl.uniform4fv(uRipple, ripples);

  function textur(einheit, img) {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + einheit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  const lade = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  // Leinwände an die Breite des Produkts anpassen (Seitenverhältnis des Fotos 900 zu 750)
  const ctx = c2.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, k = 1;
  function groesse() {
    const b = wurzel.getBoundingClientRect(); if (b.width < 10) return;
    const w = Math.round(b.width * dpr), h = Math.round(b.width * (750 / 900) * dpr);
    if (w === W && h === H) return;
    W = w; H = h; glc.width = W; glc.height = H; c2.width = W; c2.height = H; gl.viewport(0, 0, W, H); k = W / 900;
  }
  if ('ResizeObserver' in window) new ResizeObserver(groesse).observe(wurzel);
  window.addEventListener('resize', groesse);

  // Sprudel und Dampf
  const blasen = [];
  const wisps = [];
  const zufall = (a, b) => a + Math.random() * (b - a);
  function neuerWisp(unten) {
    return { x: zufall(0.12, 0.88), y: unten ? zufall(1.0, 1.25) : zufall(0.1, 0.95), rx: zufall(90, 170), ry: zufall(50, 95), a: zufall(0.045, 0.085), vy: zufall(0.028, 0.05), ph: Math.random() * 6.283, drift: zufall(0.02, 0.05) };
  }
  for (let i = 0; i < 7; i++) wisps.push(neuerWisp(false));

  function zeichne2D(t, dt, fill) {
    ctx.clearRect(0, 0, W, H);
    if (fill < 0.5) return;
    // Schaum und Blasen an den Düsen
    if (!still) {
      for (const j of jets) {
        if (Math.random() < dt * 1.7) blasen.push({ x: j[0] * W + zufall(-6, 6) * k, y: j[1] * H + zufall(-6, 6) * k, vx: zufall(-5, 5) * k, vy: zufall(-9, 3) * k, leben: 0, dauer: zufall(0.8, 1.5), rmax: zufall(3.5, 7) * k });
      }
      for (let i = blasen.length - 1; i >= 0; i--) {
        const b = blasen[i]; b.leben += dt / b.dauer; if (b.leben >= 1) { blasen.splice(i, 1); continue; }
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (const j of jets) {
      const x = j[0] * W, y = j[1] * H, r = (10 + 3 * Math.sin(t * 3.1 + j[0] * 40.0)) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    }
    for (const b of blasen) {
      const a = Math.sin(b.leben * Math.PI) * 0.55, r = (1.5 * k) + b.rmax * b.leben;
      ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.lineWidth = Math.max(1, 0.9 * k);
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.6).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(b.x - r * 0.35, b.y - r * 0.35, Math.max(0.6, r * 0.22), 0, 6.283); ctx.fill();
    }
    // Dampf: weiche Schwaden ziehen nach oben
    for (const w of wisps) {
      if (!still) { w.y -= w.vy * dt; w.x += Math.sin(t * 0.35 + w.ph) * w.drift * dt; if (w.y < -0.3) Object.assign(w, neuerWisp(true)); }
      const x = w.x * W, y = w.y * H, rx = w.rx * k, ry = w.ry * k;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(255,242,228,' + (w.a * fill).toFixed(3) + ')'); g.addColorStop(0.55, 'rgba(255,242,228,' + (w.a * 0.45 * fill).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,242,228,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.283); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }

  function zeichneGL(t, fill) {
    gl.uniform1f(uTime, t); gl.uniform1f(uFill, fill); gl.uniform4fv(uRipple, ripples);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  const ease = (p) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  let start = 0, letzte = 0, fillStart = 0, laeuft = false, sichtbar = true, zeitOffset = 0;
  function frame(now) {
    if (!laeuft) return;
    const dt = Math.min(0.05, (now - letzte) / 1000); letzte = now;
    const t = (now - start) / 1000 + zeitOffset;
    const fill = ease((now - fillStart) / 1800);
    groesse(); zeichneGL(t, fill); zeichne2D(t, dt, fill);
    requestAnimationFrame(frame);
  }
  function starte() { if (laeuft || still) return; laeuft = true; letzte = performance.now(); requestAnimationFrame(frame); }
  function stoppe() { laeuft = false; }
  function pruefe() { if (sichtbar && !document.hidden) starte(); else stoppe(); }
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { es.forEach((e) => { sichtbar = e.isIntersecting; pruefe(); }); }, { threshold: 0.02 }).observe(wurzel);
  document.addEventListener('visibilitychange', pruefe);

  // Wellen bei Berührung: Maus beim Bewegen, Finger beim Tippen
  let letzteWelle = 0, lx = -1, ly = -1;
  function welle(e, staerke) {
    const b = wurzel.getBoundingClientRect(); const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const now = performance.now(); const t = (now - start) / 1000 + zeitOffset;
    if (staerke < 1 && (now - letzteWelle < 140 || Math.hypot(x - lx, y - ly) < 0.05)) return;
    letzteWelle = now; lx = x; ly = y;
    const i = (rippleIndex++ % 5) * 4; ripples[i] = x; ripples[i + 1] = 1 - y; ripples[i + 2] = t; ripples[i + 3] = staerke;
  }
  wurzel.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') welle(e, 0.55); }, { passive: true });
  wurzel.addEventListener('pointerdown', (e) => welle(e, 1.0), { passive: true });

  Promise.all([lade(wurzel.dataset.pool || 'assets/vortex-palladium.png'), lade(wurzel.dataset.maske || 'assets/wasser-maske.png')]).then(([pool, maske]) => {
    textur(0, pool); textur(1, maske);
    groesse();
    wurzel.classList.add('aktiv');
    start = performance.now(); letzte = start; fillStart = start + 250;
    if (still) { zeitOffset = 3.2; zeichneGL(3.2, 1); zeichne2D(3.2, 0, 1); return; }
    pruefe();
  }).catch(() => {});
})();
