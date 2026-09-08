export const AUTH_EMAIL_MAX_AGE_SECONDS = 15 * 60
export const AUTH_EMAIL_LOGO_CONTENT_ID = 'wedin-auth-logo'

type AuthEmailContent = {
  actionText: string
  body: string
  eyebrow: string
  heading: string
  notice: string
  preheader: string
  subject: string
  title: string
}

type BuildAuthEmailOptions = {
  isNewUser: boolean
  url: string
}

export type AuthEmail = {
  html: string
  subject: string
  text: string
}

const NEW_USER_CONTENT: AuthEmailContent = {
  actionText: 'Autenticar cuenta',
  body: 'Tocá el botón para confirmar tu correo y crear tu cuenta de wedin. El enlace es solo tuyo y vence en 15 minutos.',
  eyebrow: 'Verificación de cuenta',
  heading: 'Confirmá tu cuenta',
  notice:
    'Si vos no creaste esta cuenta, ignorá este correo. Nadie va a poder completar el acceso sin este enlace.',
  preheader: 'Confirmá tu correo para crear tu cuenta. Expira en 15 minutos.',
  subject: 'Autenticá tu cuenta de Wedin',
  title: 'Confirmá tu cuenta en wedin',
}

const LOGIN_CONTENT: AuthEmailContent = {
  actionText: 'Iniciar sesión',
  body: 'Tocá el botón y entrá directo a wedin, sin contraseña. El enlace es solo tuyo y vence en 15 minutos.',
  eyebrow: 'Acceso seguro',
  heading: 'Entrá a tu cuenta',
  notice:
    'Si vos no pediste este enlace, ignorá este correo. Nadie va a poder entrar a tu cuenta sin él.',
  preheader: 'Tu enlace para entrar a wedin. Expira en 15 minutos.',
  subject: 'Tu enlace para iniciar sesión en Wedin',
  title: 'Entrá a tu cuenta en wedin',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function buildAuthEmail({
  isNewUser,
  url,
}: BuildAuthEmailOptions): AuthEmail {
  const content = isNewUser ? NEW_USER_CONTENT : LOGIN_CONTENT
  const escapedUrl = escapeHtml(url)

  return {
    subject: content.subject,
    html: `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${content.title}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>
  .serif { font-family: Georgia, 'Times New Roman', serif !important; }
</style>
<![endif]-->
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400,100,1&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
<!--<![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400,100,1&family=Inter:wght@400;600&display=swap');
  .serif { font-variation-settings: 'SOFT' 100, 'WONK' 1; }
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; display:block; }
  body { margin:0; padding:0; width:100% !important; background-color:#F3F0E9; }
  @media screen and (max-width:600px) {
    .container { width:100% !important; }
    .pad { padding-left:28px !important; padding-right:28px !important; }
    .h1 { font-size:28px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#F3F0E9;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${content.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F0E9;">
<tr><td align="center" style="padding:48px 16px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
    <tr>
      <td align="center" style="padding:0 0 36px 0;">
        <img src="cid:${AUTH_EMAIL_LOGO_CONTENT_ID}" width="112" alt="wedin" style="width:112px; height:auto;" />
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; border-radius:14px; border:1px solid #E7E2D6;">
          <tr>
            <td class="pad" style="padding:52px 56px 0 56px;">
              <p style="margin:0 0 14px 0; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:#AB4F28;">${content.eyebrow}</p>
              <h1 class="h1 serif" style="margin:0 0 18px 0; font-family:'Fraunces','Iowan Old Style',Georgia,'Times New Roman',serif; font-size:34px; line-height:1.18; font-weight:400; letter-spacing:-0.3px; color:#1F1F1D;">${content.heading}</h1>
              <p style="margin:0; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.65; color:#5F5F58;">${content.body}</p>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:32px 56px 0 56px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#47644A" style="border-radius:100px;">
                    <a href="${escapedUrl}" target="_blank" style="display:inline-block; padding:15px 34px; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:100px;">${content.actionText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:26px 56px 0 56px;">
              <div style="border-top:1px solid #EDE9DE; font-size:0; line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:22px 56px 44px 56px;">
              <p style="margin:0; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.7; color:#8E8E86;">${content.notice}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 0 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#47644A; border-radius:14px;">
          <tr>
            <td class="pad" align="center" style="padding:32px 48px;">
              <p class="serif" style="margin:0 0 8px 0; font-family:'Fraunces','Iowan Old Style',Georgia,'Times New Roman',serif; font-size:17px; letter-spacing:-0.02em; line-height:1.45; font-weight:400; color:#F3F0E9;">Cada regalo, convertido en lo que de verdad necesitás.</p>
              <p style="margin:0 0 18px 0; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.6; color:#B9C6B5;">Casamientos &middot; 15 años &middot; Baby showers &middot; Cumpleaños</p>
              <p style="margin:0; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.7; color:#9DAE9A;">&copy; 2026 wedin &middot; Asunción, Paraguay<br />
                <a href="mailto:admin@somoswedin.com" style="color:#9DAE9A; text-decoration:underline;">admin@somoswedin.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`,
    text: `${content.heading}\n\n${content.body}\n\n${content.actionText}:\n${url}\n\n${content.notice}`,
  }
}
