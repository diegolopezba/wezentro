// Sends the lounge confirmation email to the buyer of an area booking.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { areaBookingId } = await req.json()
    if (!areaBookingId) {
      return new Response(JSON.stringify({ error: 'areaBookingId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: booking, error } = await supabase
      .from('area_bookings')
      .select(
        'id, party_size, included_tickets, answers, user_id, payment_sessions:payment_session_id(amount), event_areas:event_area_id(name, description, perks, arrival_note, event_id, events:event_id(title, start_datetime))',
      )
      .eq('id', areaBookingId)
      .maybeSingle()
    if (error) throw error
    if (!booking) {
      return new Response(JSON.stringify({ error: 'booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const area: any = (booking as any).event_areas
    const event: any = area?.events

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', (booking as any).user_id)
      .maybeSingle()

    const { data: authUser } = await supabase.auth.admin.getUserById(
      (booking as any).user_id,
    )
    const to = authUser?.user?.email
    if (!to) {
      return new Response(JSON.stringify({ skipped: 'no email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Map answer ids to their question labels for a readable email.
    const { data: questions } = await supabase
      .from('event_purchase_questions')
      .select('id, label')
      .eq('event_id', area?.event_id)
    const labels: Record<string, string> = {}
    for (const q of (questions ?? []) as any[]) labels[q.id] = q.label
    const answers = Object.entries(((booking as any).answers ?? {}) as Record<string, string>).map(
      ([id, value]) => ({ label: labels[id] ?? 'Respuesta', value }),
    )

    const amount = (booking as any).payment_sessions?.amount
    const result = await sendTemplateEmail('lounge-confirmed', to, {
      idempotencyKey: `lounge-confirmed-${areaBookingId}`,
      templateData: {
        guestName: profile?.full_name || profile?.username || undefined,
        eventTitle: event?.title,
        eventDate: event?.start_datetime
          ? new Date(event.start_datetime).toLocaleString('es-BO', {
              dateStyle: 'full',
              timeStyle: 'short',
              timeZone: 'America/La_Paz',
            })
          : undefined,
        areaName: area?.name,
        areaDescription: area?.description ?? undefined,
        perks: area?.perks ?? [],
        arrivalNote: area?.arrival_note ?? undefined,
        partySize: (booking as any).party_size,
        includedTickets: (booking as any).included_tickets ?? 0,
        amount: amount != null ? `Bs. ${amount}` : undefined,
        answers,
        ticketsUrl: 'https://zentro.today/tickets',
      },
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('send-lounge-email error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
