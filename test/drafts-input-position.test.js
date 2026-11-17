import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// KINDS.input() needs a DOM, so this checks the source of its prompt-box position directly.
test('input scene moves the prompt box when a heading is present', async () => {
  const source = await readFile(new URL('../public/drafts.mjs', import.meta.url), 'utf8');
  const match = source.match(/left:100px;top:\$\{o\.h \? (\d+) : (\d+)\}px/);
  assert.ok(match, 'input scene prompt box top ternary not found');
  const [, withHeading, withoutHeading] = match.map(Number);
  assert.notEqual(withHeading, withoutHeading, 'input scene box top must differ with and without a heading');
});
