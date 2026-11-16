// Busca os dados no GitHub, gera os SVGs da fábrica e do letreiro e atualiza o livro de ponto no README.
// Uso: GH_TOKEN=... node scripts/gerar.mjs
// Nunca escreve nome de repositório: repos privados entram só como números agregados.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fabrica, letreiro, TEMAS_FABRICA } from './fabrica.mjs';

const LOGIN = 'Zeeenrique';
const CARREIRA_INICIO = '2018-06-01'; // base do "turno" (anos de carreira)
const PERFIL = {
  nome: 'Luiz Henrique',
  cargo: 'Operador Full Stack',
  local: 'Chapecó/SC',
  intervalo: 'jogos idle · finanças',
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
const filiais = recentes.length;

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
  .map((d) => ({ date: d.date, n: Math.max(d.contributionCount, porData.get(d.date) || 0) }));
const producao = dias.reduce((a, d) => a + d.n, 0);
const expediente = dias.filter((d) => d.n > 0).length;
const ritmo = producao / dias.length;
const horaExtra = dias.slice(-7).reduce((a, d) => a + d.n, 0);

let recorde = 0, corrida = 0;
for (const d of dias) {
  corrida = d.n > 0 ? corrida + 1 : 0;
  recorde = Math.max(recorde, corrida);
}
let semParar = 0;
for (let i = dias.length - 1; i >= 0; i--) {
  if (dias[i].n > 0) semParar++;
  else if (i === dias.length - 1) continue; // hoje ainda sem commit não quebra
  else break;
}
let semCommit = 0;
for (let i = dias.length - 1; i >= 0 && dias[i].n === 0; i--) semCommit++;

// máquinas (stack): peso = seus commits no repo × fatia da linguagem no repo
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
  .slice(0, 4);

// turno = anos completos de carreira; barra = progresso até o próximo aniversário
const inicio = new Date(CARREIRA_INICIO);
let turno = hoje.getFullYear() - inicio.getFullYear();
const aniv = new Date(inicio); aniv.setFullYear(inicio.getFullYear() + turno);
if (aniv > hoje) { turno--; aniv.setFullYear(aniv.getFullYear() - 1); }
const prox = new Date(aniv); prox.setFullYear(aniv.getFullYear() + 1);
const progresso = (hoje - aniv) / (prox - aniv);
const diasPromocao = Math.ceil((prox - hoje) / 864e5);
const matricula = `${String(inicio.getMonth() + 1).padStart(2, '0')}/${inicio.getFullYear()}`;

const avatarB64 = Buffer.from(await (await fetch(user.avatarUrl)).arrayBuffer()).toString('base64');

// ---------- SVG ----------
const dados = {
  PERFIL, turno, progresso, diasPromocao, matricula, avatarB64, producao, ritmo, horaExtra, expediente,
  semParar, recorde, semCommit, filiais, stack,
  dataHoje: hoje.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
};

await mkdir('assets', { recursive: true });
for (const nome of ['escuro', 'claro']) {
  await writeFile(`assets/fabrica-${nome}.svg`, fabrica(TEMAS_FABRICA[nome], dados));
  await writeFile(`assets/letreiro-${nome}.svg`, letreiro(TEMAS_FABRICA[nome], dados));
}

// ---------- livro de ponto ----------
const ponto = JSON.parse(await readFile('data/ponto.json', 'utf8').catch(() => '[]'));
const pontoMd = ponto.length
  ? ponto.slice(-60).reverse()
      .map((l) => `<a href="https://github.com/${l}"><img src="https://github.com/${l}.png?size=64" width="40" height="40" alt="@${l}" title="@${l}"/></a>`)
      .join(' ')
  : '<sub>ninguém bateu o ponto ainda. o primeiro ganha a vaga de funcionário do mês 👀</sub>';

let readme = await readFile('README.md', 'utf8');
readme = readme.replace(/<!-- PONTO:INICIO -->[\s\S]*?<!-- PONTO:FIM -->/, `<!-- PONTO:INICIO -->\n${pontoMd}\n<!-- PONTO:FIM -->`);
await writeFile('README.md', readme);

console.log({ turno, producao, ritmo: ritmo.toFixed(2), horaExtra, expediente, semParar, recorde, semCommit, filiais, stack: stack.map((s) => `${s.nome} ${s.pct.toFixed(1)}%`), ponto: ponto.length });
