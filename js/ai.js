// AI provider interface. Every provider implements:
//   analyzeMeal(imageBlob) -> {items:[{name,portion_desc,grams,confidence,per100:{kcal,p,c,f}|null}], provider}
//   suggestSwap(mealName)  -> {to,why,saves}|null
// No keys live here. Gemini + USDA keys are secrets on the Cloudflare Worker (see PARENT_SETUP.md).
import {swapFor} from './foods.js?v=2';

export const CONFIG={provider:'mock',PROXY_URL:''}; // set PROXY_URL to the deployed worker URL to turn on real scans

const SAMPLES=[[['Cheeseburger',1],['French fries',117]],[['Toast, white',0],['Egg, scrambled',100]],[['Pizza, pepperoni',0],['Caesar salad',150]],[['Bubble tea',0]]];
async function sample(i){
  const {FOODDB}=await import('./fooddb.js?v=1');
  return SAMPLES[i].map(([n,g])=>{const f=FOODDB.find(x=>x.n===n);if(!f)return null;const s=f.s[0]||['100 g',100];
    return {name:f.n,portion_desc:g>1?`${g} g`:s[0],grams:g>1?g:s[1],confidence:0.7,per100:{kcal:f.k,p:f.p,c:f.c,f:f.f},servings:f.s.map(([l,g])=>({label:l,g}))}}).filter(Boolean);
}
export const MockProvider={
  name:'mock',
  async analyzeMeal(blob){await new Promise(r=>setTimeout(r,500));
    const i=blob&&blob.size?blob.size%SAMPLES.length:0;return {items:await sample(i),provider:'mock'}},
  async suggestSwap(n,prefs){return swapFor(n,prefs)}
};
// shrink to <=1024px JPEG so uploads stay small (worker rejects >1.5 MB)
export async function toJpegBase64(blob,max=1024){
  const img=await createImageBitmap(blob),k=Math.min(1,max/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',0.82).split(',')[1];
}
export const GeminiProvider={
  name:'gemini',
  async analyzeMeal(blob){
    if(!CONFIG.PROXY_URL)throw new Error('Photo scanning is not set up yet.');
    const r=await fetch(CONFIG.PROXY_URL+'/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:await toJpegBase64(blob),mime:'image/jpeg'})});
    if(r.status===429)throw new Error('Too many scans this hour. Try again later or search instead.');
    if(!r.ok)throw new Error('The scan didn\'t work ('+r.status+').');
    return {items:(await r.json()).items||[],provider:'gemini'};
  },
  async suggestSwap(n,prefs){return swapFor(n,prefs)}
};
export const ai=()=>CONFIG.provider==='gemini'&&CONFIG.PROXY_URL?GeminiProvider:MockProvider;
