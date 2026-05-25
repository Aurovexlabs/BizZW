import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import { ImageKitProvider } from './components/ImageKitProvider';
import { AppMotionProvider } from './components/motion/AppMotion';
import { queryClient } from './lib/queryClient';
import { getRuntimeConfig, initializeRuntimeConfig } from './lib/runtime-config';
import { routeTree } from './routeTree.gen';

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ImageKitProvider>
          <AppMotionProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors closeButton />
          </AppMotionProvider>
        </ImageKitProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

async function bootstrap() {
  await initializeRuntimeConfig();

  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig.sentryDsn) {
    Sentry.init({
      dsn: runtimeConfig.sentryDsn,
      environment: runtimeConfig.environment,
      tracesSampleRate: runtimeConfig.sentryTracesSampleRate,
    });
  }
}

void bootstrap().finally(() => {
  renderApp();
});
