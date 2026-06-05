import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        surface: {
          DEFAULT: '#13131c',
          dark:    '#0e0e16',
          darker:  '#09090d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
        'card-gradient':  'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)',
      },
      boxShadow: {
        'brand-glow': '0 0 20px rgba(124,58,237,0.25)',
        'card':       '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset',
      },
    },
  },
  plugins: [],
};

export default config;
