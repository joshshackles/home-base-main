import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const now = new Date();
  return ["", "/marketplace", "/privacy", "/terms", "/fair-housing", "/accessibility"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
  }));
}
