// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}', // Scan all files in /src for class names
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
