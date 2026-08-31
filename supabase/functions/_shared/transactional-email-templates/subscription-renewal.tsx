/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  businessName?: string
  planName?: string
  amount?: string
  dueOn?: string
  daysLeft?: number
  expired?: boolean
  plansUrl?: string
}

const SubscriptionRenewalEmail = ({
  businessName,
  planName = 'Básico',
  amount = 'Bs. 0',
  dueOn,
  daysLeft = 3,
  expired = false,
  plansUrl = 'https://zentro.today/settings/business/plans',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>
      {expired
        ? `Tu plan ${planName} venció`
        : `Tu plan ${planName} se renueva en ${daysLeft} días`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>
        <Text style={kicker}>{expired ? 'PLAN VENCIDO' : 'RENOVACIÓN'}</Text>
        <Heading style={h1}>
          {expired ? `Tu plan ${planName} venció` : `Tu plan ${planName} está por vencer`}
        </Heading>
        <Text style={text}>
          {businessName ? `${businessName}, ` : ''}
          {expired
            ? 'Tenés unos días de gracia para renovar antes de que las funciones del plan se desactiven. Pagá con QR desde la app en un minuto.'
            : `Tu plan se renueva ${dueOn ? `el ${dueOn}` : 'pronto'}. Pagá con QR desde la app para no perder ninguna función.`}
        </Text>
        <Text style={detail}>Monto: {amount}</Text>
        <Section style={{ margin: '24px 0' }}>
          <Button style={button} href={plansUrl}>
            Renovar mi plan
          </Button>
        </Section>
        <Text style={footer}>
          Si el botón no funciona, copiá y pegá esta dirección en tu navegador: {plansUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionRenewalEmail,
  subject: (data: Record<string, unknown>) =>
    data?.expired
      ? `Tu plan ${(data?.planName as string) || 'Zentro'} venció`
      : `Tu plan ${(data?.planName as string) || 'Zentro'} se renueva pronto`,
  displayName: 'Renovación de plan',
  previewData: {
    businessName: 'Café Central',
    planName: 'Profesional',
    amount: 'Bs. 300',
    dueOn: '30 de septiembre de 2026',
    daysLeft: 3,
  },
} satisfies TemplateEntry

export default SubscriptionRenewalEmail

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
  color: '#000000',
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
  backgroundColor: '#000000',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '14px 28px',
  fontSize: '15px',
  fontWeight: 600 as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '11px', color: '#999999', margin: '16px 0 0', lineHeight: '1.5' }
