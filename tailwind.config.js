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
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        accent: {
          cyan: '#00f2fe',
          emerald: '#10b981',
          violet: '#8b5cf6',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
        dark: {
          900: '#0a0d14',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
        },
        comic: {
          yellow: '#00F0FF',
          amber: '#F59E0B',
          red: '#FF3366',
          cyan: '#00F0FF',
          green: '#00E676',
          purple: '#A855F7',
          orange: '#FF8A00',
          pink: '#FF4081',
          black: '#111111',
          panel: '#1e2230',
          paper: '#fffdf0',
        }
      },
      fontFamily: {
        comic: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'comic-body': ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'comic-sm': '2px 2px 0px #000',
        'comic': '4px 4px 0px #000',
        'comic-lg': '6px 6px 0px #000',
        'comic-xl': '8px 8px 0px #000',
        'comic-cyan': '4px 4px 0px #00F0FF',
        'comic-yellow': '4px 4px 0px #00F0FF',
        'comic-red': '4px 4px 0px #FF3366',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scanLine 2s linear infinite',
        'wobble': 'wobble 0.6s ease-in-out infinite alternate',
      },
      keyframes: {
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        wobble: {
          '0%': { transform: 'rotate(-2deg)' },
          '100%': { transform: 'rotate(2deg)' }
        }
      }
    },
  },
  plugins: [],
}
