import 'dotenv/config';

import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import mongoose from 'mongoose';
import { closeAllTenantConnections } from '../lib/db';

// ─── Environment defaults for tests ──────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-min!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-min!';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.IMAGEKIT_PUBLIC_KEY = 'test_public_key';
process.env.IMAGEKIT_PRIVATE_KEY = 'test_private_key';
process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';
process.env.RESEND_API_KEY = 're_test_key';
process.env.GEMINI_API_KEY = 'test_gemini_key';
process.env.PAYNOW_INTEGRATION_ID = 'test_id';
process.env.PAYNOW_INTEGRATION_KEY = 'test_key';
process.env.ARCJET_KEY = '';

// ─── Mock external services ───────────────────────────────────

// Mock Resend so we don't actually send emails during tests
vi.mock('../lib/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailVerificationOtpTemplate: vi.fn().mockReturnValue('<html>verify</html>'),
  welcomeEmailTemplate: vi.fn().mockReturnValue('<html>welcome</html>'),
  passwordResetTemplate: vi.fn().mockReturnValue('<html>reset</html>'),
  inviteEmailTemplate: vi.fn().mockReturnValue('<html>invite</html>'),
  invoiceEmailTemplate: vi.fn().mockReturnValue('<html>invoice</html>'),
}));

// Mock ImageKit
vi.mock('../lib/imagekit', () => ({
  getImageKit: vi.fn(),
  getImageKitAuthParams: vi.fn().mockReturnValue({
    signature: 'test_signature',
    token: 'test_token',
    expire: Math.floor(Date.now() / 1000) + 3600,
  }),
  deleteImageKitFile: vi.fn().mockResolvedValue(undefined),
  buildImageKitUrl: vi
    .fn()
    .mockImplementation((path: string) => `https://ik.imagekit.io/test${path}`),
  TRANSFORMATIONS: {
    productThumbnail: { width: 400, height: 400, focus: 'auto' },
    avatar: { width: 100, height: 100, focus: 'face' },
    receipt: { quality: 80, format: 'auto' },
  },
}));

// Mock Gemini AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContentStream: vi.fn().mockResolvedValue({
        stream: (async function* () {
          yield { text: () => 'Test AI response chunk 1' };
          yield { text: () => ' chunk 2' };
        })(),
      }),
    }),
  })),
}));

// ─── MongoDB test database ────────────────────────────────────
let mongoUri: string;

async function clearAllCollections(): Promise<void> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return;
  }

  const collections = await mongoose.connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const deleteOps: Array<Promise<unknown>> = [];

  for (const { name } of collections) {
    if (!name || name.startsWith('system.')) {
      continue;
    }

    deleteOps.push(mongoose.connection.db.collection(name).deleteMany({}));
  }

  if (deleteOps.length > 0) {
    await Promise.all(deleteOps);
  }
}

beforeAll(async () => {
  mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bizZW_test';
  process.env.MONGODB_URI = mongoUri;

  try {
    await mongoose.connect(mongoUri, {
      dbName: 'bizZW_test_platform',
      serverSelectionTimeoutMS: 3000,
    });

    await clearAllCollections();
  } catch {
    console.warn('⚠️  MongoDB not available — some tests will be skipped');
  }
});

afterEach(async () => {
  await clearAllCollections();
});

afterAll(async () => {
  await closeAllTenantConnections();
  await mongoose.disconnect();
});
