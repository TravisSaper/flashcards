// Run: node check.mjs [deck.json] — fails if any card is broken.
import { readFileSync } from 'node:fs';
import { build, evalExpr } from './engine.js';

const file = process.argv[2] || new URL('./deck.json', import.meta.url);
const { cards } = JSON.parse(readFileSync(file, 'utf8'));
const errors = [];
const ids = new Set();

assert(evalExpr('0.5 * m * v^2', { m: 2, v: 3 }) === 9, 'evalExpr maths');
assert(throws(() => evalExpr('alert(1)', {})), 'evalExpr rejects unknown names');

for (const c of cards) {
  const where = c.id || JSON.stringify(c).slice(0, 40);
  if (!c.id || !c.topic || !c.q || c.answer == null || !Array.isArray(c.wrong) || !c.wrong.length) { errors.push(`${where}: needs id, topic, q, answer, wrong[]`); continue; }
  if (ids.has(c.id)) errors.push(`${where}: duplicate id`);
  ids.add(c.id);
  try {
    for (let i = 0; i < 50; i++) {
      const b = build(c);
      if (b.options.length !== c.wrong.length + 1) throw new Error(`a wrong option equals the answer or another option (${b.options.join(' | ')})`);
      if (/\{\w+\}/.test(b.q)) throw new Error(`unfilled placeholder in "${b.q}"`);
    }
  } catch (e) { errors.push(`${where}: ${e.message}`); }
}

function assert(ok, msg) { if (!ok) errors.push(`self-test: ${msg}`); }
function throws(f) { try { f(); return false; } catch { return true; } }

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`ok: ${cards.length} cards`);
