'use client'

import Image from 'next/image'
import StepThreeForm from '@/components/forms/onboarding/step-three'
import { useOnboarding } from '@/hooks/use-onboarding'
import type { OnboardingDefaults } from '@/lib/onboarding-defaults'
import wedinIcon from '@/public/assets/w-icon.svg'
import type { OnboardingNav } from './step-manager'
import OnboardingStepNav from './step-nav'

export default function OnboardingStepThree({
  defaults,
  nav,
}: {
  defaults: OnboardingDefaults
  nav: OnboardingNav
}) {
  const { handleEventLocationUpdate, loading } = useOnboarding({
    onAdvance: nav.onAdvance,
  })

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

      <StepThreeForm
        defaultValues={{
          eventCountry: defaults.eventCountry,
          eventCity: defaults.eventCity,
          isDecidingEventLocation: defaults.isDecidingEventLocation,
        }}
        loading={loading}
        onBack={nav.onBack}
        onSubmit={handleEventLocationUpdate}
      />

      <OnboardingStepNav nav={nav} loading={loading} />
    </div>
  )
}
