#!/usr/bin/env node
// Export the shared engine to vault-blog-starter. Copies only the files listed in ENGINE.
// Site identity (site.config.mjs), content/, brand assets, README, package.json and vercel.json belong to each repo
// and are never touched. Run from this repo:
//   node scripts/export-starter.mjs [../vault-blog-starter]          write changed engine files
//   node scripts/export-starter.mjs [../vault-blog-starter] --check  report drift only (exit 1 if any)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const TARGET = resolve(args.find((a) => !a.startsWith('--')) || join(ROOT, '..', 'vault-blog-starter'));

// Engine files and folders. A folder entry copies every file under it.
const ENGINE = [
  'build.mjs', 'lib/', 'api/engagement.js',
  'scripts/diagrams.mjs', 'scripts/prepare-citation.mjs', 'scripts/seo_audit.mjs',
  'assets/reader.css', 'assets/reader.js', 'assets/search.js', 'assets/diagram.css', 'assets/vendor/cmds-pele/', 'assets/fonts/OFL.txt',
  'tests/build.test.mjs', 'tests/citations.test.mjs', 'tests/diagrams.test.mjs', 'tests/engagement.test.mjs',
  'tests/image-captions.test.mjs', 'tests/reader-metadata.test.mjs', 'tests/seo-links.test.mjs',
  'tests/diagram-reader-browser.cjs', 'tests/fixtures/',
];

// Browser storage keys in reader.js are not read from site.config.mjs. Rename them for the starter.
// Each rule must match exactly `count` times, so a changed source fails loudly instead of exporting half-renamed code.
const TRANSFORMS = {
  'assets/reader.js': [
    { from: 'jisan-reader-', to: 'blog-reader-', count: 2 },
    { from: 'jisan-reading-size', to: 'blog-reading-size', count: 3 },
  ],
};

const files = (rel) => {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) throw new Error(`engine file missing: ${rel}`);
  if (!rel.endsWith('/')) return [rel];
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (name === '.DS_Store') continue;
      if (statSync(p).isDirectory()) walk(p); else out.push(relative(ROOT, p));
    }
  };
  walk(abs);
  return out;
};

const transform = (rel, buf) => {
  const rules = TRANSFORMS[rel];
  if (!rules) return buf;
  let text = buf.toString('utf8');
  for (const { from, to, count } of rules) {
    const n = text.split(from).length - 1;
    if (n !== count) throw new Error(`${rel}: expected ${count} × '${from}', found ${n}. Update TRANSFORMS.`);
    text = text.split(from).join(to);
  }
  return Buffer.from(text, 'utf8');
};

if (!existsSync(TARGET)) { console.error(`✖ target not found: ${TARGET}`); process.exit(1); }
const changed = [];
for (const rel of ENGINE.flatMap(files)) {
  const want = transform(rel, readFileSync(join(ROOT, rel)));
  const dest = join(TARGET, rel);
  const have = existsSync(dest) ? readFileSync(dest) : null;
  if (have && have.equals(want)) continue;
  changed.push(`${have ? 'update' : 'add   '} ${rel}`);
  if (!CHECK) { mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, want); }
}
// Files left in the starter's engine folders that no longer exist here are reported, not deleted.
const orphans = ENGINE.filter((e) => e.endsWith('/')).flatMap((dir) => {
  const abs = join(TARGET, dir);
  if (!existsSync(abs)) return [];
  const mine = new Set(files(dir));
  const out = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else { const r = relative(TARGET, p); if (!mine.has(r) && n !== '.DS_Store') out.push(r); } } };
  walk(abs);
  return out;
});
for (const line of changed) console.log(line);
for (const o of orphans) console.log(`orphan ${o} (not in jisan-blog; delete by hand if obsolete)`);
console.log(`${CHECK ? 'check' : 'export'}: ${changed.length} engine file(s) ${CHECK ? 'differ' : 'written'} → ${TARGET}`);
if (CHECK && (changed.length || orphans.length)) process.exit(1);
