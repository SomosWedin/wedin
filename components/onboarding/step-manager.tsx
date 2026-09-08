'use client'

import type { EventType, User } from '@prisma/client'
import { useState } from 'react'
import OnboardingStepFive from '@/components/onboarding/step-five'
import OnboardingStepFour from '@/components/onboarding/step-four'
import OnboardingStepOne from '@/components/onboarding/step-one'
import OnboardingStepSix from '@/components/onboarding/step-six'
import OnboardingStepThree from '@/components/onboarding/step-three'
import OnboardingStepTwo from '@/components/onboarding/step-two'
import { isWeddingEventType } from '@/lib/event-type'
import type { OnboardingDefaults } from '@/lib/onboarding-defaults'

export type OnboardingNav = {
  step: number
  furthestStep: number
  onAdvance: (nextStep: number) => void
  onBack: () => void
  onStepClick: (step: number) => void
}

type OnboardingStepManagerProps = {
  currentUser: User
  eventTypes: EventType[]
  eventTypeId: string | null
  defaults: OnboardingDefaults
}

export default function OnboardingStepManager({
  currentUser,
  eventTypes,
  eventTypeId,
  defaults,
}: OnboardingStepManagerProps) {
  const storedStep = currentUser.onboardingStep || 1

  const [viewStep, setViewStep] = useState(storedStep)
  const [selectedEventTypeId, setSelectedEventTypeId] = useState(eventTypeId)

  // viewStep only runs ahead of the stored step right after a save that already
  // wrote it, so this stays correct while the server prop catches up.
  const furthestStep = Math.max(storedStep, viewStep)

  // Held on the client so step two gets the right event type immediately after
  // step one, instead of waiting for the router refresh to land.
  const isWedding = isWeddingEventType(
    eventTypes.find(eventType => eventType.id === selectedEventTypeId)
  )

  const nav: OnboardingNav = {
    step: viewStep,
    furthestStep,
    onAdvance: setViewStep,
    onBack: () => setViewStep(step => Math.max(1, step - 1)),
    onStepClick: step => setViewStep(Math.min(step, furthestStep)),
  }

  return (
    <>
      {viewStep === 1 && (
        <OnboardingStepOne
          eventTypes={eventTypes}
          selectedEventTypeId={selectedEventTypeId}
          onEventTypeSelected={setSelectedEventTypeId}
          nav={nav}
        />
      )}
      {viewStep === 2 && (
        <OnboardingStepTwo
          key={selectedEventTypeId ?? 'sin-tipo'}
          isWedding={isWedding}
          defaults={defaults}
          nav={nav}
        />
      )}
      {viewStep === 3 && <OnboardingStepThree defaults={defaults} nav={nav} />}
      {viewStep === 4 && <OnboardingStepFour defaults={defaults} nav={nav} />}
      {viewStep === 5 && <OnboardingStepFive nav={nav} />}
      {viewStep === 6 && <OnboardingStepSix />}
    </>
  )
}
