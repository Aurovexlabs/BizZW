import { upload } from '@imagekit/react';
import { api } from './api';
import { getRuntimeConfig, subscribeRuntimeConfig } from './runtime-config';

let runtimeConfig = getRuntimeConfig();

subscribeRuntimeConfig((nextConfig) => {
  runtimeConfig = nextConfig;
});

if (!runtimeConfig.imagekitUrlEndpoint || !runtimeConfig.imagekitPublicKey) {
  console.warn('ImageKit environment variables not set. File uploads will not work.');
}

export const imagekitConfig = {
  get urlEndpoint() {
    return runtimeConfig.imagekitUrlEndpoint;
  },
  get publicKey() {
    return runtimeConfig.imagekitPublicKey;
  },
};

interface ImageKitAuthParams {
  signature: string;
  expire: number;
  token: string;
  publicKey?: string;
  folder?: string;
}

export interface UploadedImage {
  fileId: string;
  filePath: string;
  url: string;
}

export async function uploadImageToImageKit(
  file: File,
  options?: {
    fileName?: string;
    folder?: string;
    useUniqueFileName?: boolean;
    onProgress?: (event: ProgressEvent) => void;
  }
): Promise<UploadedImage> {
  const response = await api.get('/media/auth');
  const auth = response.data.data as ImageKitAuthParams;

  if (!auth.signature || !auth.token || typeof auth.expire !== 'number') {
    throw new Error('Failed to get ImageKit upload credentials');
  }

  const uploadResponse = await upload({
    file,
    fileName: options?.fileName || file.name,
    publicKey: auth.publicKey || runtimeConfig.imagekitPublicKey,
    token: auth.token,
    expire: auth.expire,
    signature: auth.signature,
    folder: options?.folder || auth.folder,
    useUniqueFileName: options?.useUniqueFileName ?? true,
    onProgress: options?.onProgress,
  });

  if (!uploadResponse.fileId || !uploadResponse.filePath || !uploadResponse.url) {
    throw new Error('ImageKit upload response is missing required file details');
  }

  return {
    fileId: uploadResponse.fileId,
    filePath: uploadResponse.filePath,
    url: uploadResponse.url,
  };
}

// Build optimized ImageKit URL
export function buildImageUrl(
  filePath: string,
  transformation?: { width?: number; height?: number; quality?: number }
): string {
  if (!runtimeConfig.imagekitUrlEndpoint || !filePath) return '';

  if (!transformation) return `${runtimeConfig.imagekitUrlEndpoint}${filePath}`;

  const trParts: string[] = [];
  if (transformation.width) trParts.push(`w-${transformation.width}`);
  if (transformation.height) trParts.push(`h-${transformation.height}`);
  if (transformation.quality) trParts.push(`q-${transformation.quality}`);

  return `${runtimeConfig.imagekitUrlEndpoint}/tr:${trParts.join(',')}${filePath}`;
}

export const PRODUCT_THUMBNAIL_TR = [{ width: 400, height: 400, focus: 'auto' as const }];
export const AVATAR_TR = [{ width: 100, height: 100, focus: 'face' as const }];
export const LOGO_TR = [{ width: 200, height: 200 }];
