import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AUTH_EMAIL_LOGO_CONTENT_ID, buildAuthEmail } from '@/lib/auth-email'

type BuildAuthEmailRequestOptions = {
  from: string
  isNewUser: boolean
  to: string
  url: string
}

export async function buildAuthEmailRequest({
  from,
  isNewUser,
  to,
  url,
}: BuildAuthEmailRequestOptions) {
  const email = buildAuthEmail({ isNewUser, url })
  const logo = await readFile(
    join(process.cwd(), 'public', 'assets', 'auth-email-logo.png')
  )

  return {
    from,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    attachments: [
      {
        content: logo.toString('base64'),
        filename: 'wedin-auth-logo.png',
        content_id: AUTH_EMAIL_LOGO_CONTENT_ID,
      },
    ],
  }
}
