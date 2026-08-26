import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        navy: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#090d16",
        },
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA"
        },
        danger: {
          DEFAULT: "#EF4444",
          hover: "#DC2626"
        }
      },
      boxShadow: {
        'soft-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'soft': '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        'soft-xl': '0 20px 30px -10px rgba(15, 23, 42, 0.08)',
        'brand': '0 4px 14px 0 rgba(79, 70, 229, 0.35)',
      },
    },
  },
  plugins: [],
};
export default config;
