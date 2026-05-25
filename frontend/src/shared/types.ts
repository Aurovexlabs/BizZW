// ============================================================
// BizZW Shared Types Package
// ============================================================

// ─── Enums ───────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_OWNER = 'ORG_OWNER',
  ORG_ADMIN = 'ORG_ADMIN',
  CASHIER = 'CASHIER',
  ACCOUNTANT = 'ACCOUNTANT',
  VIEWER = 'VIEWER',
}

export enum PlanType {
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum Currency {
  USD = 'USD',
  ZIG = 'ZiG',
}

export enum PaymentMethod {
  CASH = 'CASH',
  ECOCASH = 'ECOCASH',
  VISA = 'VISA',
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYNOW = 'PAYNOW',
}

export enum ExpenseCategory {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  SALARIES = 'SALARIES',
  SUPPLIES = 'SUPPLIES',
  TRANSPORT = 'TRANSPORT',
  MARKETING = 'MARKETING',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER',
}

export enum ReportType {
  REVENUE = 'REVENUE',
  INVENTORY_VALUATION = 'INVENTORY_VALUATION',
  PROFIT_LOSS = 'PROFIT_LOSS',
  TAX_SUMMARY = 'TAX_SUMMARY',
  CUSTOMER_LTV = 'CUSTOMER_LTV',
}

export enum ReportPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

// ─── Media ───────────────────────────────────────────────────

export interface ImageKitFile {
  fileId: string;
  filePath: string;
}

// ─── API Response ─────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  errorCode?: string;
  errors?: Record<string, string[]>;
}

// ─── Master DB Types ──────────────────────────────────────────

export interface ITenant {
  _id: string;
  orgId: string;
  name: string;
  email: string;
  plan: PlanType;
  status: TenantStatus;
  dbName: string;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  currency: Currency;
  taxRate: number;
  businessType: string;
  timezone: string;
  logo?: ImageKitFile;
  address?: string;
  phone?: string;
}

export interface ISubscription {
  _id: string;
  tenantId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  paynowRef?: string;
  createdAt: string;
}

// ─── Per-Tenant DB Types ──────────────────────────────────────

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: ImageKitFile;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface IProduct {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  lowStockThreshold: number;
  images: ImageKitFile[];
  stockHistory?: Array<{
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    quantity: number;
    reason: string;
    userId: string;
    createdAt: string;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  totalPurchases: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice {
  _id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: ICustomer;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  discount: number;
  total: number;
  currency: Currency;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  paynowRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ISale {
  _id: string;
  saleNumber: string;
  cashierId: string;
  cashier?: IUser;
  customerId?: string;
  customer?: ICustomer;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  receiptNumber: string;
  createdAt: string;
}

export interface IExpense {
  _id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  date: string;
  receipt?: ImageKitFile;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface IReport {
  _id: string;
  type: ReportType;
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  data: Record<string, unknown>;
  aiSummary?: string;
  generatedAt: string;
}

export interface IBranch {
  _id: string;
  name: string;
  address: string;
  managerId?: string;
  manager?: IUser;
  isActive: boolean;
  createdAt: string;
}

// ─── Auth Types ───────────────────────────────────────────────

export interface AuthTokenPayload {
  userId: string;
  orgId: string;
  role: UserRole;
  email: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  businessName: string;
  email: string;
  password: string;
  ownerName: string;
  businessType?: string;
  currency?: Currency;
}

export interface LoginResponse {
  user: IUser;
  tenant: ITenant;
  accessToken: string;
}

// ─── Plan Limits ──────────────────────────────────────────────

export interface PlanLimits {
  maxUsers: number;
  maxProducts: number;
  maxBranches: number;
  aiFeatures: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PlanType.STARTER]: {
    maxUsers: 2,
    maxProducts: 50,
    maxBranches: 1,
    aiFeatures: false,
    advancedReports: false,
    apiAccess: false,
  },
  [PlanType.GROWTH]: {
    maxUsers: 10,
    maxProducts: 500,
    maxBranches: 2,
    aiFeatures: true,
    advancedReports: true,
    apiAccess: false,
  },
  [PlanType.PRO]: {
    maxUsers: 50,
    maxProducts: 5000,
    maxBranches: 5,
    aiFeatures: true,
    advancedReports: true,
    apiAccess: true,
  },
  [PlanType.ENTERPRISE]: {
    maxUsers: -1,
    maxProducts: -1,
    maxBranches: -1,
    aiFeatures: true,
    advancedReports: true,
    apiAccess: true,
  },
};

export const PLAN_PRICES: Record<PlanType, number> = {
  [PlanType.STARTER]: 0,
  [PlanType.GROWTH]: 9,
  [PlanType.PRO]: 19,
  [PlanType.ENTERPRISE]: 49,
};

// ─── NEW ENTERPRISE FEATURES ──────────────────────────────────

export enum NotificationType {
  LOW_STOCK = 'LOW_STOCK',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  INVOICE_PAID = 'INVOICE_PAID',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  NEW_CUSTOMER = 'NEW_CUSTOMER',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
  SYSTEM = 'SYSTEM',
  PURCHASE_ORDER_APPROVED = 'PURCHASE_ORDER_APPROVED',
  PURCHASE_ORDER_RECEIVED = 'PURCHASE_ORDER_RECEIVED',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

export interface INotification {
  _id: string;
  orgId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  channel: NotificationChannel;
  createdAt: string;
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  PAYMENT = 'PAYMENT',
  PLAN_CHANGE = 'PLAN_CHANGE',
  INVITE = 'INVITE',
}

export interface IAuditLog {
  _id: string;
  orgId: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
  PARTIAL = 'PARTIAL',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  total: number;
  receivedQuantity: number;
}

export interface ISupplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
}

export interface IPurchaseOrder {
  _id: string;
  poNumber: string;
  supplierId?: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: Currency;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export enum WebhookEvent {
  SALE_CREATED = 'sale.created',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_CREATED = 'invoice.created',
  CUSTOMER_CREATED = 'customer.created',
  PRODUCT_LOW_STOCK = 'product.low_stock',
  PAYMENT_RECEIVED = 'payment.received',
}

export interface IWebhook {
  _id: string;
  orgId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastTriggered?: string;
  failureCount: number;
  createdAt: string;
}

export interface IApiKey {
  _id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  hashedKey: string;
  permissions: string[];
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}
