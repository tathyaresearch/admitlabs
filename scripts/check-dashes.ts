// Fails if an em dash or en dash (or a figure dash or horizontal bar) appears anywhere in
// Drishti's source, templates, sample data or scripts. Brand rule: no dashes in UI, pages or PDF.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { dashName, findDashes } from '../src/domain/copy.ts';
import { ROOT } from './lib/local.ts';

const SCAN = ['src', 'scripts', 'supabase', 'public', 'README.md', '.env', '.env.example', 'package.json'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.temp', '.branches']);
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.sql', '.html', '.md', '.json', '.toml', '.svg', '.mjs', '.txt', '']);

function* files(path: string): Generator<string> {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return;
  }
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (SKIP_DIRS.has(entry)) continue;
      yield* files(join(path, entry));
    }
  } else if (TEXT_EXTENSIONS.has(extname(path))) {
    yield path;
  }
}

let total = 0;
for (const root of SCAN) {
  for (const file of files(join(ROOT, root))) {
    if (file.endsWith('signing_keys.json')) continue;
    const hits = findDashes(readFileSync(file, 'utf8'));
    for (const hit of hits) {
      total += 1;
      console.error(`${relative(ROOT, file)}:${hit.line}:${hit.column}  ${dashName(hit.char)} (U+${hit.char.codePointAt(0)?.toString(16).toUpperCase()})`);
    }
  }
}

if (total > 0) {
  console.error(`\nFound ${total} banned dash${total === 1 ? '' : 'es'}. Use a comma, colon, full stop or "to" instead.`);
  process.exit(1);
}
console.log('No em dashes or en dashes found.');
