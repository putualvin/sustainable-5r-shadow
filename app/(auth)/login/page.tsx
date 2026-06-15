import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";

const DEMO_ACCOUNTS = [
  { email: "admin@5r.local", label: "Admin" },
  { email: "komite@5r.local", label: "Komite Unit" },
  { email: "auditor1@5r.local", label: "Auditor" },
  { email: "pic.refinery2@5r.local", label: "Auditee / PIC" },
  { email: "redtag@5r.local", label: "Koord. Red Tag" },
  { email: "gm@5r.local", label: "Management" },
];

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
            5R
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Sustainable 5R
          </h1>
          <p className="text-sm text-muted-foreground">
            Sinar Mas Agribusiness and Food
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Masuk</CardTitle>
            <CardDescription>
              Gunakan email perusahaan Anda untuk masuk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
          <p className="mb-1.5 font-medium text-foreground">
            Akun demo (sandi bebas):
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex flex-col">
                <span className="font-medium text-foreground">{a.label}</span>
                <span className="truncate">{a.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
