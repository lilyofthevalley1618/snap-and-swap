// 30-day challenge card for Home. Lives in S.challenge so it syncs with the rest of the save.
import {planForDate} from './plan.js?v=1';
const DAY=864e5, LEN=30;
const iso=d=>d.toLocaleDateString('en-CA');
const parse=s=>new Date(s+'T12:00:00');            // noon avoids DST edge cases
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d)};
const diff=(a,b)=>Math.round((parse(b)-parse(a))/DAY);
let ctx,pick='today',custom='',editing=false;
export const initChallenge=c=>{ctx=c};

export function checks(S,d,target){
  const ms=S.meals?.[d]||[],kcal=ms.reduce((a,m)=>a+(+m.kcal||0),0);
  const rest=!planForDate(S,d),moved=(S.workouts||[]).some(w=>w.d===d);
  return {meal:ms.length>0,under:ms.length>0&&kcal<=target,move:moved||rest,rest:rest&&!moved};
}
const full=c=>c.meal&&c.under&&c.move;
export function stats(S,target){
  const ch=S.challenge,td=ctx.today(),end=addDays(ch.start,LEN-1),last=td<end?td:end;
  let done=0,best=0,run=0,streak=0;
  for(let d=ch.start;d<=last;d=addDays(d,1)){const f=full(checks(S,d,target));if(f){done++;run++;best=Math.max(best,run)}else if(d!==td)run=0}
  // current streak: ending today if today is done, else ending yesterday
  for(let d=full(checks(S,td,target))?td:addDays(td,-1);d>=ch.start;d=addDays(d,-1)){if(full(checks(S,d,target)))streak++;else break}
  const ws=(S.weights||[]).filter(w=>w.d>=addDays(ch.start,-3)&&w.d<=end),wchg=ws.length>1?ws.at(-1).w-ws[0].w:null;
  const workouts=(S.workouts||[]).filter(w=>w.d>=ch.start&&w.d<=end).length;
  return {done,best,streak,workouts,wchg,day:diff(ch.start,td)+1,end};
}
function nextMonday(){const d=new Date();const k=((8-d.getDay())%7)||7;d.setDate(d.getDate()+k);return iso(d)}
const startFor=()=>pick==='today'?ctx.today():pick==='tomorrow'?addDays(ctx.today(),1):pick==='monday'?nextMonday():custom;
const fmt=s=>parse(s).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});

function startCard(again){const s=startFor();
  return `<div class="card chal"><h3>30-day challenge</h3><p><b>When do you want to start your 30-day challenge?</b></p>
  <div class="chips pick">${[['today','Today'],['tomorrow','Tomorrow'],['monday','Next Monday']].map(([v,l])=>`<button class="chip ${pick===v?'on':''}" data-chpick="${v}">${l}</button>`).join('')}
   <label class="chip datechip ${pick==='date'?'on':''}">Pick a date<input type="date" id="chdate" min="${ctx.today()}" value="${custom}"></label></div>
  <p class="sub">${s?`Starts ${fmt(s)}, ends ${fmt(addDays(s,LEN-1))}.`:'Choose a date.'} Each day: log a meal, stay under your target, and move (rest days count).</p>
  <button class="btn" id="chstart" ${s?'':'disabled'}>${again?'Save start date':'Start challenge'}</button>${again?'<button class="linkbtn" id="chcancel">Cancel</button>':''}</div>`}

export function challengeCard(S,target,ring,compact){
  if(!S.challenge||editing)return startCard(!!S.challenge);
  const td=ctx.today(),st=stats(S,target);
  if(st.day<1)return `<div class="card chal"><h3>30-day challenge</h3><p class="big" style="font-size:22px">Starts ${fmt(S.challenge.start)}</p><p class="sub">${-st.day+1===1?'Tomorrow':`In ${-st.day+1} days`} — get ready!</p><button class="linkbtn" id="chedit">Change start date</button></div>`;
  if(st.day>LEN)return `<div class="card chal fin"><h3>You finished 30 days!</h3><p class="sub">${fmt(S.challenge.start)} – ${fmt(st.end)}</p>
   <div class="stats"><div><b>${st.done}</b><span>of 30 days done</span></div><div><b>${st.best}</b><span>best streak</span></div><div><b>${st.workouts}</b><span>workouts</span></div><div><b>${st.wchg==null?'—':(st.wchg>0?'+':'')+st.wchg.toFixed(1)+' lb'}</b><span>weight change</span></div></div>
   <p class="note">Every day you showed up counts. Be proud of the habits you built.</p><button class="btn" id="chrestart">Start a new challenge</button></div>`;
  const c=checks(S,td,target);
  if(compact){const pill=(ok,l)=>`<span class="cpill ${ok?'ok':''}"><span class="ck">${ok?'✓':''}</span>${l}</span>`;
   return `<div class="card chal compact"><div class="row" style="gap:12px;align-items:center">${ring(st.day,LEN,'of 30',76)}
    <div class="grow"><div class="row between"><b>Day ${st.day} of 30</b><span class="streak">${st.streak} day streak</span></div>
    <div class="cpills">${pill(c.meal,'Meal')}${pill(c.under,'Under target')}${pill(c.move,c.rest?'Rest day':'Move')}</div></div></div></div>`}
  const row=(ok,t,sub)=>`<li class="${ok?'ok':''}"><span class="ck">${ok?'✓':''}</span><div>${t}${sub?`<small>${sub}</small>`:''}</div></li>`;
  return `<div class="card chal"><div class="row between"><h3 style="margin:0">30-day challenge</h3><span class="streak">${st.streak} day streak</span></div>
   <div class="row" style="gap:14px;align-items:center;margin-top:8px">${ring(st.day,LEN,'of 30',110)}
   <div class="grow"><b style="font-size:20px">Day ${st.day} of 30</b><p class="sub" style="margin:2px 0 0">${st.done} full days so far · best streak ${st.best}</p></div></div>
   <p class="lbl">Today</p><ul class="chk">${row(c.meal,'Log at least 1 meal')}${row(c.under,'Stay under your calorie target',c.meal?'':'Log a meal first')}${row(c.move,c.rest?'Rest day — counts as done':'Do your plan workout or any workout')}</ul>
   <div class="row between" style="margin-top:6px"><button class="linkbtn" id="chedit">Change start date</button><button class="linkbtn" id="chrestart">Restart</button></div></div>`;
}
// returns true when handled (caller re-renders Home)
export function challengeClick(S,el){
  if(el.dataset.chpick){pick=el.dataset.chpick;return true}
  if(el.id==='chstart'){const s=startFor();if(!s)return true;if(S.challenge&&!confirm('Change your start date? Days are counted again from the new date.'))return true;S.challenge={start:s};editing=false;ctx.persist();return true}
  if(el.id==='chedit'){editing=true;pick='date';custom=S.challenge.start>=ctx.today()?S.challenge.start:ctx.today();return true}
  if(el.id==='chcancel'){editing=false;return true}
  if(el.id==='chrestart'){if(!confirm('Restart your 30-day challenge? Your logs stay; the challenge count starts over.'))return true;S.challenge=null;editing=false;pick='today';ctx.persist();return true}
  return false}
export function challengeChange(e){if(e.target.id==='chdate'&&e.target.value){custom=e.target.value;pick='date';return true}return false}
