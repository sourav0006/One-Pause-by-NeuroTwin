/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FAF8F4',
          100: '#F5F2EB',
          200: '#ECE7DD',
          300: '#DFD8CA',
          400: '#CCC2B0',
          500: '#B5A994',
        },
        charcoal: {
          900: '#1A1D1F',
          800: '#272B30',
          700: '#3A3F45',
          600: '#555C63',
          500: '#717A84',
          400: '#959EA7',
          300: '#C2C8CF',
        },
        sage: {
          50: '#F2F6F3',
          100: '#E2ECE4',
          300: '#9FBDAB',
          500: '#648572',
          700: '#466052',
          900: '#2B3D34',
        },
        ochre: {
          50: '#FBF7F0',
          100: '#F6EEDE',
          300: '#E4BF7F',
          500: '#C48D3F',
          700: '#946626',
        },
        softblue: {
          50: '#F1F6F9',
          100: '#E2ECF2',
          300: '#96B9CD',
          500: '#5F88A2',
          700: '#406075',
        },
        mauve: {
          50: '#F8F4F6',
          100: '#EFE5EB',
          300: '#C2A3B7',
          500: '#916B84',
          700: '#684B5E',
        }
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
