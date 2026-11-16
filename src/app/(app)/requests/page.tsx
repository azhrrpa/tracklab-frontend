import type { Metadata } from "next";
import { RequestsPage } from "@/features/requests/requests-page";

export const metadata: Metadata = { title: "Lab Analysis Request" };

export default function Page() {
  return <RequestsPage />;
}
