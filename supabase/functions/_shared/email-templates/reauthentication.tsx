/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
  siteUrl?: string
}

export const ReauthenticationEmail = ({ token, siteUrl }: ReauthenticationEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación de Zentro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Link href={siteUrl || 'https://zentro.today'} style={wordmark}>zentro</Link>
        </Section>
        <Heading style={h1}>Confirma tu identidad</Heading>
        <Text style={text}>Usa este código para continuar:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          El código expira pronto. Si no lo solicitaste, ignora este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Poppins", "Helvetica Neue", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { paddingBottom: '24px', borderBottom: '1px solid #f1f1f1', marginBottom: '32px' }
const wordmark = { fontSize: '22px', fontWeight: 600 as const, color: '#E60023', textDecoration: 'none', letterSpacing: '-0.5px' }
const h1 = { fontSize: '24px', fontWeight: 600 as const, color: '#111111', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Menlo, Courier, monospace', fontSize: '32px', fontWeight: 700 as const, color: '#E60023', letterSpacing: '8px', textAlign: 'center' as const, margin: '24px 0', padding: '20px', backgroundColor: '#fafafa', borderRadius: '12px' }
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0', lineHeight: '1.5' }
