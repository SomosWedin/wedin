import { getEvent } from '@/actions/data/event'
import { getEventTypes } from '@/actions/data/event-type'
import { getCurrentUser } from '@/actions/get-current-user'
import OnboardingStepManager from '@/components/onboarding/step-manager'
import { getOnboardingDefaults } from '@/lib/onboarding-defaults'

export default async function OnboardingPage() {
  const [currentUser, event, eventTypes] = await Promise.all([
    getCurrentUser(),
    getEvent(),
    getEventTypes(),
  ])

  if (!currentUser) {
    return null
  }

  const currentEvent = event && !('error' in event) ? event : null

  return (
    <div className="h-screen flex items-center justify-center w-full p-6 sm:p-10">
      <OnboardingStepManager
        currentUser={currentUser}
        eventTypes={eventTypes}
        eventTypeId={currentEvent?.eventTypeId ?? null}
        defaults={getOnboardingDefaults(currentUser, currentEvent)}
      />
    </div>
  )
}
