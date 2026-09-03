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

interface LoungeConfirmedEmailProps {
  guestName?: string
  eventTitle?: string
  eventDate?: string
  areaName?: string
  areaDescription?: string
  perks?: string[]
  arrivalNote?: string
  partySize?: number
  includedTickets?: number
  amount?: string
  answers?: { label: string; value: string }[]
  ticketsUrl?: string
}

const LoungeConfirmedEmail = ({
  guestName,
  eventTitle = 'el evento',
  eventDate,
  areaName = 'tu área',
  areaDescription,
  perks = [],
  arrivalNote,
  partySize,
  includedTickets = 0,
  amount,
  answers = [],
  ticketsUrl = 'https://zentro.today/tickets',
}: LoungeConfirmedEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Tu lounge en ${eventTitle} está confirmado`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>
        <Text style={kicker}>LOUNGE CONFIRMADO</Text>
        <Heading style={h1}>{eventTitle}</Heading>

        <Text style={text}>
          {guestName ? `Hola ${guestName}. ` : 'Hola. '}
          Reservaste <strong>{areaName}</strong>. Te esperamos.
        </Text>

        <Section style={card}>
          <Text style={detail}>🛋️ {areaName}</Text>
          {eventDate ? <Text style={detail}>📅 {eventDate}</Text> : null}
          {partySize ? (
            <Text style={detail}>
              👥 {partySize} {partySize === 1 ? 'persona' : 'personas'}
            </Text>
          ) : null}
          {includedTickets > 0 ? (
            <Text style={detail}>
              🎟️ Incluye {includedTickets} {includedTickets === 1 ? 'entrada' : 'entradas'}
            </Text>
          ) : null}
          {amount ? <Text style={detail}>💳 {amount}</Text> : null}
          {areaDescription ? <Text style={detailMuted}>{areaDescription}</Text> : null}
          {perks.length > 0 ? (
            <Text style={detailMuted}>✨ {perks.join(' · ')}</Text>
          ) : null}
        </Section>

        {arrivalNote ? (
          <Section style={card}>
            <Text style={kicker}>AL LLEGAR</Text>
            <Text style={detailMuted}>{arrivalNote}</Text>
          </Section>
        ) : null}

        {answers.length > 0 ? (
          <Section style={card}>
            <Text style={kicker}>TUS DATOS</Text>
            {answers.map((a) => (
              <Text key={a.label} style={detailMuted}>
                {a.label}: {a.value}
              </Text>
            ))}
          </Section>
        ) : null}

        <Section style={{ margin: '24px 0' }}>
          <Button style={button} href={ticketsUrl}>
            Ver mi reserva
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Si el botón no funciona, copiá y pegá esta dirección en tu navegador: {ticketsUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoungeConfirmedEmail,
  subject: (data: Record<string, unknown>) =>
    `Tu lounge en ${(data?.eventTitle as string) || 'el evento'} está confirmado`,
  displayName: 'Lounge confirmado (comprador)',
  previewData: {
    guestName: 'Ana',
    eventTitle: 'Noche Disco',
    eventDate: 'Viernes 22 de agosto · 22:00',
    areaName: 'Lounge VIP 3',
    areaDescription: 'Sobre la pista, junto a la cabina del DJ.',
    perks: ['Botella incluida', 'Mesero dedicado'],
    arrivalNote: 'Presentate en la puerta VIP con tu QR.',
    partySize: 6,
    includedTickets: 6,
    amount: 'Bs. 1200',
    answers: [{ label: 'Nombre del grupo', value: 'Los Andes' }],
    ticketsUrl: 'https://zentro.today/tickets',
  },
} satisfies TemplateEntry

export default LoungeConfirmedEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Poppins, Helvetica, Arial, sans-serif' }
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
const detailMuted = { fontSize: '14px', color: '#55575d', margin: '0 0 6px' }
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
