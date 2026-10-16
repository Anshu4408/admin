/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#171717', 100: '#262626', 200: '#404040', 300: '#737373',
          400: '#a3a3a3', 500: '#d4d4d4', 600: '#e5e5e5',
          700: '#f5f5f5', 800: '#fafafa', 900: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Geist Mono', 'ui-monospace', 'monospace'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
