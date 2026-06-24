import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { navForRoles } from "@/lib/rbac";
import { AppShell } from "@/components/shared/app-shell";
import { OfflineBanner } from "@/components/shared/offline-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = navForRoles(user.roles);

  return (
    <>
      <OfflineBanner />
      <AppShell
        user={{ name: user.name, email: user.email, roles: user.roles }}
        items={items}
      >
        {children}
      </AppShell>
    </>
  );
}
