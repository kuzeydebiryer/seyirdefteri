import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { storytelKitaplariGetir, storytelPopulerleriGetir, storytelPopulerligiDegistir } from '../utils/storytelKitaplari.js'
import { STORYTEL_KATEGORILERI } from '../utils/storytelKategorileri.js'
import { topluluktaSuankiOkunanlariGetir } from '../utils/izlenecek.js'
import { gorunenAdGetir } from '../utils/gorunenAd.js'
import { useAuth } from '../context/AuthContext.jsx'
import YatayKaydirma from '../components/YatayKaydirma.jsx'
import Avatar from '../components/Avatar.jsx'
import StorytelIkon from '../components/ikonlar/StorytelIkon.jsx'

// Storytel'in resmi bir API'si olmadığı için (araştırdık) bu liste tamamen
// ELLE işaretlenmiş kitaplardan oluşuyor — Kitap sayfasındaki "🎧 Storytel"
// giriş şeridinden erişiliyor. Yapı Storytel'in kendi uygulamasındaki
// dile bilerek benziyor: en üstte "Popüler" şeridi (Serkan'ın haftalık
// elle güncellediği — bkz. StorytelYildizButonu), altında "Şu An
// Dinlenenler" (Kitap Dünyası widget'ıyla aynı dil, sadece dinleyenler),
// en altta renkli kategori kartları.
function StorytelYildizButonu({ kitap, yenile }) {
  const { profil } = useAuth()
  if (!profil?.yonetici) return null
  return (
    <button
      onClick={async (e) => {
        e.preventDefault()
        await storytelPopulerligiDegistir(kitap.id, !kitap.populerMi)
        yenile()
      }}
      title={kitap.populerMi ? 'Popülerden çıkar' : 'Bu hafta popüler olarak işaretle'}
      className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-xs"
    >
      {kitap.populerMi ? '⭐' : '☆'}
    </button>
  )
}

