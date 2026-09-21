import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutros quentes (base do layout).
        sand: {
          50: "#faf9f7",
          100: "#f4f2ee",
          200: "#e7e3dc",
          300: "#d5cec3",
          400: "#b3a99a",
          500: "#8f8474",
          600: "#6f665a",
          700: "#544d44",
          800: "#3a352f",
          900: "#26221e",
        },
        // Acento rosé elegante, usado no painel e nos estados principais.
        accent: {
          50: "#fff1f6",
          100: "#ffe4ee",
          200: "#fecddf",
          300: "#fda4c6",
          400: "#fb719f",
          500: "#f1437e",
          600: "#d82666",
          700: "#b71954",
          800: "#981747",
          900: "#81183f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
