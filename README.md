# Flashcards

A personal revision PWA. Live at https://travissaper.github.io/flashcards/. On iPhone, open it in Safari, then Share → Add to Home Screen.

## Adding cards (for Claude)
Append to `cards` in `deck.json`, run `node check.mjs`, commit, push. The app picks up new cards next time it opens online.

**Plain card**
```json
{ "id": "chem-avogadro", "topic": "Chemistry", "q": "What is the Avogadro constant?",
  "answer": "6.02 × 10²³ per mole", "wrong": ["3.00 × 10⁸ per mole", "9.81 per mole", "1.60 × 10⁻¹⁹ per mole"] }
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
