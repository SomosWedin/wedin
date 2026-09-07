import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import GiftImportJobResult from '@/components/admin/gift-import-job-result'

describe('gift import job results', () => {
  it('shows the original duplicate error and existing gift link for an excluded row', () => {
    const html = renderToStaticMarkup(
      <GiftImportJobResult
        row={{
          status: 'SKIPPED',
          giftId: null,
          excluded: true,
          error: 'Excluida durante la revisión.',
          review: {
            existingGiftId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
            errors: [
              'Este regalo ya existe en la base de datos de Wedin con el mismo nombre y categoría.',
            ],
          },
        }}
        onGift={() => {}}
      />
    )

    expect(html).toContain('Excluida durante la revisión.')
    expect(html).toContain('Este regalo ya existe en la base de datos')
    expect(html).toContain('Ver regalo existente')
  })
})
