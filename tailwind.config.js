/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        pulseSketch: {
          '0%, 100%': { transform: 'scale(1)' },
          '18%': { transform: 'scale(0.85)' },
          '42%': { transform: 'scale(1.1)' },
          '60%': { transform: 'scale(0.97)' },
          '76%': { transform: 'scale(1.02)' },
        },
      },
      animation: {
        'pulse-sketch': 'pulseSketch 1.35s cubic-bezier(0.22, 1, 0.36, 1) infinite',
      },
      fontFamily: {
        sketch: ['Caveat', 'cursive'],
        monoSketch: ['"Courier New"', 'monospace'],
      },
      colors: {
        ink: '#efefef',
        paper: '#0d0f14',
        panel: '#181b22',
        panelSoft: '#252a34',
        accent: '#ff9d2f',
      },
    },
  },
  plugins: [],
}

