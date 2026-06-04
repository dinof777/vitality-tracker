import type { Config } from "tailwindcss";

// Tokens are the live implementation of DESIGN.md. CSS variables live in
// app/globals.css; this file maps them to Tailwind names + sets the type scale.
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-press": "var(--accent-press)",
        "on-accent": "var(--on-accent)",
        "text-primary": "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        energy: "var(--energy)",
        success: "var(--success)",
        destructive: "var(--destructive)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        display: ["3.5rem", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "800" }],
        h1: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
        h3: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        label: ["0.875rem", { lineHeight: "1.4", letterSpacing: "0.04em", fontWeight: "600" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.02em", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "0.5rem", // 8px
        md: "0.75rem", // 12px
        lg: "1rem", // 16px
      },
      boxShadow: {
        lift: "0 8px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
