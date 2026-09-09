'use client'

import Image from 'next/image'
import StepFourForm from '@/components/forms/onboarding/step-four'
import { useOnboarding } from '@/hooks/use-onboarding'
import type { OnboardingDefaults } from '@/lib/onboarding-defaults'
import wedinIcon from '@/public/assets/w-icon.svg'
import type { OnboardingNav } from './step-manager'
import OnboardingStepNav from './step-nav'

export default function OnboardingStepFour({
  defaults,
  nav,
}: {
  defaults: OnboardingDefaults
  nav: OnboardingNav
}) {
  const { loading, handleEventDateUpdate } = useOnboarding({
    onAdvance: nav.onAdvance,
  })

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-8">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-medium text-textSecondary">
          ¿Cuándo tendrá lugar este gran día?
        </h1>

        <p className="text-secondary400">
          Configura tu sitio web para esta fecha especial
        </p>
      </div>

      <StepFourForm
        defaultValues={{
          eventDate: defaults.eventDate,
          isDecidingEventDate: defaults.isDecidingEventDate,
        }}
        loading={loading}
        onBack={nav.onBack}
        onSubmit={handleEventDateUpdate}
      />

      <OnboardingStepNav nav={nav} loading={loading} />
    </div>
  )
}
