const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Menu no celular
const btn = $('.menu-btn'), menu = $('#menu');
const fechar = () => { menu.classList.remove('aberto'); btn.setAttribute('aria-expanded', 'false'); };
btn.addEventListener('click', () => btn.setAttribute('aria-expanded', menu.classList.toggle('aberto')));
$$('a', menu).forEach(a => a.addEventListener('click', fechar));

// Aquarela da home: ao passar pela foto, uma tinta de várias cores se espalha pela tela
// (manchas de borda irregular e mais escura, camadas de pigmento e grão de papel, desenhadas num canvas)
const COR = { keli: [227,178,92], mirla: [111,159,214], sarah: [127,191,158], murilo: [165,143,209], 'anna-bela': [224,144,127] };
const COMPLEMENTOS = [[232,150,176], [240,205,120], [96,190,200], [200,130,170], [150,200,120], [120,150,230]];
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)');
const aquarela = (() => {
  let cont = null, grao = null, atual = null;
  const escala = .5;                                    // desenha em meia resolução: mais leve e mais suave
  const semente = s => { let h = 1779033703 ^ s.length; for (const ch of s) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
  const faz = () => {
    cont = document.createElement('div'); cont.className = 'aquarela-fundo'; cont.setAttribute('aria-hidden', 'true'); document.body.prepend(cont);
    const g = document.createElement('canvas'); g.width = g.height = 200; const x = g.getContext('2d'), d = x.createImageData(200, 200);
    for (let i = 0; i < d.data.length; i += 4) { d.data[i + 3] = Math.random() < .62 ? 0 : Math.random() * 70; }   // buracos de pigmento, como o grão do papel
    x.putImageData(d, 0, 0); grao = g;
  };
  const manchas = (v, ox, oy, W, H) => {
    const rnd = semente(v), base = COR[v] || [200, 200, 200], maior = Math.max(W, H);
    const cores = [base, ...COMPLEMENTOS.slice().sort(() => rnd() - .5).slice(0, 4), ...Object.values(COR).filter(c => c !== base).sort(() => rnd() - .5).slice(0, 2)];
    const lista = [];
    for (let i = 0; i < 13; i++) {
      const ang = rnd() * Math.PI * 2, dist = i === 0 ? 0 : (.1 + rnd() * .55) * maior;
      lista.push({
        x: ox + Math.cos(ang) * dist * 1.15, y: oy + Math.sin(ang) * dist * .8,
        R: (i === 0 ? .30 : .12 + rnd() * .2) * maior, cor: i < 2 ? base : cores[i % cores.length],
        atraso: i === 0 ? 0 : .2 + (dist / maior) * 1.7 + rnd() * .3, forca: i === 0 ? 1 : .6 + rnd() * .4,
        ph: [rnd() * 6.3, rnd() * 6.3, rnd() * 6.3, rnd() * 6.3], jit: Array.from({ length: 96 }, () => rnd() - .5)
      });
    }
    return lista;
  };
  // contorno irregular, sempre o mesmo para a mesma mancha (só o raio cresce)
  const caminho = (ctx, m, raio, camada) => {
    const N = 96, pts = [];
    for (let i = 0; i < N; i++) {
      const t = i / N * Math.PI * 2;
      const r = raio * (1 + .17 * Math.sin(2 * t + m.ph[0]) + .11 * Math.sin(3 * t + m.ph[1]) + .07 * Math.sin(5 * t + m.ph[2]) + .045 * Math.sin(8 * t + m.ph[3] + camada) + .035 * m.jit[i]);
      pts.push([m.x + Math.cos(t) * r, m.y + Math.sin(t) * r * .92]);
    }
    ctx.beginPath();
    for (let i = 0; i < N; i++) { const p = pts[i], q = pts[(i + 1) % N]; const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p[0], p[1], mx, my); }
    ctx.closePath();
  };
  const desenha = (cv, lista, t) => {
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over'; ctx.lineJoin = 'round';
    for (const m of lista) {
      const u = Math.min(1, Math.max(0, (t - m.atraso) / 2.4)); if (u <= 0) continue;
      const e = 1 - Math.pow(1 - u, 3), [r, g, b] = m.cor, f = m.forca;
      for (let k = 0; k < 4; k++) {                                       // camadas de pigmento: cada uma um pouco menor e diferente
        caminho(ctx, m, m.R * e * (1 - k * .09), k);
        ctx.fillStyle = `rgba(${r},${g},${b},${(k === 0 ? .20 : .11) * f})`; ctx.fill();
      }
      caminho(ctx, m, m.R * e, 0);                                         // borda onde o pigmento se acumula
      ctx.lineWidth = 1.8; ctx.strokeStyle = `rgba(${r},${g},${b},${.55 * f * Math.min(1, e * 1.6)})`; ctx.stroke();
      caminho(ctx, m, m.R * e * .97, 0); ctx.lineWidth = 7; ctx.strokeStyle = `rgba(${r},${g},${b},${.10 * f})`; ctx.stroke();
    }
    ctx.globalCompositeOperation = 'destination-out';                     // grão do papel
    ctx.fillStyle = ctx.createPattern(grao, 'repeat'); ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';
  };
  const apaga = c => { if (!c) return; c.classList.add('some'); c.cancelAnimation = true; setTimeout(() => c.remove(), semMovimento.matches ? 50 : 2800); };
  return (v, origem) => {
    if (!cont) faz();
    if (!v) { apaga(atual); atual = null; return; }
    if (atual && atual.dataset.v === v) return;
    apaga(atual);
    const W = Math.round(innerWidth * escala), H = Math.round(innerHeight * escala);
    const r = origem ? origem.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const lista = manchas(v, (r.left + r.width / 2) * escala, (r.top + r.height / 2) * escala, W, H);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.dataset.v = v; cont.appendChild(cv); atual = cv;
    if (semMovimento.matches) { desenha(cv, lista, 99); return; }
    const t0 = performance.now(), duracao = 4.2;
    const quadro = agora => { if (cv.cancelAnimation) return; const t = (agora - t0) / 1000; desenha(cv, lista, t); if (t < duracao) requestAnimationFrame(quadro); };
    requestAnimationFrame(quadro);
  };
})();
const lavar = aquarela;

