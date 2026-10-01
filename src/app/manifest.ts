import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/public-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "A private luxury fund and shared wishlist for two.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    categories: ["finance", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add money", url: "/wallet", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Wishlist", url: "/wishlist", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
