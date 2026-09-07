'use server'

import { getCurrentUser } from '@/actions/get-current-user'
import prismaClient from '@/prisma/client'
import {
  ExistingImportGiftIdSchema,
  type GiftImportPreviewRow,
  GiftImportPreviewSchema,
} from '@/schemas/gift-import'
import { previewRows, reviewResult } from './gift-import-preview'

type ReviewResult = {
  preview: GiftImportPreviewRow[]
  previewToken: string
  error?: never
}
type ImportError = { error: string; preview?: never; previewToken?: never }

export async function getExistingImportGift(input: unknown) {
  if ((await getCurrentUser())?.role !== 'ADMIN')
    return { error: 'No autorizado.' } as const
  const parsed = ExistingImportGiftIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Regalo inválido.' } as const

  try {
    const gift = await prismaClient.gift.findFirst({
      where: { id: parsed.data, isDefault: true },
      select: {
        id: true,
        name: true,
        price: true,
        image: { select: { url: true } },
        category: {
          select: {
            name: true,
            eventTypes: { select: { name: true } },
          },
        },
        giftlists: { select: { name: true } },
      },
    })
    if (!gift)
      return {
        error:
          'Este regalo ya no existe en el catálogo. Volvé a revisar la importación.',
      } as const
    return { gift } as const
  } catch (error) {
    console.error('Error reading existing import gift:', error)
    return {
      error: 'No se pudo cargar el regalo. Intentá nuevamente.',
    } as const
  }
}

export async function previewAdminGiftImport(
  input: unknown
): Promise<ReviewResult | ImportError> {
  if ((await getCurrentUser())?.role !== 'ADMIN')
    return { error: 'No autorizado.' }
  // Tabs opened before the collection option was added send rows directly.
  const parsed = GiftImportPreviewSchema.safeParse(
    Array.isArray(input)
      ? { rows: input, createMissingCollections: false }
      : input
  )
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message ?? 'Datos de importación inválidos.',
    }
  try {
    return reviewResult(
      await previewRows(
        prismaClient,
        parsed.data.rows,
        parsed.data.createMissingCollections
      )
    )
  } catch (error) {
    console.error('Error previewing admin gift import:', error)
    return { error: 'No se pudo validar el archivo. Intentá nuevamente.' }
  }
}
