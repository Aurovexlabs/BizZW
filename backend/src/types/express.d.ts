import type { AuthTokenPayload } from '../shared/types';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthTokenPayload;
    orgId?: string;
    authType?: 'jwt' | 'api-key';
    apiKey?: {
      id: string;
      name: string;
      permissions: string[];
      keyPrefix: string;
    };
  }
}

export {};
