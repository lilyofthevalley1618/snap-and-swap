// Weekly workout plans (bodyweight, teen-safe). Tapping a day logs it with MET calories; tapping again undoes it.
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const LEVELS=[['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced']];
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const L={beginner:0,intermediate:1,advanced:2};
const r=(a,lv)=>a[L[lv]];
const MOVES={
 A:lv=>[['Warm-up march',`${r([2,3,3],lv)} min marching in place, swing your arms`],
  ['Squats',`${r(['2×10','3×12','4×15'],lv)} — sit back like into a chair, chest up`],
  [r(['Wall push-ups','Knee push-ups','Push-ups'],lv),`${r(['2×8','3×10','4×10'],lv)} — straight line from head to heels`],
  ['Glute bridge',`${r(['2×10','3×12','3×15'],lv)} — squeeze at the top, lower slowly`],
  ['Plank',`${r(['2×15 s','3×25 s','3×40 s'],lv)} — elbows under shoulders, don't let hips sag`],
  ['Cool-down stretch','3 min: hamstrings, quads, shoulders']],
 B:lv=>[['Warm-up','2 min jumping jacks or step-jacks (step out instead of jumping)'],
  ['Reverse lunges',`${r(['2×6','3×8','4×10'],lv)} each leg — front knee over ankle`],
  ['Superman',`${r(['2×8','3×10','3×12'],lv)} — lift arms and legs gently, look at the floor`],
  ['Dead bug',`${r(['2×6','3×8','3×12'],lv)} each side — low back stays on the floor`],
  [r(['Step-ups on a stair','Step-ups on a stair','Squat to calf raise'],lv),`${r(['2×8','3×10','4×12'],lv)} each leg — hold the rail if you need`],
  ['Side plank',`${r(['2×10 s','3×20 s','3×30 s'],lv)} each side — knees down is fine`],
  ['Cool-down stretch','3 min: hips, calves, chest']],
 yoga:lv=>[['Cat-cow','1 min — move slowly with your breath'],['Child\'s pose','1 min — knees wide, arms long'],
  ['Downward dog',`${r(['3×20 s','3×30 s','4×30 s'],lv)} — bend knees as much as you like`],['Low lunge','45 s each side — sink hips gently'],
  ['Seated forward fold','1 min — reach, no bouncing'],['Lying twist','45 s each side'],['Rest','2 min lying down, slow breaths']],
 home:lv=>[['March or step-jacks','3 min easy'],['High knees',`${r(['4×20 s','5×30 s','6×40 s'],lv)} with 20 s rest`],
  ['Skaters',`${r(['3×20 s','4×30 s','5×40 s'],lv)} — hop or step side to side`],['Dance break','5 min to two songs you like'],['Cool-down walk + stretch','3 min']],
};
// cardio day uses the person's favorite kind of cardio from the survey/profile
const CARDIO={run:['Easy run','run','Run/walk at a pace you can still talk'],walk:['Brisk walk','walk','Walk fast enough to breathe harder but still chat'],
 cardio:['Dance or bike','dance','Dance along to videos or ride a bike, steady effort'],swim:['Easy swim','swim','Mix any strokes, rest at the wall when needed'],
 sports:['Play a sport','basketball','Shoot hoops, kick a ball, anything that keeps you moving']};
