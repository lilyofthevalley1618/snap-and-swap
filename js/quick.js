// One-tap logging: "Log again" (yesterday's meals) and quick-add (most-logged foods + Favorites), with an Undo toast.
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const iso=d=>d.toLocaleDateString('en-CA');
const yday=()=>{const d=new Date();d.setDate(d.getDate()-1);return iso(d)};
let ctx,list=[];export const initQuick=c=>{ctx=c};
const short=(s,n=22)=>s.length>n?s.slice(0,n-1)+'…':s;
const mealType=()=>{const h=new Date().getHours();return h<10?'Breakfast':h<15?'Lunch':h<21?'Dinner':'Snack'};
export function topFoods(S,n=6){
  const known=new Map();for(const f of [...(S.recentFoods||[]),...(S.favFoods||[])])if(f.per100)known.set(f.name.toLowerCase(),f);
  const cnt=new Map();for(const day of Object.values(S.meals||{}))for(const m of day||[])for(const it of (m.items||[{name:m.name}])){const k=String(it.name).toLowerCase();if(known.has(k))cnt.set(k,(cnt.get(k)||0)+1)}
  const top=[...cnt].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k])=>known.get(k));
  for(const f of S.favFoods||[])if(f.per100&&!top.some(t=>t.name.toLowerCase()===f.name.toLowerCase()))top.push(f);
  return top;
}
const serving=f=>{const s=f.servings?.[0];return {g:Math.round(f.lastG||s?.g||100),label:s&&!f.lastG?s.label:null}};
export function quickHTML(S,{again=true}={}){
  list=[];const y=again?(S.meals?.[yday()]||[]):[],foods=topFoods(S);
  if(!y.length&&!foods.length)return '';
  const chip=(kind,item,label,sub)=>{list.push([kind,item]);return `<button class="qchip" data-qa="${list.length-1}"><span class="plus">+</span>${esc(short(label))}<small>${sub}</small></button>`};
  return `${y.length?`<p class="lbl">Log again from yesterday</p><div class="qchips">${y.map(m=>chip('again',m,m.name,`${m.kcal}`)).join('')}</div>`:''}
  ${foods.length?`<p class="lbl">Quick add</p><div class="qchips">${foods.map(f=>{const s=serving(f);return chip('food',f,f.name,`${Math.round(f.per100.kcal*s.g/100)}`)}).join('')}</div>`:''}`;
}
let toastT,lastId=null;
function toast(msg){document.querySelector('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');
  t.innerHTML=`<span>${esc(msg)}</span><button data-undo>Undo</button>`;document.body.appendChild(t);clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),5000)}
// returns true if handled
export function quickClick(S,el){
  if(el.matches('[data-undo]')){const d=S.meals[ctx.today()]||[];S.meals[ctx.today()]=d.filter(m=>m.id!==lastId);lastId=null;ctx.persist();document.querySelector('.toast')?.remove();ctx.refresh();return true}
  if(!el.dataset.qa)return false;const [kind,x]=list[+el.dataset.qa];const day=S.meals[ctx.today()]||(S.meals[ctx.today()]=[]);
  const id=Math.max(Date.now(),...day.map(m=>m.id+1));let m;
  if(kind==='again')m={...JSON.parse(JSON.stringify(x)),id,t:x.t||mealType()};
  else{const s=serving(x),k=s.g/100,p=x.per100;m={id,name:x.name,kcal:Math.round(p.kcal*k),p:Math.round(p.p*k),c:Math.round(p.c*k),f:Math.round(p.f*k),t:mealType(),items:[{name:x.name,g:s.g}]}}
  day.push(m);lastId=id;ctx.persist();ctx.refresh();toast(`Added ${short(m.name,28)} · ${m.kcal} cal`);return true;
}
