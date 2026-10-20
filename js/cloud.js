// Optional Google sign-in + Firestore sync (Firebase project zapling-1492d, collection snapswap_users/{uid}).
// Guest mode is the default and never loads Firebase. localStorage stays the offline copy.
// The web config below is PUBLIC by design (it identifies the project; access is enforced by Firestore rules).
const FB_CFG={apiKey:'AIzaSyDMzEHbnOU3TLbQflpSvGLrCPfw_MkNKGY',authDomain:'zapling-1492d.firebaseapp.com',projectId:'zapling-1492d',storageBucket:'zapling-1492d.firebasestorage.app',messagingSenderId:'589701782863',appId:'1:589701782863:web:f9d79f46d5183bdcb5f93a'};
export const SHOW_SIGNIN=false; // flip to true once Firestore rules are published (RULES_SETUP.md)
const FB_V='12.3.0',SYNC_KEY='snapswap.sync',COL='snapswap_users';
export const CLOUD={fb:null,user:null,status:'',err:'',t:null,pulled:0,onChange:null};
let ctx;export const initCloud=c=>{ctx=c;window.__cloudSoon=()=>{if(!CLOUD.user)return;clearTimeout(CLOUD.t);CLOUD.t=setTimeout(()=>push().catch(fail),3000)}};
export const syncInfo=()=>{try{return JSON.parse(localStorage.getItem(SYNC_KEY))||{}}catch{return {}}};
const setSync=o=>{try{localStorage.setItem(SYNC_KEY,JSON.stringify(o))}catch{}};
const ui=()=>CLOUD.onChange&&CLOUD.onChange();

function fbLoad(){
  if(!SHOW_SIGNIN)return Promise.reject(new Error('sign-in hidden'));
  if(CLOUD.fb)return CLOUD.fb;const u=m=>`https://www.gstatic.com/firebasejs/${FB_V}/firebase-${m}.js`;
  CLOUD.fb=Promise.all([import(u('app')),import(u('auth')),import(u('firestore'))]).then(([A,Au,F])=>{
    const app=A.initializeApp(FB_CFG),auth=Au.getAuth(app),db=F.getFirestore(app),fb={A,Au,F,app,auth,db};
    if(syncInfo().redirect){setSync({...syncInfo(),redirect:0});Au.getRedirectResult(auth).catch(fail)}
    Au.onAuthStateChanged(auth,user=>onUser(user));return fb;
  }).catch(e=>{CLOUD.fb=null;throw e});
  return CLOUD.fb;
}
function fail(e){const c=(e&&e.code)||'';CLOUD.status='';
  CLOUD.err=c==='auth/unauthorized-domain'?'This web address isn\'t allowed for sign-in yet.':c==='auth/network-request-failed'||!navigator.onLine?'You seem to be offline. Your data is still saved on this device.':c==='permission-denied'?'The cloud refused access. (The database rules may not be set up yet.)':'Sign-in or sync didn\'t work. Your data is still saved on this device.';ui()}
export async function signIn(){
  CLOUD.err='';CLOUD.status='Opening Google…';ui();
  let fb;try{fb=await fbLoad()}catch{return fail({code:'auth/network-request-failed'})}
  const prov=new fb.Au.GoogleAuthProvider();prov.setCustomParameters({prompt:'select_account'});
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  try{if(standalone)throw {code:'auth/popup-blocked'};await fb.Au.signInWithPopup(fb.auth,prov)}
  catch(e){if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment','auth/web-storage-unsupported'].includes(e.code)){setSync({...syncInfo(),redirect:1});return fb.Au.signInWithRedirect(fb.auth,prov).catch(fail)}
    if(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request'){CLOUD.status='';return ui()}fail(e)}
}
export async function signOut(){
  clearTimeout(CLOUD.t);try{if(CLOUD.user)await push()}catch{}
  try{const fb=await fbLoad();await fb.Au.signOut(fb.auth)}catch{}
  CLOUD.user=null;CLOUD.status='';setSync({welcomed:1});ui();
}
async function onUser(user){CLOUD.user=user||null;if(!user){if(syncInfo().uid)setSync({welcomed:1});return ui()}
  setSync({uid:user.uid,welcomed:1});await pull()}

// ---- storage layout: main doc {save: JSON (everything but meals), updatedAt, app}, meals split by month in a subcollection
//      snapswap_users/{uid}/meals/{YYYY-MM} = {days: JSON}. Keeps every doc far below Firestore's 1 MB limit.
const months=meals=>{const m={};for(const [d,v] of Object.entries(meals||{}))(m[d.slice(0,7)]||(m[d.slice(0,7)]={}))[d]=v;return m};
const lastPushed={};
export async function pull(){
  if(!CLOUD.user)return;CLOUD.err='';CLOUD.status='Syncing…';ui();CLOUD.pulled=Date.now();
  try{const fb=await fbLoad(),{F,db}=fb,uid=CLOUD.user.uid,snap=await F.getDoc(F.doc(db,COL,uid));
    if(snap.exists()){let cloud={};try{cloud=JSON.parse(snap.data().save)||{}}catch{}
      const ms=await F.getDocs(F.collection(db,COL,uid,'meals'));cloud.meals={};
      ms.forEach(d=>{try{Object.assign(cloud.meals,JSON.parse(d.data().days))}catch{}});
      const before=JSON.stringify(ctx.S);const m=merge(ctx.S,cloud);for(const k of Object.keys(ctx.S))delete ctx.S[k];Object.assign(ctx.S,m);
      localStorage.setItem('snapswap.v1',JSON.stringify(ctx.S));if(JSON.stringify(ctx.S)!==before&&ctx.onData)ctx.onData()}
    await push();
  }catch(e){fail(e)}
}
export async function push(){
  if(!CLOUD.user)return;const {F,db}=await fbLoad(),uid=CLOUD.user.uid,{meals,...rest}=ctx.S;
  const batch=F.writeBatch(db);batch.set(F.doc(db,COL,uid),{save:JSON.stringify(rest),updatedAt:F.serverTimestamp(),app:'snapswap'});
  for(const [mo,days] of Object.entries(months(meals))){const j=JSON.stringify(days);if(lastPushed[uid+mo]===j)continue;batch.set(F.doc(db,COL,uid,'meals',mo),{days:j});lastPushed[uid+mo]=j}
  await batch.commit();
  CLOUD.status='Synced '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});CLOUD.err='';ui();
}

