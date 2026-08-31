import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendAppEmail } from '../_shared/send-app-email.ts'

const SITE = 'https://zentro.today'
const PLAN_NAMES: Record<string, string> = {
  basico: 'Básico',
  profesional: 'Profesional',
  elite: 'Premium',
}

const money = (n: number) => `Bs. ${Number(n || 0).toFixed(2).replace(/\.00$/, '')}`
const dateLabel = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })
    : undefined

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Subscription lifecycle emails (activation + renewal reminders).
// Service-role only: called from qhantuy-callback and subscription-lifecycle.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (token !== serviceKey) return json({ error: 'not_authorized' }, 401)

  let body: {
    businessId?: string
    kind?: 'activated' | 'renewal' | 'expired'
    paymentSessionId?: string
    daysLeft?: number
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const businessId = body?.businessId
  const kind = body?.kind ?? 'activated'
  if (!businessId) return json({ error: 'businessId is required' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: sub } = await admin
    .from('business_subscriptions')
    .select('tier, status, billing_interval, billing_period_end')
    .eq('business_id', businessId)
    .maybeSingle()

  if (!sub) return json({ error: 'subscription_not_found' }, 404)

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', businessId)
    .maybeSingle()

  const { data: userRes } = await admin.auth.admin.getUserById(businessId)
  const recipientEmail = userRes?.user?.email
  if (!recipientEmail) return json({ error: 'no_email' }, 200)

  let amount = 0
  if (body.paymentSessionId) {
    const { data: ps } = await admin
      .from('payment_sessions')
      .select('amount')
      .eq('id', body.paymentSessionId)
      .maybeSingle()
    amount = Number(ps?.amount ?? 0)
  }

  const planName = PLAN_NAMES[String(sub.tier)] ?? 'Zentro'
  const plansUrl = `${SITE}/settings/business/plans`
  const businessName = profile?.full_name || profile?.username || undefined

  const templateName = kind === 'activated' ? 'subscription-activated' : 'subscription-renewal'
  const templateData =
    kind === 'activated'
      ? {
          businessName,
          planName,
          amount: money(amount),
          intervalLabel: sub.billing_interval === 'year' ? '12 meses' : '1 mes',
          renewsOn: dateLabel(sub.billing_period_end),
          plansUrl,
        }
      : {
          businessName,
          planName,
          amount: money(amount),
          dueOn: dateLabel(sub.billing_period_end),
          daysLeft: body.daysLeft ?? 3,
          expired: kind === 'expired',
          plansUrl,
        }

  const idempotencyKey = `sub-${kind}-${businessId}-${
    body.paymentSessionId ?? sub.billing_period_end ?? 'na'
  }`

  try {
    const result = await sendAppEmail(admin, templateName, recipientEmail, {
      idempotencyKey,
      templateData,
    })
    if (!result.sent) {
      console.warn('subscription email not sent', templateName, result.reason)
      return json({ sent: false }, 200)
    }
  } catch (error) {
    console.error('subscription email failed', templateName, (error as Error).message)
    return json({ sent: false }, 200)
  }

  return json({ sent: true })
})
