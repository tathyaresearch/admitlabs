// Mock email sender: every message goes to the local test inbox (Mailpit, run by local Supabase)
// through its HTTP API, one per recipient. Nothing reaches the internet.

import { EMAIL_FROM, type EmailMessage, type EmailProvider, type EmailResult } from '../email.ts';

type Env = Readonly<Record<string, string | undefined>>;
type Fetch = typeof fetch;

/** Only ever the local test inbox: a URL on this computer. */
export function testInboxUrl(env: Env = process.env): string {
  const url = new URL(env.DRISHTI_MAILPIT_URL ?? 'http://127.0.0.1:55324');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error(`The test inbox must run on this computer, not at ${url.hostname}.`);
  }
  return url.origin;
}

export function mockEmail(env: Env = process.env, send: Fetch = fetch): EmailProvider {
  return {
    key: 'email',
    mode: 'mock',
    sender: 'Local test inbox',
    async send(message: EmailMessage): Promise<EmailResult[]> {
      const inbox = testInboxUrl(env);
      const results: EmailResult[] = [];
      for (const recipient of message.to) {
        try {
          const response = await send(`${inbox}/api/v1/send`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              From: { Email: EMAIL_FROM.email, Name: EMAIL_FROM.name },
              To: [{ Email: recipient }],
              Subject: message.subject,
              Text: message.text,
              HTML: message.html,
              Tags: [message.kind],
            }),
          });
          results.push(response.ok ? { recipient, ok: true, error: null } : { recipient, ok: false, error: `The test inbox said ${response.status}.` });
        } catch (error) {
          results.push({ recipient, ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
      return results;
    },
  };
}
