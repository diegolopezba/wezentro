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
  intervalLabel?: string
  renewsOn?: string
  plansUrl?: string
}

const SubscriptionActivatedEmail = ({
  businessName,
  planName = 'Básico',
  amount = 'Bs. 0',
  intervalLabel = '1 mes',
  renewsOn,
  plansUrl = 'https://zentro.today/settings/business/plans',
}: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Tu plan ${planName} está activo`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>
        <Text style={kicker}>PAGO CONFIRMADO</Text>
        <Heading style={h1}>Plan {planName} activo</Heading>
        <Text style={text}>
          {businessName ? `${businessName}, ` : ''}
          recibimos tu pago y tu plan ya está activo. Todas las funciones incluidas
          quedaron habilitadas en tu cuenta.
        </Text>
        <Text style={detail}>Monto pagado: {amount}</Text>
        <Text style={detail}>Período: {intervalLabel}</Text>
        {renewsOn ? <Text style={detail}>Se renueva el {renewsOn}</Text> : null}
        <Section style={{ margin: '24px 0' }}>
          <Button style={button} href={plansUrl}>
            Ver mi plan
          </Button>
        </Section>
        <Text style={footer}>
          Te avisaremos por email antes de la fecha de renovación para que puedas pagar el
          siguiente período con QR.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionActivatedEmail,
  subject: (data: Record<string, unknown>) =>
    `Tu plan ${(data?.planName as string) || 'Zentro'} está activo`,
  displayName: 'Plan activado',
  previewData: {
    businessName: 'Café Central',
    planName: 'Profesional',
    amount: 'Bs. 300',
    intervalLabel: '1 mes',
    renewsOn: '30 de septiembre de 2026',
  },
} satisfies TemplateEntry

export default SubscriptionActivatedEmail

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
