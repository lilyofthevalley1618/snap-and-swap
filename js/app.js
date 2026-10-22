import {load,save,today,applyTheme} from './store.js?v=6';
import {plan,validate,goalDate,minHealthyWeight,PACES,FAST_NOTE} from './calc.js?v=4';
import {ai} from './ai.js?v=3';
import * as M from './mealui.js?v=1';
import {planView,togglePlanDay,initPlan} from './plan.js?v=1';
import {SHOW_SIGNIN,CLOUD,initCloud,signIn,signOut,accountCard,welcomeHTML,syncInfo,maybeResume} from './cloud.js?v=2';
import {initQuick,quickHTML,quickClick} from './quick.js?v=1';
import {initRemind,reminderCard,remindClick,remindChange,registerSW,checkOnOpen,schedule,onSave} from './remind.js?v=1';
import {challengeCard,challengeClick,challengeChange,initChallenge} from './challenge.js?v=2';
import {FOODS,swapFor} from './foods.js?v=2';
import {ManualStepsSource} from './steps.js?v=2';
import {runSurvey,WORKOUT_OPTS} from './survey.js?v=6';

const S=load(); const persist=()=>save(S);
M.initMealUI({S,persist:()=>save(S),today}); const steps=new ManualStepsSource(S,save);
applyTheme(S.theme||'sage');
const $=s=>document.querySelector(s), V=$('#view');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DISC='<p class="note">Snap &amp; Swap gives estimates, not medical advice. Talk to a doctor, dietitian or parent before changing how you eat.</p>';

