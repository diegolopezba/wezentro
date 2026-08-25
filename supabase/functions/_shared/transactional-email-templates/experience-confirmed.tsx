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

interface ExperienceConfirmedEmailProps {
  guestName?: string
  experienceTitle?: string
  businessName?: string
  experienceImageUrl?: string
  bookingDate?: string
  bookingTime?: string
  quantity?: number
  segmentName?: string
  totalAmount?: string
  meetingPoint?: string
  notes?: string
  bookingUrl?: string
  isGuestCopy?: boolean
  cancelled?: boolean
  cancelledBy?: string
}

const ExperienceConfirmedEmail = ({
  guestName,
  experienceTitle = 'la experiencia',
  businessName = 'el negocio',
  experienceImageUrl,
  bookingDate,
  bookingTime,
  quantity,
  segmentName,
  totalAmount,
  meetingPoint,
  notes,
  bookingUrl = 'https://zentro.today/tickets',
  isGuestCopy = false,
  cancelled = false,
  cancelledBy,
}: ExperienceConfirmedEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>
      {cancelled
        ? `Tu reserva para ${experienceTitle} fue cancelada`
        : `Tu reserva para ${experienceTitle} está confirmada`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>

        <Text style={kicker}>{cancelled ? 'RESERVA CANCELADA' : 'EXPERIENCIA CONFIRMADA'}</Text>

        <Heading style={h1}>{experienceTitle}</Heading>

        {experienceImageUrl ? (
          <Img src={experienceImageUrl} alt={experienceTitle} style={hero} width="512" />
        ) : null}

        <Text style={text}>
          {guestName ? `Hola ${guestName}. ` : 'Hola. '}
          {cancelled
            ? cancelledBy === 'business'
              ? `El negocio canceló tu reserva. Si necesitás otra fecha, podés reservar de nuevo desde la app.`
              : `Tu reserva fue cancelada. Podés reservar otra vez cuando quieras.`
            : isGuestCopy
            ? `Te agregaron a una reserva de ${experienceTitle} con ${businessName}. No necesitás hacer nada más.`
            : `Tu reserva quedó confirmada. Te esperamos.`}
        </Text>

        <Section style={card}>
          {bookingDate ? <Text style={detail}>📅 {bookingDate}</Text> : null}
          {bookingTime ? <Text style={detail}>🕐 {bookingTime}</Text> : null}
          {quantity ? (
            <Text style={detail}>
              👥 {quantity} {quantity === 1 ? 'persona' : 'personas'}
            </Text>
          ) : null}
          {segmentName ? <Text style={detail}>🎟️ {segmentName}</Text> : null}
          {totalAmount ? <Text style={detail}>💳 {totalAmount}</Text> : null}
          {meetingPoint ? <Text style={detail}>📍 {meetingPoint}</Text> : null}
          {notes ? <Text style={detailMuted}>📝 {notes}</Text> : null}
        </Section>

        {!cancelled ? (
          <Section style={{ margin: '24px 0' }}>
            <Button style={button} href={bookingUrl}>
              Ver mi reserva
            </Button>
          </Section>
        ) : null}

        <Hr style={hr} />

        <Text style={footer}>
          Si el botón no funciona, copiá y pegá esta dirección en tu navegador: {bookingUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ExperienceConfirmedEmail,
  subject: (data: Record<string, unknown>) =>
    data?.cancelled
      ? `Reserva cancelada · ${(data?.experienceTitle as string) || 'Experiencia'}`
      : `Reserva confirmada · ${(data?.experienceTitle as string) || 'Experiencia'}`,
  displayName: 'Experiencia confirmada (cliente)',
  previewData: {
    guestName: 'Ana',
    experienceTitle: 'Tour gastronómico por Sopocachi',
    businessName: 'Gustu',
    bookingDate: 'Viernes 22 de agosto',
    bookingTime: '19:00',
    quantity: 2,
    segmentName: 'Adulto',
    totalAmount: 'Bs. 240',
    meetingPoint: 'Puerta principal del mercado',
    notes: 'Alergia a frutos secos',
    bookingUrl: 'https://zentro.today/tickets',
  },
} satisfies TemplateEntry

export default ExperienceConfirmedEmail

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
const hero = {
  width: '100%',
  borderRadius: '16px',
  margin: '0 0 16px',
  objectFit: 'cover' as const,
  maxHeight: '240px',
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
