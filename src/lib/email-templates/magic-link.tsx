import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{token ? `${token} is your ${siteName} sign-in code` : `Your login link for ${siteName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your sign-in code</Heading>
        <Text style={text}>
          Type this code into {siteName} on the device you are signing in on. It
          expires shortly.
        </Text>
        {token ? (
          <Text className="dm-code" style={codeBox}>
            {token}
          </Text>
        ) : null}
        <Text style={smallText}>
          Signing in on this same device? You can also{' '}
          <Link href={confirmationUrl} style={link}>
            open this link
          </Link>
          .
        </Text>
        <Text style={footer}>
          If you didn&apos;t request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
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
const codeBox = {
  fontSize: '34px',
  fontWeight: 'bold' as const,
  letterSpacing: '10px',
  color: '#000000',
  backgroundColor: '#f4f4f5',
  border: '1px solid #e4e4e7',
  borderRadius: '10px',
  padding: '18px 12px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const smallText = {
  fontSize: '13px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const link = { color: '#0f62fe', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-code { background-color: #1c1c1f !important; color: #ffffff !important; border-color: #333338 !important; }
  }
  [data-ogsc] .dm-code { background-color: #1c1c1f !important; color: #ffffff !important; }
  [data-ogsb] .dm-code { background-color: #1c1c1f !important; color: #ffffff !important; }
`
