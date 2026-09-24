/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        liquid: {
          bg: '#F2F3F7',
          surface: '#FFFFFF',
          card: '#FAF9FB',
          border: '#E5E7EB',
          dark: '#121316',
          muted: '#6B7280',
          accent: '#000000',
        }
      },
      boxShadow: {
        'liquid': '0 20px 40px -15px rgba(0, 0, 0, 0.05), 0 0 15px 0 rgba(0, 0, 0, 0.03)',
        'liquid-pill': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'liquid-dark': '0 15px 30px -5px rgba(0, 0, 0, 0.35)',
        'liquid-inner': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.8), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      }
    },
  },
  plugins: [],
}
