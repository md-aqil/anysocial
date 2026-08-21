'use client';

import { useEffect } from 'react';

export function ErrorSuppressor() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const message = event.message || '';
      if (
        message.includes('A listener indicated an asynchronous response by returning true') ||
        message.includes('message channel closed before a response was received')
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', handler, true);
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || event.reason || '';
      if (
        message.includes('A listener indicated an asynchronous response by returning true') ||
        message.includes('message channel closed before a response was received')
      ) {
        event.preventDefault();
      }
    });

    return () => {
      window.removeEventListener('error', handler, true);
    };
  }, []);

  return null;
}
