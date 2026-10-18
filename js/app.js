import {load,save,today} from './store.js?v=3';
import {plan,validate,goalDate,minHealthyWeight} from './calc.js?v=2';
import {ai} from './ai.js?v=2';
import {FOODS,swapFor} from './foods.js?v=2';
import {ManualStepsSource} from './steps.js?v=2';
import {runSurvey,WORKOUT_OPTS} from './survey.js?v=3';

const S=load(); const persist=()=>save(S); const steps=new ManualStepsSource(S,save);
const $=s=>document.querySelector(s), V=$('#view');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DISC='<p class="note">Snap &amp; Swap gives estimates, not medical advice. Talk to a doctor, dietitian or parent before changing how you eat.</p>';
let pending=null; // current snap analysis

if(new URLSearchParams(location.search).has('demo')&&!S.profile){
  S.name='Lily';S.profile={age:16,sex:'female',height:64,weight:150,goal:135,activity:'moderate',pace:0.5};S.workoutTypes=['walk','run','yoga'];
  const d=today();S.meals[d]=[{id:1,name:'Oatmeal + banana',kcal:270,p:7,c:55,f:4,t:'Breakfast'},{id:2,name:'Cheeseburger + French fries (medium)',kcal:900,p:32,c:88,f:46,t:'Lunch'}];
  for(let i=6;i>=0;i--){const x=new Date();x.setDate(x.getDate()-i*5);S.weights.push({d:x.toLocaleDateString('en-CA'),w:150-(6-i)*0.6+(i%2)*0.3})}
  S.steps[d]=5400;S.workouts=[{id:9,d,type:'walk',min:30,kcal:119},{id:8,d:new Date(Date.now()-864e5).toLocaleDateString('en-CA'),type:'dance',min:45,kcal:255},{id:7,d:new Date(Date.now()-3*864e5).toLocaleDateString('en-CA'),type:'yoga',min:20,kcal:57}];persist();
}

const ring=(v,max,label,sz=150)=>{const r=sz/2-12,C=2*Math.PI*r,p=Math.min(1,max?v/max:0);
 return `<svg class="ring" width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}"><circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="var(--sage-faint)" stroke-width="12"/>
 <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="var(--sage-deep)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C*p} ${C}" transform="rotate(-90 ${sz/2} ${sz/2})"/>
 <text x="50%" y="48%" text-anchor="middle" font-size="${sz/6}" font-weight="700" fill="var(--charcoal)">${Math.round(v).toLocaleString()}</text>
 <text x="50%" y="62%" text-anchor="middle" font-size="12" fill="var(--muted)">${label}</text></svg>`};
const meals=()=>S.meals[today()]||(S.meals[today()]=[]);
const tot=()=>meals().reduce((a,m)=>({kcal:a.kcal+m.kcal,p:a.p+m.p,c:a.c+m.c,f:a.f+m.f}),{kcal:0,p:0,c:0,f:0});
const macros=t=>`<div class="macros"><div><b>${Math.round(t.p)}g</b>Protein</div><div><b>${Math.round(t.c)}g</b>Carbs</div><div><b>${Math.round(t.f)}g</b>Fat</div></div>`;

// Log types + moderate Compendium METs. kcal = MET × kg × hours.
const LOG=[
 ['walk','Walking',3.5],['run','Running',9.8],['swim','Swimming',6.0],['cycle','Cycling',6.8],
 ['hike','Hiking',5.3],['yoga','Yoga',2.5],['pilates','Pilates',3.0],['dance','Dance',5.5],
 ['strength','Strength training',5.0],['hiit','HIIT',8.0],['jumprope','Jump rope',8.8],
 ['tennis','Tennis',7.3],['basketball','Basketball',6.5],['soccer','Soccer',7.0],
 ['rowing','Rowing',6.0],['elliptical','Elliptical',5.0],['stairs','Stair climber',9.0],
 ['skate','Skating',7.0],['martial','Martial arts',5.3],['other','Other',5.0],
];
const MET=Object.fromEntries(LOG.map(([k,,m])=>[k,m]));
const logLabel=k=>(LOG.find(([v])=>v===k)||[k,k])[1];
// Survey chips → matching log type keys (preferred first).
const SURVEY_TO_LOG={walk:['walk'],run:['run'],cardio:['cycle','dance','hiit'],gym:['strength'],
 yoga:['yoga','pilates'],swim:['swim'],sports:['tennis','basketball','soccer','skate','martial'],
 home:['strength','hiit','jumprope','dance','other']};
