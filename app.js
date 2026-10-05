import { build } from './engine.js';

const GAPS = [0, 1, 3, 7, 14, 30]; // days until next review after a right answer, indexed by box 1-5
const XP_PER_RIGHT = 10;
const MASCOT = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <rect x="30" y="8" width="56" height="70" rx="14" fill="var(--green-light)" transform="rotate(12 58 43)"/>
  <rect x="14" y="20" width="62" height="74" rx="16" fill="var(--green-edge)"/>
  <rect x="14" y="16" width="62" height="72" rx="16" fill="var(--green)"/>
  <circle cx="34" cy="46" r="11" fill="#fff"/><circle cx="58" cy="46" r="11" fill="#fff"/>
  <circle class="pupil" cx="37" cy="48" r="5.5" fill="#3c3c3c"/><circle class="pupil" cx="61" cy="48" r="5.5" fill="#3c3c3c"/>
  <path d="M38 66 q8 7 16 0" stroke="#3c3c3c" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;

const $ = s => document.querySelector(s);
const $in = (s, root) => root.querySelector(s);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const today = (d = new Date()) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return today(d); };

let cards = [];
let progress = load('fc-progress', {});
let stats = load('fc-stats', { xp: 0, streak: 0, last: '' });
let lesson = null; // { queue, total, results, picked, current, start }

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function save() {
  try {
    localStorage.setItem('fc-progress', JSON.stringify(progress));
    localStorage.setItem('fc-stats', JSON.stringify(stats));
  } catch { /* private mode: progress lasts this session only */ }
}

const isDue = c => !progress[c.id] || progress[c.id].due <= today();
const streakNow = () => (stats.last === today() || stats.last === daysAgo(1) ? stats.streak : 0);

function show(id) {
  for (const v of ['home', 'study', 'done', 'recap']) $('#' + v).hidden = v !== id;
  $('#sheet').hidden = true;
  $('#' + id).scrollTop = 0;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ---------- Home: topic select ----------
function showHome() {
  show('home');
  const due = cards.filter(isDue).length;
  $('#streak').textContent = streakNow();
  $('#xp').textContent = stats.xp;
  $('#due').textContent = due;
  $('#summary').textContent = !cards.length ? $('#summary').textContent
    : due ? `${plural(due, 'card')} due today. Pick a topic.` : 'All caught up! Tap a topic to practise anyway.';

  const list = $('#topics');
  list.replaceChildren();
  const topics = [...new Set(cards.map(c => c.topic))].sort();
  for (const t of topics.length > 1 ? ['All', ...topics] : topics) {
    const pool = t === 'All' ? cards : cards.filter(c => c.topic === t);
    const dueHere = pool.filter(isDue).length;
    const b = el('button', 'topic' + (dueHere ? ' has-due' : ''));
    const name = el('span', 'name');
    name.append(el('b', '', t === 'All' ? 'All topics' : t), el('small', '', dueHere ? `${dueHere} due today` : `${plural(pool.length, 'card')} · all caught up`));
    b.append(el('span', 'badge', t === 'All' ? '★' : t[0]), name);
    b.onclick = () => startLesson(t);
    list.append(b);
  }
}

// ---------- Lesson ----------
function shuffled(a) { return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]); }

function startLesson(topic) {
  const pool = topic === 'All' ? cards : cards.filter(c => c.topic === topic);
  const due = pool.filter(isDue);
  const queue = shuffled(due.length ? due : pool);
  lesson = { queue, total: queue.length, results: [], start: Date.now() };
  show('study');
  next();
}

