// @vitest-environment jsdom
/**
 * Notion: "QA Mobile - texto en pantalla de configuración bancaria"
 * Sub-tasks:
 *   1. Logo de wedin arriba                          -> ver navbar.test.tsx
 *   2. Cambiar texto del encabezado
 *   3. Alinear campos en una línea recta
 *   4. Labels que no sean "Crisley Domínguez" -> "Maria Pérez"
 *   5. Label de la cédula: 4.705.899 -> 1.234.567
 *   6. Utilizar solo 2 campos por fila, agrupados así:
 *        Nombre y apellido
 *        Tipo de documento — Número de documento
 *        Entidad — Número de cuenta
 *        Moneda de la cuenta
 *   7. Título "Datos de facturación" antes de Razón Social, + RUC
 *   8. Aplicar todo en desktop excepto lo de 2 campos por línea
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/dashboard/forms/use-update-bank-details', async () => {
  const { useForm } = await import('react-hook-form')
  return {
    useUpdateBankDetails: () => ({
      loading: false,
      isDirty: false,
      isValid: false,
      onSubmit: vi.fn(),
      form: useForm({
        defaultValues: {
          accountHolder: '',
          identificationType: 'ci',
          identificationNumber: '',
          bankName: '',
          accountNumber: '',
          accountType: 'pyg',
          razonSocial: '',
          ruc: '',
        },
      }),
    }),
  }
})

import DashboardBankDetailsUpdateForm from '@/components/forms/dashboard/bank-details'

function renderForm() {
  return render(
    <DashboardBankDetailsUpdateForm eventId="evt_1" bankDetails={null} />
  )
}

// Sube desde el control hasta el FormItem, que es quien lleva las clases de grid.
function formItemFor(label: string): HTMLElement {
  const labelEl = screen.getByText(label)
  const item = labelEl.parentElement
  if (!item) throw new Error(`sin FormItem para "${label}"`)
  return item
}

describe('sub-task 4 y 5: placeholders de ejemplo', () => {
  it('el placeholder de nombre es "Maria Pérez"', () => {
    renderForm()
    expect(screen.getByPlaceholderText('Maria Pérez')).toBeTruthy()
  })

  it('no queda ningún placeholder con el nombre de una persona real', () => {
    const { container } = renderForm()
    expect(container.innerHTML).not.toContain('Crisley')
    expect(container.innerHTML).not.toContain('John Doe')
  })

  it('el placeholder de cédula es "Ej. 1.234.567"', () => {
    renderForm()
    expect(screen.getByPlaceholderText('Ej. 1.234.567')).toBeTruthy()
  })

  it('ya no usa la cédula real 4.705.899', () => {
    const { container } = renderForm()
    expect(container.innerHTML).not.toContain('4.705.899')
  })
})

describe('sub-task 6: agrupación de 2 campos por fila en mobile', () => {
  it('"Nombre y apellido" ocupa su propia fila', () => {
    renderForm()
    expect(formItemFor('Nombre y apellido').className).toContain('col-span-2')
  })

  it('"Tipo de documento" y "Número de documento" comparten fila', () => {
    renderForm()
    expect(formItemFor('Tipo de documento').className).not.toContain(
      'col-span-2'
    )
    expect(formItemFor('Número de documento').className).not.toContain(
      'col-span-2'
    )
  })

  it('"Entidad" y "Número de cuenta" comparten fila', () => {
    renderForm()
    expect(formItemFor('Entidad').className).not.toContain('col-span-2')
    expect(formItemFor('Número de cuenta').className).not.toContain(
      'col-span-2'
    )
  })

  it('"Moneda de la cuenta" ocupa su propia fila', () => {
    renderForm()
    expect(formItemFor('Moneda de la cuenta').className).toContain('col-span-2')
  })
})

describe('sub-task 8: desktop mantiene 3 campos por fila', () => {
  it.each(['Nombre y apellido', 'Moneda de la cuenta'])(
    '"%s" vuelve a una columna en sm+',
    label => {
      renderForm()
      expect(formItemFor(label).className).toContain('sm:col-span-1')
    }
  )

  it('los grids declaran 2 columnas en mobile y 3 en desktop', () => {
    const { container } = renderForm()
    const grids = Array.from(
      container.querySelectorAll('[class*="grid-cols-2"]')
    )
    expect(grids.length).toBeGreaterThan(0)
    for (const grid of grids) {
      expect(grid.className).toContain('sm:grid-cols-3')
    }
  })
})

describe('sub-task 7: bloque "Datos de facturación"', () => {
  it('muestra el título "Datos de facturación"', () => {
    renderForm()
    expect(screen.getByText('Datos de facturación')).toBeTruthy()
  })

  it('el título aparece antes del campo Razón social', () => {
    renderForm()
    const title = screen.getByText('Datos de facturación')
    const razon = screen.getByText('Razón social')
    expect(
      title.compareDocumentPosition(razon) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('Razón social y RUC quedan lado a lado en desktop', () => {
    renderForm()
    const grid = formItemFor('Razón social').parentElement
    expect(grid?.className).toContain('sm:grid-cols-3')

    // "RUC" también es una opción del select, así que tomamos el label.
    const rucLabel = screen
      .getAllByText('RUC')
      .find(el => el.tagName === 'LABEL')
    expect(rucLabel?.parentElement?.parentElement).toBe(grid)
  })

  it('incluye un campo RUC en el bloque de facturación', () => {
    renderForm()
    // "RUC" también existe como opción del select "Tipo de documento",
    // así que exigimos que sea el label de un campo propio.
    const asFieldLabel = screen
      .getAllByText('RUC')
      .filter(el => el.tagName === 'LABEL')
    expect(asFieldLabel.length).toBe(1)
  })
})

describe('sub-task 3: alineación de campos', () => {
  // jsdom no calcula layout, así que no se puede medir la alineación real.
  // Lo que sí se puede garantizar es la condición estructural que la produce:
  // los controles de una misma fila se alinean al fondo, de modo que un label
  // que ocupa dos líneas no desplace al campo vecino.
  it('cada grid alinea sus items al fondo de la fila', () => {
    const { container } = renderForm()
    const grids = Array.from(
      container.querySelectorAll('[class*="grid-cols-2"]')
    )
    for (const grid of grids) {
      expect(grid.className).toContain('items-end')
    }
  })
})
