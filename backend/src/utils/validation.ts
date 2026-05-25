import { z, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ─── Validate request body middleware factory ─────────────────

export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.reduce(
          (acc, e) => {
            const key = e.path.join('.');
            if (!acc[key]) acc[key] = [];
            acc[key].push(e.message);
            return acc;
          },
          {} as Record<string, string[]>
        );

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
          errors,
        });
        return;
      }
      next(err);
    }
  };
}

// ─── Common Schemas ───────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

// ─── File validation ──────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateImageUpload(file: Express.Multer.File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
}

export function validateDocUpload(file: Express.Multer.File): void {
  const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
  if (!allowed.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
}
