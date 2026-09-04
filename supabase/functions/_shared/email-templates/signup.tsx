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
  token: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  token,
}: SignupEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>{`Tu código de verificación: ${token}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Tu código de verificación</Heading>
        <Text style={text}>
          ¡Gracias por unirte a{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          ! Ingresá este código en la app para confirmar{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          :
        </Text>
        <Section style={codeBox}>
          <Text style={code}>{token}</Text>
        </Section>
        <Text style={hint}>El código vence en 60 minutos.</Text>
        <Text style={footer}>
          Si no creaste esta cuenta, podés ignorar este mensaje.
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
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const codeBox = {
  backgroundColor: '#f4f4f5',
  borderRadius: '16px',
  padding: '20px',
  textAlign: 'center' as const,
}
const code = {
  fontSize: '34px',
  fontWeight: 700 as const,
  letterSpacing: '10px',
  color: '#000000',
  margin: '0',
}
const hint = { fontSize: '13px', color: '#55575d', margin: '18px 0 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
