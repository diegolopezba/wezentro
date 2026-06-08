/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  siteUrl?: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteUrl,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma el cambio de correo en Zentro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Link href={siteUrl || 'https://zentro.today'} style={wordmark}>zentro</Link>
        </Section>
        <Heading style={h1}>Confirma el cambio de correo</Heading>
        <Text style={text}>
          Solicitaste cambiar tu correo de{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}a{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>Confirmar cambio</Button>
        </Section>
        <Text style={footer}>
          Si no solicitaste este cambio, asegura tu cuenta inmediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Poppins", "Helvetica Neue", Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandBar = { paddingBottom: '24px', borderBottom: '1px solid #f1f1f1', marginBottom: '32px' }
const wordmark = { fontSize: '22px', fontWeight: 600 as const, color: '#E60023', textDecoration: 'none', letterSpacing: '-0.5px' }
const h1 = { fontSize: '24px', fontWeight: 600 as const, color: '#111111', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#E60023', textDecoration: 'underline' }
const button = { backgroundColor: '#E60023', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '9999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0', lineHeight: '1.5' }
