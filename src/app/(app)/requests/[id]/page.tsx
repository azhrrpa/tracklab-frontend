import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/feedback";
import { RequestDetail } from "@/features/requests/request-detail";

export const metadata: Metadata = { title: "Tracking Progress" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner label="Loading request…" />}>
      <RequestDetail />
    </Suspense>
  );
}