// Outline icons (tab style): stroke charcoal, fill accent tint
const ST='stroke="var(--charcoal)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"';
const FL='fill="var(--sage-tint)"';
const ic=(inner,s=20)=>`<svg class="ic" viewBox="0 0 28 28" width="${s}" height="${s}" aria-hidden="true">${inner}</svg>`;
const IC={
 steps:ic(`<path d="M4 19 V11.5 a1.5 1.5 0 0 1 1.5-1.5 H9 l2 3 4.5 1.5 6 1.5 a3 3 0 0 1 2.5 3 V19 Z" ${FL} ${ST}/><path d="M4 19 H24 v1.5 a1.5 1.5 0 0 1-1.5 1.5 H5.5 A1.5 1.5 0 0 1 4 20.5Z" fill="var(--sage)" ${ST}/>`),
 progress:ic(`<rect x="5" y="16" width="4" height="7" rx="1.6" ${FL} ${ST}/><rect x="12" y="12" width="4" height="11" rx="1.6" fill="var(--sage)" ${ST}/><rect x="19" y="7" width="4" height="16" rx="1.6" ${FL} ${ST}/>`),
 run:ic(`<circle cx="18" cy="7" r="2.2" ${FL} ${ST}/><path d="M10 26 l2-7 4 2 3-6 M12 19 l-3 2 M16 15 l4 1 2-3" fill="none" ${ST}/>`),
 salad:ic(`<ellipse cx="14" cy="18" rx="9" ry="4" ${FL} ${ST}/><path d="M8 16 c2-6 5-8 6-8 s4 2 6 8 M14 8 v4 M11 10 c1 2 2 3 3 3" fill="none" ${ST}/>`),
 soda:ic(`<path d="M10 8 h8 l1.5 16 a2 2 0 0 1-2 2 h-7 a2 2 0 0 1-2-2 Z" ${FL} ${ST}/><path d="M11 8 V6 h6 v2 M12 12 h4" fill="none" ${ST}/>`),
 drink:ic(`<path d="M9 6 h10 l-1 18 a2 2 0 0 1-2 2 h-4 a2 2 0 0 1-2-2 Z" ${FL} ${ST}/><path d="M12 10 h4 M14 6 V3" fill="none" ${ST}/>`),
 cake:ic(`<path d="M5 16 h18 v6 a2 2 0 0 1-2 2 H7 a2 2 0 0 1-2-2 Z" ${FL} ${ST}/><path d="M7 16 V12 h14 v4 M14 12 V8 M12 8 h4" fill="none" ${ST}/>`),
 fries:ic(`<path d="M8 12 h12 l-1 12 H9 Z" ${FL} ${ST}/><path d="M11 12 V7 M14 12 V6 M17 12 V8" fill="none" ${ST}/>`),
 burger:ic(`<path d="M6 14 h16 a1 1 0 0 1 0 2 H6 a1 1 0 0 1 0-2 Z" fill="var(--sage)" ${ST}/><path d="M7 14 c0-5 3-7 7-7 s7 2 7 7 M7 16 v3 a2 2 0 0 0 2 2 h10 a2 2 0 0 0 2-2 v-3" ${FL} ${ST}/>`),
 fried:ic(`<ellipse cx="14" cy="15" rx="8" ry="6" ${FL} ${ST}/><path d="M10 13 c2 1 4 1 6 0 M9 17 h3" fill="none" ${ST}/>`),
 candy:ic(`<rect x="10" y="10" width="8" height="8" rx="2" transform="rotate(45 14 14)" ${FL} ${ST}/><path d="M8 8 l3 3 M20 20 l-3-3 M20 8 l-3 3 M8 20 l3-3" fill="none" ${ST}/>`),
 sugar:ic(`<path d="M10 8 h8 l2 4 v10 a2 2 0 0 1-2 2 H10 a2 2 0 0 1-2-2 V12 Z" ${FL} ${ST}/><path d="M10 12 h10 M13 16 h2 M13 19 h2" fill="none" ${ST}/>`),
 cam:ic(`<rect x="4" y="9" width="20" height="14" rx="4" ${FL} ${ST}/><path d="M10 9 l1.5-2.5 h5 L18 9" fill="var(--cream)" ${ST}/><circle cx="14" cy="16" r="4" fill="var(--cream)" ${ST}/><circle cx="14" cy="16" r="1.6" fill="var(--sage)"/>`),
 search:ic(`<circle cx="12" cy="12" r="6" ${FL} ${ST}/><path d="M17 17 l5 5" fill="none" ${ST}/>`),
 leaf:ic(`<path d="M7 21 c8-2 12-8 14-16 -8 2-14 6-16 14 Z" ${FL} ${ST}/><path d="M9 19 c3-3 6-7 8-12" fill="none" ${ST}/>`),
 pencil:ic(`<path d="M16 6 l6 6 -12 12 H4 v-6 Z" ${FL} ${ST}/><path d="M14 8 l6 6" fill="none" ${ST}/>`,18),
 scale:ic(`<path d="M6 10 h16 M14 10 v12 M8 22 h12" fill="none" ${ST}/><path d="M6 10 l-2 6 h6 Z M22 10 l2 6 h-6 Z" ${FL} ${ST}/>`),
 plant:ic(`<path d="M14 24 V14 M14 18 c-4-2-6-6-6-10 6 0 8 4 8 8 M14 16 c4-1 6-5 6-8 -4 1-6 4-6 8" fill="none" ${ST}/><circle cx="14" cy="12" r="2" ${FL} ${ST}/>`),
 star:ic(`<path d="M14 5 l2.2 5.5 H22 l-4.5 3.4 1.7 5.6 L14 16.8 8.8 19.5 10.5 14 6 10.5 h5.8 Z" ${FL} ${ST}/>`),
};

