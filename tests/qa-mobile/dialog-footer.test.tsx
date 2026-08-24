// @vitest-environment jsdom
/**
 * Los botones de confirmación de los diálogos se apilaban en mobile
 * (flex-col-reverse). Deben quedar lado a lado, sin tocar el desktop.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LogoutConfirmDialog from '@/components/dialog/logout-confirm-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DialogFooter } from '@/components/ui/dialog'

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }))

const footers = [
  ['DialogFooter', DialogFooter],
  ['AlertDialogFooter', AlertDialogFooter],
] as const

describe.each(footers)('%s', (_name, Footer) => {
  function renderFooter() {
    const { container } = render(
      <Footer>
        <button type="button">Cancelar</button>
        <button type="button">Confirmar</button>
      </Footer>
    )
    return container.firstElementChild as HTMLElement
  }

  it('no apila los botones en mobile', () => {
    expect(renderFooter().className).not.toContain('flex-col-reverse')
  })

  it('los pone en fila desde mobile', () => {
    const footer = renderFooter()
    expect(footer.className).toContain('flex-row')
    expect(footer.className).toContain('gap-2')
  })

  it('reparte el ancho en mobile y lo suelta en desktop', () => {
    const footer = renderFooter()
    expect(footer.className).toContain('[&>*]:flex-1')
    expect(footer.className).toContain('sm:[&>*]:flex-none')
  })

  it('sigue alineando a la derecha', () => {
    expect(renderFooter().className).toContain('justify-end')
  })
})

describe('AlertDialogCancel dentro de un diálogo real', () => {
  it('queda alineado con el botón de acción (sin mt-2)', () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Título</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const cancelar = screen.getByText('Cancelar')
    const confirmar = screen.getByText('Confirmar')

    // 'mt-2 sm:mt-0' venía del footer en columna; en fila empujaba Cancelar
    // hacia abajo respecto al botón de acción.
    expect(cancelar.className).not.toContain('mt-2')
    expect(cancelar.parentElement).toBe(confirmar.parentElement)
  })
})

describe('logout-confirm-dialog (footer propio, no usa DialogFooter)', () => {
  it('usa el mismo layout en fila', () => {
    render(<LogoutConfirmDialog open onOpenChange={vi.fn()} />)

    const cancelar = screen.getByText('Cancelar')
    const fila = cancelar.parentElement

    expect(fila?.className).toContain('flex-row')
    expect(fila?.className).not.toContain('flex-col-reverse')
  })

  it('el botón Cancelar ya no arrastra el margen del layout apilado', () => {
    render(<LogoutConfirmDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByText('Cancelar').className).not.toContain('mt-2')
  })
})
