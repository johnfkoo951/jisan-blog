import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('SEO audit resolves raw Markdown links as files, not directories', () => {
  const result=spawnSync(process.execPath,['scripts/seo_audit.mjs'],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/FAIL 0/);
});
