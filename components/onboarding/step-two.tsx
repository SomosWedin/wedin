'use client'

import Image from 'next/image'
import StepTwoForm from '@/components/forms/onboarding/step-two'
import { useStepTwo } from '@/hooks/onboarding/use-step-two'
import { useOnboarding } from '@/hooks/use-onboarding'
import type { OnboardingDefaults } from '@/lib/onboarding-defaults'
import wedinIcon from '@/public/assets/w-icon.svg'
import type { OnboardingNav } from './step-manager'
import OnboardingStepNav from './step-nav'

export default function OnboardingStepTwo({
  isWedding,
  defaults,
  nav,
}: {
  isWedding: boolean
  defaults: OnboardingDefaults
  nav: OnboardingNav
}) {
  const { handleProfileUpdate, loading } = useOnboarding({
    onAdvance: nav.onAdvance,
  })

  const { form, isValid, handleSubmit } = useStepTwo({
    isWedding,
    defaultValues: {
      name: defaults.name,
      lastName: defaults.lastName,
      partnerName: defaults.partnerName,
      partnerLastName: defaults.partnerLastName,
    },
    onSubmit: handleProfileUpdate,
  })

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-medium text-textSecondary">
          {isWedding
            ? '¿Cómo se llaman los protagonistas del evento?'
            : '¿Cómo te llamas?'}
        </h1>

        <p className="text-secondary400">
          Este nombre será visible en tu página personalizada
        </p>
      </div>

      <StepTwoForm
        form={form}
        isWedding={isWedding}
        isValid={isValid}
        loading={loading}
        onBack={nav.onBack}
        onSubmit={handleSubmit}
      />

      <OnboardingStepNav nav={nav} loading={loading} />
    </div>
  )
}
