type OnboardingStepperProps = {
  step: number;
};

export default function OnboardingStepper({
  step,
}: OnboardingStepperProps) {

  return (
    <div className="absolute bottom-0 flex gap-3">
      <div className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-slate400' : 'bg-slate300'}`}></div>
      <div className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-slate400' : 'bg-slate300'}`}></div>
      <div className={`h-2 w-2 rounded-full ${step === 3 ? 'bg-slate400' : 'bg-slate300'}`}></div>
      <div className={`h-2 w-2 rounded-full ${step === 4 ? 'bg-slate400' : 'bg-slate300'}`}></div>
      <div className={`h-2 w-2 rounded-full ${step === 5 ? 'bg-slate400' : 'bg-slate300'}`}></div>
    </div>
  );
}
