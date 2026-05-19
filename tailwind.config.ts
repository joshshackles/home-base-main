import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        system: {
          bg: "#0F172A",
          surface: "#111827",
          accent: "#2563EB",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          border: "#334155"
        },
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
          900: "#172554"
        }
      }
    }
  },
  plugins: []
};

export default config;
