// deno-lint-ignore-file no-explicit-any
import type * as React from 'npm:react@18.3.1'
import { template as specialInvite } from './special-invite.tsx'
import { template as inviteConfirmed } from './invite-confirmed.tsx'
import { template as ticketsPurchased } from './tickets-purchased.tsx'
import { template as loungeConfirmed } from './lounge-confirmed.tsx'
import { template as reservationConfirmed } from './reservation-confirmed.tsx'
import { template as reservationReceived } from './reservation-received.tsx'
import { template as waitlistReleased } from './waitlist-released.tsx'
import { template as experienceConfirmed } from './experience-confirmed.tsx'
import { template as experienceReceived } from './experience-received.tsx'
import { template as subscriptionActivated } from './subscription-activated.tsx'
import { template as subscriptionRenewal } from './subscription-renewal.tsx'

export interface TemplateEntry {
  component: (props: any) => React.ReactElement
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'special-invite': specialInvite,
  'invite-confirmed': inviteConfirmed,
  'tickets-purchased': ticketsPurchased,
  'lounge-confirmed': loungeConfirmed,
  'reservation-confirmed': reservationConfirmed,
  'reservation-received': reservationReceived,
  'waitlist-released': waitlistReleased,
  'experience-confirmed': experienceConfirmed,
  'experience-received': experienceReceived,
  'subscription-activated': subscriptionActivated,
  'subscription-renewal': subscriptionRenewal,
}
