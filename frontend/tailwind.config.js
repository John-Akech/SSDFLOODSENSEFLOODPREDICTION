/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344'
        },
        flood: {
          alert: '#ef4444',
          warning: '#f59e0b',
          safe: '#10b981',
          critical: '#dc2626'
        },
        navy: {
          50: '#f0f9ff',
          900: '#0c4a6e',
          950: '#082f49'
        }
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
