import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './email-service'
import { getTemplate, TemplateData } from './template-registry'

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase service role environment variables')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export interface EnrollOptions {
  subscriberId: string
  sequenceId: string
  metadata?: Record<string, unknown>
}

export async function enrollInSequence({ subscriberId, sequenceId, metadata }: EnrollOptions) {
  const supabase = getServiceSupabase()

  // Get first step to calculate initial next_send_at
  const { data: firstStep } = await supabase
    .from('email_sequence_steps')
    .select('delay_days')
    .eq('sequence_id', sequenceId)
    .eq('step_number', 1)
    .single()

  const nextSendAt = new Date()
  if (firstStep?.delay_days) {
    nextSendAt.setDate(nextSendAt.getDate() + firstStep.delay_days)
  }

  const { data, error } = await supabase
    .from('email_enrollments')
    .upsert(
      {
        subscriber_id: subscriberId,
        sequence_id: sequenceId,
        current_step: 1,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        next_send_at: nextSendAt.toISOString(),
        metadata: metadata ?? null,
      },
      { onConflict: 'subscriber_id,sequence_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (error) throw new Error(`Failed to enroll subscriber: ${error.message}`)
  return data
}

export async function processSequenceQueue(): Promise<{ processed: number; errors: number }> {
  const supabase = getServiceSupabase()
  let processed = 0
  let errors = 0

  // Fetch all active enrollments due for sending
  const { data: enrollments, error: fetchError } = await supabase
    .from('email_enrollments')
    .select(`
      id,
      current_step,
      sequence_id,
      subscriber_id,
      metadata,
      email_subscribers ( id, email, first_name, status ),
      email_sequences ( id, name )
    `)
    .eq('status', 'active')
    .lte('next_send_at', new Date().toISOString())
    .limit(50)

  if (fetchError) throw new Error(`Failed to fetch enrollments: ${fetchError.message}`)
  if (!enrollments?.length) return { processed: 0, errors: 0 }

  for (const enrollment of enrollments) {
    const subscriber = (enrollment.email_subscribers as any)
    if (!subscriber || subscriber.status !== 'subscribed') {
      await supabase
        .from('email_enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollment.id)
      continue
    }

    try {
      // Get the current step details
      const { data: step } = await supabase
        .from('email_sequence_steps')
        .select('*')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_number', enrollment.current_step)
        .single()

      if (!step) {
        await supabase
          .from('email_enrollments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', enrollment.id)
        continue
      }

      // Render and send the email
      const templateData: TemplateData = {
        firstName: subscriber.first_name ?? undefined,
        email: subscriber.email,
        ...(enrollment.metadata as object ?? {}),
      }
      const renderFn = getTemplate(step.template_key)
      const { subject, html } = await renderFn(templateData)

      await sendEmail({
        to: subscriber.email,
        subject,
        html,
        subscriberId: subscriber.id,
        emailType: 'sequence',
        sequenceId: enrollment.sequence_id,
        metadata: { stepNumber: enrollment.current_step, enrollmentId: enrollment.id },
      })

      // Check if there's a next step
      const { data: nextStep } = await supabase
        .from('email_sequence_steps')
        .select('step_number, delay_days')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_number', enrollment.current_step + 1)
        .single()

      if (nextStep) {
        const nextSendAt = new Date()
        nextSendAt.setDate(nextSendAt.getDate() + (nextStep.delay_days ?? 1))
        await supabase
          .from('email_enrollments')
          .update({ current_step: nextStep.step_number, next_send_at: nextSendAt.toISOString() })
          .eq('id', enrollment.id)
      } else {
        await supabase
          .from('email_enrollments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', enrollment.id)
      }

      processed++
    } catch (err) {
      console.error(`[sequence] error processing enrollment ${enrollment.id}:`, err)
      errors++
    }
  }

  return { processed, errors }
}
