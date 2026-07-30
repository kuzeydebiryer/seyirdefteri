/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kagit: '#F5EFE1',
        kagitKoyu: '#EDE4CE',
        murekkep: '#1F2421',
        muhur: '#B33A3A',
        kraft: '#8C8368',
        cizgi: '#D8CBAA',
      },
      fontFamily: {
        baslik: ['"Fraunces"', 'serif'],
        govde: ['"Newsreader"', 'serif'],
      },
    },
  },
  plugins: [],
}
