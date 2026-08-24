// @vitest-environment jsdom
/**
 * Notion: "QA mobile - pantalla “Cómo te llamas”"
 *   - "Nombre del label cambiar de Santiago Figueiredo a Maria Pérez"
 *
 * Notion: "QA Mobile - disminuir tamaño de ícono"
 *   - "Disminuir el ícono de regalo y de biletera"
 */

import { EventType } from '@prisma/client'
import { render, renderHook, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import StepTwoForm from '@/components/forms/onboarding/step-two'

function renderStepTwo(eventType: EventType) {
  const { result } = renderHook(() =>
    useForm({
      defaultValues: {
        name: '',
        lastName: '',
        eventType,
        partnerName: '',
        partnerLastName: '',
      },
    })
  )

  return render(
    <StepTwoForm
      form={result.current as never}
      eventType={eventType}
      isValid={false}
      loading={false}
      onSubmit={vi.fn()}
    />
  )
}

describe('"Cómo te llamas": placeholders de ejemplo', () => {
  it('usa Maria / Pérez para los datos propios', () => {
    renderStepTwo(EventType.WEDDING)
    expect(screen.getByPlaceholderText('Maria')).toBeTruthy()
    expect(screen.getByPlaceholderText('Pérez')).toBeTruthy()
  })

  it('no quedan placeholders en inglés tipo John/Jane Doe', () => {
    const { container } = renderStepTwo(EventType.WEDDING)
    for (const nombre of ['John', 'Jane', 'Doe']) {
      expect(container.innerHTML).not.toContain(`placeholder="${nombre}"`)
    }
  })

  it('tampoco quedan nombres de personas reales del equipo', () => {
    const { container } = renderStepTwo(EventType.WEDDING)
    for (const nombre of ['Santiago', 'Figueiredo', 'Crisley', 'Dominguez']) {
      expect(container.innerHTML).not.toContain(nombre)
    }
  })
})
