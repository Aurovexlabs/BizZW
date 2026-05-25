import mongoose, { Connection } from 'mongoose';

import { logger } from './logger';

// Cache for tenant DB connections
const tenantConnections = new Map<string, Connection>();
const pendingTenantConnections = new Map<string, Promise<Connection>>();

let masterConnection: typeof mongoose | null = null;

const SHARED_TEST_TENANT_DB_NAME = 'bizZW_test_platform';

export function getTenantDbName(orgId: string): string {
  const useSharedTestDb = process.env.NODE_ENV === 'test' && process.env.RUN_MONGO_TESTS === '1';

  if (useSharedTestDb) {
    return SHARED_TEST_TENANT_DB_NAME;
  }

  return `bizZW_tenant_${orgId}`;
}

export async function connectMasterDB(): Promise<typeof mongoose> {
  if (masterConnection) return masterConnection;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is required');

  masterConnection = await mongoose.connect(uri, {
    dbName: 'bizZW_platform',
    maxPoolSize: 30,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 30000,
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'Master DB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Master DB disconnected, attempting reconnect');
    masterConnection = null;
  });

  return masterConnection;
}

export async function getTenantDB(orgId: string): Promise<Connection> {
  const dbName = getTenantDbName(orgId);
  const connectionKey = dbName;

  const cachedConnection = tenantConnections.get(connectionKey);
  if (cachedConnection?.readyState === 1) {
    return cachedConnection;
  }

  const pendingConnection = pendingTenantConnections.get(connectionKey);
  if (pendingConnection) {
    return pendingConnection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is required');

  const connectionPromise = (async () => {
    const connection = mongoose.createConnection(uri, {
      dbName,
      maxPoolSize: 15,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
    });

    await connection.asPromise();

    connection.on('error', (err) => {
      logger.error({ err, orgId, dbName }, 'Tenant DB error');
      tenantConnections.delete(connectionKey);
      pendingTenantConnections.delete(connectionKey);
    });

    connection.on('disconnected', () => {
      tenantConnections.delete(connectionKey);
      pendingTenantConnections.delete(connectionKey);
    });

    tenantConnections.set(connectionKey, connection);
    return connection;
  })();

  pendingTenantConnections.set(connectionKey, connectionPromise);

  try {
    return await connectionPromise;
  } finally {
    pendingTenantConnections.delete(connectionKey);
  }
}

export function closeTenantDB(orgId: string): void {
  const connectionKey = getTenantDbName(orgId);
  const conn = tenantConnections.get(connectionKey);
  if (conn) {
    conn.close();
    tenantConnections.delete(connectionKey);
  }
  pendingTenantConnections.delete(connectionKey);
}

export async function closeAllTenantConnections(): Promise<void> {
  await Promise.all([...tenantConnections.values()].map((c) => c.close()));
  tenantConnections.clear();
  pendingTenantConnections.clear();
}

export async function closeAllConnections(): Promise<void> {
  await closeAllTenantConnections();
  if (masterConnection) {
    await mongoose.disconnect();
    masterConnection = null;
  }
}
