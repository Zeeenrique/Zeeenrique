// Tema "Zeeenrique Industries": galpão com crachá, máquinas por linguagem, esteira de commits e painel de LED.
import {
  esc, fmt, dec, f1, MONO, SANS, rng, engrenagem, filtroRuido, filtroBlur, filtroBrilho, filtroSombra, grad, gradR, rolagem,
} from './util.mjs';

export const TEMAS_FABRICA = {
  escuro: {
    bg: '#101215', borda: '#2c3139', txt: '#eceff3', sub: '#8f98a6', faixa: '#f5b700', faixa2: '#16181b', laranja: '#ff7a1a', ok: '#3ddc84',
    parede1: '#2a3037', parede2: '#1a1e23', piso1: '#2c3036', piso2: '#1c1f23', metal1: '#8c96a1', metal2: '#454c56', metal3: '#252a30',
    luz: '#ffe3a6', luzA: 0.17, ruidoPiso: 0.8, chao: '#9aa3b0', cracha: '#f1efe9', placa: '#1a1d22',
  },
  claro: {
    bg: '#efece5', borda: '#cfc9bc', txt: '#24262b', sub: '#666b74', faixa: '#e0a800', faixa2: '#2a2c30', laranja: '#e8630a', ok: '#1f9d55',
    parede1: '#d9dce0', parede2: '#b4bac2', piso1: '#c9c4b8', piso2: '#a7a194', metal1: '#f3f5f7', metal2: '#a9b0b9', metal3: '#717a85',
    luz: '#fff2cc', luzA: 0.4, ruidoPiso: 0.35, chao: '#3d4047', cracha: '#ffffff', placa: '#2a2d33',
  },
};
const LED = { fundo: '#0d0f12', aceso: '#ffb000', apagado: '#2e250e', rot: '#8f98a6' };
const TINTA = { txt: '#24262b', sub: '#6b6f78' };

const rebites = (x, y, w, h, m = 4, cor = '#000', op = 0.45) =>
  [[x + m, y + m], [x + w - m, y + m], [x + m, y + h - m], [x + w - m, y + h - m]]
    .map(([a, b]) => `<circle cx="${f1(a)}" cy="${f1(b)}" r="1.3" fill="${cor}" opacity="${op}"/>`).join('');

