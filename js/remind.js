// Daily reminder: opt-in toggle in Profile. Permission is only requested after the in-app explainer (never on load).
const MSG='Your sprout is thirsty 🌱 log a meal?', TAG='daily-reminder';
let ctx,mode=null;export const initRemind=c=>{ctx=c};
const R=S=>S.reminder||(S.reminder={on:false,time:'12:30'});
const supported=()=>'Notification' in window&&'serviceWorker' in navigator;
const perm=()=>supported()?Notification.permission:'unsupported';
const reg=()=>navigator.serviceWorker?.ready;
export function registerSW(){if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js?v=1').catch(()=>{})}
const fmt=t=>{const [h,m]=t.split(':').map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};

export function reminderCard(S){const r=R(S),p=perm();
  if(mode==='explain')return `<div class="card explain" id="remcard"><h3>Want a daily reminder?</h3>
   <p class="sub" style="margin:0">One gentle nudge at ${fmt(r.time)}, only if you haven't logged food yet that day. Turn it off anytime.</p>
   <p class="sub">Next, your browser will ask to allow notifications.</p>
   <div class="row"><button class="btn" id="remAllow">Allow</button><button class="btn ghost" id="remLater">Not now</button></div></div>`;
  return `<div class="card" id="remcard"><label class="switch"><span><b>Daily reminder</b><span class="sub" style="display:block">A nudge if you haven't logged food</span></span>
   <input type="checkbox" id="remOn" ${r.on&&p==='granted'?'checked':''} ${p==='unsupported'?'disabled':''} aria-label="Daily reminder"></label>
   <div class="row between" style="margin-top:12px"><label for="remTime" style="margin:0">Time</label><input type="time" id="remTime" value="${r.time}" style="width:140px" ${r.on?'':'disabled'}></div>
   ${p==='denied'?`<p class="note warn">Notifications are blocked for this site. To turn them back on, open your browser's site settings (tap the lock or "aA" icon by the address), set Notifications to Allow, then come back here.</p>`:''}
   ${p==='unsupported'?'<p class="note">This browser can\'t show notifications.</p>':''}
   <p class="sub small" style="margin:10px 0 0">On iPhone, reminders only work after you add Snap &amp; Swap to your Home Screen (Share, then Add to Home Screen). Phones may not deliver a reminder while the app is fully closed. There's no push server, so it stays free.</p></div>`}

async function syncState(S){const r=R(S);try{const c=await caches.open('snapswap-state'),old=await (await c.match('state'))?.json().catch(()=>null)||{};
  await c.put('state',new Response(JSON.stringify({on:r.on,time:r.time,loggedDay:(S.meals?.[ctx.today()]||[]).length?ctx.today():old.loggedDay||'',notifiedDay:r.notifiedDay||old.notifiedDay||''})))}catch{}}
function nextAt(time){const [h,m]=time.split(':').map(Number),d=new Date();d.setHours(h,m,0,0);if(d<=new Date())d.setDate(d.getDate()+1);return d}
export async function schedule(S){const r=R(S);await syncState(S);if(!supported())return;const g=await reg();if(!g)return;
  // Notification Triggers (experimental, few browsers)
  try{if('showTrigger' in Notification.prototype){for(const n of await g.getNotifications({tag:TAG,includeTriggered:true}))n.close();
    if(r.on)await g.showNotification('Snap & Swap',{body:MSG,tag:TAG,icon:'icons/icon-192.png',showTrigger:new TimestampTrigger(+nextAt(r.time))})}}catch{}
  // Periodic Background Sync (Chrome/Android, installed app)
  try{if('periodicSync' in g){if(r.on){const s=await navigator.permissions.query({name:'periodic-background-sync'});if(s.state==='granted')await g.periodicSync.register(TAG,{minInterval:60*60*1000})}else await g.periodicSync.unregister(TAG)}}catch{}
}
// fallback: on app open, after the set time, nothing logged today -> show it once per day
export async function checkOnOpen(S){const r=R(S),td=ctx.today();if(!r.on||perm()!=='granted'||r.notifiedDay===td)return;
  const [h,m]=r.time.split(':').map(Number),now=new Date();if(now.getHours()*60+now.getMinutes()<h*60+m)return;
  if((S.meals?.[td]||[]).length)return;
  try{const g=await reg();await g.showNotification('Snap & Swap',{body:MSG,tag:TAG,icon:'icons/icon-192.png'});r.notifiedDay=td;ctx.persist();syncState(S)}catch{}}
export const onSave=S=>{if(R(S).on)syncState(S)};

// handlers: return true if handled (caller re-renders Profile)
export async function remindClick(S,el){const r=R(S);
  if(el.id==='remLater'){mode=null;r.on=false;r.asked='later';ctx.persist();return true}
  if(el.id==='remAllow'){mode=null;let p='denied';try{p=await Notification.requestPermission()}catch{}
    r.on=p==='granted';r.asked=p;ctx.persist();await schedule(S);return true}
  return false}
export async function remindChange(S,e){const r=R(S),t=e.target;
  if(t.id==='remTime'&&t.value){r.time=t.value;r.notifiedDay='';ctx.persist();await schedule(S);return true}
  if(t.id!=='remOn')return false;
  if(!t.checked){r.on=false;ctx.persist();await schedule(S);return true}
  const p=perm();if(p==='granted'){r.on=true;ctx.persist();await schedule(S);return true}
  if(p==='denied'){r.on=false;return true}
  mode='explain';return true}
