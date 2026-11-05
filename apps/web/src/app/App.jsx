import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from '../components/ui';
import { restoreSession } from '../features/auth/session';
import { createQueryClient } from './queryClient';
import { createRouter } from './router';

/** App root: query client, silent session restore, router and the global toaster. */
export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createRouter);

  useEffect(() => {
    // The httpOnly refresh cookie restores the session after a browser refresh (F2).
    restoreSession();
  }, []);

  return (
    // reducedMotion="user": springs become plain fades for people who ask for less motion.
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
        <Toaster />
      </QueryClientProvider>
    </MotionConfig>
  );
}
