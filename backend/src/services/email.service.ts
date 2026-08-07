import nodemailer, { Transporter } from 'nodemailer';

export class EmailService {
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor() {
    this.from = process.env.EMAIL_FROM || 'BRISTI <no-reply@bristi.com>';
    this.transporter = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
        })
      : null;
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    await this.send(email, 'Reset your BRISTI password', `${this.frontendUrl}/reset-password/${resetToken}`);
  }

  async sendEmailVerificationEmail(email: string, verificationToken: string): Promise<void> {
    await this.send(email, 'Verify your BRISTI email', `${this.frontendUrl}/verify-email/${verificationToken}`);
  }

async sendOrderConfirmation(email: string, order: any): Promise<void> {
    if (!order) return;
    const lines = Array.isArray(order.items)
      ? order.items.map((item: any) => `• ${item.quantity} × ${item.productName || item.name || 'Item'}`).join('\n')
      : '';
    const subject = `Order confirmed — ${order.orderNumber || ''}`.trim();
    const content = `Thank you for your BRISTI order.\n\nOrder number: ${order.orderNumber}\nTotal: $${order.total ?? 0}\n\n${lines}\n\nWe'll notify you as soon as your pieces ship.`;
    await this.send(email, subject, content);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.send(email, 'Welcome to BRISTI', `Welcome${name ? `, ${name}` : ''}! Thank you for joining the BRISTI maison.`);
  }

  async sendNotificationEmail(email: string, subject: string, message: string): Promise<void> {
    await this.send(email, subject, message);
  }

  private get frontendUrl(): string { return process.env.FRONTEND_URL || 'http://localhost:3000'; }

  private async send(to: string, subject: string, content: string): Promise<void> {
    if (!this.transporter) {
      if (process.env.NODE_ENV === 'production') throw new Error('SMTP_HOST must be configured to send email');
      console.info(`Email delivery disabled in development: ${subject} -> ${to}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, text: content, html: `<p>${content}</p>` });
  }
}

