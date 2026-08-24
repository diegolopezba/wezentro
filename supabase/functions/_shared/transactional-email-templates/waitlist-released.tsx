/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WaitlistReleasedEmailProps {
  guestName?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  eventImageUrl?: string
  eventUrl?: string
  earlyAccessHours?: number
}

const WaitlistReleasedEmail = ({
  guestName,
  eventTitle = 'un evento',
  eventDate,
  eventLocation,
  eventImageUrl,
  eventUrl = 'https://zentro.today',
  earlyAccessHours = 0,
}: WaitlistReleasedEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Ya podés comprar tus entradas para ${eventTitle}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>

        {eventImageUrl ? (
          <Img src={eventImageUrl} alt={eventTitle} width="540" style={cover} />
        ) : null}

        <Text style={kicker}>
          {earlyAccessHours > 0 ? 'ACCESO ANTICIPADO' : 'ENTRADAS DISPONIBLES'}
        </Text>

        <Heading style={h1}>{eventTitle}</Heading>

        <Text style={text}>
          {guestName ? `${guestName}, ` : ''}
          las entradas ya están a la venta.
          {earlyAccessHours > 0
            ? ` Por estar en la lista de espera, tenés ${earlyAccessHours} horas de acceso anticipado antes de la venta general.`
            : ' Estás recibiendo este aviso primero por estar en la lista de espera.'}
        </Text>

        {eventDate ? <Text style={detail}>📅 {eventDate}</Text> : null}
        {eventLocation ? <Text style={detail}>📍 {eventLocation}</Text> : null}

        <Section style={{ margin: '24px 0' }}>
          <Button style={button} href={eventUrl}>
            Comprar mi entrada
          </Button>
        </Section>

        <Text style={footer}>
          Si el botón no funciona, copiá y pegá esta dirección en tu navegador: {eventUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WaitlistReleasedEmail,
  subject: (data: Record<string, unknown>) =>
    `Ya podés comprar tus entradas para ${(data?.eventTitle as string) || 'un evento'}`,
  displayName: 'Lista de espera liberada',
  previewData: {
    guestName: 'Ana',
    eventTitle: 'Noche Zentro',
    eventDate: 'Viernes 15 de agosto, 22:00',
    eventLocation: 'La Paz, Bolivia',
    eventUrl: 'https://zentro.today/event/abc123',
    earlyAccessHours: 24,
  },
} satisfies TemplateEntry

export default WaitlistReleasedEmail

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
const footer = { fontSize: '11px', color: '#999999', margin: '16px 0 0', lineHeight: '1.5' }
