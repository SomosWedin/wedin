type EmailLayoutOptions = {
  heading: string
  body: string
  content: string
  footer?: string
}

type SendEmailOptions = {
  apiKey?: string
  from?: string
  to: string
  subject: string
  html: string
  text: string
}

export const WEDIN_EMAIL_FROM = 'Wedin <no-reply@somoswedin.com>'

const DEFAULT_FOOTER = 'Si no solicitaste este correo, podés ignorarlo.'

export function renderEmailLayout({
  heading,
  body,
  content,
  footer = DEFAULT_FOOTER,
}: EmailLayoutOptions) {
  return `
          <!doctype html>
          <html>
            <body style="margin:0; background:#f6f6f6; font-family:Arial,sans-serif;">
              <div style="max-width:560px; margin:40px auto; padding:32px; background:white; border-radius:12px;">
                <h1 style="color:#222; margin-top:0;">
                  ${heading}
                </h1>

                <p style="color:#555; line-height:1.6;">
                  ${body}
                </p>

                ${content}

                <p style="color:#888; font-size:13px;">
                  ${footer}
                </p>
              </div>
            </body>
          </html>
        `
}

export function renderEmailButton(url: string, label: string) {
  return `
                <a
                  href="${url}"
                  style="
                    display:inline-block;
                    padding:14px 24px;
                    margin:16px 0;
                    background:#16a268;
                    color:white;
                    text-decoration:none;
                    border-radius:8px;
                    font-weight:600;
                  "
                >
                  ${label}
                </a>
  `
}

export function renderEmailCode(code: string) {
  return `
                <p
                  style="
                    margin:16px 0;
                    padding:16px 24px;
                    background:#f2f7f4;
                    border-radius:8px;
                    color:#16a268;
                    font-family:'Courier New',Courier,monospace;
                    font-size:32px;
                    font-weight:700;
                    letter-spacing:8px;
                    text-align:center;
                  "
                >
                  ${code}
                </p>
  `
}

export async function sendEmail({
  apiKey = process.env.RESEND_API_KEY,
  from = WEDIN_EMAIL_FROM,
  to,
  subject,
  html,
  text,
}: SendEmailOptions) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend error: ${error}`)
  }
}
