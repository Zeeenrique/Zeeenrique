// Gera o cartão "Zeeenrique Idle" (SVG claro/escuro), o terminal animado e atualiza o mural no README.
// Uso: GH_TOKEN=... node scripts/gerar.mjs
// Nunca escreve nome de repositório: repos privados entram só como números agregados.

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const LOGIN = 'Zeeenrique';
const CARREIRA_INICIO = '2018-06-01'; // base do "prestígio" (anos de carreira)
const PERFIL = {
  nome: 'Luiz Henrique',
  titulo: 'Dev Full Stack',
  local: 'Chapecó/SC',
  bonus: ['Jogos idle', 'Finanças'],
};

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error('Defina GH_TOKEN');

async function gql(query, variables) {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const hoje = new Date();
const umAnoAtras = new Date(hoje.getTime() - 365 * 864e5);

const { user: { id: userId } } = await gql(`query($l:String!){ user(login:$l){ id } }`, { l: LOGIN });

const { user } = await gql(
  `query($login:String!,$from:DateTime!,$to:DateTime!,$uid:ID!,$since:GitTimestamp!){
    user(login:$login){
      avatarUrl(size:240)
      contributionsCollection(from:$from,to:$to){
        contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
      }
      repositories(first:100,ownerAffiliations:[OWNER,COLLABORATOR,ORGANIZATION_MEMBER],isFork:false,orderBy:{field:PUSHED_AT,direction:DESC}){
        nodes{
          owner{ login } name
          languages(first:8,orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name color } } }
          defaultBranchRef{ target{ ... on Commit{ history(since:$since,author:{id:$uid}){ totalCount } } } }
        }
      }
    }
  }`,
  { login: LOGIN, from: umAnoAtras.toISOString(), to: hoje.toISOString(), uid: userId, since: umAnoAtras.toISOString() },
);

const recentes = user.repositories.nodes
  .map((r) => ({ ...r, commits: r.defaultBranchRef?.target?.history?.totalCount || 0 }))
  .filter((r) => r.commits > 0);
const projetos = recentes.length;

// O calendário do perfil não conta commits em repos privados/de org, então
// montamos os dias a partir do histórico real de commits e ficamos com o maior dos dois.
const diaBR = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const porData = new Map();
for (const r of recentes) {
  let after = null;
  do {
    const { repository } = await gql(
      `query($o:String!,$n:String!,$uid:ID!,$since:GitTimestamp!,$after:String){
        repository(owner:$o,name:$n){ defaultBranchRef{ target{ ... on Commit{
          history(first:100,after:$after,since:$since,author:{id:$uid}){ pageInfo{ hasNextPage endCursor } nodes{ committedDate } }
        } } } }
      }`,
      { o: r.owner.login, n: r.name, uid: userId, since: umAnoAtras.toISOString(), after },
    );
    const h = repository.defaultBranchRef.target.history;
    for (const c of h.nodes) porData.set(diaBR(c.committedDate), (porData.get(diaBR(c.committedDate)) || 0) + 1);
    after = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
  } while (after);
}

// ---------- números ----------
const cal = user.contributionsCollection.contributionCalendar;
const dias = cal.weeks.flatMap((w) => w.contributionDays)
  .map((d) => ({ date: d.date, contributionCount: Math.max(d.contributionCount, porData.get(d.date) || 0) }));
const total = dias.reduce((a, d) => a + d.contributionCount, 0);
const ativos = dias.filter((d) => d.contributionCount > 0).length;
const porDia = total / dias.length;
const offline = dias.slice(-7).reduce((a, d) => a + d.contributionCount, 0);

let recorde = 0, corrida = 0;
for (const d of dias) {
  corrida = d.contributionCount > 0 ? corrida + 1 : 0;
  recorde = Math.max(recorde, corrida);
}
let combo = 0;
for (let i = dias.length - 1; i >= 0; i--) {
  if (dias[i].contributionCount > 0) combo++;
  else if (i === dias.length - 1) continue; // hoje ainda sem commit não quebra
  else break;
}

// upgrades (stack): peso = seus commits no repo × fatia da linguagem no repo
const IGNORA = new Set(['HTML', 'CSS', 'SCSS', 'Dockerfile', 'Shell', 'PowerShell', 'Batchfile', 'Makefile']);
const peso = new Map();
for (const { languages, commits } of recentes) {
  const edges = languages.edges.filter((e) => !IGNORA.has(e.node.name));
  const totalSize = edges.reduce((a, e) => a + e.size, 0);
  if (!totalSize) continue;
  for (const { size, node } of edges) {
    const p = peso.get(node.name) || { v: 0, cor: node.color || '#888' };
    p.v += commits * (size / totalSize);
    peso.set(node.name, p);
  }
}
const somaPeso = [...peso.values()].reduce((a, b) => a + b.v, 0) || 1;
const stack = [...peso.entries()]
  .map(([nome, { v, cor }]) => ({ nome, cor, pct: (v / somaPeso) * 100 }))
  .sort((a, b) => b.pct - a.pct)
  .filter((l) => l.pct >= 1)
  .slice(0, 5);

// prestígio = anos completos de carreira; barra = progresso até o próximo aniversário
const inicio = new Date(CARREIRA_INICIO);
let prestigio = hoje.getFullYear() - inicio.getFullYear();
const aniv = new Date(inicio); aniv.setFullYear(inicio.getFullYear() + prestigio);
if (aniv > hoje) { prestigio--; aniv.setFullYear(aniv.getFullYear() - 1); }
const prox = new Date(aniv); prox.setFullYear(aniv.getFullYear() + 1);
const progresso = (hoje - aniv) / (prox - aniv);
const diasPrestigio = Math.ceil((prox - hoje) / 864e5);

const avatarB64 = Buffer.from(await (await fetch(user.avatarUrl)).arrayBuffer()).toString('base64');

// ---------- SVG ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n) => n.toLocaleString('pt-BR');
const dataHoje = hoje.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

const TEMAS = {
  escuro: { bg: '#0f1115', card: '#171a21', borda: '#2b303b', txt: '#e8ecf3', sub: '#8e96a5', ac: '#3ddc97', ac2: '#ffcf4a', trilho: '#232834' },
  claro: { bg: '#ffffff', card: '#f5f7fa', borda: '#d5dbe3', txt: '#1d2330', sub: '#5b6474', ac: '#0f9d63', ac2: '#b7860b', trilho: '#e6eaf0' },
};
const MONO = `ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace`;
const SANS = `-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`;

function cartao(t) {
  const W = 860, H = 440;
  const RX = 330, RW = 490; // coluna direita

  // partículas "+1 <linguagem>" subindo do avatar, em loop, como cliques de jogo idle
  const nomes = stack.length ? stack.map((l) => l.nome) : ['commit'];
  const particulas = Array.from({ length: 6 }, (_, i) => {
    const x = 182 + [0, 22, 8, 30, 4, 16][i];
    const y = [160, 132, 104, 150, 122, 94][i];
    return `<text x="${x}" y="${y}" class="pop" style="animation-delay:${(i * 0.55).toFixed(2)}s">+1 ${esc(nomes[i % nomes.length])}</text>`;
  }).join('');

  const upgrades = stack.map((l, i) => {
    const y = 152 + i * 34, w = Math.max(4, (l.pct / stack[0].pct) * 250);
    const nv = Math.max(1, Math.round(l.pct));
    return `<g class="in" style="animation-delay:${0.4 + i * 0.08}s">
      <rect x="${RX}" y="${y}" width="22" height="22" rx="5" fill="${l.cor}"/>
      <text x="${RX + 11}" y="${y + 15}" text-anchor="middle" style="font:800 11px ${SANS};fill:#fff">${esc(l.nome[0])}</text>
      <text x="${RX + 32}" y="${y + 15}" class="lang">${esc(l.nome)}</text>
      <rect x="${RX + 150}" y="${y + 6}" width="250" height="10" rx="5" fill="${t.trilho}"/>
      <rect x="${RX + 150}" y="${y + 6}" width="${w.toFixed(1)}" height="10" rx="5" fill="${l.cor}" class="barra" style="animation-delay:${0.5 + i * 0.08}s"/>
      <text x="${RX + RW}" y="${y + 15}" class="nv" text-anchor="end">Nv ${nv}</text>
    </g>`;
  }).join('');

  const conquistas = [
    { rot: 'COMBO', val: `${combo}d`, sub: 'dias seguidos' },
    { rot: 'RECORDE', val: `${recorde}d`, sub: 'maior combo' },
    { rot: 'DIAS ATIVOS', val: fmt(ativos), sub: 'no último ano' },
    { rot: 'MAPAS', val: fmt(projetos), sub: 'projetos mexidos' },
  ].map((c, i) => {
    const bw = (RW - 30) / 4, x = RX + i * (bw + 10), y = 354;
    return `<g class="in" style="animation-delay:${0.8 + i * 0.08}s">
      <rect x="${x}" y="${y}" width="${bw}" height="62" rx="10" fill="${t.card}" stroke="${t.borda}"/>
      <text x="${x + 12}" y="${y + 19}" class="rot">${c.rot}</text>
      <text x="${x + 12}" y="${y + 43}" class="val">${esc(c.val)}</text>
      <text x="${x + 12}" y="${y + 56}" class="mini">${esc(c.sub)}</text>
    </g>`;
  }).join('');

  let cx = 40;
  const chips = PERFIL.bonus.map((b) => {
    const w = b.length * 6.8 + 24;
    const g = `<rect x="${cx}" y="392" width="${w}" height="24" rx="12" fill="none" stroke="${t.ac2}"/>
      <text x="${cx + w / 2}" y="408" class="chip" text-anchor="middle">${esc(b)}</text>`;
    cx += w + 8;
    return g;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Zeeenrique Idle: ${esc(PERFIL.nome)}, prestígio ${prestigio}, ${fmt(total)} contribuições no último ano">
<style>
  .rot{font:700 10px ${MONO};fill:${t.sub};letter-spacing:1.2px}
  .val{font:700 20px ${SANS};fill:${t.txt}}
  .mini{font:10px ${SANS};fill:${t.sub}}
  .sub{font:12px ${SANS};fill:${t.sub}}
  .lang{font:600 12px ${MONO};fill:${t.txt}}
  .nv{font:700 12px ${MONO};fill:${t.ac}}
  .chip{font:600 12px ${SANS};fill:${t.ac2}}
  .nome{font:800 24px ${SANS};fill:${t.txt}}
  .tit{font:14px ${SANS};fill:${t.sub}}
  .sec{font:700 11px ${MONO};fill:${t.ac};letter-spacing:2px}
  .big{font:800 40px ${SANS};fill:${t.txt}}
  .rate{font:700 14px ${MONO};fill:${t.ac}}
  .pop{font:700 11px ${MONO};fill:${t.ac2};opacity:0;animation:pop 3.3s ease-out infinite}
  .anel{transform-box:fill-box;transform-origin:center;animation:anel 2.2s ease-out infinite}
  .in{animation:in .5s ease-out backwards}
  .barra{transform-box:fill-box;transform-origin:left;animation:enche .9s cubic-bezier(.2,.8,.2,1) backwards}
  .prog{transform-box:fill-box;transform-origin:left;animation:enche 1.4s .3s cubic-bezier(.2,.8,.2,1) backwards}
  .pulso{animation:pulso 2.4s ease-in-out infinite}
  @keyframes in{from{opacity:0;transform:translateY(6px)}}
  @keyframes enche{from{transform:scaleX(0)}}
  @keyframes pulso{50%{opacity:.35}}
  @keyframes pop{0%{opacity:0;transform:translateY(0)}10%{opacity:1}60%{opacity:0;transform:translateY(-34px)}100%{opacity:0}}
  @keyframes anel{from{opacity:.7;transform:scale(1)}to{opacity:0;transform:scale(1.25)}}
  @media (prefers-reduced-motion:reduce){.in,.barra,.prog,.pulso,.anel{animation:none}.pop{display:none}}
</style>
<defs><clipPath id="av"><circle cx="102" cy="118" r="56"/></clipPath></defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.bg}" stroke="${t.borda}"/>

<text x="40" y="30" class="sec">ZEEENRIQUE IDLE</text>
<circle cx="102" cy="118" r="62" fill="none" stroke="${t.ac}" stroke-width="2" class="anel"/>
<circle cx="102" cy="118" r="62" fill="none" stroke="${t.ac}" stroke-width="3"/>
<image href="data:image/png;base64,${avatarB64}" x="46" y="62" width="112" height="112" clip-path="url(#av)"/>
${particulas}

<text x="40" y="214" class="nome">${esc(PERFIL.nome)}</text>
<text x="40" y="236" class="tit">${esc(PERFIL.titulo)}</text>
<text x="40" y="256" class="tit">${esc(PERFIL.local)}</text>

<text x="40" y="290" class="rot">PRESTÍGIO ${prestigio} → ${prestigio + 1}</text>
<text x="290" y="290" class="sub" text-anchor="end">faltam ${diasPrestigio} dias</text>
<rect x="40" y="298" width="250" height="10" rx="5" fill="${t.trilho}"/>
<rect x="40" y="298" width="${(250 * progresso).toFixed(1)}" height="10" rx="5" fill="${t.ac2}" class="prog"/>

<text x="40" y="338" class="rot">GANHOS OFFLINE</text>
<text x="40" y="362" class="rate">+${fmt(offline)} contribuições</text>
<text x="40" y="380" class="mini">nos últimos 7 dias enquanto você não olhava</text>
${chips}

<text x="${RX}" y="30" class="sec">CONTRIBUIÇÕES · 365 DIAS</text>
<g class="in" style="animation-delay:.15s">
  <rect x="${RX}" y="42" width="${RW}" height="76" rx="12" fill="${t.card}" stroke="${t.borda}"/>
  <text x="${RX + 18}" y="96" class="big">${fmt(total)}</text>
  <text x="${RX + RW - 18}" y="76" class="rate" text-anchor="end">+${porDia.toFixed(1).replace('.', ',')}/dia</text>
  <text x="${RX + RW - 18}" y="96" class="sub" text-anchor="end">produção automática</text>
</g>

<text x="${RX}" y="142" class="sec">UPGRADES · STACK</text>
${upgrades}

<text x="${RX}" y="344" class="sec">CONQUISTAS</text>
${conquistas}

<circle cx="${W - 46}" cy="26" r="4" fill="${t.ac}" class="pulso"/>
<text x="${W - 56}" y="30" class="sub" text-anchor="end">jogo salvo em ${dataHoje}</text>
</svg>`;
}

function terminal(t) {
  const linhas = [
    ['$ whoami', `${PERFIL.nome.toLowerCase()} — dev full stack @ ${PERFIL.local.toLowerCase()}`],
    ['$ uptime', `codando há ${prestigio} anos, load average: café, deploy, café`],
    ['$ ls ~/quests', 'carreto/  xucrutz/   # privados, por enquanto'],
    ['$ cat ~/financas/saldo.txt', 'positivo. sim, tem planilha pra isso.'],
    ['$ git log --since="1 year" | wc -l', `${fmt(total)}  # idle não é parado`],
  ];
  const W = 860, H = 54 + linhas.length * 44;
  let delay = 0.3;
  const corpo = linhas.map(([cmd, out], i) => {
    const y = 58 + i * 44;
    const dCmd = delay, dur = cmd.length * 0.045;
    delay += dur + 0.35;
    const dOut = delay;
    delay += 0.25;
    return `<g>
      <clipPath id="c${i}"><rect x="24" y="${y - 14}" height="20" width="${cmd.length * 8.4 + 4}" class="digita" style="animation-delay:${dCmd.toFixed(2)}s;animation-duration:${dur.toFixed(2)}s;animation-timing-function:steps(${cmd.length})"/></clipPath>
      <text x="24" y="${y}" class="cmd" clip-path="url(#c${i})">${esc(cmd)}</text>
      <text x="24" y="${y + 20}" class="out aparece" style="animation-delay:${dOut.toFixed(2)}s">${esc(out)}</text>
    </g>`;
  }).join('');
  const yCursor = 58 + linhas.length * 44;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 20}" viewBox="0 0 ${W} ${H + 20}" role="img" aria-label="Terminal: ${esc(linhas.map((l) => l[1]).join('; '))}">
<style>
  .cmd{font:600 14px ${MONO};fill:${t.ac}}
  .out{font:14px ${MONO};fill:${t.txt}}
  .digita{transform-box:fill-box;transform-origin:left;animation-name:enche;animation-fill-mode:backwards}
  .aparece{animation:aparece .2s backwards}
  .cursor{animation:pisca 1s steps(1) infinite}
  @keyframes enche{from{transform:scaleX(0)}}
  @keyframes aparece{from{opacity:0}}
  @keyframes pisca{50%{opacity:0}}
  @media (prefers-reduced-motion:reduce){.digita,.aparece,.cursor{animation:none}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H + 19}" rx="12" fill="${t.card}" stroke="${t.borda}"/>
<circle cx="24" cy="20" r="6" fill="#ff5f57"/><circle cx="44" cy="20" r="6" fill="#febc2e"/><circle cx="64" cy="20" r="6" fill="#28c840"/>
<text x="${W / 2}" y="24" text-anchor="middle" style="font:12px ${MONO};fill:${t.sub}">zeeenrique@chapeco: ~</text>
${corpo}
<text x="24" y="${yCursor}" class="cmd">$ <tspan class="cursor">▋</tspan></text>
</svg>`;
}

await mkdir('assets', { recursive: true });
for (const [nome, t] of Object.entries(TEMAS)) {
  await writeFile(`assets/idle-${nome}.svg`, cartao(t));
  await writeFile(`assets/terminal-${nome}.svg`, terminal(t));
}

// ---------- placar ----------
const placar = JSON.parse(await readFile('data/placar.json', 'utf8').catch(() => '[]'));
const placarMd = placar.length
  ? placar.slice(-60).reverse()
      .map((l) => `<a href="https://github.com/${l}"><img src="https://github.com/${l}.png?size=64" width="40" height="40" alt="@${l}" title="@${l}"/></a>`)
      .join(' ')
  : '<sub>placar vazio. o primeiro jogador ganha a conquista secreta 👀</sub>';

let readme = await readFile('README.md', 'utf8');
readme = readme.replace(/<!-- PLACAR:INICIO -->[\s\S]*?<!-- PLACAR:FIM -->/, `<!-- PLACAR:INICIO -->\n${placarMd}\n<!-- PLACAR:FIM -->`);
await writeFile('README.md', readme);

console.log({ prestigio, total, porDia: porDia.toFixed(2), offline, ativos, combo, recorde, projetos, stack: stack.map((s) => `${s.nome} ${s.pct.toFixed(1)}%`), placar: placar.length });
