/**
 * Sends frontend errors to the .NET logging endpoint (POST /api/logs/client),
 * so browser problems show up in the same log as backend events.
 * Never throws: logging must not break the page.
 */

type Level = "error" | "warning" | "info";

const recent = new Map<string, number>();

export function logToServer(level: Level, message: string, details?: { stack?: string; context?: Record<string, string> }) {
  if (typeof window === "undefined") return;

  // Don't send the same message more than once every 10 seconds.
  const key = `${level}:${message}`;
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - 10_000) return;
  recent.set(key, now);

  const body = JSON.stringify({
    level,
    message: message.slice(0, 2000),
    url: window.location.pathname.slice(0, 500),
    stack: details?.stack?.slice(0, 8000),
    context: details?.context,
  });

  fetch("/api/logs/client", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body,
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // Ignore: the server may be down, which is exactly when we can't log.
  });
}

let installed = false;

/** Reports uncaught errors and unhandled promise rejections. */
export function installGlobalErrorLogging() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    logToServer("error", event.message || "Uncaught error", { stack: event.error?.stack });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as Error | undefined;
    logToServer("error", reason?.message ?? String(event.reason), { stack: reason?.stack });
  });
}
