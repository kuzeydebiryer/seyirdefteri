import { useState } from 'react'
import { parseSeansMetni, seansSatirlariniEslestir, seansToplueKaydet } from '../utils/festival.js'

const ORNEK_METIN = `Köpek Günleri\t08.10.2026\t18:00\tAtlas\tİstanbul
Köpek Günleri\t10.10.2026\t21:00\tKadıköy\tİstanbul
Bir Başka Film\t09.10.2026\t15:00\tCineWAM\tAnkara`

// Seans (gösterim tarih/saat/salon/şehir) bilgisi hiçbir API'de ya da
// Letterboxd listesinde yok — festivalin kendi yayınladığı program genelde
// zaten bir tablo, bu yüzden en pratik yol: o tabloyu (Excel/Sheets'ten ya
// da elle hazırlanmış satırlardan) kopyalayıp buraya TOPLU yapıştırmak.
// FestivalFilmIceAktar.jsx (CSV + TMDB eşleştirme) ile aynı "önce önizle,
// sonra onayla" deseni — ama burada eşleştirme TMDB'ye değil, o sezonun
// seçkisindeki film adlarına karşı yapılıyor (bkz. festival.js).
export default function FestivalSeansIceAktar({ sezonId, filmler, onTamamlandi }) {
  const [metin, setMetin] = useState('')
  const [satirlar, setSatirlar] = useState(null)
  const [iceAktariliyor, setIceAktariliyor] = useState(false)

  function onizle() {
    const parsed = parseSeansMetni(metin)
    setSatirlar(seansSatirlariniEslestir(parsed, filmler))
  }

  // Otomatik eşleştirme metin benzerliğine dayanıyor — festival programı
  // filmi Türkçe gösteriyorsa ("Kağıttan Kaplan") ama seçki TMDB'den
  // geldiği için orijinal/İngilizce başlığı tutuyorsa ("Paper Tiger"),
  // ikisi hiçbir zaman otomatik eşleşmez (dil farkı, yazım benzerliği
  // sorunu değil). Bu yüzden eşleşmeyen her satıra elle seçim imkânı
  // veriliyor — hangi sebepten eşleşmediğine bakılmaksızın çalışan tek
  // çözüm bu.
  function elleEslestir(i, filmId) {
    setSatirlar((liste) =>
      liste.map((s, idx) => {
        if (idx !== i) return s
        if (!filmId) {
          const { filmId: _f, filmBasligi: _b, posterUrl: _p, elleDuzeltildi: _e, ...kalan } = s
          return { ...kalan, eslesti: false, hata: `Seçkide eşleşen film yok: "${s.filmAdiHam}"` }
        }
        const film = filmler.find((f) => f.id === filmId)
        return { ...s, eslesti: true, filmId: film.id, filmBasligi: film.filmBasligi, posterUrl: film.posterUrl || '', elleDuzeltildi: true, hata: undefined }
      })
    )
  }

  async function iceAktar() {
    const eslesenler = satirlar.filter((s) => s.eslesti)
    if (eslesenler.length === 0) return
    setIceAktariliyor(true)
    try {
      await seansToplueKaydet(sezonId, eslesenler)
      setMetin('')
      setSatirlar(null)
      onTamamlandi()
    } finally {
      setIceAktariliyor(false)
    }
  }

  const eslesenSayisi = satirlar?.filter((s) => s.eslesti).length || 0

  return (
    <div className="space-y-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi">
      <p className="text-xs text-kraft">
        Festivalin yayınladığı programı her satıra bir seans gelecek şekilde yapıştır — alanlar arasına sekme (Excel/Sheets'ten
        yapıştırınca otomatik gelir), "|" ya da ";" koyabilirsin:
      </p>
      <pre className="overflow-x-auto rounded-sm bg-kagit p-2 text-[10px] text-kraft ring-1 ring-cizgi">
        Film Adı{'\t'}Tarih{'\t'}Saat{'\t'}Salon{'\t'}Şehir{'\n'}
        {ORNEK_METIN}
      </pre>
      <p className="text-[11px] text-kraft">
        Film adı, bu sezonun seçkisindeki (aşağıdaki film ızgarasındaki) başlıkla otomatik eşleşmeye çalışır — festival
        programı Türkçe, seçki İngilizce/orijinal başlık tutuyorsa (TMDB'den geldiği için) otomatik eşleşmez; önizlemede
        eşleşmeyen satırlara elle film seçebilirsin.
      </p>

      <textarea
        value={metin}
        onChange={(e) => {
          setMetin(e.target.value)
          setSatirlar(null)
        }}
        rows={6}
        placeholder={ORNEK_METIN}
        className="w-full rounded-sm bg-kagit px-3 py-2 font-mono text-xs text-murekkep ring-1 ring-cizgi"
      />

      {!satirlar && (
        <button
          onClick={onizle}
          disabled={!metin.trim()}
          className="rounded-sm bg-kagit px-4 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:opacity-40"
        >
          Önizle
        </button>
      )}

      {satirlar && (
        <>
          <p className="text-xs text-kraft">
            {eslesenSayisi}/{satirlar.length} satır eşleşti. İçe aktarmadan önce kontrol et:
          </p>
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {satirlar.map((s, i) => (
              <li key={i} className={`rounded-sm px-2 py-1.5 text-xs ${s.eslesti ? 'text-murekkep' : 'text-muhur'}`}>
                {s.eslesti ? (
                  <>
                    {s.elleDuzeltildi ? '🔧' : '✅'} {s.filmBasligi} — {s.tarih} {s.saat} · {s.salon}, {s.sehir}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>
                      ❌ "{s.filmAdiHam || s.satirHam}" — {s.tarih} {s.saat} · {s.salon}, {s.sehir}
                    </span>
                    {s.filmAdiHam && (
                      <select
                        defaultValue=""
                        onChange={(e) => elleEslestir(i, e.target.value)}
                        className="rounded-sm bg-kagit px-1.5 py-0.5 text-[11px] text-murekkep ring-1 ring-cizgi"
                      >
                        <option value="">— Elle eşleştir —</option>
                        {filmler.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.filmBasligi}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button
              onClick={iceAktar}
              disabled={iceAktariliyor || eslesenSayisi === 0}
              className="rounded-sm bg-muhur px-4 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
            >
              {iceAktariliyor ? 'İçe aktarılıyor...' : `Eşleşenleri İçe Aktar (${eslesenSayisi})`}
            </button>
            <button
              onClick={() => setSatirlar(null)}
              className="rounded-sm bg-kagit px-4 py-1.5 font-govde text-xs text-kraft ring-1 ring-cizgi"
            >
              Metni Düzenle
            </button>
          </div>
        </>
      )}
    </div>
  )
}
