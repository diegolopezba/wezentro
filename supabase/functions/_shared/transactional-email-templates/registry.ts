// deno-lint-ignore-file no-explicit-any
import type * as React from 'npm:react@18.3.1'
import { template as specialInvite } from './special-invite.tsx'
import { template as inviteConfirmed } from './invite-confirmed.tsx'
import { template as ticketsPurchased } from './tickets-purchased.tsx'
import { template as reservationConfirmed } from './reservation-confirmed.tsx'
import { template as reservationReceived } from './reservation-received.tsx'

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
  'reservation-confirmed': reservationConfirmed,
  'reservation-received': reservationReceived,
}
