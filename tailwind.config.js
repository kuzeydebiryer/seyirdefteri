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
        // Sonradan eklendi: JSX'te kullanılıyordu ama tema tanımında eksikti.
        // İlk denemede (#2F6F8F mavi) sıcak kağıt/kraft paletiyle çatıştı,
        // bu yüzden aynı aileden ama daha yumuşak/bastırılmış tonlara çekildi.
        deniz: '#4A6E6B',
        gise: '#A6763F',
      },
      fontFamily: {
        baslik: ['"Fraunces"', 'serif'],
        govde: ['"Newsreader"', 'serif'],
      },
    },
  },
  plugins: [],
}
