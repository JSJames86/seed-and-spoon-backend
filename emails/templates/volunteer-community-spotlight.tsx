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

function VolunteerSpotlightEmail({ firstName }: Props) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'
  return (
    <Html lang="en">
      <Head />
      <Preview>Meet a family whose life you're helping change in Newark.</Preview>
      <Body style={{ backgroundColor: OFF_WHITE, fontFamily: "'Georgia','Times New Roman',serif", margin: 0, padding: 0 }}>
        <Section style={{ backgroundColor: BRAND_GREEN, padding: '24px 0', textAlign: 'center' as const }}>
          <Text style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>🌱 Seed &amp; Spoon</Text>
        </Section>
        <Container style={{ backgroundColor: '#fff', maxWidth: '560px', margin: '0 auto', padding: '40px 48px', borderLeft: `4px solid ${LIGHT_GREEN}` }}>
          <Heading style={{ color: BRAND_GREEN, fontSize: '26px', margin: '0 0 20px 0' }}>
            Meet someone whose life you&rsquo;re changing.
          </Heading>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>{greeting}</Text>
          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>
            You&rsquo;ve been volunteering with us for a week now, and we wanted to share a
            story that puts a face to the work you&rsquo;re doing.
          </Text>

          <Section style={{ backgroundColor: OFF_WHITE, borderLeft: `4px solid ${LIGHT_GREEN}`, padding: '16px 20px', margin: '8px 0 24px 0', borderRadius: '0 8px 8px 0' }}>
            <Text style={{ color: BRAND_GREEN, fontSize: '17px', fontStyle: 'italic', lineHeight: '1.6', margin: '0 0 8px 0' }}>
              &ldquo;My kids used to ask me why we couldn&rsquo;t have vegetables like their
              friends at school. Now I pick them up fresh every Saturday, thanks to the
              volunteers at Seed &amp; Spoon.&rdquo;
            </Text>
            <Text style={{ color: MUTED, fontSize: '13px', margin: 0 }}>— Single parent, Newark, served since 2024</Text>
          </Section>

          <Text style={{ color: DARK_TEXT, fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px 0' }}>
            That&rsquo;s you. Every time you show up, that&rsquo;s the kind of difference
            you&rsquo;re making. We&rsquo;re so grateful you&rsquo;re part of this.
          </Text>
          <Hr style={{ borderColor: '#E0ECD5', margin: '24px 0' }} />
          <Text style={{ color: DARK_TEXT, fontSize: '15px', lineHeight: '1.7', margin: '0 0 4px 0' }}>With so much appreciation,</Text>
          <Text style={{ color: DARK_TEXT, fontSize: '15px', fontWeight: 'bold', margin: 0 }}>The Seed &amp; Spoon Team</Text>
        </Container>
        <Section style={{ backgroundColor: '#E8F0E9', padding: '16px 0', textAlign: 'center' as const }}>
          <Text style={{ color: MUTED, fontSize: '12px', margin: 0 }}>Seed &amp; Spoon · Newark, NJ · <a href="https://seedandspoon.org" style={{ color: BRAND_GREEN }}>seedandspoon.org</a></Text>
        </Section>
      </Body>
    </Html>
  )
}

export async function renderVolunteerSpotlight(data: TemplateData): Promise<RenderedTemplate> {
  return {
    subject: 'Meet someone whose life you\'re changing',
    html: await render(<VolunteerSpotlightEmail firstName={data.firstName} />),
  }
}

export default VolunteerSpotlightEmail
