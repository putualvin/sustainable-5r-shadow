import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { navForRole } from "@/lib/rbac";
import { AppShell } from "@/components/shared/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items = navForRole(user.role);

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role }}
      items={items}
    >
      {children}
    </AppShell>
  );
}
