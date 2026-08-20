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

interface ReservationReceivedEmailProps {
  customerName?: string
  reservationDate?: string
  reservationTime?: string
  partySize?: number
  tableLabel?: string
  notes?: string
  guestNames?: string[]
  dashboardUrl?: string
  cancelled?: boolean
  cancelledBy?: string
}

const ReservationReceivedEmail = ({
  customerName = 'Un cliente',
  reservationDate,
  reservationTime,
  partySize,
  tableLabel,
  notes,
  guestNames = [],
  dashboardUrl = 'https://zentro.today/dashboard',
  cancelled = false,
  cancelledBy,
}: ReservationReceivedEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>
      {cancelled
        ? `${customerName} canceló su reserva`
        : `Nueva reserva de ${customerName}${partySize ? ` para ${partySize}` : ''}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>

        <Text style={kicker}>{cancelled ? 'RESERVA CANCELADA' : 'NUEVA RESERVA'}</Text>

        <Heading style={h1}>{customerName}</Heading>

        <Text style={text}>
          {cancelled
            ? cancelledBy === 'business'
              ? 'Cancelaste esta reserva. La mesa vuelve a estar disponible.'
              : 'El cliente canceló esta reserva. La mesa vuelve a estar disponible.'
            : 'Tenés una nueva reserva confirmada automáticamente.'}
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
          {guestNames.length ? (
            <Text style={detailMuted}>👤 Acompañantes: {guestNames.join(', ')}</Text>
          ) : null}
          {notes ? <Text style={detailMuted}>📝 {notes}</Text> : null}
        </Section>

        <Section style={{ margin: '24px 0' }}>
          <Button style={button} href={dashboardUrl}>
            Ver reservas
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Si el botón no funciona, copiá y pegá esta dirección en tu navegador: {dashboardUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReservationReceivedEmail,
  subject: (data: Record<string, unknown>) =>
    data?.cancelled
      ? `Reserva cancelada · ${(data?.customerName as string) || 'Cliente'}`
      : `Nueva reserva · ${(data?.customerName as string) || 'Cliente'}${
          data?.reservationTime ? ` · ${data.reservationTime}` : ''
        }`,
  displayName: 'Nueva reserva (negocio)',
  previewData: {
    customerName: 'Ana Pérez',
    reservationDate: 'Viernes 22 de agosto',
    reservationTime: '20:30',
    partySize: 4,
    tableLabel: 'Mesa 7',
    notes: 'Cumpleaños',
    guestNames: ['Luis', 'Carla'],
    dashboardUrl: 'https://zentro.today/dashboard',
  },
} satisfies TemplateEntry

export default ReservationReceivedEmail

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
const detailMuted = { fontSize: '14px', color: '#55575d', margin: '0 0 8px' }
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
