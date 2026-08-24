// @vitest-environment jsdom
/**
 * Notion: "QA Mobile - pantalla dashboard principal"
 * Sub-tasks:
 *   1. "Botón gris ver sitio web está muy claro, casi se confunde con el fondo."
 *   2. "Falta logo de wedin. ponerlo ahí arriba en el top en donde dice Inicio
 *       al lado del menú hamburguesa. Colocar versión completa del logo horizontal"
 */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/actions/data/event', () => ({
  getEvent: vi.fn(async () => ({
    id: 'evt_1',
    wishlistId: 'wl_1',
    coverMessage: '',
    date: null,
    url: '',
  })),
}))

vi.mock('@/actions/data/wishlist-gift', () => ({
  getWishlistGifts: vi.fn(async () => []),
}))

vi.mock('@/actions/get-current-user', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'u_1', name: 'Test' })),
}))

vi.mock('@/components/admin-panel/user-nav', () => ({
  UserNav: () => null,
}))

vi.mock('@/components/admin-panel/sheet-menu', () => ({
  SheetMenu: () => <button type="button">menu</button>,
}))

import { Navbar } from '@/components/admin-panel/navbar'
import DashboardHome from '@/components/dashboard/dashboard-home'

describe('sub-task 1: contraste del botón "Ver sitio web"', () => {
  it('el botón deshabilitado no se atenúa hasta confundirse con el fondo', async () => {
    render(await DashboardHome())
    const boton = screen.getByRole('button', { name: /Ver sitio web/ })

    expect(boton.hasAttribute('disabled')).toBe(true)
    // Sin esto el botón hereda disabled:opacity-50 sobre un fondo gray-50.
    expect(boton.className).toContain('disabled:opacity-100')
  })

  it('tiene borde y texto propios para despegarse del fondo', async () => {
    render(await DashboardHome())
    const boton = screen.getByRole('button', { name: /Ver sitio web/ })
    expect(boton.className).toContain('border')
    expect(boton.className).toContain('text-textTertiary')
  })
})

describe('sub-task 2: logo de wedin en el top bar', () => {
  it('renderiza el logo en el header', async () => {
    render(await Navbar({ title: 'Inicio' }))
    expect(screen.getByRole('img', { name: 'wedin' })).toBeTruthy()
  })

  it('usa la versión horizontal completa del logo', async () => {
    render(await Navbar({ title: 'Inicio' }))
    const logo = screen.getByRole('img', { name: 'wedin' })
    expect(logo.getAttribute('src')).toContain('w-logo')
    expect(logo.getAttribute('src')).not.toContain('w-icon')
  })

  it('el logo queda al lado del menú hamburguesa', async () => {
    const { container } = render(await Navbar({ title: 'Inicio' }))
    const hamburguesa = screen.getByRole('button', { name: 'menu' })
    const logo = screen.getByRole('img', { name: 'wedin' })

    const fila = hamburguesa.parentElement
    expect(fila).toBeTruthy()
    expect(
      within(fila as HTMLElement).getByRole('img', { name: 'wedin' })
    ).toBe(logo)
    expect(
      hamburguesa.compareDocumentPosition(logo) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(container).toBeTruthy()
  })

  it('el logo sólo se muestra en mobile (oculto en lg+)', async () => {
    render(await Navbar({ title: 'Inicio' }))
    const enlace = screen.getByRole('img', { name: 'wedin' }).closest('a')
    expect(enlace?.className).toContain('lg:hidden')
  })
})
