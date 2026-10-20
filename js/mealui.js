// Editable meal draft (shared by photo scan + food search) and the search box with Recent / Favorites.
import {localSearch,onlineSearch,dedupe,debounce} from './search.js?v=1';
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=s=>document.querySelector(s);
export const draft={items:[],photo:null,provider:null};
let ctx;export const initMealUI=c=>{ctx=c};

const spread=i=>i.conf==null?0.1:0.2+0.1*(1-Math.max(0,Math.min(1,i.conf)));
const calc=i=>{const k=(+i.grams||0)/100,p=i.per100;return p?{kcal:p.kcal*k,p:p.p*k,c:p.c*k,f:p.f*k}:{kcal:0,p:0,c:0,f:0}};
export function totals(){let t={kcal:0,lo:0,hi:0,p:0,c:0,f:0};for(const i of draft.items){const v=calc(i),s=spread(i);t.kcal+=v.kcal;t.lo+=v.kcal*(1-s);t.hi+=v.kcal*(1+s);t.p+=v.p;t.c+=v.c;t.f+=v.f}
  const r=x=>Math.round(x/5)*5;return {kcal:Math.round(t.kcal),lo:r(t.lo),hi:r(t.hi),p:Math.round(t.p),c:Math.round(t.c),f:Math.round(t.f)}}

// scan result {items:[{name,portion_desc,grams,confidence,per100}]} -> draft
export function loadScan(r,photo){draft.items=r.items.map(i=>({name:i.name,grams:Math.round(i.grams||100),per100:i.per100,conf:i.confidence??0.6,portion:i.portion_desc,servings:i.servings||[]}));draft.photo=photo;draft.provider=r.provider;render()}
export function addFood(res,grams){const s=res.servings||[];draft.items.push({name:res.name,grams:Math.round(grams??(s[0]?.g||100)),per100:res.per100,conf:null,servings:s,src:res.src});if(!draft.provider)draft.provider='search';render();$('#res')?.scrollIntoView({behavior:'smooth',block:'start'})}

function presets(i){const s=(i.servings||[]).slice(0,2),out=[];
  for(const v of s){out.push([v.label,v.g]);if(out.length<3&&/^1 /.test(v.label))out.push([v.label.replace(/^1 /,'2 ')+(/s$/.test(v.label)?'':'s'),v.g*2])}
  out.push(['100 g',100]);const seen=new Set();return out.filter(([l,g])=>{const k=Math.round(g);if(seen.has(k))return false;seen.add(k);return true}).slice(0,4)}
const fmtS=(l,g)=>/^\d+ g$/.test(l)?esc(l):`${esc(l.replace(/\s*\(.*?\)\s*/g,' ').trim())} <span class="g">${Math.round(g)}g</span>`;

