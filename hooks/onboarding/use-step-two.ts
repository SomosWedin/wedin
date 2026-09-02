'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { createStepTwoSchema, StepTwoSchema } from '@/schemas/onboarding'

export type StepTwoValues = z.infer<typeof StepTwoSchema>

type UseStepTwoProps = {
  isWedding: boolean
  onSubmit: (values: StepTwoValues) => Promise<void> | void
}

export function useStepTwo({ isWedding, onSubmit }: UseStepTwoProps) {
  const form = useForm<StepTwoValues>({
    resolver: zodResolver(createStepTwoSchema(isWedding)),
    mode: 'all',
    defaultValues: {
      name: '',
      lastName: '',
      partnerName: '',
      partnerLastName: '',
    },
  })

  const handleSubmit = form.handleSubmit(onSubmit)

  return {
    form,
    isWedding,
    isValid: form.formState.isValid,
    handleSubmit,
  }
}
