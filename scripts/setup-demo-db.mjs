import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL belum tersedia di .env.local, .env, atau process environment.");
  process.exit(1);
}

if (process.env.APP_MODE !== "demo") {
  console.error('Setup database demo hanya boleh dijalankan dengan APP_MODE="demo".');
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runLocalBinary(args) {
  const result = spawnSync(npmCommand, ["exec", "--", ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!process.argv.includes("--seed-only")) {
  runLocalBinary(["prisma", "db", "push"]);
}

runLocalBinary(["tsx", "prisma/seed.ts"]);
