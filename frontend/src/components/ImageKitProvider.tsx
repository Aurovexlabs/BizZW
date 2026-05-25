import { ImageKitProvider as IKProvider } from '@imagekit/react';
import React from 'react';
import { imagekitConfig } from '../lib/imagekit';

interface ImageKitProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app with ImageKit context.
 * @imagekit/react v5: use ImageKitProvider (replaces IKContext)
 */
export function ImageKitProvider({ children }: ImageKitProviderProps) {
  return <IKProvider urlEndpoint={imagekitConfig.urlEndpoint}>{children}</IKProvider>;
}