// Home: ao passar pela foto (ou, no celular, a foto no centro da fila) a cor daquela pessoa toma a tela
const lista = $('.vitimas');
const celular = matchMedia('(max-width: 720px)');
if (lista) {
  const lis = $$('li', lista);
  const centro = () => { const a = $('a.ativo', lista); return a ? a.closest('li').dataset.v : null; };
  lis.forEach(li => {
    const a = $('a', li), v = li.dataset.v;
    ['mouseenter', 'focus'].forEach(ev => a.addEventListener(ev, () => lavar(v, a)));
    ['mouseleave', 'blur'].forEach(ev => a.addEventListener(ev, () => lavar(celular.matches ? centro() : null)));
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      if (!celular.matches) return;
      es.forEach(e => e.target.classList.toggle('ativo', e.isIntersecting));
      lavar(centro(), $('a.ativo', lista));
    }, { root: lista, rootMargin: '0px -45% 0px -45%' });
    $$('a', lista).forEach(a => io.observe(a));
    celular.addEventListener('change', () => {
      if (!celular.matches) { $$('a', lista).forEach(a => a.classList.remove('ativo')); lavar(null); }
    });
  }
}

// Mapa 3D (MapLibre GL JS): tons de cinza, trajeto que se desenha e câmera que acompanha as etapas
function escurecer(map) {
  (map.getStyle().layers || []).forEach(l => {
    try {
      const id = l.id, agua = /water/i.test(id);
      if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#0b0b0b');
      else if (l.type === 'fill') { if (!(l.paint && l.paint['fill-pattern'])) map.setPaintProperty(id, 'fill-color', agua ? '#151515' : '#0e0e0e'); }
      else if (l.type === 'line') map.setPaintProperty(id, 'line-color', agua ? '#1c1c1c' : /boundary|admin/i.test(id) ? '#3a3a3a' : /casing|outline/i.test(id) ? '#171717' : '#2d2d2d');
      else if (l.type === 'symbol') {
        if (l.layout && l.layout['text-field']) { map.setPaintProperty(id, 'text-color', '#858585'); map.setPaintProperty(id, 'text-halo-color', '#0b0b0b'); }
        map.setPaintProperty(id, 'icon-opacity', 0);
        if (/poi|housenumber/i.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
      } else if (l.type === 'hillshade' || l.type === 'raster') map.setLayoutProperty(id, 'visibility', 'none');
    } catch (e) { /* camada sem essa propriedade: segue */ }
  });
}

function iniciarMapa3D(cfg, palco, escolher, aoLerRuas) {
  const caixa = $('#mapa3d', palco);
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const v = cfg.visao;
  const map = new maplibregl.Map({
    container: caixa, style: cfg.estilo, center: v.centro, zoom: v.zoom, pitch: v.pitch, bearing: v.bearing,
    maxPitch: 75, cooperativeGestures: true, attributionControl: { compact: true },
    locale: {
      'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para aproximar o mapa',
      'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para aproximar o mapa',
      'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa',
      'NavigationControl.ZoomIn': 'Aproximar', 'NavigationControl.ZoomOut': 'Afastar', 'NavigationControl.ResetBearing': 'Apontar para o norte'
    }
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

  const marcadores = {}, prog = cfg.trajeto.map(() => 0);
  let pronto = false, ultimo = null, vivo = true;

  const pintarRota = (i, p, cor) => {
    const id = 'rota-' + i;
    if (!map.getLayer(id)) return;
    const cheio = cor, vazio = 'rgba(255,255,255,0)';
    map.setPaintProperty(id, 'line-gradient', p <= 0.001 ? vazio : p >= 0.999 ? cheio : ['step', ['line-progress'], cheio, p, vazio]);
  };
  const animarRota = (i, alvo, cor) => {
    const ini = prog[i], t0 = performance.now(), dur = reduzido ? 0 : 1800 * Math.max(.3, Math.abs(alvo - ini));
    const passo = agora => {
      if (!vivo) return;
      const k = dur ? Math.min(1, (agora - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      prog[i] = ini + (alvo - ini) * e;
      pintarRota(i, prog[i], cor);
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };

  const montar = () => {
    escurecer(map);
    // Prédios, rios e ruas do município (dados do modelo gerado a partir do OpenStreetMap: cidade.js); sem eles, usa os prédios do mapa-base
    try {
      const estilo = map.getStyle(), C = window.CIDADE;
      const rotulo = (estilo.layers || []).find(l => l.type === 'symbol' && l.layout && l.layout['text-field']);
      const antes = rotulo ? rotulo.id : undefined;
      if (C) {
        map.addSource('cidade-agua', { type: 'geojson', data: C.agua });
        map.addLayer({ id: 'cidade-agua', type: 'fill', source: 'cidade-agua', paint: { 'fill-color': '#1d2630', 'fill-opacity': .9 } }, antes);
        map.addSource('cidade-ruas', { type: 'geojson', data: C.ruas });
        map.addLayer({ id: 'cidade-ruas', type: 'line', source: 'cidade-ruas', layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': ['case', ['has', 'nome'], '#3a3a3a', '#262626'], 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, ['case', ['has', 'nome'], 6, 3]] } }, antes);
        map.addSource('cidade-predios', { type: 'geojson', data: C.predios });
        map.addLayer({ id: 'predios-3d', type: 'fill-extrusion', source: 'cidade-predios', minzoom: 12,
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'altura'], 4, '#3a3a3a', 12, '#555', 30, '#777'],
            'fill-extrusion-height': ['get', 'altura'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': .95, 'fill-extrusion-vertical-gradient': true
          } }, antes);
        if (C.arvores) {   // árvores: pontos discretos
          map.addSource('cidade-arvores', { type: 'geojson', data: { type: 'Feature', geometry: C.arvores } });
          map.addLayer({ id: 'cidade-arvores', type: 'circle', source: 'cidade-arvores', minzoom: 14.5,
            paint: { 'circle-color': '#2e2e2e', 'circle-opacity': .8, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14.5, 1, 18, 4] } }, 'predios-3d');
        }
        if (C.creche) {   // a creche (não consta no OpenStreetMap): salas da planta, com a sala em destaque
          map.addSource('cidade-creche', { type: 'geojson', data: C.creche });
          map.addLayer({ id: 'creche-3d', type: 'fill-extrusion', source: 'cidade-creche', minzoom: 12,
            paint: { 'fill-extrusion-color': ['case', ['get', 'sala'], '#f2f2f2', '#9a9a9a'], 'fill-extrusion-height': ['get', 'altura'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': .98, 'fill-extrusion-vertical-gradient': true } }, antes);
        }
        try {   // nomes das ruas
          map.addLayer({ id: 'cidade-ruas-nomes', type: 'symbol', source: 'cidade-ruas', minzoom: 14.5, filter: ['has', 'nome'],
            layout: { 'symbol-placement': 'line', 'text-field': ['get', 'nome'], 'text-size': 11, 'text-font': ['Noto Sans Regular'], 'text-letter-spacing': .05 },
            paint: { 'text-color': '#a5a5a5', 'text-halo-color': '#0b0b0b', 'text-halo-width': 1.5 } });
        } catch (e) { /* sem fonte para os nomes: segue */ }
      } else {
        const fonte = Object.keys(estilo.sources || {}).find(id => estilo.sources[id].type === 'vector');
        if (fonte) map.addLayer({
          id: 'predios-3d', source: fonte, 'source-layer': 'building', type: 'fill-extrusion', minzoom: 12.5,
          filter: ['!=', ['coalesce', ['get', 'hide_3d'], false], true],
          paint: {
            'fill-extrusion-color': '#3a3a3a', 'fill-extrusion-vertical-gradient': true,
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12.5, 0, 13.4, ['coalesce', ['get', 'render_height'], ['get', 'height'], 6]],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0], 'fill-extrusion-opacity': 0.9
          }
        }, antes);
      }
    } catch (e) { console.warn('Prédios 3D indisponíveis; mapa-base mantido.', e); }
    // Trajeto: uma linha por trecho, que se desenha com o avanço das etapas
    cfg.trajeto.forEach((coords, i) => {
      map.addSource('rota-' + i, { type: 'geojson', lineMetrics: true, data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } });
      map.addLayer({ id: 'rota-' + i, type: 'line', source: 'rota-' + i, layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-width': 3, 'line-color': '#fff', 'line-gradient': 'rgba(255,255,255,0)' } });
    });
    // Marcadores
    Object.entries(cfg.pontos).forEach(([id, p]) => {
      const el = document.createElement('div');
      el.className = 'marcador3d';
      el.innerHTML = (p.mancha ? '<div class="mancha3d"></div>' : '') + (p.area ? '<div class="area"></div>' : '') + '<div class="anel"></div><div class="miolo"></div><div class="nome-ponto"></div>';
      $('.nome-ponto', el).textContent = p.nome || id;
      el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', p.nome || id);
      el.addEventListener('click', () => escolher(id));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(id); } });
      marcadores[id] = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(p.coord).addTo(map);
    });
    pronto = true;
    palco.classList.add('tem3d');
    if (ultimo) aplicar(ultimo);
  };

  const aplicar = p => {
    ultimo = p;
    if (!pronto) return;
    Object.entries(marcadores).forEach(([id, m]) => m.getElement().classList.toggle('atual', id === p.foco || (id === 'creche' && p.vista === 'planta')));
    const alvo = cfg.pontos[p.foco] || (p.vista === 'planta' ? cfg.pontos.creche : null);
    if (alvo) map.flyTo({ center: alvo.coord, zoom: alvo.zoom || 15.5, pitch: 60, bearing: alvo.bearing || 0, duration: reduzido ? 0 : 2600, essential: true });
    else map.flyTo({ center: v.centro, zoom: v.zoom, pitch: v.pitch, bearing: v.bearing, duration: reduzido ? 0 : 2600, essential: true });
    const n = p.trecho || 0;
    cfg.trajeto.forEach((_, i) => animarRota(i, i < n ? 1 : 0, i === n - 1 ? '#f2f2f2' : '#6f6f6f'));
  };

  const desistir = () => { vivo = false; palco.classList.remove('tem3d'); try { map.remove(); } catch (e) {} };
  map.on('load', montar);
  // Ruas reais (OpenStreetMap, camada "transportation") ao redor da creche, para desenhar também na maquete 3D
  let ruasLidas = false;
  map.on('idle', () => {
    if (ruasLidas || !pronto || !aoLerRuas) return;
    try {
      const estilo = map.getStyle(), fonte = Object.keys(estilo.sources || {}).find(id => estilo.sources[id].type === 'vector');
      const fs = map.querySourceFeatures(fonte, { sourceLayer: 'transportation' }).filter(f => f.geometry && /LineString/.test(f.geometry.type) && !['rail', 'path', 'ferry', 'aerialway'].includes(f.properties.class));
      if (fs.length) { ruasLidas = true; aoLerRuas(fs.map(f => ({ nome: f.properties.name || f.properties['name:latin'] || '', linhas: f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates }))); }
    } catch (e) { console.warn('Ruas não lidas', e); }
  });
  // Se o mapa não carregar em 12 s (sem internet, tiles bloqueados), volta ao mapa esquemático
  setTimeout(() => { if (!pronto) { console.warn('Mapa 3D não carregou; usando o mapa esquemático.'); desistir(); } }, 12000);
  return { aplicar };
}

// Creche em 3D, sem teto: maquete desenhada em canvas (projeção ortográfica), que o leitor pode girar
function iniciarCreche3D(cfg, palco) {
  const canvas = $('#planta3d', palco), ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const H = cfg.altura || 40, T = cfg.espessura || 5, PIT = 38 * Math.PI / 180, sP = Math.sin(PIT), cP = Math.cos(PIT);
  const todos = cfg.locais.map(l => ({ ...l, x: l.ret[0], y: l.ret[1], w: l.ret[2], h: l.ret[3] }));
  const ruas = (cfg.ruas || []).map(r => ({ ...r, x: r.ret[0], y: r.ret[1], w: r.ret[2], h: r.ret[3] }));
  const HM = Math.max(H, ...todos.map(l => l.altura || 0));
  const xs = todos.concat(ruas).flatMap(l => [l.x, l.x + l.w]), ys = todos.concat(ruas).flatMap(l => [l.y, l.y + l.h]);
  const cx0 = (Math.min(...xs) + Math.max(...xs)) / 2, cy0 = (Math.min(...ys) + Math.max(...ys)) / 2;
  let epoca = 'antes', locais = [], caixas = [], reais = null;
  const geo = cfg.geo || { norte: 0, largura: 5 };   // norte: ângulo (graus) para o qual a parte de cima da planta aponta; largura da rua em metros
  const UM = 26.3;                                   // unidades por metro (1 unidade ≈ 3,8 cm)

  // Paredes: arestas dos retângulos (as compartilhadas valem uma vez), cortadas em pedaços curtos para a ordenação ficar correta
  const montar = () => {
    locais = todos.filter(l => !l.epoca || l.epoca === epoca);
    const arestas = new Map();
    locais.filter(l => !l.aberto).forEach(l => {
      [[l.x, l.y, l.x + l.w, l.y], [l.x + l.w, l.y, l.x + l.w, l.y + l.h], [l.x, l.y + l.h, l.x + l.w, l.y + l.h], [l.x, l.y, l.x, l.y + l.h]].forEach(e => {
        const k = e.join(',');
        if (!arestas.has(k)) arestas.set(k, { e, ids: [], h: 0 });
        arestas.get(k).ids.push(l.id); arestas.get(k).h = Math.max(arestas.get(k).h, l.altura || H);
      });
    });
    caixas = [];
    const PASSO = 40;
    (cfg.muros || []).forEach(m => arestas.set('m' + m.join(','), { e: m, ids: ['muro'], h: cfg.alturaMuro || 58 }));
    arestas.forEach(({ e, ids, h }) => {
      const [x0, y0, x1, y1] = e, horiz = y0 === y1, comp = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(comp / PASSO));
      for (let i = 0; i < n; i++) {
        const a = i / n, b = (i + 1) / n, ax = x0 + (x1 - x0) * a, ay = y0 + (y1 - y0) * a, bx = x0 + (x1 - x0) * b, by = y0 + (y1 - y0) * b;
        caixas.push({ x0: Math.min(ax, bx) - (horiz ? 0 : T / 2), x1: Math.max(ax, bx) + (horiz ? 0 : T / 2),
                      y0: Math.min(ay, by) - (horiz ? T / 2 : 0), y1: Math.max(ay, by) + (horiz ? T / 2 : 0), ids, h });
      }
    });
  };
  montar();

  let ccx = cx0, ccy = cy0, zm = 1, aCx = cx0, aCy = cy0, aZ = 1;
  let yaw = (cfg.camera.padrao || 0) * Math.PI / 180, alvo = yaw, foco = null, W = 0, Hh = 0, k = 1, sy0 = 0, raf = 0;
  const C = () => Math.cos(yaw), S = () => Math.sin(yaw);
  let c, s;
  const proj = (x, y, z) => {
    const X = x - ccx, Y = y - ccy, xr = X * c - Y * s, yr = X * s + Y * c;
    return [W / 2 + xr * k, Hh / 2 + sy0 + (yr * sP - z * cP) * k, yr * cP + z * sP];
  };
  const ajustar = () => {
    c = C(); s = S(); k = 1; sy0 = 0;
    const sx0 = ccx, sy1 = ccy; ccx = cx0; ccy = cy0;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    [[Math.min(...xs) - T, Math.min(...ys) - T], [Math.max(...xs) + T, Math.min(...ys) - T], [Math.max(...xs) + T, Math.max(...ys) + T], [Math.min(...xs) - T, Math.max(...ys) + T]].forEach(([x, y]) => {
      [0, HM].forEach(z => { const p = proj(x, y, z); minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    });
    k = Math.min(W * .9 / (maxx - minx), Hh * .86 / (maxy - miny));
    const cy = (miny + maxy) / 2; sy0 = 0; const p2 = []; // centraliza na vertical
    let mn = 1e9, mx = -1e9;
    [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)]].forEach(([x, y]) => {
      [0, HM].forEach(z => { const p = proj(x, y, z); mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); });
    });
    sy0 = Hh / 2 - (mn + mx) / 2;
    ccx = sx0; ccy = sy1; k *= zm; sy0 *= Math.max(0, 1 - (zm - 1) * 1.6);
  };

  const poly = (pts, fill, stroke) => {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  };
  const CORES = ['227,178,92', '111,159,214', '127,191,158', '165,143,209', '224,144,127'];

  const desenhar = () => {
    raf = 0;
    const dpr = devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    ajustar();
    // ruas reais (se o mapa as forneceu); senão, as faixas provisórias
    if (reais) {
      ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      const M = 220, bx0 = Math.min(...xs) - M, bx1 = Math.max(...xs) + M, by0 = Math.min(...ys) - M, by1 = Math.max(...ys) + M;   // só as ruas do entorno
      ctx.beginPath(); [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]].map(([x, y]) => proj(x, y, 0)).forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
      reais.forEach(r => r.linhas.forEach(pts => {
        const P = pts.map(([x, y]) => proj(x, y, 0));
        ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = (geo.largura * UM + 14) * k * .8; ctx.stroke();
        ctx.strokeStyle = '#1d1d1d'; ctx.lineWidth = geo.largura * UM * k * .8; ctx.stroke();
      }));
      ctx.restore();
      reais.forEach(r => { if (!r.nome || !r.rotulo) return;
        const [a, b] = r.rotulo, p0 = proj(a[0], a[1], 0), p1 = proj(b[0], b[1], 0);
        let ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
        ctx.save(); ctx.translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2); ctx.rotate(ang);
        ctx.font = '10px Libre Baskerville, Georgia, serif'; ctx.fillStyle = '#a8a8a8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(r.nome, 0, 0); ctx.restore();
      });
    }
    if (cfg.terreno) {   // o terreno da creche, na esquina
      const [tx, ty, tw, th] = cfg.terreno;
      poly([[tx, ty], [tx + tw, ty], [tx + tw, ty + th], [tx, ty + th]].map(([x, y]) => proj(x, y, 0)), '#0d0d0d', '#2e2e2e');
    }
    // ruas ao redor (faixa de asfalto, linha central tracejada, nome ao longo da rua)
    if (!reais) ruas.forEach(r => {
      const q = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(([x, y]) => proj(x, y, 0));
      if (r.calcada) { poly(q, '#232323', null); return; }
      poly(q, '#171717', '#3a3a3a');
      const a = r.eixo === 'y' ? [r.x + r.w / 2, r.y + 8, r.x + r.w / 2, r.y + r.h - 8] : [r.x + 8, r.y + r.h / 2, r.x + r.w - 8, r.y + r.h / 2];
      const p0 = proj(a[0], a[1], 0), p1 = proj(a[2], a[3], 0);
      ctx.save(); ctx.setLineDash([7, 7]); ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); ctx.restore();
      const m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      let ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
      ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(ang); ctx.font = '10px Libre Baskerville, Georgia, serif'; ctx.fillStyle = '#9a9a9a';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(r.nome, 0, -3); ctx.restore();
    });
    // pisos
    locais.forEach(l => {
      if (l.piso === false) return;
      const q = [[l.x, l.y], [l.x + l.w, l.y], [l.x + l.w, l.y + l.h], [l.x, l.y + l.h]].map(([x, y]) => proj(x, y, 0));
      const ativo = foco === l.id;
      poly(q, l.id === 'sala' ? '#161616' : ativo ? '#2a2a2a' : l.aberto ? '#0f0f0f' : '#121212', l.aberto ? '#2c2c2c' : null);
      if (l.id === 'sala') {   // aquarela das cinco cores no piso da sala (desenhada no plano do piso)
        ctx.save();
        ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
        const o = proj(0, 0, 0), ex = proj(1, 0, 0), ey = proj(0, 1, 0);
        ctx.transform(ex[0] - o[0], ex[1] - o[1], ey[0] - o[0], ey[1] - o[1], o[0], o[1]);
        const mx = l.x + l.w / 2, my = l.y + l.h / 2;
        CORES.forEach((rgb, i) => {
          const a = -Math.PI / 2 + i * 2 * Math.PI / 5, px = mx + Math.cos(a) * 34, py = my + Math.sin(a) * 30;
          const g = ctx.createRadialGradient(px, py, 0, px, py, 90);
          g.addColorStop(0, `rgba(${rgb},.85)`); g.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = g; ctx.fillRect(l.x, l.y, l.w, l.h);
        });
        ctx.restore();
      }
    });
    // paredes, de longe para perto
    const ordem = caixas.map(b => ({ b, d: proj((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, b.h / 2)[2] })).sort((a, b) => a.d - b.d);
    ordem.forEach(({ b }) => {
      const dest = b.ids.includes('sala');
      const lados = [[0, -1, [[b.x0, b.y0], [b.x1, b.y0]]], [1, 0, [[b.x1, b.y0], [b.x1, b.y1]]], [0, 1, [[b.x1, b.y1], [b.x0, b.y1]]], [-1, 0, [[b.x0, b.y1], [b.x0, b.y0]]]];
      lados.forEach(([nx, ny, [[ax, ay], [bx, by]]]) => {
        if (nx * s + ny * c <= 0) return;                    // face de costas para o leitor
        const q = [proj(ax, ay, 0), proj(bx, by, 0), proj(bx, by, b.h), proj(ax, ay, b.h)];
        const luz = .5 + .5 * (nx * c * 0 + (nx * c - ny * s) * .35 + .3);   // variação suave entre faces
        const v = Math.round((dest ? 70 : 38) + luz * 22);
        poly(q, `rgb(${v},${v},${v})`, 'rgba(255,255,255,.16)');
      });
      const topo = [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map(([x, y]) => proj(x, y, b.h));
      poly(topo, dest ? '#f2f2f2' : '#9d9d9d', 'rgba(0,0,0,.35)');
    });
    // nomes
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    locais.forEach(l => {
      if (!l.nome) return;
      const p = proj(l.x + l.w / 2, l.y + l.h / 2, 0), ativo = foco === l.id || l.id === 'sala' && foco === 'sala';
      ctx.font = (ativo ? '12px ' : '9.5px ') + 'Libre Baskerville, Georgia, serif';
      ctx.fillStyle = ativo ? '#fff' : '#6e6e6e';
      ctx.fillText(l.nome, p[0], p[1]);
    });
  };
  const pedir = () => { if (!raf) raf = requestAnimationFrame(desenhar); };
  const animar = () => {
    const d = alvo - yaw, dz = aZ - zm, dx = aCx - ccx, dy = aCy - ccy;
    if ((Math.abs(d) < .002 && Math.abs(dz) < .005 && Math.abs(dx) < .5 && Math.abs(dy) < .5) || reduzido) { yaw = alvo; zm = aZ; ccx = aCx; ccy = aCy; pedir(); return; }
    yaw += d * .08; zm += dz * .08; ccx += dx * .08; ccy += dy * .08; pedir(); requestAnimationFrame(animar);
  };
  const tamanho = () => {
    const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    W = r.width; Hh = r.height;
    canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(Hh * dpr));
    pedir();
  };
  if ('ResizeObserver' in window) new ResizeObserver(tamanho).observe(canvas); else addEventListener('resize', tamanho);
  tamanho();

  // girar: arrastar (horizontal) ou botões
  let arrasto = null;
  canvas.addEventListener('pointerdown', e => { arrasto = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (arrasto === null) return; alvo = yaw += (e.clientX - arrasto) * .012; arrasto = e.clientX; pedir(); });
  ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { arrasto = null; }));
  $('#gira-esq', palco).addEventListener('click', () => { alvo -= .5; animar(); });
  $('#gira-dir', palco).addEventListener('click', () => { alvo += .5; animar(); });
  const be = $('#epoca', palco);
  if (be) be.addEventListener('click', () => {
    const hoje = epoca === 'antes'; epoca = hoje ? 'hoje' : 'antes'; montar(); pedir();
    be.textContent = hoje ? 'Como era' : 'Hoje'; be.setAttribute('aria-pressed', String(hoje));
  });

  palco.classList.add('tem-creche3d');
  const ruasReais = (feats, ancora) => {
    const th = (geo.norte || 0) * Math.PI / 180, lat0 = ancora[1] * Math.PI / 180, ax = geo.local ? geo.local[0] : cx0, ay = geo.local ? geo.local[1] : cy0;
    const plano = ([lng, lat]) => {
      const e = (lng - ancora[0]) * 111320 * Math.cos(lat0), n = (lat - ancora[1]) * 110574;
      return [ax + UM * (e * Math.cos(th) - n * Math.sin(th)), ay - UM * (e * Math.sin(th) + n * Math.cos(th))];
    };
    const raio = 140 * UM, porNome = new Map(), out = [];
    feats.forEach(f => f.linhas.forEach(l => {
      const pts = l.map(plano);
      if (!pts.some(p => Math.hypot(p[0] - ax, p[1] - ay) < raio)) return;
      const item = { nome: f.nome, linhas: [pts] };
      out.push(item);
      const comp = pts.reduce((t, p, i) => i ? t + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
      if (f.nome && (!porNome.has(f.nome) || porNome.get(f.nome).comp < comp)) porNome.set(f.nome, { item, comp, pts });
    }));
    porNome.forEach(({ item, pts }) => {      // rótulo no trecho mais próximo da creche
      let m = 0, d = 1e9; pts.forEach((p, i) => { const q = Math.hypot(p[0] - ax, p[1] - ay); if (q < d && i < pts.length - 1) { d = q; m = i; } });
      item.rotulo = [pts[m], pts[m + 1]];
    });
    if (out.length) { reais = out; pedir(); }
  };
  return { ruasReais, epoca(e) { epoca = e; montar(); pedir(); }, aplicar(p) {
    foco = p.foco;
    if (p.vista === 'planta') {
      const g = cfg.camera[p.foco]; if (g !== undefined) alvo = g * Math.PI / 180;
      const l = todos.find(q => q.id === p.foco && (!q.epoca || q.epoca === epoca)), z = (cfg.zoom || {})[p.foco];
      if (l && z) { aCx = l.x + l.w / 2; aCy = l.y + l.h / 2; aZ = z; } else { aCx = cx0; aCy = cy0; aZ = 1; }
      animar();
    }
    pedir();
  } };
}

