'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { createStepTwoSchema, type StepTwoSchema } from '@/schemas/onboarding'

export type StepTwoValues = z.infer<typeof StepTwoSchema>

type UseStepTwoProps = {
  isWedding: boolean
  defaultValues: StepTwoValues
  onSubmit: (values: StepTwoValues) => Promise<void> | void
}

export function useStepTwo({
  isWedding,
  defaultValues,
  onSubmit,
}: UseStepTwoProps) {
  const form = useForm<StepTwoValues>({
    resolver: zodResolver(createStepTwoSchema(isWedding)),
    mode: 'all',
    defaultValues,
  })

  const handleSubmit = form.handleSubmit(onSubmit)

  return {
    form,
    isWedding,
    isValid: form.formState.isValid,
    handleSubmit,
  }
}
