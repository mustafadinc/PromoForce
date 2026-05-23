type ErrorContext = Record<string, unknown>;

export function captureException(error: unknown, context?: ErrorContext) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV === "development") {
      console.error("[monitoring]", error, context);
    }
    return;
  }

  // Sentry SDK optional — log structured payload when package not installed
  console.error("[sentry]", error, context);
}

export function captureMessage(message: string, context?: ErrorContext) {
  if (process.env.SENTRY_DSN) {
    console.info("[sentry]", message, context);
  }
}
