import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SITE = 'https://zentro.today'

// Sends experience booking emails:
//  - the buyer (and tagged guests) get "experience-confirmed"
//  - the business gets "experience-received"
// Called by the app right after a booking is created/cancelled, and by
// qhantuy-callback once a paid booking is confirmed.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  let body: { experienceBookingId?: string; kind?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const bookingId = body?.experienceBookingId
  const kind = body?.kind === 'cancelled' ? 'cancelled' : 'created'
  if (!bookingId || typeof bookingId !== 'string') {
    return json({ error: 'experienceBookingId is required' }, 400)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return json({ error: 'not_authorized' }, 401)

  const admin = createClient(supabaseUrl, serviceKey)

  // Either a service-role call (qhantuy-callback) or a signed-in participant.
  let callerId: string | null = null
  if (token !== serviceKey) {
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData } = await authed.auth.getUser()
    callerId = userData?.user?.id ?? null
    if (!callerId) return json({ error: 'not_authorized' }, 401)
  }

  const { data: booking } = await admin
    .from('experience_bookings')
    .select(
      'id, experience_id, segment_id, user_id, booking_date, booking_time, quantity, amount, notes, status',
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking) return json({ error: 'booking_not_found' }, 404)

  const { data: experience } = await admin
    .from('experiences')
    .select('id, title, image_url, location_note, business_id')
    .eq('id', booking.experience_id)
    .maybeSingle()

  if (!experience) return json({ error: 'experience_not_found' }, 404)

  if (
    callerId &&
    callerId !== booking.user_id &&
    callerId !== experience.business_id
  ) {
    return json({ error: 'not_authorized' }, 403)
  }

  // Only email for confirmed or cancelled bookings — pending_payment holds are transient.
  if (kind === 'created' && booking.status !== 'confirmed') {
    return json({ sent: 0, skipped: 'not_confirmed' }, 200)
  }

  let segmentName: string | undefined
  if (booking.segment_id) {
    const { data: seg } = await admin
      .from('experience_segments')
      .select('name')
      .eq('id', booking.segment_id)
      .maybeSingle()
    segmentName = seg?.name ?? undefined
  }

  const { data: guestRows } = await admin
    .from('experience_booking_guests')
    .select('user_id')
    .eq('booking_id', bookingId)

  const guestIds = (guestRows ?? []).map((g: any) => g.user_id).filter(Boolean)
  const profileIds = [
    ...new Set([booking.user_id, experience.business_id, ...guestIds].filter(Boolean)),
  ] as string[]

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, username')
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

  const customer = profileById.get(booking.user_id)
  const business = profileById.get(experience.business_id)

  const dateLabel = new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/La_Paz',
  }).format(new Date(`${booking.booking_date}T12:00:00`))

  const timeLabel = String(booking.booking_time).slice(0, 5)
  const cancelled = kind === 'cancelled'
  const nameOf = (p: any) => p?.full_name || p?.username || undefined
  const amount = Number(booking.amount || 0)
  const totalAmount = amount > 0 ? `Bs. ${amount.toFixed(2)}` : 'Gratis'

  const sendEmail = async (
    templateName: string,
    recipientEmail: string,
    idempotencyKey: string,
    templateData: Record<string, unknown>,
  ) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
    })
    if (!res.ok) console.error('experience email failed', templateName, res.status, await res.text())
    return res.ok
  }

  const businessName = nameOf(business) ?? 'el negocio'
  const guestBase = {
    experienceTitle: experience.title,
    businessName,
    experienceImageUrl: experience.image_url ?? undefined,
    bookingDate: dateLabel,
    bookingTime: timeLabel,
    quantity: booking.quantity,
    segmentName,
    totalAmount,
    meetingPoint: experience.location_note ?? undefined,
    notes: booking.notes ?? undefined,
    bookingUrl: `${SITE}/experience-booking/${bookingId}`,
    cancelled,
    
  }

  let sent = 0

  if (customer?.email) {
    const ok = await sendEmail(
      'experience-confirmed',
      customer.email,
      `experience-${kind}-${bookingId}-owner`,
      { ...guestBase, guestName: nameOf(customer) },
    )
    if (ok) sent++
  }

  for (const gid of guestIds) {
    if (gid === booking.user_id) continue
    const g = profileById.get(gid)
    if (!g?.email) continue
    const ok = await sendEmail(
      'experience-confirmed',
      g.email,
      `experience-${kind}-${bookingId}-${gid}`,
      { ...guestBase, guestName: nameOf(g), isGuestCopy: true },
    )
    if (ok) sent++
  }

  if (business?.email) {
    const ok = await sendEmail(
      'experience-received',
      business.email,
      `experience-${kind}-${bookingId}-business`,
      {
        customerName: nameOf(customer) ?? 'Un cliente',
        experienceTitle: experience.title,
        bookingDate: dateLabel,
        bookingTime: timeLabel,
        quantity: booking.quantity,
        segmentName,
        totalAmount,
        notes: booking.notes ?? undefined,
        guestNames: guestIds
          .filter((g) => g !== booking.user_id)
          .map((g) => nameOf(profileById.get(g)))
          .filter(Boolean),
        dashboardUrl: `${SITE}/dashboard`,
        cancelled,
        
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
