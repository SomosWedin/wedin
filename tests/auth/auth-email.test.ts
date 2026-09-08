import { describe, expect, it } from 'vitest'
import { AUTH_EMAIL_MAX_AGE_SECONDS, buildAuthEmail } from '@/lib/auth-email'
import { buildAuthEmailRequest } from '@/lib/server/auth-email'

const magicLink =
  'https://www.somoswedin.com/api/auth/callback/resend?callbackUrl=%2Fonboarding&token=secret'

describe('authentication email', () => {
  it('renders account verification content for a new user', () => {
    const email = buildAuthEmail({ isNewUser: true, url: magicLink })

    expect(email.subject).toBe('Autenticá tu cuenta de Wedin')
    expect(email.html).toContain('<title>Confirmá tu cuenta en wedin</title>')
    expect(email.html).toContain('Verificación de cuenta')
    expect(email.html).toContain('Confirmá tu cuenta')
    expect(email.html).toContain('Autenticar cuenta')
    expect(email.text).toContain('crear tu cuenta de wedin')
    expect(email.text).toContain(`Autenticar cuenta:\n${magicLink}`)
  })

  it('renders sign-in content for an existing user', () => {
    const email = buildAuthEmail({ isNewUser: false, url: magicLink })

    expect(email.subject).toBe('Tu enlace para iniciar sesión en Wedin')
    expect(email.html).toContain('<title>Entrá a tu cuenta en wedin</title>')
    expect(email.html).toContain('Acceso seguro')
    expect(email.html).toContain('Entrá a tu cuenta')
    expect(email.html).toContain('Iniciar sesión')
    expect(email.text).toContain('entrá directo a wedin')
    expect(email.text).toContain(`Iniciar sesión:\n${magicLink}`)
  })

  it('uses one document with the real escaped link and an inline logo CID', () => {
    const email = buildAuthEmail({ isNewUser: false, url: magicLink })

    expect(email.html.match(/<!DOCTYPE html>/g)).toHaveLength(1)
    expect(email.html).toContain(
      'href="https://www.somoswedin.com/api/auth/callback/resend?callbackUrl=%2Fonboarding&amp;token=secret"'
    )
    expect(email.html).toContain('src="cid:wedin-auth-logo"')
    expect(email.html).not.toContain('{{MAGIC_LINK}}')
    expect(email.html).not.toContain('data:image')
  })

  it('attaches the logo data referenced by the HTML', async () => {
    const request = await buildAuthEmailRequest({
      from: 'Wedin <acceso@somoswedin.com>',
      isNewUser: false,
      to: 'user@example.com',
      url: magicLink,
    })

    expect(request.attachments).toHaveLength(1)
    expect(request.attachments[0]).toMatchObject({
      content_id: 'wedin-auth-logo',
      filename: 'wedin-auth-logo.png',
    })
    expect(Buffer.from(request.attachments[0].content, 'base64')).toEqual(
      expect.objectContaining({ length: 30_673 })
    )
  })

  it('keeps the displayed and configured expiration at 15 minutes', () => {
    const newUserEmail = buildAuthEmail({ isNewUser: true, url: magicLink })
    const loginEmail = buildAuthEmail({ isNewUser: false, url: magicLink })

    expect(AUTH_EMAIL_MAX_AGE_SECONDS).toBe(15 * 60)
    expect(newUserEmail.html).toContain('vence en 15 minutos')
    expect(loginEmail.html).toContain('vence en 15 minutos')
  })
})
