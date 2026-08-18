// Özgün bir "ödül heykelciği" silueti — gerçek Akademi Ödülü heykelinin
// tescilli tasarımının (beş ışınlı film makarası kaidesi, kılıç tutan
// şövalye siluetinin birebir oranları) KOPYASI DEĞİL. Art-deco ruhunu
// (zarif, düz hatlı, duran insan figürü) korurken kendi ayırt edici
// detaylarını taşıyor: kılıç yerine göğüste küçük bir yıldız vurgusu,
// beş ışınlı makara yerine katmanlı yuvarlak bir kaide. Sitenin diğer özel
// ikonlarıyla (LetterboxdIkon, BinKitapIkon) aynı çizgi-sanatı üslubunda.
export default function OscarHeykelIkon({ boyut = 24, className = '' }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Katmanlı yuvarlak kaide — gerçek heykelin köşeli/beş ışınlı
          makarasından bilerek farklı bir form */}
      <ellipse cx="12" cy="21.4" rx="6.5" ry="1.3" fill="currentColor" opacity="0.5" />
      <ellipse cx="12" cy="20.3" rx="5" ry="1.1" fill="currentColor" opacity="0.75" />
      <ellipse cx="12" cy="19.3" rx="3.6" ry="0.9" fill="currentColor" />

      {/* Gövde — dar bel, geniş omuz, art-deco duruş */}
      <path
        d="M12 18.6c-2.1 0-3.5-1.3-3.5-3.2 0-1.5.7-2.5 1.4-3.5.4-.6.7-1.1.9-1.7-.5-.3-.8-.9-.8-1.6 0-1 .8-1.8 1.8-1.8h.4c1 0 1.8.8 1.8 1.8 0 .7-.3 1.3-.8 1.6.2.6.5 1.1.9 1.7.7 1 1.4 2 1.4 3.5 0 1.9-1.4 3.2-3.5 3.2Z"
        fill="currentColor"
      />

      {/* Baş */}
      <circle cx="12" cy="3.6" r="1.9" fill="currentColor" />

      {/* Göğüste küçük yıldız vurgusu — "ödül" hissini taşıyan, tescilli
          hiçbir tasarıma ait olmayan evrensel bir sembol. Sitenin tema
          renklerine göre (açık/koyu mod) doğru kontrastla "oyulmuş" görünsün
          diye arkaplan rengini (--murekkep) referans alıyor. */}
      <path
        d="M12 12.2l.55 1.15 1.25.18-.9.9.21 1.26L12 15.05l-1.11.64.21-1.26-.9-.9 1.25-.18.55-1.15Z"
        fill="rgb(var(--murekkep))"
      />
    </svg>
  )
}
