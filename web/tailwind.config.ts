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
        // Acento marrom elegante, usado no painel e nos estados principais.
        accent: {
          50: "#f6eee7",
          100: "#ead8c8",
          200: "#d8bda8",
          300: "#c49b7c",
          400: "#a97852",
          500: "#93613e",
          600: "#7b4f32",
          700: "#633f28",
          800: "#51331f",
          900: "#422818",
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
