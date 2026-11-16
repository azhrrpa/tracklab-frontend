"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { ApiError, onUnauthorized } from "@/lib/api-client";
import { installGlobalErrorLogging, logToServer } from "@/lib/client-logger";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            // Retrying a 4xx won't help; retry network/server errors once.
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status >= 400 && error.status < 500) return;
            logToServer("error", `Data request failed: ${error.message}`, {
              context: error instanceof ApiError && error.traceId ? { traceId: error.traceId } : undefined,
            });
          },
        }),
      }),
  );

  useEffect(() => {
    installGlobalErrorLogging();

    // Any 401 means the session is gone: send the user to the login page and come back afterwards.
    onUnauthorized(() => {
      queryClient.clear();
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}&expired=1`);
    });
    return () => onUnauthorized(null);
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