// Aquele Dia: mapa em etapas (cidade, trajeto, creche)
const dia = $('#dia');
if (dia && $('#dados-dia')) {
  const dadosDia = JSON.parse($('#dados-dia').textContent);
  const passos = dadosDia.passos;
  const palco = $('.palco', dia);
  const trechos = $$('.trecho', dia), locais = $$('[data-ponto]', dia), fases = $$('.fase', dia);
  const sala = $('.sala-mancha', dia);
  const titulo = $('.painel-titulo', dia), hora = $('.painel-hora', dia), texto = $('.painel-texto', dia);
  const fonte = $('.painel-fonte', dia), link = $('.painel-link', dia);
  const ant = $('.passo-ant', dia), seg = $('.passo-seg', dia), bolas = $('.passo-pontos', dia);
  let i = 0;
  const botoes = passos.map((p, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'passo-ponto';
    b.setAttribute('aria-label', 'Etapa ' + (k + 1) + ': ' + p.titulo);
    b.addEventListener('click', () => ir(k));
    bolas.appendChild(b);
    return b;
  });
  const ir = n => {
    i = Math.max(0, Math.min(passos.length - 1, n));
    const p = passos[i];
    palco.dataset.vista = p.vista;
    trechos.forEach((t, k) => t.classList.toggle('on', k < (p.trecho || 0)));
    locais.forEach(g => g.classList.toggle('atual', g.dataset.ponto === p.foco));
    if (sala) sala.classList.toggle('on', !!p.sala);
    fases.forEach(f => f.classList.toggle('atual', f.dataset.fase === p.fase));
    titulo.textContent = p.titulo;
    hora.textContent = p.hora || ''; hora.hidden = !p.hora;
    texto.textContent = p.texto;
    fonte.textContent = p.fonte || ''; fonte.hidden = !p.fonte;
    if (p.link) { link.href = p.link.href; link.textContent = p.link.texto; link.hidden = false; } else link.hidden = true;
    botoes.forEach((b, k) => {
      b.classList.toggle('atual', k === i);
      b.classList.toggle('feito', k < i);
      if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    ant.disabled = i === 0;
    seg.disabled = i === passos.length - 1;
    if (mapa3d) mapa3d.aplicar(p);
    if (creche3d) creche3d.aplicar(p);
  };
  let mapa3d = null, creche3d = null;
  if (dadosDia.creche3d) { try { creche3d = iniciarCreche3D(dadosDia.creche3d, palco); } catch (e) { console.warn('Creche 3D indisponível; usando a planta.', e); } }
  if (dadosDia.mapa && window.maplibregl) {
    try { mapa3d = iniciarMapa3D(dadosDia.mapa, palco, id => { const k = passos.findIndex(p => p.foco === id); if (k >= 0) ir(k); }); }   // as ruas do 3D da creche vêm só da configuração (não são mais lidas do mapa)
    catch (e) { console.warn('Mapa 3D indisponível; usando o mapa esquemático.', e); mapa3d = null; }
  }
  ant.addEventListener('click', () => ir(i - 1));
  seg.addEventListener('click', () => ir(i + 1));
  fases.forEach(f => f.addEventListener('click', () => ir(passos.findIndex(p => p.fase === f.dataset.fase))));
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') ir(i + 1);
    if (e.key === 'ArrowLeft') ir(i - 1);
  });
  ir(0);
}

