import "server-only";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Email delivery abstraction. No provider is bundled; plug in Resend, SES,
 * Postmark, etc. by implementing EmailSender and returning it from
 * getEmailSender() when its credentials are configured.
 */
export interface EmailSender {
  readonly configured: boolean;
  send(message: EmailMessage): Promise<void>;
}

class UnconfiguredEmailSender implements EmailSender {
  readonly configured = false;

  async send(message: EmailMessage): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      // Development convenience only: never log secrets/links in production.
      console.info(`\n[email:dev] To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
    }
  }
}

export function getEmailSender(): EmailSender {
  return new UnconfiguredEmailSender();
}
