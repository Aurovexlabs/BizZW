import { Router } from 'express';
import { z } from 'zod';
import {
  deleteImageKitFile,
  getImageKitAuthParams,
  getImageKitPublicKey,
} from '../../lib/imagekit';
import { authenticate } from '../../middleware/auth.middleware';
import { AppError, asyncHandler, sendSuccess } from '../../middleware/error.middleware';

export const mediaRouter = Router();

// All media routes require authentication
mediaRouter.use(authenticate);

// GET /api/v1/media/auth
// Returns ImageKit authentication params for secure client-side uploads
mediaRouter.get(
  '/auth',
  asyncHandler(async (req, res) => {
    const { orgId } = req.user!;
    const params = getImageKitAuthParams();
    const publicKey = getImageKitPublicKey();

    // Include the orgId folder hint for the frontend to use
    sendSuccess(
      res,
      { ...params, publicKey, folder: `/bizZW/${orgId}` },
      'ImageKit auth params generated'
    );
  })
);

// DELETE /api/v1/media/:fileId
// Deletes a file from ImageKit — verifies the file path includes the org's folder
mediaRouter.delete(
  '/:fileId',
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const { orgId } = req.user!;

    const bodySchema = z.object({
      filePath: z.string().min(1),
    });

    const { filePath } = bodySchema.parse(req.body);

    // Security: verify the file belongs to this org
    if (!filePath.includes(`/bizZW/${orgId}/`)) {
      throw new AppError('You do not have permission to delete this file', 403, 'FORBIDDEN');
    }

    await deleteImageKitFile(fileId);
    sendSuccess(res, null, 'File deleted successfully');
  })
);
