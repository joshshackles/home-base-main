import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/marketplace"], disallow: ["/admin", "/landlord", "/applicant", "/api"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
