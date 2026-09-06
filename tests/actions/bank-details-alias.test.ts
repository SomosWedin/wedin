import { describe, expect, it } from 'vitest'
import { BankDetailsFormSchema } from '@/schemas/form'

const baseValues = {
  eventId: 'event-1',
  bankName: '1',
  accountHolder: 'Maria Pérez',
  accountNumber: '61920381',
  accountType: 'pyg',
  identificationType: 'ci',
  identificationNumber: '1234567',
}

describe('bank details alias', () => {
  it('accepts bank details without any alias', () => {
    expect(BankDetailsFormSchema.safeParse(baseValues).success).toBe(true)
  })

  it('accepts a complete alias', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      aliasType: 'celular',
      alias: '0981123456',
    })

    expect(result.success).toBe(true)
  })

  it('rejects an alias with no type, since the value would be ambiguous', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      alias: '0981123456',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['aliasType'],
      message: 'Elegí el tipo de alias',
    })
  })

  it('rejects a type with no alias', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      aliasType: 'celular',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['alias'],
      message: 'Ingresá el alias',
    })
  })
})
