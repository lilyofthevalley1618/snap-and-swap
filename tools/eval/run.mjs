// Usage: node tools/eval/run.mjs            -> USDA math check only (uses the public DEMO_KEY)
//        GEMINI_API_KEY=... USDA_API_KEY=... node tools/eval/run.mjs --vision   -> also runs Gemini on each photo
// Keys only come from environment variables. Never paste them into files.
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';
import {usdaLookup} from '../../worker/nutrition.js';
const dir=path.dirname(fileURLToPath(import.meta.url)), {photos}=JSON.parse(fs.readFileSync(path.join(dir,'photos.json')));
const USDA=process.env.USDA_API_KEY||'DEMO_KEY', vision=process.argv.includes('--vision');
fs.mkdirSync(path.join(dir,'photos'),{recursive:true});
for(const ph of photos){const f=path.join(dir,'photos',ph.file);
  if(!fs.existsSync(f)){const r=await fetch('https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(ph.file)+'?width=1024',{headers:{'User-Agent':'SnapSwapEval/1.0 (student project)'}});if(r.ok)fs.writeFileSync(f,Buffer.from(await r.arrayBuffer()));else console.log('download failed',ph.file,r.status)}}
console.log('USDA math check (reference grams -> kcal vs reference kcal):');
const rows=[];
for(const ph of photos){if(!ph.ref_grams||ph.branded)continue;
  await new Promise(r=>setTimeout(r,1500));const m=await usdaLookup(ph.food,USDA).catch(e=>({err:e.message}));if(!m||m.err){console.log(' ',ph.food,m?m.err:'no USDA match');continue}
  const kcal=Math.round(m.per100.kcal*ph.ref_grams/100),err=Math.round((kcal-ph.ref_kcal)/ph.ref_kcal*100);rows.push(Math.abs(err));
  console.log(`  ${ph.food.padEnd(16)} ${String(ph.ref_grams).padStart(4)}g  USDA "${m.description}" -> ${kcal} kcal (ref ${ph.ref_kcal}, ${err>=0?'+':''}${err}%)`)}
if(rows.length)console.log(`  mean abs error ${Math.round(rows.reduce((a,b)=>a+b,0)/rows.length)}% over ${rows.length} foods (this checks the lookup math only)`);
if(!vision||!process.env.GEMINI_API_KEY){console.log('\nVision accuracy: NOT TESTED (no GEMINI_API_KEY). Run with --vision once an adult has set up the key.');process.exit(0)}
const worker=(await import('../../worker/worker.js')).default;
for(const ph of photos){const b64=fs.readFileSync(path.join(dir,'photos',ph.file)).toString('base64');
  const req=new Request('http://eval/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://eval'},body:JSON.stringify({image:b64,mime:'image/jpeg'})});
  const res=await (await worker.fetch(req,{...process.env,ALLOWED_ORIGINS:'http://eval'})).json();
  console.log(`  ${ph.food.padEnd(16)} -> ${(res.items||[]).map(i=>`${i.name} ${i.grams}g`).join(', ')} = ${res.kcal??'?'} kcal${ph.ref_kcal&&!ph.ambiguous?` (ref ${ph.ref_kcal})`:' (no ref)'}`)}
