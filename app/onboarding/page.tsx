import { getEvent } from '@/actions/data/event'
import { getEventTypes } from '@/actions/data/event-type'
import { getCurrentUser } from '@/actions/get-current-user'
import OnboardingStepManager from '@/components/onboarding/step-manager'
import { isWeddingEventType } from '@/lib/event-type'

export default async function OnboardingPage() {
  const [currentUser, event, eventTypes] = await Promise.all([
    getCurrentUser(),
    getEvent(),
    getEventTypes(),
  ])

  if (!currentUser) {
    return null
  }

  return (
    <div className="h-screen flex items-center justify-center w-full p-6 sm:p-10">
      <OnboardingStepManager
        currentUser={currentUser}
        eventTypes={eventTypes}
        isWedding={Boolean(
          event && !('error' in event) && isWeddingEventType(event.eventType)
        )}
      />
    </div>
  )
}
