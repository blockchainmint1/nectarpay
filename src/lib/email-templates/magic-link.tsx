import * as React from 'react'

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
} from '@react-email/components'


interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
  qrDataUrl?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
  qrDataUrl,
}: MagicLinkEmailProps) => {
  const codeDisplay = token ? formatCode(token) : null
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your sign-in code for {siteName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sign in to {siteName}</Heading>

          {codeDisplay && (
            <Section style={codeBox}>
              <Text style={codeLabel}>Your sign-in code</Text>
              <Text style={codeStyle}>{codeDisplay}</Text>
              <Text style={codeHint}>
                Type this code into the terminal or sign-in screen.
              </Text>
            </Section>
          )}


          {qrDataUrl && (
            <Section style={qrBox}>
              <Text style={qrLabel}>Or scan with your POS terminal</Text>
              <Img
                src={qrDataUrl}
                alt="Sign-in QR code"
                width="220"
                height="220"
                style={{ margin: '0 auto', display: 'block' }}
              />
              <Text style={qrHint}>
                Point the terminal camera at this code to sign in instantly.
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={text}>
            Signing in on this device? Tap the button:
          </Text>
          <Button style={button} href={confirmationUrl}>
            Sign in to {siteName}
          </Button>

          <Text style={footer}>
            This code and link expire in a few minutes. If you didn't request
            this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail

function formatCode(token: string): string {
  const clean = token.trim()
  const mid = Math.ceil(clean.length / 2)
  return `${clean.slice(0, mid)} ${clean.slice(mid)}`.trim()
}

export function buildQrImageUrl(url: string): string {
  const encoded = encodeURIComponent(url)
  return `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=10&format=png&data=${encoded}`
}

/**
 * @deprecated Use buildQrImageUrl - returns an absolute https URL that email clients reliably render.
 */
export async function buildQrDataUrl(url: string): Promise<string | undefined> {
  return buildQrImageUrl(url)
}


const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '520px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 24px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 16px',
}
const codeBox = {
  backgroundColor: '#FFF8E1',
  border: '1px solid #F5C518',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const codeLabel = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  color: '#7a5d00',
  margin: '0 0 8px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '40px',
  fontWeight: 'bold' as const,
  letterSpacing: '6px',
  color: '#000000',
  margin: '0 0 8px',
}
const codeHint = { fontSize: '12px', color: '#7a5d00', margin: 0 }
const qrBox = {
  textAlign: 'center' as const,
  padding: '20px 0 12px',
}
const qrLabel = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  color: '#999999',
  margin: '0 0 12px',
}
const qrHint = {
  fontSize: '12px',
  color: '#999999',
  margin: '12px 0 0',
}
const hr = { borderColor: '#eeeeee', margin: '24px 0' }
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
