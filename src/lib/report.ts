// Minimal, dependency-free crash/error reporting. Posts to an optional
// webhook (VITE_ERROR_WEBHOOK) so field bugs aren't lost; always logs.

const endpoint = import.meta.env.VITE_ERROR_WEBHOOK as string | undefined;

export function reportError(error: unknown, context?: string): void {
  // eslint-disable-next-line no-console
  console.error('[ShotIQ]', context ?? '', error);
  if (!endpoint) return;
  try {
    const body = JSON.stringify({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      url: location.href,
      ua: navigator.userAgent,
      at: new Date().toISOString(),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
    } else {
      void fetch(endpoint, { method: 'POST', body, keepalive: true });
    }
  } catch {
    /* never let reporting throw */
  }
}

/** Catch otherwise-silent runtime errors (off-thread, async). */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window.error'));
  window.addEventListener('unhandledrejection', (e) =>
    reportError(e.reason, 'unhandledrejection'),
  );
}
