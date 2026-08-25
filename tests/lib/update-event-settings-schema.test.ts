import { EventType } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { UpdateEventSettingsFormSchema } from '@/schemas/form'

const baseValues = {
  eventDate: new Date('2027-01-01'),
  eventType: EventType.WEDDING as string,
  eventUrl: 'bodamariayjuan',
  name: 'Maria',
  lastName: 'Gonzalez',
  partnerName: '',
  partnerLastName: '',
  partnerEmail: '',
}

describe('UpdateEventSettingsFormSchema', () => {
  it('accepts a wedding with every partner field still blank', () => {
    expect(UpdateEventSettingsFormSchema.safeParse(baseValues).success).toBe(
      true
    )
  })

  it('accepts a wedding with the full partner data', () => {
    const result = UpdateEventSettingsFormSchema.safeParse({
      ...baseValues,
      partnerName: 'Juan',
      partnerLastName: 'Perez',
      partnerEmail: 'juan@ejemplo.com',
    })

    expect(result.success).toBe(true)
  })

  it('requires the rest of the partner data once one field is filled', () => {
    const result = UpdateEventSettingsFormSchema.safeParse({
      ...baseValues,
      partnerName: 'Juan',
    })

    expect(result.success).toBe(false)
    expect(
      result.success ? [] : result.error.errors.map(error => error.path[0])
    ).toEqual(['partnerLastName', 'partnerEmail'])
  })

  it('rejects an invalid partner email', () => {
    const result = UpdateEventSettingsFormSchema.safeParse({
      ...baseValues,
      partnerName: 'Juan',
      partnerLastName: 'Perez',
      partnerEmail: 'no-es-un-email',
    })

    expect(result.success).toBe(false)
  })

  it('ignores partner rules for non-wedding events', () => {
    const result = UpdateEventSettingsFormSchema.safeParse({
      ...baseValues,
      eventType: EventType.OTHER,
      partnerName: null,
      partnerLastName: null,
      partnerEmail: null,
    })

    expect(result.success).toBe(true)
  })
})
