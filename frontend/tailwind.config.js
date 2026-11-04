/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#08090a',          // Deep Pitch Black
          card: '#11151c',        // Dark Charcoal Surface
          'card-hover': '#161c26',
          border: '#1a232e',      // Subtle Slate Border
          'border-glow': '#223344',
          green: '#10b981',       // Emerald Green
          neon: '#00ff88',        // Vivid Cyber Neon Green
          darkgreen: '#064e3b',
          text: '#f8fafc',        // Crisp White
          muted: '#94a3b8',       // Muted Gray
          dim: '#64748b',
        },
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0, 255, 136, 0.25)',
        'neon-md': '0 0 20px rgba(0, 255, 136, 0.35)',
        'neon-lg': '0 0 30px rgba(0, 255, 136, 0.45)',
        'cyber-card': '0 4px 20px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.6', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}

