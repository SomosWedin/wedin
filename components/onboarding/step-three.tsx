'use client'

import Image from 'next/image'
import StepThreeForm from '@/components/forms/onboarding/step-three'
import { useOnboarding } from '@/hooks/use-onboarding'
import wedinIcon from '@/public/assets/w-icon.svg'
import OnboardingStepper from './stepper'

export default function OnboardingStepThree() {
  const { handleEventLocationUpdate, loading } = useOnboarding()

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-medium text-textSecondary">
          ¿Dónde se celebrará tu evento?
        </h1>

        <p className="text-secondary400">
          La ubicación ayudará a personalizar la experiencia de tus invitados
        </p>
      </div>

      <StepThreeForm loading={loading} onSubmit={handleEventLocationUpdate} />

      <OnboardingStepper step={3} />
    </div>
  )
}
