import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";
import { appConfig } from "@/lib/app-config";

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
            Fasilitas Demonstrasi
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{appConfig.isDemo ? "Masuk Demo" : "Login Belum Tersedia"}</CardTitle>
            <CardDescription>
              {appConfig.isDemo
                ? "Pilih akun dummy untuk menjelajahi fitur berdasarkan peran."
                : "Autentikasi enterprise wajib dikonfigurasi sebelum aplikasi digunakan sebagai pilot."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appConfig.isDemo ? (
              <LoginForm />
            ) : (
              <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                Deployment ini tidak mengaktifkan mock login. Hubungi pengelola
                aplikasi untuk konfigurasi Microsoft Entra ID.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