const metOrder=()=>{const seen=new Set(),out=[];
 for(const s of S.workoutTypes||[])for(const k of SURVEY_TO_LOG[s]||[])if(k in MET&&!seen.has(k)){seen.add(k);out.push(k)}
 for(const [k] of LOG)if(!seen.has(k))out.push(k);
 return out};
const exName=w=>w.type==='other'&&w.name?w.name:logLabel(w.type);
const exToday=()=>(S.workouts||[]).filter(w=>w.d===today()).reduce((a,w)=>a+w.min,0);
const views={
 exercise(){const st=S.steps[today()]||0,wk=(S.workouts||[]);
  const days=[...Array(7)].map((_,i)=>{const x=new Date();x.setDate(x.getDate()-6+i);const d=x.toLocaleDateString('en-CA');return {l:x.toLocaleDateString(undefined,{weekday:'narrow'}),m:wk.filter(w=>w.d===d).reduce((a,w)=>a+w.min,0)}});
  const mx=Math.max(30,...days.map(d=>d.m)),tw=wk.filter(w=>w.d===today());
  return `<h2>Exercise</h2><p class="sub">Every bit of movement counts.</p>
  <div class="card"><h3>👟 Steps</h3><div class="row">${ring(st,S.stepGoal,`of ${S.stepGoal.toLocaleString()}`,110)}<div class="grow">
   <label>Steps today</label><input id="st" type="number" inputmode="numeric" value="${st||''}" placeholder="e.g. 6000">
   <button class="btn sm" id="stsave" style="margin-top:8px">Save</button></div></div>
   <p class="sub">${st>=S.stepGoal?'Goal reached — nice work! 🎉':`${(S.stepGoal-st).toLocaleString()} to go. A 10-minute walk is about 1,000.`}</p>
   <p class="note">Steps will count automatically in the phone app.</p></div>
  <div class="card"><h3>🏃 Log a workout</h3><div class="grid2"><select id="ext">${metOrder().map(k=>`<option value="${k}">${logLabel(k)}</option>`).join('')}</select>
   <input id="exm" type="number" inputmode="numeric" placeholder="Minutes"></div>
   <input id="exn" type="text" placeholder="What did you do?" hidden style="margin-top:8px">
   <button class="btn" id="exsave">Add workout</button>
   ${tw.map(w=>`<div class="item"><span>${esc(exName(w))} · ${w.min} min</span><span class="sub">~${w.kcal} kcal <button class="x" data-exdel="${w.id}">✕</button></span></div>`).join('')}</div>
  <div class="card"><h3>This week</h3><svg viewBox="0 0 280 120" width="100%">${days.map((d,i)=>{const h=d.m/mx*70;return `<rect x="${i*40+8}" y="${92-h}" width="24" height="${Math.max(h,2)}" rx="6" fill="var(--sage-deep)"/><text x="${i*40+20}" y="${86-h}" text-anchor="middle" font-size="10" fill="var(--muted)">${d.m||''}</text><text x="${i*40+20}" y="110" text-anchor="middle" font-size="11" fill="var(--charcoal)">${d.l}</text>`}).join('')}</svg>
   <p class="sub">${days.reduce((a,d)=>a+d.m,0)} active minutes this week</p></div>
  <p class="note">Exercise calories are estimates and don't change your daily limit. Move for fun and energy! 💚</p>`},
 home(){const P=plan(S.profile),t=tot(),st=S.steps[today()]||0,lw=S.weights.at(-1);
  return `<h2>Hi, ${esc(S.name||'there')}!</h2><p class="sub">Small steps, every day. You've got this.</p>
  <div class="card limit"><p class="sub">Your daily limit</p><div class="big">${P.target.toLocaleString()} cal <span class="sub">to stay on track</span></div>
  ${ring(t.kcal,P.target,`eaten of ${P.target.toLocaleString()}`)}
  <div class="row between" style="margin:8px 0 12px"><span>Eaten <b>${t.kcal.toLocaleString()}</b></span><span>${t.kcal<=P.target?`<b>${(P.target-t.kcal).toLocaleString()}</b> left`:'<b>A bit over today</b>'}</span></div>
  ${t.kcal>P.target?'<p class="note">A bit over today, tomorrow\'s a fresh start. 🌱</p>':''}${macros(t)}</div>
  <div class="card row between"><div><h3>👟 Steps</h3><span class="sub">${st.toLocaleString()} of ${S.stepGoal.toLocaleString()} · ${exToday()} active min</span></div><button class="btn sm ghost" data-go="exercise">Open</button></div>
  <div class="card row between"><div><h3>📈 Progress</h3><span class="sub">${lw?`${lw.w.toFixed(1)} lb → goal ${S.profile.goal} lb`:'Log your first weigh-in'}</span></div><button class="btn sm ghost" data-go="progress">Open</button></div>
  ${P.teen?'<p class="note warn">Because you\'re under 18, your target stays gentle and focuses on habits. Please talk to a doctor or parent before changing your diet.</p>':''}`},
 snap(){return `<h2>Snap a meal</h2><p class="sub">Take a photo and we'll estimate it.</p>
  <div class="card"><label class="btn" style="text-align:center;line-height:50px">📷 Take or upload photo<input id="ph" type="file" accept="image/*" capture="environment" hidden></label>
  <div id="res"></div></div>
  <div class="card"><h3>🔎 Or search a food</h3><input id="q" placeholder="e.g. rice, pizza, banana"><div id="ql"></div></div>${DISC}`},
 log(){const P=plan(S.profile),t=tot();
  return `<h2>Food log</h2><p class="sub">${t.kcal} of ${P.target} kcal today</p>
  <div class="card">${meals().length?meals().map(m=>{const sw=swapFor(m.name,S.prefs);return `<div class="item"><div class="grow"><b>${esc(m.name)}</b><div class="sub">${m.t||''} · ${m.kcal} kcal · P${m.p} C${m.c} F${m.f}</div>
   ${sw?`<div class="swap">🌿 <b>Try:</b> ${esc(sw.to)} — ${sw.why}, about ${sw.saves} kcal lighter</div>`:''}</div>
   <div><button class="x" data-edit="${m.id}" title="Edit">✏️</button><button class="x" data-del="${m.id}" title="Delete">✕</button></div></div>`}).join(''):'<p class="sub">Nothing logged yet. Snap your first meal!</p>'}</div>
  <p class="note">Swaps are ideas, not rules. Every food fits — swaps just add more fiber, protein and veggies.</p>`},
 progress(){const p=S.profile,P=plan(p),ws=S.weights,lw=ws.at(-1)?.w??p.weight;
  const gd=goalDate(lw,p.goal,P.weekly);let trend='';
  if(ws.length>1){const days=(new Date(ws.at(-1).d)-new Date(ws[0].d))/864e5||1;const r=(ws.at(-1).w-ws[0].w)/days*7;trend=`${r<=0?'↓':'↑'} ${Math.abs(r).toFixed(1)} lb/week`}
  return `<h2>Progress</h2><p class="sub">Goal: ${p.goal} lb${gd?` · est. ${gd.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})} at ${P.weekly.toFixed(1)} lb/wk`:''}</p>
  <div class="card">${chart(ws,p.goal)}<div class="row between sub"><span>Now: <b>${lw.toFixed(1)} lb</b></span><span>Trend: <b>${trend||'—'}</b></span></div></div>
  <div class="card"><h3>⚖️ Today's weight</h3><div class="row"><input id="w" type="number" step="0.1" inputmode="decimal" placeholder="lb"><button class="btn sm" id="wsave">Save</button></div></div>
  <div class="card"><h3>History</h3>${ws.slice().reverse().slice(0,10).map(x=>`<div class="item"><span>${x.d}</span><b>${x.w.toFixed(1)} lb</b></div>`).join('')||'<p class="sub">No weigh-ins yet.</p>'}</div>
  <p class="note">Weight goes up and down day to day. Look at the trend, and celebrate habits like walks, water and veggies.</p>`},
 profile(){const p=S.profile||{age:'',sex:'female',height:'',weight:'',goal:'',activity:'light',pace:0.5};const P=S.profile?plan(p):null;
  const o=(v,l,c)=>`<option value="${v}" ${String(c)==String(v)?'selected':''}>${l}</option>`;
  return `<h2>${S.profile?'Profile':'Welcome 👋'}</h2><p class="sub">${S.profile?'Your goals and settings':'Tell us a little about you to set a healthy daily target.'}</p>
  ${P?`<div class="card"><h3>Daily target</h3><div class="big">${P.target} kcal</div><p class="sub">Maintenance ≈ ${P.tdee} kcal · gentle deficit ${P.deficit} kcal · never below ${P.floor}</p></div>`:''}
  <form class="card" id="pf"><div class="grid2"><div><label>Age</label><input name="age" type="number" value="${p.age}" required></div>
  <div><label>Sex</label><select name="sex">${o('female','Female',p.sex)}${o('male','Male',p.sex)}</select></div>
  <div><label>Height (in)</label><input name="height" type="number" value="${p.height}" required></div>
  <div><label>Weight (lb)</label><input name="weight" type="number" step="0.1" value="${p.weight}" required></div>
  <div><label>Goal weight (lb)</label><input name="goal" type="number" step="0.1" value="${p.goal}" required></div>
  <div><label>Pace</label><select name="pace">${o(0.5,'0.5 lb/week',p.pace)}${o(1,'1 lb/week',p.pace)}</select></div></div>
  <label>Activity</label><select name="activity">${o('sedentary','Mostly sitting',p.activity)}${o('light','Lightly active',p.activity)}${o('moderate','Active most days',p.activity)}${o('active','Very active',p.activity)}</select>
  <label>Daily step goal</label><input name="stepGoal" type="number" value="${S.stepGoal}">
  <label>Workouts you want to do</label><p class="sub">Check all that apply</p>
  <div class="opts">${WORKOUT_OPTS.map(([v,l,s])=>{const on=(S.workoutTypes||[]).includes(v);return `<label class="opt ${on?'on':''}" style="display:block;cursor:pointer"><input type="checkbox" name="wt" value="${v}" ${on?'checked':''} style="width:auto;min-height:0;margin-right:8px;accent-color:var(--sage-deep)"><b>${l}</b>${s?`<span>${s}</span>`:''}</label>`}).join('')}</div>
  <p id="err" class="note warn" hidden></p><button class="btn">Save</button><button type="button" class="btn ghost" id="resurvey">Edit name, goals &amp; food preferences</button></form>${DISC}`}
};
function chart(ws,goal){if(!ws.length)return '<p class="sub">Log weigh-ins to see your chart.</p>';
 const W=340,H=170,pd=24,vals=ws.map(x=>x.w).concat(goal),mn=Math.min(...vals)-2,mx=Math.max(...vals)+2;
 const X=i=>pd+(ws.length<2?0:i*(W-2*pd)/(ws.length-1)),Y=v=>H-pd-(v-mn)/(mx-mn)*(H-2*pd);
 return `<svg viewBox="0 0 ${W} ${H}" width="100%"><line x1="${pd}" x2="${W-pd}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="var(--sage-deep)" stroke-width="2" stroke-dasharray="5 5"/>
 <text x="${W-pd}" y="${Y(goal)-6}" text-anchor="end" font-size="11" fill="var(--charcoal)">Goal ${goal}</text>
 <polyline fill="none" stroke="var(--charcoal)" stroke-width="2.5" points="${ws.map((x,i)=>X(i)+','+Y(x.w)).join(' ')}"/>
 ${ws.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.w)}" r="4" fill="var(--charcoal)"/>`).join('')}</svg>`}

function resultCard(r,photo){pending=r;const k=+($('#por')?.value||1);
 return `${photo?`<img class="photo" src="${photo}" alt="">`:''}<h3 style="margin-top:12px">${r.items.map(i=>esc(i.name)).join(' + ')}</h3>
 <div class="big">${Math.round(r.kcalLow*k)}–${Math.round(r.kcalHigh*k)} kcal</div><p class="sub">Confidence: ${Math.round(r.confidence*100)}% · ${r.provider==='mock'?'demo estimate':'AI estimate'}</p>
 <div id="mac">${macros({p:r.p*k,c:r.c*k,f:r.f*k})}</div>
 <label>Portion: <b id="pv">${k}×</b></label><input id="por" type="range" min="0.5" max="2" step="0.25" value="${k}">
 <select id="mt" style="margin-top:10px">${['Breakfast','Lunch','Dinner','Snack'].map(x=>`<option>${x}</option>`).join('')}</select>
 <button class="btn" id="addm">Add to log</button>`}
function scaleResult(){const k=+$('#por').value,r=pending;$('#pv').textContent=k+'×';
 $('.big').textContent=`${Math.round(r.kcalLow*k)}–${Math.round(r.kcalHigh*k)} kcal`;$('#mac').innerHTML=macros({p:r.p*k,c:r.c*k,f:r.f*k})}

let photoURL=null;
async function analyze(blob){$('#res').innerHTML='<p class="sub">Estimating…</p>';
 try{const r=await ai().analyzeMeal(blob);$('#res').innerHTML=resultCard(r,photoURL)}catch(e){$('#res').innerHTML=`<p class="note warn">${esc(e.message)} Try the food search below.</p>`}}

function go(t){location.hash=t;
 document.querySelectorAll('.tabs a').forEach(a=>a.classList.toggle('on',a.dataset.t===t));V.innerHTML=views[t]();window.scrollTo(0,0);
 if(t==='snap'&&new URLSearchParams(location.search).has('demo'))analyze(null);}

document.addEventListener('click',e=>{if(e.target.closest('.survey'))return;const el=e.target.closest('#resurvey,[data-t],[data-go],[data-del],[data-edit],#addm,#stsave,#wsave,[data-food],#exsave,[data-exdel]');if(!el)return;
 if(el.id==='resurvey'){runSurvey(S,()=>{persist();go('home')});return}
 if(el.dataset.t||el.dataset.go)return go(el.dataset.t||el.dataset.go);
 if(el.dataset.del){S.meals[today()]=meals().filter(m=>m.id!=el.dataset.del);persist();return go('log')}
 if(el.dataset.edit){const m=meals().find(m=>m.id==el.dataset.edit);const v=prompt('Calories for '+m.name,m.kcal);if(v&&+v>0){const k=+v/m.kcal;Object.assign(m,{kcal:Math.round(+v),p:Math.round(m.p*k),c:Math.round(m.c*k),f:Math.round(m.f*k)});persist()}return go('log')}
 if(el.dataset.food){const f=FOODS[+el.dataset.food];photoURL=null;$('#res').innerHTML=resultCard({items:[{name:f.name}],kcalLow:Math.round(f.kcal*.9),kcalHigh:Math.round(f.kcal*1.1),p:f.p,c:f.c,f:f.f,confidence:0.9,provider:'list'},null);$('#res').scrollIntoView({behavior:'smooth'});return}
 if(el.id==='addm'){const k=+$('#por').value,r=pending;meals().push({id:Date.now(),name:r.items.map(i=>i.name).join(' + '),kcal:Math.round((r.kcalLow+r.kcalHigh)/2*k),p:Math.round(r.p*k),c:Math.round(r.c*k),f:Math.round(r.f*k),t:$('#mt').value});persist();return go('log')}
 if(el.id==='stsave'){steps.setSteps(today(),+$('#st').value);return go('exercise')}
 if(el.id==='exsave'){const m=+$('#exm').value;if(m>0&&m<600){const ty=$('#ext').value,kg=S.profile.weight*0.453592,met=MET[ty]||5,name=ty==='other'?($('#exn')?.value||'').trim():'';if(ty==='other'&&!name)return go('exercise');const w={id:Date.now(),d:today(),type:ty,min:m,kcal:Math.round(met*kg*(m/60))};if(name)w.name=name;(S.workouts||(S.workouts=[])).push(w);persist()}return go('exercise')}
 if(el.dataset.exdel){S.workouts=S.workouts.filter(w=>w.id!=el.dataset.exdel);persist();return go('exercise')}
 if(el.id==='wsave'){const w=+$('#w').value;if(w>50&&w<700){S.weights=S.weights.filter(x=>x.d!==today());S.weights.push({d:today(),w});S.weights.sort((a,b)=>a.d<b.d?-1:1);persist()}return go('progress')}
});
document.addEventListener('input',e=>{if(e.target.id==='por')scaleResult();
 if(e.target.id==='q'){const q=e.target.value.toLowerCase().trim();$('#ql').innerHTML=q?FOODS.map((f,i)=>[f,i]).filter(([f])=>f.name.toLowerCase().includes(q)).slice(0,8).map(([f,i])=>`<div class="item" data-food="${i}" style="cursor:pointer"><span>${f.name}</span><span class="sub">${f.kcal} kcal</span></div>`).join('')||'<p class="sub">No match — try a simpler word.</p>':''}});
document.addEventListener('change',e=>{if(e.target.id==='ph'&&e.target.files[0]){const f=e.target.files[0];photoURL=URL.createObjectURL(f);analyze(f)}if(e.target.name==='wt'){e.target.closest('.opt')?.classList.toggle('on',e.target.checked)}
 if(e.target.id==='ext'){const o=e.target.value==='other',n=$('#exn');if(n){n.hidden=!o;if(o)n.focus()}}});
document.addEventListener('submit',e=>{if(e.target.closest('.survey'))return;e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));
 const p={age:+fd.age,sex:fd.sex,height:+fd.height,weight:+fd.weight,goal:+fd.goal,activity:fd.activity,pace:+fd.pace};
 const err=validate(p);if(err){$('#err').hidden=false;$('#err').textContent=err;return}
 S.profile=p;S.stepGoal=Math.max(1000,+fd.stepGoal||8000);S.workoutTypes=[...e.target.querySelectorAll('input[name=wt]:checked')].map(x=>x.value);if(!S.weights.length)S.weights.push({d:today(),w:p.weight});persist();go('home')});
const start=()=>go(location.hash.slice(1)in views?location.hash.slice(1):'home');
if(!S.profile){const sv=runSurvey(S,()=>{if(!S.weights.length)S.weights.push({d:today(),w:S.profile.weight});persist();go('home')});const n=new URLSearchParams(location.search).get('survey');if(n)sv.jump(+n)}else start();
