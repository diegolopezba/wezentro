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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  token,
}: SignupEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu código de verificación para Zentro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirma tu correo</Heading>
        <Text style={text}>
          ¡Gracias por unirte a{' '}
          <Link href={siteUrl} style={link}>
            <strong>Zentro</strong>
          </Link>
          ! Ingresa el siguiente código en la app para verificar tu correo
          ({recipient}):
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{token || '------'}</Text>
        </Section>
        <Text style={text}>
          Este código expira en 1 hora. No lo compartas con nadie.
        </Text>
        <Text style={footer}>
          Si no creaste esta cuenta, puedes ignorar este mensaje.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Poppins, Helvetica, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const codeBox = {
  backgroundColor: '#f5f5f5',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '20px 0',
}
const codeText = {
  fontSize: '32px',
  fontWeight: 700 as const,
  letterSpacing: '8px',
  color: '#E60023',
  margin: 0,
  fontFamily: 'monospace',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
