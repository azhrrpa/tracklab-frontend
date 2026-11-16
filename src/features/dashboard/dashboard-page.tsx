"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FlaskConical, ListChecks, Workflow } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, PageHeader } from "@/components/layout/page-header";
import { EmptyState, Spinner } from "@/components/ui/feedback";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { AuditEntryCard } from "@/features/audit/history-dialog";
import { fetchAuditTrail, fetchPage, type ResourceName } from "@/lib/resources";

function useTotal(resource: ResourceName) {
  return useQuery({
    queryKey: [resource, "total"],
    queryFn: async ({ signal }) => {
      const page = await fetchPage(resource, { offset: 0, limit: 1, sortOrder: "ASC" }, signal);
      return page.total;
    },
  });
}

export function DashboardPage() {
  const { data: user } = useCurrentUser();
  const requests = useTotal("requests");
  const trackers = useTotal("trackers");
  const trackings = useTotal("trackings");
  const activity = useQuery({
    queryKey: ["audit", "recent"],
    queryFn: ({ signal }) => fetchAuditTrail({ offset: 0, limit: 5 }, signal),
  });

  return (
    <>
      <PageHeader title={`Hello, ${user?.displayName ?? "there"}`} description="Here is what is happening in TrackLab." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard href="/requests" label="Lab analysis requests" value={requests.data} loading={requests.isLoading} icon={<FlaskConical className="h-5 w-5" />} />
        <StatCard href="/trackers" label="Tracker steps" value={trackers.data} loading={trackers.isLoading} icon={<Workflow className="h-5 w-5" />} />
        <StatCard href="/trackings" label="Recorded trackings" value={trackings.data} loading={trackings.isLoading} icon={<ListChecks className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent activity</h2>
          <Link href="/audit-trail" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
            View audit trail <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {activity.isLoading ? (
          <Spinner />
        ) : !activity.data?.items.length ? (
          <EmptyState title="No activity yet" description="Creates, edits and deletes will show up here." />
        ) : (
          <ol className="space-y-3">
            {activity.data.items.map((entry) => (
              <AuditEntryCard key={entry.id} entry={entry} showEntity />
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}

function StatCard({ href, label, value, loading, icon }: { href: string; label: string; value: number | null | undefined; loading: boolean; icon: ReactNode }) {
  return (
    <Link href={href} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-brand-50 p-2 text-brand-600">{icon}</span>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden />
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-800">{loading ? "…" : (value ?? "—")}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Link>
  );
}