// Texto: anotações abertas no computador, fechadas (toque para abrir) no celular
const mq = matchMedia('(min-width: 861px)');
const notas = () => $$('details.nota').forEach(d => { d.open = mq.matches; });
notas(); mq.addEventListener('change', notas);

// Memória: forma de onda + transcrição acompanhando o áudio
const player = $('[data-audio]');
if (player) {
  const audio = $('audio', player), onda = $('.onda', player), play = $('.play', player), tempo = $('.tempo', player);
  const linhas = $$('.transcricao p[data-t]');
  const N = 96;
  const fmt = s => { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const pintar = () => {
    const r = audio.duration ? audio.currentTime / audio.duration : 0;
    $$('span', onda).forEach((s, i) => s.classList.toggle('tocado', i < r * N));
    tempo.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
    onda.setAttribute('aria-valuenow', Math.round(r * 100));
    let atual = -1;
    linhas.forEach((l, i) => { if (+l.dataset.t <= audio.currentTime) atual = i; });
    linhas.forEach((l, i) => l.classList.toggle('atual', i === atual));
  };
  const barras = picos => {
    onda.innerHTML = '';
    picos.forEach(p => { const s = document.createElement('span'); s.style.setProperty('--h', Math.max(6, p * 100) + '%'); onda.appendChild(s); });
    pintar();
  };
  // Forma de onda provisória; vira a real quando o arquivo de áudio puder ser lido
  barras(Array.from({ length: N }, (_, i) => 0.25 + 0.55 * Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11)) + 0.1 * Math.abs(Math.sin(i * 1.7))));
  const src = $('source', audio);
  if (src) fetch(src.src).then(r => r.arrayBuffer())
    .then(b => new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(b))
    .then(buf => {
      const d = buf.getChannelData(0), passo = Math.floor(d.length / N), picos = [];
      for (let i = 0; i < N; i++) { let m = 0; for (let j = i * passo; j < (i + 1) * passo; j += Math.max(1, Math.floor(passo / 200))) m = Math.max(m, Math.abs(d[j])); picos.push(m); }
      const max = Math.max(...picos) || 1;
      barras(picos.map(p => p / max));
    }).catch(() => {});
  play.addEventListener('click', () => audio.paused ? audio.play() : audio.pause());
  audio.addEventListener('play', () => { play.textContent = 'Pausar'; });
  audio.addEventListener('pause', () => { play.textContent = 'Ouvir'; });
  audio.addEventListener('timeupdate', pintar);
  audio.addEventListener('loadedmetadata', pintar);
  onda.addEventListener('click', e => { const b = onda.getBoundingClientRect(); if (audio.duration) audio.currentTime = ((e.clientX - b.left) / b.width) * audio.duration; });
  onda.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') audio.currentTime += 5;
    if (e.key === 'ArrowLeft') audio.currentTime -= 5;
  });
  linhas.forEach(l => l.addEventListener('click', () => { audio.currentTime = +l.dataset.t; audio.play(); }));
}

