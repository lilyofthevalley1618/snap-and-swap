// Snap & Swap service worker: daily reminder only (no caching, no push server).
const STATE='snapswap-state', MSG='Your sprout is thirsty 🌱 log a meal?';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
async function readState(){try{const c=await caches.open(STATE),r=await c.match('state');return r?await r.json():null}catch{return null}}
async function writeState(s){const c=await caches.open(STATE);await c.put('state',new Response(JSON.stringify(s)))}
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
// periodicsync (Chrome/Android, installed app only): browser wakes us roughly when it likes; we check the time ourselves
self.addEventListener('periodicsync',e=>{if(e.tag!=='daily-reminder')return;e.waitUntil((async()=>{
  const s=await readState();if(!s||!s.on)return;const now=new Date(),td=iso(now),[h,m]=s.time.split(':').map(Number);
  if(now.getHours()*60+now.getMinutes()<h*60+m||s.loggedDay===td||s.notifiedDay===td)return;
  await self.registration.showNotification('Snap & Swap',{body:MSG,icon:'icons/icon-192.png',badge:'icons/favicon-32.png',tag:'daily-reminder'});
  await writeState({...s,notifiedDay:td});
})())});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{
  const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const c of all){if('focus' in c){c.navigate&&c.navigate('./#snap');return c.focus()}}
  return self.clients.openWindow('./#snap');
})())});