export function fabrica(t, d) {
  const W = 860, H = 492;
  const FX = 250, FY = 74, FW = 570, FH = 302;
  const LX = 266, LW = 440, ESTEIRA_Y = 262, PISO_Y = 252;
  const { stack } = d;
  const r = rng(2018);

  // ---------- galpão ----------
  const trelica = (() => {
    let s = `<rect x="${FX}" y="${FY}" width="${FW}" height="6" fill="url(#fMetal)"/><rect x="${FX}" y="${FY + 20}" width="${FW}" height="4" fill="url(#fMetal)"/>`;
    for (let x = FX; x < FX + FW; x += 24) s += `<path d="M${x} ${FY + 6}L${x + 12} ${FY + 20}L${x + 24} ${FY + 6}" stroke="${t.metal3}" stroke-width="2" fill="none"/>`;
    return s;
  })();
  const lampadas = [0.17, 0.5, 0.83].map((p) => {
    const x = LX + LW * p;
    return `<path d="M${f1(x - 11)} 116L${f1(x + 11)} 116L${f1(x + 80)} ${PISO_Y + 50}L${f1(x - 80)} ${PISO_Y + 50}Z" fill="url(#fCone)"/>
      <ellipse cx="${f1(x)}" cy="${PISO_Y + 48}" rx="90" ry="12" fill="url(#fPoca)"/>
      <line x1="${f1(x)}" y1="${FY + 24}" x2="${f1(x)}" y2="106" stroke="${t.metal3}" stroke-width="1.5"/>
      <path d="M${f1(x - 4)} 106h8l7 10h-22Z" fill="url(#fMetal)"/>
      <ellipse cx="${f1(x)}" cy="116.5" rx="9" ry="2" fill="${t.luz}" filter="url(#fBrilho)"/>`;
  }).join('');

  // ---------- máquinas ----------
  const n = Math.max(1, stack.length);
  const mw = (LW - (n - 1) * 14) / n;
  const maior = stack[0]?.pct || 1;
  const maquinas = stack.map((l, i) => {
    const x = LX + i * (mw + 14), y = 150, h = 92;
    const giro = Math.min(10, Math.max(1.6, 4 * (maior / l.pct))).toFixed(1);
    const px = x + mw - 26;
    const vapor = [0, 1, 2].map((k) => `<circle cx="${px + 16}" cy="124" r="5" fill="#e9edf2" class="vapor" filter="url(#fNevoa)" style="animation-delay:${f1(k * 1.2 + i * 0.5)}s"/>`).join('');
    return `<g class="in" style="animation-delay:${0.2 + i * 0.1}s">
      ${vapor}
      <rect x="${px}" y="${FY + 24}" width="10" height="${150 - FY - 24}" fill="url(#fCano)"/>
      <rect x="${px - 2}" y="118" width="14" height="4" fill="${t.metal2}"/><rect x="${px + 10}" y="121" width="6" height="6" rx="1" fill="${t.metal3}"/>
      <ellipse cx="${f1(x + mw / 2)}" cy="${y + h + 3}" rx="${f1(mw / 2 + 4)}" ry="5" fill="#000" opacity=".4" filter="url(#fSombraSuave)"/>
      <rect x="${x}" y="${y - 4}" width="${mw}" height="6" rx="2" fill="${t.metal2}"/>
      <rect x="${x}" y="${y}" width="${mw}" height="${h}" rx="4" fill="url(#fMetal)" stroke="${t.metal3}"/>
      <rect x="${x + 1}" y="${y + 1}" width="${mw - 2}" height="1.5" fill="#fff" opacity=".25"/>
      <rect x="${x}" y="${y + h - 10}" width="${mw}" height="10" fill="url(#fZebra)" opacity=".9"/>
      <rect x="${x + 7}" y="${y + 8}" width="${mw - 14}" height="18" rx="2" fill="${t.placa}"/>
      <rect x="${x + 7}" y="${y + 8}" width="3" height="18" fill="${l.cor}"/>
      ${rebites(x + 7, y + 8, mw - 14, 18, 3, '#fff', 0.35)}
      <text x="${x + 15}" y="${y + 21}" class="maq">${esc(l.nome)}</text>
      <circle cx="${x + 24}" cy="${y + 52}" r="15" fill="#121418" stroke="${t.metal3}" stroke-width="2"/>
      <g class="gira" style="animation-duration:${giro}s">${engrenagem(x + 24, y + 52, 11, 8, t.metal1, '#121418')}</g>
      <circle cx="${x + 24}" cy="${y + 52}" r="15" fill="url(#fVidro)"/>
      <rect x="${x + mw - 54}" y="${y + 40}" width="44" height="22" rx="2" fill="${LED.fundo}" stroke="${t.metal3}"/>
      <text x="${x + mw - 14}" y="${y + 57}" class="ledm" text-anchor="end" fill="${LED.apagado}">${'8'.repeat(l.pct.toFixed(0).length)}%</text>
      <text x="${x + mw - 14}" y="${y + 57}" class="ledm" text-anchor="end" fill="${LED.aceso}" filter="url(#fBrilho)">${l.pct.toFixed(0)}%</text>
      <circle cx="${x + mw - 48}" cy="${y + 71}" r="2.2" fill="${t.ok}" class="pisca" style="animation-delay:${f1(i * 0.3)}s"/>
      <circle cx="${x + mw - 40}" cy="${y + 71}" r="2.2" fill="#ffb000" opacity=".8"/>
      ${rebites(x, y + 28, mw, h - 38, 4, '#000', 0.35)}
      <path d="M${f1(x + mw / 2 - 12)} ${y + h}h24l-6 ${ESTEIRA_Y - 6 - y - h}h-12Z" fill="url(#fCano)"/>
    </g>`;
  }).join('');

  // ---------- esteira ----------
  const fimEsteira = LX + LW + 8;
  let pernas = '', rolos = '';
  for (let x = LX + 14; x < fimEsteira; x += 72) pernas += `<rect x="${x}" y="${ESTEIRA_Y + 26}" width="5" height="30" fill="${t.metal3}"/><rect x="${x - 4}" y="${ESTEIRA_Y + 54}" width="13" height="3" fill="${t.metal3}"/>`;
  for (let x = LX + 8; x <= fimEsteira - 6; x += 24) {
    rolos += `<g class="gira" style="animation-duration:1.1s"><circle cx="${x}" cy="${ESTEIRA_Y + 17}" r="6" fill="url(#fRolo)"/><path d="M${x - 4} ${ESTEIRA_Y + 17}h8M${x} ${ESTEIRA_Y + 13}v8" stroke="${t.metal3}" stroke-width="1.2"/></g>`;
  }
  const cores = stack.length ? stack.map((l) => l.cor) : [t.laranja];
  const percurso = fimEsteira - LX - 20;
  const N_CAIXAS = 8, DUR = 9;
  const caixa = (x, y, w, h, cor) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="url(#fPapelao)" stroke="#6b4a24" stroke-opacity=".5" stroke-width=".8"/>
    <rect x="${f1(x + w / 2 - 2)}" y="${y}" width="4" height="${h}" fill="#e6c78f" opacity=".75"/>
    <rect x="${f1(x + 2)}" y="${f1(y + h - 7)}" width="6" height="4.5" fill="${cor}"/>
    <rect x="${x}" y="${y}" width="${w}" height="2" fill="#fff" opacity=".18"/>`;
  const caixas = Array.from({ length: N_CAIXAS }, (_, i) =>
    `<g class="caixa" style="animation-delay:-${((i * DUR) / N_CAIXAS).toFixed(2)}s;--d:${percurso}px">${caixa(LX, ESTEIRA_Y - 16, 19, 16, cores[i % cores.length])}</g>`).join('');

  // ---------- estoque ----------
  const SX = 722;
  const pilha = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]]
    .map(([c, rr], i) => caixa(SX + 9 + c * 22, ESTEIRA_Y - 2 - (rr + 1) * 19, 21, 18, cores[i % cores.length])).join('');
  const palete = `
    <rect x="${SX + 4}" y="${ESTEIRA_Y - 2}" width="76" height="4" fill="url(#fMadeira)"/>
    ${[0, 33, 66].map((dx) => `<rect x="${SX + 6 + dx}" y="${ESTEIRA_Y + 2}" width="8" height="7" fill="url(#fMadeira)"/>`).join('')}
    <rect x="${SX + 4}" y="${ESTEIRA_Y + 9}" width="76" height="3" fill="url(#fMadeira)"/>`;
  const filme = `<path d="M${SX + 8} ${ESTEIRA_Y - 59}H${SX + 76}V${ESTEIRA_Y - 2}H${SX + 8}Z" fill="url(#fFilme)"/>
    <path d="M${SX + 8} ${ESTEIRA_Y - 40}L${SX + 76} ${ESTEIRA_Y - 52}M${SX + 8} ${ESTEIRA_Y - 18}L${SX + 76} ${ESTEIRA_Y - 30}" stroke="#fff" stroke-opacity=".18"/>`;

  // ---------- crachá ----------
  const rb = rng(99);
  let barras = '', bx = 62;
  while (bx < 198) { const w = rb() < 0.5 ? 1 : rb() < 0.7 ? 2 : 3; barras += `<rect x="${bx}" y="352" width="${w}" height="14" fill="${TINTA.txt}"/>`; bx += w + 1 + Math.floor(rb() * 2); }

  // ---------- painel de LED ----------
  const mostradores = [
    { rot: 'PRODUÇÃO', val: fmt(d.producao), sub: 'últimos 365 dias' },
    { rot: 'RITMO', val: dec(d.ritmo), sub: 'caixas por dia' },
    { rot: 'HORA EXTRA', val: `+${fmt(d.horaExtra)}`, sub: 'últimos 7 dias' },
    { rot: 'SEM PARAR', val: `${d.semParar}d`, sub: `recorde: ${d.recorde}d` },
    { rot: 'EXPEDIENTE', val: fmt(d.expediente), sub: 'dias trabalhados' },
    { rot: 'FILIAIS', val: fmt(d.filiais), sub: 'projetos no ano' },
  ];
  const mw2 = (W - 80 - 5 * 10) / 6;
  const painel = mostradores.map((m, i) => {
    const x = 40 + i * (mw2 + 10), y = 400;
    return `<g class="in" style="animation-delay:${0.6 + i * 0.07}s">
      <rect x="${x}" y="${y}" width="${mw2}" height="68" rx="7" fill="url(#fMetal)" stroke="${t.metal3}" filter="url(#fSombra)"/>
      <rect x="${x + 4}" y="${y + 4}" width="${mw2 - 8}" height="60" rx="4" fill="${LED.fundo}"/>
      ${rebites(x, y, mw2, 68, 2.2, '#000', 0.5)}
      <text x="${x + 12}" y="${y + 19}" class="ledrot">${m.rot}</text>
      <text x="${x + 12}" y="${y + 45}" class="led" fill="${LED.apagado}">${esc(m.val.replace(/[0-9]/g, '8'))}</text>
      <text x="${x + 12}" y="${y + 45}" class="led" fill="${LED.aceso}" filter="url(#fBrilho)">${esc(m.val)}</text>
      <text x="${x + 12}" y="${y + 58}" class="ledsub">${esc(m.sub)}</text>
      <path d="M${x + 4} ${y + 4}h${f1(mw2 * 0.55)}l-26 60h-${f1(mw2 * 0.55 - 26)}Z" fill="#fff" opacity=".035"/>
    </g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Zeeenrique Industries: ${esc(d.PERFIL.nome)}, turno ${d.turno}, ${fmt(d.producao)} commits no último ano">
<style>
  .titulo{font:800 18px ${SANS};fill:${t.txt};letter-spacing:2.5px}
  .sub{font:12px ${SANS};fill:${t.sub}}
  .sec{font:700 10px ${MONO};fill:${t.sub};letter-spacing:1.6px}
  .maq{font:700 11px ${MONO};fill:#e8eaed}
  .ledm{font:700 15px ${MONO}}
  .est{font:800 20px ${SANS};fill:#f1f1f1}
  .estsub{font:10px ${SANS};fill:#9aa2ae}
  .estrot{font:700 9px ${MONO};fill:#9aa2ae;letter-spacing:1.6px}
  .cn{font:800 17px ${SANS};fill:${TINTA.txt}}
  .cc{font:12px ${SANS};fill:${TINTA.sub}}
  .cr{font:700 9px ${MONO};fill:${TINTA.sub};letter-spacing:1.2px}
  .led{font:700 22px ${MONO}}
  .ledrot{font:700 9px ${MONO};fill:${LED.rot};letter-spacing:1.4px}
  .ledsub{font:10px ${SANS};fill:${LED.rot}}
  .chao{font:600 12px ${SANS};fill:${t.chao}}
  .in{animation:in .5s ease-out backwards}
  .gira{transform-box:fill-box;transform-origin:center;animation:gira 4s linear infinite}
  .vapor{opacity:0;transform-box:fill-box;transform-origin:center;animation:vapor 3.6s ease-out infinite}
  .caixa{animation:caixa ${DUR}s linear infinite}
  .anda{animation:anda .6s linear infinite}
  .enche{transform-box:fill-box;transform-origin:left;animation:enche 1s cubic-bezier(.2,.8,.2,1) backwards}
  .pisca{animation:pisca 1.6s steps(1) infinite}
  @keyframes in{from{opacity:0;transform:translateY(6px)}}
  @keyframes gira{to{transform:rotate(360deg)}}
  @keyframes vapor{0%{opacity:0;transform:translate(0,0) scale(.5)}15%{opacity:.5}100%{opacity:0;transform:translate(22px,-26px) scale(2.4)}}
  @keyframes caixa{0%{opacity:0;transform:translateX(0)}6%{opacity:1}92%{opacity:1}100%{opacity:0;transform:translateX(var(--d))}}
  @keyframes anda{to{stroke-dashoffset:-12}}
  @keyframes enche{from{transform:scaleX(0)}}
  @keyframes pisca{50%{opacity:.25}}
  @media (prefers-reduced-motion:reduce){.in,.gira,.caixa,.anda,.enche,.pisca{animation:none}.vapor{display:none}}
</style>
<defs>
  <clipPath id="fBorda"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  <clipPath id="fGalpao"><rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="12"/></clipPath>
  <clipPath id="fFoto"><rect x="80" y="114" width="100" height="100" rx="6"/></clipPath>
  <pattern id="fZebra" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="16" fill="${t.faixa}"/><rect x="8" width="8" height="16" fill="${t.faixa2}"/></pattern>
  <pattern id="fOndulado" width="12" height="10" patternUnits="userSpaceOnUse"><rect width="6" height="10" fill="#fff" opacity=".045"/><rect x="6" width="1" height="10" fill="#000" opacity=".22"/><rect x="11" width="1" height="10" fill="#fff" opacity=".05"/></pattern>
  ${grad('fParede', [[0, t.parede1], [1, t.parede2]])}
  ${grad('fPiso', [[0, t.piso1], [1, t.piso2]])}
  ${grad('fMetal', [[0, t.metal1], [0.45, t.metal2], [1, t.metal3]])}
  ${grad('fCano', [[0, t.metal3], [0.35, t.metal1], [1, t.metal3]], { x2: 1, y2: 0 })}
  ${gradR('fRolo', [[0, t.metal1], [1, t.metal3]], { cx: 0.35, cy: 0.35, r: 0.7 })}
  ${grad('fPapelao', [[0, '#d9ad72'], [1, '#a77640']])}
  ${grad('fMadeira', [[0, '#c29462'], [1, '#7e5a33']])}
  ${grad('fFilme', [[0, '#fff', 0.22], [0.5, '#fff', 0.06], [1, '#fff', 0.16]], { x2: 1, y2: 1 })}
  ${grad('fCone', [[0, t.luz, t.luzA], [1, t.luz, 0]])}
  ${gradR('fPoca', [[0, t.luz, t.luzA * 0.9], [1, t.luz, 0]])}
  ${grad('fVidro', [[0, '#fff', 0.28], [0.5, '#fff', 0.04], [1, '#fff', 0]], { x2: 1, y2: 1 })}
  ${grad('fBrilhoCracha', [[0, '#fff', 0.55], [0.4, '#fff', 0], [1, '#fff', 0]], { x2: 1, y2: 1 })}
  ${grad('fFita', [[0, '#c4510a'], [0.5, t.laranja], [1, '#c4510a']], { x2: 1, y2: 0 })}
  ${filtroRuido('fRuido', 0.9, 0.2)}
  ${filtroBlur('fNevoa', 2.2)}
  ${filtroBlur('fSombraSuave', 2.5)}
  ${filtroBrilho('fBrilho', 1.5)}
  ${filtroSombra('fSombra', 3, 3, 0.5)}
</defs>
<g clip-path="url(#fBorda)">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <rect width="${W}" height="10" fill="url(#fZebra)"/>
  <rect y="${H - 10}" width="${W}" height="10" fill="url(#fZebra)"/>
  <rect width="${W}" height="10" fill="#000" opacity=".15" filter="url(#fRuido)"/>
  <rect y="${H - 10}" width="${W}" height="10" fill="#000" opacity=".15" filter="url(#fRuido)"/>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${t.borda}"/>

<g class="gira" style="animation-duration:6s">${engrenagem(54, 43, 13, 9, t.faixa, t.bg, `stroke="#000" stroke-opacity=".25"`)}</g>
<text x="76" y="49" class="titulo">ZEEENRIQUE INDUSTRIES</text>
<circle cx="${W - 252}" cy="39" r="4.5" fill="${t.ok}" class="pisca"/>
<text x="${W - 242}" y="43" class="sec" style="fill:${t.ok}">FÁBRICA OPERANDO</text>
<text x="${W - 40}" y="43" class="sub" text-anchor="end">${d.dataHoje}</text>

<!-- galpão -->
<g clip-path="url(#fGalpao)">
  <rect x="${FX}" y="${FY}" width="${FW}" height="${PISO_Y - FY}" fill="url(#fParede)"/>
  <rect x="${FX}" y="${FY}" width="${FW}" height="${PISO_Y - FY}" fill="url(#fOndulado)"/>
  <rect x="${FX}" y="${PISO_Y}" width="${FW}" height="${FY + FH - PISO_Y}" fill="url(#fPiso)"/>
  <rect x="${FX}" y="${PISO_Y}" width="${FW}" height="${FY + FH - PISO_Y}" fill="#000" filter="url(#fRuido)" opacity="${t.ruidoPiso}"/>
  <rect x="${FX}" y="${PISO_Y - 6}" width="${FW}" height="6" fill="#000" opacity=".25"/>
  <ellipse cx="640" cy="352" rx="34" ry="5" fill="#000" opacity=".18"/>
  <rect x="${FX}" y="${FY + FH - 14}" width="${FW}" height="4" fill="${t.faixa}" opacity=".75"/>
  ${trelica}
  ${lampadas}
  ${maquinas}
  ${pernas}
  <ellipse cx="${(LX + fimEsteira) / 2}" cy="${ESTEIRA_Y + 58}" rx="${(fimEsteira - LX) / 2}" ry="5" fill="#000" opacity=".3" filter="url(#fSombraSuave)"/>
  ${rolos}
  <rect x="${LX}" y="${ESTEIRA_Y}" width="${fimEsteira - LX}" height="5" rx="2" fill="#18191b"/>
  <line x1="${LX + 3}" y1="${ESTEIRA_Y + 2.5}" x2="${fimEsteira - 3}" y2="${ESTEIRA_Y + 2.5}" stroke="#3a3c40" stroke-width="2" stroke-dasharray="3 9" class="anda"/>
  <rect x="${LX}" y="${ESTEIRA_Y + 5}" width="${fimEsteira - LX}" height="6" fill="url(#fMetal)"/>
  <rect x="${LX}" y="${ESTEIRA_Y + 23}" width="${fimEsteira - LX}" height="4" fill="url(#fMetal)"/>
  ${caixas}
  <ellipse cx="${SX + 42}" cy="${ESTEIRA_Y + 13}" rx="44" ry="4" fill="#000" opacity=".35" filter="url(#fSombraSuave)"/>
  ${palete}${pilha}${filme}
  <rect x="${SX - 6}" y="100" width="96" height="62" rx="4" fill="${t.placa}" stroke="${t.metal3}" filter="url(#fSombra)"/>
  ${rebites(SX - 6, 100, 96, 62, 4, '#fff', 0.3)}
  <text x="${SX + 42}" y="118" class="estrot" text-anchor="middle">ESTOQUE</text>
  <text x="${SX + 42}" y="141" class="est" text-anchor="middle">${fmt(d.producao)}</text>
  <text x="${SX + 42}" y="155" class="estsub" text-anchor="middle">caixas no ano</text>
  <text x="${LX}" y="334" class="chao">linha de produção = stack dos últimos 365 dias · cada caixa é um commit</text>
  <text x="${LX}" y="351" class="chao">ritmo: ${dec(d.ritmo)} caixas/dia · dias sem commit: <tspan style="fill:${t.txt};font-weight:700">${d.semCommit}</tspan> · promoção em ${d.diasPromocao} dias</text>
</g>
<rect x="${FX + 0.5}" y="${FY + 0.5}" width="${FW - 1}" height="${FH - 1}" rx="12" fill="none" stroke="${t.borda}"/>

<!-- crachá -->
<path d="M118 56h24v26h-24z" fill="url(#fFita)"/>
<path d="M120 56v26M140 56v26" stroke="#fff" stroke-opacity=".45" stroke-dasharray="2 2"/>
<g class="in">
  <rect x="40" y="74" width="180" height="302" rx="12" fill="${t.cracha}" filter="url(#fSombra)"/>
  <path d="M40 86a12 12 0 0 1 12 -12h156a12 12 0 0 1 12 12v18h-180z" fill="${t.laranja}"/>
  <rect x="114" y="80" width="32" height="7" rx="3.5" fill="#000" opacity=".3"/>
  <g transform="translate(-6 0)">${engrenagem(60, 95, 6, 8, '#fff', t.laranja)}</g>
  <text x="66" y="99" style="font:800 9px ${MONO};fill:#fff;letter-spacing:1.3px">ZEEENRIQUE IND.</text>
  <text x="208" y="99" style="font:700 8px ${MONO};fill:#fff;opacity:.8" text-anchor="end">OPERADOR</text>
  <rect x="78" y="112" width="104" height="104" rx="7" fill="#d9d6ce"/>
  <image href="data:image/png;base64,${d.avatarB64}" x="80" y="114" width="100" height="100" clip-path="url(#fFoto)"/>
  <text x="130" y="238" class="cn" text-anchor="middle">${esc(d.PERFIL.nome)}</text>
  <text x="130" y="256" class="cc" text-anchor="middle">${esc(d.PERFIL.cargo)}</text>
  <text x="130" y="272" class="cc" text-anchor="middle">${esc(d.PERFIL.local)}</text>
  <rect x="56" y="282" width="148" height="1" fill="${TINTA.sub}" opacity=".3"/>
  <text x="56" y="298" class="cr">MATRÍCULA</text><text x="204" y="298" class="cr" text-anchor="end">${d.matricula}</text>
  <text x="56" y="314" class="cr">TURNO ${d.turno} → ${d.turno + 1}</text><text x="204" y="314" class="cr" text-anchor="end">${d.diasPromocao}d</text>
  <rect x="56" y="320" width="148" height="6" rx="3" fill="${TINTA.sub}" opacity=".18"/>
  <rect x="56" y="320" width="${f1(148 * d.progresso)}" height="6" rx="3" fill="${t.laranja}" class="enche" style="animation-delay:.5s"/>
  <text x="130" y="343" class="cc" text-anchor="middle" style="font-size:10.5px">intervalo: ${esc(d.PERFIL.intervalo)}</text>
  ${barras}
  <path d="M40 104h180v50L40 230z" fill="url(#fBrilhoCracha)" opacity=".5"/>
  <rect x="40.5" y="74.5" width="179" height="301" rx="11.5" fill="none" stroke="#000" stroke-opacity=".12"/>
</g>
<rect x="122" y="70" width="16" height="13" rx="2" fill="url(#fMetal)" stroke="${t.metal3}"/>
<rect x="126" y="74" width="8" height="3" rx="1.5" fill="#000" opacity=".5"/>

<text x="40" y="391" class="sec">PAINEL DE CONTROLE</text>
${painel}
</svg>`;
}

export function letreiro(t, d) {
  const W = 860, H = 64;
  const msg = `▶ ZEEENRIQUE INDUSTRIES   ·   operador ${d.PERFIL.nome.toUpperCase()} no turno há ${d.turno} anos   ·   ${fmt(d.producao)} caixas produzidas nos últimos 365 dias   ·   dias sem commit: ${d.semCommit} (orgulho da firma)   ·   em produção: CARRETO e XUCRUTZ   ·   finanças do operador: no azul   ·   próxima promoção em ${d.diasPromocao} dias   ·   `;
  const { L, svg } = rolagem(msg, 13.5, 24, 41, 'msg');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Letreiro: ${esc(msg)}">
<style>
  .msg{font:700 22px ${MONO};fill:${LED.aceso}}
  .rola{animation:rola ${(L / 70).toFixed(1)}s linear infinite}
  @keyframes rola{to{transform:translateX(-${L}px)}}
  @media (prefers-reduced-motion:reduce){.rola{animation:none}}
</style>
<defs>
  <clipPath id="lTela"><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="3"/></clipPath>
  <pattern id="lFuros" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#000"/><circle cx="2" cy="2" r="1.8" fill="#fff"/></pattern>
  <pattern id="lApagados" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="${LED.apagado}"/></pattern>
  <mask id="lMatriz"><rect width="${W}" height="${H}" fill="url(#lFuros)"/></mask>
  ${grad('lCaixa', [[0, t.metal1], [0.5, t.metal2], [1, t.metal3]])}
  ${grad('lVidro', [[0, '#fff', 0.1], [0.5, '#fff', 0], [1, '#fff', 0]])}
  ${filtroBrilho('lBrilho', 1.4)}
</defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="url(#lCaixa)" stroke="${t.borda}"/>
<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="4" fill="#000" opacity=".5"/>
<rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="3" fill="${LED.fundo}"/>
<rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="url(#lApagados)"/>
<g clip-path="url(#lTela)"><g mask="url(#lMatriz)" filter="url(#lBrilho)"><g class="rola">${svg}</g></g></g>
<rect x="12" y="12" width="${W - 24}" height="${(H - 24) / 2}" fill="url(#lVidro)"/>
${[5, W - 5].map((x) => [5, H - 5].map((y) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${t.metal3}"/><path d="M${x - 1.4} ${y}h2.8" stroke="${t.metal1}" stroke-width=".8"/>`).join('')).join('')}
</svg>`;
}
