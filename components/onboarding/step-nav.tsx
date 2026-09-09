import type { OnboardingNav } from './step-manager'
import OnboardingStepper from './stepper'

type OnboardingStepNavProps = {
  nav: OnboardingNav
  loading: boolean
}

export default function OnboardingStepNav({
  nav,
  loading,
}: OnboardingStepNavProps) {
  return (
    <OnboardingStepper
      step={nav.step}
      furthestStep={nav.furthestStep}
      onStepClick={loading ? undefined : nav.onStepClick}
    />
  )
}
