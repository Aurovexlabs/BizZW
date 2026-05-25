import { beforeEach, describe, expect, it, vi } from 'vitest';

const resendSendMock = vi.fn();
const smtpSendMailMock = vi.fn();
const smtpCreateTransportMock = vi.fn(() => ({
  sendMail: smtpSendMailMock,
}));

class ResendMock {
  emails = {
    send: resendSendMock,
  };

  constructor(_apiKey: string) {}
}

vi.mock('resend', () => ({
  Resend: ResendMock,
}));

vi.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: smtpCreateTransportMock,
  },
}));

vi.unmock('../lib/resend');

describe('sendEmail domain enforcement', () => {
  beforeEach(() => {
    vi.resetModules();

    resendSendMock.mockReset();
    smtpSendMailMock.mockReset();
    smtpCreateTransportMock.mockClear();

    resendSendMock.mockResolvedValue({ data: { id: 'email_test_id' }, error: null });
    smtpSendMailMock.mockResolvedValue({});

    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM = 'BizZW <noreply@bizzw.dev>';
    process.env.EMAIL_PROVIDER_PRIMARY = 'resend';

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  it('falls back to default bizzw.dev sender when Resend override is outside domain', async () => {
    const { sendEmail } = await import('../lib/resend');

    await sendEmail({
      to: 'recipient@example.com',
      from: 'Other Sender <security@external-domain.com>',
      subject: 'Sender enforcement check',
      html: '<p>Sender enforcement check</p>',
    });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'BizZW <noreply@bizzw.dev>',
      })
    );
  });

  it('allows bizzw.dev sender overrides', async () => {
    const { sendEmail } = await import('../lib/resend');

    await sendEmail({
      to: 'recipient@example.com',
      from: 'Ops Team <ops@bizzw.dev>',
      subject: 'Allowed sender check',
      html: '<p>Allowed sender check</p>',
    });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Ops Team <ops@bizzw.dev>',
      })
    );
  });

  it('enforces bizzw.dev sender for SMTP as well', async () => {
    process.env.EMAIL_PROVIDER_PRIMARY = 'smtp';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'smtp_user';
    process.env.SMTP_PASS = 'smtp_pass';
    process.env.SMTP_FROM = 'Bad SMTP <mailer@external-domain.com>';

    const { sendEmail } = await import('../lib/resend');

    await sendEmail({
      to: 'recipient@example.com',
      subject: 'SMTP sender enforcement check',
      html: '<p>SMTP sender enforcement check</p>',
    });

    expect(smtpCreateTransportMock).toHaveBeenCalledTimes(1);
    expect(smtpSendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'BizZW <noreply@bizzw.dev>',
      })
    );
    expect(resendSendMock).not.toHaveBeenCalled();
  });
});