export function render(){const box=$('#res');if(!box)return;
  if(!draft.items.length){box.innerHTML=draft.photo?`<img class="photo" src="${draft.photo}" alt=""><p class="sub">No foods left. Add one with the search below.</p>`:'';return}
  const t=totals(),scan=draft.provider==='mock'||draft.provider==='gemini';
  box.innerHTML=`${draft.photo?`<img class="photo" src="${draft.photo}" alt="">`:''}
  <div class="est"><div class="sub">${scan?(draft.provider==='mock'?'Demo estimate':'AI estimate'):'Your meal'}</div>
   <div class="big">${t.kcal} kcal</div><div class="sub">Likely range ${t.lo}–${t.hi} kcal · P${t.p} C${t.c} F${t.f}</div>
   <p class="note" style="margin:8px 0 0">Estimates can be off, edit to fix.</p></div>
  ${draft.items.map((i,n)=>{const v=calc(i);return `<div class="ed" data-i="${n}">
   <div class="row"><input class="edn" data-n="${n}" value="${esc(i.name)}" aria-label="Food name"><button class="x" data-rm="${n}" title="Remove">✕</button></div>
   ${i.per100?`<div class="row edg"><input type="range" class="edr" data-n="${n}" min="5" max="${Math.max(600,Math.ceil(i.grams*2/50)*50)}" step="5" value="${i.grams}" aria-label="Grams">
   <input type="number" class="edgn" data-n="${n}" value="${i.grams}" min="1" max="3000" inputmode="numeric"><span class="sub">g</span></div>
   <div class="chips sm">${presets(i).map(([l,g])=>`<button class="chip ${Math.round(g)===Math.round(i.grams)?'on':''}" data-pre="${n}" data-g="${g}">${fmtS(l,g)}</button>`).join('')}</div>
   <div class="sub">${Math.round(v.kcal)} kcal${i.portion?` · AI saw: ${esc(i.portion)}`:''}${i.conf!=null?` · ${Math.round(i.conf*100)}% sure`:''}</div>`
   :`<p class="sub">Couldn't find nutrition for this. Remove it and search instead.</p>`}</div>`}).join('')}
  <button class="btn ghost sm" id="additem">+ Add item</button>
  <select id="mt" style="margin-top:10px">${['Breakfast','Lunch','Dinner','Snack'].map(x=>`<option ${x===mealType()?'selected':''}>${x}</option>`).join('')}</select>
  <button class="btn" id="addm">Add to log</button>`;
}
const mealType=()=>{const h=new Date().getHours();return h<10?'Breakfast':h<15?'Lunch':h<21?'Dinner':'Snack'};
function refreshTotals(){const t=totals(),e=$('.est');if(!e)return;e.querySelector('.big').textContent=t.kcal+' kcal';e.querySelectorAll('.sub')[1].textContent=`Likely range ${t.lo}–${t.hi} kcal · P${t.p} C${t.c} F${t.f}`;
  document.querySelectorAll('.ed').forEach(d=>{const i=draft.items[+d.dataset.i];const s=d.querySelector(':scope > .sub');if(s&&i.per100)s.firstChild.textContent=Math.round(calc(i).kcal)+' kcal'+(s.firstChild.textContent.replace(/^\d+ kcal/,''))})}
function setGrams(n,g,from){const i=draft.items[n];i.grams=Math.max(1,Math.min(3000,Math.round(+g||0)));const d=document.querySelector(`.ed[data-i="${n}"]`);
  if(from!=='r'){const r=d.querySelector('.edr');if(+r.max<i.grams)r.max=Math.ceil(i.grams/50)*50;r.value=i.grams}if(from!=='n')d.querySelector('.edgn').value=i.grams;
  d.querySelectorAll('[data-pre]').forEach(c=>c.classList.toggle('on',Math.round(+c.dataset.g)===i.grams));refreshTotals()}

export function logDraft(){const t=totals(),S=ctx.S;const day=S.meals[ctx.today()]||(S.meals[ctx.today()]=[]);
  day.push({id:Date.now(),name:draft.items.map(i=>i.name).join(' + '),kcal:t.kcal,p:t.p,c:t.c,f:t.f,t:$('#mt').value,items:draft.items.map(i=>({name:i.name,g:i.grams}))});
  // recent foods: last 20 distinct
  const R=S.recentFoods||(S.recentFoods=[]);for(const i of draft.items){if(!i.per100)continue;const r={key:'r:'+i.name.toLowerCase(),name:i.name,per100:i.per100,servings:i.servings||[],src:i.src||'Scan',lastG:i.grams};const k=R.findIndex(x=>x.name.toLowerCase()===r.name.toLowerCase());if(k>=0)R.splice(k,1);R.unshift(r)}R.length=Math.min(R.length,20);
  draft.items=[];draft.photo=null;draft.provider=null;ctx.persist()}

