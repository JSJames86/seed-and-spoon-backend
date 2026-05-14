import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import { render } from '@react-email/components'
import * as React from 'react'
import { TemplateData, RenderedTemplate } from '@/lib/template-registry'

const BRAND_GREEN = '#2D6A4F'
const LIGHT_GREEN = '#52B788'
const OFF_WHITE = '#F8F9F3'
const DARK_TEXT = '#1B2A22'
const MUTED = '#6B7B70'

interface Props { firstName?: string }

function VolunteerShiftTipsEmail({ firstName }: Props) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'
  return (
    <Html lang="en">
      <Head />
      <Preview>Your first Seed & Spoon shift — tips to make it great.</Preview>
      <Body style={{ backgroundColor: OFF_WHITE, fontFamily: "'Georgia','Times New Roman',serif", margin: 0, padding: 0 }}>
        <Section style={{ backgroundColor: BRAND_GREEN, padding: '24px 0', textAlign: 'center' as const }}>
          <Text style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>🌱 Seed &amp; Spoon</Text>
        </Section>
        <Container style={{ backgroundColor: '#fff', maxWidth: '560px', margin: '0 auto', padding: '40px 48px', borderLeft: `4px solid ${LIGHT_GREEN}` }}>
          <Heading style={{ color: BRAND_GREEN, fontSize: '26px', margin: '0 0 20px 0' }}>
            Your first shift — tips from the team.
          </Heading>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>{greeting}</Text>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 20px 0' }}>
            Your first distribution shift can feel a little hectic — but in the best way.
            Here&rsquo;s what our experienced volunteers wish they&rsquo;d known on day one:
          </Text>

          {[
            { emoji: '⏰', tip: 'Arrive 10 minutes early', detail: 'We do a quick briefing at the start of every shift. Being there early means you won\'t miss it.' },
            { emoji: '🥤', tip: 'Bring water and a snack', detail: 'Three hours on your feet goes faster than you think. Stay fueled.' },
            { emoji: '🤝', tip: 'Introduce yourself', detail: 'Our volunteers are incredibly welcoming. Don\'t be shy — you\'ll make friends fast.' },
            { emoji: '❓', tip: 'Ask questions freely', detail: 'No question is too small. Our shift leads are there to help you feel confident.' },
          ].map(({ emoji, tip, detail }) => (
            <Section key={tip} style={{ marginBottom: '16px' }}>
              <Text style={{ color: BRAND_GREEN, fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{emoji} &nbsp;{tip}</Text>
              <Text style={{ color: DARK_TEXT, fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{detail}</Text>
            </Section>
          ))}

          <Hr style={{ borderColor: '#E0ECD5', margin: '24px 0' }} />
          <Text style={{ color: DARK_TEXT, fontSize: '15px', lineHeight: '1.7', margin: '0 0 4px 0' }}>Can&rsquo;t wait to have you out there,</Text>
          <Text style={{ color: DARK_TEXT, fontSize: '15px', fontWeight: 'bold', margin: 0 }}>The Seed &amp; Spoon Team</Text>
        </Container>
        <Section style={{ backgroundColor: '#E8F0E9', padding: '16px 0', textAlign: 'center' as const }}>
          <Text style={{ color: MUTED, fontSize: '12px', margin: 0 }}>Seed &amp; Spoon · Newark, NJ · <a href="https://seedandspoon.org" style={{ color: BRAND_GREEN }}>seedandspoon.org</a></Text>
        </Section>
      </Body>
    </Html>
  )
}

export async function renderVolunteerShiftTips(data: TemplateData): Promise<RenderedTemplate> {
  return {
    subject: 'Your first shift — what to expect',
    html: await render(<VolunteerShiftTipsEmail firstName={data.firstName} />),
  }
}

export default VolunteerShiftTipsEmail
