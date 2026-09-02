'use client'

import { createAdminCategory } from '@/actions/data/category'
import type { AdminCategoryValues } from '@/schemas/form'
import { useCategoryFormController } from './use-category-form-controller'

const defaultValues: AdminCategoryValues = {
  name: '',
  eventTypeIds: [],
}

export function useCreateAdminCategory() {
  return useCategoryFormController({
    defaultValues,
    submit: async values => {
      const response = await createAdminCategory(values)
      return response.error
        ? {
            success: false,
            feedback: {
              title: 'Error al crear la categoría',
              description: response.error,
              variant: 'destructive',
            },
          }
        : { success: true, feedback: { title: 'Categoría creada.' } }
    },
    unexpectedErrorTitle: 'No pudimos crear la categoría',
    errorContext: 'Error creating admin category:',
  })
}