function next() {
  $('#sheet').hidden = true;
  const card = lesson.queue.shift();
  if (!card) return finish();
  lesson.current = { card, ...build(card) };
  lesson.picked = null;
  const doneCount = lesson.results.filter(r => r.right).length;
  $('#progress').style.width = `${(doneCount / (doneCount + lesson.queue.length + 1)) * 100}%`;
  $('#question').textContent = lesson.current.q;
  $('#check').disabled = true;
  $in('.dock', $('#study')).hidden = false;
  const opts = $('#options');
  opts.replaceChildren();
  lesson.current.options.forEach(o => {
    const b = el('button', 'option', o);
    b.onclick = () => {
      for (const x of opts.children) x.classList.remove('picked');
      b.classList.add('picked');
      lesson.picked = o;
      $('#check').disabled = false;
    };
    opts.append(b);
  });
}
function check() {
  const { card, correct, explain, q } = lesson.current;
  const right = lesson.picked === correct;
  for (const b of $('#options').children) {
    b.disabled = true;
    if (b.textContent === correct) b.classList.add('right');
    else if (b.classList.contains('picked')) b.classList.add('wrong');
  }
  lesson.results.push({ q, correct, picked: lesson.picked, explain, right });
  if (!right) lesson.queue.push(card); // see it again this lesson, with new numbers
  grade(card, right);
  if (right && !lesson.queue.length) $('#progress').style.width = '100%';

  $in('.dock', $('#study')).hidden = true;
  $('#sheet').className = right ? 'right' : 'wrong';
  $('#verdict').textContent = right ? pick(['Nicely done!', 'Great!', 'Awesome!', 'You got it!']) : 'Incorrect';
  $('#solution').textContent = right ? '' : `Correct answer: ${correct}`;
  $('#explain').textContent = explain;
  $('#next').textContent = right ? 'Continue' : 'Got it';
  $('#sheet').hidden = false;
  $('#next').focus();
}
const pick = a => a[Math.floor(Math.random() * a.length)];

function grade(card, right) {
  const box = right ? Math.min((progress[card.id]?.box || 0) + 1, 5) : 1;
  const due = new Date();
  if (right) due.setDate(due.getDate() + GAPS[box]); // wrong = due again today
  progress[card.id] = { box, due: today(due) };
  save();
}

function finish() {
  const { results, start } = lesson;
  const rightCount = results.filter(r => r.right).length;
  const acc = Math.round((rightCount / results.length) * 100);
  const secs = Math.round((Date.now() - start) / 1000);
  const xp = rightCount * XP_PER_RIGHT;
  stats.xp += xp;
  if (stats.last !== today()) stats.streak = stats.last === daysAgo(1) ? stats.streak + 1 : 1;
  stats.last = today();
  save();

  $('#tXp').textContent = `⚡ ${xp}`;
  $('#tAccLabel').textContent = acc === 100 ? 'Amazing' : acc >= 80 ? 'Great' : 'Good';
  $('#tAcc').textContent = `🎯 ${acc}%`;
  $('#tTimeLabel').textContent = secs / results.length < 15 ? 'Speedy' : 'Time';
  $('#tTime').textContent = `⏱ ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  show('done');
}

function showRecap() {
  const fill = (root, items, cls) => {
    root.replaceChildren();
    if (!items.length) root.append(el('p', 'empty', cls === 'miss' ? 'No mistakes. 🎉' : 'None yet. Keep going!'));
    for (const r of items) {
      const c = el('div', `recap-card ${cls}`);
      c.append(el('p', 'rq', r.q), el('p', 'ra', `✓ ${r.correct}`));
      if (cls === 'miss') c.append(el('p', 'rp', `You picked: ${r.picked}`));
      if (r.explain) c.append(el('p', 're', r.explain));
      root.append(c);
    }
  };
  fill($('#mistakes'), lesson.results.filter(r => !r.right), 'miss');
  fill($('#rights'), lesson.results.filter(r => r.right), 'hit');
  show('recap');
}

// ---------- Wiring ----------
for (const m of document.querySelectorAll('.mascot')) m.innerHTML = MASCOT;
$('#check').onclick = check;
$('#next').onclick = next;
$('#back').onclick = showHome;
$('#toRecap').onclick = showRecap;
$('#recapBack').onclick = () => show('done');
$('#claim').onclick = showHome;
$('#recapDone').onclick = showHome;

$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ progress, stats })], { type: 'application/json' }));
  a.download = `flashcards-backup-${today()}.json`;
  a.click();
};
$('#import').onclick = () => $('#importFile').click();
$('#importFile').onchange = async e => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    if (data.progress) { progress = data.progress; stats = data.stats || stats; } else progress = data; // old backups were progress only
    save();
    showHome();
  } catch { alert('That file is not a Flashcards backup.'); }
};

// iOS Safari ignores user-scalable=no, so block pinch zoom directly.
for (const t of ['gesturestart', 'gesturechange']) document.addEventListener(t, e => e.preventDefault());
document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

try {
  cards = (await (await fetch('deck.json', { cache: 'no-cache' })).json()).cards;
} catch {
  $('#summary').textContent = 'Could not load cards. Open the app once with internet.';
}
showHome();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
