const K='snapswap.v1';
const blank={profile:null,meals:{},weights:[],steps:{},stepGoal:8000,workoutTypes:[],theme:'sage'};
export const today=()=>new Date().toLocaleDateString('en-CA');
export function load(){try{return {...blank,...JSON.parse(localStorage.getItem(K))}}catch{return {...blank}}}
export function save(s){localStorage.setItem(K,JSON.stringify(s));if(window.__cloudSoon)window.__cloudSoon()}
export function applyTheme(t){
 if(t==='plum')document.documentElement.setAttribute('data-theme','plum');
 else document.documentElement.removeAttribute('data-theme');
}
