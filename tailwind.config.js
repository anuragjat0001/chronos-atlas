/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: '#0B1120',
        surface: '#111827',
        elevated: '#1E2D40',
        accent: '#F59E0B',
        cyan: '#06B6D4',
        emerald: '#10B981',
        rose: '#EF4444',
        violet: '#8B5CF6',
      },
    },
  },
  plugins: [],
}
