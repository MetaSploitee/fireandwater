import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.join(repositoryRoot, 'fireandwater-vercel-2026-11-26');
process.chdir(gameRoot);
await import(pathToFileURL(path.join(gameRoot, 'server.js')).href);
