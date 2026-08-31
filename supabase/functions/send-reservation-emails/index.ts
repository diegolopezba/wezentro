import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/send-app-email.ts'

const SITE = 'https://zentro.today'

// Sends reservation emails:
//  - customer (and tagged guests) get "reservation-confirmed"
//  - the business gets "reservation-received"
// Called by the app right after a reservation is created or cancelled.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  let body: { reservationId?: string; kind?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const reservationId = body?.reservationId
  const kind = body?.kind === 'cancelled' ? 'cancelled' : 'created'
  if (!reservationId || typeof reservationId !== 'string') {
    return json({ error: 'reservationId is required' }, 400)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return json({ error: 'not_authorized' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)

  // Either a service-role call, or a signed-in participant of the reservation.
  let callerId: string | null = null
  if (token !== serviceKey) {
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData } = await authed.auth.getUser()
    callerId = userData?.user?.id ?? null
    if (!callerId) return json({ error: 'not_authorized' }, 401)
  }

  const { data: reservation } = await admin
    .from('reservations')
    .select(
      'id, business_id, user_id, reservation_date, reservation_time, party_size, notes, status, cancelled_by, table_id',
    )
    .eq('id', reservationId)
    .maybeSingle()

  if (!reservation) return json({ error: 'reservation_not_found' }, 404)
  if (callerId && callerId !== reservation.user_id && callerId !== reservation.business_id) {
    return json({ error: 'not_authorized' }, 403)
  }

  const { data: guestRows } = await admin
    .from('reservation_guests')
    .select('user_id')
    .eq('reservation_id', reservationId)

  const guestIds = (guestRows ?? []).map((g: any) => g.user_id).filter(Boolean)
  const profileIds = [
    ...new Set([reservation.user_id, reservation.business_id, ...guestIds].filter(Boolean)),
  ] as string[]

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, username, business_address')
    .in('id', profileIds)
  // Emails live in auth.users, not in profiles.
  const emailById = new Map<string, string>()
  await Promise.all(
    profileIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id)
      if (data?.user?.email) emailById.set(id, data.user.email)
    }),
  )

  const profileById = new Map(
    (profiles ?? []).map((p: any) => [p.id, { ...p, email: emailById.get(p.id) }]),
  )

  const customer = profileById.get(reservation.user_id)
  const business = profileById.get(reservation.business_id)

  let tableLabel: string | undefined
  if (reservation.table_id) {
    const { data: table } = await admin
      .from('restaurant_tables')
      .select('name, zone')
      .eq('id', reservation.table_id)
      .maybeSingle()
    if (table?.name) tableLabel = table.zone ? `${table.name} · ${table.zone}` : table.name
  }

  const dateLabel = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/La_Paz',
  }).format(new Date(`${reservation.reservation_date}T12:00:00`))

  const timeLabel = String(reservation.reservation_time).slice(0, 5)
  const cancelled = kind === 'cancelled'
  const nameOf = (p: any) => p?.full_name || p?.username || undefined

  const sendEmail = async (
    templateName: string,
    recipientEmail: string,
    idempotencyKey: string,
    templateData: Record<string, unknown>,
  ) => {
    try {
      const result = await sendAppEmail(admin, templateName, recipientEmail, {
        idempotencyKey,
        templateData,
      })
      if (!result.sent) {
        console.warn('reservation email not sent', templateName, result.reason)
        return false
      }
      return true
    } catch (error) {
      console.error('reservation email failed', templateName, (error as Error).message)
      return false
    }
  }

  const businessName = nameOf(business) ?? 'el negocio'
  const guestBase = {
    businessName,
    reservationDate: dateLabel,
    reservationTime: timeLabel,
    partySize: reservation.party_size,
    tableLabel,
    address: business?.business_address ?? undefined,
    notes: reservation.notes ?? undefined,
    reservationUrl: `${SITE}/tickets`,
    cancelled,
    cancelledBy: reservation.cancelled_by ?? undefined,
  }

  let sent = 0

  if (customer?.email) {
    const ok = await sendEmail(
      'reservation-confirmed',
      customer.email,
      `reservation-${kind}-${reservationId}-owner`,
      { ...guestBase, guestName: nameOf(customer) },
    )
    if (ok) sent++
  }

  for (const gid of guestIds) {
    if (gid === reservation.user_id) continue
    const g = profileById.get(gid)
    if (!g?.email) continue
    const ok = await sendEmail(
      'reservation-confirmed',
      g.email,
      `reservation-${kind}-${reservationId}-${gid}`,
      { ...guestBase, guestName: nameOf(g), isGuestCopy: true },
    )
    if (ok) sent++
  }

  if (business?.email) {
    const ok = await sendEmail(
      'reservation-received',
      business.email,
      `reservation-${kind}-${reservationId}-business`,
      {
        customerName: nameOf(customer) ?? 'Un cliente',
        reservationDate: dateLabel,
        reservationTime: timeLabel,
        partySize: reservation.party_size,
        tableLabel,
        notes: reservation.notes ?? undefined,
        guestNames: guestIds
          .filter((g) => g !== reservation.user_id)
          .map((g) => nameOf(profileById.get(g)))
          .filter(Boolean),
        dashboardUrl: `${SITE}/dashboard`,
        cancelled,
        cancelledBy: reservation.cancelled_by ?? undefined,
      },
    )
    if (ok) sent++
  }

  return json({ sent }, 200)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
