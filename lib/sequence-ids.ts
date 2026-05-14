export const SEQUENCE_IDS = {
  donor_onboarding:      'a1000000-0000-0000-0000-000000000001',
  volunteer_welcome:     'a1000000-0000-0000-0000-000000000002',
  newsletter_onboarding: 'a1000000-0000-0000-0000-000000000003',
} as const

export type SequenceKey = keyof typeof SEQUENCE_IDS
