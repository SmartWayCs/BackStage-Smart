/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#2563eb', dark: '#1d4ed8' },
        accent: '#22d3ee',
        navy: { 950: '#071226', 900: '#0b1a3a', 800: '#10244d' },
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'none' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } },
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(40px,-30px) scale(1.12)' },
          '66%': { transform: 'translate(-30px,30px) scale(.95)' },
        },
        'grid-pan': { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '48px 48px' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        'gradient-x': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        'bar-grow': { from: { width: '0' } },
      },
      animation: {
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .8s ease both',
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        blob: 'blob 18s ease-in-out infinite',
        'grid-pan': 'grid-pan 6s linear infinite',
        shake: 'shake .4s ease',
        shimmer: 'shimmer 2.2s linear infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        'bar-grow': 'bar-grow 1.1s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
}
