// @vitest-environment jsdom
/**
 * Notion: "QA Mobile - pantalla presentación"
 * Sub-tasks:
 *   1. Logo wedin arriba                                  -> ver navbar.test.tsx
 *   2. Colocar todos los cuadritos de imágenes en una sola fila. Squeeze it.
 *   3. Texto de error en imagen -> movido por QA a otra tarjeta (fuera de alcance)
 *   4. Botón Guardar deshabilitado hasta que haya una modificación
 *   5. Botón Descartar no aparece hasta que haya una modificación
 *   6. Texto del mensaje de bienvenida (copy exacto de la tarjeta)
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ hasChanges: false }))

vi.mock('@/hooks/dashboard/forms/use-event-cover', async () => {
  const { useForm } = await import('react-hook-form')
  const MAX_IMAGES = 6
  return {
    MAX_IMAGES,
    useEventCover: () => ({
      form: useForm({ defaultValues: { coverMessage: '' } }),
      hasChanges: state.hasChanges,
      applySuggestion: vi.fn(),
      currentImages: [],
      fileInputRef: { current: null },
      imageErrors: [],
      preparingImages: false,
      handleButtonClick: vi.fn(),
      handleAddImage: vi.fn(),
      handleRemoveImage: vi.fn(),
      handleOnSubmit: vi.fn(),
      handleReset: vi.fn(),
      handleSuggestCoverMessage: vi.fn(),
      loading: false,
      slots: Array.from({ length: MAX_IMAGES }),
      suggesting: false,
      suggestions: [],
    }),
  }
})

vi.mock('@/components/dashboard/event-cover-preview-dialog', () => ({
  default: () => null,
}))

import EventCoverUpdateForm from '@/components/forms/dashboard/event-cover'

const event = {
  id: 'evt_1',
  coverMessage: '',
  images: [],
  users: [],
} as never

function renderForm({ hasChanges }: { hasChanges: boolean }) {
  state.hasChanges = hasChanges
  return render(<EventCoverUpdateForm event={event} />)
}

const COPY_ESPERADO =
  'Escribe un mensaje de bienvenida para tus invitados. Este mensaje se va a ' +
  'visualizar en la página principal de tu lista de regalos (hasta 255 caracteres).'

describe('sub-task 6: copy del mensaje de bienvenida', () => {
  it('coincide exactamente con el texto pedido en la tarjeta', () => {
    renderForm({ hasChanges: false })
    const parrafo = screen
      .getByRole('heading', { name: 'Mensaje de bienvenida' })
      .parentElement?.querySelector('p')
    expect(parrafo?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      COPY_ESPERADO
    )
  })
})

describe('sub-task 2: cuadritos de imágenes en una sola fila', () => {
  it('el contenedor de slots no permite wrap', () => {
    const { container } = renderForm({ hasChanges: false })
    const slot = container.querySelector('.border-dashed')
    const fila = slot?.parentElement
    expect(fila?.className).toContain('flex-nowrap')
    expect(fila?.className).not.toContain('flex-wrap')
  })

  it('los slots no se encogen y son más chicos en mobile que en desktop', () => {
    const { container } = renderForm({ hasChanges: false })
    const slots = Array.from(container.querySelectorAll('.border-dashed'))
    expect(slots).toHaveLength(6)

    for (const slot of slots) {
      expect(slot.className).toContain('flex-shrink-0')

      // El valor exacto es cuestión de gusto; lo que importa es que exista
      // un tamaño mobile y que el de desktop sea mayor.
      const mobile = slot.className.match(/(?:^|\s)w-(\d+)/)?.[1]
      const desktop = slot.className.match(/\ssm:w-(\d+)/)?.[1]

      expect(mobile).toBeDefined()
      expect(desktop).toBeDefined()
      expect(Number(mobile)).toBeLessThan(Number(desktop))
    }
  })
})

describe('sub-task 4: Guardar deshabilitado hasta modificar', () => {
  it('está deshabilitado sin cambios', () => {
    renderForm({ hasChanges: false })
    expect(
      screen.getByRole('button', { name: /Guardar/ }).hasAttribute('disabled')
    ).toBe(true)
  })

  it('se habilita cuando hay cambios', () => {
    renderForm({ hasChanges: true })
    expect(
      screen.getByRole('button', { name: /Guardar/ }).hasAttribute('disabled')
    ).toBe(false)
  })
})

describe('sub-task 5: Descartar oculto hasta modificar', () => {
  it('no se renderiza sin cambios', () => {
    renderForm({ hasChanges: false })
    expect(screen.queryByRole('button', { name: /Descartar/ })).toBeNull()
  })

  it('aparece cuando hay cambios', () => {
    renderForm({ hasChanges: true })
    expect(screen.getByRole('button', { name: /Descartar/ })).toBeTruthy()
  })
})
