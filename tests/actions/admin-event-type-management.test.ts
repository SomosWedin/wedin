import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  eventTypeFindFirst: vi.fn(),
  eventTypeFindUnique: vi.fn(),
  eventTypeCreate: vi.fn(),
  eventTypeUpdate: vi.fn(),
  eventTypeDelete: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: mocks.getCurrentUser,
}))

vi.mock('@/prisma/client', () => ({
  default: {
    eventType: {
      findFirst: mocks.eventTypeFindFirst,
      findUnique: mocks.eventTypeFindUnique,
      create: mocks.eventTypeCreate,
      update: mocks.eventTypeUpdate,
      delete: mocks.eventTypeDelete,
    },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  createAdminEventType,
  deleteAdminEventType,
  editAdminEventType,
} from '@/actions/data/event-type'

describe('admin event type management', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' })
    mocks.eventTypeFindFirst.mockResolvedValue(null)
    mocks.eventTypeFindUnique.mockResolvedValue(null)
    mocks.eventTypeCreate.mockResolvedValue({ id: 'event-type-1' })
    mocks.eventTypeUpdate.mockResolvedValue({ id: 'event-type-1' })
    mocks.eventTypeDelete.mockResolvedValue({ id: 'event-type-1' })
  })

  it('rejects creation from a non-admin', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'organizer-1',
      role: 'ORGANIZER',
    })

    const result = await createAdminEventType({ name: 'Baby Shower' })

    expect(result).toEqual({ error: 'No autorizado.' })
    expect(mocks.eventTypeFindFirst).not.toHaveBeenCalled()
    expect(mocks.eventTypeCreate).not.toHaveBeenCalled()
  })

  it('creates an event type with a normalized internal key', async () => {
    const result = await createAdminEventType({ name: '  Quince Años  ' })

    expect(mocks.eventTypeFindFirst).toHaveBeenCalledWith({
      where: {
        name: { equals: 'Quince Años', mode: 'insensitive' },
      },
      select: { id: true },
    })
    expect(mocks.eventTypeCreate).toHaveBeenCalledWith({
      data: {
        name: 'Quince Años',
        key: 'quince-anos',
        categoryIds: [],
      },
    })
    expect(result).toEqual({ eventTypeId: 'event-type-1' })
  })

  it('rejects a case-insensitive duplicate name', async () => {
    mocks.eventTypeFindFirst.mockResolvedValue({ id: 'event-type-existing' })

    const result = await createAdminEventType({ name: 'BABY SHOWER' })

    expect(result).toEqual({
      error: 'Ya existe un tipo de evento con ese nombre.',
    })
    expect(mocks.eventTypeCreate).not.toHaveBeenCalled()
  })

  it('adds a suffix when the normalized key already exists', async () => {
    mocks.eventTypeFindUnique
      .mockResolvedValueOnce({ id: 'event-type-key-1' })
      .mockResolvedValueOnce({ id: 'event-type-key-2' })
      .mockResolvedValueOnce(null)

    const result = await createAdminEventType({ name: 'Baby Shower!' })

    expect(mocks.eventTypeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ key: 'baby-shower-3' }),
    })
    expect(result).toEqual({ eventTypeId: 'event-type-1' })
  })

  it('rejects an empty name before querying event types', async () => {
    const result = await createAdminEventType({ name: '   ' })

    expect(result).toEqual({ error: 'Datos inválidos.' })
    expect(mocks.eventTypeFindFirst).not.toHaveBeenCalled()
    expect(mocks.eventTypeCreate).not.toHaveBeenCalled()
  })

  it('edits an event type name without changing its key', async () => {
    mocks.eventTypeFindUnique.mockResolvedValue({ id: 'event-type-1' })

    const result = await editAdminEventType('event-type-1', {
      name: 'Fiesta de 15',
    })

    expect(mocks.eventTypeUpdate).toHaveBeenCalledWith({
      where: { id: 'event-type-1' },
      data: { name: 'Fiesta de 15' },
    })
    expect(result).toEqual({ eventTypeId: 'event-type-1' })
  })

  it('rejects an event type deletion while it is in use', async () => {
    mocks.eventTypeFindUnique.mockResolvedValue({
      id: 'event-type-1',
      categoryIds: ['category-1'],
      events: [],
    })

    const result = await deleteAdminEventType('event-type-1')

    expect(result).toEqual({
      error: 'No se puede eliminar un tipo de evento que todavía está en uso.',
    })
    expect(mocks.eventTypeDelete).not.toHaveBeenCalled()
  })
})
