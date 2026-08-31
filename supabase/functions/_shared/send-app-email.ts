import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendTemplateEmail,
  type SendTemplateEmailOptions,
  type SendTemplateEmailResult,
} from './transactional-email-templates/send-email.ts'

type Admin = ReturnType<typeof createClient>

/**
 * Sends a registered app-email template through Lovable's managed email API
 * and records the outcome in the project's `email_send_log` history table.
 *
 * The log row is a history record only — it never decides whether a send
 * happens. Suppression, retries and rate limits are enforced by Lovable.
 */
export async function sendAppEmail(
  admin: Admin,
  templateName: string,
  recipientEmail: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const logRow = async (
    status: 'sent' | 'suppressed' | 'failed',
    errorMessage?: string,
  ) => {
    const { error } = await admin.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: recipientEmail,
      status,
      error_message: errorMessage ?? null,
    })
    if (error) {
      console.error('Failed to write email_send_log row', {
        template_name: templateName,
        status,
        code: error.code,
        message: error.message,
      })
    }
  }

  try {
    const result = await sendTemplateEmail(templateName, recipientEmail, options)
    if (result.sent) {
      await logRow('sent')
    } else {
      await logRow('suppressed')
    }
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await logRow('failed', message.slice(0, 1000))
    throw error
  }
}
