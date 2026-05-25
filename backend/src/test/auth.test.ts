import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Subscription, Tenant } from '../modules/auth/tenant.model';

import request from 'supertest';
import app from '../app';
import { getTenantDB } from '../lib/db';
import { getUserModel } from '../modules/auth/user.model';

const skipIfNoMongo = process.env.RUN_MONGO_TESTS === '1' ? describe : describe.skip;

skipIfNoMongo('Auth Module', () => {
  const testBusiness = {
    businessName: 'Chisa Enterprises',
    ownerName: 'Tatenda Moyo',
    email: 'tatenda@chisaenterprise.co.zw',
    password: 'SecurePass123!',
    currency: 'USD',
  };

  describe('POST /api/v1/auth/register', () => {
    it('registers a new business and returns tokens', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testBusiness).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testBusiness.email);
      expect(res.body.data.user.role).toBe('ORG_OWNER');
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.tenant.name).toBe(testBusiness.businessName);

      // Verify tenant created in master DB
      const tenant = await Tenant.findOne({ email: testBusiness.email });
      expect(tenant).not.toBeNull();
      expect(tenant!.plan).toBe('STARTER');
      expect(tenant!.status).toBe('TRIAL');

      // Verify subscription created
      const subscription = await Subscription.findOne({ tenantId: tenant!._id });
      expect(subscription).not.toBeNull();
      expect(subscription!.status).toBe('ACTIVE');
    });

    it('rejects duplicate email registration', async () => {
      await request(app).post('/api/v1/auth/register').send(testBusiness);
      const res = await request(app).post('/api/v1/auth/register').send(testBusiness).expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('DUPLICATE_EMAIL');
    });

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'bad-email', password: '123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('rejects weak passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testBusiness, password: 'weak' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(testBusiness);
    });

    it('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testBusiness.email, password: testBusiness.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe(testBusiness.email);
      // Check refresh token cookie is set
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    });

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testBusiness.email, password: 'WrongPassword!' })
        .expect(401);

      expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('rejects non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'anything' })
        .expect(401);

      expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testBusiness);
      accessToken = res.body.data.accessToken;
    });

    it('returns current user with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.user.email).toBe(testBusiness.email);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects request without token', async () => {
      await request(app).get('/api/v1/auth/me').expect(401);
    });

    it('rejects invalid token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears the refresh token cookie', async () => {
      const res = await request(app).post('/api/v1/auth/logout').expect(200);
      expect(res.body.success).toBe(true);
      // Cookie should be cleared
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        expect(cookies[0]).toContain('refreshToken=;');
      }
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('always returns success (prevents email enumeration)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'doesnotexist@nowhere.com' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('sends reset email for valid user', async () => {
      const { sendEmail } = await import('../lib/resend');
      await request(app).post('/api/v1/auth/register').send(testBusiness);

      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testBusiness.email })
        .expect(200);

      // sendEmail mock should have been called for registration + reset
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe('Team seat limits', () => {
    let accessToken: string;
    let orgId: string;

    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testBusiness);
      accessToken = res.body.data.accessToken;
      orgId = res.body.data.tenant.orgId;
    });

    it('blocks invites when plan user seats are fully allocated', async () => {
      await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'first-invite@test.com', role: 'CASHIER' })
        .expect(200);

      const res = await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'second-invite@test.com', role: 'VIEWER' })
        .expect(402);

      expect(res.body.errorCode).toBe('USER_LIMIT_REACHED');
    });

    it('blocks invitation acceptance when active users are already at plan limit', async () => {
      await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'pending-invite@test.com', role: 'VIEWER' })
        .expect(200);

      const tenantDB = await getTenantDB(orgId);
      const User = getUserModel(tenantDB);
      const invited = await User.findOne({ email: 'pending-invite@test.com' });
      expect(invited?.inviteToken).toBeTruthy();

      // Fill remaining active seat (Starter plan: 2 max users).
      await User.create({
        name: 'Seat Filler',
        email: 'seat-filler@test.com',
        passwordHash: 'placeholder',
        role: 'CASHIER',
        isActive: true,
        emailVerified: true,
      });

      const acceptRes = await request(app)
        .post(`/api/v1/auth/accept-invite/${invited!.inviteToken}`)
        .send({
          name: 'Pending Invite',
          password: 'SecurePass123!',
          orgId,
        })
        .expect(402);

      expect(acceptRes.body.errorCode).toBe('USER_LIMIT_REACHED');
    });

    it('blocks reactivating a team member when active seats are already full', async () => {
      await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'member-a@test.com', role: 'CASHIER' })
        .expect(200);

      const tenantDB = await getTenantDB(orgId);
      const User = getUserModel(tenantDB);

      const memberAInvite = await User.findOne({ email: 'member-a@test.com' });
      expect(memberAInvite?.inviteToken).toBeTruthy();

      await request(app)
        .post(`/api/v1/auth/accept-invite/${memberAInvite!.inviteToken}`)
        .send({
          name: 'Member A',
          password: 'SecurePass123!',
          orgId,
        })
        .expect(200);

      const memberA = await User.findOne({ email: 'member-a@test.com' });
      expect(memberA?._id).toBeTruthy();

      await request(app)
        .patch(`/api/v1/auth/team/${memberA!._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: false })
        .expect(200);

      await request(app)
        .post('/api/v1/auth/invite')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'member-b@test.com', role: 'VIEWER' })
        .expect(200);

      const memberBInvite = await User.findOne({ email: 'member-b@test.com' });
      expect(memberBInvite?.inviteToken).toBeTruthy();

      await request(app)
        .post(`/api/v1/auth/accept-invite/${memberBInvite!.inviteToken}`)
        .send({
          name: 'Member B',
          password: 'SecurePass123!',
          orgId,
        })
        .expect(200);

      const reactivateRes = await request(app)
        .patch(`/api/v1/auth/team/${memberA!._id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isActive: true })
        .expect(402);

      expect(reactivateRes.body.errorCode).toBe('USER_LIMIT_REACHED');
    });
  });

  describe('Email verification OTP flow', () => {
    const otpBusiness = {
      businessName: 'OTP Test Store',
      ownerName: 'OTP Owner',
      email: 'otp-owner@teststore.co.zw',
      password: 'SecurePass123!',
      currency: 'USD',
    };

    let previousAutoVerifySetting: string | undefined;
    let previousOtpCode: string | undefined;

    beforeEach(() => {
      previousAutoVerifySetting = process.env.AUTH_AUTO_VERIFY_EMAIL;
      previousOtpCode = process.env.EMAIL_VERIFICATION_TEST_CODE;

      process.env.AUTH_AUTO_VERIFY_EMAIL = 'false';
      process.env.EMAIL_VERIFICATION_TEST_CODE = '123456';
    });

    it('requires OTP verification before login and verifies successfully with valid code', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send(otpBusiness)
        .expect(201);

      expect(registerRes.body.data.requiresEmailVerification).toBe(true);
      expect(registerRes.body.data.verificationMethod).toBe('otp');

      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: otpBusiness.email, password: otpBusiness.password })
        .expect(403);

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email-otp')
        .send({
          email: otpBusiness.email,
          orgId: registerRes.body.data.orgId,
          otp: '123456',
        })
        .expect(200);

      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.verified).toBe(true);

      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: otpBusiness.email, password: otpBusiness.password })
        .expect(200);
    });

    it('rejects invalid OTP submissions with a clear error code', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send(otpBusiness)
        .expect(201);

      const invalidOtpRes = await request(app)
        .post('/api/v1/auth/verify-email-otp')
        .send({
          email: otpBusiness.email,
          orgId: registerRes.body.data.orgId,
          otp: '000000',
        })
        .expect(400);

      expect(invalidOtpRes.body.errorCode).toBe('INVALID_OTP');
    });

    it('disables legacy token verification links', async () => {
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send(otpBusiness)
        .expect(201);

      const legacyVerifyRes = await request(app)
        .post('/api/v1/auth/verify-email/legacy-token-value')
        .send({ orgId: registerRes.body.data.orgId })
        .expect(410);

      expect(legacyVerifyRes.body.errorCode).toBe('VERIFICATION_LINK_DEPRECATED');
    });

    afterEach(() => {
      if (previousAutoVerifySetting === undefined) {
        delete process.env.AUTH_AUTO_VERIFY_EMAIL;
      } else {
        process.env.AUTH_AUTO_VERIFY_EMAIL = previousAutoVerifySetting;
      }

      if (previousOtpCode === undefined) {
        delete process.env.EMAIL_VERIFICATION_TEST_CODE;
      } else {
        process.env.EMAIL_VERIFICATION_TEST_CODE = previousOtpCode;
      }
    });
  });
});
