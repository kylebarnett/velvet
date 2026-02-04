const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

interface EmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

interface BatchResult {
  sent: number;
  failed: number;
}

/**
 * Send a batch of emails via Resend with exponential backoff retry.
 */
export async function sendEmailBatchWithRetry(
  apiKey: string,
  emails: EmailPayload[],
): Promise<BatchResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emails),
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const sent =
          json?.data && Array.isArray(json.data)
            ? json.data.filter((d: { id?: string }) => d?.id).length
            : emails.length;
        return { sent, failed: emails.length - sent };
      }

      // 4xx errors are not retryable (bad request, auth issues)
      if (res.status >= 400 && res.status < 500) {
        console.error(
          `Email batch failed with ${res.status} (not retryable)`,
        );
        return { sent: 0, failed: emails.length };
      }

      // 5xx or other — retryable
      lastError = new Error(`Resend API returned ${res.status}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error("Email batch failed after retries:", lastError);
  return { sent: 0, failed: emails.length };
}
