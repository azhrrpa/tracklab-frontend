import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/feedback";
import { LogsPage } from "@/features/logs/logs-page";

export const metadata: Metadata = { title: "System Logs" };

export default function Page() {
  // The page defaults to today's date, which is only known at request time.
  return (
    <Suspense fallback={<Spinner label="Loading logs…" />}>
      <LogsPage />
    </Suspense>
  );
}
