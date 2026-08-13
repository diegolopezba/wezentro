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

interface InviteConfirmedEmailProps {
  guestName?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  eventImageUrl?: string
  segment?: string
  ticketUrl?: string
  qrImageUrl?: string
  hostName?: string
}

const InviteConfirmedEmail = ({
  guestName,
  eventTitle = 'un evento',
  eventDate,
  eventLocation,
  eventImageUrl,
  segment,
  ticketUrl = 'https://zentro.today',
  qrImageUrl,
  hostName,
}: InviteConfirmedEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Tu entrada para ${eventTitle}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>

        {eventImageUrl ? (
          <Img src={eventImageUrl} alt={eventTitle} width="540" style={cover} />
        ) : null}

        <Text style={kicker}>
          {segment ? `INVITADO ESPECIAL - ${segment}` : 'INVITADO ESPECIAL'}
        </Text>

        <Heading style={h1}>{eventTitle}</Heading>

        <Text style={text}>
          {guestName ? `Listo, ${guestName}. ` : 'Listo. '}
          Tu asistencia está confirmada{hostName ? ` por ${hostName}` : ''}. Esta es tu
          entrada: mostrá este código QR en la puerta.
        </Text>

        {eventDate ? <Text style={detail}>📅 {eventDate}</Text> : null}
        {eventLocation ? <Text style={detail}>📍 {eventLocation}</Text> : null}

        {qrImageUrl ? (
          <Section style={qrBox}>
            <Img src={qrImageUrl} alt="Código QR de tu entrada" width="220" height="220" />
          </Section>
        ) : null}

        <Section style={{ margin: '24px 0' }}>
          <Button style={button} href={ticketUrl}>
            Ver mi entrada
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={pitchTitle}>Sacale más provecho a tu noche</Text>
        <Text style={pitch}>
          Creá tu cuenta gratis y descargá Zentro para recibir avisos y mensajes del
          organizador, ver detalles y beneficios exclusivos del evento, guardar tus
          entradas en un solo lugar y descubrir todo lo que está pasando en la ciudad.
          Tu entrada ya es válida — esto es solo para vivirla mejor.
        </Text>

        <Text style={footer}>
          Si el botón no funciona, copiá y pegá esta dirección en tu navegador: {ticketUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InviteConfirmedEmail,
  subject: (data: Record<string, unknown>) =>
    `Tu entrada para ${(data?.eventTitle as string) || 'un evento'}`,
  displayName: 'Entrada confirmada',
  previewData: {
    guestName: 'Ana',
    eventTitle: 'Noche Zentro',
    eventDate: 'Viernes 15 de agosto, 22:00',
    eventLocation: 'La Paz, Bolivia',
    segment: 'VIP',
    ticketUrl: 'https://zentro.today/i/abc123',
    hostName: 'Zentro',
  },
} satisfies TemplateEntry

export default InviteConfirmedEmail

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
  margin: '24px 0 0',
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
const pitchTitle = {
  fontSize: '15px',
  fontWeight: 700 as const,
  color: '#000000',
  margin: '0 0 8px',
}
const pitch = { fontSize: '13px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const footer = { fontSize: '11px', color: '#999999', margin: '16px 0 0', lineHeight: '1.5' }
