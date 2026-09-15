import { Resend } from 'resend'

function getFromAddress() {
  return process.env.RESEND_FROM || 'md-nest <onboarding@resend.dev>'
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY
}

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:32px 28px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2d6a4f;">md-nest</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#1c1917;">${title}</h1>
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendEmail(options: {
  to: string
  subject: string
  html: string
}) {
  const resend = getResendClient()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY is not set — email not sent:', options.subject)
    return { ok: false as const, error: 'Email service is not configured' }
  }

  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
  })

  if (error) {
    console.error('[email] Resend error:', error)
    return { ok: false as const, error: error.message || 'Failed to send email' }
  }

  return { ok: true as const, id: data?.id }
}

export async function sendPasswordResetEmail(options: {
  to: string
  name?: string | null
  url: string
}) {
  const greeting = options.name?.trim() ? `Hi ${options.name.trim()},` : 'Hi,'
  const html = layout(
    'Reset your password',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;">${greeting}</p>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#44403c;">We received a request to reset your md-nest password. Click the button below to choose a new one. This link expires in 1 hour.</p>
     <p style="margin:0 0 24px;">
       <a href="${options.url}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#1c1917;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Reset password</a>
     </p>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">If you did not request this, you can ignore this email.</p>`
  )

  return sendEmail({
    to: options.to,
    subject: 'Reset your md-nest password',
    html,
  })
}

export async function sendModerationWarningEmail(options: {
  to: string
  name?: string | null
  message: string
  fileTitle?: string | null
}) {
  const greeting = options.name?.trim() ? `Hi ${options.name.trim()},` : 'Hi,'
  const fileLine = options.fileTitle
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;"><strong>Document:</strong> ${options.fileTitle}</p>`
    : ''

  const html = layout(
    'Community guidelines warning',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;">${greeting}</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44403c;">Your content on md-nest received a warning from our moderation team.</p>
     ${fileLine}
     <div style="margin:0 0 20px;padding:14px 16px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:15px;line-height:1.6;">${options.message}</div>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">Repeated violations may lead to content removal or account restrictions.</p>`
  )

  return sendEmail({
    to: options.to,
    subject: 'md-nest community guidelines warning',
    html,
  })
}
