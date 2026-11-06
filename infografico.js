(function () {
  'use strict';
  const C = window.CENA, raiz = document.getElementById('infografico'), dadosEl = document.getElementById('dados-dia');
  if (!C || !raiz || !dadosEl) return;
  const D = JSON.parse(dadosEl.textContent), passos = D.passos, cfg = D.creche3d, mp = D.mapa;
  const $ = (s, r = raiz) => r.querySelector(s), $$ = (s, r = raiz) => [...r.querySelectorAll(s)];
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EX = D.exagero || 1.5;
  const FUNDO = [0.043, 0.043, 0.047];

  const hud = $('.hud'), hTit = $('.hud-titulo'), hHora = $('.hud-hora'), hFase = $('.hud-fase'), hTxt = $('.hud-texto'),
        hFonte = $('.hud-fonte'), hLink = $('.hud-link'), hPos = $('.hud-pos'), bAnt = $('.b-ant'), bSeg = $('.b-seg'), pontosEl = $('.hud-pontos');
  let atual = 0, tela = null;
  const botoes = passos.map((p, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ponto';
    b.setAttribute('aria-label', 'Etapa ' + (k + 1) + ': ' + p.titulo);
    b.addEventListener('click', () => ir(k)); pontosEl.appendChild(b); return b;
  });
  function ir(n, silencioso) {
    atual = Math.max(0, Math.min(passos.length - 1, n));
    const p = passos[atual];
    hud.classList.remove('entra'); void hud.offsetWidth; hud.classList.add('entra');
    hFase.textContent = p.fase || ''; hTit.textContent = p.titulo;
    hHora.textContent = p.hora || ''; hHora.hidden = !p.hora;
    hTxt.innerHTML = ''; String(p.texto).split('\n').forEach(t => { const q = document.createElement('p'); q.textContent = t; if (/^[“"]/.test(t)) q.className = 'cita'; hTxt.appendChild(q); }); hFonte.textContent = p.fonte || ''; hFonte.hidden = !p.fonte;
    if (p.link) { hLink.href = p.link.href || '#'; hLink.dataset.acao = p.link.acao || ''; hLink.textContent = p.link.texto; hLink.hidden = false; } else hLink.hidden = true;
    hPos.textContent = (atual + 1) + ' / ' + passos.length;
    botoes.forEach((b, k) => { b.classList.toggle('atual', k === atual); b.classList.toggle('feito', k < atual); k === atual ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'); });
    bAnt.disabled = atual === 0; bSeg.disabled = atual === passos.length - 1;
    hud.classList.remove('min'); hud.scrollTop = 0; $('.hud-corpo').scrollTop = 0;
    if (atual === passos.length - 1) revelaDesdobramentos(false);
    raiz.dataset.vista = p.vista || 'cidade';
    if (tela && !silencioso) tela.aplicar(p);
  }
  const secDesd = document.getElementById('desdobramentos');
  function revelaDesdobramentos(rolar) {
    if (!secDesd) return;
    secDesd.hidden = false; try { sessionStorage.setItem('dia-fim', '1'); } catch (e) {}
    if (rolar) setTimeout(() => secDesd.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 60);
  }
  try { if (sessionStorage.getItem('dia-fim')) secDesd.hidden = false; } catch (e) {}

  const fundoMapa = document.querySelector('.fundo-mapa');
  if (fundoMapa && secDesd && 'IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => fundoMapa.classList.toggle('ligado', e.isIntersecting)), { threshold: 0.02 }).observe(secDesd);
  if (location.hash === '#desdobramentos') revelaDesdobramentos(true);
  window.addEventListener('hashchange', () => { if (location.hash === '#desdobramentos') revelaDesdobramentos(true); });
  hLink.addEventListener('click', e => { const a = hLink.dataset.acao; if (a === 'inicio') { e.preventDefault(); ir(0); } else if (a === 'desdobramentos') { e.preventDefault(); revelaDesdobramentos(true); } });
  bAnt.addEventListener('click', () => ir(atual - 1));
  bSeg.addEventListener('click', () => ir(atual + 1));
  $('.b-min').addEventListener('click', () => { const m = hud.classList.toggle('min'); $('.b-min').setAttribute('aria-expanded', String(!m)); if (tela && tela.redesenha) tela.redesenha(); });
  raiz.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { ir(atual + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { ir(atual - 1); e.preventDefault(); }
  });

  const canvas = $('.info-gl'), over = $('.info-rot');
  let gl = null;
  try { gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl'); } catch (e) { gl = null; }
  if (!gl) { raiz.classList.add('sem-3d'); ir(0, true); return; }

  const b64 = s => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u.buffer; };
  const T = C.terr, HG = new Int16Array(b64(T.h)), NX = T.nx, NY = T.ny, PS = T.passo, X0 = T.x0, Y0 = T.y0;
  const alt = (x, y) => {
    let fx = (x - X0) / PS, fy = (y - Y0) / PS;
    if (fx < 0 || fy < 0 || fx > NX - 1.001 || fy > NY - 1.001) return 0;
    const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * NX + i;
    return ((HG[k] * (1 - u) + HG[k + 1] * u) * (1 - v) + (HG[k + NX] * (1 - u) + HG[k + NX + 1] * u) * v) / 10 * EX;
  };
  const nrm = (x, y) => {
    const e = PS * .6, dx = (alt(x + e, y) - alt(x - e, y)) / (2 * e), dy = (alt(x, y + e) - alt(x, y - e)) / (2 * e), l = Math.hypot(dx, dy, 1);
    return [-dx / l, -dy / l, 1 / l];
  };
  const LIM = { x0: -150e3, x1: 520e3, y0: -330e3, y1: 170e3 };
  const FILL = .075, BORDA = 260;
  (function suaviza() { for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const bd = Math.min(i, NX - 1 - i, j, NY - 1 - j) * PS, f = Math.max(0, Math.min(1, bd / BORDA)); if (f < 1) HG[j * NX + i] *= f * f * (3 - 2 * f); } })();
  const ll = (lon, lat) => [(lon - C.ref.lon0) * C.ref.mlon - C.O[0], (lat - C.ref.lat0) * C.ref.mlat - C.O[1]];

  const m4 = {
    persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2), r = 1 / (n - fa); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (n + fa) * r, -1, 0, 0, 2 * n * fa * r, 0]; },
    look(e, c, u) {
      let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
      let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
    },
    mul(a, b) { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) o[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3]; return o; }
  };
  const area2 = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const cruz = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const noTri = (p, a, b, c) => cruz(a, b, p) >= -1e-9 && cruz(b, c, p) >= -1e-9 && cruz(c, a, p) >= -1e-9;
  function ear(P) {
    let idx = P.map((_, i) => i); if (area2(P) < 0) idx.reverse();
    const out = []; let g = 0;
    while (idx.length > 3 && g++ < 4000) {
      let cortou = false;
      for (let i = 0; i < idx.length; i++) {
        const a = idx[(i + idx.length - 1) % idx.length], b = idx[i], c = idx[(i + 1) % idx.length];
        if (cruz(P[a], P[b], P[c]) <= 1e-9) continue;
        let ok = true;
        for (const k of idx) { if (k === a || k === b || k === c) continue; if (noTri(P[k], P[a], P[b], P[c])) { ok = false; break; } }
        if (ok) { out.push(a, b, c); idx.splice(i, 1); cortou = true; break; }
      }
      if (!cortou) { for (let i = 1; i < idx.length - 1; i++) out.push(idx[0], idx[i], idx[i + 1]); idx = []; break; }
    }
    if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
    return out;
  }
  const dentro = (P, x, y) => { let r = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) r = !r; return r; };

  class Malha {
    constructor() { this.v = []; }
    tri(a, b, c, col, n) {
      if (!n) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(...n) || 1; n = [n[0] / l, n[1] / l, n[2] / l]; }
      this.v.push(a[0], a[1], a[2], n[0], n[1], n[2], col[0], col[1], col[2], b[0], b[1], b[2], n[0], n[1], n[2], col[0], col[1], col[2], c[0], c[1], c[2], n[0], n[1], n[2], col[0], col[1], col[2]);
    }
    quad(a, b, c, d, col, n) { this.tri(a, b, c, col, n); this.tri(a, c, d, col, n); }
    prisma(P, z0, z1, colLado, colTopo) {
      const n = P.length;
      for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; this.quad([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], colLado); }
      for (let i = 1; i < n - 1; i++) this.tri([P[0][0], P[0][1], z1], [P[i][0], P[i][1], z1], [P[i + 1][0], P[i + 1][1], z1], colTopo, [0, 0, 1]);
    }
    caixa(x0, y0, x1, y1, z0, z1, cl, ct) { this.prisma([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1, cl, ct || cl); }
    arr() { return new Float32Array(this.v); }
  }
  const cinza = g => [g, g, g];

  const compila = (vs, fs) => {
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };
  const FOG = 'uniform vec3 uBg; uniform vec2 uF; float neblina(float d){ return smoothstep(uF.x, uF.y, d); }';
  let P1, P2;
  try {
    P1 = compila('attribute vec3 aP,aN,aC; uniform mat4 uM; uniform vec3 uL; uniform float uLit; varying vec3 vC; varying float vD; varying float vS;' +
      'void main(){ gl_Position=uM*vec4(aP,1.); vC=aC; vD=gl_Position.w; vS=mix(1.0, 0.34+0.74*abs(dot(normalize(aN),uL)), uLit); }',
      'precision mediump float; varying vec3 vC; varying float vD; varying float vS; uniform float uA; ' + FOG +
      'void main(){ float f=neblina(vD); gl_FragColor=vec4(mix(vC*vS,uBg,f), uA*(1.0-f)); }');
    P2 = compila('attribute vec3 aP; attribute vec2 aU; uniform mat4 uM; varying vec2 vU; varying float vD; void main(){ gl_Position=uM*vec4(aP,1.); vU=aU; vD=gl_Position.w; }',
      'precision mediump float; varying vec2 vU; varying float vD; uniform sampler2D uT; uniform float uA; ' + FOG +
      'void main(){ vec4 t=texture2D(uT,vU); float f=neblina(vD); gl_FragColor=vec4(mix(t.rgb,uBg,f), t.a*uA*(1.0-f)); }');
  } catch (e) { console.warn('WebGL indisponível', e); raiz.classList.add('sem-3d'); ir(0, true); return; }
  const loc = (p, n) => gl.getUniformLocation(p, n);
  const U1 = { M: loc(P1, 'uM'), L: loc(P1, 'uL'), Lit: loc(P1, 'uLit'), A: loc(P1, 'uA'), Bg: loc(P1, 'uBg'), F: loc(P1, 'uF') };
  const U2 = { M: loc(P2, 'uM'), A: loc(P2, 'uA'), Bg: loc(P2, 'uBg'), F: loc(P2, 'uF'), T: loc(P2, 'uT') };
  const A1 = { P: gl.getAttribLocation(P1, 'aP'), N: gl.getAttribLocation(P1, 'aN'), C: gl.getAttribLocation(P1, 'aC') };
  const A2 = { P: gl.getAttribLocation(P2, 'aP'), U: gl.getAttribLocation(P2, 'aU') };

  const bufDe = (arr, idx) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    let ib = null; if (idx) { ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW); }
    return { b, ib, n: idx ? idx.length : arr.length / 9 }; };
  const desenha = (o, modo, lit, alfa) => {
    gl.useProgram(P1); gl.bindBuffer(gl.ARRAY_BUFFER, o.b);
    gl.enableVertexAttribArray(A1.P); gl.enableVertexAttribArray(A1.N); gl.enableVertexAttribArray(A1.C);
    gl.vertexAttribPointer(A1.P, 3, gl.FLOAT, false, 36, 0); gl.vertexAttribPointer(A1.N, 3, gl.FLOAT, false, 36, 12); gl.vertexAttribPointer(A1.C, 3, gl.FLOAT, false, 36, 24);
    gl.uniform1f(U1.Lit, lit); gl.uniform1f(U1.A, alfa == null ? 1 : alfa);
    if (o.ib) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.ib); gl.drawElements(modo || gl.TRIANGLES, o.n, gl.UNSIGNED_SHORT, 0); }
    else gl.drawArrays(modo || gl.TRIANGLES, 0, o.n);
  };

  const verde = (C.verde || []).map(f => { const p = []; for (let i = 0; i < f.length; i += 2) p.push([f[i] / 10, f[i + 1] / 10]); const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    return { p, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; });
  const ehVerde = (x, y) => verde.some(g => x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1 && dentro(g.p, x, y));
  const partes = [];
  (function relevo() {
    const TS = 64;
    for (let j0 = 0; j0 < NY - 1; j0 += TS) for (let i0 = 0; i0 < NX - 1; i0 += TS) {
      const i1 = Math.min(i0 + TS, NX - 1), j1 = Math.min(j0 + TS, NY - 1), w = i1 - i0 + 1, h = j1 - j0 + 1;
      const V = new Float32Array(w * h * 9); let o = 0;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = X0 + i * PS, y = Y0 + j * PS, z = HG[j * NX + i] / 10 * EX, n = nrm(x, y);
        const bd = Math.min(x - X0, X0 + (NX - 1) * PS - x, y - Y0, Y0 + (NY - 1) * PS - y), fb = Math.max(0, Math.min(1, bd / BORDA)), g0 = ehVerde(x, y) ? 0.42 : 0.33 + Math.min(.08, z / EX / 1500), g = FILL + (g0 - FILL) * fb * fb;
        V.set([x, y, z, n[0], n[1], n[2], g, g, g], o); o += 9;
      }
      const I = new Uint16Array((w - 1) * (h - 1) * 6); let k = 0;
      for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) { const a = j * w + i; I.set([a, a + 1, a + w, a + 1, a + w + 1, a + w], k); k += 6; }
      partes.push({ o: bufDe(V, I), lit: 1 });
    }
  })();

  const malhaDe = (d, col, lift) => {
    if (!d) return null;
    const v = new Int16Array(b64(d.v)), t = new Uint16Array(b64(d.t)), m = new Malha(), pts = [];
    for (let i = 0; i < v.length; i += 2) { const x = v[i] / 10, y = v[i + 1] / 10; pts.push([x, y, alt(x, y) + lift, nrm(x, y)]); }
    for (let i = 0; i < t.length; i += 3) { const a = pts[t[i]], b = pts[t[i + 1]], c = pts[t[i + 2]]; if (!a || !b || !c) continue;
      m.tri(a, b, c, col, a[3]); }
    return bufDe(m.arr());
  };
  [[C.ruas, .66, .22], [C.trilhas, .55, .2], [C.agua, .11, .12]].forEach(([d, g, l]) => [].concat(d || []).forEach(dd => { const o = malhaDe(dd, cinza(g), l); if (o) partes.push({ o, lit: 1 }); }));

  const lote = C.lote;
  (function predios() {
    const m = new Malha();
    C.pred.forEach(([h, flat]) => {
      let P = []; for (let i = 0; i < flat.length; i += 2) P.push([flat[i] / 10, flat[i + 1] / 10]);
      if (P.length < 3) return; if (area2(P) < 0) P.reverse();
      const zb = Math.min(...P.map(p => alt(p[0], p[1]))) - .2, zt = zb + h + .2, cl = cinza(.74), ct = cinza(.9);
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < .05) continue;
        m.quad([a[0], a[1], zb], [b[0], b[1], zb], [b[0], b[1], zt], [a[0], a[1], zt], cl); }
      const tr = ear(P); for (let i = 0; i < tr.length; i += 3) m.tri([P[tr[i]][0], P[tr[i]][1], zt], [P[tr[i + 1]][0], P[tr[i + 1]][1], zt], [P[tr[i + 2]][0], P[tr[i + 2]][1], zt], ct, [0, 0, 1]);
    });
    partes.push({ o: bufDe(m.arr()), lit: 1 });
  })();

  (function arvores() {
    const m = new Malha(), a = C.arv;
    for (let i = 0; i < a.length; i += 3) {
      const x = a[i] / 10, y = a[i + 1] / 10, r = a[i + 2] / 10 * .8, z = alt(x, y), h = Math.max(3.5, r * 2.8), g = .46 + ((i * 7919) % 17) / 17 * .12;
      const p = [[x + r, y], [x, y + r], [x - r, y], [x, y - r]], t = [x, y, z + h];
      for (let k = 0; k < 4; k++) { const q = p[k], s = p[(k + 1) % 4]; m.tri([q[0], q[1], z + h * .25], [s[0], s[1], z + h * .25], t, cinza(g)); }
    }
    partes.push({ o: bufDe(m.arr()), lit: 1 });
  })();

  const estado = mp.estado || { cidades: [] }, estadoLinha = null, estadoBox = ll(-51.2, -27.3);

  const MB = mp.mapaBase || null, ladrilhos = new Map(); let quadroN = 0;
  const merc = (lon, lat) => { const n = Math.PI - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) ; return [(lon + 180) / 360, n / (2 * Math.PI)]; };
  const cantos = (z, x, y) => { const n = 2 ** z, lat = t => Math.atan(Math.sinh(Math.PI * (1 - 2 * t / n))) * 180 / Math.PI; return [x / n * 360 - 180, lat(y), (x + 1) / n * 360 - 180, lat(y + 1)]; };
  function ladrilho(z, x, y, zl) {
    const k = z + '/' + x + '/' + y; let t = ladrilhos.get(k);
    if (t) { t.uso = quadroN; return t; }
    t = { z, x, y, uso: quadroN, ok: false, tex: null, buf: null, zl };
    const [lo0, la0, lo1, la1] = cantos(z, x, y), a = ll(lo0, la0), b = ll(lo1, la0), c = ll(lo1, la1), d = ll(lo0, la1);
    const v = new Float32Array([a[0], a[1], zl, 0, 0, b[0], b[1], zl, 1, 0, c[0], c[1], zl, 1, 1, a[0], a[1], zl, 0, 0, c[0], c[1], zl, 1, 1, d[0], d[1], zl, 0, 1]);
    t.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, t.buf); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    const img = new Image(); let img2 = null; img.crossOrigin = 'anonymous';
    img.onload = () => { try { const cv = document.createElement('canvas'); cv.width = img.naturalWidth || 256; cv.height = img.naturalHeight || 256; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0); const id = cx.getImageData(0, 0, cv.width, cv.height), D = id.data; for (let i = 0; i < D.length; i += 4) { const g = .3 * D[i] + .59 * D[i + 1] + .11 * D[i + 2], v = (255 - g) * .62; D[i] = D[i + 1] = D[i + 2] = v; } cx.putImageData(id, 0, 0); img2 = cv; } catch (e) { img2 = img; } t.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img2); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); t.ok = true; invalida(); };
    const fontes = [].concat(MB.tiles); let fi = 0; const sub = MB.sub || ['a'];
    const carrega = () => { img.src = fontes[fi].replace('{s}', sub[(x + y) % sub.length]).replace('{z}', z).replace('{x}', x).replace('{y}', y); };
    img.referrerPolicy = 'origin'; img.onerror = () => { if (++fi < fontes.length) carrega(); else t.erro = true; };
    carrega();
    ladrilhos.set(k, t);
    if (ladrilhos.size > 360) { [...ladrilhos.entries()].sort((p, q) => p[1].uso - q[1].uso).slice(0, 80).forEach(([kk, tt]) => { if (tt.tex) gl.deleteTexture(tt.tex); gl.deleteBuffer(tt.buf); ladrilhos.delete(kk); }); }
    return t;
  }
  function camadaLadrilhos(z, cxm, cym, R, zl, maxN) {
    const lon = C.ref.lon0 + (cxm + C.O[0]) / C.ref.mlon, lat = C.ref.lat0 + (cym + C.O[1]) / C.ref.mlat, dlon = R / C.ref.mlon, dlat = R / C.ref.mlat;
    const n = 2 ** z, f = (lo, la) => { const m = merc(lo, la); return [m[0] * n, m[1] * n]; };
    let a = f(lon - dlon, lat + dlat), b = f(lon + dlon, lat - dlat); const x0 = Math.max(0, Math.floor(a[0])), x1 = Math.min(n - 1, Math.floor(b[0])), y0 = Math.max(0, Math.floor(a[1])), y1 = Math.min(n - 1, Math.floor(b[1]));
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > maxN) return false;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) desenhaLadrilho(ladrilho(z, x, y, zl));
    return true;
  }
  function desenhaLadrilho(t) {
    if (!t.ok) return; gl.useProgram(P2); gl.bindBuffer(gl.ARRAY_BUFFER, t.buf);
    gl.enableVertexAttribArray(A2.P); gl.enableVertexAttribArray(A2.U); gl.vertexAttribPointer(A2.P, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(A2.U, 2, gl.FLOAT, false, 20, 12);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(U2.T, 0); gl.uniform1f(U2.A, 1); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function desenhaMapaBase() {
    if (!MB) return; quadroN++;
    const d = cam.dist, res = d * .00085, zd = Math.max(5, Math.min(17, Math.floor(Math.log2(139500 / res)) - 1));
    gl.enable(gl.POLYGON_OFFSET_FILL);
    const camada = (z, R, nivel, max) => { gl.polygonOffset(-nivel * 3, -nivel * 3); let zz = z; while (zz > 6 && !camadaLadrilhos(zz, cam.tx, cam.ty, R, -3, max)) zz--; };
    gl.polygonOffset(0, 0); camadaLadrilhos(6, estadoBox[0], estadoBox[1], 400000, -3, 40);
    if (zd > 7) camada(Math.max(7, zd - 3), d * 4.8, 1, 70);
    if (zd > 6) camada(zd, d * 1.6, 2, 70);
    gl.polygonOffset(0, 0); gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  const linhas = (function () {
    const menor = [], maior = [];
    C.curvas.forEach(([lv, f]) => {
      const dst = lv % 25 === 0 ? maior : menor;
      for (let i = 0; i + 3 < f.length; i += 2) {
        const ax = f[i] / 10, ay = f[i + 1] / 10, bx = f[i + 2] / 10, by = f[i + 3] / 10;
        if (Math.min(ax - X0, X0 + (NX - 1) * PS - ax, ay - Y0, Y0 + (NY - 1) * PS - ay) < BORDA * .8) continue;
        dst.push(ax, ay, alt(ax, ay) + .3, 0, 0, 1, 1, 1, 1, bx, by, alt(bx, by) + .3, 0, 0, 1, 1, 1, 1);
      }
    });
    return { menor: bufDe(new Float32Array(menor)), maior: bufDe(new Float32Array(maior)) };
  })();

  const PL = cfg.plano, u2 = (ux, uy) => [PL.origem[0] + (ux - PL.ux0) * PL.u, PL.origem[1] - (uy - PL.uy0) * PL.u];
  const Z0 = T.z0 * EX, cG = D.cenaGrid || {};
  const LH = cfg.altura * PL.u, ESP = Math.max(.15, cfg.espessura * PL.u), MURO = cfg.alturaMuro || 2.2;
  const locais = cfg.locais.map(l => ({ ...l, c: u2(l.ret[0] + l.ret[2] / 2, l.ret[1] + l.ret[3] / 2), a: u2(l.ret[0], l.ret[1]), b: u2(l.ret[0] + l.ret[2], l.ret[1] + l.ret[3]) }));
  const porId = id => locais.find(l => l.id === id);

  const portoes = (cfg.portoes || []).map(g => {
    const p = u2(g.ux, g.uy); let melhor = null;
    lote.forEach((a, i) => { const b = lote[(i + 1) % lote.length], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), q = [a[0] + dx * t, a[1] + dy * t], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (!melhor || d < melhor.d) melhor = { i, t, d, q, L: Math.sqrt(L2), ang: Math.atan2(dy, dx) }; });
    return { ...g, ...melhor, h: g.largura / melhor.L / 2 };
  });
  let epoca = 'antes', creche = [], vidros = null;
  const colParede = cinza(.93), colTopo = cinza(.98);

  function aberturas(vis) {
    const fechado = vis.filter(l => !l.aberto && l.id !== 'base' && l.id !== 'reserv'), abertos = vis.filter(l => l.aberto || l.id === 'base');
    const dentro = (l, x, y) => x >= l.ret[0] && x <= l.ret[0] + l.ret[2] && y >= l.ret[1] && y <= l.ret[1] + l.ret[3];
    const quem = (x, y) => { for (const l of fechado) if (dentro(l, x, y)) return l; for (const l of abertos) if (l.id !== 'base' && dentro(l, x, y)) return l; for (const l of abertos) if (dentro(l, x, y)) return l; return null; };
    const sol = l => /^sol/.test(l.id), wc = l => /sanit|pne|vest/.test(l.id), M = 1 / PL.u;
    const ops = [], feitos = new Set();
    fechado.forEach(R => {
      const [x, y, w, h] = R.ret, grande = w * h > 15000, abre = [];
      [['h', y, x, x + w, -1], ['h', y + h, x, x + w, 1], ['v', x, y, y + h, -1], ['v', x + w, y, y + h, 1]].forEach(([ax, c, a0, a1, out]) => {
        let atual = null, ini = a0;
        const fecha = fim => { if (atual === undefined) return; const N = atual, len = fim - ini; if (len >= 26) abre.push({ ax, c, a0: ini, a1: fim, out, N }); };
        atual = undefined;
        for (let t = a0 + 2; t <= a1 - 2; t += 4) {
          const px = ax === 'h' ? t : c + out * 7, py = ax === 'h' ? c + out * 7 : t, N = quem(px, py);
          if (atual === undefined) { atual = N; ini = a0; } else if (N !== atual) { fecha(t); atual = N; ini = t; }
        }
        fecha(a1);
      });
      let melhor = null;
      abre.forEach(r => {
        const N = r.N, len = r.a1 - r.a0, mid = (r.a0 + r.a1) / 2;
        const par = N ? [R.id, N.id].sort().join('|') : '';
        if (sol(R) || (N && sol(N))) { if (N && !N.aberto && !feitos.has(par)) { feitos.add(par); const lg = Math.min(len - 6, 1.3 * M); ops.push({ R: R.id, ax: r.ax, c: r.c, s0: mid - lg / 2, s1: mid + lg / 2, tipo: 'porta', vidro: true, sill: 0, head: 2.1, out: r.out }); } return; }
        if (N && ((R.id === 'sala' && N.id === 'antiga_san') || (R.id === 'antiga_san' && N.id === 'sala'))) { if (!feitos.has(par)) { feitos.add(par); ops.push({ R: R.id, ax: r.ax, c: r.c, s0: mid - 14, s1: mid + 14, tipo: 'porta', sill: 0, head: 2.1, out: r.out }); } return; }
        if (!N || N.aberto) { if (N && (!melhor || len > melhor.a1 - melhor.a0)) melhor = r; }
      });
      abre.forEach(r => {
        const N = r.N, len = r.a1 - r.a0;
        if (sol(R) || (N && !N.aberto)) return;
        if (r === melhor) { const lg = Math.min(len - 6, (grande ? 1.2 : .9) * M), mid = (r.a0 + r.a1) / 2; ops.push({ R: R.id, ax: r.ax, c: r.c, s0: mid - lg / 2, s1: mid + lg / 2, tipo: 'porta', sill: 0, head: 2.1, out: r.out }); }
        const n = Math.max(1, Math.floor(len / 75)), lg = Math.min((wc(R) ? .6 : 1.4) * M, len / n * .7);
        if (r === melhor && len < 80) return;
        for (let k = 0; k < n; k++) { let c0 = r.a0 + len * (k + .5) / n; if (r === melhor && Math.abs(c0 - (r.a0 + r.a1) / 2) < lg * .5 + 18) continue;
          ops.push({ R: R.id, ax: r.ax, c: r.c, s0: c0 - lg / 2, s1: c0 + lg / 2, tipo: 'janela', sill: wc(R) ? 1.5 : 1, head: wc(R) ? 2.1 : 2.15, out: r.out }); }
      });
    });

    const pr = (cfg.aberturas || []).map(o => { const mid = (o.s0 + o.s1) / 2, pa = o.ax === 'h' ? [mid, o.c + 7] : [o.c + 7, mid], pb = o.ax === 'h' ? [mid, o.c - 7] : [o.c - 7, mid], Na = quem(pa[0], pa[1]), Nb = quem(pb[0], pb[1]);
      const fora = N => !N || N.aberto; return { ...o, out: fora(Na) && !fora(Nb) ? 1 : fora(Nb) && !fora(Na) ? -1 : 1 }; });
    const tem = (R, tipo) => { const [x, y, w, h] = R.ret; return pr.some(o => o.tipo === tipo && (o.ax === 'h' ? (Math.abs(o.c - y) < 2 || Math.abs(o.c - y - h) < 2) && o.s1 > x && o.s0 < x + w : (Math.abs(o.c - x) < 2 || Math.abs(o.c - x - w) < 2) && o.s1 > y && o.s0 < y + h)); };
    const porId2 = new Map(fechado.map(r => [r.id, r]));
    const auto = cfg.soProjeto ? ops.filter(o => /^b[23]_/.test(o.R)) : ops.filter(o => { const R = porId2.get(o.R); if (!R || !pr.length || /^b[23]_/.test(R.id)) return true; if (o.vidro) return !pr.some(p => p.ax === o.ax && Math.abs(p.c - o.c) < 2 && p.s1 > o.s0 && p.s0 < o.s1);
      return !tem(R, o.tipo === 'porta' ? 'porta' : 'janela'); });
    return pr.filter(o => !o.epoca || o.epoca === epoca).concat(auto);
  }

  function montaCreche() {
    const m = new Malha(), zp = Z0 + .06;

    const P = lote.map(p => [p[0], p[1]]), tr = ear(P);
    for (let i = 0; i < tr.length; i += 3) m.tri([P[tr[i]][0], P[tr[i]][1], zp - .04], [P[tr[i + 1]][0], P[tr[i + 1]][1], zp - .04], [P[tr[i + 2]][0], P[tr[i + 2]][1], zp - .04], cinza(.3), [0, 0, 1]);
    const vis = locais.filter(l => !l.epoca || l.epoca === epoca);

    vis.filter(l => l.aberto || l.id === 'base').sort((a, b) => b.ret[2] * b.ret[3] - a.ret[2] * a.ret[3]).forEach((l, i) => {
      const g = l.id === 'base' ? .34 : l.piso === false ? null : .44; if (g == null) return;
      const z = zp + .005 * (i + 1);
      m.quad([l.a[0], l.b[1], z], [l.b[0], l.b[1], z], [l.b[0], l.a[1], z], [l.a[0], l.a[1], z], cinza(g), [0, 0, 1]);
    });
    vis.filter(l => !l.aberto && l.id !== 'base').forEach(l => {
      const z = zp + .04, g = l.id === 'sala' ? .5 : .62;
      m.quad([l.a[0], l.b[1], z], [l.b[0], l.b[1], z], [l.b[0], l.a[1], z], [l.a[0], l.a[1], z], cinza(g), [0, 0, 1]);
    });

    const ops = aberturas(vis);
    const vidro = new Malha();
    const ar = new Map();
    vis.filter(l => !l.aberto).forEach(l => {
      const [x, y, w, h] = l.ret;
      [[x, y, x + w, y], [x + w, y, x + w, y + h], [x, y + h, x + w, y + h], [x, y, x, y + h]].forEach(e => {
        const k = e.join(','); const alt_ = (l.altura || cfg.altura) * PL.u;
        if (!ar.has(k)) ar.set(k, { e, h: alt_ }); else ar.get(k).h = Math.max(ar.get(k).h, alt_);
      });
    });
    const caixaU = (ax, c, s0, s1, z0, z1) => {
      if (s1 - s0 < .01 || z1 - z0 < .005) return;
      const a = ax === 'h' ? u2(s0, c) : u2(c, s0), b = ax === 'h' ? u2(s1, c) : u2(c, s1), t = ESP / 2;
      const x0 = Math.min(a[0], b[0]) - (ax === 'h' ? 0 : t), x1 = Math.max(a[0], b[0]) + (ax === 'h' ? 0 : t), y0 = Math.min(a[1], b[1]) - (ax === 'h' ? t : 0), y1 = Math.max(a[1], b[1]) + (ax === 'h' ? t : 0);
      m.caixa(x0, y0, x1, y1, z0, z1, colParede, colTopo);
    };
    ar.forEach(({ e, h }) => {
      const ax = e[1] === e[3] ? 'h' : 'v', c = ax === 'h' ? e[1] : e[0], a0 = ax === 'h' ? Math.min(e[0], e[2]) : Math.min(e[1], e[3]), a1 = ax === 'h' ? Math.max(e[0], e[2]) : Math.max(e[1], e[3]);
      const aqui = ops.filter(o => o.ax === ax && Math.abs(o.c - c) < 1.5 && o.s1 > a0 && o.s0 < a1 && o.sill < h).sort((p, q) => p.s0 - q.s0);
      let cur = a0;
      aqui.forEach(o => {
        const s0 = Math.max(a0, o.s0), s1 = Math.min(a1, o.s1);
        caixaU(ax, c, cur, s0, zp, zp + h);
        if (o.sill > 0) caixaU(ax, c, s0, s1, zp, zp + Math.min(h, o.sill));
        if (o.head < h) caixaU(ax, c, s0, s1, zp + o.head, zp + h);
        cur = Math.max(cur, s1);
      });
      caixaU(ax, c, cur, a1, zp, zp + h);
    });
    const vistos = new Set();
    ops.forEach(o => {
      const k = [o.ax, Math.round(o.c), Math.round(o.s0), o.tipo].join(); if (vistos.has(k)) return; vistos.add(k);
      const P0 = o.ax === 'h' ? u2(o.s0, o.c) : u2(o.c, o.s0), P1 = o.ax === 'h' ? u2(o.s1, o.c) : u2(o.c, o.s1);
      const nU = o.ax === 'h' ? [0, o.out] : [o.out, 0], nS = [nU[0], -nU[1]];
      if (o.tipo === 'janela' || o.vidro) {
        const z0 = zp + Math.max(o.sill, .02), z1 = zp + o.head;
        vidro.quad([P0[0], P0[1], z0], [P1[0], P1[1], z0], [P1[0], P1[1], z1], [P0[0], P0[1], z1], [.78, .86, .95], [nS[0], nS[1], 0]);
        const mx = (P0[0] + P1[0]) / 2, my = (P0[1] + P1[1]) / 2;
        if (o.tipo === 'janela' && Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) > .9) m.caixa(mx - .025, my - .025, mx + .025, my + .025, z0, z1, colParede);
        [z0, z1].forEach(z => m.caixa(Math.min(P0[0], P1[0]) - .03, Math.min(P0[1], P1[1]) - .03, Math.max(P0[0], P1[0]) + .03, Math.max(P0[1], P1[1]) + .03, z - .025, z + .025, colParede));
      }
      if (o.tipo === 'porta' && !o.vidro) {
        const dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, th = 1.15, dirx = Math.cos(th) * ux + Math.sin(th) * nS[0], diry = Math.cos(th) * uy + Math.sin(th) * nS[1];
        const Q = [P0[0] + dirx * L, P0[1] + diry * L], ox = -diry * .03, oy = dirx * .03;
        m.prisma([[P0[0] + ox, P0[1] + oy], [Q[0] + ox, Q[1] + oy], [Q[0] - ox, Q[1] - oy], [P0[0] - ox, P0[1] - oy]], zp, zp + 2.05, cinza(.5), cinza(.56));
      }
    });

    const intervalos = lote.map(() => []);
    portoes.forEach(g => intervalos[g.i].push([Math.max(0, g.t - g.h), Math.min(1, g.t + g.h)]));
    lote.forEach((a, i) => {
      const b = lote[(i + 1) % lote.length], gaps = intervalos[i].sort((p, q) => p[0] - q[0]); let t0 = 0;
      const seg = (s0, s1) => { if (s1 - s0 < .004) return; const ax = a[0] + (b[0] - a[0]) * s0, ay = a[1] + (b[1] - a[1]) * s0, bx = a[0] + (b[0] - a[0]) * s1, by = a[1] + (b[1] - a[1]) * s1;
        const L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L * .12, ny = (bx - ax) / L * .12;
        const alto = (ay + by) / 2 > 8 ? (cfg.alturaMuroNorte || 3.5) : MURO; m.prisma([[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], zp, zp + alto, cinza(.55), cinza(.72)); };
      gaps.forEach(([g0, g1]) => { seg(t0, g0); t0 = g1; }); seg(t0, 1);
    });
    portoes.forEach(g => [-1, 1].forEach(s => { const t = g.t + s * g.h, px = lote[g.i][0] + (lote[(g.i + 1) % lote.length][0] - lote[g.i][0]) * t, py = lote[g.i][1] + (lote[(g.i + 1) % lote.length][1] - lote[g.i][1]) * t;
      m.caixa(px - .22, py - .22, px + .22, py + .22, zp, zp + MURO + .35, cinza(.95)); }));
    creche = [{ o: bufDe(m.arr()), lit: 1 }]; vidros = vidro.v.length ? bufDe(vidro.arr()) : null;
  }

  const sala = porId('sala');

  const PT = {}; Object.entries(mp.pontos).forEach(([id, p]) => { const q = ll(...p.coord); PT[id] = { ...p, id, x: id === 'creche' ? 0 : q[0], y: id === 'creche' ? 0 : q[1], z: id === 'creche' ? Z0 : alt(q[0], q[1]) }; });
  const gA = portoes[0] || { q: [0, 0] }, cx0 = gA.q[0], cy0 = gA.q[1], lo = Math.hypot(cx0, cy0) || 1;
  PT.acesso = { id: 'acesso', nome: 'creche', x: cx0, y: cy0, z: Z0, dist: 60, yaw: Math.atan2(-cx0 / lo, -cy0 / lo) * 180 / Math.PI, pit: 30 };
  let rotaDist = 0;
  const rotas = (mp.rotas || []).map(r => {
    const pts = r.pts.map(p => p === 'acesso' ? [PT.acesso.x, PT.acesso.y] : p.u ? u2(p.u[0], p.u[1]) : ll(p[0], p[1])), passo = r.tipo === 'reta' ? 80 : 8, s = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / passo)); for (let k = 0; k < n; k++) s.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    s.push(pts[pts.length - 1]);
    let len = 0; for (let i = 0; i < s.length - 1; i++) len += Math.hypot(s[i + 1][0] - s[i][0], s[i + 1][1] - s[i][1]);
    return { id: r.id, s, len, prog: 0, alvo: 0, buf: null, tot: 0, ordem: 0 };
  });
  let ordemRota = 0;
  function montaRota() {
    const w = Math.max(.16, cam.dist * .0024);
    rotas.forEach(r => {
      const m = new Malha(), s = r.s, lift = .3 + w * .2;
      for (let i = 0; i < s.length - 1; i++) {
        const a = s[i], b = s[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * w, ny = (b[0] - a[0]) / L * w;
        const z = (x, y) => alt(x, y) + lift;
        m.quad([a[0] + nx, a[1] + ny, z(a[0] + nx, a[1] + ny)], [a[0] - nx, a[1] - ny, z(a[0] - nx, a[1] - ny)], [b[0] - nx, b[1] - ny, z(b[0] - nx, b[1] - ny)], [b[0] + nx, b[1] + ny, z(b[0] + nx, b[1] + ny)], [1, 1, 1], [0, 0, 1]);
      }
      r.buf = bufDe(m.arr()); r.tot = s.length - 1;
    });
    rotaDist = cam.dist;
  }
  const pontaRota = r => {
    const q = Math.max(0, Math.min(r.s.length - 1, r.prog * (r.s.length - 1))), i = Math.floor(q), a = r.s[i], b = r.s[Math.min(r.s.length - 1, i + 1)], u = q - i;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  };
  const anel = (cx, cy, r, g) => { const v = []; for (let i = 0; i < 64; i += 2) { const a0 = i / 64 * 6.2832, a1 = (i + 1) / 64 * 6.2832;
    v.push(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, alt(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r) + .8, 0, 0, 1, g, g, g, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, alt(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r) + .8, 0, 0, 1, g, g, g); } return v; };
  const aneis = bufDe(new Float32Array(Object.values(PT).filter(p => p.area).flatMap(p => anel(p.x, p.y, p.raio || 90, 1))));

  const lonlatDe = p => [C.ref.lon0 + (p[0] + C.O[0]) / C.ref.mlon, C.ref.lat0 + (p[1] + C.O[1]) / C.ref.mlat];
  if (MB && MB.osrm && window.fetch) (mp.rotas || []).filter(r => r.tipo === 'reta').forEach(r => {
    const ro = rotas.find(q => q.id === r.id); if (!ro) return;
    const pts = r.pts.map(p => p === 'acesso' ? lonlatDe([PT.acesso.x, PT.acesso.y]) : p), ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 9000);
    fetch(MB.osrm + pts.map(p => p[0].toFixed(5) + ',' + p[1].toFixed(5)).join(';') + '?overview=full&geometries=geojson', { signal: ctl.signal }).then(x => x.json()).then(j => {
      clearTimeout(to); const g = j && j.code === 'Ok' && j.routes && j.routes[0] && j.routes[0].geometry.coordinates; if (!g || g.length < 2) return;
      const q = g.map(c => ll(c[0], c[1])), s2 = []; for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 120)); for (let k = 0; k < n; k++) s2.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
      s2.push(q[q.length - 1]); let len = 0; for (let i = 0; i < s2.length - 1; i++) len += Math.hypot(s2[i + 1][0] - s2[i][0], s2[i + 1][1] - s2[i][1]);
      ro.s = s2; ro.len = len; rotaDist = 0; if (ro.buf) { gl.deleteBuffer(ro.buf.b); ro.buf = null; } invalida();
    }).catch(() => { clearTimeout(to); });
  });

  let marcaBuf = null;
  const fazMarca = id => {
    const l = porId(id); if (!l) return null;
    const cx = l.c[0], cy = l.c[1], r = Math.hypot(l.b[0] - l.a[0], l.a[1] - l.b[1]) / 2 * .62 + 2.2, w = .45, z = Z0 + (l.altura || cfg.altura) * PL.u + .5, m = new Malha(), N = 72;
    for (let i = 0; i < N; i++) { if (i % 3 === 2) continue; const a0 = i / N * 6.2832, a1 = (i + 1) / N * 6.2832, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      m.quad([cx + c0 * (r - w), cy + s0 * (r - w), z], [cx + c0 * (r + w), cy + s0 * (r + w), z], [cx + c1 * (r + w), cy + s1 * (r + w), z], [cx + c1 * (r - w), cy + s1 * (r - w), z], [1, 1, 1], [0, 0, 1]); }
    return bufDe(m.arr());
  };
  const juntaBuf = (a, b) => b;
  let pinosVis = new Set();
  const cidades = estado ? estado.cidades.map(c => ({ ...c, p: ll(c.coord[0], c.coord[1]) })) : [];

  const cam = { tx: 0, ty: 0, tz: 0, yaw: 0, pit: .9, dist: 2400 };
  const rad = d => d * Math.PI / 180, FOV = rad(42);
  const centro = [X0 + NX * PS / 2, Y0 + NY * PS / 2];
  const VISTAS = {
    cidade: () => ({ x: centro[0] + (mp.visao && mp.visao.dx || 0), y: centro[1] + (mp.visao && mp.visao.dy || 0), dist: 2300, yaw: rad(-12), pit: rad(50) }),
    casa: () => ({ x: PT.casa.x, y: PT.casa.y, dist: 460, yaw: rad(PT.casa.yaw != null ? PT.casa.yaw : 20), pit: rad(PT.casa.pit || 52) }),
    trabalho: () => ({ x: PT.trabalho.x, y: PT.trabalho.y, dist: 460, yaw: rad(PT.trabalho.yaw != null ? PT.trabalho.yaw : -30), pit: rad(PT.trabalho.pit || 52) }),
    creche: () => ({ x: 0, y: 0, dist: PT.creche.dist || 190, yaw: rad(PT.creche.yaw != null ? PT.creche.yaw : -15), pit: rad(PT.creche.pit || 34) }),
    entrada: () => { const l = porId('entrada'), c = cfg.camera || {}; return { x: l.c[0], y: l.c[1], dist: c.entradaDist || 60, yaw: rad(c.entrada != null ? c.entrada : 75), pit: rad(c.entradaPit || 30) }; },
    estado: () => ({ x: estadoBox ? estadoBox[0] : 0, y: estadoBox ? estadoBox[1] : 0, dist: 600000, yaw: 0, pit: rad(84) }),
    sala: () => { const c = cfg.camera || {}; return { x: sala.c[0], y: sala.c[1], dist: c.salaDist || 34, yaw: rad(c.sala != null ? c.sala : 20), pit: rad(c.salaPit || 56) }; }
  };
  let voo = null;
  const pontoDe = id => { if (id === 'creche' || id === 'centro') return { x: 0, y: 0, z: Z0, local: true }; if (PT[id]) return PT[id]; const l = porId(id); return l ? { x: l.c[0], y: l.c[1], z: Z0, local: true } : null; };
  function vistaDe(p) {
    const c = p.camera || {}, foco = p.foco;
    if (foco === 'estado' && !c.alvo) return VISTAS.estado();
    const ids = c.alvo ? [].concat(c.alvo) : foco ? [foco] : null;
    if (!ids) return VISTAS.cidade();
    if (!c.alvo && VISTAS[foco]) { const v = VISTAS[foco](); if (c.dist) v.dist = c.dist; return v; }
    const ps = ids.map(pontoDe).filter(Boolean); if (!ps.length) return VISTAS.cidade();
    const x = ps.reduce((a, q) => a + q.x, 0) / ps.length, y = ps.reduce((a, q) => a + q.y, 0) / ps.length;
    let sep = 0; ps.forEach(a => ps.forEach(b => { sep = Math.max(sep, Math.hypot(a.x - b.x, a.y - b.y)); }));
    const um = ps.length === 1, b0 = ps[0];
    return { x, y, dist: c.dist || (um ? (b0.local ? 36 : (b0.dist || 420)) : Math.max(420, sep * 1.9)),
      yaw: rad(c.yaw != null ? c.yaw : b0.yaw != null ? b0.yaw : (um && b0.local ? 20 : -15)), pit: rad(c.pit != null ? c.pit : b0.pit != null ? b0.pit : (um && b0.local ? 55 : 50)) };
  }
  const clampCam = () => {
    cam.tx = Math.max(LIM.x0, Math.min(LIM.x1, cam.tx)); cam.ty = Math.max(LIM.y0, Math.min(LIM.y1, cam.ty));
    cam.dist = Math.max(10, Math.min(1800000, cam.dist)); cam.pit = Math.max(rad(6), Math.min(rad(89), cam.pit));
  };
  function voar(v, dur) {
    const de = { ...cam }, alvoZ = alt(v.x, v.y) + 1;
    let dy = v.yaw - de.yaw; dy = ((dy + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const dist = Math.hypot(v.x - de.tx, v.y - de.ty), sobe = Math.min(Math.max(900, v.dist * .6), dist * .35);
    if (reduzido) { Object.assign(cam, { tx: v.x, ty: v.y, tz: alvoZ, yaw: de.yaw + dy, pit: v.pit, dist: v.dist }); voo = null; invalida(); return; }
    voo = { t0: performance.now(), dur: dur || 1900, de, v, dy, alvoZ, sobe };
    invalida();
  }
  const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function passoVoo(now) {
    if (!voo) return;
    const t = Math.min(1, (now - voo.t0) / voo.dur), e = suave(t), { de, v } = voo;
    cam.tx = de.tx + (v.x - de.tx) * e; cam.ty = de.ty + (v.y - de.ty) * e; cam.tz = de.tz + (voo.alvoZ - de.tz) * e;
    cam.yaw = de.yaw + voo.dy * e; cam.pit = de.pit + (v.pit - de.pit) * e;
    cam.dist = Math.exp(Math.log(de.dist) + (Math.log(v.dist) - Math.log(de.dist)) * e) + voo.sobe * Math.sin(Math.PI * e);
    if (t >= 1) { voo = null; cam.dist = v.dist; }
  }

  const ptrs = new Map(); let ultimo = null;
  const cancela = () => { voo = null; };
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey }); ultimo = null; cancela(); canvas.classList.add('arrasta'); });
  const fim = e => { ptrs.delete(e.pointerId); ultimo = null; if (!ptrs.size) canvas.classList.remove('arrasta'); };
  canvas.addEventListener('pointerup', fim); canvas.addEventListener('pointercancel', fim);
  const geom = () => { const r = canvas.getBoundingClientRect(); return r.height; };
  function pan(dx, dy) {
    const k = 2 * Math.tan(FOV / 2) * cam.dist / geom(), s = Math.sin(cam.yaw), c = Math.cos(cam.yaw), kf = k / Math.max(.3, Math.sin(cam.pit));
    cam.tx += -c * dx * k + s * dy * kf; cam.ty += s * dx * k + c * dy * kf; clampCam(); cam.tz = alt(cam.tx, cam.ty) + 1;
  }
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (ptrs.size === 1) {
      if (p.b === 2 || p.b === 1 || p.sh || e.shiftKey) pan(dx, dy);
      else { cam.yaw += dx * .0055; cam.pit += dy * .0045; clampCam(); }
    } else if (ptrs.size === 2) {
      const o = [...ptrs.entries()].find(([id]) => id !== e.pointerId)[1], antes = { x: p.x - o.x, y: p.y - o.y }, agora = { x: e.clientX - o.x, y: e.clientY - o.y };
      const d0 = Math.hypot(antes.x, antes.y), d1 = Math.hypot(agora.x, agora.y); if (d0 > 8 && d1 > 8) { cam.dist /= d1 / d0; cam.yaw += Math.atan2(agora.y, agora.x) - Math.atan2(antes.y, antes.x); }
      pan(dx / 2, dy / 2); clampCam();
    }
    p.x = e.clientX; p.y = e.clientY; invalida();
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); cancela(); const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; cam.dist *= Math.exp(Math.max(-120, Math.min(120, d)) * .0014); clampCam(); invalida(); }, { passive: false });
  canvas.addEventListener('dblclick', e => { cancela(); cam.dist *= .6; clampCam(); invalida(); });
  const zoom = f => { cancela(); voar({ x: cam.tx, y: cam.ty, dist: Math.max(10, Math.min(3300, cam.dist * f)), yaw: cam.yaw, pit: cam.pit }, 450); };
  $('.c-mais').addEventListener('click', () => zoom(.55)); $('.c-menos').addEventListener('click', () => zoom(1.8));
  $('.c-casa').addEventListener('click', () => tela.aplicar(passos[atual]));
  const bn = $('.c-norte'); bn.addEventListener('click', () => voar({ x: cam.tx, y: cam.ty, dist: cam.dist, yaw: 0, pit: cam.pit }, 600));
  $('.c-topo').addEventListener('click', () => voar({ x: cam.tx, y: cam.ty, dist: cam.dist, yaw: cam.yaw, pit: cam.pit > rad(75) ? rad(45) : rad(88) }, 700));
  $$('.c-epoca button').forEach(b => b.addEventListener('click', () => { epoca = b.dataset.epoca; $$('.c-epoca button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); montaCreche(); invalida(); }));
  raiz.addEventListener('keydown', e => {
    if (e.target !== canvas && e.target !== raiz) return;
    const k = e.key; if (k === '+' || k === '=') zoom(.7); else if (k === '-') zoom(1.4);
    else if (k === 'a' || k === 'A') { cam.yaw -= .12; invalida(); } else if (k === 'd' || k === 'D') { cam.yaw += .12; invalida(); }
  });

  const pinosEl = $('.info-pinos');
  const pinos = Object.values(PT).filter(p => p.id !== 'creche').map(p => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pino'; b.dataset.id = p.id; b.setAttribute('aria-label', 'Ir para ' + p.nome);
    b.innerHTML = '<i></i><span>' + p.nome + '</span>'; pinosEl.appendChild(b);
    b.addEventListener('click', () => { let k = passos.findIndex(s => s.foco === p.id); if (k < 0) k = passos.findIndex(s => (s.pinos || []).includes(p.id)); if (k >= 0) ir(k); }); return { p, b };
  });

  let sujo2 = false; const off = [0, 0]; let W = 0, H = 0, dpr = 1, sujo = true, M = null, olho = [0, 0, 0], aq = 0, aqAlvo = 0, sl = 0, slAlvo = 0, raf = 0, tAnt = 0;
  const ctx = over.getContext('2d');
  function tamanho() {
    dpr = Math.min(2, window.devicePixelRatio || 1); const r = canvas.getBoundingClientRect(); W = Math.max(2, r.width); H = Math.max(2, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); over.width = canvas.width; over.height = canvas.height; invalida();
  }
  new ResizeObserver(tamanho).observe(canvas);
  function invalida() { sujo = true; if (!raf) raf = requestAnimationFrame(quadro); }
  const proj = (x, y, z) => {
    const v = M, w = v[3] * x + v[7] * y + v[11] * z + v[15]; if (w <= 0.01) return null;
    return [(v[0] * x + v[4] * y + v[8] * z + v[12]) / w * W / 2 + W / 2, -(v[1] * x + v[5] * y + v[9] * z + v[13]) / w * H / 2 + H / 2, w];
  };
  function quadro(now) {
    raf = 0; const dt = Math.min(.1, (now - tAnt) / 1000 || .016); tAnt = now;
    let anima = false;
    if (voo) { passoVoo(now); anima = true; }
    rotas.forEach(r => { if (Math.abs(r.prog - r.alvo) > 1e-3) { const v = dt / (reduzido ? .01 : Math.max(1.4, Math.min(4.2, r.len / 600))) * (r.alvo < r.prog ? 3 : 1); r.prog += Math.sign(r.alvo - r.prog) * Math.min(Math.abs(r.alvo - r.prog), v); anima = true; } else r.prog = r.alvo; });
    if (Math.abs(aq - aqAlvo) > .01) { aq += Math.sign(aqAlvo - aq) * dt * 1.2; anima = true; } else aq = aqAlvo;
    if (Math.abs(sl - slAlvo) > .01) { sl += Math.sign(slAlvo - sl) * dt * 1.2; anima = true; } else sl = slAlvo;
    if (!rotas[0] || !rotas[0].buf || Math.abs(Math.log(cam.dist / rotaDist)) > .22) montaRota();
    desenhaCena(now);
    if (sujo2) { anima = true; sujo2 = false; }
    if (anima || ptrs.size) raf = requestAnimationFrame(quadro); else sujo = false;
  }
  function desenhaCena(now) {
    clampCam();
    const cp = Math.cos(cam.pit), ex = cam.tx - Math.sin(cam.yaw) * cp * cam.dist, ey = cam.ty - Math.cos(cam.yaw) * cp * cam.dist;
    let tz = cam.tz; if (!tz) tz = cam.tz = alt(cam.tx, cam.ty) + 1; let ez = tz + Math.sin(cam.pit) * cam.dist; ez = Math.max(ez, alt(ex, ey) + 4);
    olho = [ex, ey, ez];
    const prj = m4.persp(FOV, W / H, Math.max(.6, cam.dist * .02), cam.dist * 9 + 3500), vis = m4.look(olho, [cam.tx, cam.ty, tz], [0, 0, 1]); M = m4.mul(prj, vis);
    const mobile = W < 720, min = hud.classList.contains('min'), alvoX = mobile ? 0 : .17, alvoY = mobile ? (min ? .12 : .34) : 0;
    off[0] += (alvoX - off[0]) * .25; off[1] += (alvoY - off[1]) * .25; if (Math.abs(alvoX - off[0]) + Math.abs(alvoY - off[1]) > .002) sujo2 = true;
    M = m4.mul([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, off[0], off[1], 0, 1], M);
    gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
    const dN = cam.dist * 1.7, dF = cam.dist * 5.5 + 400;
    [[P1, U1], [P2, U2]].forEach(([p, u]) => { gl.useProgram(p); gl.uniformMatrix4fv(u.M, false, new Float32Array(M)); gl.uniform3fv(u.Bg, FUNDO); gl.uniform2f(u.F, dN, dF); });
    gl.useProgram(P1); gl.uniform3fv(U1.L, new Float32Array([-.45, -.55, .7].map((v, i, a) => v / Math.hypot(...a))));
    desenhaMapaBase();
    partes.forEach(p => desenha(p.o, gl.TRIANGLES, p.lit)); creche.forEach(p => desenha(p.o, gl.TRIANGLES, 1));
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (vidros) { gl.depthMask(false); desenha(vidros, gl.TRIANGLES, 1, .32); gl.depthMask(true); }
    if (estadoLinha) desenha(estadoLinha, gl.LINES, 0, .55);
    desenha(linhas.menor, gl.LINES, 0, .13); desenha(linhas.maior, gl.LINES, 0, .3); desenha(aneis, gl.LINES, 0, .8);
    rotas.forEach(r => { if (r.prog > 0 && r.buf) desenha({ ...r.buf, n: Math.floor(r.prog * r.tot) * 6 }, gl.TRIANGLES, 0, .96); });
    if (marcaBuf) desenha(marcaBuf, gl.TRIANGLES, 0, .92);
    rotulos(now);
  }

  function rotulos(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const fam = 'Lora, Georgia, serif', caixas = [];
    const livre = (x, y, w, h) => { for (const c of caixas) if (x < c[0] + c[2] && x + w > c[0] && y < c[1] + c[3] && y + h > c[1]) return false; caixas.push([x, y, w, h]); return true; };
    const texto = (s, x, y, tam, alfa, ang, cor) => {
      ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang); ctx.font = `${tam}px ${fam}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = alfa; ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(8,8,9,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, 0, 0); ctx.fillStyle = cor || '#ececec'; ctx.fillText(s, 0, 0); ctx.restore();
    };
    const d = cam.dist;
    if (d > 1300 && d < 14000) { const p = proj(centro[0] - 60, centro[1] + 120, alt(centro[0], centro[1]) + 4); if (p) { ctx.save(); ctx.font = `300 ${Math.max(18, Math.min(46, 70000 / d))}px Fraunces, ${fam}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,' + Math.min(.5, (d - 1300) / 1000, (14000 - d) / 4000) + ')'; if ('letterSpacing' in ctx) ctx.letterSpacing = '.35em'; ctx.fillText('SAUDADES', p[0], p[1]); ctx.restore(); } }
    if (d < 1000) {
      const a = Math.min(1, (1000 - d) / 350);
      C.rotulos.forEach(([nome, x, y, ang, L]) => {
        if (L < (d > 600 ? 220 : 90)) return; const p = proj(x, y, alt(x, y) + 1.2); if (!p || p[2] > d * 4) return;
        const q = proj(x + Math.cos(ang) * 14, y + Math.sin(ang) * 14, alt(x, y) + 1.2); if (!q) return; let r = Math.atan2(q[1] - p[1], q[0] - p[0]); if (r > Math.PI / 2 || r < -Math.PI / 2) r += Math.PI;
        const tam = Math.max(9, Math.min(13, 1500 / d * 5)); ctx.font = `${tam}px ${fam}`; const w = ctx.measureText(nome).width + 8;
        if (p[0] < -50 || p[0] > W + 50 || p[1] < -20 || p[1] > H + 20) return; if (!livre(p[0] - w / 2, p[1] - tam, w, tam * 2)) return;
        texto(nome, p[0], p[1], tam, a * .75, r, '#bdbdbd');
      });
    }
    if (d < 130) {
      const a = Math.min(1, (130 - d) / 50);
      locais.forEach(l => { if (!l.nome || (l.epoca && l.epoca !== epoca)) return; const p = proj(l.c[0], l.c[1], Z0 + .3); if (!p) return;
        const tam = Math.max(8.5, Math.min(12, 520 / d * 2.2)); ctx.font = `${tam}px ${fam}`; const w = ctx.measureText(l.nome).width + 6; if (livre(p[0] - w / 2, p[1] - tam, w, tam * 2)) texto(l.nome, p[0], p[1], tam, a * (l.id === 'sala' ? 1 : .78), 0, l.id === 'sala' ? '#fff' : '#c9c9c9'); });
      portoes.forEach(g => { const p = proj(g.q[0], g.q[1], Z0 + MURO + 1.2); if (p && livre(p[0] - 50, p[1] - 10, 100, 20)) texto(g.nome || 'portão', p[0], p[1], 11, a, 0, '#fff'); });
    }

    pinos.forEach(({ p, b }) => { const q = pinosVis.has(p.id) ? proj(p.x, p.y, p.z + 6) : null; if (!q || q[0] < -40 || q[0] > W + 40 || q[1] < -40 || q[1] > H + 40) { b.style.display = 'none'; return; }
      b.style.display = ''; b.style.transform = `translate(${q[0].toFixed(1)}px,${q[1].toFixed(1)}px)`; b.classList.toggle('atual', true); });
    rotas.forEach(r => { if (r.prog > .002 && r.prog < .998) { const f = pontaRota(r), q = proj(f[0], f[1], alt(f[0], f[1]) + 2.5 + cam.dist * .004); if (q) { const t = (now || 0) / 700, rr = 5 + 2 * Math.sin(t * 3);
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(q[0], q[1], rr * 2.2, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q[0], q[1], rr * .7, 0, 7); ctx.fill(); ctx.restore(); } } });

    if (d > 9000 && d < 1.2e6) { const a = Math.min(1, (d - 9000) / 20000);
      cidades.forEach(c => { const q = proj(c.p[0], c.p[1], 0); if (!q || (c.pino && pinosVis.has(c.pino))) return; const maior = c.maior, tam = maior ? 15 : 12;
        ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(q[0], q[1], maior ? 4 : 3, 0, 7); ctx.fill(); ctx.restore();
        texto(c.nome, q[0] + 8, q[1] - 10, tam, a, 0, maior ? '#fff' : '#cfcfcf'); }); }
    bn.firstElementChild.style.transform = `rotate(${cam.yaw}rad)`;
  }

  tela = {
    redesenha: () => invalida(),
    aplicar(p) {
      const foco = p.foco, v = vistaDe(p), asp = W / H; if (asp < 1) v.dist *= foco === 'estado' ? Math.min(4.5, 1.5 / asp) : Math.min(2, Math.pow(1 / asp, .75));
      voar(v, p.duracao);
      pinosVis = new Set(p.pinos || []);
      (p.rotas || []).forEach(id => { const r = rotas.find(q => q.id === id); if (r && r.alvo === 0) r.ordem = ++ordemRota; });
      rotas.forEach(r => { r.alvo = (p.rotas || []).includes(r.id) ? 1 : 0; });
      aqAlvo = foco === 'creche' ? 1 : 0;
      marcaBuf = null; (p.marca ? [].concat(p.marca) : []).forEach(id => { const b = fazMarca(id); if (b) marcaBuf = marcaBuf ? juntaBuf(marcaBuf, b) : b; });
      const dentroCreche = !!p.epoca || foco === 'creche';
      $('.c-epoca').hidden = !dentroCreche;
      if (p.epoca && p.epoca !== epoca) { epoca = p.epoca; $$('.c-epoca button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.epoca === epoca))); montaCreche(); }
      invalida();
    }
  };
  montaCreche(); tamanho();
  const v0 = vistaDe(passos[0]); if (W < H) v0.dist *= passos[0].foco === 'estado' ? Math.min(4.5, 1.5 * H / W) : Math.min(2, Math.pow(H / W, .75)); Object.assign(cam, { tx: v0.x, ty: v0.y, tz: alt(v0.x, v0.y), yaw: v0.yaw, pit: v0.pit, dist: v0.dist });
  raiz.classList.add('pronto');
  window.__info = { cam, ir, get atual() { return atual; } };
  ir(0);
})();
