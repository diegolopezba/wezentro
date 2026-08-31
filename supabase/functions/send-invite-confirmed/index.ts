import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/send-app-email.ts'

const SITE = 'https://zentro.today'

// Sends the "invite-confirmed" ticket email after a guest confirms a public
// special invitation at /i/:token. All recipient data is derived server-side
// from the invite row — the browser only supplies the invite token.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token || token.length > 200) return json({ error: 'token is required' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)

  const { data, error } = await admin.rpc('get_public_invite', { _token: token })
  if (error) {
    console.error('invite lookup failed', error.message)
    return json({ error: 'lookup_failed' }, 500)
  }

  const invite = Array.isArray(data) ? data[0] : data
  if (!invite || !invite.rsvp_confirmed_at || !invite.qr_code_token) {
    return json({ sent: false, reason: 'not_confirmed' }, 200)
  }

  const recipient = (invite.rsvp_email || invite.guest_email || '').trim().toLowerCase()
  if (!recipient) return json({ sent: false, reason: 'no_recipient' }, 200)

  const eventDate = invite.event_start
    ? new Intl.DateTimeFormat('es-BO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/La_Paz',
      }).format(new Date(invite.event_start))
    : undefined

  try {
    const result = await sendAppEmail(admin, 'invite-confirmed', recipient, {
      idempotencyKey: `invite-confirmed-${invite.id}`,
      templateData: {
        guestName: invite.rsvp_name || invite.guest_name || undefined,
        eventTitle: invite.event_title ?? undefined,
        eventDate,
        eventLocation: invite.event_location ?? undefined,
        eventImageUrl: invite.event_image_url ?? undefined,
        segment: invite.segment ?? undefined,
        hostName: invite.host_name ?? undefined,
        ticketUrl: `${SITE}/i/${invite.token}`,
        qrImageUrl: `${supabaseUrl}/functions/v1/invite-qr?token=${encodeURIComponent(invite.qr_code_token)}`,
      },
    })
    if (!result.sent) {
      console.warn('invite confirmation not sent', result.reason)
      return json({ sent: false, reason: result.reason }, 200)
    }
  } catch (e) {
    console.error('invite confirmation failed', (e as Error).message)
    return json({ sent: false }, 200)
  }

  return json({ sent: true })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
