// Snap & Swap photo-scan proxy (Cloudflare Worker).
// Secrets (set with `wrangler secret put`, never in code): GEMINI_API_KEY, USDA_API_KEY.
import { usdaLookup, computeItem, totals, per100FromFood } from './nutrition.js';

const MAX_BYTES = 1_500_000;          // ~1.5 MB request body (client sends ~1024px JPEG)
const RATE = { max: 20, windowMs: 60 * 60 * 1000 }; // 20 scans / hour / IP (best-effort, per isolate)
const hits = new Map();

const SCHEMA = { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT',
  properties: { name: { type: 'STRING' }, portion_desc: { type: 'STRING' }, est_grams: { type: 'NUMBER' }, confidence: { type: 'NUMBER' } },
  required: ['name', 'portion_desc', 'est_grams', 'confidence'] } } }, required: ['items'] };
const PROMPT = 'Identify each distinct food or drink in this photo. For each, give a short generic food name suitable for a USDA FoodData Central search (e.g. "banana raw", "fried egg", "white rice cooked"), a short portion description, your best estimate of its weight in grams, and confidence 0-1. Ignore plates, cutlery and packaging. If there is no food, return an empty list.';

function cors(env, req) {
  const allowed = (env.ALLOWED_ORIGINS || 'https://lilyofthevalley1618.github.io').split(',').map(s => s.trim());
  const o = req.headers.get('Origin') || '';
  return { 'Access-Control-Allow-Origin': allowed.includes(o) ? o : allowed[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const json = (body, status, h) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...h } });

function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  if (arr.length >= RATE.max) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr); return false;
}

async function gemini(env, b64, mime) {
  const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.2 } }) });
  if (!r.ok) throw new Error('Gemini ' + r.status);
  const text = (await r.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '{"items":[]}';
  return (JSON.parse(text).items || []).slice(0, 8);
}

async function enrich(env, raw) {
  const items = await Promise.all(raw.map(async it => {
    const grams = Math.max(1, Math.min(2000, +it.est_grams || 100));
    const m = await usdaLookup(it.name, env.USDA_API_KEY).catch(() => null);
    if (!m) return { name: it.name, portion_desc: it.portion_desc, grams, confidence: it.confidence, per100: null, unmatched: true };
    return { ...computeItem({ name: it.name, portion_desc: it.portion_desc, grams, confidence: it.confidence }, m.per100), usda: { fdcId: m.fdcId, description: m.description, dataType: m.dataType } };
  }));
  return { items, ...totals(items.filter(i => !i.unmatched)) };
}

// USDA text search for the app's food search box (keeps the USDA key off the client)
async function foods(env, q) {
  const u = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${env.USDA_API_KEY}&pageSize=8&dataType=Foundation,SR%20Legacy,Survey%20%28FNDDS%29&query=${encodeURIComponent(q)}`;
  const r = await fetch(u); if (!r.ok) throw new Error('usda ' + r.status);
  return ((await r.json()).foods || []).map(f => ({ key: 'u:' + f.fdcId, src: 'USDA', name: f.description, detail: f.dataType, per100: per100FromFood(f),
    servings: (f.foodMeasures || []).filter(m => m.gramWeight && m.disseminationText).slice(0, 3).map(m => ({ label: m.disseminationText, g: +m.gramWeight })) }));
}

export default {
  async fetch(req, env) {
    const h = cors(env, req), url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, h);
    const origin = req.headers.get('Origin');
    if (origin && h['Access-Control-Allow-Origin'] !== origin) return json({ error: 'origin not allowed' }, 403, h);
    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    if (limited(ip)) return json({ error: 'Too many scans, try again later.' }, 429, h);
    if (+(req.headers.get('Content-Length') || 0) > MAX_BYTES) return json({ error: 'Image too large' }, 413, h);
    const text = await req.text();
    if (text.length > MAX_BYTES) return json({ error: 'Image too large' }, 413, h);
    let body; try { body = JSON.parse(text); } catch { return json({ error: 'Bad JSON' }, 400, h); }
    try {
      if (url.pathname === '/foods') {
        const q = String(body.q || '').slice(0, 80).trim(); if (q.length < 2) return json({ foods: [] }, 200, h);
        return json({ foods: await foods(env, q) }, 200, h);
      }
      if (url.pathname === '/analyze') {
        if (!body.image || !/^image\/(jpeg|png|webp)$/.test(body.mime || '')) return json({ error: 'Send {image: base64, mime}' }, 400, h);
        return json(await enrich(env, await gemini(env, body.image, body.mime)), 200, h);
      }
      if (url.pathname === '/lookup') { // for client add/rename of an item
        const m = await usdaLookup(String(body.name || '').slice(0, 80), env.USDA_API_KEY);
        return json(m || { error: 'not found' }, m ? 200 : 404, h);
      }
      return json({ error: 'not found' }, 404, h);
    } catch (e) { return json({ error: 'Analysis failed' }, 502, h); }
  }
};
