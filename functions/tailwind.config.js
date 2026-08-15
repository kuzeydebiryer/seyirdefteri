/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Renkler artık sabit hex değil, index.css'teki CSS değişkenlerine
        // bağlı (:root = aydınlık, .dark = karanlık değerler). Bu sayede
        // bg-kagit / text-murekkep / vb. kullanan yüzlerce satır hiç
        // değişmeden karanlık modu otomatik destekliyor.
        kagit: 'rgb(var(--kagit) / <alpha-value>)',
        kagitKoyu: 'rgb(var(--kagitKoyu) / <alpha-value>)',
        murekkep: 'rgb(var(--murekkep) / <alpha-value>)',
        muhur: 'rgb(var(--muhur) / <alpha-value>)',
        kraft: 'rgb(var(--kraft) / <alpha-value>)',
        cizgi: 'rgb(var(--cizgi) / <alpha-value>)',
        deniz: 'rgb(var(--deniz) / <alpha-value>)',
        gise: 'rgb(var(--gise) / <alpha-value>)',
      },
      fontFamily: {
        baslik: ['"Fraunces"', 'serif'],
        govde: ['"Newsreader"', 'serif'],
      },
    },
  },
  plugins: [],
}
