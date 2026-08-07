/**
 * SmsService — production SMS delivery with a development fallback.
 *
 * Configure via environment:
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER  (preferred)
 *   SMS_API_URL / SMS_API_KEY / SMS_SENDER                     (generic HTTP provider)
 *
 * When no provider is configured:
 *   - development: the OTP is logged to the console (so flows stay testable)
 *   - production:  sending throws so misconfiguration is visible
 */
export class SmsService {
  private readonly twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
  private readonly twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
  private readonly twilioFrom = process.env.TWILIO_FROM_NUMBER || '';
  private readonly genericUrl = process.env.SMS_API_URL || '';
  private readonly genericKey = process.env.SMS_API_KEY || '';
  private readonly genericSender = process.env.SMS_SENDER || 'BRISTI';

  isConfigured(): boolean {
    return Boolean(
      (this.twilioSid && this.twilioToken && this.twilioFrom) ||
      (this.genericUrl && this.genericKey)
    );
  }

  async sendOtp(phone: string, otp: string): Promise<void> {
    const message = `Your BRISTI verification code is ${otp}. It expires in 5 minutes.`;

    if (this.twilioSid && this.twilioToken && this.twilioFrom) {
      await this.sendViaTwilio(phone, message);
      return;
    }

    if (this.genericUrl && this.genericKey) {
      await this.sendViaGeneric(phone, message);
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('No SMS provider configured. Set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER or SMS_API_URL/SMS_API_KEY.');
    }

    // Development fallback: the code is logged so the full flow is testable
    // without a provider. Never log the code in production.
    console.info(`[sms] OTP for ${phone}: ${otp}`);
  }

  private async sendViaTwilio(phone: string, message: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
    const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');
    const body = new URLSearchParams({ To: phone, From: this.twilioFrom, Body: message });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`SMS delivery failed (${response.status}): ${detail.slice(0, 200)}`);
    }
  }

  private async sendViaGeneric(phone: string, message: string): Promise<void> {
    const response = await fetch(this.genericUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.genericKey}`,
      },
      body: JSON.stringify({ to: phone, from: this.genericSender, message }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`SMS delivery failed (${response.status}): ${detail.slice(0, 200)}`);
    }
  }
}
