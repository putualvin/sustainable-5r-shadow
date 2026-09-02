import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const required = ["DATABASE_URL", "APP_MODE"];
const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error(`Environment belum lengkap: ${missing.join(", ")}`);
  console.error(
    "Salin .env.example ke .env.local atau tarik environment dari Vercel."
  );
  process.exit(1);
}

let databaseUrl;
try {
  databaseUrl = new URL(process.env.DATABASE_URL);
} catch {
  console.error("DATABASE_URL bukan URL PostgreSQL yang valid.");
  process.exit(1);
}

if (!["postgresql:", "postgres:"].includes(databaseUrl.protocol)) {
  console.error("DATABASE_URL harus memakai protokol postgresql:// atau postgres://.");
  process.exit(1);
}

if (process.env.APP_MODE !== "demo") {
  console.error('Deployment demo wajib memakai APP_MODE="demo".');
  process.exit(1);
}

console.log("Environment siap: DATABASE_URL tersedia dan APP_MODE=demo.");
