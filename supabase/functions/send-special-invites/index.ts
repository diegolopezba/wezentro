import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SITE = 'https://zentro.today'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server configuration error' }, 500)
  }

  let eventId: string | undefined
  let batchId: string | undefined
  let inviteIds: string[] | undefined
  try {
    const body = await req.json()
    eventId = body.eventId
    batchId = body.batchId ?? undefined
    inviteIds = Array.isArray(body.inviteIds) ? body.inviteIds.slice(0, 500) : undefined
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!eventId || typeof eventId !== 'string') {
    return json({ error: 'eventId is required' }, 400)
  }

  // Authenticate the caller and verify event ownership
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await userClient.auth.getUser()
  const user = userData?.user
  if (!user) return json({ error: 'not_authenticated' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, title, start_datetime, location_name, image_url, creator_id')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) return json({ error: eventError.message }, 500)
  if (!event) return json({ error: 'event_not_found' }, 404)
  if (event.creator_id !== user.id) return json({ error: 'not_event_owner' }, 403)

  const { data: host } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', event.creator_id)
    .maybeSingle()

  let query = admin
    .from('event_special_invites')
    .select('id, token, guest_name, guest_email, segment, email_status, status')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .in('email_status', ['not_sent', 'failed'])
    .not('guest_email', 'is', null)
    .limit(500)

  if (batchId) query = query.eq('batch_id', batchId)
  if (inviteIds?.length) query = query.in('id', inviteIds)

  const { data: invites, error: invitesError } = await query
  if (invitesError) return json({ error: invitesError.message }, 500)
  if (!invites?.length) return json({ sent: 0, failed: 0, remaining: 0 }, 200)

  const eventDate = event.start_datetime
    ? new Intl.DateTimeFormat('es-BO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/La_Paz',
      }).format(new Date(event.start_datetime))
    : undefined

  const hostName = host?.full_name || host?.username || undefined

  let sent = 0
  let failed = 0

  for (const invite of invites) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          templateName: 'special-invite',
          recipientEmail: invite.guest_email,
          idempotencyKey: `special-invite-${invite.id}`,
          templateData: {
            guestName: invite.guest_name ?? undefined,
            eventTitle: event.title,
            eventDate,
            eventLocation: event.location_name ?? undefined,
            eventImageUrl: event.image_url ?? undefined,
            segment: invite.segment ?? undefined,
            inviteUrl: `${SITE}/i/${invite.token}`,
            hostName,
          },
        }),
      })

      if (!res.ok) {
        const details = await res.text()
        console.error(`send-transactional-email failed [${res.status}]: ${details}`)
        failed++
        await admin
          .from('event_special_invites')
          .update({ email_status: 'failed' })
          .eq('id', invite.id)
        continue
      }

      sent++
      await admin
        .from('event_special_invites')
        .update({ email_status: 'sent', email_sent_at: new Date().toISOString() })
        .eq('id', invite.id)
    } catch (e) {
      console.error('send-special-invites error', e)
      failed++
      await admin
        .from('event_special_invites')
        .update({ email_status: 'failed' })
        .eq('id', invite.id)
    }
  }

  return json({ sent, failed, processed: invites.length }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
