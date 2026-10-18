# SPEC — Snap & Swap v1
## Calorie target
Mifflin-St Jeor BMR × activity (1.2/1.375/1.55/1.725) = TDEE. Pace 0.5 lb/wk = −250 kcal, 1 lb/wk = −500 kcal.
## Safety rules (js/calc.js)
- Floor: never below 1200 kcal (female) / 1500 (male).
- Goal weight below BMI 18.5 is blocked with a kind message stating the healthy minimum.
- Age < 18: deficit capped at 250 kcal, habit focus, "talk to a doctor or parent" note on Home.
- Goal ≥ current weight → no deficit. Goal date uses the actual achievable deficit.
- "Not medical advice" line on Snap and Profile.
## Safe messaging
No "extreme", "burn off", "cheat", or "bad food" language. Swaps add nutrition (fiber, protein, veggies) and are framed as ideas, not rules. Celebrate habits (steps, logging, walks, water); weight trend shown over daily fluctuation.
## Features
Snap (camera/upload → provider → kcal range, macros, confidence, 0.5–2× portion slider, save) with a manual food search fallback (24 foods). Log with edit/delete and rule-based swap cards (swaps table in js/foods.js, later via `ai().suggestSwap`). Weight log with SVG chart, goal line, trend, est. goal date. Manual steps with goal (default 8000) and ring.
## Later
Gemini via Cloudflare Worker proxy (parent sets up, 18+); HealthKit/Health Connect step sources; phone app wrapper.
