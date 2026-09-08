const STEPS = [1, 2, 3, 4, 5]

type OnboardingStepperProps = {
  step: number
  furthestStep?: number
  onStepClick?: (step: number) => void
}

export default function OnboardingStepper({
  step,
  furthestStep = step,
  onStepClick,
}: OnboardingStepperProps) {
  return (
    <div className="flex gap-3">
      {STEPS.map(value => {
        const isClickable =
          Boolean(onStepClick) && value <= furthestStep && value !== step

        return (
          <button
            key={value}
            type="button"
            aria-label={`Paso ${value}`}
            aria-current={value === step ? 'step' : undefined}
            disabled={!isClickable}
            onClick={() => onStepClick?.(value)}
            // The dot is well under a usable tap target, so the hit area is
            // grown separately instead of the dot itself.
            className={`relative h-2 w-2 rounded-full after:absolute after:-inset-1.5 after:content-[''] ${
              value === step ? 'bg-slate400' : 'bg-slate300'
            } ${isClickable ? 'cursor-pointer hover:bg-slate400' : 'cursor-default'}`}
          />
        )
      })}
    </div>
  )
}
