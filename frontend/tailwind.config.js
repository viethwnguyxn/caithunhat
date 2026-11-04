/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kindred: {
          primary: '#7C5CBF',
          hover: '#6949A8',
          light: '#E9E1F3',
          lavender: '#F5F0FA',
          bg: '#F8F7FA',
          card: '#FFFFFF',
          sub: '#F2EFF5',
          border: '#E9E1F3',
          text: '#292631',
          secondary: '#77717F',
          muted: '#A19AA8',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'Be Vietnam Pro', 'sans-serif'],
      },
      boxShadow: {
        'kindred-sm': '0 1px 3px rgba(124, 92, 191, 0.04)',
        'kindred-md': '0 4px 16px rgba(124, 92, 191, 0.08)',
        'kindred-lg': '0 10px 30px rgba(124, 92, 191, 0.12)',
        'kindred-focus': '0 0 0 3px rgba(124, 92, 191, 0.2)',
      },
      borderRadius: {
        'kindred-sm': '8px',
        'kindred-md': '12px',
        'kindred-lg': '16px',
        'kindred-xl': '24px',
      },
      animation: {
        'fadeIn': 'fadeIn 0.25s ease-out forwards',
        'scaleUp': 'scaleUp 0.2s ease-out forwards',
        'pulseSoft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.6' },
        },
      },
    },
  },
  plugins: [],
}
