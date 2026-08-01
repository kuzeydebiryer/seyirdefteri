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
        // Sonradan eklendi: JSX'te kullanılıyordu ama tema tanımında eksikti —
        // bu yüzden bg-deniz/text-deniz/text-gise ile stillenen tüm butonlar ve
        // etiketler (ör. "Okumaya Başlıyorum") CSS üretilmediği için görünmez
        // kalıyordu.
        deniz: '#2F6F8F',
        gise: '#B8860B',
      },
      fontFamily: {
        baslik: ['"Fraunces"', 'serif'],
        govde: ['"Newsreader"', 'serif'],
      },
    },
  },
  plugins: [],
}
