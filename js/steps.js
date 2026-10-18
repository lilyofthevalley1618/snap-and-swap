// Steps source interface:
//   name: string; available(): Promise<bool>; getSteps(dateISO): Promise<number>; setSteps?(dateISO,n)
// Future: HealthKitStepsSource (iOS app, via Capacitor plugin), GoogleFitStepsSource / Health Connect (Android).
export class ManualStepsSource{
  constructor(state,save){this.s=state;this.save=save;this.name='manual'}
  async available(){return true}
  async getSteps(d){return this.s.steps[d]||0}
  async setSteps(d,n){this.s.steps[d]=Math.max(0,Math.round(n)||0);this.save(this.s)}
}
