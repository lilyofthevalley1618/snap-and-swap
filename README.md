# Snap & Swap (working name) — v1, local only
Healthy weight-goal web app for DSH Hacks V2 (AI + healthcare, due Nov 14, 2026). Static HTML/CSS/JS modules, no build step, data in localStorage.
Run: `python3 -m http.server 18780` → http://localhost:18780 (add `?demo=1` for sample data).
Tabs: Home (calories, steps, progress) · Snap (photo estimate + food search) · Log (diary + swaps) · Progress (weight chart, goal) · Profile (goals, target, settings).
Palette: all colors are CSS vars in the single `:root` block of `css/app.css` (Calm Sage).

## AI design (js/ai.js)
Provider interface: `analyzeMeal(blob)` → `{items, kcalLow, kcalHigh, p, c, f, confidence}`, `suggestSwap(name)`.
- `MockProvider` (active): realistic sample results, no network.
- `GeminiProvider` (disabled): POSTs the photo to `CONFIG.PROXY_URL + '/analyze'`. Not enabled — no key exists.
Later, a parent (18+) creates a free Google AI Studio key and a free Cloudflare Worker that holds it as a secret, only accepts requests from the site's origin, and enforces a daily request cap. Then set `CONFIG.provider='gemini'` and `PROXY_URL`. The key never goes in this repo or browser.

## Steps (js/steps.js)
Source interface: `available()`, `getSteps(date)`, optional `setSteps(date,n)`. `ManualStepsSource` now; HealthKit / Health Connect sources plug in for the phone app.

## Disclaimer
Estimates only, not medical advice. Talk to a doctor, dietitian, or parent before changing your diet.
