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

interface SpecialInviteEmailProps {
  guestName?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  eventImageUrl?: string
  segment?: string
  inviteUrl?: string
  hostName?: string
}

const SpecialInviteEmail = ({
  guestName,
  eventTitle = 'un evento',
  eventDate,
  eventLocation,
  eventImageUrl,
  segment,
  inviteUrl = 'https://zentro.today',
  hostName,
}: SpecialInviteEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Tu invitación especial a ${eventTitle}`}</Preview>
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
          {guestName ? `Hola ${guestName}, ` : 'Hola, '}
          {hostName ? `${hostName} te invita ` : 'te invitamos '}
          a este evento. Tu entrada es gratuita y este enlace es solo tuyo.
        </Text>

        {eventDate ? <Text style={detail}>📅 {eventDate}</Text> : null}
        {eventLocation ? <Text style={detail}>📍 {eventLocation}</Text> : null}

        <Section style={{ margin: '28px 0' }}>
          <Button style={button} href={inviteUrl}>
            Confirmar mi invitación
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Este enlace es de un solo uso. Si no podés abrir el botón, copiá y pegá
          esta dirección en tu navegador: {inviteUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SpecialInviteEmail,
  subject: (data: Record<string, unknown>) =>
    `Tu invitación especial a ${(data?.eventTitle as string) || 'un evento'}`,
  displayName: 'Invitación especial',
  previewData: {
    guestName: 'Ana',
    eventTitle: 'Noche Zentro',
    eventDate: 'Viernes 15 de agosto, 22:00',
    eventLocation: 'La Paz, Bolivia',
    segment: 'VIP',
    inviteUrl: 'https://zentro.today/i/abc123',
    hostName: 'Zentro',
  },
} satisfies TemplateEntry

export default SpecialInviteEmail

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
  fontWeight: 600 as const,
  color: '#E60023',
  margin: '0 0 6px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#000000',
  margin: '0 0 14px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const detail = {
  fontSize: '14px',
  color: '#000000',
  margin: '0 0 6px',
}
const button = {
  backgroundColor: '#E60023',
  color: '#ffffff',
  fontSize: '15px',
  borderRadius: '9999px',
  fontWeight: 600 as const,
  padding: '14px 26px',
  textDecoration: 'none',
}
const hr = { borderColor: '#eeeeee', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: 0, lineHeight: '1.5' }
