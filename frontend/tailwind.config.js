/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bspar: {
          50: '#eef6ff',
          100: '#d9e9fb',
          500: '#2a6f97',
          600: '#1d5678',
          700: '#16324f',
        },
      },
    },
  },
  plugins: [],
};
