import { useState } from 'react'
import { parseSeansMetni, seansSatirlariniEslestir, seansToplueKaydet } from '../utils/festival.js'
import { tmdbIdIleTurkceBaslikGetir, esZamanliIsle } from '../utils/letterboxdCsv.js'

const ES_ZAMANLILIK = 6

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
  const [hata, setHata] = useState('')
  const [trBasliklar, setTrBasliklar] = useState(null) // filmId -> TMDB Türkçe başlığı
  const [trCekiliyor, setTrCekiliyor] = useState(false)
  const [trIlerleme, setTrIlerleme] = useState({ tamam: 0, toplam: 0 })

  // Festival programı filmi Türkçe gösteriyor ("Kağıttan Kaplan") ama seçki
  // TMDB'den İngilizce/orijinal başlıkla eklendiği için ("Paper Tiger") metin
  // eşleştirme tek başına yetmiyor. Elle bir çeviri sözlüğü tutmak yerine —
  // her festival için yeniden yazılması/bakımı gerekir, bu da iş yükünü
  // AZALTMAZ artırır — TMDB'nin zaten o filme ait doğru Türkçe başlığını
  // (varsa) kendisinden istiyoruz. Sadece seçkideki filmler için (tmdbId zaten
  // biliniyor), bu yüzden yanlış film eşleşme riski yok.
  async function turkceBasliklariCek() {
    setTrCekiliyor(true)
    setTrIlerleme({ tamam: 0, toplam: filmler.length })
    const sonuclar = await esZamanliIsle(
      filmler,
      async (f) => [f.id, await tmdbIdIleTurkceBaslikGetir(f.tmdbId)],
      ES_ZAMANLILIK,
      (tamam, toplam) => setTrIlerleme({ tamam, toplam })
    )
    setTrBasliklar(new Map(sonuclar))
    setTrCekiliyor(false)
  }

  function onizle() {
    const parsed = parseSeansMetni(metin)
    const zenginlestirilmis = trBasliklar ? filmler.map((f) => ({ ...f, trBaslik: trBasliklar.get(f.id) })) : filmler
    setSatirlar(seansSatirlariniEslestir(parsed, zenginlestirilmis))
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
    setHata('')
    try {
      const { eklenen, atlanan, hatalilar } = await seansToplueKaydet(sezonId, eslesenler)
      if (hatalilar.length > 0) {
        // Kısmi hata: önizlemeyi KASITLI OLARAK kapatmıyoruz — kullanıcı
        // elle eşleştirdiği satırları kaybetmesin diye. "İçe Aktar"a tekrar
        // basması yeterli: zaten kaydedilenler dedupe sayesinde tekrar
        // eklenmiyor, sadece eksik kalanlar yeniden denenir.
        setHata(
          `${eklenen} seans kaydedildi${atlanan > 0 ? `, ${atlanan} zaten vardı` : ''}, ${hatalilar.length} seans kaydedilemedi: ${hatalilar.join(' · ')}. "Eşleşenleri İçe Aktar"a tekrar basarak yeniden deneyebilirsin.`
        )
      } else {
        setMetin('')
        setSatirlar(null)
        onTamamlandi()
      }
    } catch (err) {
      setHata(`Kaydedilemedi: ${err.message}`)
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
        Film adı, bu sezonun seçkisindeki başlıkla otomatik eşleşmeye çalışır — festival programı Türkçe, seçki
        İngilizce/orijinal başlık tutuyorsa (TMDB'den geldiği için) otomatik eşleşmeyebilir. Önce aşağıdaki düğmeyle
        TMDB'nin o filmler için bildiği Türkçe başlıkları çekersen eşleşme oranı artar; yine de eşleşmeyen satırlara
        önizlemede elle film seçebilirsin.
      </p>

      <button
        type="button"
        onClick={turkceBasliklariCek}
        disabled={trCekiliyor}
        className="rounded-sm bg-kagit px-3 py-1.5 text-[11px] text-kraft ring-1 ring-cizgi hover:text-murekkep disabled:opacity-40"
      >
        {trCekiliyor
          ? `TMDB'den çekiliyor... ${trIlerleme.tamam}/${trIlerleme.toplam}`
          : trBasliklar
            ? `🌐 Türkçe Başlıklar Güncellendi (${trBasliklar.size}) — Tekrar Çek`
            : "🌐 TMDB'den Türkçe Başlıkları Çek (eşleşmeyi iyileştirir)"}
      </button>

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

          {hata && <p className="text-xs text-muhur">{hata}</p>}

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
