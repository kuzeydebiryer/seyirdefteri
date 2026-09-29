import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { kullaniciListeleriGetir, listeOgeleriGetir } from '../utils/kisiselListe.js'
import { listeleriGetir as disListeleriGetir, listeFilmleriGetir as disListeFilmleriGetir, turuGetir } from '../utils/disariListeler.js'
import { festivalSezonlariniGetir, festivalFilmleriGetir } from '../utils/festival.js'
import { FESTIVALLER } from '../data/festivaller.js'

const KAYNAKLAR = [
  { id: 'kisisel', etiket: '📋 Kişisel Listelerim' },
  { id: 'dis', etiket: '🎞️ Dış Listeler' },
  { id: 'festival', etiket: '🏆 Festival / Ödül Filmleri' },
]

// Gonderiye/habere tek tek arayıp eklemek yerine, sitede zaten var olan bir
// listeden (kendi kişisel listelerin, Dış Listeler'deki Letterboxd 500/IMDb
// 250/NYT gibi listeler, ya da bir festival sezonunun film programı) TOPLU
// seçim yapıp içeriğe eklemek için. Seçilen her öğe, composer'ın zaten
// bildiği @@eser: formatına normalize ediliyor — böylece
// GomuluEserSeridi/icerikAyristir hiçbir şey bilmeden aynı şekilde render
// ediyor (bkz. HaberBolumu.jsx'teki tekli "Eser Ekle" akışı).
//
// onEkle(secilenler, duzen) — secilenler: [{tur, disId, baslik, posterUrl, yil, altBaslik}]
export default function ListedenEserEkle({ onEkle, onKapat }) {
  const { kullanici } = useAuth()
  const [kaynak, setKaynak] = useState(null)

  // Kişisel listeler
  const [kisiselListeler, setKisiselListeler] = useState(null)
  const [seciliKisiselListeId, setSeciliKisiselListeId] = useState('')

  // Dış listeler
  const [disListeler, setDisListeler] = useState(null)
  const [seciliDisListeId, setSeciliDisListeId] = useState('')

  // Festival
  const [seciliFestivalId, setSeciliFestivalId] = useState(FESTIVALLER[0]?.id || '')
  const [festivalSezonlari, setFestivalSezonlari] = useState(null)
  const [seciliSezonId, setSeciliSezonId] = useState('')

  // Yüklenen öğeler (normalize edilmiş) + seçim durumu
  const [ogeler, setOgeler] = useState(null) // null = henüz seçilmedi, [] = boş liste
  const [seciliIndeksler, setSeciliIndeksler] = useState(new Set())
  const [duzen, setDuzen] = useState('yatay')

  useEffect(() => {
    if (kaynak === 'kisisel' && kullanici) {
      kullaniciListeleriGetir(kullanici.uid).then(setKisiselListeler)
    }
    if (kaynak === 'dis') {
      disListeleriGetir().then(setDisListeler)
    }
  }, [kaynak, kullanici])

  useEffect(() => {
    if (kaynak === 'festival' && seciliFestivalId) {
      setFestivalSezonlari(null)
      setSeciliSezonId('')
      setOgeler(null)
      festivalSezonlariniGetir(seciliFestivalId).then((liste) => {
        setFestivalSezonlari(liste)
        if (liste[0]) setSeciliSezonId(liste[0].id)
      })
    }
  }, [kaynak, seciliFestivalId])

  async function kisiselListeSecildi(listeId) {
    setSeciliKisiselListeId(listeId)
    setOgeler(null)
    if (!listeId) return
    const ogelerHam = await listeOgeleriGetir(listeId)
    const normalize = ogelerHam.map((o) => ({ tur: o.tur, disId: o.disId, baslik: o.baslik, posterUrl: o.posterUrl || '', altBaslik: o.alt || '' }))
    setOgeler(normalize)
    setSeciliIndeksler(new Set(normalize.map((_, i) => i)))
  }

  async function disListeSecildi(listeId) {
    setSeciliDisListeId(listeId)
    setOgeler(null)
    if (!listeId) return
    const liste = disListeler.find((l) => l.id === listeId)
    const tur = turuGetir(liste)
    const filmlerHam = await disListeFilmleriGetir(listeId)
    const normalize = filmlerHam.map((f) => ({ tur, disId: f.id, baslik: f.baslik, posterUrl: f.posterUrl || '', yil: f.yil || '' }))
    setOgeler(normalize)
    setSeciliIndeksler(new Set(normalize.map((_, i) => i)))
  }

  async function sezonSecildi(sezonId) {
    setSeciliSezonId(sezonId)
    setOgeler(null)
    if (!sezonId) return
    const filmlerHam = await festivalFilmleriGetir(sezonId)
    const normalize = filmlerHam.map((f) => ({
      tur: 'sinema',
      disId: String(f.tmdbId),
      baslik: f.filmBasligi,
      posterUrl: f.posterUrl || '',
      yil: f.filmYili || '',
      altBaslik: f.odul || '',
    }))
    setOgeler(normalize)
    setSeciliIndeksler(new Set(normalize.map((_, i) => i)))
  }

  function toggle(i) {
    setSeciliIndeksler((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(i)) yeni.delete(i)
      else yeni.add(i)
      return yeni
    })
  }

  function hepsiniSecToggle() {
    if (!ogeler) return
    setSeciliIndeksler((onceki) => (onceki.size === ogeler.length ? new Set() : new Set(ogeler.map((_, i) => i))))
  }

  function ekleTiklandi() {
    if (!ogeler) return
    const secilenler = ogeler.filter((_, i) => seciliIndeksler.has(i))
    if (secilenler.length === 0) return
    onEkle(secilenler, duzen)
  }

  return (
    <div className="mt-2 space-y-3 rounded-sm bg-kagit p-3 ring-1 ring-cizgi">
      <div className="flex items-center justify-between">
        <p className="text-xs text-murekkep">Hangi listeden eklemek istersin?</p>
        <button onClick={onKapat} className="text-[11px] text-kraft hover:text-murekkep">
          ✕ Kapat
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KAYNAKLAR.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => {
              setKaynak(k.id)
              setOgeler(null)
            }}
            className={`rounded-full px-2.5 py-1 text-[11px] ${kaynak === k.id ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'}`}
          >
            {k.etiket}
          </button>
        ))}
      </div>

      {kaynak === 'kisisel' && (
        <div>
          {kisiselListeler === null ? (
            <p className="text-[11px] text-kraft">Yükleniyor...</p>
          ) : kisiselListeler.length === 0 ? (
            <p className="text-[11px] text-kraft">Henüz bir kişisel listen yok.</p>
          ) : (
            <select
              value={seciliKisiselListeId}
              onChange={(e) => kisiselListeSecildi(e.target.value)}
              className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            >
              <option value="">Bir liste seç...</option>
              {kisiselListeler.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.baslik} ({l.ogeSayisi || 0})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {kaynak === 'dis' && (
        <div>
          {disListeler === null ? (
            <p className="text-[11px] text-kraft">Yükleniyor...</p>
          ) : disListeler.length === 0 ? (
            <p className="text-[11px] text-kraft">Henüz bir dış liste tanımlanmamış.</p>
          ) : (
            <select
              value={seciliDisListeId}
              onChange={(e) => disListeSecildi(e.target.value)}
              className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            >
              <option value="">Bir liste seç...</option>
              {disListeler.map((l) => (
                <option key={l.id} value={l.id}>
                  {turuGetir(l) === 'dizi' ? '📺' : '🎬'} {l.ad}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {kaynak === 'festival' && (
        <div className="space-y-2">
          <select
            value={seciliFestivalId}
            onChange={(e) => setSeciliFestivalId(e.target.value)}
            className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
          >
            {FESTIVALLER.map((f) => (
              <option key={f.id} value={f.id}>
                {f.ad}
              </option>
            ))}
          </select>
          {festivalSezonlari === null ? (
            <p className="text-[11px] text-kraft">Yükleniyor...</p>
          ) : festivalSezonlari.length === 0 ? (
            <p className="text-[11px] text-kraft">Bu festival için henüz bir sezon eklenmemiş.</p>
          ) : (
            <select
              value={seciliSezonId}
              onChange={(e) => sezonSecildi(e.target.value)}
              className="w-full rounded-sm bg-kagitKoyu px-2 py-1.5 text-xs text-murekkep ring-1 ring-cizgi"
            >
              {festivalSezonlari.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.yil}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {ogeler !== null && (
        <div className="space-y-2 border-t border-cizgi pt-3">
          {ogeler.length === 0 ? (
            <p className="text-[11px] text-kraft">Bu liste boş.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <button type="button" onClick={hepsiniSecToggle} className="text-[11px] text-deniz hover:underline">
                  {seciliIndeksler.size === ogeler.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-kraft">Düzen:</span>
                  <button
                    type="button"
                    onClick={() => setDuzen('yatay')}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${duzen === 'yatay' ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'}`}
                  >
                    Yatay Şerit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuzen('dikey')}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${duzen === 'dikey' ? 'bg-gise text-kagit' : 'bg-kagitKoyu text-kraft ring-1 ring-cizgi'}`}
                  >
                    Dikey Liste
                  </button>
                </div>
              </div>

              <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                {ogeler.map((oge, i) => {
                  const secili = seciliIndeksler.has(i)
                  return (
                    <button
                      key={`${oge.tur}-${oge.disId}-${i}`}
                      type="button"
                      onClick={() => toggle(i)}
                      className={`relative overflow-hidden rounded-sm ring-2 transition ${secili ? 'ring-gise' : 'ring-cizgi opacity-60 hover:opacity-100'}`}
                      title={oge.baslik}
                    >
                      <div className="aspect-[2/3] w-full bg-kagitKoyu">
                        {oge.posterUrl ? (
                          <img src={oge.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg opacity-40">🎬</div>
                        )}
                      </div>
                      {secili && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gise text-[10px] text-kagit">✓</span>
                      )}
                      <p className="truncate bg-kagitKoyu px-1 py-0.5 text-[10px] text-murekkep">{oge.baslik}</p>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={ekleTiklandi}
                disabled={seciliIndeksler.size === 0}
                className="w-full rounded-sm bg-muhur px-3 py-1.5 font-govde text-xs text-kagit disabled:opacity-40"
              >
                {seciliIndeksler.size} öğeyi Ekle
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
