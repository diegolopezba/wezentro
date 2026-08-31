import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Daily cron: renewal reminders, grace period, and expiry for business plans.
//  - 3 days before period end -> reminder (email + notification)
//  - period end passed        -> status past_due, grace_until = end + 5 days
//  - grace expired            -> status cancelled (gating falls back to Básico)

const GRACE_DAYS = 5
const PLAN_NAMES: Record<string, string> = {
  basico: 'Básico',
  profesional: 'Profesional',
  elite: 'Premium',
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  const now = new Date()
  const result = { reminded: 0, pastDue: 0, cancelled: 0 }

  const notify = async (userId: string, title: string, body: string, type = 'subscription_renewal') => {
    await admin.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      entity_type: 'subscription',
      entity_id: userId,
    })
  }

  const email = async (businessId: string, kind: 'renewal' | 'expired', daysLeft?: number) => {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-subscription-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ businessId, kind, daysLeft }),
      })
    } catch (e) {
      console.error('subscription email dispatch failed', e)
    }
  }

  try {
    const { data: subs, error } = await admin
      .from('business_subscriptions')
      .select(
        'business_id, tier, status, billing_interval, billing_period_end, grace_until, reminders_sent',
      )
      .in('status', ['active', 'past_due'])
      .not('billing_period_end', 'is', null)
      .limit(1000)

    if (error) throw error

    for (const sub of subs ?? []) {
      const end = new Date(sub.billing_period_end as string)
      const planName = PLAN_NAMES[String(sub.tier)] ?? 'Zentro'
      const msLeft = end.getTime() - now.getTime()
      const daysLeft = Math.ceil(msLeft / 86_400_000)
      const reminders = (sub.reminders_sent ?? {}) as Record<string, unknown>
      const cycleKey = end.toISOString().slice(0, 10)

      // 1) Upcoming renewal reminder (3 days out)
      if (sub.status === 'active' && msLeft > 0 && daysLeft <= 3) {
        if (reminders[`pre-${cycleKey}`]) continue
        await notify(
          sub.business_id,
          'Tu plan se renueva pronto',
          `Renová tu plan ${planName} con QR para no perder funciones.`,
        )
        await email(sub.business_id, 'renewal', daysLeft)
        await admin
          .from('business_subscriptions')
          .update({ reminders_sent: { ...reminders, [`pre-${cycleKey}`]: true } })
          .eq('business_id', sub.business_id)
        result.reminded++
        continue
      }

      // 2) Period ended -> grace period
      if (sub.status === 'active' && msLeft <= 0) {
        const graceUntil = new Date(end.getTime() + GRACE_DAYS * 86_400_000).toISOString()
        await admin
          .from('business_subscriptions')
          .update({ status: 'past_due', grace_until: graceUntil })
          .eq('business_id', sub.business_id)
        await notify(
          sub.business_id,
          'Tu plan venció',
          `Tenés ${GRACE_DAYS} días para renovar tu plan ${planName}.`,
          'subscription_expired',
        )
        await email(sub.business_id, 'expired')
        result.pastDue++
        continue
      }

      // 3) Grace period over -> cancel
      if (sub.status === 'past_due') {
        const grace = sub.grace_until
          ? new Date(sub.grace_until as string)
          : new Date(end.getTime() + GRACE_DAYS * 86_400_000)
        if (grace.getTime() <= now.getTime()) {
          await admin
            .from('business_subscriptions')
            .update({ status: 'cancelled', cancelled_at: now.toISOString() })
            .eq('business_id', sub.business_id)
          await notify(
            sub.business_id,
            'Plan desactivado',
            'Tu plan se desactivó por falta de pago. Podés reactivarlo cuando quieras.',
            'subscription_expired',
          )
          result.cancelled++
        }
      }
    }

    console.log('subscription-lifecycle', result)
    return json({ ok: true, ...result })
  } catch (err) {
    console.error('subscription-lifecycle error:', err)
    return json({ error: 'Internal error' }, 500)
  }
})
