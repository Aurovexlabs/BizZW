import { ImageKit } from '@imagekit/nodejs';

// @imagekit/nodejs v7 — official replacement for deprecated 'imagekit' package
let imagekitInstance: ImageKit | null = null;

export function getImageKit(): ImageKit {
  if (!imagekitInstance) {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('ImageKit configuration is incomplete. Check IMAGEKIT_PRIVATE_KEY env var.');
    }

    imagekitInstance = new ImageKit({ privateKey });
  }

  return imagekitInstance;
}

export function getImageKitAuthParams() {
  const ik = getImageKit();
  return ik.helper.getAuthenticationParameters();
}

export function getImageKitPublicKey(): string {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('IMAGEKIT_PUBLIC_KEY is not set');
  }

  return publicKey;
}

export async function deleteImageKitFile(fileId: string): Promise<void> {
  const ik = getImageKit();
  await ik.files.delete(fileId);
}

export function buildImageKitUrl(
  filePath: string,
  transformation?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
    focus?: string;
  }
): string {
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!urlEndpoint) throw new Error('IMAGEKIT_URL_ENDPOINT is not set');

  if (!transformation) return `${urlEndpoint}${filePath}`;

  const trParts: string[] = [];
  if (transformation.width) trParts.push(`w-${transformation.width}`);
  if (transformation.height) trParts.push(`h-${transformation.height}`);
  if (transformation.quality) trParts.push(`q-${transformation.quality}`);
  if (transformation.format) trParts.push(`f-${transformation.format}`);
  if (transformation.focus) trParts.push(`fo-${transformation.focus}`);

  const tr = trParts.join(',');
  return `${urlEndpoint}/tr:${tr}${filePath}`;
}

export const TRANSFORMATIONS = {
  productThumbnail: { width: 400, height: 400, focus: 'auto' },
  avatar: { width: 100, height: 100, focus: 'face' },
  receipt: { quality: 80, format: 'auto' },
} as const;
