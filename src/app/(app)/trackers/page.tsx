import type { Metadata } from "next";
import { TrackersPage } from "@/features/trackers/trackers-page";

export const metadata: Metadata = { title: "Master Tracker" };

export default function Page() {
  return <TrackersPage />;
}
