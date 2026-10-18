// Safety rules live here (see SPEC.md).
export const ACT={sedentary:1.2,light:1.375,moderate:1.55,active:1.725};
export const FLOOR={female:1200,male:1500};
export const TEEN_MAX_DEFICIT=250;
export const lbToKg=l=>l*0.453592, inToCm=i=>i*2.54;
export function bmi(lb,inches){return 703*lb/(inches*inches)}
export function minHealthyWeight(inches){return Math.ceil(18.5*inches*inches/703)}
export function plan(p){
  const kg=lbToKg(p.weight),cm=inToCm(p.height);
  const bmr=10*kg+6.25*cm-5*p.age+(p.sex==='male'?5:-161);
  const tdee=Math.round(bmr*(ACT[p.activity]||1.2));
  const teen=p.age<18;
  let deficit=p.pace==1?500:250; if(teen)deficit=Math.min(deficit,TEEN_MAX_DEFICIT);
  if(p.goal>=p.weight)deficit=0;
  const floor=FLOOR[p.sex]||1200;
  const target=Math.max(floor,Math.round((tdee-deficit)/10)*10);
  const weekly=Math.max(0,(tdee-target)*7/3500); // lb/week actually achievable
  return {bmr:Math.round(bmr),tdee,target,deficit:tdee-target,teen,floor,weekly};
}
export function goalDate(cur,goal,lbPerWeek){
  if(cur<=goal||!lbPerWeek)return null;
  const d=new Date();d.setDate(d.getDate()+Math.ceil((cur-goal)/lbPerWeek*7));return d;
}
export function validate(p){
  const min=minHealthyWeight(p.height);
  if(p.goal<min)return `Let's aim for a goal that keeps you strong and healthy. For your height, that's at least ${min} lb.`;
  if(!(p.age>=13&&p.age<=100))return 'Please enter an age between 13 and 100.';
  return null;
}