// ---- merge guest/device data with the cloud copy: nothing logged is lost ----
export function merge(a,b){
  const cl=x=>x==null?x:JSON.parse(JSON.stringify(x));if(!b||!Object.keys(b).length)return cl(a);if(!a||!a.profile&&!Object.keys(a.meals||{}).length)return {...cl(a),...cl(b)};
  const base=b.profile?b:a,m={...cl(a),...cl(base)};                   // settings: cloud wins when it has a profile
  const byId=(x=[],y=[])=>{const o=new Map();[...x,...y].forEach(i=>o.set(String(i.id??i.name??JSON.stringify(i)),i));return [...o.values()]};
  m.meals={};for(const d of new Set([...Object.keys(a.meals||{}),...Object.keys(b.meals||{})]))m.meals[d]=byId(a.meals?.[d],b.meals?.[d]);
  m.workouts=byId(a.workouts,b.workouts).sort((x,y)=>x.d<y.d?-1:1);
  const wd=new Map();[...(b.weights||[]),...(a.weights||[])].forEach(w=>wd.set(w.d,w));m.weights=[...wd.values()].sort((x,y)=>x.d<y.d?-1:1);
  m.steps={...(b.steps||{})};for(const [d,v] of Object.entries(a.steps||{}))m.steps[d]=Math.max(+v||0,+m.steps[d]||0);
  m.planDone={...(b.planDone||{}),...(a.planDone||{})};
  m.favFoods=byId([...(a.favFoods||[])].map(x=>({...x,id:x.name.toLowerCase()})),(b.favFoods||[]).map(x=>({...x,id:x.name.toLowerCase()}))).map(({id,...x})=>x);
  m.recentFoods=[...(a.recentFoods||[]),...(b.recentFoods||[])].filter((x,i,s)=>s.findIndex(y=>y.name.toLowerCase()===x.name.toLowerCase())===i).slice(0,20);
  m.challenge=b.challenge??a.challenge??null;
  return m;
}
export const GLOGO='<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function accountCard(){if(!SHOW_SIGNIN)return '';const u=CLOUD.user;
  return `<div class="card" id="acct"><h3>Account</h3>${u?`<div class="row between"><div><b>${esc(u.displayName||'Signed in')}</b><div class="sub">${esc(u.email||'')}</div></div><button class="btn sm ghost" id="signout" style="width:auto">Sign out</button></div>
   <p class="sub" style="margin:8px 0 0">${esc(CLOUD.status||'Your data syncs to your Google account.')}</p>`
  :`<p class="sub">You're using Snap &amp; Swap as a guest. Your data is only on this device. Sign in to back it up and use it on other devices.</p>
   <button class="gbtn" id="signin" ${CLOUD.status?'disabled':''}>${GLOGO}<span>${esc(CLOUD.status||'Sign in with Google')}</span></button>`}
   ${CLOUD.err?`<p class="note warn" style="margin:8px 0 0">${esc(CLOUD.err)}</p>`:''}</div>`}
export function welcomeHTML(){return `<div class="welcome"><div class="wlogo"><img src="icons/icon-192.png?v=3" alt="" width="84" height="84"></div><h1>Snap &amp; Swap</h1>
  <p class="sub">Snap meals, find easy swaps, and build healthy habits.</p>
  <button class="gbtn wide" id="wGoogle">${GLOGO}<span>Continue with Google</span></button>
  <button class="btn ghost" id="wGuest">Continue as guest</button>
  <p class="sub small">Guest data stays on this device. You can sign in later from Profile, and your guest data comes with you.</p><p id="wErr" class="note warn" hidden></p></div>`}
// returning user who signed in before: restore the session quietly
export const maybeResume=()=>{if(!SHOW_SIGNIN)return;if(syncInfo().uid||syncInfo().redirect)setTimeout(()=>fbLoad().catch(()=>{}),600)};
document.addEventListener('visibilitychange',()=>{if(SHOW_SIGNIN&&!document.hidden&&CLOUD.user&&Date.now()-CLOUD.pulled>60000)pull()});
