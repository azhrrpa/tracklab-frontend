import type { Metadata } from "next";
import { AuditTrailPage } from "@/features/audit/audit-trail-page";

export const metadata: Metadata = { title: "Audit Trail" };

export default function Page() {
  return <AuditTrailPage />;
}
