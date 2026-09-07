import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ImportJobError from '@/components/admin/import-job-error'

describe('import job errors', () => {
  it('links a saved QStash failure to Trabajos de importación', () => {
    const html = renderToStaticMarkup(
      <ImportJobError
        message="No se pudo enviar la importación a QStash."
        queueDispatchFailed
      />
    )

    expect(html).toContain('No se pudo enviar la importación a QStash.')
    expect(html).toContain('href="/admin/jobs"')
    expect(html).toContain('Trabajos de importación')
    expect(html).toContain('Reintentar pendientes y fallidos')
  })
})
