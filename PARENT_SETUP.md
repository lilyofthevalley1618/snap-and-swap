# Photo scan setup (for a parent or guardian, 18+)

Snap & Swap can estimate calories from a meal photo. The photo goes to a small server you control (a Cloudflare Worker).
The Worker asks Google Gemini what foods are in the photo, then looks up nutrition in the USDA database.
The API keys are stored only as secrets on the Worker. They are never in the app's code or on GitHub.

**Cost: $0** on the free tiers below. None of these steps needs a credit card.

## 1. Google AI Studio key (Gemini)
1. Go to https://aistudio.google.com and sign in with **your** Google account.
2. Click **Get API key → Create API key**. Copy it somewhere safe.
- Free tier, no card needed. Limits are per model: Flash-Lite was reported at about 500 requests/day, Flash at about 20/day (Sept 2026). AI Studio's "Rate limits" page shows your real numbers.
- **Privacy:** on the free tier, Google may use the photos and prompts to improve its products, and humans may review them.
  Ask your teen not to scan photos that show faces or personal details.

## 2. USDA FoodData Central key
1. Go to https://fdc.nal.usda.gov/api-key-signup and sign up (free, instant, emailed to you).
- Limit: 1,000 requests per hour per key.

## 3. Cloudflare account
1. Sign up at https://dash.cloudflare.com/sign-up. The Free plan is fine.
- Workers Free plan: 100,000 requests per day.

## 4. Deploy the Worker (one time, on a computer with Node.js)
```bash
cd snap-and-swap/worker
npx wrangler login                        # opens a browser to approve
npx wrangler secret put GEMINI_API_KEY    # paste the key from step 1
npx wrangler secret put USDA_API_KEY      # paste the key from step 2
npx wrangler deploy
```
`wrangler deploy` prints a URL like `https://snapswap-scan.<your-name>.workers.dev`.

## 5. Give the URL to Appy
Send the Worker URL (not the keys) to Lily or Appy. Appy puts it in `js/ai.js` as `PROXY_URL` and turns on Gemini.
The URL is not a secret.

## Built-in protections
- Only requests from `https://lilyofthevalley1618.github.io` are accepted (CORS).
- Photos over 1.5 MB are rejected. The app shrinks photos to 1024 px first.
- About 20 scans per hour per device/IP (best effort).
- To turn it all off: Cloudflare dashboard → Workers → snapswap-scan → delete. You can also delete the keys in AI Studio or with USDA.

## Model
The Worker uses `gemini-3.5-flash-lite` by default (set `GEMINI_MODEL` in `wrangler.toml`). It has the biggest free daily allowance. `gemini-3.8-flash` may be more accurate but has far fewer free requests.
If Google retires that model, change this one line and run `npx wrangler deploy` again.