function KucukPosterKart({ kitap, yenile }) {
  return (
    <div className="group relative shrink-0" style={{ width: 110 }}>
      <Link to={`/kitap/${kitap.id}`}>
        <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
          {kitap.posterUrl ? (
            <img src={kitap.posterUrl} alt={kitap.baslik} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">📖</div>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-murekkep">{kitap.baslik}</p>
      </Link>
      <StorytelYildizButonu kitap={kitap} yenile={yenile} />
    </div>
  )
}

export default function StorytelKitaplari() {
  const { kategoriId } = useParams()
  const [tumKitaplar, setTumKitaplar] = useState(null)
  const [populerler, setPopulerler] = useState(null)
  const [dinleyenler, setDinleyenler] = useState(null)
  const [yenile, setYenile] = useState(0)

  function verileriYukle() {
    storytelKitaplariGetir().then(setTumKitaplar)
    storytelPopulerleriGetir().then(setPopulerler)
  }

  useEffect(verileriYukle, [yenile])

  useEffect(() => {
    async function getir() {
      // Sadece 'dinleniyor' (Kitap Dünyası'nın aksine 'okuyor'u dahil
      // etmiyoruz — bu widget özellikle Storytel/sesli kitap dinleyenler
      // için).
      const liste = await topluluktaSuankiOkunanlariGetir('kitap', 8, ['dinleniyor'])
      const profilOnbellek = {}
      const zenginlestirilmis = await Promise.all(
        liste.map(async (k) => {
          if (!profilOnbellek[k.kullaniciId]) {
            const snap = await getDoc(doc(db, 'kullanicilar', k.kullaniciId))
            profilOnbellek[k.kullaniciId] = snap.exists() ? snap.data() : {}
          }
          const profil = profilOnbellek[k.kullaniciId]
          return { ...k, kullaniciAdi: gorunenAdGetir(profil, 'Bir dinleyici'), kullaniciAvatarUrl: profil.avatarUrl || '' }
        })
      )
      setDinleyenler(zenginlestirilmis)
    }
    getir()
  }, [])

  const kategoriGruplari = useMemo(() => {
    if (!tumKitaplar) return []
    return STORYTEL_KATEGORILERI.map((kat) => ({
      ...kat,
      kitaplar: tumKitaplar.filter((k) => k.kategori === kat.id),
    }))
  }, [tumKitaplar])

  const seciliKategori = kategoriId ? STORYTEL_KATEGORILERI.find((k) => k.id === kategoriId) : null

  if (seciliKategori) {
    const kitaplar = (tumKitaplar || []).filter((k) => k.kategori === seciliKategori.id)
    return (
      <div>
        <Link to="/storytel-kitaplari" className="text-xs text-kraft hover:text-deniz">
          ← Storytel'de Olanlar
        </Link>
        <h1 className="mt-1 mb-6 flex items-center gap-2 font-baslik text-2xl text-murekkep">
          <StorytelIkon className="h-6 w-6 text-[#FF5B22]" /> {seciliKategori.ad}
        </h1>
        {tumKitaplar === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
        {tumKitaplar !== null && kitaplar.length === 0 && <p className="text-sm text-kraft">Bu kategoride henüz kitap yok.</p>}
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {kitaplar.map((kitap) => (
            <div key={kitap.id} className="group relative">
              <Link to={`/kitap/${kitap.id}`} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                  {kitap.posterUrl ? (
                    <img src={kitap.posterUrl} alt={kitap.baslik} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">📖</div>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-murekkep">{kitap.baslik}</p>
              </Link>
              <StorytelYildizButonu kitap={kitap} yenile={() => setYenile((n) => n + 1)} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Link to="/kitaplar" className="text-xs text-kraft hover:text-deniz">
        ← Kitap
      </Link>
      <h1 className="mt-1 mb-1 flex items-center gap-2 font-baslik text-2xl text-murekkep">
        <StorytelIkon className="h-6 w-6 text-[#FF5B22]" /> Storytel'de Olanlar
      </h1>
      <p className="mb-6 text-sm text-kraft">Topluluğun elle işaretlediği, Storytel'de sesli kitap olarak bulunan kitaplar.</p>

      {populerler === null && <p className="text-sm text-kraft">Yükleniyor...</p>}
      {populerler !== null && populerler.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 font-baslik text-lg text-murekkep">🔥 Storytel'de Popüler</h2>
          <YatayKaydirma>
            {populerler.map((k) => (
              <KucukPosterKart key={k.id} kitap={k} yenile={() => setYenile((n) => n + 1)} />
            ))}
          </YatayKaydirma>
        </div>
      )}

      {dinleyenler !== null && dinleyenler.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 flex items-center gap-1.5 font-baslik text-lg text-murekkep">
            <StorytelIkon className="h-4 w-4 text-[#FF5B22]" /> Şu An Dinlenenler
          </h2>
          <div className="space-y-2">
            {dinleyenler.map((d) => {
              const yuzde = d.toplamDakika ? Math.min(100, Math.round(((d.suankiDakika || 0) / d.toplamDakika) * 100)) : null
              return (
                <Link
                  key={d.id}
                  to={`/kitap/${d.disId}`}
                  className="flex items-center gap-3 rounded-sm bg-kagitKoyu p-3 ring-1 ring-cizgi transition hover:ring-murekkep/30"
                >
                  {d.posterUrl && <img src={d.posterUrl} alt={d.baslik} className="h-14 w-10 shrink-0 rounded-sm object-cover ring-1 ring-cizgi" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Avatar adSoyad={d.kullaniciAdi} avatarUrl={d.kullaniciAvatarUrl} boyut="h-4 w-4" />
                      <span className="truncate text-[11px] text-kraft">{d.kullaniciAdi} dinliyor</span>
                    </div>
                    <p className="truncate text-sm font-medium text-murekkep">{d.baslik}</p>
                    {yuzde != null && (
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-kagit">
                        <div className="h-full bg-muhur" style={{ width: `${yuzde}%` }} />
                      </div>
                    )}
                  </div>
                  {yuzde != null && <span className="shrink-0 font-baslik text-xl text-muhur">%{yuzde}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <h2 className="mb-3 font-baslik text-lg text-murekkep">Kategoriler</h2>
      <div className="grid grid-cols-2 gap-3">
        {kategoriGruplari.map((kat) => (
          <Link
            key={kat.id}
            to={`/storytel-kitaplari/${kat.id}`}
            className="overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi transition hover:ring-murekkep/30"
          >
            <div style={{ backgroundColor: kat.renk }} className="flex h-16 items-center justify-center px-3">
              <p className="text-center font-baslik text-base font-bold text-black">{kat.ad}</p>
            </div>
            <div className="p-2">
              {kat.kitaplar.length > 0 ? (
                <div className="flex -space-x-2">
                  {kat.kitaplar.slice(0, 3).map((k) => (
                    <div key={k.id} className="h-16 w-11 shrink-0 overflow-hidden rounded-sm ring-2 ring-kagitKoyu">
                      {k.posterUrl ? (
                        <img src={k.posterUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-kagit text-sm opacity-40">📖</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-center text-[11px] text-kraft">Henüz kitap yok</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