if(new URLSearchParams(location.search).has('demo')&&!S.profile){
  S.name='Lily';S.profile={age:16,sex:'female',height:64,weight:150,goal:135,activity:'moderate',pace:0.5};S.workoutTypes=['walk','run','yoga'];S.theme=S.theme||'sage';
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
const themeCards=(cur)=>`<div class="themes">
  <button type="button" class="theme-card ${cur!=='plum'?'on':''}" data-theme-pick="sage"><div class="swatch sage"><i></i><i></i><i></i></div><b>Calm Sage</b><span>Soft greens</span></button>
  <button type="button" class="theme-card ${cur==='plum'?'on':''}" data-theme-pick="plum"><div class="swatch plum"><i></i><i></i><i></i></div><b>Plum Glow</b><span>Warm blush</span></button>
 </div>`;

const LOG=[
 ['walk','Walking',3.5],['run','Running',9.8],['swim','Swimming',6.0],['cycle','Cycling',6.8],
 ['hike','Hiking',5.3],['yoga','Yoga',2.5],['pilates','Pilates',3.0],['dance','Dance',5.5],
 ['strength','Strength training',5.0],['hiit','HIIT',8.0],['jumprope','Jump rope',8.8],
 ['tennis','Tennis',7.3],['basketball','Basketball',6.5],['soccer','Soccer',7.0],
 ['rowing','Rowing',6.0],['elliptical','Elliptical',5.0],['stairs','Stair climber',9.0],
 ['skate','Skating',7.0],['martial','Martial arts',5.3],['other','Other',5.0],
];
const MET=Object.fromEntries(LOG.map(([k,,m])=>[k,m]));
initPlan({today,MET});initQuick({today,persist:()=>save(S),refresh:()=>{const h=location.hash.slice(1)||'home',y=scrollY;go(h);scrollTo(0,y)}});initRemind({today,persist:()=>save(S)});initChallenge({today,persist:()=>save(S)});
let exMode=sessionStorage.exMode||'log';
const exSeg=()=>`<div class="xseg" role="tablist"><button class="${exMode==='log'?'on':''}" data-exmode="log">Log</button><button class="${exMode==='plan'?'on':''}" data-exmode="plan">Plan</button></div>`;
const logLabel=k=>(LOG.find(([v])=>v===k)||[k,k])[1];
const SURVEY_TO_LOG={walk:['walk'],run:['run'],cardio:['cycle','dance','hiit'],gym:['strength'],
 yoga:['yoga','pilates'],swim:['swim'],sports:['tennis','basketball','soccer','skate','martial'],
 home:['strength','hiit','jumprope','dance','other']};
const metOrder=()=>{const seen=new Set(),out=[];
 for(const s of S.workoutTypes||[])for(const k of SURVEY_TO_LOG[s]||[])if(k in MET&&!seen.has(k)){seen.add(k);out.push(k)}
 for(const [k] of LOG)if(!seen.has(k))out.push(k);
 return out};
const exName=w=>w.type==='other'&&w.name?w.name:logLabel(w.type);
const exToday=()=>(S.workouts||[]).filter(w=>w.d===today()).reduce((a,w)=>a+w.min,0);
const CUTBACK=[['soda','Sodas'],['drink','Sweet drinks'],['cake','Rich desserts'],['fries','Chips'],['burger','Fast food'],['fried','Deep-fried foods'],['candy','Candy'],['sugar','Added sugar']];

const views={
 exercise(){if(exMode==='plan')return `<h2>Exercise</h2><p class="sub">A simple plan for this week.</p>${exSeg()}${planView(S,IC)}`;
  const st=S.steps[today()]||0,wk=(S.workouts||[]);
  const days=[...Array(7)].map((_,i)=>{const x=new Date();x.setDate(x.getDate()-6+i);const d=x.toLocaleDateString('en-CA');return {l:x.toLocaleDateString(undefined,{weekday:'narrow'}),m:wk.filter(w=>w.d===d).reduce((a,w)=>a+w.min,0)}});
  const mx=Math.max(30,...days.map(d=>d.m)),tw=wk.filter(w=>w.d===today());
  return `<h2>Exercise</h2><p class="sub">Every bit of movement counts.</p>${exSeg()}
  <div class="card"><h3>${IC.steps}Steps</h3><div class="row">${ring(st,S.stepGoal,`of ${S.stepGoal.toLocaleString()}`,110)}<div class="grow">
   <label>Steps today</label><input id="st" type="number" inputmode="numeric" value="${st||''}" placeholder="e.g. 6000">
   <button class="btn sm" id="stsave" style="margin-top:8px">Save</button></div></div>
   <p class="sub">${st>=S.stepGoal?`Goal reached — nice work! ${IC.star}`:`${(S.stepGoal-st).toLocaleString()} to go. A 10-minute walk is about 1,000.`}</p>
   <p class="note">Steps will count automatically in the phone app.</p></div>
  <div class="card"><h3>${IC.run}Log a workout</h3><div class="grid2"><select id="ext">${metOrder().map(k=>`<option value="${k}">${logLabel(k)}</option>`).join('')}</select>
   <input id="exm" type="number" inputmode="numeric" placeholder="Minutes"></div>
   <input id="exn" type="text" placeholder="What did you do?" hidden style="margin-top:8px">
   <button class="btn" id="exsave">Add workout</button>
   ${tw.map(w=>`<div class="item"><span>${esc(exName(w))} · ${w.min} min</span><span class="sub">~${w.kcal} kcal <button class="x" data-exdel="${w.id}">✕</button></span></div>`).join('')}</div>
  <div class="card"><h3>This week</h3><svg viewBox="0 0 280 120" width="100%">${days.map((d,i)=>{const h=d.m/mx*70;return `<rect x="${i*40+8}" y="${92-h}" width="24" height="${Math.max(h,2)}" rx="6" fill="var(--sage-deep)"/><text x="${i*40+20}" y="${86-h}" text-anchor="middle" font-size="10" fill="var(--muted)">${d.m||''}</text><text x="${i*40+20}" y="110" text-anchor="middle" font-size="11" fill="var(--charcoal)">${d.l}</text>`}).join('')}</svg>
   <p class="sub">${days.reduce((a,d)=>a+d.m,0)} active minutes this week</p></div>
  <p class="note">Exercise calories are estimates and don't change your daily limit. Move for fun and energy! ${IC.leaf}</p>`},
 home(){const P=plan(S.profile),t=tot(),st=S.steps[today()]||0,lw=S.weights.at(-1),left=P.target-t.kcal;
  return `<h2>Hi, ${esc(S.name||'there')}!</h2>
  <div class="card today"><div class="row between"><h3 style="margin:0">Today</h3><span class="sub">Target ${P.target.toLocaleString()}</span></div>
   <div class="tring">${ring(Math.max(0,left),P.target,left>=0?'cal left':'a bit over')}</div>
   <p class="sub center">${t.kcal.toLocaleString()} eaten · P${Math.round(t.p)} C${Math.round(t.c)} F${Math.round(t.f)}</p>
   ${left<0?`<p class="note">Tomorrow's a fresh start. ${IC.plant}</p>`:''}
   <button class="btn" data-go="snap">${IC.cam}Log food</button></div>
  ${challengeCard(S,P.target,ring,true)}
  ${P.teen?'<p class="note warn">Under 18, your target stays gentle. Check with a doctor or parent before changing how you eat.</p>':''}
  <details class="more"><summary>See more</summary>
  <div class="card"><h3>${IC.salad}Foods to cut back on</h3><p class="sub">Lots of calories, not very filling.</p>
  <div class="chips">${CUTBACK.map(([k,l])=>`<span class="chip">${IC[k]}${l}</span>`).join('')}</div><p class="sub" style="margin:6px 0 0">A little is fine. Balance matters.</p></div>
  <div class="card row between"><div><h3>${IC.steps}Steps</h3><span class="sub">${st.toLocaleString()} of ${S.stepGoal.toLocaleString()}</span></div><button class="btn sm ghost" data-go="exercise">Open</button></div>
  <div class="card row between"><div><h3>${IC.progress}Progress</h3><span class="sub">${lw?`${lw.w.toFixed(1)} → ${S.profile.goal} lb`:'Log a weigh-in'}</span></div><button class="btn sm ghost" data-go="progress">Open</button></div>
  <div class="card row between"><div><h3>${IC.leaf}Swaps</h3><span class="sub">Lighter ideas for what you log</span></div><button class="btn sm ghost" data-go="log">Open</button></div>
  </details>`},
 snap(){return `<h2>Snap a meal</h2><p class="sub">Take a photo and we'll estimate it.</p>
  <div class="card"><label class="btn" style="text-align:center;display:flex;align-items:center;justify-content:center;gap:8px">${IC.cam}Take or upload photo<input id="ph" type="file" accept="image/*" capture="environment" hidden></label>
  <div id="res"></div></div>
  <div class="card"><h3>${IC.search}Search a food</h3>${quickHTML(S,{again:false})}${M.searchBox()}</div>${DISC}`},
 log(){const P=plan(S.profile),t=tot();
  return `<h2>Food log</h2><p class="sub">${t.kcal} of ${P.target} kcal today</p>
  ${(()=>{const q=quickHTML(S);return q?`<div class="card">${q}</div>`:''})()}
  <div class="card">${meals().length?meals().map(m=>{const sw=swapFor(m.name,S.prefs);return `<div class="item"><div class="grow"><b>${esc(m.name)}</b><div class="sub">${m.t||''} · ${m.kcal} kcal · P${m.p} C${m.c} F${m.f}</div>
   ${sw?`<div class="swap">${IC.leaf}<b>Try:</b> ${esc(sw.to)} — ${sw.why}, about ${sw.saves} kcal lighter</div>`:''}</div>
   <div><button class="x" data-edit="${m.id}" title="Edit">${IC.pencil}</button><button class="x" data-del="${m.id}" title="Delete">✕</button></div></div>`}).join(''):'<p class="sub">Nothing logged yet. Snap your first meal!</p>'}</div>
  <p class="note">Swaps are ideas, not rules. Every food fits — swaps just add more fiber, protein and veggies.</p>`},
 progress(){const p=S.profile,P=plan(p),ws=S.weights,lw=ws.at(-1)?.w??p.weight;
  const gd=goalDate(lw,p.goal,P.weekly);let trend='';
  if(ws.length>1){const days=(new Date(ws.at(-1).d)-new Date(ws[0].d))/864e5||1;const r=(ws.at(-1).w-ws[0].w)/days*7;trend=`${r<=0?'↓':'↑'} ${Math.abs(r).toFixed(1)} lb/week`}
  return `<h2>Progress</h2><p class="sub">Goal: ${p.goal} lb${gd?` · est. ${gd.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})} at ${P.weekly.toFixed(1)} lb/wk`:''}</p>
  <div class="card">${chart(ws,p.goal)}<div class="row between sub"><span>Now: <b>${lw.toFixed(1)} lb</b></span><span>Trend: <b>${trend||'—'}</b></span></div></div>
  <div class="card"><h3>${IC.scale}Today's weight</h3><div class="row"><input id="w" type="number" step="0.1" inputmode="decimal" placeholder="lb"><button class="btn sm" id="wsave">Save</button></div></div>
  <div class="card"><h3>History</h3>${ws.slice().reverse().slice(0,10).map(x=>`<div class="item"><span>${x.d}</span><b>${x.w.toFixed(1)} lb</b></div>`).join('')||'<p class="sub">No weigh-ins yet.</p>'}</div>
  <p class="note">Weight goes up and down day to day. Look at the trend, and celebrate habits like walks, water and veggies.</p>`},
 profile(){const p=S.profile||{age:'',sex:'female',height:'',weight:'',goal:'',activity:'light',pace:0.5};const P=S.profile?plan(p):null;
  const o=(v,l,c)=>`<option value="${v}" ${String(c)==String(v)?'selected':''}>${l}</option>`;
  const th=S.theme||'sage';
  return `<h2>${S.profile?'Profile':'Welcome'}</h2><p class="sub">${S.profile?'Your goals and settings':'Tell us a little about you to set a healthy daily target.'}</p>
  ${P?`<div class="card"><h3>Daily target</h3><div class="big">${P.target} kcal</div><p class="sub">Maintenance ≈ ${P.tdee} kcal · deficit ${P.deficit} kcal · never below ${P.floor}</p><p class="sub">Real pace: <b>${P.weekly.toFixed(1)} lb/week</b></p>${P.why?`<p class="note">${P.why}</p>`:''}</div>`:''}
  ${accountCard()}
  ${reminderCard(S)}
  <div class="card"><h3>App colors</h3><p class="sub">Pick a look — it updates right away.</p>${themeCards(th)}</div>
  <form class="card" id="pf"><div class="grid2"><div><label>Age</label><input name="age" type="number" value="${p.age}" required></div>
  <div><label>Sex</label><select name="sex">${o('female','Female',p.sex)}${o('male','Male',p.sex)}</select></div>
  <div><label>Height (in)</label><input name="height" type="number" value="${p.height}" required></div>
  <div><label>Weight (lb)</label><input name="weight" type="number" step="0.1" value="${p.weight}" required></div>
  <div><label>Goal weight (lb)</label><input name="goal" type="number" step="0.1" value="${p.goal}" required></div>
  <div><label>Pace</label><select name="pace" id="pace">${PACES.map(([v,l,s,ok])=>`<option value="${v}" ${String(p.pace)==String(v)?'selected':''} ${p.age<18&&!ok?'disabled':''}>${l} · ${v} lb/wk${p.age<18&&!ok?' (18+ only)':''}</option>`).join('')}</select></div></div>
  <p class="sub" id="pacenote">${p.pace>1?FAST_NOTE:''}${p.age<18?' Faster and Fastest are for 18+ — gentle plans are safer while you\'re growing.':''}</p>
  <label>Activity</label><select name="activity">${o('sedentary','Mostly sitting',p.activity)}${o('light','Lightly active',p.activity)}${o('moderate','Active most days',p.activity)}${o('active','Very active',p.activity)}</select>
  <label>Daily step goal</label><input name="stepGoal" type="number" value="${S.stepGoal}">
  <label>Workouts you want to do</label><p class="sub">Check all that apply</p>
  <div class="opts">${WORKOUT_OPTS.map(([v,l,s])=>{const on=(S.workoutTypes||[]).includes(v);return `<label class="opt ${on?'on':''}" style="display:block;cursor:pointer"><input type="checkbox" name="wt" value="${v}" ${on?'checked':''} style="width:auto;min-height:0;margin-right:8px;accent-color:var(--sage-deep)"><b>${l}</b>${s?`<span>${s}</span>`:''}</label>`}).join('')}</div>
  <p id="err" class="note warn" hidden></p><button class="btn">Save</button><p id="saved" class="saved" aria-live="polite"></p></form>
  <div class="card"><h3>Survey</h3><p class="sub">Redo the welcome questions. Your food log, weights, workouts and steps stay put.</p>
  <button type="button" class="btn ghost" id="retake">Retake survey</button></div>${DISC}`}
};
function chart(ws,goal){if(!ws.length)return '<p class="sub">Log weigh-ins to see your chart.</p>';
 const W=340,H=170,pd=24,vals=ws.map(x=>x.w).concat(goal),mn=Math.min(...vals)-2,mx=Math.max(...vals)+2;
 const X=i=>pd+(ws.length<2?0:i*(W-2*pd)/(ws.length-1)),Y=v=>H-pd-(v-mn)/(mx-mn)*(H-2*pd);
 return `<svg viewBox="0 0 ${W} ${H}" width="100%"><line x1="${pd}" x2="${W-pd}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="var(--sage-deep)" stroke-width="2" stroke-dasharray="5 5"/>
 <text x="${W-pd}" y="${Y(goal)-6}" text-anchor="end" font-size="11" fill="var(--charcoal)">Goal ${goal}</text>
 <polyline fill="none" stroke="var(--charcoal)" stroke-width="2.5" points="${ws.map((x,i)=>X(i)+','+Y(x.w)).join(' ')}"/>
 ${ws.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x.w)}" r="4" fill="var(--charcoal)"/>`).join('')}</svg>`}

let photoURL=null;
async function analyze(blob){$('#res').innerHTML='<p class="sub">Estimating…</p>';
 try{const r=await ai().analyzeMeal(blob);M.loadScan(r,photoURL)}catch(e){$('#res').innerHTML=`<p class="note warn">${esc(e.message)} Try the food search below.</p>`}}

function go(t){location.hash=t;
 document.querySelectorAll('.tabs a').forEach(a=>a.classList.toggle('on',a.dataset.t===t));V.innerHTML=views[t]();window.scrollTo(0,0);
 if(t==='snap'){M.render();M.showIdle();if(new URLSearchParams(location.search).has('demo')&&!M.draft.items.length)analyze(null)}}

function retakeSurvey(){
 if(!confirm('Retake the welcome survey? Your food log, weights, workouts and steps will stay. Goals update when you finish.'))return;
 const before={meals:S.meals,weights:S.weights,workouts:S.workouts,steps:S.steps};
 runSurvey(S,()=>{
  S.meals=before.meals;S.weights=before.weights;S.workouts=before.workouts;S.steps=before.steps;
  if(S.profile&&!S.weights.some(w=>w.d===today())){/* keep history */}
  persist();applyTheme(S.theme||'sage');go('home');
 });
}

document.addEventListener('click',e=>{if(e.target.closest('.survey'))return;
 const mh=M.handleClick(e);if(mh==='logged')return go('log');if(mh)return;
 const pick=e.target.closest('[data-theme-pick]');
 if(pick){S.theme=pick.dataset.themePick;applyTheme(S.theme);persist();return go('profile')}
 const qa=e.target.closest('[data-qa],[data-undo]');if(qa&&quickClick(S,qa))return;
 const rm=e.target.closest('#remAllow,#remLater');if(rm){remindClick(S,rm).then(h=>{if(h){const y=scrollY;go('profile');scrollTo(0,y)}});return}
 const ac=e.target.closest('#signin,#signout,#wGoogle,#wGuest');
 if(ac){if(ac.id==='signin')signIn();else if(ac.id==='signout'){if(confirm('Sign out? Your data stays on this device too.'))signOut()}else if(ac.id==='wGuest'){localStorage.setItem('snapswap.sync',JSON.stringify({...syncInfo(),welcomed:1}));closeWelcome();boot()}else welcomeGoogle();return}
 const chx=e.target.closest('[data-chpick],#chstart,#chedit,#chcancel,#chrestart');
 if(chx){if(challengeClick(S,chx)){const y=scrollY;go('home');scrollTo(0,y)}return}
 const xm=e.target.closest('[data-exmode],[data-lv],[data-pday]');
 if(xm){if(xm.dataset.exmode){exMode=sessionStorage.exMode=xm.dataset.exmode}else if(xm.dataset.lv){S.planLevel=xm.dataset.lv;persist()}else{togglePlanDay(S,xm.dataset.pday);persist()}const y=scrollY;go('exercise');scrollTo(0,y);return}
 const el=e.target.closest('#retake,[data-t],[data-go],[data-del],[data-edit],#stsave,#wsave,#exsave,[data-exdel]');if(!el)return;
 if(el.id==='retake'){retakeSurvey();return}
 if(el.dataset.t||el.dataset.go)return go(el.dataset.t||el.dataset.go);
 if(el.dataset.del){S.meals[today()]=meals().filter(m=>m.id!=el.dataset.del);persist();return go('log')}
 if(el.dataset.edit){const m=meals().find(m=>m.id==el.dataset.edit);const v=prompt('Calories for '+m.name,m.kcal);if(v&&+v>0){const k=+v/m.kcal;Object.assign(m,{kcal:Math.round(+v),p:Math.round(m.p*k),c:Math.round(m.c*k),f:Math.round(m.f*k)});persist()}return go('log')}
 if(el.id==='stsave'){steps.setSteps(today(),+$('#st').value);return go('exercise')}
 if(el.id==='exsave'){const m=+$('#exm').value;if(m>0&&m<600){const ty=$('#ext').value,kg=S.profile.weight*0.453592,met=MET[ty]||5,name=ty==='other'?($('#exn')?.value||'').trim():'';if(ty==='other'&&!name)return go('exercise');const w={id:Date.now(),d:today(),type:ty,min:m,kcal:Math.round(met*kg*(m/60))};if(name)w.name=name;(S.workouts||(S.workouts=[])).push(w);persist()}return go('exercise')}
 if(el.dataset.exdel){S.workouts=S.workouts.filter(w=>w.id!=el.dataset.exdel);persist();return go('exercise')}
 if(el.id==='wsave'){const w=+$('#w').value;if(w>50&&w<700){S.weights=S.weights.filter(x=>x.d!==today());S.weights.push({d:today(),w});S.weights.sort((a,b)=>a.d<b.d?-1:1);persist()}return go('progress')}
});
document.addEventListener('input',e=>{M.handleInput(e)});
document.addEventListener('change',e=>{if(e.target.id==='remOn'||e.target.id==='remTime'){remindChange(S,e).then(h=>{if(h){const y=scrollY;go('profile');scrollTo(0,y)}});return}if(challengeChange(e)){const y=scrollY;go('home');scrollTo(0,y);return}if(e.target.id==='ph'&&e.target.files[0]){const f=e.target.files[0];photoURL=URL.createObjectURL(f);analyze(f)}if(e.target.name==='wt'){e.target.closest('.opt')?.classList.toggle('on',e.target.checked)}
 if(e.target.id==='pace'){e.target.form.requestSubmit();return}
 if(e.target.id==='ext'){const o=e.target.value==='other',n=$('#exn');if(n){n.hidden=!o;if(o)n.focus()}}});
document.addEventListener('submit',e=>{if(e.target.closest('.survey'))return;e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));
 const p={age:+fd.age,sex:fd.sex,height:+fd.height,weight:+fd.weight,goal:+fd.goal,activity:fd.activity,pace:+fd.pace};
 const err=validate(p);if(err){$('#err').hidden=false;$('#err').textContent=err;return}
 S.profile=p;S.stepGoal=Math.max(1000,+fd.stepGoal||8000);S.workoutTypes=[...e.target.querySelectorAll('input[name=wt]:checked')].map(x=>x.value);if(!S.weights.length)S.weights.push({d:today(),w:p.weight});persist();const y=scrollY;go('profile');scrollTo(0,y);flashSaved()});
