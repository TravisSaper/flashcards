# Flashcards

A personal revision PWA. Live at https://travissaper.github.io/flashcards/. On iPhone, open it in Safari, then Share → Add to Home Screen.

## Adding cards (for Claude)
Append to `cards` in `deck.json`, run `node check.mjs`, commit, push. The app picks up new cards next time it opens online.

**Plain card**
```json
{ "id": "phys-unit-force", "topic": "Physics", "q": "What is the unit of force?",
  "answer": "newton (N)", "wrong": ["joule (J)", "watt (W)", "pascal (Pa)"] }
```

**Changing-numbers card**: `vars` get new random values every time the card is shown.
```json
{ "id": "phys-weight-mass", "topic": "Physics",
  "q": "An object weighs {W} N on Earth. Find its mass. (g = 9.8 N/kg)",
  "vars": { "W": { "min": 50, "max": 500, "step": 10 } },
  "answer": "W / 9.8", "unit": "kg", "dp": 1,
  "wrong": ["W * 9.8", "W / 9.8 * 2", "W"],
  "explain": "W = mg, so m = W / g = {W} / 9.8" }
```
- `vars`: `{min, max, step}` (step defaults to 1) or `{choices: [..]}`.
- `answer` and `wrong` are formulas that use the vars, `+ - * / ^ ( )`, and `sqrt sin cos tan log ln abs pi`.
- `{X}` in `q` / `explain` is replaced with the value. `dp` is decimal places (default 2). `unit` is appended to every option.
- Make the `wrong` formulas the mistakes students actually make (wrong rearrangement, forgot to square, used the wrong constant).
- `id` must be unique; `topic` groups cards on the home screen.
