// First-open welcome survey: one tiny question per screen. Weights stored in lb, height in inches.
import {plan,goalDate,minHealthyWeight,PACES,FAST_NOTE} from './calc.js?v=4';
import {applyTheme} from './store.js?v=5';
const KG=0.453592;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const WORKOUT_OPTS=[
 ['walk','Walking (steps)',''],
 ['run','Running',''],
 ['cardio','Cardio','Cycling, dance, HIIT'],
 ['gym','Weight training',''],
 ['yoga','Yoga / Pilates',''],
 ['swim','Swimming',''],
 ['sports','Sports',''],
 ['home','Home workouts',''],
];
export const workoutLabel=k=>(WORKOUT_OPTS.find(([v])=>v===k)||[k,k[0].toUpperCase()+k.slice(1)])[1];
const themes=()=>{
 const cur=document.documentElement.getAttribute('data-theme')==='plum'?'plum':'sage';
 return `<div class="themes">
  <button type="button" class="theme-card ${cur==='sage'?'on':''}" data-k="theme" data-v="sage"><div class="swatch sage"><i></i><i></i><i></i></div><b>Calm Sage</b><span>Soft greens</span></button>
  <button type="button" class="theme-card ${cur==='plum'?'on':''}" data-k="theme" data-v="plum"><div class="swatch plum"><i></i><i></i><i></i></div><b>Plum Glow</b><span>Warm blush</span></button>
 </div>`;
};
export function runSurvey(S,done){
 const a={name:S.name||'',unit:S.unit||'lb',age:S.profile?.age||'',weight:S.profile?.weight||'',lose:S.profile?Math.max(0,+(S.profile.weight-S.profile.goal).toFixed(1)):'',
  sex:S.profile?.sex||'',height:S.profile?.height||'',activity:S.profile?.activity||'',pace:S.profile?.pace||0.5,mainGoal:S.mainGoal||'',prefs:S.prefs||[],stepGoal:S.stepGoal||8000,workoutTypes:S.workoutTypes?S.workoutTypes.slice():[],theme:S.theme||'sage'};
 applyTheme(a.theme);
 const box=document.createElement('div');box.className='survey';document.body.appendChild(box);
 const toU=lb=>a.unit==='kg'?+(lb*KG).toFixed(1):+(+lb).toFixed(1), fromU=v=>a.unit==='kg'?v/KG:v;
 const unitT=()=>`<div class="seg">${['lb','kg'].map(u=>`<button type="button" data-unit="${u}" class="${a.unit===u?'on':''}">${u}</button>`).join('')}</div>`;
 const tap=(key,opts,multi)=>`<div class="opts">${opts.map(([v,l,s])=>{const on=multi?a[key].includes(v):String(a[key])===String(v);return `<button type="button" class="opt ${on?'on':''}" data-k="${key}" data-v="${v}" ${multi?'data-multi':''}><b>${l}</b>${s?`<span>${s}</span>`:''}</button>`}).join('')}</div>`;
 let note='';
 const steps=[
  {q:"Hi! What's your name?",h:()=>`<input id="i" autocomplete="given-name" value="${esc(a.name)}" placeholder="Your first name">`,r:()=>{a.name=$i().trim();return a.name?null:'Tell us what to call you.'}},
  {q:'Pick your colors',sub:'Tap a look to preview. You can change this later in Profile.',h:()=>themes(),r:()=>a.theme==='sage'||a.theme==='plum'?null:'Pick one to continue.'},
  {q:'How old are you?',h:()=>`<input id="i" type="number" inputmode="numeric" value="${a.age}" placeholder="Age">`,r:()=>{a.age=+$i();return a.age>=13&&a.age<=100?null:'Please enter an age between 13 and 100.'}},
  {q:"What's your current weight?",h:()=>`${unitT()}<input id="i" type="number" step="0.1" inputmode="decimal" value="${a.weight?toU(a.weight):''}" placeholder="${a.unit}">`,r:()=>{const v=fromU(+$i());if(!(v>60&&v<700))return 'Please enter your weight.';a.weight=+v.toFixed(1);return null}},
  {q:'How much weight do you want to lose?',sub:"It's okay to start small.",h:()=>`${unitT()}<input id="i" type="number" step="0.5" inputmode="decimal" value="${a.lose!==''?toU(a.lose):''}" placeholder="${a.unit}">`,r:()=>{const v=fromU(+$i());if(!(v>=0))return 'Enter an amount (0 is fine).';a.lose=+v.toFixed(1);return null}},
  {q:'What sex should we use?',sub:'Why we ask: the calorie formula is a little different for female and male bodies.',h:()=>tap('sex',[['female','Female'],['male','Male']]),r:()=>a.sex?null:'Pick one to continue.'},
  {q:'How tall are you?',h:()=>a.unit==='kg'?`<input id="i" type="number" inputmode="numeric" value="${a.height?Math.round(a.height*2.54):''}" placeholder="cm">`:
    `<div class="grid2"><input id="ft" type="number" inputmode="numeric" value="${a.height?Math.floor(a.height/12):''}" placeholder="ft"><input id="in" type="number" inputmode="numeric" value="${a.height?Math.round(a.height%12):''}" placeholder="in"></div>`,
   r:()=>{const h=a.unit==='kg'?+$i()/2.54:(+document.getElementById('ft').value)*12+(+document.getElementById('in').value||0);if(!(h>48&&h<90))return 'Please enter your height.';a.height=+h.toFixed(1);
    const min=minHealthyWeight(a.height);if(a.weight-a.lose<min){a.lose=Math.max(0,+(a.weight-min).toFixed(1));note=`To keep you strong and healthy, we set your goal to ${toU(min)} ${a.unit}, the healthy minimum for your height.`}else note='';return null}},
  {q:'How active are you?',h:()=>tap('activity',[['sedentary','Mostly sitting','School, homework, screens'],['light','Lightly active','Walks, light chores'],['moderate','Active most days','Sports practice or workouts 3–5×/week'],['active','Very active','Daily training or a physical job']]),r:()=>a.activity?null:'Pick one to continue.'},
  {q:'Pick your pace',sub:'Slow and steady lasts.',h:()=>{const teen=a.age<18;return `<div class="opts">${PACES.map(([v,l,s,ok])=>{const dis=teen&&!ok,on=+a.pace===v;return `<button type="button" class="opt ${on?'on':''}" data-k="pace" data-v="${v}" ${dis?'disabled aria-disabled="true"':''}><b>${l}</b><span>${s}${v===0.5?' · Recommended':''}</span>${v>1?`<span>${dis?'Not available under 18 — gentle plans are safer while you\'re growing.':FAST_NOTE}</span>`:''}</button>`}).join('')}</div>`},r:()=>null},
  {q:"What's your main goal?",h:()=>tap('mainGoal',[['healthier','Feel healthier'],['lose','Lose weight'],['habits','Build habits'],['energy','More energy']]),r:()=>a.mainGoal?null:'Pick one to continue.'},
  {q:'Any food preferences?',sub:'Swaps will respect these. Pick all that apply.',h:()=>tap('prefs',[['none','None'],['veg','Vegetarian'],['vegan','Vegan'],['halal','Halal'],['dairy','No dairy'],['gluten','No gluten'],['nut','Nut allergy']],true),r:()=>null},
  {q:'Daily step goal',h:()=>tap('stepGoal',[[5000,'5,000','Easy start'],[8000,'8,000','Balanced'],[10000,'10,000','Go-getter']]),r:()=>null},
  {q:'What types of workouts do you want to do?',sub:'Pick all that apply — we\'ll put these first when you log exercise.',h:()=>tap('workoutTypes',WORKOUT_OPTS,true),r:()=>a.workoutTypes.length?null:'Pick at least one to continue.'},
  {q:'Your plan',h:()=>{const p=prof(),P=plan(p),gd=goalDate(p.weight,p.goal,P.weekly);const wts=a.workoutTypes.map(workoutLabel).join(' · ');return `${note?`<p class="note warn">${note}</p>`:''}
    <div class="card"><p class="sub">Daily target</p><div class="big">${P.target} kcal</div><p class="sub">Real pace: ${P.weekly.toFixed(1)} lb/week</p>${P.why?`<p class="sub">${P.why}</p>`:''}<p class="sub">Goal: ${toU(p.goal)} ${a.unit}${gd?` · around ${gd.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`:''}</p>
    ${wts?`<p class="sub" style="margin-top:8px">Workouts: ${esc(wts)}</p>`:''}</div>
    ${P.teen?'<p class="note warn">Because you\'re under 18, we keep your target gentle and focus on habits. Please talk to a doctor or parent before changing your diet.</p>':''}
    <p class="note">Estimates only, not medical advice.</p>`},r:()=>null,last:true},
 ];
 const prof=()=>({age:a.age,sex:a.sex,height:a.height,weight:a.weight,goal:+(a.weight-a.lose).toFixed(1),activity:a.activity,pace:+a.pace});
 const $i=()=>document.getElementById('i').value;
 let i=0;
 function draw(err){const s=steps[i];box.innerHTML=`<div class="bar"><i style="width:${(i+1)/steps.length*100}%"></i></div>
  <form class="sv"><h2>${s.q}</h2>${s.sub?`<p class="sub">${s.sub}</p>`:''}${s.h()}${err?`<p class="note warn">${err}</p>`:''}
  <div class="nav">${i?'<button type="button" class="btn ghost" data-back>Back</button>':''}<button class="btn">${s.last?"Let's go":'Next'}</button></div></form>`;
  box.querySelector('input')?.focus()}
 box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.unit){a.unit=b.dataset.unit;return draw()}
  if(b.dataset.back!==undefined){i--;return draw()}
  if(b.disabled)return;if(b.dataset.k){const k=b.dataset.k,v=b.dataset.v;
   if(k==='theme'){a.theme=v;applyTheme(v);return draw()}
   if(b.hasAttribute('data-multi')){a[k]=v==='none'?[]:a[k].includes(v)?a[k].filter(x=>x!==v):[...a[k].filter(x=>x!=='none'),v]}else a[k]=k==='pace'||k==='stepGoal'?+v:v;
   if(!b.hasAttribute('data-multi')&&steps[i].r()===null&&!steps[i].last){i++;}return draw()}});
 box.addEventListener('submit',e=>{e.preventDefault();const err=steps[i].r();if(err)return draw(err);
  if(steps[i].last){Object.assign(S,{name:a.name,unit:a.unit,mainGoal:a.mainGoal,prefs:a.prefs,stepGoal:a.stepGoal,workoutTypes:a.workoutTypes,theme:a.theme,profile:prof()});applyTheme(a.theme);box.remove();return done()}
  i++;draw()});
 draw();
 return {jump:n=>{i=n;draw()}};
}