function cardioFor(prefs,lv,min,intervals){
  const k=['run','cardio','swim','sports','walk'].find(x=>prefs.includes(x));
  if(!k){return {name:intervals?'Home cardio intervals':'Home cardio',type:intervals?'hiit':'dance',min,moves:MOVES.home(lv)}}
  const [n,type,how]=CARDIO[k];
  if(intervals)return {name:n+' intervals',type,min,moves:[['Warm-up','5 min easy'],['Intervals',`${r([4,6,8],lv)}× 1 min faster, 2 min easy`],['Cool-down','5 min easy, then stretch calves and quads']]};
  return {name:n,type,min,moves:[['Warm-up','5 min easy'],[n,`${min-10} min — ${how}`],['Cool-down','5 min easy + stretch']]};
}
export function weekPlan(lv,prefs=[]){
  const A={name:'Full body A',type:'strength',moves:MOVES.A(lv)},B={name:'Full body B',type:'strength',moves:MOVES.B(lv)};
  const Y={name:prefs.includes('yoga')?'Yoga flow':'Stretch & yoga',type:'yoga',moves:MOVES.yoga(lv)};
  if(lv==='beginner')return [{...A,min:20},null,cardioFor(prefs,lv,25),null,{...B,min:20},{...Y,min:20},null];
  if(lv==='intermediate')return [{...A,min:30},cardioFor(prefs,lv,30),null,{...B,min:30},cardioFor(prefs,lv,30,true),{...Y,min:25},null];
  return [{...A,min:40},cardioFor(prefs,lv,40),null,{...B,min:40},cardioFor(prefs,lv,35,true),{...Y,min:30},null];
}
export function suggestLevel(p){if(!p)return 'beginner';const lv=p.activity==='active'?'advanced':p.activity==='moderate'?'intermediate':'beginner';return p.age<18&&lv==='advanced'?'intermediate':lv}
const iso=d=>d.toLocaleDateString('en-CA');
export function weekDates(ref=new Date()){const d=new Date(ref);const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);return DAYS.map((_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return iso(x)})}
export function planForDate(S,date){const dow=(new Date(date+'T12:00').getDay()+6)%7;return weekPlan(S.planLevel||suggestLevel(S.profile),S.workoutTypes||[])[dow]}

let ctx;export const initPlan=c=>{ctx=c};
export function planView(S,IC){
  const sug=suggestLevel(S.profile),lv=S.planLevel||sug,wp=weekPlan(lv,S.workoutTypes||[]),dates=weekDates(),td=ctx.today(),done=S.planDone||{};
  const n=wp.filter(Boolean).length,k=dates.filter((d,i)=>wp[i]&&done[d]).length;
  return `<div class="card"><h3>Your level</h3><div class="xseg lv">${LEVELS.map(([v,l])=>`<button class="${v===lv?'on':''}" data-lv="${v}">${l}${v===sug?'<small>suggested</small>':''}</button>`).join('')}</div>
   <p class="sub" style="margin:8px 0 0">${lv==='beginner'?'20–25 min, 4 short days. Great place to start.':lv==='intermediate'?'25–30 min, 5 days.':'30–40 min, 5 days. Only if the others feel easy.'} Cardio days use what you like${(S.workoutTypes||[]).length?'':' (set it in Profile)'}.</p></div>
  <div class="card"><div class="row between"><h3 style="margin:0">This week</h3><b>${k} of ${n} done</b></div>
   <div class="pbar"><span style="width:${Math.round(k/n*100)}%"></span></div>
   ${wp.map((w,i)=>{const d=dates[i],past=d<=td,isT=d===td,dn=!!done[d];
    if(!w)return `<div class="pday rest ${isT?'today':''}"><div class="pd"><b>${DAYS[i]}</b><span>${+d.slice(8)}</span></div><div class="grow"><b>Rest day</b><div class="sub">Rest helps muscles grow. A gentle walk is fine.</div></div></div>`;
    return `<div class="pday ${dn?'done':''} ${isT?'today':''}"><div class="pd"><b>${DAYS[i]}</b><span>${+d.slice(8)}</span></div><div class="grow"><b>${esc(w.name)}</b><div class="sub">${w.min} min</div>
     <details><summary>See moves</summary><ol>${w.moves.map(([m,h])=>`<li><b>${esc(m)}</b> — ${esc(h)}</li>`).join('')}</ol></details></div>
     ${past?`<button class="pchk ${dn?'on':''}" data-pday="${d}" aria-label="${dn?'Undo':'Mark done'}">${dn?'✓':''}</button>`:'<span class="sub soon">Soon</span>'}</div>`}).join('')}
   <p class="note" style="margin-bottom:0">Tap the circle when you finish. It logs the workout for you; tap again to undo. Stop if anything hurts.</p></div>`;
}
export function togglePlanDay(S,date){
  const done=S.planDone||(S.planDone={}),W=S.workouts||(S.workouts=[]);
  if(done[date]){const id=done[date].log;S.workouts=W.filter(w=>w.id!==id);delete done[date];return}
  const w=planForDate(S,date);if(!w||date>ctx.today())return;
  const kg=(S.profile?.weight||130)*0.453592,id=Math.max(Date.now(),...W.map(x=>(+x.id||0)+1));
  W.push({id,d:date,type:w.type,min:w.min,kcal:Math.round((ctx.MET[w.type]||5)*kg*w.min/60),name:w.name,plan:true});
  done[date]={log:id,name:w.name};
}
