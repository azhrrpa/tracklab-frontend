import type { Metadata } from "next";
import { TrackingsPage } from "@/features/trackings/trackings-page";

export const metadata: Metadata = { title: "Tracking Progress" };

export default function Page() {
  return <TrackingsPage />;
}
