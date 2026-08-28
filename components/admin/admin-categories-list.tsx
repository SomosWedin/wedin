'use client'

import type { Category, EventType } from '@prisma/client'
import AdminCategoryDialog from '@/components/dialog/admin-category-dialog'
import DeleteAdminCategoryDialog from '@/components/dialog/delete-admin-category-dialog'
import { EVENT_TYPE_LABEL } from '@/lib/event-type'

export default function AdminCategoriesList({
  categories,
}: {
  categories: Category[]
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex justify-end">
        <AdminCategoryDialog />
      </div>
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="hidden grid-cols-12 gap-4 rounded-t-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 sm:grid">
          <div className="col-span-5">Nombre</div>
          <div className="col-span-5">Tipo de evento</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
        {categories.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No hay categorías creadas
          </div>
        ) : (
          categories.map(category => (
            <div
              key={category.id}
              className="grid grid-cols-1 items-center gap-4 border-b border-gray-100 px-4 py-4 hover:bg-gray-50 sm:grid-cols-12 group"
            >
              <div className="min-w-0 sm:col-span-5">
                <p className="truncate font-medium">{category.name}</p>
              </div>
              <div className="text-sm text-textTertiary sm:col-span-5">
                {category.eventType
                  ? EVENT_TYPE_LABEL[category.eventType as EventType]
                  : 'Sin asignar'}
              </div>
              <div className="flex col-span-2 gap-2 justify-end opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <AdminCategoryDialog category={category} />
                <DeleteAdminCategoryDialog
                  categoryId={category.id}
                  categoryName={category.name}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
