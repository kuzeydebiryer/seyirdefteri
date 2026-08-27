import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import YatayKaydirma from './YatayKaydirma.jsx'
import { yakindaGelecekleriGetir, yakindaGelenSil } from '../utils/yakindaGelecek.js'
import { useAuth } from '../context/AuthContext.jsx'

function gunSayisi(cikisTarihi) {
  const fark = new Date(cikisTarihi) - new Date(new Date().toISOString().slice(0, 10))
  return Math.round(fark / (1000 * 60 * 60 * 24))
}

// Platformlar sayfasının en üstünde — geleceğe dönük duyurular, en yakın
// tarihten en uzağa sıralı. Çıkış tarihi geldiğinde bir Cloud Function
// (yakindaGelenleriGecisYap) bunu otomatik olarak ilgili listeye
// (platformYeniEklenenler ya da dijitalYeniCikanlar) taşıyıp buradan
// kaldırıyor — elle silmeye gerek kalmıyor.
export default function YakindaGelecekler({ yenilemeTetik }) {
  const { kullanici } = useAuth()
  const [liste, setListe] = useState(null)
  const [filtre, setFiltre] = useState('tumu')

  useEffect(() => {
    yakindaGelecekleriGetir().then(setListe)
  }, [yenilemeTetik])

  async function silTiklandi(id) {
    if (!window.confirm('Bu duyuruyu silmek istediğine emin misin?')) return
    await yakindaGelenSil(id)
    setListe((l) => l.filter((k) => k.id !== id))
  }

  if (liste !== null && liste.length === 0) return null

  // "Film" burada "hedefTuru sinema OLMAYAN film" demek (platforma/dijitale
  // gelecek filmler) — vizyona girecek filmler zaten kendi "Sinema"
  // sekmesinde. Dizinin vizyon kavramı olmadığı için "Sinema" sekmesi
  // sadece film içeriyor.
  const gosterilecekler =
    liste?.filter((k) => {
      if (filtre === 'tumu') return true
      if (filtre === 'sinema') return k.hedefTuru === 'sinema'
      if (filtre === 'film') return k.tur === 'sinema' && k.hedefTuru !== 'sinema'
      if (filtre === 'dizi') return k.tur === 'dizi'
      return true
    }) || []

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-baslik text-lg text-murekkep">📅 Yakında Geliyor</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { id: 'tumu', etiket: 'Tümü' },
          { id: 'film', etiket: '🎬 Film' },
          { id: 'dizi', etiket: '📺 Dizi' },
          { id: 'sinema', etiket: '🎥 Sinema' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-govde ring-1 ${
              filtre === f.id ? 'bg-murekkep text-kagit ring-murekkep' : 'bg-kagitKoyu text-kraft ring-cizgi'
            }`}
          >
            {f.etiket}
          </button>
        ))}
      </div>
      {gosterilecekler.length === 0 ? (
        <p className="text-sm text-kraft">Bu kategoride yakında gelecek bir şey yok.</p>
      ) : (
        <YatayKaydirma>
          {gosterilecekler.map((k) => {
            const gun = gunSayisi(k.cikisTarihi)
            return (
              <div key={k.id} className="shrink-0" style={{ width: 110 }}>
                <Link to={`/${k.tur === 'sinema' ? 'film' : 'dizi'}/${k.disId}`}>
                  <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-kagitKoyu ring-1 ring-cizgi">
                    {k.posterUrl ? (
                      <img src={k.posterUrl} alt={k.baslik} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl opacity-40">🎬</div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded-full bg-murekkep/85 px-1.5 py-0.5 text-[9px] text-kagit">
                      {k.hedefTuru === 'platform' ? k.platformAdi : k.hedefTuru === 'sinema' ? '🎥 Sinema' : '💻 Dijital'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-murekkep">{k.baslik}</p>
                </Link>
                <p className="text-[10px] text-gise">{gun === 0 ? 'Bugün! 🎉' : gun === 1 ? 'Yarın' : `${gun} gün sonra`}</p>
                {kullanici?.uid === k.ekleyenId && (
                  <button onClick={() => silTiklandi(k.id)} className="text-[10px] text-kraft hover:text-muhur">
                    Sil
                  </button>
                )}
              </div>
            )
          })}
        </YatayKaydirma>
      )}
    </div>
  )
}
