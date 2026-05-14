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

function DonorRecurringAskEmail({ firstName }: Props) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'
  return (
    <Html lang="en">
      <Head />
      <Preview>Turn your one-time gift into lasting change — join our monthly donors.</Preview>
      <Body style={{ backgroundColor: OFF_WHITE, fontFamily: "'Georgia','Times New Roman',serif", margin: 0, padding: 0 }}>
        <Section style={{ backgroundColor: BRAND_GREEN, padding: '24px 0', textAlign: 'center' as const }}>
          <Text style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>🌱 Seed &amp; Spoon</Text>
        </Section>
        <Container style={{ backgroundColor: '#fff', maxWidth: '560px', margin: '0 auto', padding: '40px 48px', borderLeft: `4px solid ${LIGHT_GREEN}` }}>
          <Heading style={{ color: BRAND_GREEN, fontSize: '26px', margin: '0 0 20px 0' }}>
            Make your impact ongoing.
          </Heading>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>{greeting}</Text>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>
            Food insecurity doesn&rsquo;t take a month off — and neither do we. We&rsquo;re in
            Newark every week, connecting families with fresh food and resources. Your one-time
            gift was a huge help. Now we&rsquo;d love to count on you every month.
          </Text>

          <Section style={{ backgroundColor: OFF_WHITE, borderRadius: '8px', padding: '16px 20px', margin: '8px 0 24px 0' }}>
            <Text style={{ color: BRAND_GREEN, fontSize: '15px', fontWeight: 'bold', margin: '0 0 8px 0' }}>What a monthly gift does:</Text>
            <Text style={{ color: DARK_TEXT, fontSize: '14px', lineHeight: '1.6', margin: '0 0 6px 0' }}>💚 &nbsp;<strong>$10/mo</strong> — feeds a family of 4 for a week</Text>
            <Text style={{ color: DARK_TEXT, fontSize: '14px', lineHeight: '1.6', margin: '0 0 6px 0' }}>💚 &nbsp;<strong>$25/mo</strong> — stocks a pantry shelf for a month</Text>
            <Text style={{ color: DARK_TEXT, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>💚 &nbsp;<strong>$50/mo</strong> — sponsors a full distribution event</Text>
          </Section>

          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button href="https://seedandspoon.org/donate?recurring=true" style={{ backgroundColor: BRAND_GREEN, color: '#fff', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }}>
              Become a Monthly Donor
            </Button>
          </Section>

          <Text style={{ color: MUTED, fontSize: '13px', lineHeight: '1.6', margin: 0, textAlign: 'center' as const }}>
            No commitment required. Cancel anytime. Every gift is tax-deductible.
          </Text>
          <Hr style={{ borderColor: '#E0ECD5', margin: '24px 0' }} />
          <Text style={{ color: DARK_TEXT, fontSize: '15px', lineHeight: '1.7', margin: '0 0 4px 0' }}>With gratitude,</Text>
          <Text style={{ color: DARK_TEXT, fontSize: '15px', fontWeight: 'bold', margin: 0 }}>The Seed &amp; Spoon Team</Text>
        </Container>
        <Section style={{ backgroundColor: '#E8F0E9', padding: '16px 0', textAlign: 'center' as const }}>
          <Text style={{ color: MUTED, fontSize: '12px', margin: 0 }}>Seed &amp; Spoon · Newark, NJ · <a href="https://seedandspoon.org" style={{ color: BRAND_GREEN }}>seedandspoon.org</a></Text>
        </Section>
      </Body>
    </Html>
  )
}

export async function renderDonorRecurringAsk(data: TemplateData): Promise<RenderedTemplate> {
  return {
    subject: 'Make your impact ongoing — join our recurring donors',
    html: await render(<DonorRecurringAskEmail firstName={data.firstName} />),
  }
}

export default DonorRecurringAskEmail
