import nodemailer, { Transporter } from 'nodemailer';

import { Resend } from 'resend';
import { logger } from './logger';

let resendClient: Resend | null = null;
let smtpTransporter: Transporter | null = null;

type EmailProvider = 'resend' | 'smtp';

const DEFAULT_FROM_EMAIL = 'BizZW <noreply@bizzw.dev>';
const ENFORCED_FROM_DOMAIN = 'bizzw.dev';
const SEND_ATTEMPTS_PER_PROVIDER = 2;

function getResendFromAddress(): string {
  return process.env.RESEND_FROM || DEFAULT_FROM_EMAIL;
}

function extractEmailAddress(identity: string): string {
  const match = identity.match(/<([^>]+)>/);
  return (match ? match[1] : identity).trim().toLowerCase();
}

function isAllowedSender(identity: string): boolean {
  const email = extractEmailAddress(identity);
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return false;
  }

  return email.slice(atIndex + 1) === ENFORCED_FROM_DOMAIN;
}

function resolveFromAddress(provider: EmailProvider, requestedFrom?: string): string {
  const providerDefault =
    provider === 'smtp' ? process.env.SMTP_FROM || getResendFromAddress() : getResendFromAddress();

  const candidate = requestedFrom || providerDefault || DEFAULT_FROM_EMAIL;
  if (isAllowedSender(candidate)) {
    return candidate;
  }

  logger.warn(
    {
      provider,
      requestedFrom: candidate,
      fallbackFrom: DEFAULT_FROM_EMAIL,
      enforcedDomain: ENFORCED_FROM_DOMAIN,
    },
    'Email sender outside enforced domain; falling back to default sender'
  );

  return DEFAULT_FROM_EMAIL;
}

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is required');
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getSmtpTransporter(): Transporter {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass || !Number.isFinite(port)) {
    throw new Error('SMTP fallback is not configured');
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return smtpTransporter;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

function getProviderOrder(): EmailProvider[] {
  const preferredProvider = process.env.EMAIL_PROVIDER_PRIMARY === 'smtp' ? 'smtp' : 'resend';

  if (preferredProvider === 'smtp') {
    return ['smtp', 'resend'];
  }

  return ['resend', 'smtp'];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function sendViaResend(options: SendEmailOptions): Promise<void> {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: resolveFromAddress('resend', options.from),
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    attachments: options.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function sendViaSmtp(options: SendEmailOptions): Promise<void> {
  const transporter = getSmtpTransporter();

  await transporter.sendMail({
    from: resolveFromAddress('smtp', options.from),
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
}

async function attemptProvider(provider: EmailProvider, options: SendEmailOptions): Promise<void> {
  if (provider === 'resend') {
    await sendViaResend(options);
    return;
  }

  await sendViaSmtp(options);
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const providers = getProviderOrder();
  const failures: string[] = [];

  for (const provider of providers) {
    for (let attempt = 1; attempt <= SEND_ATTEMPTS_PER_PROVIDER; attempt += 1) {
      try {
        await attemptProvider(provider, options);
        logger.info(
          {
            provider,
            attempt,
            recipients: Array.isArray(options.to) ? options.to.length : 1,
            subject: options.subject,
          },
          'Email delivered successfully'
        );
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${provider}#${attempt}: ${message}`);

        logger.warn({ provider, attempt, err: error }, 'Email delivery attempt failed');

        if (attempt < SEND_ATTEMPTS_PER_PROVIDER) {
          await sleep(250 * attempt);
        }
      }
    }
  }

  throw new Error(`Email send failed across all providers. ${failures.join(' | ')}`);
}

// ─── Email Templates ──────────────────────────────────────────

export function welcomeEmailTemplate(name: string, orgName: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #1e40af, #15803d); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to BizZW 🇿🇼</h1>
      </div>
      <h2>Hi ${name}!</h2>
      <p>Your business <strong>${orgName}</strong> has been successfully registered on BizZW.</p>
      <p>You now have access to all the tools you need to manage your business efficiently:</p>
      <ul>
        <li>📦 Inventory Management</li>
        <li>🧾 Invoicing & POS</li>
        <li>👥 Customer Management</li>
        <li>📊 Analytics & Reports</li>
        <li>🤖 AI-Powered Insights</li>
      </ul>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.CLIENT_URL}/dashboard" 
           style="background: #1e40af; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>
      <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
        Need help? Reply to this email or visit our support center.
      </p>
    </div>
  `;
}

export function emailVerificationOtpTemplate(
  name: string,
  orgName: string,
  otpCode: string,
  expiresInMinutes: number
): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #1e40af, #15803d); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
      </div>
      <h2>Hi ${name},</h2>
      <p>Welcome to <strong>${orgName}</strong> on BizZW. Use the one-time verification code below to activate secure sign-in.</p>

      <div style="margin: 24px 0; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; text-align: center;">
        <p style="margin: 0 0 8px; color: #334155; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
        <p style="margin: 0; font-size: 36px; letter-spacing: 10px; font-weight: 800; color: #0f172a; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace;">
          ${otpCode}
        </p>
      </div>

      <p>This code expires in <strong>${expiresInMinutes} minutes</strong>. If it expires, request a new code from the verification screen.</p>
      <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
        For your security, never share this code with anyone.
      </p>
    </div>
  `;
}

export function passwordResetTemplate(name: string, resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #1e40af; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0;">Password Reset</h1>
      </div>
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your BizZW password.</p>
      <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email. Your password won't change.</p>
    </div>
  `;
}

export function inviteEmailTemplate(
  inviterName: string,
  orgName: string,
  inviteUrl: string,
  role: string
): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #1e40af, #15803d); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0;">You're Invited! 🎉</h1>
      </div>
      <h2>You've been invited to join ${orgName}</h2>
      <p><strong>${inviterName}</strong> has invited you to join their business on BizZW as a <strong>${role}</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" 
           style="background: #15803d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This invitation expires in 48 hours.</p>
    </div>
  `;
}

export function invoiceEmailTemplate(
  customerName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  paymentUrl?: string
): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="background: #1e40af; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0;">Invoice ${invoiceNumber}</h1>
      </div>
      <h2>Hi ${customerName},</h2>
      <p>You have a new invoice from us.</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%;">
          <tr><td style="color: #6b7280;">Invoice Number:</td><td style="font-weight: 600; text-align: right;">${invoiceNumber}</td></tr>
          <tr><td style="color: #6b7280;">Amount Due:</td><td style="font-weight: 700; font-size: 20px; color: #1e40af; text-align: right;">${amount}</td></tr>
          <tr><td style="color: #6b7280;">Due Date:</td><td style="font-weight: 600; text-align: right;">${dueDate}</td></tr>
        </table>
      </div>
      ${
        paymentUrl
          ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${paymentUrl}" style="background: #15803d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Pay Now via Paynow
          </a>
        </div>
      `
          : ''
      }
      <p style="color: #6b7280; font-size: 14px;">Please find the invoice PDF attached to this email.</p>
    </div>
  `;
}

export function contactTeamNotificationTemplate(input: {
  ticketId: string;
  name: string;
  email: string;
  company?: string;
  topic?: string;
  phone?: string;
  message: string;
  submittedAtIso: string;
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #1e40af, #14532d); border-radius: 14px; padding: 24px; color: #ffffff;">
        <p style="margin: 0; opacity: 0.85; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">BizZW Contact Desk</p>
        <h1 style="margin: 8px 0 0; font-size: 24px;">New Contact Request</h1>
      </div>

      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-top: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Ticket</td><td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${input.ticketId}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Name</td><td style="padding: 8px 0; color: #0f172a;">${input.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0; color: #0f172a;">${input.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Company</td><td style="padding: 8px 0; color: #0f172a;">${input.company || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Phone</td><td style="padding: 8px 0; color: #0f172a;">${input.phone || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Topic</td><td style="padding: 8px 0; color: #0f172a;">${input.topic || 'General inquiry'}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Submitted</td><td style="padding: 8px 0; color: #0f172a;">${new Date(input.submittedAtIso).toLocaleString('en-ZW')}</td></tr>
        </table>
      </div>

      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-top: 16px;">
        <p style="margin: 0 0 10px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px;">Message</p>
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #0f172a; white-space: pre-wrap;">${input.message}</p>
      </div>
    </div>
  `;
}

export function contactAutoReplyTemplate(input: {
  ticketId: string;
  name: string;
  topic?: string;
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #1e40af, #14532d); border-radius: 14px; padding: 24px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">We received your message</h1>
        <p style="margin: 10px 0 0; opacity: 0.9; font-size: 14px;">BizZW Support</p>
      </div>

      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-top: 16px;">
        <p style="margin: 0 0 12px; color: #0f172a; font-size: 15px;">Hello ${input.name},</p>
        <p style="margin: 0 0 12px; color: #334155; line-height: 1.7; font-size: 15px;">
          Thank you for contacting BizZW. Your request has been logged and assigned to our support desk.
        </p>
        <p style="margin: 0 0 12px; color: #334155; line-height: 1.7; font-size: 15px;">
          <strong>Reference:</strong> ${input.ticketId}<br />
          <strong>Topic:</strong> ${input.topic || 'General inquiry'}
        </p>
        <p style="margin: 0; color: #334155; line-height: 1.7; font-size: 15px;">
          We typically respond within one business day. If this is urgent, reply directly to this email with your reference number.
        </p>
      </div>
    </div>
  `;
}

export function systemAlertTemplate(input: {
  incidentId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  summary: string;
  details: Array<{ label: string; value: string }>;
  recommendedActions?: string[];
  occurredAtIso: string;
}): string {
  const severityTone: Record<
    typeof input.severity,
    { chipBg: string; chipText: string; banner: string }
  > = {
    critical: {
      chipBg: '#fee2e2',
      chipText: '#991b1b',
      banner: 'linear-gradient(135deg, #991b1b, #dc2626)',
    },
    high: {
      chipBg: '#ffedd5',
      chipText: '#9a3412',
      banner: 'linear-gradient(135deg, #9a3412, #ea580c)',
    },
    medium: {
      chipBg: '#dbeafe',
      chipText: '#1e3a8a',
      banner: 'linear-gradient(135deg, #1e40af, #2563eb)',
    },
  };

  const tone = severityTone[input.severity];

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; padding: 24px; background: #f8fafc;">
      <div style="background: ${tone.banner}; border-radius: 14px; padding: 24px; color: #ffffff;">
        <p style="margin: 0; opacity: 0.88; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase;">BizZW Ops Alert</p>
        <h1 style="margin: 8px 0 0; font-size: 24px;">${input.title}</h1>
      </div>

      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-top: 16px;">
        <div style="display: inline-block; margin-bottom: 12px; background: ${tone.chipBg}; color: ${tone.chipText}; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          ${input.severity} severity
        </div>

        <p style="margin: 0 0 14px; color: #0f172a; font-size: 15px; line-height: 1.7;">${input.summary}</p>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 7px 0; color: #64748b; width: 160px;">Incident ID</td><td style="padding: 7px 0; color: #0f172a; font-weight: 700;">${input.incidentId}</td></tr>
          <tr><td style="padding: 7px 0; color: #64748b;">Occurred At</td><td style="padding: 7px 0; color: #0f172a;">${new Date(input.occurredAtIso).toLocaleString('en-ZW')}</td></tr>
          ${input.details
            .map(
              (row) =>
                `<tr><td style="padding: 7px 0; color: #64748b;">${row.label}</td><td style="padding: 7px 0; color: #0f172a;">${row.value}</td></tr>`
            )
            .join('')}
        </table>
      </div>

      ${
        input.recommendedActions && input.recommendedActions.length > 0
          ? `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-top: 16px;">
          <p style="margin: 0 0 10px; color: #334155; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Recommended Actions</p>
          <ul style="margin: 0; padding-left: 18px; color: #334155; font-size: 14px; line-height: 1.7;">
            ${input.recommendedActions.map((action) => `<li>${action}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }
    </div>
  `;
}
