import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Log in to manage lab analysis requests.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </section>
        <p className="mt-6 text-center text-xs text-slate-400">PharmaMetricLabs · TrackLab</p>
      </div>
    </main>
  );
}
