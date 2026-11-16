// Adiciona um login ao placar. Só aceita login válido do GitHub; nada de texto livre.
import { readFile, writeFile } from 'node:fs/promises';

const login = process.env.LOGIN || '';
if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login) || login.endsWith('[bot]')) {
  console.log('login ignorado'); process.exit(0);
}
const placar = JSON.parse(await readFile('data/placar.json', 'utf8').catch(() => '[]'));
const sem = placar.filter((l) => l.toLowerCase() !== login.toLowerCase());
sem.push(login);
await writeFile('data/placar.json', JSON.stringify(sem.slice(-200), null, 2) + '\n');
console.log(`placar: ${login} (${sem.length})`);
