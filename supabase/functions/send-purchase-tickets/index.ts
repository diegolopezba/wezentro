import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SITE = 'https://zentro.today'

// Emails every ticket created by a confirmed payment session:
//  - the buyer receives all QRs (so they can forward the ones for non-users)
//  - each tagged user also receives their own ticket
// Service-role only: it is called by qhantuy-callback.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${serviceKey}`) {
    return json({ error: 'not_authorized' }, 401)
  }

  let paymentSessionId: string | undefined
  try {
    paymentSessionId = (await req.json())?.paymentSessionId
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!paymentSessionId || typeof paymentSessionId !== 'string') {
    return json({ error: 'paymentSessionId is required' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: session } = await admin
    .from('payment_sessions')
    .select('id, event_id, buyer_user_id, status')
    .eq('id', paymentSessionId)
    .maybeSingle()
  if (!session || session.status !== 'confirmed') {
    return json({ error: 'session_not_confirmed' }, 404)
  }

  const { data: event } = await admin
    .from('events')
    .select('id, title, start_datetime, location_name, image_url')
    .eq('id', session.event_id)
    .maybeSingle()

  const { data: entries } = await admin
    .from('guestlist_entries')
    .select('id, user_id, qr_code_token, ticket_tier_id')
    .eq('payment_session_id', paymentSessionId)
    .order('created_at', { ascending: true })

  if (!entries?.length) return json({ sent: 0 }, 200)

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

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, username, email')
    .in('id', userIds)
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))

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
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        templateName: 'tickets-purchased',
        recipientEmail,
        idempotencyKey,
        templateData,
      }),
    })
    if (!res.ok) console.error('tickets email failed', res.status, await res.text())
    return res.ok
  }

  const baseData = {
    eventTitle: event?.title ?? 'tu evento',
    eventDate,
    eventLocation: event?.location_name ?? undefined,
    eventImageUrl: event?.image_url ?? undefined,
    tierName,
    ticketUrl: `${SITE}/going/${session.event_id}`,
  }

  let sent = 0

  // Buyer: all tickets in one email.
  const buyer = profileById.get(session.buyer_user_id)
  if (buyer?.email) {
    const ok = await sendEmail(buyer.email, `tickets-${paymentSessionId}-buyer`, {
      ...baseData,
      guestName: buyer.full_name || buyer.username || undefined,
      tickets: allTickets,
    })
    if (ok) sent++
  }

  // Tagged users: their own ticket.
  for (const entry of entries as any[]) {
    if (!entry.user_id || entry.user_id === session.buyer_user_id) continue
    const p = profileById.get(entry.user_id)
    if (!p?.email) continue
    const ok = await sendEmail(p.email, `tickets-${paymentSessionId}-${entry.id}`, {
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
    if (ok) sent++
  }

  return json({ sent, tickets: entries.length }, 200)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
