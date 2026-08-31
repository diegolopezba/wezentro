import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/send-app-email.ts'

const SITE = 'https://zentro.today'

// Emails every ticket created by a confirmed payment session:
//  - the buyer receives all QRs (so they can forward the ones for non-users)
//  - each tagged user also receives their own ticket
// Service-role only: it is called by qhantuy-callback.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''
  const isService = authHeader === `Bearer ${serviceKey}`

  let body: any = {}
  try {
    body = (await req.json()) ?? {}
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const paymentSessionId: string | undefined = body.paymentSessionId
  const freeEventId: string | undefined = body.eventId

  const admin = createClient(supabaseUrl, serviceKey)

  // Free-entry mode: an authenticated user asks for the email of their own ticket.
  let callerUserId: string | null = null
  if (!isService) {
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'not_authorized' }, 401)
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await authClient.auth.getUser()
    if (!userData?.user) return json({ error: 'not_authorized' }, 401)
    callerUserId = userData.user.id
    if (!freeEventId || typeof freeEventId !== 'string') {
      return json({ error: 'eventId is required' }, 400)
    }
  } else if (!paymentSessionId || typeof paymentSessionId !== 'string') {
    return json({ error: 'paymentSessionId is required' }, 400)
  }

  let session: any = null
  let eventId: string | null = null

  if (isService) {
    const { data } = await admin
      .from('payment_sessions')
      .select('id, event_id, buyer_user_id, status')
      .eq('id', paymentSessionId!)
      .maybeSingle()
    session = data
    if (!session || session.status !== 'confirmed') {
      return json({ error: 'session_not_confirmed' }, 404)
    }
    eventId = session.event_id
  } else {
    session = { id: null, event_id: freeEventId!, buyer_user_id: callerUserId }
    eventId = freeEventId!
  }

  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id, title, start_datetime, location_name, image_url')
    .eq('id', eventId)
    .maybeSingle()
  if (eventError || !event) {
    console.error('ticket email event lookup failed', eventId, eventError)
    return json({ error: 'event_not_found' }, 404)
  }

  let entriesQuery = admin
    .from('guestlist_entries')
    .select('id, user_id, qr_code_token, ticket_tier_id')
    .order('joined_at', { ascending: true })

  entriesQuery = isService
    ? entriesQuery.eq('payment_session_id', paymentSessionId!)
    : entriesQuery.eq('event_id', eventId).eq('user_id', callerUserId!).eq('status', 'approved')

  const { data: entries, error: entriesError } = await entriesQuery

  if (entriesError) {
    console.error('ticket email entry lookup failed', { eventId, paymentSessionId, entriesError })
    return json({ error: 'ticket_lookup_failed' }, 500)
  }

  if (!entries?.length) {
    console.error('ticket email skipped because no confirmed ticket was found', {
      eventId,
      paymentSessionId,
      callerUserId,
    })
    return json({ error: 'ticket_not_found' }, 404)
  }


  const tierId = entries.find((e: any) => e.ticket_tier_id)?.ticket_tier_id ?? null
  let tierName: string | undefined
  if (tierId) {
    const { data: tier } = await admin
      .from('ticket_tiers')
      .select('name')
      .eq('id', tierId)
      .maybeSingle()
    tierName = tier?.name ?? undefined
  }

  const userIds = [...new Set(entries.map((e: any) => e.user_id).filter(Boolean) as string[])]
  if (!userIds.includes(session.buyer_user_id)) userIds.push(session.buyer_user_id)

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, full_name, username')
    .in('id', userIds)
  if (profilesError) {
    console.error('ticket email profile lookup failed', profilesError)
    return json({ error: 'recipient_lookup_failed' }, 500)
  }

  // `profiles` has no email column — addresses live in auth.users.
  const emailById = new Map<string, string>()
  await Promise.all(
    userIds.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id)
      if (error) console.error('ticket email auth lookup failed', id, error.message)
      if (data?.user?.email) emailById.set(id, data.user.email)
    }),
  )

  const profileRows = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]))
  const profileById = new Map(
    userIds.map((id) => {
      const profile = profileRows.get(id) ?? { id, full_name: null, username: null }
      return [id, { ...profile, email: emailById.get(id) }]
    }),
  )
  const buyerEmail = emailById.get(session.buyer_user_id)
  if (!buyerEmail) {
    console.error('no buyer email resolved for ticket confirmation', {
      paymentSessionId,
      eventId,
      buyerUserId: session.buyer_user_id,
    })
    return json({ error: 'buyer_email_not_found' }, 422)
  }


  const eventDate = event?.start_datetime
    ? new Intl.DateTimeFormat('es-BO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/La_Paz',
      }).format(new Date(event.start_datetime))
    : undefined

  const qrUrl = (token: string) =>
    `${supabaseUrl}/functions/v1/invite-qr?token=${encodeURIComponent(token)}`

  const displayName = (id: string | null) => {
    if (!id) return undefined
    const p = profileById.get(id)
    return p?.full_name || p?.username || undefined
  }

  const allTickets = entries.map((e: any, i: number) => ({
    label: `Entrada ${i + 1}`,
    qrImageUrl: e.qr_code_token ? qrUrl(e.qr_code_token) : undefined,
    assignedToName:
      e.user_id === session.buyer_user_id
        ? 'Vos'
        : displayName(e.user_id) ?? 'Sin asignar (reenviá este QR)',
  }))

  const sendEmail = async (
    recipientEmail: string,
    idempotencyKey: string,
    templateData: Record<string, unknown>,
  ) => {
    try {
      const result = await sendAppEmail(admin, 'tickets-purchased', recipientEmail, {
        idempotencyKey,
        templateData,
      })
      if (!result.sent) {
        console.warn('tickets email not sent', { idempotencyKey, reason: result.reason })
        return false
      }
    } catch (error) {
      console.error('tickets email failed', (error as Error).message)
      return false
    }
    console.log('ticket confirmation sent', { idempotencyKey })
    return true
  }

  const baseData = {
    eventTitle: event?.title ?? 'tu evento',
    eventDate,
    eventLocation: event?.location_name ?? undefined,
    eventImageUrl: event?.image_url ?? undefined,
    tierName,
    ticketUrl: `${SITE}/going/${eventId}`,
  }

  const keyPrefix = paymentSessionId ? `tickets-${paymentSessionId}` : `tickets-free-${eventId}`

  let queued = 0
  let failed = 0

  // Buyer: all tickets in one email.
  const buyer = profileById.get(session.buyer_user_id)
  if (buyer?.email) {
    const ok = await sendEmail(buyer.email, `${keyPrefix}-buyer-${entries[0].id}`, {
      ...baseData,
      guestName: buyer.full_name || buyer.username || undefined,
      tickets: allTickets,
    })
    if (ok) queued++
    else failed++
  }


  // Tagged users: their own ticket.
  for (const entry of entries as any[]) {
    if (!entry.user_id || entry.user_id === session.buyer_user_id) continue
    const p = profileById.get(entry.user_id)
    if (!p?.email) continue
    const ok = await sendEmail(p.email, `${keyPrefix}-${entry.id}`, {
      ...baseData,
      guestName: p.full_name || p.username || undefined,
      isRecipientCopy: true,
      tickets: [
        {
          label: 'Tu entrada',
          qrImageUrl: entry.qr_code_token ? qrUrl(entry.qr_code_token) : undefined,
        },
      ],
    })
    if (ok) queued++
    else failed++
  }

  if (queued === 0 || failed > 0) {
    return json({ error: 'ticket_email_dispatch_failed', queued, failed, tickets: entries.length }, 502)
  }

  return json({ queued, failed, tickets: entries.length }, 200)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
