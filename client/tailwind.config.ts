import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Blueslate brand colors
        brand: {
          teal: '#0EA98B',
          'teal-dark': '#0B876E',
          navy: '#0F1923',
          coral: '#F97316',
          'coral-tint': '#FFF1E7',
          indigo: '#4F46E5',
          'indigo-tint': '#EEF2FF',
          amber: '#F59E0B',
          'amber-tint': '#FEF3E2',
          error: '#DC2626',
        },
        neutral: {
          ink: '#111827',
          gray: '#6B7280',
          border: '#E5E7EB',
          surface: '#F8FAFC',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      fontSize: {
        display: ['64px', { lineHeight: '1.1', fontWeight: '400' }],
        h2: ['36px', { lineHeight: '1.2', fontWeight: '600' }],
        h3: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        eyebrow: ['13px', { lineHeight: '1.2', fontWeight: '500', letterSpacing: '0.1em', textTransform: 'uppercase' }],
      },
      spacing: {
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
        '2xl': '64px',
        '3xl': '88px',
      },
      borderRadius: {
        button: '12px',
        card: '16px',
        'card-lg': '20px',
        'logo-tile': '22px',
      },
      boxShadow: {
        'teal-glow': '0 0 20px rgba(14,169,139,0.25)',
        'card': '0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
        'button': '0 1px 2px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};

export default config;
