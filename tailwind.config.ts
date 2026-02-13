import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          background: "#F5F2EC",
          text: "#1F1F1F",
          border: "#E5E2DB",
          primary: "#2F4F3E",
          primaryHover: "#243D30",
          secondary: "#6C8A73",
        },
      },
    },
  },
};

export default config;