// ---- search box ----
let lastResults=[],seq=0;
const favs=()=>ctx.S.favFoods||(ctx.S.favFoods=[]);
const isFav=r=>favs().some(f=>f.name.toLowerCase()===r.name.toLowerCase());
const kcalLine=r=>{const s=r.servings?.[0];return s?`${Math.round(r.per100.kcal*s.g/100)} kcal · ${esc(s.label.replace(/\s*\(.*?\)\s*/g,' ').trim())}`:`${Math.round(r.per100.kcal)} kcal · 100 g`};
const row=(r,n,tag)=>`<div class="item fr" data-res="${n}"><div class="grow"><b>${esc(r.name)}</b><div class="sub">${kcalLine(r)}${tag?` · ${tag}`:''}</div></div><button class="star ${isFav(r)?'on':''}" data-star="${n}" aria-label="Favorite">${isFav(r)?'★':'☆'}</button></div>`;
export function searchBox(){return `<input id="q" type="search" autocomplete="off" placeholder="Search foods, e.g. boiled egg, rice, pizza"><div id="ql"></div>`}
export function showIdle(){const ql=$('#ql');if(!ql)return;const F=favs(),R=(ctx.S.recentFoods||[]).filter(r=>!isFav(r));lastResults=[...F,...R];
  ql.innerHTML=(F.length?`<p class="lbl">Favorites</p>${F.map((r,n)=>row(r,n)).join('')}`:'')+(R.length?`<p class="lbl">Recent</p>${R.map((r,n)=>row(r,n+F.length)).join('')}`:'')+(!F.length&&!R.length?'<p class="sub">Foods you log show up here. Tap ☆ to save favorites.</p>':'')}
const goOnline=debounce(async(q,my,local)=>{let on=[];try{on=await onlineSearch(q)}catch{}if(my!==seq)return;
  const loc=new Set(local.map(r=>r.name.toLowerCase()));const extra=dedupe(on).filter(r=>!loc.has(r.name.toLowerCase())).slice(0,8);
  lastResults=[...local,...extra];const ql=$('#ql');if(!ql)return;
  ql.innerHTML=(local.length?local.map((r,n)=>row(r,n)).join(''):'')+(extra.length?`<p class="lbl">More results online</p>${extra.map((r,n)=>row(r,n+local.length,r.src)).join('')}`:'')+(!local.length&&!extra.length?'<p class="sub">No match. Try a simpler word.</p>':'')});
export function onQuery(v){const q=v.trim(),ql=$('#ql');if(!q)return showIdle();const my=++seq;
  const local=localSearch(q,10);lastResults=local;
  ql.innerHTML=local.map((r,n)=>row(r,n)).join('')+(q.length>=3?'<p class="sub searching">Searching online…</p>':'');
  if(q.length>=3)goOnline(q,my,local)}

export function handleClick(e){const t=e.target;
  const st=t.closest('[data-star]');if(st){const r=lastResults[+st.dataset.star];const F=favs(),k=F.findIndex(f=>f.name.toLowerCase()===r.name.toLowerCase());if(k>=0)F.splice(k,1);else F.unshift({key:'f:'+r.name.toLowerCase(),name:r.name,per100:r.per100,servings:r.servings||[],src:r.src});ctx.persist();const q=$('#q')?.value;q?onQuery(q):showIdle();return true}
  const rs=t.closest('[data-res]');if(rs){const r=lastResults[+rs.dataset.res];addFood(r,r.lastG);const q=$('#q');if(q){q.value='';showIdle()}return true}
  const rm=t.closest('[data-rm]');if(rm){draft.items.splice(+rm.dataset.rm,1);render();return true}
  const pr=t.closest('[data-pre]');if(pr){setGrams(+pr.dataset.pre,+pr.dataset.g);return true}
  if(t.closest('#additem')){const q=$('#q');q?.scrollIntoView({behavior:'smooth',block:'center'});q?.focus();return true}
  if(t.closest('#addm')){logDraft();return 'logged'}
  return false}
export function handleInput(e){const t=e.target;
  if(t.id==='q'){onQuery(t.value);return true}
  if(t.classList.contains('edr')){setGrams(+t.dataset.n,t.value,'r');return true}
  if(t.classList.contains('edgn')){if(+t.value>0)setGrams(+t.dataset.n,t.value,'n');return true}
  if(t.classList.contains('edn')){draft.items[+t.dataset.n].name=t.value;return true}
  return false}
