// Food search: offline USDA-derived list first (instant, fuzzy), then online Open Food Facts + USDA FDC.
import {FOODDB} from './fooddb.js?v=1';
import {CONFIG} from './ai.js?v=3';

const SYN={hardboiled:'boiled',softboiled:'boiled',hb:'boiled',fries:'french fries',chips:'chips',pop:'soda',coke:'cola',doughnut:'donut',yoghurt:'yogurt',omelette:'omelet',veggie:'vegetable',veggies:'vegetables',bbq:'barbecue',spag:'spaghetti',mac:'macaroni',pb:'peanut butter',oj:'orange juice'};
const STOP=new Set(['a','an','the','of','and','with','some','my','fresh']);
const stem=w=>w.length>4&&w.endsWith('ies')?w.slice(0,-3)+'y':w.length>3&&/(ch|sh|s|x|z|o)es$/.test(w)?w.slice(0,-2):w.length>3&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
export function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/hard[\s-]*boiled/g,'hardboiled').replace(/soft[\s-]*boiled/g,'softboiled').replace(/[-_/,.()]+/g,' ').replace(/[^a-z0-9&% ]/g,'').split(/\s+/).filter(w=>w&&!STOP.has(w)).map(w=>SYN[w]||w).join(' ').split(' ').map(stem).filter(Boolean)}
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return d[b.length]}
const tokMatch=(q,w)=>w===q?3:w.startsWith(q)&&q.length>=2?1.2:q.length>=4&&lev(q,w)<=(q.length>=7?2:1)?1:0;
const INDEX=FOODDB.map((f,i)=>({i,f,keys:[f.n,...f.a].map(norm)}));
export function localSearch(q,limit=12){
  const qt=norm(q);if(!qt.length)return [];
  const out=[];
  for(const {f,keys} of INDEX){let best=0;
    for(const k of keys){let s=0,ok=true;for(const t of qt){const m=Math.max(0,...k.map(w=>tokMatch(t,w)));if(!m){ok=false;break}s+=m}
      if(ok){s+=k.length===qt.length?0.5:0;s-=k.length*0.1;if(k.join(' ')===qt.join(' '))s+=5;best=Math.max(best,s)}}
    if(best)out.push([best,f])}
  if(!out.length&&qt.length>1)return localSearch(qt.join(''),limit);
  return out.sort((a,b)=>b[0]-a[0]).slice(0,limit).map(([,f])=>fromLocal(f));
}
export const fromLocal=f=>({key:'l:'+f.id,src:'USDA',name:f.n,detail:f.u,per100:{kcal:f.k,p:f.p,c:f.c,f:f.f},servings:f.s.map(([l,g])=>({label:l,g}))});

// ---- online (debounced + cached) ----
const cache=new Map(), CKEY='snapswap.searchcache';
try{for(const [k,v] of JSON.parse(localStorage.getItem(CKEY)||'[]'))cache.set(k,v)}catch{}
const saveCache=()=>{try{localStorage.setItem(CKEY,JSON.stringify([...cache].slice(-60)))}catch{}};
const DEMO_KEY='DEMO_KEY'; // public, rate-limited USDA key (not a secret); used only until the worker proxy exists
async function usdaOnline(q){
  if(CONFIG.PROXY_URL){const r=await fetch(CONFIG.PROXY_URL+'/foods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q})});if(!r.ok)throw 0;return (await r.json()).foods||[]}
  const u=`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${DEMO_KEY}&pageSize=8&dataType=Foundation,SR%20Legacy,Survey%20%28FNDDS%29&query=${encodeURIComponent(q)}`;
  const r=await fetch(u);if(!r.ok)throw 0;
  return ((await r.json()).foods||[]).map(usdaToResult);
}
const num=(ns,ids)=>{for(const id of ids){const n=ns.find(x=>x.nutrientId===id);if(n&&n.value!=null)return +n.value}return null};
export function usdaToResult(f){const ns=f.foodNutrients||[],p=num(ns,[1003])||0,c=num(ns,[1005])||0,fa=num(ns,[1004])||0;
  const kcal=num(ns,[1008,2047,2048])??Math.round(4*p+4*c+9*fa);
  const sv=(f.foodMeasures||[]).filter(m=>m.gramWeight&&m.disseminationText&&!/not specified/i.test(m.disseminationText)).slice(0,3).map(m=>({label:m.disseminationText,g:+m.gramWeight}));
  return {key:'u:'+f.fdcId,src:'USDA',name:cap(f.description),detail:f.dataType,per100:{kcal:Math.round(kcal),p:+p.toFixed(1),c:+c.toFixed(1),f:+fa.toFixed(1)},servings:sv}}
async function offOnline(q){
  const u=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,brands,nutriments,serving_quantity,serving_size`;
  const r=await fetch(u);if(!r.ok)throw 0;
  return ((await r.json()).products||[]).filter(p=>p.product_name&&p.nutriments&&p.nutriments['energy-kcal_100g']!=null).map(p=>({key:'o:'+p.code,src:'Open Food Facts',name:p.product_name+(p.brands?` (${p.brands.split(',')[0]})`:''),detail:'Packaged food',
    per100:{kcal:Math.round(+p.nutriments['energy-kcal_100g']),p:+(+p.nutriments.proteins_100g||0).toFixed(1),c:+(+p.nutriments.carbohydrates_100g||0).toFixed(1),f:+(+p.nutriments.fat_100g||0).toFixed(1)},
    servings:p.serving_quantity?[{label:p.serving_size||'1 serving',g:+p.serving_quantity}]:[]}));
}
const cap=s=>s?s[0].toUpperCase()+s.slice(1).toLowerCase():s;
export async function onlineSearch(q){
  const k=norm(q).join(' ');if(k.length<3)return [];
  if(cache.has(k))return cache.get(k);
  const [u,o]=await Promise.allSettled([usdaOnline(q),offOnline(q)]);
  const res=[...(u.value||[]),...(o.value||[])];
  if(u.status==='fulfilled'||o.status==='fulfilled'){cache.set(k,res);saveCache()}
  return res;
}
export function dedupe(list){const seen=new Set();return list.filter(r=>{const k=norm(r.name).join(' ');if(seen.has(k))return false;seen.add(k);return true})}
let timer;export const debounce=(fn,ms=450)=>(...a)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...a),ms)};
