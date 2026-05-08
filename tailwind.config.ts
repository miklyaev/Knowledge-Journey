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
        ubuntu: {
          orange: "#E95420",
          dark: "#300A24",
          gray: "#3D3D3D",
          light: "#F7F7F7",
          purple: "#772953",
        },
        gnome: {
          bg: "#2c3e50",
          panel: "rgba(0, 0, 0, 0.8)",
          window: "#f6f5f4",
          header: "#ebebeb",
        }
      },
      borderRadius: {
        'gnome': '8px',
      },
      boxShadow: {
        'gnome': '0 10px 30px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
};
export default config;
