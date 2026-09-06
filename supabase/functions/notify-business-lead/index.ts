// Emails the Zentro team when a new business lead comes in from /landing.
// The lead row itself is inserted from the client (public INSERT policy);
// this function only validates the payload and sends the notification.
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const KINDS = ['events', 'restaurant', 'experiences', 'other']

const clean = (v: unknown, max: number): string => {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))

    const fullName = clean(body.fullName, 120)
    const businessName = clean(body.businessName, 120)
    const phone = clean(body.phone, 40)
    const businessKind = KINDS.includes(body.businessKind) ? body.businessKind : 'other'
    const email = clean(body.email, 255)
    const message = clean(body.message, 1000)
    const locale = body.locale === 'en' ? 'en' : 'es'

    if (!fullName || !businessName || !phone) {
      return new Response(
        JSON.stringify({ error: 'fullName, businessName and phone are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await sendTemplateEmail('business-lead', 'hello@zentro.today', {
      templateData: { fullName, businessName, businessKind, phone, email, message, locale },
      replyTo: email || undefined,
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-business-lead failed', err)
    return new Response(JSON.stringify({ error: 'send failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
