import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Email delivery placeholder. Wire to SES / Resend / Nodemailer in a later prompt.
 */
export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

  logger.info(
    {
      to,
      resetUrl,
      provider: 'placeholder',
    },
    'Password reset email queued (placeholder — no email sent)',
  );
}
