// Shared nutrition helpers (used by the Worker and tools/eval). No secrets here.
const FDC = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const PREFERRED = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];

// Energy: 1008 = Energy (kcal); Foundation foods sometimes only have Atwater energy 2047/2048.
const pick = (ns, ids) => { for (const id of ids) { const n = ns.find(x => x.nutrientId === id && (id !== 1008 || /kcal/i.test(x.unitName || 'kcal'))); if (n && n.value != null) return n.value; } return null; };

export function per100FromFood(food) {
  const ns = food.foodNutrients || [];
  const p = pick(ns, [1003]) ?? 0, f = pick(ns, [1004]) ?? 0, c = pick(ns, [1005]) ?? 0;
  const kcal = pick(ns, [1008, 2047, 2048]) ?? Math.round(4 * p + 4 * c + 9 * f);
  return { kcal: +kcal, p: +p, c: +c, f: +f };
}

const SYN = { donut: 'doughnut', donuts: 'doughnuts', fries: 'french fries', soda: 'soft drink' };
export async function usdaLookup(name, apiKey, fetchImpl = fetch) {
  name = String(name).toLowerCase().split(/\s+/).map(w => SYN[w] || w).join(' ');
  const u = `${FDC}?api_key=${encodeURIComponent(apiKey)}&pageSize=8&query=${encodeURIComponent(name)}&dataType=${PREFERRED.map(encodeURIComponent).join(',')}`;
  let r = await fetchImpl(u);
  if (r.status === 400 || r.status >= 500) { await new Promise(s => setTimeout(s, 800)); r = await fetchImpl(u); } // USDA search is occasionally flaky
  if (!r.ok) throw new Error('USDA ' + r.status);
  const foods = ((await r.json()).foods || []).filter(x => PREFERRED.includes(x.dataType));
  if (!foods.length) return null;
  // Re-rank the top 8: food name should lead the description; skip odd forms (powder, dehydrated...) unless asked for.
  const tok = s => s.toLowerCase().split(/[^a-z]+/).filter(Boolean).map(w => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, ''));
  const q = tok(name), ODD = ['dehydrated', 'powder', 'dried', 'frozen', 'canned', 'baby', 'infant', 'toddler', 'juice', 'mix', 'flour', 'nut', 'walnut', 'chip', 'imitation', 'substitute', 'dry'];
  const score = (x, i) => { const d = tok(x.description); let s = -i * 0.5 - PREFERRED.indexOf(x.dataType) * 0.3;
    if (q.includes(d[0])) s += 3; s += q.filter(w => d.includes(w)).length * 2; s -= ODD.filter(w => d.includes(w) && !q.includes(w)).length * 4;
    if (d.includes('raw') && !q.some(w => /cook|fri|boil|bak|grill|roast/.test(w))) s += 1; return s; };
  const top = foods.slice(0, 8).map((x, i) => [score(x, i), x]).sort((a, b) => b[0] - a[0])[0][1];
  return { fdcId: top.fdcId, description: top.description, dataType: top.dataType, per100: per100FromFood(top) };
}

export const spreadFor = conf => 0.2 + 0.1 * (1 - Math.max(0, Math.min(1, conf ?? 0.5))); // ±20–30%

export function computeItem({ name, portion_desc, grams, confidence }, per100) {
  const k = grams / 100, s = spreadFor(confidence);
  const kcal = per100.kcal * k;
  return { name, portion_desc, grams, confidence, per100,
    kcal: Math.round(kcal), kcalLow: Math.round(kcal * (1 - s)), kcalHigh: Math.round(kcal * (1 + s)),
    p: Math.round(per100.p * k), c: Math.round(per100.c * k), f: Math.round(per100.f * k) };
}

export function totals(items) {
  const s = key => items.reduce((a, i) => a + (i[key] || 0), 0);
  const conf = items.length ? items.reduce((a, i) => a + (i.confidence ?? 0.5), 0) / items.length : 0;
  return { kcal: s('kcal'), kcalLow: s('kcalLow'), kcalHigh: s('kcalHigh'), p: s('p'), c: s('c'), f: s('f'), confidence: +conf.toFixed(2) };
}
