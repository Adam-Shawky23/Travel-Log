/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#10233B',
          800: '#152C46',
          700: '#1F3F63',
          600: '#2C5581',
          400: '#5C7C9E',
          200: '#AEC0D2',
        },
        paper: {
          50: '#EFF3F1',
          100: '#E4EAE5',
          200: '#D3DCD5',
        },
        brass: {
          400: '#CBA05D',
          500: '#B98A3D',
          600: '#996F2F',
        },
        oxblood: {
          400: '#BE5A4A',
          500: '#A23B2E',
          600: '#822F25',
        },
      },
      fontFamily: {
        display: ['Spectral', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 35, 59, 0.06), 0 8px 24px rgba(16, 35, 59, 0.08)',
        lifted: '0 4px 8px rgba(16, 35, 59, 0.08), 0 16px 40px rgba(16, 35, 59, 0.14)',
      },
    },
  },
  plugins: [],
};
