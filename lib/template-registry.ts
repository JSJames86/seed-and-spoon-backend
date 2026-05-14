import { renderWelcomeEmail } from '@/emails/templates/welcome'
import { renderDonorThankYou } from '@/emails/templates/donor-thank-you'
import { renderDonorImpactStory } from '@/emails/templates/donor-impact-story'
import { renderDonorRecurringAsk } from '@/emails/templates/donor-recurring-ask'
import { renderVolunteerWelcome } from '@/emails/templates/volunteer-welcome-sequence'
import { renderVolunteerShiftTips } from '@/emails/templates/volunteer-shift-tips'
import { renderVolunteerSpotlight } from '@/emails/templates/volunteer-community-spotlight'
import { renderNewsletterWelcome } from '@/emails/templates/newsletter-welcome'
import { renderNewsletterImpact } from '@/emails/templates/newsletter-monthly-impact'

export interface TemplateData {
  firstName?: string
  email?: string
  [key: string]: unknown
}

export interface RenderedTemplate {
  subject: string
  html: string
}

type TemplateFn = (data: TemplateData) => Promise<RenderedTemplate>

const registry: Record<string, TemplateFn> = {
  welcome: async (d) => ({
    subject: 'Welcome to Seed & Spoon 🌱',
    html: await renderWelcomeEmail({ firstName: d.firstName }),
  }),
  donor_thank_you: async (d) => renderDonorThankYou(d),
  donor_impact_story: async (d) => renderDonorImpactStory(d),
  donor_recurring_ask: async (d) => renderDonorRecurringAsk(d),
  volunteer_welcome: async (d) => renderVolunteerWelcome(d),
  volunteer_shift_tips: async (d) => renderVolunteerShiftTips(d),
  volunteer_community_spotlight: async (d) => renderVolunteerSpotlight(d),
  newsletter_welcome: async (d) => renderNewsletterWelcome(d),
  newsletter_monthly_impact: async (d) => renderNewsletterImpact(d),
}

export function getTemplate(key: string): TemplateFn {
  const fn = registry[key]
  if (!fn) throw new Error(`Unknown email template key: "${key}"`)
  return fn
}