// Vídeo: o menu some enquanto o vídeo toca
const video = $('.cinema video');
if (video) {
  video.addEventListener('play', () => document.body.classList.add('tocando'));
  ['pause', 'ended'].forEach(e => video.addEventListener(e, () => document.body.classList.remove('tocando')));
}


// Janelas de aviso
(() => {
  const lembrar = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  const abrir = (html, aoFechar) => {
    if (!('HTMLDialogElement' in window)) return;
    const d = document.createElement('dialog'); d.className = 'aviso'; d.innerHTML = html;
    document.body.appendChild(d);
    d.addEventListener('close', () => { d.remove(); if (aoFechar) aoFechar(); });
    $$('[data-fechar]', d).forEach(b => b.addEventListener('click', () => { if (aoFechar) aoFechar(); d.close(); }));
    d.showModal();
    const primeiro = $('[data-fechar]', d); if (primeiro) primeiro.focus();
  };

  // Home: como ler
  if (document.body.classList.contains('home')) {
    const html = `<h2 id="t-ler">Como ler esta reportagem</h2>
      <ul>
        <li><b>Pelas fotos</b>Clique no rosto de uma pessoa e siga as conexões entre as histórias, de uma para a outra.</li>
        <li><b>Pelo menu</b>Abra “Cinco vidas” e leia as cinco histórias em ordem cronológica, pela data de nascimento.</li>
      </ul>
      <p>As páginas Aquele Dia, Memória e A Violência Escolar completam os textos e podem ser visitadas a qualquer momento.</p>
      <div class="acoes"><button type="button" data-fechar>Entendi</button></div>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'como-ler'; b.textContent = 'Como ler';
    b.addEventListener('click', () => abrir(html)); document.body.appendChild(b);
    if (!lembrar('como-ler')) abrir(html, () => lembrar('como-ler', '1'));
  }

  // Infográfico, áudio e vídeo: aviso de conteúdo sensível (uma vez por visita)
  if (document.body.dataset.aviso === 'sensivel' && !lembrar('aviso-sensivel')) {
    abrir(`<h2 id="t-aviso">Conteúdo sensível</h2>
      <p>Esta página trata de um ataque a uma creche e da morte de crianças e educadoras. Pode conter relatos e descrições de violência que causem desconforto ou sofrimento.</p>
      <p class="apoio">Se precisar conversar com alguém, o CVV atende de forma gratuita e sigilosa, 24 horas por dia, pelo telefone 188.</p>
      <div class="acoes"><button type="button" data-fechar>Entendi, continuar</button><a href="index.html">Voltar ao início</a></div>`,
      () => lembrar('aviso-sensivel', '1'));
  }
})();


// Faixa de apoio e denúncia, fixa em todas as páginas: um canal por vez, trocando a cada poucos segundos
(() => {
  const canais = [
    ['Apoio emocional:', 'CVV', '188', '(24 h, gratuito)', 'Ligar para o CVV, 188'],
    ['Emergência e denúncias:', 'Polícia', '190', '', 'Ligar para a Polícia, 190'],
    ['Violência contra crianças:', 'Disque', '100', '', 'Ligar para o Disque 100']
  ];
  const f = document.createElement('aside'); f.className = 'apoio-fixo'; f.setAttribute('aria-label', 'Canais de apoio e denúncia');
  f.innerHTML = '<p class="so-leitor">Canais de apoio e denúncia: CVV 188, apoio emocional, 24 horas, gratuito. Polícia 190, emergência e denúncias. Disque 100, violência contra crianças.</p>' +
    '<div class="giro">' + canais.map((c, n) => `<span class="item${n ? '' : ' on'}"><b>${c[0]}</b> ${c[1]} <a href="tel:${c[2]}" aria-label="${c[4]}">${c[2]}</a> ${c[3]}</span>`).join('') + '</div>' +
    '<div class="pontos" role="group" aria-label="Escolher canal">' + canais.map((c, n) => `<button type="button" aria-label="Mostrar canal ${n + 1} de 3: ${c[1]} ${c[2]}" aria-pressed="${n ? 'false' : 'true'}"></button>`).join('') + '</div>';
  document.body.appendChild(f);
  if (semMovimento.matches) { f.classList.add('estatico'); return; }              // sem animação: mostra os três de uma vez
  const itens = $$('.item', f), pontos = $$('.pontos button', f);
  let n = 0, parado = false, tempo = null;
  const mostra = i => { n = (i + itens.length) % itens.length; itens.forEach((el, k) => el.classList.toggle('on', k === n)); pontos.forEach((p, k) => p.setAttribute('aria-pressed', k === n)); };
  const liga = () => { clearInterval(tempo); if (!parado) tempo = setInterval(() => mostra(n + 1), 7000); };
  pontos.forEach((p, k) => p.addEventListener('click', () => { parado = true; clearInterval(tempo); mostra(k); }));
  f.addEventListener('mouseenter', () => clearInterval(tempo)); f.addEventListener('mouseleave', liga);
  f.addEventListener('focusin', () => clearInterval(tempo)); f.addEventListener('focusout', liga);
  liga();
})();

// Fotos que ainda não estão na pasta: mostra o nome do arquivo esperado (some sozinho quando a foto existir)
(() => {
  const marca = img => { const c = img.closest('.foto, .ampliar, .pilha'); if (c) { c.classList.add('sem-foto'); c.dataset.arquivo = img.getAttribute('src'); } };
  $$('.foto img, .polaroid img, .pilha img').forEach(img => {
    if (img.complete && !img.naturalWidth) marca(img); else img.addEventListener('error', () => marca(img));
  });
})();

// Galeria em janela (carrossel): toque/clique numa foto do texto ou no link "ver fotos"
(() => {
  let dados = {}; try { dados = JSON.parse(($('#galerias') || {}).textContent || '{}'); } catch (e) {}
  let dlg = null, lista = [], i = 0, x0 = null;
  const monta = () => {
    dlg = document.createElement('dialog'); dlg.className = 'galeria'; dlg.setAttribute('aria-label', 'Galeria de fotos');
    dlg.innerHTML = '<button class="fechar" type="button" aria-label="Fechar galeria">&times;</button>' +
      '<div class="quadro"><button class="ant" type="button" aria-label="Foto anterior">&#8249;</button><img alt=""><button class="prox" type="button" aria-label="Próxima foto">&#8250;</button></div>' +
      '<div class="legenda" aria-live="polite"><b></b><small></small></div><div class="conta" aria-hidden="true"></div>';
    document.body.appendChild(dlg);
    const q = $('.quadro', dlg), img = $('img', q);
    img.addEventListener('error', () => { q.classList.add('sem-foto'); q.dataset.arquivo = img.getAttribute('src'); });
    $('.fechar', dlg).addEventListener('click', () => dlg.close());
    $('.ant', dlg).addEventListener('click', () => ir(i - 1));
    $('.prox', dlg).addEventListener('click', () => ir(i + 1));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') ir(i - 1); else if (e.key === 'ArrowRight') ir(i + 1); });
    dlg.addEventListener('close', () => { document.body.style.overflow = ''; });
    q.addEventListener('pointerdown', e => { x0 = e.clientX; });
    q.addEventListener('pointerup', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) ir(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  };
  const ir = n => {
    i = (n + lista.length) % lista.length; const f = lista[i], q = $('.quadro', dlg), img = $('img', q);
    q.classList.remove('sem-foto'); img.src = f.src; img.alt = f.alt || '';
    $('.legenda b', dlg).textContent = f.legenda || ''; $('.legenda small', dlg).textContent = f.credito ? 'Foto: ' + f.credito : '';
    $('.conta', dlg).textContent = (i + 1) + ' / ' + lista.length;
    if (lista.length > 1) { new Image().src = lista[(i + 1) % lista.length].src; }
  };
  const abre = (fotos, n) => {
    if (!fotos.length) return; if (!dlg) monta();
    lista = fotos; dlg.toggleAttribute('data-uma', fotos.length < 2);
    document.body.style.overflow = 'hidden'; dlg.showModal(); ir(n || 0);
    $('.fechar', dlg).focus();
  };
  document.addEventListener('click', e => {
    const f = e.target.closest('.ampliar'), g = e.target.closest('[data-galeria]'), l = e.target.closest('[data-abre]');
    if (f || l) {                                                  // todas as fotos daquela pessoa, começando pela tocada (ou, no celular, pelo link)
      const todas = $$('.ampliar', (f || l).closest('.vitima') || document), fig = b => ({ src: $('img', b).getAttribute('src'), alt: $('img', b).alt, legenda: ($('figcaption', b.parentNode) || {}).textContent || '', credito: b.parentNode.dataset.credito || '' });
      abre(todas.map(fig), f ? todas.indexOf(f) : Math.max(0, todas.findIndex(b => $('img', b).getAttribute('src') === l.dataset.abre)));
    } else if (g) abre(dados[g.dataset.galeria] || [], 0);
  });
})();
