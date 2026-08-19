/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface TicketEntry {
  label?: string
  qrImageUrl?: string
  assignedToName?: string
}

interface TicketsPurchasedEmailProps {
  guestName?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  eventImageUrl?: string
  tierName?: string
  ticketUrl?: string
  tickets?: TicketEntry[]
  isRecipientCopy?: boolean
}

const TicketsPurchasedEmail = ({
  guestName,
  eventTitle = 'un evento',
  eventDate,
  eventLocation,
  eventImageUrl,
  tierName,
  ticketUrl = 'https://zentro.today/tickets',
  tickets = [],
  isRecipientCopy = false,
}: TicketsPurchasedEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Tu${tickets.length > 1 ? 's' : ''} entrada${tickets.length > 1 ? 's' : ''} para ${eventTitle}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>

        {eventImageUrl ? (
          <Img src={eventImageUrl} alt={eventTitle} width="540" style={cover} />
        ) : null}

        <Text style={kicker}>{tierName ? tierName.toUpperCase() : 'ENTRADA CONFIRMADA'}</Text>

        <Heading style={h1}>{eventTitle}</Heading>

        <Text style={text}>
          {guestName ? `Listo, ${guestName}. ` : 'Listo. '}
          {isRecipientCopy
            ? 'Te compraron una entrada para este evento. Mostrá este código QR en la puerta.'
            : tickets.length > 1
            ? `Tu pago fue confirmado. Estas son tus ${tickets.length} entradas: mostrá un código QR distinto por persona en la puerta.`
            : 'Tu pago fue confirmado. Esta es tu entrada: mostrá este código QR en la puerta.'}
        </Text>

        {eventDate ? <Text style={detail}>📅 {eventDate}</Text> : null}
        {eventLocation ? <Text style={detail}>📍 {eventLocation}</Text> : null}

        {tickets.map((t, i) => (
          <Section key={i} style={qrBox}>
            <Text style={ticketLabel}>
              {t.label || `Entrada ${i + 1}`}
              {t.assignedToName ? ` · ${t.assignedToName}` : ''}
            </Text>
            {t.qrImageUrl ? (
              <Img src={t.qrImageUrl} alt="Código QR de la entrada" width="220" height="220" />
            ) : null}
          </Section>
        ))}

        <Section style={{ margin: '24px 0' }}>
          <Button style={button} href={ticketUrl}>
            Ver mis entradas
          </Button>
        </Section>

        <Hr style={hr} />

        {!isRecipientCopy && tickets.length > 1 ? (
          <Text style={pitch}>
            ¿Compraste entradas para alguien más? Reenviale este correo o mandale su código QR:
            cada QR se escanea una sola vez en la puerta.
          </Text>
        ) : null}

        <Text style={footer}>
          Si el botón no funciona, copiá y pegá esta dirección en tu navegador: {ticketUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TicketsPurchasedEmail,
  subject: (data: Record<string, unknown>) =>
    `Tu entrada para ${(data?.eventTitle as string) || 'un evento'}`,
  displayName: 'Entradas compradas',
  previewData: {
    guestName: 'Ana',
    eventTitle: 'Noche Zentro',
    eventDate: 'Viernes 15 de agosto, 22:00',
    eventLocation: 'La Paz, Bolivia',
    tierName: 'General',
    ticketUrl: 'https://zentro.today/tickets',
    tickets: [{ label: 'Entrada 1' }, { label: 'Entrada 2', assignedToName: 'Luis' }],
  },
} satisfies TemplateEntry

export default TicketsPurchasedEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Poppins, Helvetica, Arial, sans-serif',
}
const container = { padding: '24px 24px 40px', maxWidth: '560px' }
const brand = {
  fontSize: '20px',
  fontWeight: 700 as const,
  color: '#000000',
  margin: '0 0 16px',
  letterSpacing: '-0.5px',
}
const cover = {
  width: '100%',
  borderRadius: '16px',
  objectFit: 'cover' as const,
  marginBottom: '20px',
}
const kicker = {
  fontSize: '11px',
  letterSpacing: '1.5px',
  fontWeight: 700 as const,
  color: '#E60023',
  margin: '0 0 6px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#000000',
  margin: '0 0 14px',
  lineHeight: '1.25',
}
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const detail = { fontSize: '14px', color: '#000000', margin: '0 0 6px' }
const qrBox = {
  textAlign: 'center' as const,
  backgroundColor: '#f5f5f5',
  borderRadius: '16px',
  padding: '20px',
  margin: '16px 0 0',
}
const ticketLabel = {
  fontSize: '12px',
  fontWeight: 700 as const,
  letterSpacing: '1px',
  color: '#000000',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}
const button = {
  backgroundColor: '#E60023',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '14px 28px',
  fontSize: '15px',
  fontWeight: 600 as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#eaeaea', margin: '28px 0 20px' }
const pitch = { fontSize: '13px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const footer = { fontSize: '11px', color: '#999999', margin: '16px 0 0', lineHeight: '1.5' }
