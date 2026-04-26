/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink:    '#0d0f12',
        panel:  '#141820',
        rim:    '#1e2530',
        muted:  '#2c3444',
        ghost:  '#4a5568',
        slate:  '#8892a4',
        chalk:  '#c8d0dc',
        snow:   '#eef1f6',
        amber:  { DEFAULT: '#f5a623', light: '#fbbf24', dark: '#d97706' },
        ruby:   { DEFAULT: '#e53e3e', light: '#fc8181', dark: '#9b2c2c' },
        jade:   { DEFAULT: '#38a169', light: '#68d391', dark: '#276749' },
        sky:    { DEFAULT: '#3182ce', light: '#63b3ed', dark: '#2c5282' },
        violet: { DEFAULT: '#805ad5', light: '#b794f4', dark: '#553c9a' },
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.4s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}