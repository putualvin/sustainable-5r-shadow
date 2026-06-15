"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardCheck,
  Wrench,
  ListChecks,
  Tag,
  ChartColumn,
  CalendarDays,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

import type { NavItem, Section } from "@/lib/rbac";
import { roleLabel } from "@/lib/rbac";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS: Record<Section, LucideIcon> = {
  home: Home,
  audit: ClipboardCheck,
  capa: Wrench,
  checklist: ListChecks,
  redtag: Tag,
  scores: ChartColumn,
  schedule: CalendarDays,
  reports: FileText,
  documents: FolderOpen,
  admin: Settings,
};

export function AppShell({
  user,
  items,
  children,
}: {
  user: { name: string; email: string; role: Parameters<typeof roleLabel>[0] };
  items: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Mobile bottom nav: show up to 5; overflow into "Lainnya".
  const primary = items.length > 5 ? items.slice(0, 4) : items;
  const overflow = items.length > 5 ? items.slice(4) : [];

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            5R
          </span>
          <span className="font-semibold">Sustainable 5R</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = ICONS[item.section];
            return (
              <Link
                key={item.section}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <UserBox user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              5R
            </span>
            <span className="font-semibold">Sustainable 5R</span>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Keluar">
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Overflow sheet (mobile) */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-card p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Menu Lainnya</p>
              <button onClick={() => setMoreOpen(false)} aria-label="Tutup">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {overflow.map((item) => {
                const Icon = ICONS[item.section];
                return (
                  <Link
                    key={item.section}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium text-muted-foreground"
                  >
                    <Icon className="h-6 w-6" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card md:hidden"
        style={{ gridTemplateColumns: `repeat(${primary.length + (overflow.length ? 1 : 0)}, minmax(0, 1fr))` }}
      >
        {primary.map((item) => {
          const Icon = ICONS[item.section];
          return (
            <Link
              key={item.section}
              href={item.href}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                isActive(item.href) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        {overflow.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            Lainnya
          </button>
        )}
      </nav>
    </div>
  );
}

function UserBox({
  user,
}: {
  user: { name: string; email: string; role: Parameters<typeof roleLabel>[0] };
}) {
  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-3 rounded-md p-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {roleLabel(user.role)}
          </p>
        </div>
      </div>
      <form action={logoutAction}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="mt-2 w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" /> Keluar
        </Button>
      </form>
    </div>
  );
}
