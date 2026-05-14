import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { render } from '@react-email/components'
import * as React from 'react'
import { TemplateData, RenderedTemplate } from '@/lib/template-registry'

const BRAND_GREEN = '#2D6A4F'
const LIGHT_GREEN = '#52B788'
const OFF_WHITE = '#F8F9F3'
const DARK_TEXT = '#1B2A22'
const MUTED = '#6B7B70'

interface Props { firstName?: string }

function VolunteerWelcomeEmail({ firstName }: Props) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'
  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to the Seed & Spoon volunteer family — here's everything you need to know.</Preview>
      <Body style={{ backgroundColor: OFF_WHITE, fontFamily: "'Georgia','Times New Roman',serif", margin: 0, padding: 0 }}>
        <Section style={{ backgroundColor: BRAND_GREEN, padding: '24px 0', textAlign: 'center' as const }}>
          <Text style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>🌱 Seed &amp; Spoon</Text>
        </Section>
        <Container style={{ backgroundColor: '#fff', maxWidth: '560px', margin: '0 auto', padding: '40px 48px', borderLeft: `4px solid ${LIGHT_GREEN}` }}>
          <Heading style={{ color: BRAND_GREEN, fontSize: '26px', margin: '0 0 20px 0' }}>
            Welcome to the team.
          </Heading>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>{greeting}</Text>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>
            You just joined something special. Seed &amp; Spoon volunteers are the backbone of
            everything we do in Newark — from sorting produce to running distributions to
            greeting the families we serve with a warm smile.
          </Text>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>
            Here&rsquo;s a quick look at what to expect:
          </Text>
          <Section style={{ backgroundColor: OFF_WHITE, borderRadius: '8px', padding: '16px 20px', margin: '8px 0 24px 0' }}>
            <Text style={{ color: DARK_TEXT, fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px 0' }}>📍 &nbsp;Distributions run on <strong>Saturdays, 9am–12pm</strong> at our Newark hub</Text>
            <Text style={{ color: DARK_TEXT, fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px 0' }}>👕 &nbsp;Wear comfortable clothes you don&rsquo;t mind getting dirty</Text>
            <Text style={{ color: DARK_TEXT, fontSize: '15px', lineHeight: '1.6', margin: 0 }}>📋 &nbsp;Sign up for shifts through the volunteer portal</Text>
          </Section>
          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button href="https://seedandspoon.org/volunteer" style={{ backgroundColor: BRAND_GREEN, color: '#fff', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }}>
              View Available Shifts
            </Button>
          </Section>
          <Hr style={{ borderColor: '#E0ECD5', margin: '24px 0' }} />
          <Text style={{ color: DARK_TEXT, fontSize: '15px', lineHeight: '1.7', margin: '0 0 4px 0' }}>See you out there,</Text>
          <Text style={{ color: DARK_TEXT, fontSize: '15px', fontWeight: 'bold', margin: 0 }}>The Seed &amp; Spoon Team</Text>
        </Container>
        <Section style={{ backgroundColor: '#E8F0E9', padding: '16px 0', textAlign: 'center' as const }}>
          <Text style={{ color: MUTED, fontSize: '12px', margin: 0 }}>Seed &amp; Spoon · Newark, NJ · <a href="https://seedandspoon.org" style={{ color: BRAND_GREEN }}>seedandspoon.org</a></Text>
        </Section>
      </Body>
    </Html>
  )
}

export async function renderVolunteerWelcome(data: TemplateData): Promise<RenderedTemplate> {
  return {
    subject: 'Welcome to the Seed & Spoon volunteer family 🌱',
    html: await render(<VolunteerWelcomeEmail firstName={data.firstName} />),
  }
}

export default VolunteerWelcomeEmail
