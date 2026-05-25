import { Connection, Document, Model, Schema } from 'mongoose';

import { UserRole } from '../../shared/types';

export interface UserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatar?: { fileId: string; filePath: string };
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  emailVerificationOtpHash?: string;
  emailVerificationOtpExpiry?: Date;
  emailVerificationOtpAttempts?: number;
  emailVerificationResendWindowStart?: Date;
  emailVerificationResendCount?: number;
  emailVerificationSentAt?: Date;
  inviteToken?: string;
  inviteTokenExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false }, // Optional: invite users may not have password yet
    role: { type: String, enum: Object.values(UserRole), required: true },
    avatar: {
      fileId: String,
      filePath: String,
    },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    lastLogin: Date,
    emailVerificationOtpHash: String,
    emailVerificationOtpExpiry: Date,
    emailVerificationOtpAttempts: { type: Number, default: 0 },
    emailVerificationResendWindowStart: Date,
    emailVerificationResendCount: { type: Number, default: 0 },
    emailVerificationSentAt: Date,
    inviteToken: String,
    inviteTokenExpiry: Date,
    resetToken: String,
    resetTokenExpiry: Date,
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

// Factory: returns User model bound to a specific tenant connection
export function getUserModel(conn: Connection): Model<UserDocument> {
  // Return existing model if already registered on this connection
  if (conn.models['User']) return conn.models['User'] as Model<UserDocument>;
  return conn.model<UserDocument>('User', userSchema);
}
