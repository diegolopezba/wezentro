/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BusinessLeadEmailProps {
  fullName?: string
  businessName?: string
  businessKind?: string
  phone?: string
  email?: string
  message?: string
  locale?: string
}

const KIND_LABEL: Record<string, string> = {
  events: 'Eventos / discoteca',
  restaurant: 'Restaurante, café o bar',
  experiences: 'Experiencias',
  other: 'Otro',
}

const BusinessLeadEmail = ({
  fullName = 'Sin nombre',
  businessName = 'Sin negocio',
  businessKind = 'other',
  phone = '',
  email,
  message,
  locale = 'es',
}: BusinessLeadEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Nuevo lead: ${businessName} (${fullName})`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>zentro</Text>
        <Text style={kicker}>NUEVO LEAD DESDE LA LANDING</Text>
        <Heading style={h1}>{businessName}</Heading>

        <Text style={text}>Contacto: {fullName}</Text>
        <Text style={text}>Tipo de negocio: {KIND_LABEL[businessKind] ?? businessKind}</Text>
        <Text style={text}>Teléfono / WhatsApp: {phone}</Text>
        {email ? <Text style={text}>Email: {email}</Text> : null}
        <Text style={text}>Idioma de la página: {locale}</Text>

        {message ? (
          <>
            <Hr style={hr} />
            <Text style={text}>{message}</Text>
          </>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>Zentro · leads de la landing comercial</Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f6f6f6', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '32px',
  maxWidth: '560px',
  borderRadius: '16px',
}
const brand = { fontSize: '20px', fontWeight: 700, color: '#111111', margin: '0 0 24px' }
const kicker = {
  fontSize: '11px',
  letterSpacing: '1px',
  color: '#888888',
  margin: '0 0 8px',
}
const h1 = { fontSize: '24px', color: '#111111', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#333333', margin: '0 0 8px', lineHeight: '20px' }
const hr = { borderColor: '#eeeeee', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: 0 }

export const template: TemplateEntry = {
  component: BusinessLeadEmail,
  subject: (d) => `Nuevo lead: ${d.businessName ?? 'negocio'}`,
  displayName: 'Nuevo lead de negocio',
  to: 'hello@zentro.today',
  previewData: {
    fullName: 'Diego López',
    businessName: 'Zentro Bar',
    businessKind: 'restaurant',
    phone: '+591 77622635',
    email: 'diego@example.com',
    message: 'Quiero una demo esta semana.',
    locale: 'es',
  },
}

export default BusinessLeadEmail
