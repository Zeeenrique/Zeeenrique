// Utilitários compartilhados pelos desenhos SVG.

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const fmt = (n) => n.toLocaleString('pt-BR');
export const dec = (n) => n.toFixed(1).replace('.', ',');
export const f1 = (n) => n.toFixed(1);
export const MONO = `ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace`;
export const SANS = `-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;

// aleatório determinístico: o mesmo desenho todo dia (só os números mudam)
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// catmull-rom → bézier
export function curva(pts) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

export function arco(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [xa, ya] = p(a0), [xb, yb] = p(a1);
  return `M${f1(xa)} ${f1(ya)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f1(xb)} ${f1(yb)}`;
}

// engrenagem (dentes trapezoidais + furo)
export function engrenagem(cx, cy, r, dentes, cor, furo, extra = '') {
  const ri = r * 0.74, pts = [];
  for (let i = 0; i < dentes; i++) {
    const a = (i / dentes) * Math.PI * 2, d = (Math.PI * 2) / dentes;
    for (const [ang, rad] of [[a, ri], [a + d * 0.15, r], [a + d * 0.45, r], [a + d * 0.6, ri]]) {
      pts.push(`${f1(cx + Math.cos(ang) * rad)},${f1(cy + Math.sin(ang) * rad)}`);
    }
  }
  return `<path d="M${pts.join('L')}Z" fill="${cor}" ${extra}/><circle cx="${cx}" cy="${cy}" r="${f1(r * 0.32)}" fill="${furo}"/>`;
}

// filtro de granulado (textura): aplicar num <rect> por cima, recortado na forma
export const filtroRuido = (id, freq = 0.85, alfa = 0.22, seed = 7) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${alfa * 4} -${alfa * 1.6}"/></filter>`;

export const filtroBlur = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
export const filtroBrilho = (id, sd = 1.6) =>
  `<filter id="${id}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
export const filtroSombra = (id, dy = 3, sd = 3, op = 0.45) =>
  `<filter id="${id}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${sd}" flood-color="#000" flood-opacity="${op}"/></filter>`;

export const grad = (id, stops, { x2 = 0, y2 = 1, x1 = 0, y1 = 0 } = {}) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
export const gradR = (id, stops, { cx = 0.5, cy = 0.5, r = 0.5 } = {}) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;

// texto LED rolando: duas cópias com largura fixa (textLength) pra emendar sem salto
export function rolagem(msg, ch, x, y, classe) {
  const L = [...msg].length * ch;
  const copia = (xx) => `<text x="${xx}" y="${y}" class="${classe}" textLength="${L}" lengthAdjust="spacing">${esc(msg)}</text>`;
  return { L, svg: copia(x) + copia(x + L) };
}
