// AI provider interface. Every provider implements:
//   analyzeMeal(imageBlob) -> {items:[{name,kcalLow,kcalHigh,p,c,f}], kcalLow,kcalHigh,p,c,f, confidence(0-1), provider}
//   suggestSwap(mealName)  -> {to,why,saves}|null
import {FOODS,swapFor} from './foods.js?v=2';

export const CONFIG={provider:'mock',PROXY_URL:''}; // Gemini disabled: no key, no proxy yet (see README)

const SAMPLES=[['Cheeseburger','French fries (medium)'],['Chicken teriyaki bowl'],['Avocado toast','Scrambled eggs (2)'],['Pepperoni pizza slice','Caesar salad'],['Boba milk tea']];
function build(names,conf){
  const items=names.map(n=>{const f=FOODS.find(x=>x.name===n);return {name:n,kcalLow:Math.round(f.kcal*.85),kcalHigh:Math.round(f.kcal*1.15),p:f.p,c:f.c,f:f.f}});
  const sum=k=>items.reduce((a,i)=>a+i[k],0);
  return {items,kcalLow:sum('kcalLow'),kcalHigh:sum('kcalHigh'),p:sum('p'),c:sum('c'),f:sum('f'),confidence:conf};
}
export const MockProvider={
  name:'mock',
  async analyzeMeal(blob){await new Promise(r=>setTimeout(r,600));
    const i=blob&&blob.size?blob.size%SAMPLES.length:0; return {...build(SAMPLES[i],0.72),provider:'mock'}},
  async suggestSwap(n,prefs){return swapFor(n,prefs)}
};
export const GeminiProvider={
  name:'gemini',
  async analyzeMeal(blob){
    if(!CONFIG.PROXY_URL)throw new Error('Gemini is not set up yet (no proxy).');
    const fd=new FormData();fd.append('image',blob);
    const r=await fetch(CONFIG.PROXY_URL+'/analyze',{method:'POST',body:fd});
    if(!r.ok)throw new Error('Analysis failed ('+r.status+')');
    return {...(await r.json()),provider:'gemini'}; // proxy returns the same shape as MockProvider
  },
  async suggestSwap(n,prefs){return swapFor(n,prefs)} // later: POST PROXY_URL/swap
};
export const ai=()=>CONFIG.provider==='gemini'&&CONFIG.PROXY_URL?GeminiProvider:MockProvider;
