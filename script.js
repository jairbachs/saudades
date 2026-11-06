const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const btn = $('.menu-btn'), menu = $('#menu');
const fechar = () => { menu.classList.remove('aberto'); btn.setAttribute('aria-expanded', 'false'); };
btn.addEventListener('click', () => btn.setAttribute('aria-expanded', menu.classList.toggle('aberto')));
$$('a', menu).forEach(a => a.addEventListener('click', fechar));

const COR = { keli: [227,178,92], mirla: [111,159,214], sarah: [127,191,158], murilo: [165,143,209], 'anna-bela': [224,144,127] };
const COMPLEMENTOS = [[232,150,176], [240,205,120], [96,190,200], [200,130,170], [150,200,120], [120,150,230]];
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)');
const aquarela = (() => {
  let cont = null, grao = null, atual = null;
  const escala = .5;
  const semente = s => { let h = 1779033703 ^ s.length; for (const ch of s) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
  const faz = () => {
    cont = document.createElement('div'); cont.className = 'aquarela-fundo'; cont.setAttribute('aria-hidden', 'true'); document.body.prepend(cont);
    const g = document.createElement('canvas'); g.width = g.height = 200; const x = g.getContext('2d'), d = x.createImageData(200, 200);
    for (let i = 0; i < d.data.length; i += 4) { d.data[i + 3] = Math.random() < .62 ? 0 : Math.random() * 70; }
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
      for (let k = 0; k < 4; k++) {
        caminho(ctx, m, m.R * e * (1 - k * .09), k);
        ctx.fillStyle = `rgba(${r},${g},${b},${(k === 0 ? .20 : .11) * f})`; ctx.fill();
      }
      caminho(ctx, m, m.R * e, 0);
      ctx.lineWidth = 1.8; ctx.strokeStyle = `rgba(${r},${g},${b},${.55 * f * Math.min(1, e * 1.6)})`; ctx.stroke();
      caminho(ctx, m, m.R * e * .97, 0); ctx.lineWidth = 7; ctx.strokeStyle = `rgba(${r},${g},${b},${.10 * f})`; ctx.stroke();
    }
    ctx.globalCompositeOperation = 'destination-out';
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

const mq = matchMedia('(min-width: 861px)');
const notas = () => $$('details.nota').forEach(d => { d.open = mq.matches; });
notas(); mq.addEventListener('change', notas);

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
    linhas.forEach((l, i) => { l.classList.toggle('atual', i === atual); l.classList.toggle('passou', i < atual); });
    if (atual !== ultima) { ultima = atual; acompanha(linhas[atual]); }
  };

  const caixa = $('.transcricao');
  let ultima = -1, solta = 0;
  const acompanha = l => {
    if (!l || !caixa || Date.now() < solta) return;
    caixa.scrollTo({ top: Math.max(0, l.offsetTop - caixa.offsetTop - caixa.clientHeight * .3), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  if (caixa) ['wheel', 'touchstart', 'keydown'].forEach(e => caixa.addEventListener(e, () => { solta = Date.now() + 5000; }, { passive: true }));
  const barras = picos => {
    onda.innerHTML = '';
    picos.forEach(p => { const s = document.createElement('span'); s.style.setProperty('--h', Math.max(6, p * 100) + '%'); onda.appendChild(s); });
    pintar();
  };

  barras(Array.from({ length: N }, (_, i) => 0.25 + 0.55 * Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11)) + 0.1 * Math.abs(Math.sin(i * 1.7))));
  const ondaReal = () => { const u = audio.currentSrc; if (!u) return; fetch(u).then(r => r.arrayBuffer())
    .then(b => new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(b))
    .then(buf => {
      const d = buf.getChannelData(0), passo = Math.floor(d.length / N), picos = [];
      for (let i = 0; i < N; i++) { let m = 0; for (let j = i * passo; j < (i + 1) * passo; j += Math.max(1, Math.floor(passo / 200))) m = Math.max(m, Math.abs(d[j])); picos.push(m); }
      const max = Math.max(...picos) || 1;
      barras(picos.map(p => p / max));
    }).catch(() => {}); };
  audio.addEventListener('loadedmetadata', ondaReal, { once: true });
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

const video = $('.cinema video');
if (video) {
  video.addEventListener('play', () => document.body.classList.add('tocando'));
  ['pause', 'ended'].forEach(e => video.addEventListener(e, () => document.body.classList.remove('tocando')));
}

(() => {
  const pagina = location.pathname.split('/').pop() || 'index.html';
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

  if (document.body.classList.contains('home')) {
    const html = `<h2 id="t-ler">Como ler esta reportagem</h2>
      <ul>
        <li><b>Pelas fotos</b>Clique no rosto de uma pessoa e siga as conexões entre as histórias, de uma para a outra.</li>
        <li><b>Pelo menu</b>Abra “Cinco vidas” e leia as cinco histórias em ordem cronológica, pela data de nascimento.</li>
      </ul>
      <p>As páginas Saudades, Memória e A Violência Escolar completam os textos e podem ser visitadas a qualquer momento.</p>
      <div class="acoes"><button type="button" data-fechar>Entendi</button></div>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'como-ler'; b.textContent = 'Como ler';
    b.addEventListener('click', () => abrir(html)); document.body.appendChild(b);
    if (!lembrar('como-ler')) abrir(html, () => lembrar('como-ler', '1'));
  }

  if (document.body.dataset.aviso === 'sensivel' && !lembrar('aviso-sensivel:' + pagina)) {
    abrir(`<h2 id="t-aviso">Conteúdo sensível</h2>
      <p>Esta página trata de um ataque a uma creche e da morte de crianças e educadoras. Pode conter relatos e descrições de violência que causem desconforto ou sofrimento.</p>
      ${document.querySelector('[data-audio]') ? '<p class="fone"><b>Para ouvir melhor:</b> use fones de ouvido, em um lugar tranquilo. O áudio traz trechos de uma ligação pedindo socorro e depoimentos de moradores, e há sons de ambiente que se perdem em alto-falantes.</p>' : ''}
      <p class="apoio">Se precisar conversar com alguém, o CVV atende de forma gratuita e sigilosa, 24 horas por dia, pelo telefone 188.</p>
      <div class="acoes"><button type="button" data-fechar>Entendi, continuar</button><a href="index.html">Voltar ao início</a></div>`,
      () => lembrar('aviso-sensivel:' + pagina, '1'));
  }
})();

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
  if (semMovimento.matches) { f.classList.add('estatico'); return; }
  const itens = $$('.item', f), pontos = $$('.pontos button', f);
  let n = 0, parado = false, tempo = null;
  const mostra = i => { n = (i + itens.length) % itens.length; itens.forEach((el, k) => el.classList.toggle('on', k === n)); pontos.forEach((p, k) => p.setAttribute('aria-pressed', k === n)); };
  const liga = () => { clearInterval(tempo); if (!parado) tempo = setInterval(() => mostra(n + 1), 7000); };
  pontos.forEach((p, k) => p.addEventListener('click', () => { parado = true; clearInterval(tempo); mostra(k); }));
  f.addEventListener('mouseenter', () => clearInterval(tempo)); f.addEventListener('mouseleave', liga);
  f.addEventListener('focusin', () => clearInterval(tempo)); f.addEventListener('focusout', liga);
  liga();
})();

(() => {
  const marca = img => { const c = img.closest('.foto, .ampliar, .pilha'); if (c) { c.classList.add('sem-foto'); c.dataset.arquivo = img.getAttribute('src'); } };
  $$('.foto img, .polaroid img, .pilha img').forEach(img => {
    if (img.complete && !img.naturalWidth) marca(img); else img.addEventListener('error', () => marca(img));
  });
})();

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
    if (f || l) {
      const todas = $$('.ampliar', (f || l).closest('.vitima') || document), fig = b => ({ src: $('img', b).getAttribute('src'), alt: $('img', b).alt, legenda: ($('figcaption', b.parentNode) || {}).textContent || '', credito: b.parentNode.dataset.credito || '' });
      abre(todas.map(fig), f ? todas.indexOf(f) : Math.max(0, todas.findIndex(b => $('img', b).getAttribute('src') === l.dataset.abre)));
    } else if (g) abre(dados[g.dataset.galeria] || [], 0);
  });
})();

(() => {
  const box = $('.fundo-mapa'), cv = $('canvas', box || document), F = window.FUNDO; if (!box || !cv || !F) return;
  const ctx = cv.getContext('2d'), A = parseFloat(box.dataset.alfa || 1), movel = box.hasAttribute('data-desliza');
  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, alvo = [0, 0], raf = 0;
  const FOCOS = { keli: [-380, 260], mirla: [260, -200], murilo: [-120, -330], sarah: [380, 200], 'anna-bela': [-40, 40] };
  const desenha = () => {
    raf = 0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const k = Math.max(w / F.w, h / F.h) * (movel ? 1.6 : 1.15), ox = w / 2 - (F.x0 + F.w / 2 + cx) * k, oy = h / 2 + (F.y0 + F.h / 2 + cy) * k;
    const traco = (rs, cor, lw) => { ctx.strokeStyle = cor; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath();
      rs.forEach(r => { ctx.moveTo(ox + r[0] * k, oy - r[1] * k); for (let i = 2; i < r.length; i += 2) ctx.lineTo(ox + r[i] * k, oy - r[i + 1] * k); ctx.closePath(); }); ctx.stroke(); };
    traco(F.agua, `rgba(255,255,255,${.10 * A})`, .8);
    traco(F.ruas, `rgba(255,255,255,${.2 * A})`, .7);
    if (Math.abs(alvo[0] - cx) + Math.abs(alvo[1] - cy) > .5) { cx += (alvo[0] - cx) * .05; cy += (alvo[1] - cy) * .05; raf = requestAnimationFrame(desenha); }
  };
  const tamanho = () => { dpr = Math.min(2, window.devicePixelRatio || 1); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; desenha(); };
  tamanho(); addEventListener('resize', tamanho);
  if (movel && 'IntersectionObserver' in window) {
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && FOCOS[e.target.dataset.v]) { alvo = FOCOS[e.target.dataset.v]; if (reduz) { cx = alvo[0]; cy = alvo[1]; } if (!raf) raf = requestAnimationFrame(desenha); } }), { rootMargin: '-40% 0px -50% 0px' });
    $$('.vitima[data-v]').forEach(v => io.observe(v));
  }
})();
