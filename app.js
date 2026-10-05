import { build } from './engine.js';

const GAPS = [0, 1, 3, 7, 14, 30]; // days until next review after a right answer, indexed by box 1-5
const KEY = 'fc-progress';
const $ = s => document.querySelector(s);
const today = (d = new Date()) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD, local time

let cards = [];
let progress = load();
let queue = [];
let current = null;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* private mode: progress lasts this session only */ }
}

const isDue = c => !progress[c.id] || progress[c.id].due <= today();

function grade(card, right) {
  const box = right ? Math.min((progress[card.id]?.box || 0) + 1, 5) : 1;
  const due = new Date();
  if (right) due.setDate(due.getDate() + GAPS[box]); // wrong = due again today
  progress[card.id] = { box, due: today(due) };
  save();
}

function shuffled(a) { return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]); }

function showHome() {
  $('#study').hidden = true;
  $('#home').hidden = false;
  const topics = {};
  for (const c of cards) {
    const t = (topics[c.topic] ||= { total: 0, due: 0 });
    t.total++;
    if (isDue(c)) t.due++;
  }
  const list = $('#topics');
  list.replaceChildren();
  const add = (name, t, filter) => {
    const b = document.createElement('button');
    b.className = 'topic';
    b.innerHTML = '<span></span><span class="count"></span>';
    b.children[0].textContent = name;
    b.children[1].textContent = t.due ? `${t.due} due` : `${t.total} cards`;
    b.onclick = () => start(filter);
    list.append(b);
  };
  const due = cards.filter(isDue).length;
  add('Everything', { total: cards.length, due }, () => true);
  for (const [name, t] of Object.entries(topics).sort()) add(name, t, c => c.topic === name);
  $('#summary').textContent = due ? `${due} cards due today` : 'All caught up. Tap a topic to practise anyway.';
}

function start(filter) {
  const pool = cards.filter(filter);
  const due = pool.filter(isDue);
  queue = shuffled(due.length ? due : pool);
  $('#home').hidden = true;
  $('#study').hidden = false;
  next();
}

function next() {
  const card = queue.shift();
  if (!card) return showHome();
  current = { card, ...build(card) };
  $('#left').textContent = `${queue.length + 1} left · ${card.topic}`;
  $('#question').textContent = current.q;
  $('#explain').hidden = true;
  $('#next').hidden = true;
  const opts = $('#options');
  opts.replaceChildren();
  for (const o of current.options) {
    const b = document.createElement('button');
    b.className = 'option';
    b.textContent = o;
    b.onclick = () => answer(b, o);
    opts.append(b);
  }
}

function answer(btn, choice) {
  const right = choice === current.correct;
  for (const b of $('#options').children) {
    b.disabled = true;
    if (b.textContent === current.correct) b.classList.add('right');
  }
  if (!right) {
    btn.classList.add('wrong');
    queue.push(current.card); // see it again this session, with new numbers
  }
  grade(current.card, right);
  $('#explain').textContent = (right ? '✓ Correct. ' : '✗ Not quite. ') + current.explain;
  $('#explain').hidden = false;
  $('#next').hidden = false;
  $('#next').focus();
}

$('#next').onclick = next;
$('#back').onclick = showHome;

$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(progress)], { type: 'application/json' }));
  a.download = `flashcards-progress-${today()}.json`;
  a.click();
};
$('#import').onclick = () => $('#importFile').click();
$('#importFile').onchange = async e => {
  try {
    progress = JSON.parse(await e.target.files[0].text());
    save();
    showHome();
  } catch { alert('That file is not a progress backup.'); }
};

try {
  cards = (await (await fetch('deck.json', { cache: 'no-cache' })).json()).cards;
} catch {
  $('#summary').textContent = 'Could not load cards. Open the app once with internet.';
}
showHome();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
