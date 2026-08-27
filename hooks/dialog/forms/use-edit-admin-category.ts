'use client'

import type { Category } from '@prisma/client'
import { editAdminCategory } from '@/actions/data/category'
import type { AdminCategoryValues } from '@/schemas/form'
import { useCategoryFormController } from './use-category-form-controller'

export function useEditAdminCategory(category: Category) {
  const defaultValues: AdminCategoryValues = {
    name: category.name,
    eventType: category.eventType ?? 'WEDDING',
  }

  return useCategoryFormController({
    defaultValues,
    submit: async values => {
      const response = await editAdminCategory(category.id, values)
      return response.error
        ? {
            success: false,
            feedback: {
              title: 'Error al editar la categoría',
              description: response.error,
              variant: 'destructive',
            },
          }
        : { success: true, feedback: { title: 'Categoría actualizada.' } }
    },
    unexpectedErrorTitle: 'No pudimos editar la categoría',
    errorContext: 'Error editing admin category:',
  })
}
