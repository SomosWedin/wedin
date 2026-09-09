import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userUpdateMany: vi.fn(),
  userCreate: vi.fn(),
  userDeleteMany: vi.fn(),
  userFindFirst: vi.fn(),
  eventFindUnique: vi.fn(),
  eventFindFirst: vi.fn(),
  eventUpdate: vi.fn(),
  eventCreate: vi.fn(),
  wishlistCreate: vi.fn(),
  eventTypeFindUnique: vi.fn(),
  revalidatePath: vi.fn(),
}))

const tx = {
  user: {
    update: mocks.userUpdate,
    updateMany: mocks.userUpdateMany,
    create: mocks.userCreate,
    deleteMany: mocks.userDeleteMany,
    findFirst: mocks.userFindFirst,
  },
  event: { update: mocks.eventUpdate, create: mocks.eventCreate },
  wishlist: { create: mocks.wishlistCreate },
}

vi.mock('@/auth', () => ({ auth: mocks.auth }))

vi.mock('@/prisma/client', () => ({
  default: {
    $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx),
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
      updateMany: mocks.userUpdateMany,
    },
    event: {
      findUnique: mocks.eventFindUnique,
      findFirst: mocks.eventFindFirst,
      update: mocks.eventUpdate,
    },
    eventType: { findUnique: mocks.eventTypeFindUnique },
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  updateEventDateStepFour,
  updateEventLocationStepThree,
  updateEventTypeStepOne,
  updateProfileStepTwo,
} from '@/actions/common/onboarding'

const wedding = { id: 'type-wedding', key: 'wedding' }
const birthday = { id: 'type-birthday', key: 'birthday' }

describe('onboarding backward navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } })
  })

  describe('step one re-run', () => {
    it('updates the existing event in place instead of creating another one', async () => {
      mocks.eventTypeFindUnique.mockResolvedValue(birthday)
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        eventId: 'event-1',
        onboardingStep: 5,
      })
      mocks.eventFindUnique.mockResolvedValue({
        id: 'event-1',
        eventType: { key: 'birthday' },
      })

      const result = await updateEventTypeStepOne(birthday.id)

      expect(result).toEqual({ success: true })
      expect(mocks.eventCreate).not.toHaveBeenCalled()
      expect(mocks.wishlistCreate).not.toHaveBeenCalled()
      expect(mocks.eventUpdate).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { eventTypeId: birthday.id },
      })
    })

    it('keeps the furthest step when re-picking a type from a later step', async () => {
      mocks.eventTypeFindUnique.mockResolvedValue(birthday)
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        eventId: 'event-1',
        onboardingStep: 5,
      })
      mocks.eventFindUnique.mockResolvedValue({
        id: 'event-1',
        eventType: { key: 'wedding' },
      })

      await updateEventTypeStepOne(birthday.id)

      const { data } = mocks.userUpdate.mock.calls[0][0]
      expect(data.onboardingStep).toBe(5)
    })

    it('removes the partner when a wedding becomes another event type', async () => {
      mocks.eventTypeFindUnique.mockResolvedValue(birthday)
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        eventId: 'event-1',
        onboardingStep: 3,
      })
      mocks.eventFindUnique.mockResolvedValue({
        id: 'event-1',
        eventType: { key: 'wedding' },
      })

      await updateEventTypeStepOne(birthday.id)

      expect(mocks.userDeleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1', isPrimary: false, email: null },
      })
    })

    it('leaves a partner that was given an email alone', async () => {
      mocks.eventTypeFindUnique.mockResolvedValue(birthday)
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        eventId: 'event-1',
        onboardingStep: 3,
      })
      mocks.eventFindUnique.mockResolvedValue({
        id: 'event-1',
        eventType: { key: 'wedding' },
      })

      await updateEventTypeStepOne(birthday.id)

      const { where } = mocks.userDeleteMany.mock.calls[0][0]
      expect(where.email).toBeNull()
    })

    it('does not touch the partner when the event stays a wedding', async () => {
      mocks.eventTypeFindUnique.mockResolvedValue(wedding)
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        eventId: 'event-1',
        onboardingStep: 4,
      })
      mocks.eventFindUnique.mockResolvedValue({
        id: 'event-1',
        eventType: { key: 'wedding' },
      })

      await updateEventTypeStepOne(wedding.id)

      expect(mocks.userDeleteMany).not.toHaveBeenCalled()
    })

    it('creates the event and wishlist only on the first pass', async () => {
      mocks.eventTypeFindUnique.mockResolvedValue(wedding)
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        eventId: null,
        onboardingStep: 1,
      })
      mocks.wishlistCreate.mockResolvedValue({ id: 'wishlist-1' })
      mocks.eventCreate.mockResolvedValue({ id: 'event-1' })

      await updateEventTypeStepOne(wedding.id)

      expect(mocks.wishlistCreate).toHaveBeenCalledTimes(1)
      expect(mocks.eventCreate).toHaveBeenCalledWith({
        data: { eventTypeId: wedding.id, wishlistId: 'wishlist-1' },
      })
      expect(mocks.userUpdate.mock.calls[0][0].data).toEqual({
        eventId: 'event-1',
        onboardingStep: 2,
      })
    })
  })

  describe('step two re-run', () => {
    const weddingEvent = {
      id: 'event-1',
      eventType: { key: 'wedding' },
    }

    const values = {
      name: 'Maria',
      lastName: 'Pérez',
      partnerName: 'Juan',
      partnerLastName: 'González',
    }

    it('updates the existing partner instead of creating a duplicate', async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        onboardingStep: 5,
      })
      mocks.eventFindFirst.mockResolvedValue(weddingEvent)
      mocks.userFindFirst.mockResolvedValue({ id: 'partner-1' })

      await updateProfileStepTwo(values)

      expect(mocks.userCreate).not.toHaveBeenCalled()
      expect(mocks.userUpdate).toHaveBeenCalledWith({
        where: { id: 'partner-1' },
        data: { name: 'Juan', lastName: 'González' },
      })
    })

    it('creates the partner when there is none yet', async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        onboardingStep: 2,
      })
      mocks.eventFindFirst.mockResolvedValue(weddingEvent)
      mocks.userFindFirst.mockResolvedValue(null)

      await updateProfileStepTwo(values)

      expect(mocks.userCreate).toHaveBeenCalledTimes(1)
      expect(mocks.userCreate.mock.calls[0][0].data).toMatchObject({
        name: 'Juan',
        isPrimary: false,
        eventId: 'event-1',
      })
    })

    it('never lowers the recorded step', async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        onboardingStep: 5,
      })
      mocks.eventFindFirst.mockResolvedValue(weddingEvent)
      mocks.userFindFirst.mockResolvedValue({ id: 'partner-1' })

      await updateProfileStepTwo(values)

      expect(mocks.userUpdateMany).toHaveBeenCalledWith({
        where: { id: 'user-1', onboardingStep: { lt: 3 } },
        data: { onboardingStep: 3 },
      })
    })

    it('refuses a step the user has not reached', async () => {
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        onboardingStep: 1,
      })

      const result = await updateProfileStepTwo(values)

      expect(result).toEqual({ error: 'Completá los pasos anteriores.' })
      expect(mocks.userUpdate).not.toHaveBeenCalled()
    })
  })

  describe('revisiting the location and date steps', () => {
    beforeEach(() => {
      mocks.userFindUnique.mockResolvedValue({
        id: 'user-1',
        eventId: 'event-1',
        onboardingStep: 5,
      })
    })

    it('clears a saved location when "aún estamos decidiendo" is ticked', async () => {
      await updateEventLocationStepThree({
        eventCountry: 'Paraguay',
        eventCity: 'San Bernardino',
        isDecidingEventLocation: true,
      })

      expect(mocks.eventUpdate.mock.calls[0][0].data).toEqual({
        country: null,
        city: null,
      })
    })

    it('clears a saved date when "aún estamos decidiendo" is ticked', async () => {
      await updateEventDateStepFour({
        eventDate: new Date('2027-01-01'),
        isDecidingEventDate: true,
      })

      expect(mocks.eventUpdate.mock.calls[0][0].data).toEqual({ date: null })
    })

    it('saves the location when the box is unticked', async () => {
      await updateEventLocationStepThree({
        eventCountry: 'Paraguay',
        eventCity: 'Asunción',
        isDecidingEventLocation: false,
      })

      expect(mocks.eventUpdate.mock.calls[0][0].data).toEqual({
        country: 'Paraguay',
        city: 'Asunción',
      })
    })

    it('does not lower the recorded step from either step', async () => {
      await updateEventLocationStepThree({
        eventCountry: 'Paraguay',
        eventCity: 'Asunción',
        isDecidingEventLocation: false,
      })
      await updateEventDateStepFour({
        eventDate: new Date('2027-01-01'),
        isDecidingEventDate: false,
      })

      expect(mocks.userUpdateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'user-1', onboardingStep: { lt: 4 } },
        data: { onboardingStep: 4 },
      })
      expect(mocks.userUpdateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'user-1', onboardingStep: { lt: 5 } },
        data: { onboardingStep: 5 },
      })
    })
  })
})
