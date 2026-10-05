// Card engine shared by app.js (browser) and check.mjs (node).

const FUNCS = { sqrt: 'Math.sqrt', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', log: 'Math.log10', ln: 'Math.log', abs: 'Math.abs', pi: 'Math.PI' };

// Evaluate a maths expression using only numbers, the card's vars, + - * / ^ ( ) and FUNCS.
export function evalExpr(expr, vals) {
  const tokens = expr.match(/\d*\.?\d+(?:e[+-]?\d+)?|[A-Za-z_]\w*|[-+*/^()]|\S/g) || [];
  const js = tokens.map(t => {
    if (/^[\d.]/.test(t) || /^[-+*/()]$/.test(t)) return t;
    if (t === '^') return '**';
    if (t in vals) return `(${vals[t]})`;
    if (t in FUNCS) return FUNCS[t];
    throw new Error(`"${t}" not allowed in "${expr}"`);
  }).join(' ');
  const n = Function(`"use strict"; return (${js});`)();
  if (typeof n !== 'number' || !isFinite(n)) throw new Error(`"${expr}" gave ${n}`);
  return n;
}

const decimals = x => (String(x).split('.')[1] || '').length;

export function pickVals(vars, rand = Math.random) {
  const vals = {};
  for (const [name, v] of Object.entries(vars)) {
    if (v.choices) { vals[name] = v.choices[Math.floor(rand() * v.choices.length)]; continue; }
    const step = v.step ?? 1;
    const n = Math.floor((v.max - v.min) / step + 1e-9) + 1;
    vals[name] = +(v.min + Math.floor(rand() * n) * step).toFixed(Math.max(decimals(step), decimals(v.min)));
  }
  return vals;
}

export const fill = (text, vals) => (text || '').replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));

const fmt = (n, card) => {
  let dp = card.dp ?? 2;
  if (n !== 0 && Math.abs(n) < 0.5 * 10 ** -dp) dp = decimals(+n.toPrecision(2)); // keep tiny values from showing as 0.0
  const s = Math.abs(n) >= 1e6 || (n !== 0 && Math.abs(n) < 1e-3) ? n.toExponential(card.dp ?? 2) : n.toFixed(dp);
  return card.unit ? `${s} ${card.unit}` : s;
};

const shuffle = (a, rand) => {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Turn a card into one concrete question: { q, options, correct, explain }.
export function build(card, rand = Math.random) {
  if (!card.vars) {
    const options = shuffle([card.answer, ...card.wrong], rand);
    return { q: card.q, options, correct: card.answer, explain: card.explain || '' };
  }
  // Re-roll a few times if random values make a wrong option collide with the answer.
  for (let tries = 0; ; tries++) {
    const vals = pickVals(card.vars, rand);
    const correct = fmt(evalExpr(card.answer, vals), card);
    const wrong = [...new Set(card.wrong.map(w => fmt(evalExpr(w, vals), card)))].filter(w => w !== correct);
    if (wrong.length === card.wrong.length || tries >= 20) {
      return { q: fill(card.q, vals), options: shuffle([correct, ...wrong], rand), correct, explain: fill(card.explain, vals) };
    }
  }
}
