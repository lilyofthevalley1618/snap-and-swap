const K='snapswap.v1';
const blank={profile:null,meals:{},weights:[],steps:{},stepGoal:8000,workoutTypes:[]};
export const today=()=>new Date().toLocaleDateString('en-CA');
export function load(){try{return {...blank,...JSON.parse(localStorage.getItem(K))}}catch{return {...blank}}}
export function save(s){localStorage.setItem(K,JSON.stringify(s))}
