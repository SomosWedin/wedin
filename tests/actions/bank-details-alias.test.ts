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

describe('bank details billing pair', () => {
  it('accepts bank details without razón social or RUC', () => {
    expect(BankDetailsFormSchema.safeParse(baseValues).success).toBe(true)
  })

  it('accepts a complete billing pair', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      razonSocial: 'Wedin SA',
      ruc: '800223-5',
    })

    expect(result.success).toBe(true)
  })

  it('rejects a razón social with no RUC', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      razonSocial: 'Wedin SA',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['ruc'],
      message: 'Ingresá el RUC',
    })
  })

  it('rejects a RUC with no razón social', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      ruc: '800223-5',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['razonSocial'],
      message: 'Ingresá la razón social',
    })
  })
})

describe('bank details optional field lengths', () => {
  it('rejects an alias shorter than 3 characters', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      aliasType: 'celular',
      alias: 'ab',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['alias'],
      message: 'Alias muy corto',
    })
  })

  it('rejects an alias longer than 255 characters', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      aliasType: 'celular',
      alias: 'a'.repeat(256),
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({ path: ['alias'] })
  })

  it('rejects a RUC shorter than 3 characters', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      razonSocial: 'Wedin SA',
      ruc: '80',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['ruc'],
      message: 'RUC muy corto',
    })
  })

  it('rejects a RUC longer than the document number cap of 12', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      razonSocial: 'Wedin SA',
      ruc: '8'.repeat(13),
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({ path: ['ruc'] })
  })

  it('accepts a RUC at the 12 character cap', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      razonSocial: 'Wedin SA',
      ruc: '8'.repeat(12),
    })

    expect(result.success).toBe(true)
  })

  it('treats whitespace-only optional fields as empty', () => {
    const result = BankDetailsFormSchema.safeParse({
      ...baseValues,
      aliasType: '   ',
      alias: '   ',
      razonSocial: '   ',
      ruc: '   ',
    })

    expect(result.success).toBe(true)
  })
})
