import type { MetadataRoute } from "next";

// Web App Manifest (served at /manifest.webmanifest). Makes the app installable
// ("Add to Home Screen") with the Sinar Mas brand red as theme colour.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sustainable 5R",
    short_name: "5R",
    description:
      "Aplikasi Audit Sustainable 5R — Sinar Mas Agribusiness and Food",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#E30613",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
