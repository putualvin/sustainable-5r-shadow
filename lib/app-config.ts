export type AppMode = "demo" | "pilot" | "production";

const configuredMode = process.env.APP_MODE;
const mode: AppMode =
  configuredMode === "demo" ||
  configuredMode === "pilot" ||
  configuredMode === "production"
    ? configuredMode
    : process.env.NODE_ENV === "production"
      ? "production"
      : "demo";

export const appConfig = {
  mode,
  isDemo: mode === "demo",
} as const;
