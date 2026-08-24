// @vitest-environment jsdom
/**
 * Notion: "QA Mobile - navegación en el menu lateral"
 * Sub-tasks:
 *   1. "está fallando el click. Trato de dar click en las cosas para navegar a
 *       otras páginas y no le da el click, intento varias veces y luego de
 *       varios intentos, funciona"
 *   2. "Logo incorrecto"
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const pathname = vi.hoisted(() => ({ current: '/dashboard' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/dialog/logout-confirm-dialog', () => ({
  default: () => null,
}))

import { Menu } from '@/components/admin-panel/menu'
import { SheetMenu } from '@/components/admin-panel/sheet-menu'

beforeEach(() => {
  pathname.current = '/dashboard'
})

const NAV_LABELS = [
  'Inicio',
  'Presentación',
  'Mi lista',
  'Regalos recibidos',
  'Mi billetera',
]

describe('sub-task 1: el click debe registrarse al primer intento', () => {
  it.each(NAV_LABELS)(
    '"%s" no está envuelto en un TooltipTrigger cuando el menú está abierto',
    label => {
      render(<Menu isOpen />)
      const link = screen.getByRole('link', { name: label })

      // Radix marca el elemento trigger con data-state / aria-describedby.
      // En touch ese trigger se come el primer tap, y aquí no aporta nada:
      // TooltipContent sólo se renderiza cuando isOpen === false.
      expect(link.getAttribute('data-state')).toBeNull()
      expect(link.getAttribute('aria-describedby')).toBeNull()
    }
  )

  it('el submenú "Generales" se despliega al primer click', () => {
    render(<Menu isOpen />)
    // Con isOpen, CollapseMenuButton usa Collapsible (no Tooltip), así que
    // aquí sólo verificamos que un único click ya expone los sub-items.
    expect(
      screen.queryByRole('link', { name: /Detalles de tu evento/ })
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Generales/ }))

    expect(
      screen.getByRole('link', { name: /Detalles de tu evento/ })
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Datos de tu cuenta/ })
    ).toBeTruthy()
  })

  it('sigue mostrando tooltips cuando el menú está colapsado (desktop)', () => {
    render(<Menu isOpen={false} />)
    const link = screen.getByRole('link', { name: 'Mi lista' })
    expect(link.getAttribute('data-state')).toBe('closed')
  })
})

// El trigger es un botón sólo-icono sin nombre accesible, así que lo tomamos
// por posición: es el único botón antes de abrir el drawer.
function openDrawer(container: HTMLElement) {
  const trigger = container.querySelector('button')
  if (!trigger) throw new Error('no se encontró el trigger del drawer')
  fireEvent.click(trigger)
}

describe('sub-task 1b: el drawer se cierra al navegar', () => {
  it('desmonta el contenido del drawer cuando cambia el pathname', () => {
    const { container, rerender } = render(<SheetMenu />)

    openDrawer(container)
    expect(screen.getByRole('dialog')).toBeTruthy()

    pathname.current = '/wishlist'
    rerender(<SheetMenu />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('sub-task 2: logo correcto', () => {
  it('el drawer usa el logo horizontal completo (w-logo), no el isotipo', () => {
    const { container } = render(<SheetMenu />)
    openDrawer(container)

    const dialog = screen.getByRole('dialog')
    const logo = within(dialog).getByRole('img', { name: 'wedin' })

    expect(logo.getAttribute('src')).toContain('w-logo')
    expect(logo.getAttribute('src')).not.toContain('w-icon')
  })

  it('el drawer ya no muestra el wordmark "wedin" como texto', () => {
    const { container } = render(<SheetMenu />)
    openDrawer(container)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByText('wedin')).toBeNull()
  })
})
