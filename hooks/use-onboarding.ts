import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import type { z } from 'zod'
import {
  updateEventDateStepFour,
  updateEventLocationStepThree,
  updateEventTypeStepOne,
  updateProfileStepTwo,
  updateUserOnboardedStepFive,
} from '@/actions/common/onboarding'
import { useToast } from '@/hooks/use-toast'
import {
  StepFourSchema,
  StepThreeSchema,
  StepTwoSchema,
} from '@/schemas/onboarding'

type UseOnboardingProps = {
  onAdvance?: (nextStep: number) => void
  onEventTypeSelected?: (eventTypeId: string) => void
}

export const useOnboarding = ({
  onAdvance,
  onEventTypeSelected,
}: UseOnboardingProps = {}) => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { update } = useSession()

  // The refresh is what re-reads the saved values for a later back-navigation;
  // moving to the next step no longer waits on it.
  const goToNextStep = (nextStep: number) => {
    router.refresh()
    setLoading(false)
    onAdvance?.(nextStep)
  }

  // Step One
  const handleEventTypeUpdate = async (eventTypeId: string) => {
    setLoading(true)

    try {
      const response = await updateEventTypeStepOne(eventTypeId)

      if (!response.success) {
        toast({
          variant: 'destructive',
          description: response.error,
        })
        setLoading(false)
        return
      }

      onEventTypeSelected?.(eventTypeId)
      goToNextStep(2)
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Ocurrió un error al crear tu evento, intenta de nuevo.',
      })
      setLoading(false)
    }
  }

  // Step Two
  const handleProfileUpdate = async (values: z.infer<typeof StepTwoSchema>) => {
    setLoading(true)

    const validatedFields = StepTwoSchema.safeParse(values)

    if (!validatedFields.success) {
      toast({
        variant: 'destructive',
        description: validatedFields.error.errors
          .map(err => err.message)
          .join(', '),
      })
      setLoading(false)
      return
    }

    try {
      const response = await updateProfileStepTwo(validatedFields.data)

      if (!response?.success) {
        toast({
          variant: 'destructive',
          title: 'Error en el paso 2. Intenta de nuevo.',
          description: response?.error,
        })
        setLoading(false)
        return
      }

      goToNextStep(3)
    } catch (error) {
      toast({
        variant: 'destructive',
        description:
          'Ocurrió un error procesando tu solicitud. Intenta de nuevo.',
      })
      setLoading(false)
    }
  }

  // Step Three
  const handleEventLocationUpdate = async (
    values: z.infer<typeof StepThreeSchema>
  ) => {
    setLoading(true)
    const validatedFields = StepThreeSchema.safeParse(values)

    if (!validatedFields.success) {
      toast({
        variant: 'destructive',
        description: validatedFields.error.errors
          .map(err => err.message)
          .join(', '),
      })
      setLoading(false)
      return
    }

    try {
      const response = await updateEventLocationStepThree(validatedFields.data)

      if (!response?.success) {
        toast({
          variant: 'destructive',
          title: 'Error en el paso 3. Intenta de nuevo.',
          description: response?.error,
        })
        setLoading(false)
        return
      }

      goToNextStep(4)
    } catch (error) {
      toast({
        variant: 'destructive',
        description:
          'Ocurrió un error procesando tu solicitud. Intenta de nuevo.',
      })
      setLoading(false)
    }
  }

  //Step Four
  const handleEventDateUpdate = async (
    values: z.infer<typeof StepFourSchema>
  ) => {
    setLoading(true)
    const validatedFields = StepFourSchema.safeParse(values)

    if (!validatedFields.success) {
      toast({
        variant: 'destructive',
        description: validatedFields.error.errors
          .map(err => err.message)
          .join(', '),
      })
      setLoading(false)
      return
    }

    try {
      const response = await updateEventDateStepFour(validatedFields.data)

      if (!response?.success) {
        toast({
          variant: 'destructive',
          title: 'Error en el paso 4. Intenta de nuevo.',
          description: response?.error,
        })
        setLoading(false)
        return
      }

      goToNextStep(5)
    } catch (error) {
      toast({
        variant: 'destructive',
        description:
          'Ocurrió un error procesando tu solicitud. Intenta de nuevo.',
      })
      setLoading(false)
    }
  }

  // Step Five
  const handleCompleteOnboarding = async () => {
    setLoading(true)

    try {
      const response = await updateUserOnboardedStepFive()

      if (response?.error) {
        toast({
          variant: 'destructive',
          title: 'Error finalizando el onboarding. Intenta de nuevo.',
          description: response.error,
        })
        setLoading(false)
        return
      }

      await update()
      window.location.href = '/dashboard'
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error inesperado. Intenta de nuevo.',
        description: 'Ocurrió un error al completar el onboarding.',
      })
      setLoading(false)
    }
  }

  return {
    loading,
    handleEventTypeUpdate,
    handleProfileUpdate,
    handleEventLocationUpdate,
    handleEventDateUpdate,
    handleCompleteOnboarding,
  }
}
