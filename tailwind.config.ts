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
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#38a9f8",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#1e3a8a",
          900: "#172554",
          950: "#081d38",
        },
        celestial: {
          50: "#f4f8fe",
          100: "#e5effd",
          200: "#cce0fb",
          300: "#a3c8f7",
          400: "#72a7f1",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#172554",
          950: "#0a152d",
        },
        midnight: {
          700: "#182442",
          800: "#111b33",
          900: "#0b1224",
          950: "#070c18",
          deep: "#040710",
        },
        starlight: {
          100: "#fefce8",
          200: "#fef9c3",
          300: "#fef08a",
          400: "#fde047",
          500: "#eab308",
        },
        navy: {
          800: "#111b33",
          900: "#0b1224",
          950: "#070c18",
        },
        primary: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
        },
        danger: {
          DEFAULT: "#f43f5e",
          hover: "#e11d48",
        },
      },
      boxShadow: {
        'soft-sm': '0 1px 3px 0 rgba(7, 12, 24, 0.04), 0 1px 2px 0 rgba(7, 12, 24, 0.02)',
        'soft': '0 4px 20px -2px rgba(11, 18, 36, 0.06)',
        'soft-xl': '0 20px 30px -10px rgba(11, 18, 36, 0.1)',
        'brand': '0 4px 16px 0 rgba(37, 99, 235, 0.35)',
        'celestial-glow': '0 0 25px 2px rgba(56, 169, 248, 0.25)',
        'starlight-glow': '0 0 18px 2px rgba(254, 240, 138, 0.35)',
        'glass-celestial': '0 20px 50px -10px rgba(4, 7, 16, 0.8)',
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;

