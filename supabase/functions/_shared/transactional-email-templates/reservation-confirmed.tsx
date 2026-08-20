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
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReservationConfirmedEmailProps {
  guestName?: string
  businessName?: string
  reservationDate?: string
  reservationTime?: string
  partySize?: number
  tableLabel?: string
  address?: string
  notes?: string
  reservationUrl?: string
  isGuestCopy?: boolean
  cancelled?: boolean
  cancelledBy?: string
}

const ReservationConfirmedEmail = ({
  guestName,
  businessName = 'el negocio',
  reservationDate,
  reservationTime,
  partySize,
  tableLabel,
  address,
  notes,
  reservationUrl = 'https://zentro.today/tickets',
  isGuestCopy = false,
  cancelled = false,
  cancelledBy,
}: ReservationConfirmedEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>
      {cancelled
        ? `Tu reserva en ${businessName} fue cancelada`
        : `Tu reserva en ${businessName} está confirmada`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>

        <Text style={kicker}>{cancelled ? 'RESERVA CANCELADA' : 'RESERVA CONFIRMADA'}</Text>

        <Heading style={h1}>{businessName}</Heading>

        <Text style={text}>
          {guestName ? `Hola ${guestName}. ` : 'Hola. '}
          {cancelled
            ? cancelledBy === 'business'
              ? `El negocio canceló tu reserva. Si necesitás otra fecha, podés reservar de nuevo desde la app.`
              : `Tu reserva fue cancelada. Podés reservar otra vez cuando quieras.`
            : isGuestCopy
            ? `Te agregaron a una reserva en ${businessName}. No necesitás hacer nada más.`
            : `Tu reserva quedó confirmada. Te esperamos.`}
        </Text>

        <Section style={card}>
          {reservationDate ? <Text style={detail}>📅 {reservationDate}</Text> : null}
          {reservationTime ? <Text style={detail}>🕐 {reservationTime}</Text> : null}
          {partySize ? (
            <Text style={detail}>
              👥 {partySize} {partySize === 1 ? 'persona' : 'personas'}
            </Text>
          ) : null}
          {tableLabel ? <Text style={detail}>🪑 {tableLabel}</Text> : null}
          {address ? <Text style={detail}>📍 {address}</Text> : null}
          {notes ? <Text style={detailMuted}>📝 {notes}</Text> : null}
        </Section>

        {!cancelled ? (
          <Section style={{ margin: '24px 0' }}>
            <Button style={button} href={reservationUrl}>
              Ver mi reserva
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />

        <Text style={footer}>
          Si el botón no funciona, copiá y pegá esta dirección en tu navegador: {reservationUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReservationConfirmedEmail,
  subject: (data: Record<string, unknown>) =>
    data?.cancelled
      ? `Reserva cancelada en ${(data?.businessName as string) || 'el negocio'}`
      : `Reserva confirmada en ${(data?.businessName as string) || 'el negocio'}`,
  displayName: 'Reserva confirmada (cliente)',
  previewData: {
    guestName: 'Ana',
    businessName: 'Gustu',
    reservationDate: 'Viernes 22 de agosto',
    reservationTime: '20:30',
    partySize: 4,
    tableLabel: 'Mesa 7',
    address: 'Calle 10, Calacoto, La Paz',
    notes: 'Cumpleaños',
    reservationUrl: 'https://zentro.today/tickets',
  },
} satisfies TemplateEntry

export default ReservationConfirmedEmail

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
const card = {
  backgroundColor: '#f5f5f5',
  borderRadius: '16px',
  padding: '20px',
  margin: '8px 0 0',
}
const detail = { fontSize: '15px', color: '#000000', margin: '0 0 8px' }
const detailMuted = { fontSize: '14px', color: '#55575d', margin: '0' }
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
const footer = { fontSize: '11px', color: '#999999', margin: '16px 0 0', lineHeight: '1.5' }
