// @vitest-environment jsdom
/**
 * Notion: "Agregar dentro"
 *   Descripción: "El monto que envíes a tu cuenta te llegará dentro de las
 *   48 horas hábiles."
 *
 * Notion: "QA Mobile - nombre: listas predefinidas"
 *   Descripción: "Pasaremos a llamar Listas Predefinidas a Colecciones."
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/wishlist',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/actions/data/event', () => ({
  getEvent: vi.fn(async () => ({ id: 'evt_1', wishlistId: 'wl_1' })),
}))

vi.mock('@/actions/data/payout', () => ({
  getWalletSummary: vi.fn(async () => ({ balance: 0 })),
  getPayouts: vi.fn(async () => []),
}))

vi.mock('@/components/dialog/request-payout-dialog', () => ({
  default: () => null,
}))

import DashboardWallet from '@/components/dashboard/dashboard-wallet'
import GiftsCatalogSection from '@/components/dashboard/gifts-catalog-section'

describe('tarjeta "Agregar dentro": copy de la billetera', () => {
  it('usa el texto exacto pedido en la tarjeta', async () => {
    render(await DashboardWallet())
    const parrafo = screen
      .getByRole('heading', { name: 'Mi billetera' })
      .parentElement?.querySelector('p')

    expect(parrafo?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'El monto que envíes a tu cuenta te llegará dentro de las 48 horas hábiles.'
    )
  })

  it('ya no dice "en hasta 48 horas"', async () => {
    const { container } = render(await DashboardWallet())
    expect(container.textContent).not.toContain('en hasta 48 horas')
  })
})

describe('tarjeta "listas predefinidas" -> "Colecciones"', () => {
  function renderCatalog(giftlists: unknown[]) {
    return render(
      <GiftsCatalogSection
        gifts={[] as never}
        giftlists={giftlists as never}
        categories={[] as never}
        eventId="evt_1"
        wishlistId="wl_1"
        wishlistGiftIds={new Set()}
      />
    )
  }

  it('la pestaña se llama "Colecciones"', () => {
    renderCatalog([])
    expect(screen.getByRole('tab', { name: /Colecciones/ })).toBeTruthy()
  })

  it('no queda ninguna mención visible a "listas predefinidas"', () => {
    const { container } = renderCatalog([])
    expect(container.textContent?.toLowerCase()).not.toContain('predefinid')
  })

  it('el estado vacío también dice "colecciones"', () => {
    renderCatalog([])
    const tab = screen.getByRole('tab', { name: /Colecciones/ })
    // Radix activa la pestaña en mousedown/focus, no en click.
    fireEvent.mouseDown(tab)
    fireEvent.focus(tab)
    expect(screen.getByText('No se encontraron colecciones')).toBeTruthy()
  })
})
