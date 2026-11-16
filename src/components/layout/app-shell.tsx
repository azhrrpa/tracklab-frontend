"use client";

import {
  ChevronDown,
  ClipboardList,
  FlaskConical,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ScrollText,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { useCurrentUser, useLogout } from "@/features/auth/use-current-user";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: ReactNode };
type NavSection = { title: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    title: "Main menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/requests", label: "Lab Analysis Request", icon: <FlaskConical className="h-4 w-4" /> },
      { href: "/trackings", label: "Tracking Progress", icon: <ListChecks className="h-4 w-4" /> },
    ],
  },
  {
    title: "Master",
    items: [{ href: "/trackers", label: "Tracker", icon: <Workflow className="h-4 w-4" /> }],
  },
  {
    title: "System",
    items: [
      { href: "/audit-trail", label: "Audit Trail", icon: <History className="h-4 w-4" /> },
      { href: "/logs", label: "System Logs", icon: <ScrollText className="h-4 w-4" /> },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Sidebar: fixed on desktop, slide-over on mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" aria-label="TrackLab home">
            <Brand />
          </Link>
          <button type="button" className="rounded p-1 text-slate-500 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* The current URL is only known at request time, so the active highlight streams in. */}
        <Suspense fallback={<NavLinks pathname={null} onNavigate={() => setMobileOpen(false)} />}>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </Suspense>
        <div className="border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-400">
          Pharma<span className="text-brand-600">Metric</span>Labs
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="rounded-md bg-brand-600 p-1.5 text-white lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  return <NavLinks pathname={usePathname()} onNavigate={onNavigate} />;
}

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate: () => void }) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
      {sections.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-brand-600">{section.title}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = pathname !== null && (pathname === item.href || pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onNavigate={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useLayoutEffect(() => () => setOpen(false), []);

  const name = user?.displayName ?? user?.username ?? "…";
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold uppercase text-slate-700 hover:bg-slate-50"
      >
        <span className="hidden sm:inline">{name}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{initials}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2.5 text-xs text-slate-500">
            Signed in as
            <p className="truncate text-sm font-medium normal-case text-slate-800">{user?.username}</p>
          </div>
          <Link
            href="/audit-trail"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <ClipboardList className="h-4 w-4" /> My activity
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
