import type { EventType } from '@prisma/client'
import Image from 'next/image'
import { FaChevronRight } from 'react-icons/fa6'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useOnboarding } from '@/hooks/use-onboarding'
import { sortEventTypesForOnboarding } from '@/lib/event-type'
import { getEventTypeIcon } from '@/lib/event-type-icons'
import wedinIcon from '@/public/assets/w-icon.svg'
import OnboardingStepper from './stepper'

export default function OnboardingStepOne({
  eventTypes,
}: {
  eventTypes: EventType[]
}) {
  const { handleEventTypeUpdate, loading } = useOnboarding()

  const sortedEventTypes = sortEventTypesForOnboarding(eventTypes)

  return (
    <div className="relative flex flex-col justify-center items-center gap-8 h-full">
      <Image src={wedinIcon} alt="wedin icon" width={78} />

      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-textSecondary text-2xl font-medium">
          ¿Que tipo de evento queres crear?
        </h1>
        <p className="text-secondary400">
          El tema de tu sitio web va a cambiar dependiendo del tipo de evento
        </p>
      </div>

      {sortedEventTypes.length === 0 && (
        <p className="text-secondary400 text-center">
          No hay tipos de evento disponibles en este momento.
        </p>
      )}

      <div className="grid w-full max-w-3xl grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {sortedEventTypes.map(eventType => {
          const Icon = getEventTypeIcon(eventType.key)

          return (
            <Card
              key={eventType.id}
              className={`w-full bg-gray50 border-gray200 hover:bg-gray200 transition-all cursor-pointer rounded-2xl ${
                loading
                  ? 'cursor-not-allowed pointer-events-none opacity-65'
                  : ''
              }`}
              onClick={() => {
                handleEventTypeUpdate(eventType.id)
              }}
            >
              <CardHeader className="p-4 sm:p-6">
                <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={1.5} />
              </CardHeader>
              <CardContent className="flex justify-between items-center gap-1.5 p-4 pt-0 sm:p-6 sm:pt-0">
                <h1 className="text-base sm:text-xl font-bold text-textPrimary">
                  {eventType.name}
                </h1>
                <FaChevronRight className="text-xs sm:text-sm shrink-0" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <OnboardingStepper step={1} />
    </div>
  )
}
