import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getTermsFileStream: vi.fn() }))

vi.mock('@/lib/server/terms-storage', () => ({
  getTermsFileStream: mocks.getTermsFileStream,
}))

import { GET } from '@/app/terminos-y-condiciones/[slug]/pdf/route'

const request = new Request('https://somoswedin.com')

describe('terms pdf route', () => {
  beforeEach(() => {
    mocks.getTermsFileStream.mockResolvedValue('%PDF-1.7')
  })

  it('serves a known document inline as a pdf', async () => {
    const response = await GET(request, { params: { slug: 'invitados' } })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="wedin-terminos-invitados.pdf"'
    )
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600')
  })

  it('404s an unknown slug without touching storage', async () => {
    const response = await GET(request, { params: { slug: 'otra-cosa' } })

    expect(response.status).toBe(404)
    expect(mocks.getTermsFileStream).not.toHaveBeenCalled()
  })

  it('reports a bad gateway when the object cannot be read', async () => {
    mocks.getTermsFileStream.mockResolvedValue(null)

    const response = await GET(request, { params: { slug: 'invitados' } })

    expect(response.status).toBe(502)
  })

  it('never names the bucket in what it returns', async () => {
    const response = await GET(request, { params: { slug: 'organizadores' } })

    const headerValues: string[] = []
    response.headers.forEach((value, key) =>
      headerValues.push(`${key}: ${value}`)
    )

    expect(headerValues.join('\n')).not.toContain('amazonaws')
  })
})