function flashSaved(){const s=$('#saved');if(!s)return;s.textContent='Saved ✓';s.classList.remove('fade');void s.offsetWidth;s.classList.add('fade')}
const start=()=>go(location.hash.slice(1)in views?location.hash.slice(1):'home');
function boot(){if(!S.profile){const sv=runSurvey(S,()=>{if(!S.weights.length)S.weights.push({d:today(),w:S.profile.weight});persist();applyTheme(S.theme||'sage');go('home')});const n=new URLSearchParams(location.search).get('survey');if(n)sv.jump(+n)}else start();}
let W=null;
function showWelcome(){W=document.createElement('div');W.className='welcome-ov';W.innerHTML=welcomeHTML();document.body.appendChild(W)}
function closeWelcome(){if(W){W.remove();W=null}}
async function welcomeGoogle(){const b=W&&W.querySelector('#wGoogle');if(b){b.disabled=true;b.querySelector('span').textContent='Opening Google…'}await signIn();
 if(CLOUD.err&&W){const e=W.querySelector('#wErr');e.hidden=false;e.textContent=CLOUD.err;b.disabled=false;b.querySelector('span').textContent='Continue with Google'}
 else if(!CLOUD.user&&b){b.disabled=false;b.querySelector('span').textContent='Continue with Google'}}
initCloud({S,onData:()=>{applyTheme(S.theme||'sage');if(W&&S.profile){closeWelcome();document.querySelector('.survey')?.remove();start()}else if(!W&&!document.querySelector('.survey')){const y=scrollY;start();scrollTo(0,y)}}});
CLOUD.onChange=()=>{if(W&&CLOUD.user&&CLOUD.status.startsWith('Synced')){closeWelcome();S.profile?start():boot()} // signed in from the welcome screen
 const a=document.querySelector('#acct');if(a)a.outerHTML=accountCard()};
maybeResume();registerSW();window.__onSave=onSave;if(S.profile)setTimeout(()=>{checkOnOpen(S);if(S.reminder?.on)schedule(S)},1500);
if(SHOW_SIGNIN&&!S.profile&&!syncInfo().welcomed&&!new URLSearchParams(location.search).has('survey'))showWelcome();else boot();
